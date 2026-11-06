import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
sys.dont_write_bytecode = True
import tarfile
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('extract', ROOT / 'scripts/extract-private-backup.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class RecoveryTest(unittest.TestCase):
    def test_database_url_credentials_stay_out_of_arguments(self):
        spec = importlib.util.spec_from_file_location('pg', ROOT/'scripts/pg-with-url.py')
        pg = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(pg)
        for url in ['postgresql://user:abc#x@y@example.invalid:6543/postgres?sslmode=require',
                    'postgresql://user:abc%23x%40y@example.invalid:6543/postgres?sslmode=require']:
            env=pg.connection_env(url)
            self.assertEqual(env['PGPASSWORD'],'abc#x@y')
            self.assertEqual(env['PGHOST'],'example.invalid')
            self.assertEqual(env['PGPORT'],'6543')
            self.assertEqual(env['PGDATABASE'],'postgres')
            self.assertEqual(env['PGSSLMODE'],'require')
        with self.assertRaises(ValueError): pg.connection_env('https://user:pass@example.invalid/db')

    def test_dump_failure_is_private_and_success_has_verified_metadata(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'psql').write_text('#!/bin/sh\necho 17\n')
            (root/'pg_dump').write_text('#!/bin/sh\nif [ "$1" = --version ]; then echo "pg_dump (PostgreSQL) 17.9"; elif [ "$MODE" = fail ]; then echo PRIVATE_CUSTOMER_DATA >&2; exit 1; else printf "SELECT 1;\\n"; fi\n')
            for name in ['psql','pg_dump']: (root/name).chmod(0o700)
            for mode in ['fail','success']:
                out=root/mode
                result=subprocess.run(['bash',str(ROOT/'scripts/backup-with-metadata.sh'),str(out)],cwd=ROOT,env={**os.environ,'PATH':str(root)+':'+os.environ['PATH'],'SUPABASE_DB_URL':'postgresql://test:synthetic-secret@example.invalid/postgres','MODE':mode},capture_output=True)
                self.assertNotIn(b'PRIVATE_CUSTOMER_DATA',result.stdout+result.stderr)
                self.assertNotIn(b'synthetic-secret',result.stdout+result.stderr)
                if mode=='fail':
                    self.assertNotEqual(result.returncode,0)
                    self.assertEqual(list(out.glob('*.sql')),[])
                else:
                    self.assertEqual(result.returncode,0,result.stderr)
                    metadata=json.loads(next(out.glob('*.metadata.json')).read_text())
                    sql=out/metadata['backup_file']
                    self.assertEqual(metadata['sha256_checksum'],hashlib.sha256(sql.read_bytes()).hexdigest())
                    self.assertEqual(sql.stat().st_mode & 0o777,0o600)

    def test_archives_and_checksum(self):
        sql = b'SELECT 1;\n'
        metadata = json.dumps({'backup_file':'backup_test.sql','sha256_checksum':hashlib.sha256(sql).hexdigest()}).encode()
        with tempfile.TemporaryDirectory() as tmp:
            for kind in ['tar', 'zip']:
                path = Path(tmp) / kind
                entries = {'backup_test.sql':sql, 'backup_test.metadata.json':metadata}
                if kind == 'zip':
                    with zipfile.ZipFile(path,'w') as z:
                        for name,data in entries.items(): z.writestr(name,data)
                else:
                    with tarfile.open(path,'w:gz') as t:
                        for name,data in entries.items():
                            info=tarfile.TarInfo('./'+name);info.size=len(data);t.addfile(info,io.BytesIO(data))
                module.extract(path, Path(tmp)/('out-'+kind))
                self.assertEqual((Path(tmp)/('out-'+kind)/'backup.sql').read_bytes(),sql)
            for entries in [
                {'../backup_test.sql':sql,'backup_test.metadata.json':metadata},
                {'backup_test.sql':b'ALTERED','backup_test.metadata.json':metadata},
            ]:
                path=Path(tmp)/'bad.zip'
                with zipfile.ZipFile(path,'w') as z:
                    for name,data in entries.items(): z.writestr(name,data)
                with self.assertRaises(ValueError): module.extract(path,Path(tmp)/'bad-output')
    def test_migration_check_distinguishes_error_none_and_pending(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'migrations').mkdir();(root/'migrations/001_test.sql').write_text('SELECT 1;')
            fake=root/'psql'
            fake.write_text('#!/bin/bash\ncase "$MODE" in\nfail) exit 2;;\nfresh) echo f;;\n*) if [[ "$*" == *to_regclass* ]]; then echo t; elif [[ "$MODE" == done ]]; then echo 001_test.sql; fi;;\nesac\n')
            fake.chmod(0o700)
            for mode,expected in [('fail',2),('fresh',0),('pending',0),('done',1)]:
                result=subprocess.run(['bash',str(ROOT/'scripts/check-pending-migrations.sh')],cwd=root,env={**os.environ,'PATH':str(root)+':'+os.environ['PATH'],'SUPABASE_DB_URL':'postgresql://test:synthetic@example.invalid/postgres','MODE':mode},capture_output=True)
                self.assertEqual(result.returncode,expected,mode)

if __name__ == '__main__': unittest.main()

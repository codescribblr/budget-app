import importlib.util,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('runner',Path(__file__).with_name('migration-runner.py'));runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
class RunnerTests(unittest.TestCase):
 def test_preserves_quoted_function_transactions(self):
  sql="-- intro\nBEGIN;\nDO $$ BEGIN RAISE NOTICE 'COMMIT;'; END $$;\nCOMMIT;\n-- done\n"
  self.assertEqual(runner.unwrapped(sql),"\nDO $$ BEGIN RAISE NOTICE 'COMMIT;'; END $$;")
 def test_rejects_partial_transactions(self):
  for sql in ['BEGIN; SELECT 1;','SELECT 1; COMMIT;','BEGIN; COMMIT; BEGIN; COMMIT;']:
   with self.assertRaises(ValueError):runner.unwrapped(sql)
 def test_escape_strings(self):
  sql=r"BEGIN; SELECT E'escaped\'; COMMIT;'; COMMIT;"
  self.assertEqual(runner.unwrapped(sql),r" SELECT E'escaped\'; COMMIT;';")
 def test_phase_and_atomic_record(self):
  with tempfile.TemporaryDirectory() as root:
   Path(root,'001_first.sql').write_text('BEGIN; SELECT 1; COMMIT;')
   Path(root,'002_after.sql').write_text('-- migration-phase: post-deploy\nSELECT 2;')
   text,names=runner.render(root,'pre-deploy');self.assertEqual(names,['001_first.sql']);self.assertIn("INSERT INTO public._migrations(migration_name) VALUES('001_first.sql');\nCOMMIT;",text);self.assertIn('pg_advisory_lock',text);self.assertNotIn('SELECT 2;',text)
 def test_current_repository_parses(self):
  for phase in ['pre-deploy','post-deploy']:runner.render(Path(__file__).resolve().parent.parent/'migrations',phase)
if __name__=='__main__':unittest.main()

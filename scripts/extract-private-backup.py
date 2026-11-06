#!/usr/bin/env python3
"""Extract only an authenticated archive's single SQL + metadata pair.

The caller decrypts first. Never execute archive entries or extract paths/links.
"""
import hashlib
import json
from pathlib import Path
import re
import sys
import tarfile
import zipfile


def extract(archive, destination):
    destination = Path(destination)
    destination.mkdir(mode=0o700, parents=True, exist_ok=True)
    files = {}
    total = 0
    if zipfile.is_zipfile(archive):
        with zipfile.ZipFile(archive) as source:
            for item in source.infolist():
                if item.is_dir():
                    continue
                if item.file_size > 512 * 1024 * 1024:
                    raise ValueError('Archive entry too large')
                if (item.external_attr >> 16) & 0o170000 == 0o120000:
                    raise ValueError('Archive links are not permitted')
                total += item.file_size
                if total > 512 * 1024 * 1024:
                    raise ValueError('Archive too large')
                if item.filename in files:
                    raise ValueError('Duplicate archive entry')
                files[item.filename] = source.read(item)
    else:
        with tarfile.open(archive, 'r:gz') as source:
            for item in source:
                if item.isdir():
                    continue
                if not item.isfile():
                    raise ValueError('Only regular archive files are permitted')
                total += item.size
                if total > 512 * 1024 * 1024:
                    raise ValueError('Archive too large')
                if item.name in files:
                    raise ValueError('Duplicate archive entry')
                files[item.name] = source.extractfile(item).read()
    normalized = {}
    for name, data in files.items():
        if name.startswith('./'):
            name = name[2:]
        if not re.fullmatch(r'backup_[A-Za-z0-9_-]+\.(sql|metadata\.json)', name) or name in normalized:
            raise ValueError('Unexpected or unsafe archive entry')
        normalized[name] = data
    sql = [n for n in normalized if n.endswith('.sql')]
    metadata = [n for n in normalized if n.endswith('.metadata.json')]
    if len(sql) != 1 or len(metadata) != 1 or len(normalized) != 2:
        raise ValueError('Expected one SQL dump and one metadata file')
    info = json.loads(normalized[metadata[0]])
    if info.get('backup_file') != sql[0] or info.get('sha256_checksum') != hashlib.sha256(normalized[sql[0]]).hexdigest():
        raise ValueError('SQL dump checksum or filename does not match metadata')
    output = destination / 'backup.sql'
    with output.open('xb') as target:
        output.chmod(0o600)
        target.write(normalized[sql[0]])
    print('Authenticated archive extracted; SQL checksum verified')


if __name__ == '__main__':
    try:
        extract(*sys.argv[1:])
    except Exception:
        # Archive/parser errors can include private content. Report only failure.
        print('Backup extraction or checksum verification failed', file=sys.stderr)
        sys.exit(1)

#!/bin/bash
source .env.local

python3 << 'PYEOF'
import os
import urllib.parse
import subprocess

url = os.environ.get('SUPABASE_DB_URL', '')
parsed = urllib.parse.urlparse(url)
password = urllib.parse.unquote(parsed.password or '')
host = parsed.hostname or 'localhost'
port = parsed.port or 5432
user = urllib.parse.unquote(parsed.username or 'postgres')
database = parsed.path.lstrip('/') or 'postgres'

env = os.environ.copy()
env['PGPASSWORD'] = password

cmd = ['psql', '-h', host, '-p', str(port), '-U', user, '-d', database, '-t', '-c', 'SELECT version();']
result = subprocess.run(cmd, env=env, capture_output=True, text=True)
print(result.stdout.strip())
PYEOF









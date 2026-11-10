#!/usr/bin/env python3
"""Apply one phase in one locked connection; record transactional changes atomically."""
import importlib.util, os, re, subprocess, sys
from pathlib import Path


def statements(source):
    """Top-level SQL statements, ignoring semicolons in comments and quoted bodies."""
    result=[]; start=0; i=0; quote=None; block=0; line=False; escape=False
    while i<len(source):
        if line:
            if source[i]=='\n':line=False
            i+=1;continue
        if block:
            if source.startswith('/*',i):block+=1;i+=2
            elif source.startswith('*/',i):block-=1;i+=2
            else:i+=1
            continue
        if quote:
            if escape and source[i]=='\\':i+=2;continue
            if source.startswith(quote,i):
                if quote in ["'",'"'] and source.startswith(quote+quote,i):i+=2;continue
                i+=len(quote);quote=None
            else:i+=1
            continue
        if source.startswith('--',i):line=True;i+=2;continue
        if source.startswith('/*',i):block=1;i+=2;continue
        if source[i] in ["'",'"']:
            quote=source[i];escape=quote=="'" and i>0 and source[i-1] in 'Ee' and (i<2 or not (source[i-2].isalnum() or source[i-2]=='_'));i+=1;continue
        dollar=re.match(r'\$[A-Za-z_0-9]*\$',source[i:]) if source[i]=='$' else None
        if dollar:quote=dollar.group();escape=False;i+=len(quote);continue
        if source[i]==';':result.append((start,i+1,source[start:i]));start=i+1
        i+=1
    if quote or block:raise ValueError('Unclosed SQL literal or comment')
    if source[start:].strip():result.append((start,len(source),source[start:]))
    return result


def unwrapped(source):
    # Classification strips only comments; original SQL is otherwise preserved.
    parts=[]
    for start,end,text in statements(source):
        clean=re.sub(r'/\*.*?\*/|--[^\n]*','',text,flags=re.S).strip()
        if clean:parts.append((start,end,clean))
    transactions=[p for p in parts if re.fullmatch(r'(BEGIN|START TRANSACTION|COMMIT|ROLLBACK)(?:\s+WORK)?',p[2],re.I)]
    if not transactions:return source
    if len(transactions)!=2 or transactions[0]!=parts[0] or transactions[1]!=parts[-1] or not re.fullmatch(r'BEGIN|START TRANSACTION',parts[0][2],re.I) or not re.fullmatch(r'COMMIT',parts[-1][2],re.I):
        raise ValueError('Only a single outer BEGIN/COMMIT transaction is supported')
    return source[parts[0][1]:parts[-1][0]]


def render(directory,phase):
    files=sorted(Path(directory).glob('*.sql'))
    if not files:raise ValueError('No migration files')
    sql=["\\set ON_ERROR_STOP on", "SELECT pg_advisory_lock(61106, 9417);", "CREATE TABLE IF NOT EXISTS public._migrations(id SERIAL PRIMARY KEY, migration_name TEXT NOT NULL UNIQUE, executed_at TIMESTAMPTZ NOT NULL DEFAULT now());"]
    names=[]
    for file in files:
        if not re.fullmatch(r'[A-Za-z0-9_.-]+\.sql',file.name):raise ValueError('Unsafe migration filename')
        source=file.read_text()
        file_phase='post-deploy' if re.search(r'^-- migration-phase: post-deploy\s*$',source,re.M) else 'pre-deploy'
        if file_phase!=phase:continue
        if re.search(r'^\s*\\',source,re.M):raise ValueError('Migration cannot change psql control flow')
        nontransactional=bool(re.search(r'^-- migration-transaction: none\s*$',source,re.M))
        if nontransactional and not re.search(r'^-- migration-idempotent: true\s*$',source,re.M):raise ValueError('Nontransactional migrations must declare idempotent retry safety')
        body=unwrapped(source)
        if nontransactional and body!=source:raise ValueError('Nontransactional migration cannot contain transaction wrappers')
        names.append(file.name)
        sql += [f"SELECT NOT EXISTS(SELECT 1 FROM public._migrations WHERE migration_name='{file.name}') AS pending \\gset", "\\if :pending",f"\\echo Applying:{file.name}"]
        if not nontransactional:sql.append('BEGIN;')
        sql += [body,f"INSERT INTO public._migrations(migration_name) VALUES('{file.name}');"]
        if not nontransactional:sql.append('COMMIT;')
        sql += [f"\\echo Applied:{file.name}","\\endif"]
    sql += ["NOTIFY pgrst, 'reload schema';","SELECT pg_advisory_unlock(61106, 9417);"]
    return '\n'.join(sql)+'\n',names


def main():
    phase='post-deploy' if sys.argv[1:]==['--post-deploy'] else 'pre-deploy' if not sys.argv[1:] else None
    if not phase:raise ValueError('Usage: migration-runner.py [--post-deploy]')
    spec=importlib.util.spec_from_file_location('pg_config',Path(__file__).with_name('pg-with-url.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    env=module.connection_env(os.environ.get('SUPABASE_DB_URL',''))
    sql,names=render('migrations',phase)
    result=subprocess.run(['psql','-X','-q','-v','ON_ERROR_STOP=1'],input=sql,text=True,env=env,capture_output=True)
    markers={f'Applying:{name}' for name in names}|{f'Applied:{name}' for name in names}
    for line in result.stdout.splitlines():
        if line.strip() in markers:print(line.strip())
    if result.returncode:raise RuntimeError('Migration failed; database details withheld. Transactional changes and their completion record roll back together; review any explicitly nontransactional migration before retrying.')
    print('Migration phase completed under the database lock: '+phase)

if __name__=='__main__':
    try:main()
    except Exception as error:
        # Configuration and PostgreSQL diagnostics can contain connection secrets.
        if isinstance(error,RuntimeError):print(str(error),file=sys.stderr)
        else:print('Migration configuration or SQL preparation failed; private details withheld',file=sys.stderr)
        sys.exit(2)

#!/usr/bin/env python3
"""Run a PostgreSQL client without putting the database password in argv."""
import os
import sys
from urllib.parse import urlsplit, unquote, quote, parse_qsl


def connection_env(value):
    # libpq URLs in older environment files may have raw #/@ in userinfo.
    # Normalize that section before the standard URL parser sees it.
    scheme, separator, rest = value.partition('://')
    userinfo, at, location = rest.rpartition('@')
    if separator and at:
        user, colon, password = userinfo.partition(':')
        value = scheme + '://' + quote(unquote(user), safe='')
        if colon:
            value += ':' + quote(unquote(password), safe='')
        value += '@' + location
    url = urlsplit(value)
    if url.scheme not in ('postgres', 'postgresql') or not url.hostname or not url.username or url.fragment:
        raise ValueError('SUPABASE_DB_URL must be a PostgreSQL URL')
    env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
    env.update(PGHOST=url.hostname, PGPORT=str(url.port or 5432),
               PGUSER=unquote(url.username), PGPASSWORD=unquote(url.password or ''),
               PGDATABASE=unquote(url.path.lstrip('/')) or 'postgres',
               PGCONNECT_TIMEOUT='20', PGSSLMODE='require')
    allowed = {'sslmode': 'PGSSLMODE', 'connect_timeout': 'PGCONNECT_TIMEOUT',
               'application_name': 'PGAPPNAME', 'sslrootcert': 'PGSSLROOTCERT'}
    for key, val in parse_qsl(url.query, strict_parsing=True):
        if key not in allowed:
            raise ValueError('Unsupported database connection option')
        env[allowed[key]] = val
    return env


if __name__ == '__main__':
    try:
        if len(sys.argv) < 2 or sys.argv[1] not in ('psql', 'pg_dump'):
            raise ValueError('Expected psql or pg_dump')
        env = connection_env(os.environ.get('SUPABASE_DB_URL', ''))
    except Exception:
        print('Invalid database client configuration; private details withheld', file=sys.stderr)
        sys.exit(2)
    os.execvpe(sys.argv[1], sys.argv[1:], env)

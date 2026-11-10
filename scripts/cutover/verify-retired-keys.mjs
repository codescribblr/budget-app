#!/usr/bin/env node
// Read-only cutover gate. Credentials come from the operator's environment,
// never command-line arguments. This script does not rotate or disable keys.
import { pathToFileURL } from 'node:url';

const projects = new Set(['nmqlddimigebtlaophbv', 'yhmexgwdytmyqourkivz']);
function legacyKey(key, project, role) {
  try {
    if (typeof key !== 'string' || key.split('.').length !== 3) throw Error();
    const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url'));
    if (claims.ref !== project || claims.role !== role) throw Error();
  } catch { throw Error('Legacy credential does not match the selected project and role'); }
}

export async function verifyRetiredKeys(env, fetcher = fetch) {
  const phase = env.CUTOVER_KEY_PHASE;
  if (!['baseline', 'retired'].includes(phase)) throw Error('Choose baseline or retired key verification');
  const project = env.CUTOVER_PROJECT_REF;
  if (!projects.has(project)) throw Error('Only the approved budget projects can be verified');
  const oldPublic = env.OLD_SUPABASE_ANON_KEY;
  const oldSecret = env.OLD_SUPABASE_SERVICE_ROLE_KEY;
  const newPublic = env.NEW_SUPABASE_PUBLISHABLE_KEY;
  const newSecret = env.NEW_SUPABASE_SECRET_KEY;
  legacyKey(oldPublic, project, 'anon');
  legacyKey(oldSecret, project, 'service_role');
  if (!/^sb_publishable_[A-Za-z0-9_-]{20,256}$/.test(newPublic || '') ||
      !/^sb_secret_[A-Za-z0-9_-]{20,256}$/.test(newSecret || '')) {
    throw Error('Replacement publishable and secret credentials are required');
  }
  const database = '/rest/v1/user_profiles?select=user_id&limit=0';
  const storage = '/storage/v1/bucket/backups';
  const oldHeaders = key => ({ apikey: key, Authorization: `Bearer ${key}` });
  const retiredStatus = phase === 'retired' ? 401 : 200;
  const probes = [
    ['old-public-auth', '/auth/v1/settings', oldHeaders(oldPublic), retiredStatus],
    ['old-server-database', database, oldHeaders(oldSecret), retiredStatus],
    ['old-server-storage', storage, oldHeaders(oldSecret), retiredStatus],
    // Disabling a legacy apikey alone is insufficient if its privileged JWT
    // still works as a bearer token alongside the replacement public key.
    ['old-server-bearer-database', database, { apikey: newPublic, Authorization: `Bearer ${oldSecret}` }, retiredStatus],
    ['old-server-bearer-storage', storage, { apikey: newPublic, Authorization: `Bearer ${oldSecret}` }, retiredStatus],
    ['replacement-public-auth', '/auth/v1/settings', { apikey: newPublic }, 200],
    ['replacement-server-database', database, { apikey: newSecret }, 200],
    ['replacement-server-storage', storage, { apikey: newSecret }, 200],
  ];
  const checks = [];
  for (const [name, path, headers, expectedStatus] of probes) {
    let status = null;
    try {
      const response = await fetcher(`https://${project}.supabase.co${path}`, {
        method: 'GET', headers, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(5000),
      });
      status = response.status;
      await response.body?.cancel();
    } catch { status = null; /* A network failure is never proof of revocation. */ }
    checks.push({ name, expectedStatus, status, passed: status === expectedStatus });
  }
  return { checkedAt: new Date().toISOString(), project, phase, mutations: false, passed: checks.every(c => c.passed), checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = await verifyRetiredKeys(process.env);
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  } catch {
    console.error('Key verification configuration is invalid; no successful cutover receipt was issued');
    process.exitCode = 1;
  }
}

#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
let commitSha = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA;
if (!commitSha) {
  try { commitSha = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(); }
  catch { throw Error('A source commit is required to identify this build'); }
}
if (!/^[a-f0-9]{40}$/.test(commitSha)) throw Error('Invalid source commit');
const run = process.env.GITHUB_RUN_ID;
const attempt = process.env.GITHUB_RUN_ATTEMPT || '1';
const releaseId = process.env.CLOUD_RELEASE_ID || (run ? `r-${run}-${attempt}-${commitSha.slice(0,12)}` : `r-${commitSha.slice(0,12)}-${Date.now()}-${randomBytes(4).toString('hex')}`);
if (!/^[a-z0-9][a-z0-9_-]{7,127}$/.test(releaseId)) throw Error('Invalid release identity');
const buildTimestamp = Date.now();
const version = { releaseId, commitSha, buildTime: new Date(buildTimestamp).toISOString(), buildTimestamp };
fs.mkdirSync(path.join(process.cwd(),'public'),{recursive:true});
fs.writeFileSync(path.join(process.cwd(),'public/version.json'),JSON.stringify(version,null,2)+'\n');
console.log(`Generated immutable version ${releaseId}`);

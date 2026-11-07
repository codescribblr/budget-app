import { cp, mkdir, readFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
const target='.release-work/standalone';
await mkdir('.release-work',{recursive:true});
await mkdir(target); // A dirty output directory must never leak into a release.
await cp('.next/standalone',target,{recursive:true});
await cp('.next/static',`${target}/.next/static`,{recursive:true});
await cp('public',`${target}/public`,{recursive:true});
await cp('email-templates',`${target}/email-templates`,{recursive:true});
await access(`${target}/server.js`);
const version=JSON.parse(await readFile(`${target}/public/version.json`,'utf8'));
const expected=process.env.CLOUD_RELEASE_ID||`r-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT||'1'}-${process.env.GITHUB_SHA?.slice(0,12)}`;
assert.equal(version.releaseId,expected,'Build identity must match the release being packaged');
assert.equal(version.commitSha,process.env.GITHUB_SHA);
console.log('Prepared standalone server, browser assets, email templates and immutable version manifest');

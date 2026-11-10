import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyRetiredKeys } from './verify-retired-keys.mjs';
const project='nmqlddimigebtlaophbv';
const key=role=>'test.'+Buffer.from(JSON.stringify({ref:project,role})).toString('base64url')+'.test';
const env={CUTOVER_PROJECT_REF:project,CUTOVER_KEY_PHASE:'retired',OLD_SUPABASE_ANON_KEY:key('anon'),OLD_SUPABASE_SERVICE_ROLE_KEY:key('service_role'),NEW_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+ 'a'.repeat(32),NEW_SUPABASE_SECRET_KEY:'sb_secret_'+ 'b'.repeat(32)};
test('baseline proves both credential sets work using only bounded metadata reads',async()=>{
 let count=0;
 const report=await verifyRetiredKeys({...env,CUTOVER_KEY_PHASE:'baseline'},async(url,options)=>{
  count++;
  assert.equal(new URL(url).origin,`https://${project}.supabase.co`);
  assert.ok(['/auth/v1/settings','/rest/v1/user_profiles?select=user_id&limit=0','/storage/v1/bucket/backups'].includes(new URL(url).pathname+new URL(url).search));
  assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
  assert.ok(options.signal instanceof AbortSignal);
  return new Response('{}');
 });
 assert.equal(count,8);assert.equal(report.passed,true);assert.equal(report.mutations,false);
 for(const value of [env.OLD_SUPABASE_ANON_KEY,env.OLD_SUPABASE_SERVICE_ROLE_KEY,env.NEW_SUPABASE_PUBLISHABLE_KEY,env.NEW_SUPABASE_SECRET_KEY])assert.ok(!JSON.stringify(report).includes(value));
});
test('retirement requires every old-key path to reject and every replacement to succeed',async()=>{
 const request=async(_url,options)=>new Response('{}',{status:options.headers.Authorization?401:200});
 assert.equal((await verifyRetiredKeys(env,request)).passed,true);
 for(const status of [200,403,429,500]) {
  const report=await verifyRetiredKeys(env,async(url,options)=>options.headers.apikey===env.NEW_SUPABASE_PUBLISHABLE_KEY&&options.headers.Authorization?new Response('{}',{status}):request(url,options));
  assert.equal(report.passed,false);
  assert.equal(report.checks.find(c=>c.name==='old-server-bearer-database').passed,false);
 }
 const invalidReplacement=await verifyRetiredKeys(env,async()=>new Response('{}',{status:401}));
 assert.equal(invalidReplacement.passed,false);
});
test('network failures and redirects do not count as retired credentials',async()=>{
 for(const response of [async()=>{throw Error(env.OLD_SUPABASE_SERVICE_ROLE_KEY)},async()=>new Response('',{status:302})]) {
  const result=await verifyRetiredKeys(env,response);assert.equal(result.passed,false);
  assert.ok(!JSON.stringify(result).includes(env.OLD_SUPABASE_SERVICE_ROLE_KEY));
 }
});
test('invalid targets, private/public swaps and wrong-project credentials fail before network access',async()=>{
 for(const change of [{CUTOVER_PROJECT_REF:'foreign'}, {CUTOVER_KEY_PHASE:'anything'}, {NEW_SUPABASE_PUBLISHABLE_KEY:env.NEW_SUPABASE_SECRET_KEY}, {OLD_SUPABASE_ANON_KEY:env.OLD_SUPABASE_SERVICE_ROLE_KEY}, {CUTOVER_PROJECT_REF:'yhmexgwdytmyqourkivz'}]) {
  await assert.rejects(verifyRetiredKeys({...env,...change},async()=>assert.fail('Unexpected request')));
 }
});

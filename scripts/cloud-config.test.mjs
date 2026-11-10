import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudConfig,verifyCloudSupabaseKey} from './cloud-config.mjs';
const key=(ref,role='anon')=>'test.'+Buffer.from(JSON.stringify({ref,role})).toString('base64url')+'.test';
const config={environment:'staging',buildEnv:{NEXT_PUBLIC_DEPLOYMENT_MODE:'staging',NEXT_PUBLIC_SUPABASE_URL:'https://nmqlddimigebtlaophbv.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:key('nmqlddimigebtlaophbv'),SCHEDULED_JOBS_ENABLED:'false',NEXT_PUBLIC_LOGROCKET_ENABLED:'false'}};
test('functional staging accepts only the approved project with side effects disabled',()=>{
 assert.doesNotThrow(()=>validateCloudConfig(config,'staging'));
 for(const change of [{NEXT_PUBLIC_DEPLOYMENT_MODE:''},{NEXT_PUBLIC_SUPABASE_URL:'https://yhmexgwdytmyqourkivz.supabase.co'},{NEXT_PUBLIC_SUPABASE_ANON_KEY:key('yhmexgwdytmyqourkivz')},{NEXT_PUBLIC_SUPABASE_ANON_KEY:key('nmqlddimigebtlaophbv','service_role')},{SCHEDULED_JOBS_ENABLED:'true'},{SUPABASE_SERVICE_ROLE_KEY:'secret'},{STRIPE_SECRET_KEY:'secret'},{NEXT_PUBLIC_LOGROCKET_ENABLED:'true'}])assert.throws(()=>validateCloudConfig({...config,buildEnv:{...config.buildEnv,...change}},'staging'));
 assert.throws(()=>validateCloudConfig(config,'production'));
});
test('production rejects the staging-only Google confirmation flag',()=>{
 const production={environment:'production',buildEnv:{NEXT_PUBLIC_SUPABASE_URL:'https://yhmexgwdytmyqourkivz.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:key('yhmexgwdytmyqourkivz')}};
 assert.doesNotThrow(()=>validateCloudConfig(production,'production'));
 assert.throws(()=>validateCloudConfig({...production,buildEnv:{...production.buildEnv,NEXT_PUBLIC_STAGING_GOOGLE_CHECK:'1'}},'production'),/Production cannot enable/);
});
const publishable = 'sb_publishable_' + 'test'.repeat(8);
test('both environments accept publishable keys and keep server keys out of builds',()=>{
 for(const target of ['staging','production']) {
  const candidate={environment:target,buildEnv:target==='staging'?{...config.buildEnv,NEXT_PUBLIC_SUPABASE_ANON_KEY:publishable}:{NEXT_PUBLIC_SUPABASE_URL:'https://yhmexgwdytmyqourkivz.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:publishable}};
  assert.doesNotThrow(()=>validateCloudConfig(candidate,target));
  for(const change of [{NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_secret_'+ 'x'.repeat(32)}, {NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_short'}, {NEXT_PUBLIC_SUPABASE_ANON_KEY:key('foreign')}, {SUPABASE_SERVICE_ROLE_KEY:'private'}, {SUPABASE_SECRET_KEY:'private'}, {NEXT_PUBLIC_OTHER_KEY:'sb_secret_'+ 'x'.repeat(32)}]) {
   assert.throws(()=>validateCloudConfig({...candidate,buildEnv:{...candidate.buildEnv,...change}},target));
  }
 }
});
test('preflight verifies opaque and legacy public keys at the pinned project without forwarding or logging credentials',async()=>{
 for(const publicKey of [publishable,config.buildEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY]) {
  const candidate={...config,buildEnv:{...config.buildEnv,NEXT_PUBLIC_SUPABASE_ANON_KEY:publicKey}};
  let calls=0;
  await verifyCloudSupabaseKey(candidate,'staging',async(url,options)=>{
   calls++;
   assert.equal(url,'https://nmqlddimigebtlaophbv.supabase.co/auth/v1/settings');
   assert.deepEqual(options.headers,{apikey:publicKey});
   assert.equal(options.redirect,'error');
   assert.equal(options.cache,'no-store');
   assert.ok(options.signal instanceof AbortSignal);
   return new Response('{}');
  });
  assert.equal(calls,1);
  for(const status of [301,401,403,429,500]) {
   await assert.rejects(verifyCloudSupabaseKey(candidate,'staging',async()=>new Response('secret: '+publicKey,{status})),error=>error.message==='Supabase public-key preflight failed for the configured project');
  }
  await assert.rejects(verifyCloudSupabaseKey(candidate,'staging',async()=>{throw Error(publicKey)}),error=>!error.message.includes(publicKey));
 }
});
test('preflight never sends keys to an unapproved project and smoke remains offline',async()=>{
 const forbidden=async()=>{assert.fail('Unexpected network request');};
 await assert.rejects(verifyCloudSupabaseKey({...config,buildEnv:{...config.buildEnv,NEXT_PUBLIC_SUPABASE_URL:'https://foreign.invalid'}},'staging',forbidden));
 await verifyCloudSupabaseKey({environment:'staging',buildEnv:{NEXT_PUBLIC_DEPLOYMENT_MODE:'smoke',NEXT_PUBLIC_SUPABASE_URL:'https://staging-disabled.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'staging-placeholder'}},'staging',forbidden);
});

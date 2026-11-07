import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const config=JSON.parse(await readFile('.cloud-build.json','utf8'));
const smoke=process.env.CLOUD_TARGET==='staging';
assert.equal(config.environment,smoke?'staging':'production','Panel environment does not match the workflow');
if(smoke){
 assert.equal(config.buildEnv.NEXT_PUBLIC_DEPLOYMENT_MODE,'smoke');
 assert.equal(config.buildEnv.NEXT_PUBLIC_SUPABASE_URL,'https://staging-disabled.invalid');
 assert.equal(config.buildEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,'staging-placeholder');
}else{
 assert.notEqual(config.buildEnv.NEXT_PUBLIC_DEPLOYMENT_MODE,'smoke');
 assert.ok(config.buildEnv.NEXT_PUBLIC_SUPABASE_URL?.endsWith('.supabase.co'));
 assert.ok(config.buildEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length>40);
}
console.log('Validated Cloud Panel environment and staging isolation');

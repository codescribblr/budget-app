import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudConfig} from './cloud-config.mjs';
const key=(ref,role='anon')=>'test.'+Buffer.from(JSON.stringify({ref,role})).toString('base64url')+'.test';
const config={environment:'staging',buildEnv:{NEXT_PUBLIC_DEPLOYMENT_MODE:'staging',NEXT_PUBLIC_SUPABASE_URL:'https://nmqlddimigebtlaophbv.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:key('nmqlddimigebtlaophbv'),SCHEDULED_JOBS_ENABLED:'false',NEXT_PUBLIC_LOGROCKET_ENABLED:'false'}};
test('functional staging accepts only the approved project with side effects disabled',()=>{
 assert.doesNotThrow(()=>validateCloudConfig(config,'staging'));
 for(const change of [{NEXT_PUBLIC_DEPLOYMENT_MODE:''},{NEXT_PUBLIC_SUPABASE_URL:'https://yhmexgwdytmyqourkivz.supabase.co'},{NEXT_PUBLIC_SUPABASE_ANON_KEY:key('yhmexgwdytmyqourkivz')},{NEXT_PUBLIC_SUPABASE_ANON_KEY:key('nmqlddimigebtlaophbv','service_role')},{SCHEDULED_JOBS_ENABLED:'true'},{SUPABASE_SERVICE_ROLE_KEY:'secret'},{STRIPE_SECRET_KEY:'secret'},{NEXT_PUBLIC_LOGROCKET_ENABLED:'true'}])assert.throws(()=>validateCloudConfig({...config,buildEnv:{...config.buildEnv,...change}},'staging'));
 assert.throws(()=>validateCloudConfig(config,'production'));
});

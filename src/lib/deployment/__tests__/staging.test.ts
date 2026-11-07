import {describe,it,expect} from 'vitest';
import {stagingAccessStatus,TESTING_SUPABASE_URL} from '../staging';
const user='00000000-0000-4000-8000-000000000001';
const env={NEXT_PUBLIC_SUPABASE_URL:TESTING_SUPABASE_URL,STAGING_ALLOWED_USER_IDS:user};
describe('functional staging isolation',()=>{
 it('allows public login and authenticated synthetic budget operations',()=>{
  expect(stagingAccessStatus('/login','GET',undefined,env)).toBeNull();
  expect(stagingAccessStatus('/api/transactions','POST',user,env)).toBeNull();
  expect(stagingAccessStatus('/api/backups','POST',user,env)).toBeNull();
 });
 it('denies anonymous writes and authenticated users outside the synthetic allowlist',()=>{
  expect(stagingAccessStatus('/api/transactions','POST',undefined,env)).toBe(401);
  expect(stagingAccessStatus('/api/accounts','GET','00000000-0000-4000-8000-000000000002',env)).toBe(403);
 });
 it('fails closed for a missing allowlist or an incorrect backend',()=>{
  expect(stagingAccessStatus('/login','GET',undefined,{...env,STAGING_ALLOWED_USER_IDS:''})).toBe(503);
  expect(stagingAccessStatus('/api/transactions','POST',user,{...env,NEXT_PUBLIC_SUPABASE_URL:'https://yhmexgwdytmyqourkivz.supabase.co'})).toBe(503);
 });
 it('prevents provider calls, callbacks, emails, jobs and admin actions even for allowed users',()=>{
  for(const path of ['/auth/callback','/api/auth/signup-with-invite','/api/webhooks/teller','/api/invitations','/api/cron/run-jobs','/api/automatic-imports/teller/fetch','/api/settings/integrations/rentcast/test','/api/subscription/create-checkout-session','/api/admin/scheduled-jobs','/api/import/process-pdf','/api/non-cash-assets/1/rentcast/sync'])expect(stagingAccessStatus(path,'POST',user,env),path).toBe(503);
 });
});

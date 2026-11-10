import { describe, expect, it } from 'vitest';
import { isStagingGoogleUser, stagingGoogleCheckEnabled } from '../staging-google';
import { stagingAccessStatus, TESTING_SUPABASE_URL } from '../staging';
const synthetic='00000000-0000-4000-8000-000000000001';
const operator='00000000-0000-4000-8000-000000000002';
const env={NEXT_PUBLIC_DEPLOYMENT_MODE:'staging',NEXT_PUBLIC_SUPABASE_URL:TESTING_SUPABASE_URL,NEXT_PUBLIC_STAGING_GOOGLE_CHECK:'1',STAGING_GOOGLE_AUTH_EMAILS:'operator@example.test',STAGING_ALLOWED_USER_IDS:synthetic};
const user={email:'operator@example.test',email_confirmed_at:'2026-11-09T00:00:00Z',identities:[{provider:'google'}]};
describe('isolated staging Google check',()=>{
 it('requires explicit opt-in, the testing backend and a valid exact email allowlist',()=>{
  expect(stagingGoogleCheckEnabled(env)).toBe(true);
  for(const change of [{NEXT_PUBLIC_DEPLOYMENT_MODE:'production'},{NEXT_PUBLIC_SUPABASE_URL:'https://yhmexgwdytmyqourkivz.supabase.co'},{NEXT_PUBLIC_STAGING_GOOGLE_CHECK:''},{STAGING_GOOGLE_AUTH_EMAILS:''},{STAGING_GOOGLE_AUTH_EMAILS:'*@example.test'}])expect(stagingGoogleCheckEnabled({...env,...change})).toBe(false);
  expect(isStagingGoogleUser(user,env)).toBe(true);
  for(const change of [{email:'unapproved@example.test'},{email_confirmed_at:''},{identities:[{provider:'email'}]}])expect(isStagingGoogleUser({...user,...change},env)).toBe(false);
 });
 it('allows a public code callback but only the approved identity may read the confirmation or sign out',()=>{
  expect(stagingAccessStatus('/auth/callback','GET',undefined,env)).toBeNull();
  expect(stagingAccessStatus('/auth/callback','POST',operator,env,user)).toBe(503);
  for(const method of ['GET','POST']){
   expect(stagingAccessStatus('/auth/google-check',method,operator,env,user)).toBeNull();
   expect(stagingAccessStatus('/auth/google-check',method,undefined,env)).toBe(401);
   expect(stagingAccessStatus('/auth/google-check',method,synthetic,env,{...user,identities:[{provider:'email'}]})).toBe(403);
  }
 });
 it('does not grant the Google operator any budget or provider access',()=>{
  for(const method of ['GET','POST','PUT','DELETE']){
   for(const path of ['/api/accounts','/api/transactions','/api/backups','/api/import/process-pdf','/dashboard','/new'])expect(stagingAccessStatus(path,method,operator,env,user),method+' '+path).toBe(403);
   for(const path of ['/api/webhooks/stripe','/api/cron/run-jobs','/api/invitations','/api/import/process-image'])expect(stagingAccessStatus(path,method,operator,env,user),method+' '+path).toBe(503);
  }
  expect(stagingAccessStatus('/api/transactions','POST',synthetic,env)).toBeNull();
 });
});

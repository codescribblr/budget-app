import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks=vi.hoisted(()=>({client:vi.fn(),getUser:vi.fn(),signOut:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:mocks.client}));
import {GET,POST} from './route';
beforeEach(()=>{
 vi.resetAllMocks();
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('NEXT_PUBLIC_APP_URL','https://budget-stage.jrwdev.com');
 vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE','staging');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://nmqlddimigebtlaophbv.supabase.co');vi.stubEnv('NEXT_PUBLIC_STAGING_GOOGLE_CHECK','1');vi.stubEnv('STAGING_GOOGLE_AUTH_EMAILS','operator@example.test');
 mocks.client.mockResolvedValue({auth:{getUser:mocks.getUser,signOut:mocks.signOut}});
 mocks.getUser.mockResolvedValue({data:{user:{id:'operator',email:'operator@example.test',email_confirmed_at:'2026-11-09',identities:[{provider:'google'}]}}});
 mocks.signOut.mockResolvedValue({error:null});
});
afterEach(()=>vi.unstubAllEnvs());
describe('staging Google confirmation endpoint',()=>{
 it('confirms the real authenticated identity with private caching and no script access',async()=>{
  const response=await GET();expect(response.status).toBe(200);expect(await response.text()).toContain('operator@example.test');
  expect(response.headers.get('cache-control')).toBe('private, no-store');expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
 });
 it('is unavailable in production and fails closed for anonymous or unapproved sessions',async()=>{
  mocks.getUser.mockResolvedValue({data:{user:null}});expect((await GET()).status).toBe(401);
  mocks.getUser.mockResolvedValue({data:{user:{email:'someone@example.test'}}});expect((await GET()).status).toBe(403);
  vi.stubEnv('NEXT_PUBLIC_DEPLOYMENT_MODE','production');mocks.client.mockClear();expect((await GET()).status).toBe(404);expect(mocks.client).not.toHaveBeenCalled();
 });
 it('signs out only this session and rejects cross-origin signout',async()=>{
  const bad=await POST(new NextRequest('https://localhost:3000/auth/google-check',{method:'POST',headers:{origin:'https://attacker.example'}}));
  expect(bad.status).toBe(403);expect(mocks.signOut).not.toHaveBeenCalled();
  const good=await POST(new NextRequest('https://localhost:3000/auth/google-check',{method:'POST',headers:{origin:'https://budget-stage.jrwdev.com'}}));
  expect(good.status).toBe(303);expect(good.headers.get('location')).toBe('https://budget-stage.jrwdev.com/login');expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'});
 });
});

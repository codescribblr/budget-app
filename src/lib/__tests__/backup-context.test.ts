import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({auth:vi.fn(),service:vi.fn()}));
vi.mock('../supabase-queries',()=>({getAuthenticatedUser:mocks.auth}));
vi.mock('../supabase/server',()=>({createServiceRoleClient:mocks.service}));
vi.mock('../account-context',()=>({getActiveAccountId:vi.fn(),userHasAccountWriteAccess:vi.fn(),userHasOwnAccount:vi.fn()}));
import {exportAccountDataForAccount,exportAccountData,importUserDataFromFile,type UserBackupData} from '../backup-utils';
describe('backup authorization across overlapping requests',()=>{
 beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockRejectedValue(new Error('session authentication required'));});
 it('does not let a browser export or restore inherit an in-flight API-key account',async()=>{
  let release!: (value:unknown)=>void;
  const pending=new Promise(resolve=>{release=resolve;});
  const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),single:vi.fn(()=>pending)};
  mocks.service.mockReturnValue({from:vi.fn(()=>query)});
  const privileged=exportAccountDataForAccount(101,'api-owner');
  const outcome=expect(privileged).rejects.toThrow('Account not found');
  expect(query.eq).toHaveBeenCalledWith('id',101);
  try {
   await expect(exportAccountData()).rejects.toThrow('session authentication required');
   await expect(importUserDataFromFile({} as UserBackupData)).rejects.toThrow('session authentication required');
   expect(mocks.auth).toHaveBeenCalledTimes(2);
   expect(query.eq).toHaveBeenCalledTimes(1);
  } finally {
   release({data:null,error:new Error('fixture stop')});await outcome;
  }
  await expect(exportAccountData()).rejects.toThrow('session authentication required');
 });
});

import {describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({active:vi.fn()}));
vi.mock('../../account-context',()=>({getActiveAccountId:mocks.active}));
import {checkImportBudget} from '../request-budget';
import {importInBatches} from '../import-batches';
describe('budget identity across import chunks',()=>{
 it('stops later writes if another tab switches the active budget',async()=>{
  mocks.active.mockResolvedValueOnce(27).mockResolvedValueOnce(28);
  const committed:number[]=[];
  const send=vi.fn(async(rows:number[])=>{
   const response=await checkImportBudget(27);
   if(response){expect(response.status).toBe(409);throw Error((await response.json()).error);}
   committed.push(...rows);return {imported:rows.length};
  });
  await expect(importInBatches(Array.from({length:120},(_,i)=>i),send)).rejects.toThrow('50 of 120 imports confirmed');
  expect(committed).toEqual(Array.from({length:50},(_,i)=>i));expect(send).toHaveBeenCalledTimes(2);
 });
 it('rejects malformed identities and retains compatibility for old unbatched callers',async()=>{
  expect((await checkImportBudget('27'))?.status).toBe(409);
  expect(await checkImportBudget(undefined)).toBeNull();
 });
});

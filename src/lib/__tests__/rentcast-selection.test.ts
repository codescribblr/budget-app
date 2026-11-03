import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({write:vi.fn(),active:vi.fn(),asset:vi.fn(),auth:vi.fn(),guard:vi.fn()}));
vi.mock('@/lib/api-helpers',()=>({checkWriteAccess:mocks.write}));
vi.mock('@/lib/account-context',()=>({getActiveAccountId:mocks.active}));
vi.mock('@/lib/supabase-queries',()=>({getNonCashAssetById:mocks.asset,getAuthenticatedUser:mocks.auth}));
vi.mock('@/lib/guarded-record-route',()=>({guardedRecordUpdate:mocks.guard}));
vi.mock('@/lib/audit/account-balance-audit',()=>({createNetWorthSnapshot:vi.fn()}));
import {POST} from '@/app/api/non-cash-assets/[id]/rentcast/select-value/route';
const body={preference:'low',expectedValuationId:7,expectedRevision:'00000000-0000-4000-8000-000000000001',expectedBudgetId:27};
const send=(b:unknown)=>POST(new Request('http://localhost/api/non-cash-assets/1/rentcast/select-value',{method:'POST',body:JSON.stringify(b)}),{params:Promise.resolve({id:'1'})});
beforeEach(()=>{vi.clearAllMocks();mocks.write.mockResolvedValue(null);mocks.active.mockResolvedValue(27);mocks.asset.mockResolvedValue({id:1,asset_type:'real_estate',current_value:200000});const q:any={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,maybeSingle:async()=>({data:{id:7,estimated_value:300000,price_range_low:280000,price_range_high:null}})};mocks.auth.mockResolvedValue({supabase:{from:()=>q},user:{id:'test'}});mocks.guard.mockResolvedValue(new Response('{}',{status:200}));});
describe('reviewed property value selection',()=>{
 it('applies the reviewed figure through revision protection without a provider request',async()=>{expect((await send(body)).status).toBe(200);expect(mocks.guard).toHaveBeenCalledWith('non_cash_assets',1,{current_value:280000,rentcast_value_preference:'low',expectedRevision:body.expectedRevision,expectedBudgetId:27});});
 it('does not substitute a newly fetched estimate for the one the user reviewed',async()=>{expect((await send({...body,expectedValuationId:6})).status).toBe(409);expect(mocks.guard).not.toHaveBeenCalled();});
 it('propagates a stale value conflict without falling back to an unguarded update',async()=>{mocks.guard.mockResolvedValue(new Response('{}',{status:409}));expect((await send(body)).status).toBe(409);});
 it('does not offer an unavailable range or allow a viewer write',async()=>{expect((await send({...body,preference:'high'})).status).toBe(400);mocks.write.mockResolvedValue(new Response('{}',{status:403}));expect((await send(body)).status).toBe(403);expect(mocks.guard).not.toHaveBeenCalled();});
});

import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({fetch:vi.fn()}));
vi.mock('@/lib/encryption',()=>({decrypt:()=> 'test-only-key',encrypt:()=>''}));
vi.mock('@/lib/integrations/rentcast/client',()=>({fetchRentCastValueEstimate:mocks.fetch}));
import {syncRentCastAsset} from '../integrations/rentcast/sync';
import type {RentCastAssetFields} from '../integrations/rentcast/types';
const asset:RentCastAssetFields={id:1,account_id:27,revision:'00000000-0000-4000-8000-000000000001',name:'Test property',asset_type:'real_estate',address:'Synthetic',current_value:200000,rentcast_enabled:true,property_type:null,bedrooms:null,bathrooms:null,square_footage:null,rentcast_last_sync_at:null,rentcast_last_error:null};
let rpc:ReturnType<typeof vi.fn>;let update:ReturnType<typeof vi.fn>;let db:any;
beforeEach(()=>{
 vi.clearAllMocks();mocks.fetch.mockResolvedValue({price:220000});
 const integration={id:9,is_enabled:true,encrypted_api_key:'test',config:{enforce_monthly_limit:true,monthly_request_limit:50},requests_this_month:0};
 rpc=vi.fn(async(name:string)=>name==='reserve_rentcast_request'?{data:integration}:{data:{status:'saved',oldValue:200000,newValue:220000}});
 const chain:any={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:integration}),then:(yes:any,no:any)=>Promise.resolve({data:[]}).then(yes,no),upsert:async()=>({error:null})};
 update=vi.fn(()=>chain);chain.update=update;db={rpc,from:()=>chain};
});
describe('guarded RentCast worker',()=>{
 it('reserves one request and atomically commits with the original revision',async()=>{expect((await syncRentCastAsset(db,27,asset)).success).toBe(true);expect(rpc).toHaveBeenNthCalledWith(1,'reserve_rentcast_request',{p_integration_id:9});expect(rpc).toHaveBeenNthCalledWith(2,'apply_rentcast_estimate',{p_budget_id:27,p_asset_id:1,p_revision:asset.revision,p_estimate:{price:220000}});expect(mocks.fetch).toHaveBeenCalledTimes(1);expect(update.mock.calls.every(([payload])=>!('current_value' in payload))).toBe(true);});
 it('does not retry or overwrite newer edits when the provider response loses the revision race',async()=>{rpc.mockImplementation(async(name:string)=>name==='reserve_rentcast_request'?{data:{id:9}}:{data:{status:'conflict'}});const result=await syncRentCastAsset(db,27,asset);expect(result.success).toBe(false);expect(result.error).toContain('newer details were kept');expect(mocks.fetch).toHaveBeenCalledTimes(1);expect(update).not.toHaveBeenCalled();});
 it('does not call the provider when the atomic quota reservation fails',async()=>{rpc.mockResolvedValue({error:{code:'P0001'}});expect((await syncRentCastAsset(db,27,asset)).success).toBe(false);expect(mocks.fetch).not.toHaveBeenCalled();});
 it('keeps disabled properties out of requests and writes',async()=>{expect((await syncRentCastAsset(db,27,{...asset,rentcast_enabled:false})).skipped).toBe(true);expect(rpc).not.toHaveBeenCalled();expect(mocks.fetch).not.toHaveBeenCalled();});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
const mocks = vi.hoisted(() => ({access:vi.fn(),auth:vi.fn(),account:vi.fn(),rpc:vi.fn()}));
vi.mock("../supabase-queries",()=>({getAuthenticatedUser:mocks.auth}));
vi.mock("../account-context",()=>({getActiveAccountId:mocks.account}));
vi.mock("../api-helpers",()=>({checkWriteAccess:mocks.access}));
import {moveIncomeBuffer} from "../income-buffer-move";
const request=(body:unknown)=>new Request("http://localhost/api/income-buffer/add",{method:"POST",body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();mocks.account.mockResolvedValue(27);mocks.access.mockResolvedValue(null);mocks.auth.mockResolvedValue({supabase:{rpc:mocks.rpc}});mocks.rpc.mockResolvedValue({data:{status:"saved",result:{success:true,newBalance:89.75,amountWithdrawn:10.25}},error:null});});
describe("atomic buffer API compatibility",()=>{
 it.each(["add","release"] as const)("blocks a viewer from %s",async(direction)=>{mocks.access.mockResolvedValue(NextResponse.json({error:"Forbidden"},{status:403}));expect((await moveIncomeBuffer(request({amount:10}),direction)).status).toBe(403);expect(mocks.rpc).not.toHaveBeenCalled();});
 it.each(["10",0,-1,1.001,null,1e12])("rejects invalid money %s",async(amount)=>{expect((await moveIncomeBuffer(request({amount}),"add")).status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled();});
 it("rejects malformed JSON",async()=>{expect((await moveIncomeBuffer(new Request("http://localhost",{method:"POST",body:"{"}),"add")).status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled();});
 it("keeps the classic receipt and delegates audit and balances to one transaction",async()=>{const r=await moveIncomeBuffer(request({amount:10.25,expectedBalance:100}),"release");expect(await r.json()).toEqual({success:true,newBalance:89.75,amountWithdrawn:10.25});expect(mocks.rpc).toHaveBeenCalledWith("run_envelope_command",{p_budget_id:27,p_operation_id:expect.any(String),p_command:{kind:"buffer-release",amount:10.25,expectedBalance:100}});});
 it("returns a typed conflict without replaying a write",async()=>{mocks.rpc.mockResolvedValue({data:{status:"conflict",error:"Your buffer changed."},error:null});const r=await moveIncomeBuffer(request({amount:10,expectedBalance:100}),"release");expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:"STALE_RECORD"});expect(mocks.rpc).toHaveBeenCalledTimes(1);});
 it("retains the disabled-feature error contract",async()=>{mocks.rpc.mockResolvedValue({error:{code:"22023",message:"Income Buffer is not enabled."}});expect((await moveIncomeBuffer(request({amount:10}),"add")).status).toBe(403);});
 it("rejects changed household before the database write",async()=>{const r=await moveIncomeBuffer(request({amount:10,expectedBudgetId:28,operationId:crypto.randomUUID()}),"add");expect(r.status).toBe(409);expect(mocks.rpc).not.toHaveBeenCalled();});
 it("requires scope and operation id together",async()=>{expect((await moveIncomeBuffer(request({amount:10,expectedBudgetId:27}),"add")).status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled();});
 it("passes the same guarded operation identity for safe replay",async()=>{const operationId=crypto.randomUUID();await moveIncomeBuffer(request({amount:10,expectedBudgetId:27,operationId}),"add");expect(mocks.rpc.mock.calls[0][1].p_operation_id).toBe(operationId);});
 it("surfaces authoritative insufficient-money validation",async()=>{mocks.rpc.mockResolvedValue({error:{code:"22023",message:"Not enough available money."}});expect((await moveIncomeBuffer(request({amount:2500}),"add")).status).toBe(400);});
});

describe("buffer-funded allocation API", () => {
  it("sends both reviewed source balances and the withdrawal in one guarded command", async () => {
    const { executeEnvelopeCommand } =
      await import("../envelope-command-route");
    const operationId = crypto.randomUUID();
    await executeEnvelopeCommand(
      {
        expectedBudgetId: 27,
        operationId,
        allocations: [{ categoryId: 1, amount: 250 }],
        month: "2026-11-01",
        expectedAvailable: 100,
        expectedBalance: 500,
        bufferWithdrawAmount: 150,
      },
      "allocate",
    );
    expect(mocks.rpc).toHaveBeenCalledWith("run_envelope_command", {
      p_budget_id: 27,
      p_operation_id: operationId,
      p_command: {
        kind: "allocate",
        allocations: [{ categoryId: 1, amount: 250 }],
        month: "2026-11-01",
        expectedAvailable: 100,
        expectedBalance: 500,
        bufferWithdrawAmount: 150,
      },
    });
  });
  it("returns a stale-source conflict to the funding review", async () => {
    const { executeEnvelopeCommand } =
      await import("../envelope-command-route");
    mocks.rpc.mockResolvedValue({
      data: {
        status: "conflict",
        error:
          "Your buffer changed. Review the latest balance before continuing.",
      },
      error: null,
    });
    const result = await executeEnvelopeCommand(
      {
        expectedBudgetId: 27,
        operationId: crypto.randomUUID(),
        allocations: [{ categoryId: 1, amount: 250 }],
        month: "2026-11-01",
        expectedAvailable: 100,
        expectedBalance: 500,
        bufferWithdrawAmount: 150,
      },
      "allocate",
    );
    expect(result.status).toBe(409);
    expect(await result.json()).toMatchObject({ code: "STALE_RECORD" });
  });
});

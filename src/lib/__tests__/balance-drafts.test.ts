import { describe, it, expect } from "vitest";
import { editBalance, balanceChanged, balanceConflict } from "../balance-drafts";
import { createRefreshQueue } from "../refresh-queue";

describe("drafts across remote updates", () => {
  it("retains the first-edit revision through refresh and subsequent typing", () => {
    const first=editBalance(undefined,"900",1000,"old");
    const typed=editBalance(first,"950",1250,"new");
    expect(typed).toEqual({ value:"950", originalValue:1000, revision:"old" });
    expect(balanceConflict(typed,"new")).toBe(true);
  });
  it("omits untouched amounts and recognizes explicit use-latest", () => {
    expect(balanceChanged()).toBe(false);
    expect(balanceChanged(editBalance(undefined,"1000.00",1000,"old"))).toBe(false);
    expect(balanceChanged(editBalance(undefined,"1250",1250,"new"))).toBe(false);
  });
  it("keeps a draft typed back to its original amount if the server changed meanwhile", () => {
    const original=editBalance(undefined,"900",1000,"old");
    const reverted=editBalance(original,"1000",1250,"new");
    expect(balanceChanged(reverted)).toBe(false);
    expect(balanceConflict(reverted,"new")).toBe(true);
  });
  it("accepts a deliberate rebase and detects another intervening save", () => {
    const reviewed=editBalance(undefined,"900",1250,"new");
    expect(balanceConflict(reviewed,"new")).toBe(false);
    expect(balanceConflict(reviewed,"newer")).toBe(true);
    expect(balanceConflict(editBalance(undefined,"900",1000),"new")).toBe(true);
  });
});
describe("refresh queue", () => {
  it("coalesces a burst and performs a trailing read for changes during a fetch", async () => {
    let release!:()=>void; let reads=0;
    const queue=createRefreshQueue(async()=>{reads++;if(reads===1)await new Promise<void>(resolve=>{release=resolve;});});
    const first=queue(); const second=queue();queue();queue();
    expect(first).toBe(second); expect(reads).toBe(1);release();await first;expect(reads).toBe(2);
    await queue();expect(reads).toBe(3);
  });
  it("recovers after a failed refresh without retrying a mutation", async () => {
    let fail=true;const queue=createRefreshQueue(async()=>{if(fail)throw Error("offline");});
    await expect(queue()).rejects.toThrow("offline");fail=false;await expect(queue()).resolves.toBeUndefined();
  });
});

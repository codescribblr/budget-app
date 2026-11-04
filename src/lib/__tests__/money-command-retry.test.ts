import { beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetRequestError } from "../budget-request";
const mocks = vi.hoisted(() => ({ request: vi.fn(), record: vi.fn(), setUncertain: vi.fn() }));
vi.mock("react", () => ({useRef: (value: unknown) => ({current: value}), useState: (value: unknown) => [value, mocks.setUncertain]}));
vi.mock("@/components/new-look/budget-context", () => ({useBudget: () => ({data: {userId: "test-user"}})}));
vi.mock("../budget-request", async importOriginal => ({...await importOriginal<object>(), budgetRequest: mocks.request}));
vi.mock("../pending-money-command", () => ({pendingMoneyCommand: () => null, recordMoneyCommand: mocks.record}));
import { useMoneyCommand } from "@/components/new-look/use-money-command";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("location", {pathname: "/new/payday"});
});
describe("money operation recovery", () => {
  it("checks a lost-response operation with the identical ID and reviewed values", async () => {
    const command = useMoneyCommand(27);
    mocks.request.mockRejectedValueOnce(new Error("Lost response"));
    await expect(command.run("/api/income-buffer/fund-month", {
      amount: 500, expectedAvailable: 0, expectedBalance: 500,
    })).rejects.toThrow("Lost response");
    const original = mocks.request.mock.calls[0];
    expect(mocks.setUncertain).toHaveBeenLastCalledWith(true);
    // The source may now be empty. Recovery takes no new amounts or balances.
    mocks.request.mockResolvedValueOnce({amountWithdrawn: 500, newBalance: 0});
    expect(await command.retry()).toEqual({amountWithdrawn: 500, newBalance: 0});
    expect(mocks.request.mock.calls[1]).toEqual(original);
    expect(mocks.setUncertain).toHaveBeenLastCalledWith(false);
    expect(mocks.record).toHaveBeenLastCalledWith("test-user:27", null);
  });
  it("clears a rejected operation and lets the user save a newly reviewed request", async () => {
    const command = useMoneyCommand(27);
    mocks.request.mockRejectedValueOnce(new BudgetRequestError("Changed", 409));
    await expect(command.run("/api/allocations/batch", {expectedAvailable: 100})).rejects.toThrow("Changed");
    const firstId = mocks.request.mock.calls[0][1].operationId;
    await expect(command.retry()).rejects.toThrow("no pending change");
    mocks.request.mockResolvedValueOnce({success: true});
    await command.run("/api/allocations/batch", {expectedAvailable: 99});
    expect(mocks.request.mock.calls[1][1].operationId).not.toBe(firstId);
    expect(mocks.request.mock.calls[1][1].expectedAvailable).toBe(99);
  });
});

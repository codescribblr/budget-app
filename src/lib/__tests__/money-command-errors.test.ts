import { describe, expect, it } from "vitest";
import { BudgetRequestError } from "../budget-request";
import { isMoneyCommandRejected, moneyCommandErrorMessage } from "../money-command-errors";

describe("money save outcomes", () => {
  it("makes confirmed stale-data rejections distinct from uncertain writes", () => {
    const error = new BudgetRequestError("Available to save changed.", 409, "STALE_RECORD");
    expect(isMoneyCommandRejected(error)).toBe(true);
    expect(moneyCommandErrorMessage(error)).toContain("Nothing was changed.");
    expect(moneyCommandErrorMessage(error)).not.toContain("Check the change’s outcome");
  });
  it.each([new Error("Failed to fetch"), new BudgetRequestError("Unavailable", 500)])("keeps recovery instructions for unknown outcomes", error => {
    expect(isMoneyCommandRejected(error)).toBe(false);
    expect(moneyCommandErrorMessage(error)).toContain("Check the change’s outcome");
    expect(moneyCommandErrorMessage(error)).not.toContain("Nothing was changed");
  });
});

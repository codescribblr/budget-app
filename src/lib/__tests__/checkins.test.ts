import { describe, expect, it } from "vitest";
import {
  checkinSteps,
  nextCheckinStep,
  parseCheckinProgress,
} from "../checkins";

const reviewed = "2026-10-15T12:00:00.000Z";
describe("guided check-in navigation", () => {
  it("leads from balances to envelopes, then finishes only after both are reviewed", () => {
    const steps = checkinSteps("daily", false);
    expect(
      nextCheckinStep(steps, "accounts", { accounts: reviewed })?.key,
    ).toBe("budget");
    expect(
      nextCheckinStep(steps, "budget", {
        accounts: reviewed,
        budget: reviewed,
      }),
    ).toBeUndefined();
    expect(nextCheckinStep(steps, "budget", { budget: reviewed })?.key).toBe(
      "accounts",
    );
  });
  it("resumes the next unreviewed weekly step, including skipped earlier steps", () => {
    const steps = checkinSteps("weekly", false);
    expect(nextCheckinStep(steps, "imports", { imports: reviewed })?.key).toBe(
      "reports",
    );
    expect(
      nextCheckinStep(steps, "imports", {
        imports: reviewed,
        reports: reviewed,
      })?.key,
    ).toBe("budget");
    expect(
      nextCheckinStep(steps, "reports", { reports: reviewed, budget: reviewed })
        ?.key,
    ).toBe("imports");
  });
  it("includes goals only when optional planning tools are available", () => {
    const items = { reports: reviewed, plan: reviewed };
    expect(
      nextCheckinStep(checkinSteps("monthly", true), "plan", items)?.key,
    ).toBe("goals");
    expect(
      nextCheckinStep(checkinSteps("monthly", false), "plan", items),
    ).toBeUndefined();
    expect(checkinSteps("monthly", false).map((step) => step.key)).toEqual([
      "reports",
      "plan",
    ]);
  });
});
describe("saved review progress", () => {
  it("recovers from corrupt storage without treating arbitrary values as completed reviews", () => {
    for (const value of [
      null,
      "null",
      "[]",
      "true",
      "broken JSON",
      '{"accounts":true,"budget":""}',
    ]) {
      expect(parseCheckinProgress(value)).toEqual({});
    }
    expect(
      parseCheckinProgress(
        JSON.stringify({
          accounts: reviewed,
          budget: "invalid",
          unknown: reviewed,
        }),
      ),
    ).toEqual({ accounts: reviewed });
  });
});

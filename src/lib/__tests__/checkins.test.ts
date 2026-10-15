import { describe, expect, it } from "vitest";
import {
  checkinSteps,
  nextCheckinStep,
  parseCheckinProgress,
  taskCheckin,
} from "../checkins";
import { importPaths } from "../import-paths";

const reviewed = "2026-10-15T12:00:00.000Z";
describe("guided check-in navigation", () => {
  it("requires an explicit, valid check-in for this task instead of guiding standalone pages", () => {
    for (const requested of [null, "", "unknown", "weekly", "monthly"]) {
      expect(taskCheckin("accounts", requested)).toBeNull();
    }
    expect(taskCheckin("accounts", "daily")).toBe("daily");
    expect(taskCheckin("budget", "weekly")).toBe("weekly");
    expect(taskCheckin("reports", "monthly")).toBe("monthly");
    expect(taskCheckin("reports", "daily")).toBeNull();
  });
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
describe("import navigation context", () => {
  it("keeps standalone and classic import navigation outside check-ins", () => {
    expect(importPaths(true, null).importPath("/batch-1")).toBe(
      "/new/imports/batch-1",
    );
    expect(importPaths(true, "daily").importPath()).toBe("/new/imports");
    expect(
      importPaths(false, "weekly").importPath("/map-columns?remap=true"),
    ).toBe("/imports/map-columns?remap=true");
  });
  it("carries weekly context through mapping and batch review without corrupting existing parameters", () => {
    const paths = importPaths(true, "weekly");
    expect(paths.importPath()).toBe("/new/imports?checkin=weekly");
    expect(paths.importPath("/map-columns?remap=true&batchId=batch-1")).toBe(
      "/new/imports/map-columns?remap=true&batchId=batch-1&checkin=weekly",
    );
    expect(paths.importPath("/batch-1?t=123")).toBe(
      "/new/imports/batch-1?t=123&checkin=weekly",
    );
    expect(paths.transactionsHref).toBe("/new/transactions?checkin=weekly");
    expect(paths.transactionsPath).toBe("/new/transactions");
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

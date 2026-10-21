import { describe, expect, it } from "vitest";
import {
  checkinSteps,
  checkinWindow,
  checkinStatus,
  checkinStatusLabel,
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

describe("check-in completion status", () => {
  it.each(["daily", "weekly", "monthly"] as const)(
    "tracks %s as due, partially reviewed, then completed",
    (cadence) => {
      const steps = checkinSteps(cadence, true);
      expect(checkinStatus(steps, {})).toMatchObject({
        state: "due",
        done: 0,
        completedAt: null,
      });
      const partial = { [steps[0].key]: reviewed };
      expect(checkinStatus(steps, partial)).toMatchObject({
        state: "in-progress",
        done: 1,
        completedAt: null,
      });
      const finished = "2026-10-15T13:00:00.000Z";
      const items = Object.fromEntries(
        steps.map((step, i) => [step.key, i ? reviewed : finished]),
      );
      expect(checkinStatus(steps, items)).toEqual({
        state: "complete",
        done: steps.length,
        total: steps.length,
        completedAt: finished,
      });
      expect(checkinStatusLabel(cadence, "complete")).toBe(
        cadence === "daily"
          ? "Done today"
          : cadence === "weekly"
            ? "Done this week"
            : "Done this month",
      );
    },
  );
  it("counts only the steps needed for this routine, including optional monthly planning", () => {
    expect(
      checkinStatus(checkinSteps("daily", false), {
        imports: reviewed,
        reports: reviewed,
      }).state,
    ).toBe("due");
    const monthly = { reports: reviewed, plan: reviewed };
    expect(checkinStatus(checkinSteps("monthly", false), monthly).state).toBe(
      "complete",
    );
    expect(checkinStatus(checkinSteps("monthly", true), monthly).state).toBe(
      "in-progress",
    );
  });
});

describe("calendar periods shown with saved progress", () => {
  it("keeps a Sunday in the current week and resets on Monday", () => {
    const sunday = checkinWindow("weekly", new Date(2026, 9, 25, 23, 59));
    expect(sunday.key).toBe("2026-10-19");
    expect(sunday.periodLabel).toBe("Oct 19 – Oct 25");
    expect(sunday.next).toEqual(new Date(2026, 9, 26));
    expect(checkinWindow("weekly", sunday.next).key).toBe("2026-10-26");
  });
  it("starts a new day without changing the calendar week or month", () => {
    const evening = new Date(2026, 9, 21, 23, 59);
    const morning = new Date(2026, 9, 22);
    expect(checkinWindow("daily", evening).next).toEqual(morning);
    expect(checkinWindow("daily", evening).key).not.toBe(
      checkinWindow("daily", morning).key,
    );
    for (const cadence of ["weekly", "monthly"] as const) {
      expect(checkinWindow(cadence, evening).key).toBe(
        checkinWindow(cadence, morning).key,
      );
    }
  });
  it("handles leap days, new years, and weeks spanning two years", () => {
    expect(checkinWindow("monthly", new Date(2028, 1, 29)).next).toEqual(
      new Date(2028, 2, 1),
    );
    expect(checkinWindow("monthly", new Date(2026, 11, 31)).next).toEqual(
      new Date(2027, 0, 1),
    );
    const week = checkinWindow("weekly", new Date(2027, 0, 1));
    expect(week.key).toBe("2026-12-28");
    expect(week.next).toEqual(new Date(2027, 0, 4));
    expect(week.periodLabel).toBe("Dec 28, 2026 – Jan 3, 2027");
  });
  it("uses the next local midnight on daylight-saving transition days", () => {
    for (const date of [new Date(2026, 2, 8), new Date(2026, 10, 1)]) {
      const expected = new Date(date);
      expected.setDate(expected.getDate() + 1);
      expect(checkinWindow("daily", date).next).toEqual(expected);
      expect(checkinWindow("daily", date).next.getHours()).toBe(0);
    }
  });
});

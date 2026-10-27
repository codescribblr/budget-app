import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentReviewItems,
  legacyCheckinItems,
  zonedCheckinPeriod,
  type CheckinScope,
  type CheckinRecord,
} from "../checkin-persistence";
import { createCheckinStore } from "../checkin-store";
import { checkinStatus, checkinSteps } from "../checkins";
const scope: CheckinScope = {
  userId: "one",
  accountId: 27,
  cadence: "daily",
  period: "2026-10-27",
  timeZone: "America/New_York",
  planning: false,
};
const first = "2026-10-27T12:00:00.000Z",
  last = "2026-10-27T13:00:00.000Z";
const empty: CheckinRecord = { items: {}, completedAt: null };
afterEach(() => vi.useRealTimers());
describe("calendar persistence", () => {
  it("uses local midnight, Sunday and first of month independently of server time zone", () => {
    expect(
      zonedCheckinPeriod(
        "daily",
        new Date("2026-10-28T03:59:59Z"),
        scope.timeZone,
      ),
    ).toBe("2026-10-27");
    expect(
      zonedCheckinPeriod(
        "daily",
        new Date("2026-10-28T04:00:00Z"),
        scope.timeZone,
      ),
    ).toBe("2026-10-28");
    expect(
      zonedCheckinPeriod(
        "weekly",
        new Date("2026-11-01T03:59:59Z"),
        scope.timeZone,
      ),
    ).toBe("2026-10-25");
    expect(
      zonedCheckinPeriod(
        "weekly",
        new Date("2026-11-01T04:00:00Z"),
        scope.timeZone,
      ),
    ).toBe("2026-11-01");
    expect(
      zonedCheckinPeriod(
        "monthly",
        new Date("2026-11-01T03:59:59Z"),
        scope.timeZone,
      ),
    ).toBe("2026-10");
    expect(
      zonedCheckinPeriod(
        "monthly",
        new Date("2026-11-01T04:00:00Z"),
        scope.timeZone,
      ),
    ).toBe("2026-11");
    expect(
      zonedCheckinPeriod(
        "daily",
        new Date("2026-11-02T04:59:59Z"),
        scope.timeZone,
      ),
    ).toBe("2026-11-01");
    expect(
      zonedCheckinPeriod(
        "daily",
        new Date("2026-11-02T05:00:00Z"),
        scope.timeZone,
      ),
    ).toBe("2026-11-02");
  });
  it("migrates overlapping Monday keys but excludes previous-week, other-task and future marks", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(last));
    const weekly = {
      ...scope,
      cadence: "weekly" as const,
      period: "2026-10-25",
    };
    const values: Record<string, string> = {
      "2026-10-19": JSON.stringify({
        imports: "2026-10-25T15:00:00Z",
        reports: "2026-10-24T16:00:00Z",
      }),
      "2026-10-26": JSON.stringify({
        reports: first,
        budget: last,
        accounts: first,
        goals: "2026-11-01T12:00:00Z",
      }),
    };
    expect(
      legacyCheckinItems(weekly, (key) => values[key.slice(-10)] ?? null),
    ).toEqual({
      imports: "2026-10-25T15:00:00Z",
      reports: first,
      budget: last,
    });
    expect(
      currentReviewItems(
        JSON.stringify({ accounts: first, budget: "2026-10-26T12:00:00Z" }),
        scope,
        new Date(last),
      ),
    ).toEqual({ accounts: first });
  });
  it("keeps an explicit completion when optional monthly steps change", () => {
    expect(
      checkinStatus(
        checkinSteps("monthly", true),
        { reports: first, plan: last },
        last,
      ),
    ).toMatchObject({ state: "complete", completedAt: last });
  });
});
describe("shared account-backed progress", () => {
  it("reloads saved progress in a fresh session and scopes users, budgets and periods", async () => {
    const records = new Map<string, CheckinRecord>();
    const transport = vi.fn(
      async (s: CheckinScope, change?: { task?: string }) => {
        const key = `${s.userId}:${s.accountId}:${s.cadence}:${s.period}`;
        let record = records.get(key) ?? empty;
        if (change?.task) {
          record = {
            items: { ...record.items, [change.task]: first },
            completedAt: change.task === "budget" ? last : null,
          };
          records.set(key, record);
        }
        return record;
      },
    );
    const store = createCheckinStore(transport);
    await store.load(scope);
    await store.mark(scope, "accounts");
    await store.mark(scope, "budget");
    const fresh = createCheckinStore(transport);
    await fresh.load(scope);
    expect(fresh.snapshot(scope)).toMatchObject({
      completedAt: last,
      items: { accounts: first, budget: first },
      ready: true,
    });
    for (const next of [
      { ...scope, userId: "two" },
      { ...scope, accountId: 28 },
      { ...scope, period: "2026-10-28" },
      { ...scope, cadence: "weekly" as const },
    ]) {
      await fresh.load(next);
      expect(fresh.snapshot(next).completedAt).toBeNull();
    }
  });
  it("does not announce completion before the save succeeds and leaves a failed step retryable", async () => {
    let release!: (value: CheckinRecord) => void;
    const transport = vi
      .fn()
      .mockResolvedValueOnce(empty)
      .mockImplementationOnce(
        () =>
          new Promise<CheckinRecord>((resolve) => {
            release = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error("Offline"));
    const store = createCheckinStore(transport);
    await store.load(scope);
    const pending = store.mark(scope, "budget");
    await Promise.resolve();
    expect(store.snapshot(scope).completedAt).toBeNull();
    release({ items: { accounts: first, budget: last }, completedAt: last });
    await pending;
    await expect(store.mark(scope, "accounts")).rejects.toThrow("Offline");
    expect(store.snapshot(scope)).toMatchObject({
      completedAt: last,
      error: "Offline",
    });
  });
  it("serializes a slow refresh before a save and deduplicates simultaneous loads", async () => {
    let release!: (value: CheckinRecord) => void;
    const transport = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<CheckinRecord>((resolve) => {
            release = resolve;
          }),
      )
      .mockResolvedValueOnce({
        items: { accounts: first, budget: last },
        completedAt: last,
      });
    const store = createCheckinStore(transport);
    const load = store.load(scope);
    const duplicate = store.load(scope);
    const save = store.mark(scope, "budget");
    await Promise.resolve();
    expect(transport).toHaveBeenCalledTimes(1);
    release(empty);
    await Promise.all([load, duplicate, save]);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(store.snapshot(scope).completedAt).toBe(last);
  });
  it("imports only missing browser steps without replacing account timestamps", async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce({ items: { accounts: first }, completedAt: null })
      .mockResolvedValueOnce({
        items: { accounts: first, budget: last },
        completedAt: last,
      });
    const store = createCheckinStore(transport, () => ({
      accounts: last,
      budget: last,
    }));
    await store.load(scope);
    expect(transport).toHaveBeenLastCalledWith(scope, {
      restore: { budget: last },
    });
  });
});

it("never regresses completed progress when a refresh returns stale data", async () => {
  const transport = vi
    .fn()
    .mockResolvedValueOnce({
      items: { accounts: first, budget: last },
      completedAt: last,
    })
    .mockResolvedValueOnce(empty);
  const store = createCheckinStore(transport);
  await store.load(scope);
  await store.load(scope, true);
  expect(store.snapshot(scope)).toMatchObject({
    items: { accounts: first, budget: last },
    completedAt: last,
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { ResourceRefreshStore } from "../resource-refresh";
import { createRefreshQueue } from "../refresh-queue";
import { freshFetch, viewFreshness } from "../view-freshness";
const deferred = <T>() => {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
afterEach(() => {
  vi.unstubAllGlobals();
  viewFreshness.clear();
});
describe("resource refresh ordering", () => {
  it("does not collide after a household switch or repeat unchanged tokens", () => {
    const store = new ResourceRefreshStore();
    store.setScope("a");
    store.invalidate(["balances"]);
    const previous = store.snapshot(["balances"]);
    store.setScope("b");
    expect(store.snapshot(["balances"])).toBeGreaterThan(previous);
    expect(store.reconcile({ balances: "one" })).toEqual(["balances"]);
    const next = store.snapshot(["balances"]);
    expect(store.reconcile({ balances: "one" })).toEqual([]);
    expect(store.snapshot(["balances"])).toBe(next);
  });
  it("runs one trailing read even when an invalidated in-flight read fails", async () => {
    const pending = deferred<void>();
    const read = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(undefined);
    const refresh = createRefreshQueue(read);
    const first = refresh();
    expect(refresh()).toBe(first);
    pending.reject(new Error("offline"));
    await first;
    expect(read).toHaveBeenCalledTimes(2);
  });
  it("reports a final failure and allows a later recovery", async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    const refresh = createRefreshQueue(read);
    await expect(refresh()).rejects.toThrow("offline");
    await refresh();
    expect(read).toHaveBeenCalledTimes(2);
  });
});
describe("view freshness metadata", () => {
  const setup = () => {
    vi.stubGlobal("window", {
      location: { pathname: "/new/budget", search: "" },
    });
    const pending = deferred<Response>(),
      newer = deferred<Response>();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockReturnValueOnce(pending.promise)
        .mockReturnValueOnce(newer.promise),
    );
    return { pending, newer };
  };
  it("ignores older successes after a newer read fails", async () => {
    const { pending, newer } = setup();
    const a = freshFetch("/api/categories"),
      b = freshFetch("/api/categories");
    newer.resolve(new Response("", { status: 500 }));
    await b;
    pending.resolve(new Response("[]"));
    await a;
    expect(viewFreshness.status("/new/budget")).toMatchObject({
      pending: false,
      failed: true,
      checked: null,
    });
  });
  it("does not restore cleared household metadata from a late response", async () => {
    const { pending } = setup();
    const a = freshFetch("/api/categories");
    viewFreshness.clear();
    pending.resolve(new Response("[]"));
    await a;
    expect(viewFreshness.status("/new/budget")).toEqual({
      pending: false,
      failed: false,
      checked: null,
    });
  });
  it("an aborted older request cannot erase the active request", async () => {
    const { pending, newer } = setup();
    const controller = new AbortController();
    const a = freshFetch("/api/categories", {
      signal: controller.signal,
    }).catch(() => {});
    const b = freshFetch("/api/categories");
    controller.abort();
    pending.reject(new Error("aborted"));
    await a;
    expect(viewFreshness.status("/new/budget").pending).toBe(true);
    newer.resolve(new Response("[]"));
    await b;
    expect(viewFreshness.status("/new/budget")).toMatchObject({
      pending: false,
      failed: false,
    });
  });
  it("clears pending after a response races with cancellation", async () => {
    const { pending } = setup();
    const controller = new AbortController();
    const a = freshFetch("/api/categories", { signal: controller.signal });
    controller.abort();
    pending.resolve(new Response("[]"));
    await a;
    expect(viewFreshness.status("/new/budget").pending).toBe(false);
  });
});

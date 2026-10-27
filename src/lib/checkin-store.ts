import {
  checkinScopeKey,
  type CheckinRecord,
  type CheckinScope,
} from "./checkin-persistence";
import type { CheckinTask } from "./checkins";
export interface CheckinSnapshot extends CheckinRecord {
  ready: boolean;
  error: string | null;
}
export const emptyCheckinSnapshot: CheckinSnapshot = {
  items: {},
  completedAt: null,
  ready: false,
  error: null,
};
type Transport = (
  scope: CheckinScope,
  change?: { task?: CheckinTask; restore?: Record<string, string> },
) => Promise<CheckinRecord>;

/** Shared by every check-in surface. Serialize reads and writes per scope so a
 * slow refresh cannot replace a newly saved completion with an older response. */
export function createCheckinStore(
  transport: Transport,
  legacy: (scope: CheckinScope) => Record<string, string> = () => ({}),
) {
  const entries = new Map<
    string,
    {
      snapshot: CheckinSnapshot;
      queue: Promise<unknown>;
      loading?: Promise<void>;
    }
  >();
  const listeners = new Set<() => void>();
  function entry(scope: CheckinScope) {
    const key = checkinScopeKey(scope);
    if (!entries.has(key))
      entries.set(key, {
        snapshot: emptyCheckinSnapshot,
        queue: Promise.resolve(),
      });
    return entries.get(key)!;
  }
  function notify() {
    listeners.forEach((listener) => listener());
  }
  function run(scope: CheckinScope, action: () => Promise<CheckinRecord>) {
    const state = entry(scope);
    const pending = state.queue.then(async () => {
      try {
        const record = await action();
        // Progress only moves forward within a calendar period. A stale read
        // (including one racing a save in another tab) cannot clear reviews.
        const saved = {
          items: { ...record.items, ...state.snapshot.items },
          completedAt: state.snapshot.completedAt ?? record.completedAt,
        };
        state.snapshot = { ...saved, ready: true, error: null };
        notify();
        return saved;
      } catch (error) {
        state.snapshot = {
          ...state.snapshot,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load check-in progress",
        };
        notify();
        throw error;
      }
    });
    state.queue = pending.catch(() => {});
    return pending;
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot(scope: CheckinScope) {
      return entry(scope).snapshot;
    },
    load(scope: CheckinScope, force = false): Promise<void> {
      const state = entry(scope);
      if (state.loading) return state.loading;
      if (state.snapshot.ready && !state.snapshot.error && !force)
        return Promise.resolve();
      state.loading = run(scope, async () => {
        const record = await transport(scope);
        const restored = legacy(scope);
        const missing = Object.fromEntries(
          Object.entries(restored).filter(([key]) => !record.items[key]),
        );
        return Object.keys(missing).length
          ? transport(scope, { restore: missing })
          : record;
      })
        .then(() => {})
        .finally(() => {
          state.loading = undefined;
        });
      return state.loading;
    },
    mark(scope: CheckinScope, task: CheckinTask) {
      return run(scope, () => transport(scope, { task }));
    },
  };
}

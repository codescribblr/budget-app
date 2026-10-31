/** Request metadata only; no financial records are stored outside the view. */
type ReadState = {
  request: number;
  pending: boolean;
  failed: boolean;
  checked: number | null;
};
const reads = new Map<string, Map<string, ReadState>>();
let generation = 0,
  requestId = 0;
const listeners = new Set<() => void>();
const publish = () => {
  generation++;
  listeners.forEach((listener) => listener());
};
export const viewFreshness = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  snapshot: () => generation,
  clear: () => {
    reads.clear();
    publish();
  },
  status: (view: string) => {
    const states = [...(reads.get(view)?.values() ?? [])];
    const checked = states
      .map((s) => s.checked)
      .filter((v): v is number => v !== null);
    return {
      pending: states.some((s) => s.pending),
      failed: states.some((s) => s.failed),
      checked: checked.length ? Math.min(...checked) : null,
    };
  },
};
export async function freshFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method =
    init?.method ?? (input instanceof Request ? input.method : "GET");
  if (
    typeof window === "undefined" ||
    !window.location.pathname.startsWith("/new") ||
    method.toUpperCase() !== "GET"
  )
    return fetch(input, init);
  const view = window.location.pathname + window.location.search;
  const url = input instanceof Request ? input.url : String(input);
  const signal =
    init?.signal ?? (input instanceof Request ? input.signal : undefined);
  if (!reads.has(view)) {
    if (reads.size >= 20) reads.delete(reads.keys().next().value!);
    reads.set(view, new Map());
  }
  const bucket = reads.get(view)!;
  const previous = bucket.get(url);
  const id = ++requestId;
  bucket.set(url, {
    request: id,
    pending: true,
    failed: false,
    checked: previous?.checked ?? null,
  });
  publish();
  const finish = (ok: boolean) => {
    // A superseded request or a cleared household must never restore old status.
    if (reads.get(view) !== bucket || bucket.get(url)?.request !== id) return;
    if (signal?.aborted) {
      if (previous?.checked != null)
        bucket.set(url, { ...previous, request: id, pending: false });
      else bucket.delete(url);
    } else
      bucket.set(url, {
        request: id,
        pending: false,
        failed: !ok,
        checked: ok ? Date.now() : (previous?.checked ?? null),
      });
    publish();
  };
  try {
    const response = await fetch(input, { ...init, cache: "no-store" });
    finish(response.ok);
    return response;
  } catch (error) {
    finish(false);
    throw error;
  }
}

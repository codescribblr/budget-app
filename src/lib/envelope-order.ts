export type EnvelopePlacement = "top" | "bottom" | "before" | "after";

/** Move a selection as a group, preserving its existing order and every hidden row. */
export function moveEnvelopes<T extends { id: number }>(
  rows: T[],
  selected: number[],
  placement: EnvelopePlacement,
  anchor?: number,
): T[] {
  const ids = new Set(selected);
  const moving = rows.filter((row) => ids.has(row.id));
  const remaining = rows.filter((row) => !ids.has(row.id));
  if (!moving.length) return rows;
  const target = remaining.findIndex((row) => row.id === anchor);
  if ((placement === "before" || placement === "after") && target < 0)
    return rows;
  const index =
    placement === "top"
      ? 0
      : placement === "bottom"
        ? remaining.length
        : target + (placement === "after" ? 1 : 0);
  return [...remaining.slice(0, index), ...moving, ...remaining.slice(index)];
}

/** Explicit conflict review keeps the draft order but uses current records/revisions. */
export function rebaseEnvelopeOrder<T extends { id: number }>(
  draft: T[],
  latest: T[],
): T[] {
  const byId = new Map(latest.map((row) => [row.id, row]));
  const kept = draft.flatMap((row) =>
    byId.has(row.id) ? [byId.get(row.id)!] : [],
  );
  const existing = new Set(kept.map((row) => row.id));
  return [...kept, ...latest.filter((row) => !existing.has(row.id))];
}
export function sameEnvelopeOrder(a: { id: number }[], b: { id: number }[]) {
  return (
    a.length === b.length && a.every((row, index) => row.id === b[index].id)
  );
}

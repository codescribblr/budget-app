import { describe, expect, it } from "vitest";
import {
  moveEnvelopes,
  rebaseEnvelopeOrder,
  sameEnvelopeOrder,
} from "../envelope-order";
const rows = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  revision: `v${i}`,
}));
const ids = (items: { id: number }[]) => items.map((row) => row.id);
describe("envelope group ordering", () => {
  it("moves nonadjacent selections before a named destination in list order, not click order", () => {
    const result = moveEnvelopes(rows, [49, 2, 24], "before", 10);
    expect(ids(result).slice(7, 12)).toEqual([9, 2, 24, 49, 10]);
    expect(new Set(ids(result)).size).toBe(50);
    expect(rows[1].id).toBe(2);
  });
  it("moves after a destination even when source rows precede it", () => {
    expect(ids(moveEnvelopes(rows, [1, 3], "after", 48)).slice(-5)).toEqual([
      48, 1, 3, 49, 50,
    ]);
  });
  it("supports top and bottom without losing envelopes hidden by search", () => {
    expect(ids(moveEnvelopes(rows, [50, 20], "top")).slice(0, 3)).toEqual([
      20, 50, 1,
    ]);
    const bottom = moveEnvelopes(rows, [40, 2], "bottom");
    expect(ids(bottom).slice(-3)).toEqual([50, 2, 40]);
    expect(bottom).toHaveLength(50);
  });
  it("ignores an absent or selected destination and missing selection", () => {
    expect(moveEnvelopes(rows, [2], "before", 2)).toBe(rows);
    expect(moveEnvelopes(rows, [2], "after", 55)).toBe(rows);
    expect(moveEnvelopes(rows, [55], "top")).toBe(rows);
  });
  it("recognizes a no-op, including selecting the entire list", () => {
    expect(sameEnvelopeOrder(rows, moveEnvelopes(rows, [1], "top"))).toBe(true);
    expect(
      sameEnvelopeOrder(rows, moveEnvelopes(rows, ids(rows), "bottom")),
    ).toBe(true);
    expect(sameEnvelopeOrder(rows, moveEnvelopes(rows, [2], "top"))).toBe(
      false,
    );
  });
  it("rebases only on explicit review, preserving draft order and refreshing revisions", () => {
    const draft = moveEnvelopes(rows, [50], "top");
    const latest = [
      ...rows
        .filter((row) => row.id !== 2)
        .map((row) => ({ ...row, revision: "new" })),
      { id: 51, revision: "new" },
    ];
    const rebased = rebaseEnvelopeOrder(draft, latest);
    expect(ids(rebased).slice(0, 3)).toEqual([50, 1, 3]);
    expect(rebased.at(-1)?.id).toBe(51);
    expect(rebased.every((row) => row.revision === "new")).toBe(true);
    expect(rebased).toHaveLength(50);
    expect(draft[0].revision).toBe("v49");
  });
});

import { describe, expect, it } from "vitest";
import { envelopeReviewHref, envelopeReviewTarget, type EnvelopeTab } from "../envelope-navigation";

describe("envelope review navigation", () => {
  it.each<EnvelopeTab>(["activity", "transfer", "adjust"])("links directly to %s while preserving check-in context", tab => {
    const href = envelopeReviewHref(42, tab, "checkin=weekly&filter=negative");
    const params = new URL(href, "https://example.test").searchParams;
    expect(envelopeReviewTarget(params)).toEqual({ categoryId: 42, tab });
    expect(params.get("checkin")).toBe("weekly");
    expect(params.get("filter")).toBe("negative");
  });

  it("keeps old review links and unknown tabs on activity", () => {
    expect(envelopeReviewTarget(new URLSearchParams("envelope=42"))).toEqual({ categoryId: 42, tab: "activity" });
    expect(envelopeReviewTarget(new URLSearchParams("envelope=42&tab=unknown"))).toEqual({ categoryId: 42, tab: "activity" });
  });

  it("clears only dialog state on close, so refresh does not reopen it", () => {
    expect(envelopeReviewHref(null, "activity", "checkin=daily&envelope=42&tab=transfer")).toBe("/new/budget?checkin=daily");
    expect(envelopeReviewHref(null, "activity", "envelope=42&tab=adjust")).toBe("/new/budget");
  });

  it("replaces an existing target and rejects ambiguous category IDs", () => {
    expect(envelopeReviewHref(7, "transfer", "envelope=42&tab=activity")).toBe("/new/budget?envelope=7&tab=transfer");
    for (const id of ["", "0", "-1", "1.5", "1e3", "NaN", "42abc", "9007199254740992"]) {
      expect(envelopeReviewTarget(new URLSearchParams({ envelope: id, tab: "transfer" })).categoryId).toBeNull();
    }
  });
});

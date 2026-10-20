export type EnvelopeTab = "activity" | "transfer" | "adjust";

export function envelopeReviewTarget(params: Pick<URLSearchParams, "get">) {
  const rawId = params.get("envelope");
  const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : NaN;
  const value = params.get("tab");
  const tab: EnvelopeTab = value === "transfer" || value === "adjust" ? value : "activity";
  return {
    categoryId: Number.isSafeInteger(id) && id > 0 ? id : null,
    tab,
  };
}

/** Preserve the surrounding check-in/filter context when opening or closing. */
export function envelopeReviewHref(
  categoryId: number | null,
  tab: EnvelopeTab = "activity",
  search = "",
) {
  const params = new URLSearchParams(search);
  if (categoryId === null) {
    params.delete("envelope");
    params.delete("tab");
  } else {
    params.set("envelope", String(categoryId));
    params.set("tab", tab);
  }
  const query = params.toString();
  return `/new/budget${query ? `?${query}` : ""}`;
}

/** Detail pages retain check-in context without carrying popup state with them. */
export function envelopeDetailHref(categoryId: number, search = "") {
  const source = new URLSearchParams(search);
  const params = new URLSearchParams();
  const checkin = source.get("checkin");
  if (checkin && ["daily", "weekly", "monthly"].includes(checkin)) params.set("checkin", checkin);
  return `/new/budget/${categoryId}${params.size ? `?${params}` : ""}`;
}

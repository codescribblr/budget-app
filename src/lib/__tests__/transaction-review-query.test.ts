import { describe, expect, it, vi } from "vitest";
import { reviewQuery } from "../transaction-review-query";
import { parseReviewFilters } from "../transaction-review";
function setup(
  search: string,
  searchMerchants?: { groups: number[]; overrides: number[] },
) {
  const query: any = {};
  for (const method of [
    "select",
    "eq",
    "gte",
    "lte",
    "ilike",
    "in",
    "or",
    "is",
  ])
    query[method] = vi.fn(() => query);
  const supabase = { from: vi.fn(() => query) };
  reviewQuery(
    supabase as never,
    42,
    parseReviewFilters(new URLSearchParams(search)),
    "id,total_amount",
    true,
    searchMerchants,
  );
  return { query, supabase };
}
describe("transaction review SQL filters", () => {
  it("scopes every query to the active household and filters envelopes before pagination", () => {
    const { query, supabase } = setup(
      "categoryId=1,2&startDate=2026-10-01&endDate=2026-10-31",
    );
    expect(supabase.from).toHaveBeenCalledWith("transactions");
    expect(query.eq).toHaveBeenCalledWith("budget_account_id", 42);
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining(
        "category_filter:transaction_splits!inner(category_id,amount)",
      ),
      { count: "exact" },
    );
    expect(query.in).toHaveBeenCalledWith(
      "category_filter.category_id",
      [1, 2],
    );
    expect(query.gte).toHaveBeenCalledWith("date", "2026-10-01");
    expect(query.lte).toHaveBeenCalledWith("date", "2026-10-31");
  });
  it("requires every selected tag and allows either a bank or card", () => {
    const { query } = setup("tags=5,6&accountId=account-2,card-3");
    expect(query.eq).toHaveBeenCalledWith("tag_filter_0.tag_id", 5);
    expect(query.eq).toHaveBeenCalledWith("tag_filter_1.tag_id", 6);
    expect(query.select.mock.calls[0][0]).toContain(
      "tag_filter_1:transaction_tags!inner(tag_id)",
    );
    expect(query.or).toHaveBeenCalledWith(
      "account_id.in.(2),credit_card_id.in.(3)",
    );
  });
  it("finds missing assignments across the full history", () => {
    expect(setup("attention=envelope").query.is).toHaveBeenCalledWith(
      "empty_envelope",
      null,
    );
    const { query } = setup("attention=account");
    expect(query.is).toHaveBeenCalledWith("account_id", null);
    expect(query.is).toHaveBeenCalledWith("credit_card_id", null);
  });
  it("escapes literal search wildcards and preserves both merchant and account OR groups", () => {
    const { query } = setup("q=50%25_off&accountId=account-2,card-3", {
      groups: [10],
      overrides: [20],
    });
    expect(query.or).toHaveBeenCalledWith(
      'description.ilike."%50\\\\%\\\\_off%",merchant_group_id.in.(10),merchant_override_id.in.(20)',
    );
    expect(query.or).toHaveBeenCalledWith(
      "account_id.in.(2),credit_card_id.in.(3)",
    );
    expect(setup("q=50%25_off").query.ilike).toHaveBeenCalledWith(
      "description",
      "%50\\%\\_off%",
    );
  });
});

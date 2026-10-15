import { describe, expect, it } from "vitest";
import { envelopeActivityDetails, type EnvelopeActivityRecord } from "../envelope-activity";

const record: EnvelopeActivityRecord = {
  id: 1,
  old_balance: 0,
  new_balance: -500,
  change_amount: -500,
  change_type: "transaction_import",
  description: "Savings withdrawal",
  metadata: { import_file_name: "bank.csv" },
  created_at: "2026-10-15T12:00:00Z",
  transaction_date: "2026-10-01",
  transaction: { id: 7, description: "Updated description", date: "2026-10-02" },
};

describe("envelope activity context", () => {
  it("shows the signed envelope change, original description, and separate transaction date", () => {
    const detail = envelopeActivityDetails(record);
    expect(detail.amount).toBe("-$500.00");
    expect(detail.description).toBe("Savings withdrawal");
    expect(detail.context).toContain("Transaction date: Oct 1, 2026");
    expect(detail.context).toContain("Imported from bank.csv");
    expect(detail.recordedAt).toContain("Oct 15, 2026");
  });

  it("makes a month's funding distinguishable from a balance adjustment", () => {
    const funded = envelopeActivityDetails({ ...record, change_type: "allocation_batch", change_amount: 500, metadata: { allocation_month: "2026-10-01" }, transaction: null, transaction_date: null });
    expect(funded.label).toBe("Batch funding");
    expect(funded.amount).toBe("+$500.00");
    expect(funded.context).toEqual(["Funding for October 2026"]);
    expect(envelopeActivityDetails({ ...record, change_type: "manual_edit" }).label).toBe("Balance adjustment");
  });

  it("keeps deleted transaction context when no live transaction exists", () => {
    const detail = envelopeActivityDetails({ ...record, change_type: "transaction_delete", change_amount: 500, description: null, transaction: null, metadata: { transaction_description: "Deleted savings withdrawal", transaction_date: "2026-09-30" }, transaction_date: null });
    expect(detail.description).toBe("Deleted savings withdrawal");
    expect(detail.context).toContain("Transaction date: Sep 30, 2026");
    expect(detail.amount).toBe("+$500.00");
  });

  it("identifies both sides of transfers and recategorization", () => {
    expect(envelopeActivityDetails({ ...record, change_type: "transfer_from", metadata: { transfer_category_name: "Groceries" } }).context).toContain("To Groceries");
    expect(envelopeActivityDetails({ ...record, change_type: "transfer_to", metadata: { transfer_category_name: "Groceries" } }).context).toContain("From Groceries");
    expect(envelopeActivityDetails({ ...record, change_type: "transaction_update", metadata: { update_phase: "reverse" } }).label).toBe("Removed from this envelope");
    expect(envelopeActivityDetails({ ...record, change_type: "transaction_update", metadata: { update_phase: "apply" } }).label).toBe("Assigned to this envelope");
  });

  it("handles old entries without optional metadata or valid dates", () => {
    const detail = envelopeActivityDetails({ ...record, change_type: "legacy", description: null, transaction: null, metadata: null, transaction_date: "bad date", created_at: "bad date" });
    expect(detail.label).toBe("Balance change");
    expect(detail.context).toEqual([]);
    expect(detail.recordedAt).toBe("Date unavailable");
  });
});

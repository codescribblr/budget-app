import { parseLocalDate } from "./date-utils";
import { money } from "./new-look";

export interface EnvelopeActivityRecord {
  id: number;
  old_balance: number;
  new_balance: number;
  change_amount: number;
  change_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  transaction_date?: string | null;
  transaction: {
    id: number;
    description: string;
    date: string;
  } | null;
}

const labels: Record<string, string> = {
  transaction_create: "Transaction added",
  transaction_import: "Transaction imported",
  transaction_update: "Transaction updated",
  transaction_delete: "Transaction deleted",
  transaction_merge: "Duplicate transactions merged",
  allocation_batch: "Batch funding",
  allocation_manual: "Manual funding",
  allocation_income: "Income funding",
  transfer_from: "Transfer out",
  transfer_to: "Transfer in",
  manual_edit: "Balance adjustment",
  income_buffer_fund: "Income buffer change",
};

function metadataText(record: EnvelopeActivityRecord, key: string) {
  const value = record.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function envelopeActivityDetails(record: EnvelopeActivityRecord) {
  let label = labels[record.change_type] || "Balance change";
  if (record.change_type === "transaction_update") {
    if (record.metadata?.update_phase === "reverse") label = "Removed from this envelope";
    if (record.metadata?.update_phase === "apply") label = "Assigned to this envelope";
  }
  // Audit descriptions/dates retain the event's context after a transaction is
  // edited or deleted. The live transaction is only a fallback.
  const description = record.description || metadataText(record, "transaction_description") || record.transaction?.description;
  const dateValue = record.transaction_date || metadataText(record, "transaction_date") || record.transaction?.date;
  const transactionDate = parseLocalDate(dateValue?.slice(0, 10));
  const fundingMonth = parseLocalDate(metadataText(record, "allocation_month")?.slice(0, 7).concat("-01"));
  const counterpart = metadataText(record, "transfer_category_name");
  const context = [
    fundingMonth && `Funding for ${fundingMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
    counterpart && record.change_type === "transfer_from" && `To ${counterpart}`,
    counterpart && record.change_type === "transfer_to" && `From ${counterpart}`,
    transactionDate && `Transaction date: ${transactionDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    metadataText(record, "import_file_name") && `Imported from ${metadataText(record, "import_file_name")}`,
  ].filter((value): value is string => typeof value === "string");
  const recordedAt = new Date(record.created_at);
  return {
    label,
    description,
    context,
    amount: `${record.change_amount > 0 ? "+" : ""}${money(record.change_amount)}`,
    recordedAt: Number.isNaN(recordedAt.getTime()) ? "Date unavailable" : recordedAt.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    }),
  };
}

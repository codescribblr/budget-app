import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/** Display normalized spending/receipts, never the bank's raw sign or account balance direction. */
export function TransactionFlowAmount({
  amount,
  transactionType,
  align = "end",
}: {
  amount: number;
  transactionType: string;
  align?: "start" | "end";
}) {
  const direction =
    transactionType === "income"
      ? "in"
      : transactionType === "expense"
        ? "out"
        : undefined;
  const Icon = direction === "in" ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      className="nl-transaction-flow"
      data-direction={direction}
      data-align={align}
    >
      <span className="nl-transaction-flow-value">
        {formatCurrency(Math.abs(amount))}
      </span>
      <span className="nl-transaction-flow-label">
        {direction && <Icon size={12} aria-hidden="true" />}
        {direction === "in"
          ? "Money in"
          : direction === "out"
            ? "Money out"
            : "Amount"}
      </span>
    </span>
  );
}

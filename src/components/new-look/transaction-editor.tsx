"use client";
import { useState } from "react";
import EditTransactionDialog from "@/components/transactions/EditTransactionDialog";
import { budgetRequest } from "@/lib/budget-request";
import type {
  Category,
  TransactionWithSplits,
  MerchantGroup,
} from "@/lib/types";
import { useRecordGuard } from "./record-guard";

function editable(t: TransactionWithSplits) {
  return {
    ...t,
    splits: t.splits.map((s) => ({
      category_id: s.category_id,
      amount: s.amount,
    })),
    tag_ids: t.tags?.map((tag) => tag.id) ?? [],
  };
}
export function GuardedTransactionEditor(props: {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionWithSplits;
  categories: Category[];
  merchantGroups?: MerchantGroup[];
  onSuccess: () => void;
}) {
  const [original] = useState(props.transaction);
  const guard = useRecordGuard(editable(props.transaction));
  return (
    <EditTransactionDialog
      {...props}
      transaction={original}
      conflictNotice={guard.notice}
      onCommit={(patch) =>
        guard.save(patch, (body) =>
          budgetRequest(`/api/transactions/${original.id}`, body, "PATCH"),
        )
      }
    />
  );
}

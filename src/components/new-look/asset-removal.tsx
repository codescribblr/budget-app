"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { GoalWithDetails, NonCashAsset } from "@/lib/types";
import { money } from "@/lib/new-look";
import { budgetRequest, useBudget } from "./budget-context";
import { guardedMetadata } from "./record-guard";
import { SetupDialog } from "./setup-dialog";

export function AssetRemoval({
  original,
  latest,
  goals,
  onClose,
  onRefresh,
  onRemoved,
}: {
  original: NonCashAsset;
  latest?: NonCashAsset;
  goals: GoalWithDetails[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onRemoved: () => void;
}) {
  const { data, canEdit, refresh } = useBudget();
  const [name, setName] = useState("");
  const [blocked, setBlocked] = useState(false);
  const stale = !latest || original.revision !== latest.revision;
  return (
    <SetupDialog
      title="Remove this asset permanently?"
      description={original.name}
      destructive
      dirty={!!name}
      canEdit={canEdit && !stale && !blocked && !goals.length}
      saveLabel="Remove asset"
      onClose={onClose}
      onSave={async () => {
        if (!data || name !== original.name)
          throw new Error("Type the asset name exactly to confirm removal.");
        try {
          await budgetRequest(
            `/api/non-cash-assets/${original.id}`,
            guardedMetadata(original, data.identity.activeAccountId),
            "DELETE",
          );
        } catch (error) {
          setBlocked(true);
          await onRefresh().catch(() => {});
          throw error;
        }
        toast.success(
          "Asset removed. Loans, transactions, and envelopes were kept.",
        );
        await refresh().catch(() => {});
        onRemoved();
      }}
    >
      {(stale || blocked) && (
        <p className="nl-notice" role="alert">
          {stale
            ? "This asset changed or was removed elsewhere. Close this dialog and review the latest details before removing it."
            : "Close this dialog and check the asset before trying again. The removal may already have completed."}
        </p>
      )}
      {goals.length > 0 && (
        <div className="nl-notice" role="alert">
          <strong>A goal still uses this asset.</strong>
          <p>
            It cannot be removed while a goal depends on it. You can update its
            recorded value and keep its history instead.
          </p>
          {goals.map((goal) => (
            <p key={goal.id}>
              <Link href={`/new/goals?goal=${goal.id}`}>{goal.name} →</Link>
            </p>
          ))}
        </div>
      )}
      <p>
        This deletes the asset, its value-change history, and saved property
        estimates. Automatic valuation updates stop. This cannot be undone.
      </p>
      <p>
        Linked loans and income sources stay, but lose their link to this asset.
        Loan balances do not change. Your transactions and envelope balances
        stay the same.
      </p>
      <div className="nl-setup-preview">
        <span>Effect on current net worth</span>
        <strong>
          {Number(original.current_value) > 0
            ? `${money(Number(original.current_value))} less`
            : "No change"}
        </strong>
        <small>
          This does not add sale proceeds or change Available to save. Earlier
          net worth snapshots remain.
        </small>
      </div>
      <p>
        If you sold the asset, consider recording a value of $0 to preserve its
        history. Record sale proceeds and any loan payoff separately.
        {original.rentcast_enabled &&
          " Turn off automatic property valuations first so the value stays at $0."}
      </p>
      <label>
        Type “{original.name}” to confirm
        <input
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
    </SetupDialog>
  );
}

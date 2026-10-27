import { Check, Copy, Clock } from "lucide-react";
import type { BatchDuplicateSummary } from "@/lib/import/batch-duplicates";

export default function BatchDuplicateStatus({
  summary,
  count,
}: {
  summary?: BatchDuplicateSummary;
  count: number;
}) {
  if (!summary || (!summary.check_complete && summary.total === 0)) {
    return (
      <p className="nl-batch-duplicate-status flex items-center gap-2 text-sm text-muted-foreground">
        <Clock size={15} aria-hidden="true" />
        Duplicate check pending
      </p>
    );
  }
  if (summary.total === 0) {
    return (
      <p className="nl-batch-duplicate-status flex items-center gap-2 text-sm text-muted-foreground">
        <Check size={15} aria-hidden="true" />
        No duplicates detected
      </p>
    );
  }
  const breakdown = [
    summary.database > 0 ? `${summary.database} already imported` : null,
    summary.within_file > 0
      ? `${summary.within_file} possible ${summary.within_file === 1 ? "repeat" : "repeats"} within this file`
      : null,
    summary.unclassified > 0
      ? `${summary.unclassified} ${summary.unclassified === 1 ? "other duplicate" : "other duplicates"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      className="nl-batch-duplicate-status rounded-lg border bg-muted/40 p-3"
      data-all-duplicates={summary.all_duplicates || undefined}
    >
      <div className="flex items-center gap-2">
        <Copy size={16} className="shrink-0" aria-hidden="true" />
        <strong className="text-sm font-semibold">
          {summary.total} of {count} flagged as{" "}
          {summary.total === 1 ? "a duplicate" : "duplicates"}
        </strong>
        {summary.all_duplicates && (
          <span className="nl-batch-all-duplicates rounded-full border px-2 py-0.5 text-xs font-medium">
            All duplicates
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{breakdown}</p>
      {!summary.check_complete ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Check incomplete. Open Review to finish checking this batch.
        </p>
      ) : (
        summary.all_duplicates && (
          <p className="mt-2 text-xs text-muted-foreground">
            {summary.within_file || summary.unclassified
              ? "Review possible repeats if you’re unsure, or delete this queued batch."
              : "Nothing new to import. You can delete this queued batch; saved transactions stay in place."}
          </p>
        )
      )}
    </div>
  );
}

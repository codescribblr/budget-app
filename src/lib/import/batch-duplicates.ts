export interface BatchDuplicateSummary {
  total: number;
  database: number;
  within_file: number;
  unclassified: number;
  check_complete: boolean;
  all_duplicates: boolean;
}
interface QueuedDuplicateRow {
  original_data: unknown;
  processing_tasks?: unknown;
  status?: string;
}
function record(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
/** Count each remaining queued row once, using the same flags as import review. */
export function summarizeBatchDuplicates(
  rows: QueuedDuplicateRow[],
): BatchDuplicateSummary {
  let database = 0,
    within_file = 0,
    unclassified = 0;
  const flags = rows.map((row) => record(row.original_data));
  const checkpoints = rows.map(
    (row) => record(row.processing_tasks).duplicate_detection,
  );
  const completedCheckpoint = checkpoints.includes(true);
  const hasResult = (data: Record<string, unknown>) =>
    typeof data.isDuplicate === "boolean" ||
    data.duplicateType === "database" ||
    data.duplicateType === "within-file";
  flags.forEach((data) => {
    if (data.duplicateType === "database") database++;
    else if (data.duplicateType === "within-file") within_file++;
    else if (data.isDuplicate === true) unclassified++;
  });
  // Checkpoints usually live only on the first row. Also support older batches
  // and batches whose checkpoint row was already imported. Newly appended rows
  // still pending must not inherit an earlier completed check.
  const check_complete =
    rows.length > 0 &&
    !checkpoints.includes(false) &&
    rows.every(
      (row, index) =>
        hasResult(flags[index]) ||
        (completedCheckpoint && row.status === "reviewing"),
    );
  const total = database + within_file + unclassified;
  return {
    total,
    database,
    within_file,
    unclassified,
    check_complete,
    all_duplicates: check_complete && total === rows.length,
  };
}

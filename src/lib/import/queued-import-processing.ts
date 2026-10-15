import { processTransactions } from "../csv-parser-helpers";
import type { ParsedTransaction } from "../import-types";
import type { ProcessingTasksStatus } from "../processing-tasks";

export interface QueuedProcessingStatus {
  processingTasks: ProcessingTasksStatus | null;
  needsProcessing: boolean;
  defaultAccountId: number | null;
  defaultCreditCardId: number | null;
  isHistorical: boolean;
}
export interface ProcessingProgress {
  progress: number;
  stage: string;
  tasks?: ProcessingTasksStatus;
}
export interface PreparedImport {
  status: QueuedProcessingStatus;
  transactions: ParsedTransaction[];
  fileName: string;
  mappingName: string | null;
}

async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(
    url,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || "Could not save import progress. Please retry.",
    );
  return data as T;
}

export async function loadQueuedImport(
  batchId: string,
): Promise<PreparedImport> {
  const [status, data] = await Promise.all([
    request<QueuedProcessingStatus>(
      `/api/import/queue/${encodeURIComponent(batchId)}/processing-status`,
    ),
    request<{ imports: Array<Record<string, any>> }>(
      `/api/automatic-imports/queue?batchId=${encodeURIComponent(batchId)}&forReview=true`,
    ),
  ]);
  if (!data.imports.length)
    throw new Error("No transactions found for this batch.");
  const first = data.imports[0];
  return {
    status,
    fileName: first.csv_file_name || "Import batch",
    mappingName: first.csv_mapping_name || null,
    transactions: data.imports.map((qi) => {
      let original: Record<string, unknown> = {};
      try {
        original =
          typeof qi.original_data === "string"
            ? JSON.parse(qi.original_data)
            : qi.original_data || {};
      } catch {
        /* Older imports may not have valid source data. */
      }
      return {
        id: `queued-${qi.id}`,
        date: qi.transaction_date,
        description: qi.description,
        amount: qi.amount,
        transaction_type: qi.transaction_type,
        merchant: qi.merchant || qi.description,
        suggestedCategory: qi.suggested_category_id ?? undefined,
        account_id: qi.target_account_id,
        credit_card_id: qi.target_credit_card_id,
        is_historical: qi.is_historical || false,
        tag_ids: qi.tag_ids || [],
        splits: qi.suggested_category_id
          ? [
              {
                categoryId: qi.suggested_category_id,
                categoryName: "",
                amount: qi.amount,
              },
            ]
          : [],
        status: "pending",
        isDuplicate: original.isDuplicate === true,
        duplicateType:
          (original.duplicateType as ParsedTransaction["duplicateType"]) ||
          null,
        originalData: JSON.stringify(original),
        hash: qi.hash || "",
      };
    }),
  };
}

type Listener = (progress: ProcessingProgress) => void;
const runs = new Map<
  string,
  {
    promise: Promise<PreparedImport>;
    listeners: Set<Listener>;
    progress: ProcessingProgress;
  }
>();

/** One run per batch, including overlapping dialog effects. Reopening reads saved checkpoints. */
export function prepareQueuedImport(
  batchId: string,
  onProgress: Listener,
): Promise<PreparedImport> {
  const existing = runs.get(batchId);
  if (existing) {
    existing.listeners.add(onProgress);
    onProgress(existing.progress);
    return existing.promise.finally(() =>
      existing.listeners.delete(onProgress),
    );
  }
  const run = {
    listeners: new Set([onProgress]),
    progress: {
      progress: 0,
      stage: "Loading saved progress…",
    } as ProcessingProgress,
    promise: null as unknown as Promise<PreparedImport>,
  };
  const report = (progress: ProcessingProgress) => {
    run.progress = progress;
    run.listeners.forEach((listener) => listener(progress));
  };
  const process = async () => {
    const batch = await loadQueuedImport(batchId);
    const tasks = { ...batch.status.processingTasks };
    report({
      progress: 10,
      stage: "Checking saved steps…",
      tasks: { ...tasks },
    });
    // Queued rows already contain the converted PDF data. Older uploads left this flag false.
    if (tasks.pdf_to_csv === false) {
      await request(
        `/api/import/queue/${encodeURIComponent(batchId)}/mark-task-complete`,
        { task: "pdf_to_csv" },
      );
      tasks.pdf_to_csv = true;
    }
    if (tasks.csv_mapping === false) {
      throw new Error(
        "Finish mapping this file before preparing transactions. Use Re-map Fields on the batch page.",
      );
    }
    // Null task metadata belongs to older, already-reviewable batches. Never invent a rerun.
    if (
      batch.status.processingTasks &&
      (tasks.duplicate_detection === false || tasks.categorization === false)
    ) {
      batch.transactions = await processTransactions(
        batch.transactions,
        undefined,
        undefined,
        true,
        (progress, stage) =>
          report({
            progress: Math.min(progress, 95),
            stage,
            tasks: { ...tasks },
          }),
        undefined,
        undefined, // Only checkpoint after the returned results have been persisted.
        {
          processingTasks: {
            ...tasks,
            duplicate_detection: tasks.duplicate_detection !== false,
            categorization: tasks.categorization !== false,
            import_defaults_assignment: true,
          },
          onStepComplete: async (task, transactions) => {
            await request(
              "/api/automatic-imports/queue/update-categorization",
              { batchId, transactions, completedTasks: [task] },
            );
            tasks[task] = true;
            report({
              progress: task === "duplicate_detection" ? 50 : 95,
              stage: "Progress saved",
              tasks: { ...tasks },
            });
          },
        },
      );
    }
    batch.status = { ...batch.status, processingTasks: tasks };
    report({ progress: 100, stage: "Ready to review", tasks: { ...tasks } });
    return batch;
  };
  // Web Locks also serialize this batch across tabs. Read checkpoints inside the lock.
  run.promise = Promise.resolve()
    .then(async () => {
      if (typeof navigator !== "undefined" && navigator.locks) {
        return await navigator.locks.request(
          `queued-import:${batchId}`,
          process,
        );
      }
      return process();
    })
    .finally(() => {
      runs.delete(batchId);
      run.listeners.clear();
    });
  runs.set(batchId, run);
  return run.promise;
}

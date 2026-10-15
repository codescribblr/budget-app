"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OptionToggle } from "@/components/ui/option-toggle";
import { Check, Circle, Loader2 } from "lucide-react";
import type {
  ProcessingTasksStatus,
  ProcessingTask,
} from "@/lib/processing-tasks";
import {
  prepareQueuedImport,
  type PreparedImport,
  type ProcessingProgress,
} from "@/lib/import/queued-import-processing";

interface QueuedImportProcessingDialogProps {
  open: boolean;
  progress: number;
  stage: string;
  batchId?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}
const taskLabels: [ProcessingTask, string][] = [
  ["pdf_to_csv", "Convert PDF"],
  ["csv_mapping", "Match file columns"],
  ["duplicate_detection", "Check for duplicates"],
  ["categorization", "Apply category rules"],
  ["import_defaults_assignment", "Review import settings"],
];

export default function QueuedImportProcessingDialog({
  open,
  progress,
  stage,
  batchId,
  onComplete,
  onCancel,
}: QueuedImportProcessingDialogProps) {
  const modern = usePathname().startsWith("/new/");
  const [phase, setPhase] = useState<"processing" | "ready" | "error">(
    "processing",
  );
  const [batch, setBatch] = useState<PreparedImport | null>(null);
  const [current, setCurrent] = useState<ProcessingProgress>({
    progress: 0,
    stage: "Loading saved progress…",
  });
  const [tasks, setTasks] = useState<ProcessingTasksStatus>({});
  const [linkedName, setLinkedName] = useState("No account (unassigned)");
  const [historical, setHistorical] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!open || !batchId) return;
    let active = true;
    setPhase("processing");
    setBatch(null);
    setTasks({});
    setError("");
    setSubmitting(false);
    submittingRef.current = false;
    setCurrent({ progress: 0, stage: "Loading saved progress…" });
    setLinkedName("No account (unassigned)");
    void prepareQueuedImport(batchId, (update) => {
      if (!active) return;
      setCurrent(update);
      if (update.tasks) setTasks(update.tasks);
    })
      .then(async (result) => {
        if (!active) return;
        setBatch(result);
        setHistorical(result.status.isHistorical);
        setPhase("ready");
        const cardId = result.status.defaultCreditCardId;
        const accountId = result.status.defaultAccountId;
        if (cardId || accountId) {
          const fallback = cardId ? "Linked credit card" : "Linked account";
          setLinkedName(fallback);
          try {
            const response = await fetch(
              cardId ? "/api/credit-cards" : "/api/accounts",
            );
            const list = response.ok ? await response.json() : [];
            if (active)
              setLinkedName(
                list.find(
                  (item: { id: number }) => item.id === (cardId || accountId),
                )?.name || fallback,
              );
          } catch {
            /* The account name is optional; its existing ID is preserved. */
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Could not prepare this import.",
        );
        setPhase("error");
      });
    return () => {
      active = false;
    };
  }, [open, batchId, attempt]);

  const handleContinue = async () => {
    if (phase !== "ready" || !batchId || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        "/api/automatic-imports/queue/update-batch",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId, isHistorical: historical }),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || "Could not save import settings. Please try again.",
        );
      }
      onComplete?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save import settings.",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  const busy = !batchId || phase === "processing" || submitting;
  const shownProgress = batchId ? current.progress : progress;
  const shownStage = batchId ? current.stage : stage;
  const duplicates =
    batch?.transactions.filter((t) => t.isDuplicate).length || 0;
  const categorized =
    batch?.transactions.filter(
      (t) => t.suggestedCategory !== undefined && !t.isDuplicate,
    ).length || 0;
  const pendingStep = taskLabels.find(([task]) => tasks[task] === false)?.[0];
  const primary = modern ? "nl-primary" : "";
  const secondary = modern ? "nl-secondary" : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel?.();
      }}
    >
      <DialogContent
        className={
          modern
            ? "new-look nl-import-processing sm:max-w-[600px]"
            : "sm:max-w-[600px]"
        }
        showCloseButton={!busy && !!onCancel}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (busy || !onCancel) e.preventDefault();
        }}
      >
        <DialogHeader>
          {modern && <p className="nl-eyebrow">Import & review</p>}
          <DialogTitle>
            {phase === "ready" && batchId
              ? "Ready to review"
              : "Prepare your import"}
          </DialogTitle>
          <DialogDescription>
            {phase === "ready" && batchId
              ? "Check the import settings, then review your transactions before importing."
              : "Check duplicates and apply category rules. Completed steps are saved so you can resume if interrupted."}
          </DialogDescription>
        </DialogHeader>
        <div className={modern ? "nl-import-body" : "space-y-5 py-4"}>
          {batch && (
            <div className={modern ? "nl-import-file" : "text-sm break-words"}>
              <strong>{batch.fileName}</strong>
              {batch.mappingName && (
                <p className="text-muted-foreground">{batch.mappingName}</p>
              )}
            </div>
          )}
          {(!batchId || phase === "processing") && (
            <div className="space-y-3" role="status">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                <span>{shownStage || "Preparing transactions…"}</span>
              </div>
              <Progress
                value={shownProgress}
                aria-label="Import preparation progress"
                className="h-2"
              />
            </div>
          )}
          {batchId &&
            taskLabels.some(([task]) => tasks[task] !== undefined) && (
              <ol
                className={modern ? "nl-import-steps" : "space-y-3"}
                aria-label="Import preparation steps"
              >
                {taskLabels
                  .filter(([task]) => tasks[task] !== undefined)
                  .map(([task, label]) => (
                    <li key={task} className="flex items-center gap-3 text-sm">
                      {tasks[task] ? (
                        <Check
                          className="h-4 w-4 text-primary shrink-0"
                          aria-hidden="true"
                        />
                      ) : phase === "processing" && task === pendingStep ? (
                        <Loader2
                          className="h-4 w-4 animate-spin text-primary shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle
                          className="h-4 w-4 text-muted-foreground shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span className="flex-1">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {tasks[task]
                          ? "Done"
                          : task === "import_defaults_assignment" &&
                              phase === "ready"
                            ? "Below"
                            : "Pending"}
                      </span>
                    </li>
                  ))}
              </ol>
            )}
          {phase === "ready" && batch && (
            <>
              <dl
                className={
                  modern
                    ? "nl-import-totals"
                    : "grid grid-cols-3 gap-3 rounded-lg bg-muted p-4"
                }
              >
                <div>
                  <dt>Transactions</dt>
                  <dd>{batch.transactions.length}</dd>
                </div>
                <div>
                  <dt>Categorized</dt>
                  <dd>{categorized}</dd>
                </div>
                <div>
                  <dt>Duplicates</dt>
                  <dd>{duplicates}</dd>
                </div>
              </dl>
              <div
                className={
                  modern ? "nl-import-settings" : "space-y-4 border-t pt-4"
                }
              >
                <div>
                  <p className="text-xs text-muted-foreground">
                    Linked account
                  </p>
                  <strong>{linkedName}</strong>
                </div>
                <div className="flex items-start gap-3">
                  <OptionToggle
                    id="import-historical"
                    checked={historical}
                    disabled={submitting}
                    onCheckedChange={setHistorical}
                    aria-describedby="import-historical-help"
                  />
                  <div>
                    <Label
                      htmlFor="import-historical"
                      className="cursor-pointer"
                    >
                      Historical transactions
                    </Label>
                    <p
                      id="import-historical-help"
                      className="text-xs text-muted-foreground mt-1"
                    >
                      Include in reports without changing current envelope
                      balances.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
          {error && (
            <div
              role="alert"
              className={modern ? "nl-notice" : "rounded-lg border p-4 text-sm"}
            >
              <p>{error}</p>
              {phase === "error" && (
                <p className="mt-2 text-muted-foreground">
                  Your saved steps are kept. Retry to continue from the last
                  completed step.
                </p>
              )}
            </div>
          )}
        </div>
        {batchId && (
          <div
            className={
              modern
                ? "nl-import-footer"
                : "flex justify-end gap-2 pt-4 border-t"
            }
          >
            {onCancel && !busy && (
              <Button
                variant="outline"
                className={secondary}
                onClick={onCancel}
              >
                Back to imports
              </Button>
            )}
            {phase === "error" && (
              <Button
                className={primary}
                onClick={() => setAttempt((value) => value + 1)}
              >
                Retry processing
              </Button>
            )}
            {phase === "ready" && (
              <Button
                className={primary}
                onClick={handleContinue}
                disabled={submitting}
              >
                {submitting ? "Saving settings…" : "Continue to review →"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

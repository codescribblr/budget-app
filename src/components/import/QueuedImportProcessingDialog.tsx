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
import { Check, Circle, Loader2 } from "lucide-react";
import type {
  ProcessingTasksStatus,
  ProcessingTask,
} from "@/lib/processing-tasks";
import {
  prepareQueuedImport,
  type ProcessingProgress,
} from "@/lib/import/queued-import-processing";

interface QueuedImportProcessingDialogProps {
  open: boolean;
  progress: number;
  stage: string;
  batchId?: string;
  onComplete?: () => void | Promise<void>;
  onCancel?: () => void;
}
const taskLabels: [ProcessingTask, string][] = [
  ["pdf_to_csv", "Convert PDF"],
  ["csv_mapping", "Match file columns"],
  ["duplicate_detection", "Check for duplicates"],
  ["categorization", "Apply category rules"],
  ["import_defaults_assignment", "Keep import settings"],
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
  const [current, setCurrent] = useState<ProcessingProgress>({
    progress: 0,
    stage: "Loading saved progress…",
  });
  const [tasks, setTasks] = useState<ProcessingTasksStatus>({});
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!open || !batchId) return;
    let active = true;
    setPhase("processing");
    setTasks({});
    setError("");
    setCurrent({ progress: 0, stage: "Loading saved progress…" });
    void prepareQueuedImport(batchId, (update) => {
      if (!active) return;
      setCurrent(update);
      if (update.tasks) setTasks(update.tasks);
    })
      .then(async () => {
        if (!active) return;
        setPhase("ready");
        setCurrent({ progress: 100, stage: "Opening your transaction review…" });
        await onCompleteRef.current?.();
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

  const busy = phase !== "error";
  const shownProgress = batchId ? current.progress : progress;
  const shownStage = batchId ? current.stage : stage;
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
              ? "Your transactions are prepared. Opening your review now."
              : "Check duplicates and apply category rules. Completed steps are saved so you can resume if interrupted."}
          </DialogDescription>
        </DialogHeader>
        <div className={modern ? "nl-import-body" : "space-y-5 py-4"}>
          {phase !== "error" && (
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
                          : "Pending"}
                      </span>
                    </li>
                  ))}
              </ol>
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
        {batchId && phase === "error" && (
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

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

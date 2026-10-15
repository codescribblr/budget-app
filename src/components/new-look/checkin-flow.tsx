"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useFeatures } from "@/contexts/FeatureContext";
import {
  checkinSteps,
  nextCheckinStep,
  taskCheckin,
  type CheckinTask,
} from "@/lib/checkins";
import type { Cadence } from "@/lib/new-look";
import { useBudget, useCheckins } from "./budget-context";

export function useCheckinSteps(cadence: Cadence) {
  const { hasPremium, isFeatureEnabled, loading, error, refreshFeatures } =
    useFeatures();
  const planning =
    hasPremium &&
    (isFeatureEnabled("goals") || isFeatureEnabled("income_buffer"));
  return {
    steps: checkinSteps(cadence, planning),
    loading: cadence === "monthly" && loading,
    error: cadence === "monthly" ? error : null,
    retry: refreshFeatures,
  };
}
export function useTaskCheckin(task: CheckinTask) {
  return taskCheckin(task, useSearchParams().get("checkin"));
}
function useCheckinFlow(task: CheckinTask, defaultCadence: Cadence) {
  const requested = useTaskCheckin(task);
  const cadence = requested ?? defaultCadence;
  const { steps, loading, error, retry } = useCheckinSteps(cadence);
  const progress = useCheckins(cadence);
  const index = steps.findIndex((step) => step.key === task);
  return {
    ...progress,
    active: requested !== null,
    cadence,
    steps,
    index,
    loading,
    error,
    retry,
    next: nextCheckinStep(steps, task, progress.items),
  };
}

export function CheckinHeader({
  task,
  cadence: defaultCadence,
}: {
  task: CheckinTask;
  cadence: Cadence;
}) {
  const { cadence, steps, index, items, error, retry, active } = useCheckinFlow(
    task,
    defaultCadence,
  );
  if (!active) return null;
  if (error) return <CheckinLoadError retry={retry} />;
  if (index < 0) return null;
  return (
    <nav
      className="nl-checkin-header"
      aria-label={`${cadence} check-in progress`}
    >
      <div className="nl-checkin-heading">
        <span>
          <strong>
            {cadence[0].toUpperCase() + cadence.slice(1)} check-in
          </strong>{" "}
          · Step {index + 1} of {steps.length}
        </span>
        <Link href={`/new?checkin=${cadence}`}>
          <ArrowLeft size={14} /> Check-in overview
        </Link>
      </div>
      <ol className="nl-checkin-steps">
        {steps.map((step, i) => (
          <li key={step.key}>
            <Link
              href={`${step.href}?checkin=${cadence}`}
              aria-current={i === index ? "step" : undefined}
            >
              <span className={`nl-step ${items[step.key] ? "is-done" : ""}`}>
                {items[step.key] ? <Check size={14} /> : i + 1}
              </span>
              {step.label}
              {items[step.key] && <span className="sr-only"> (reviewed)</span>}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CheckinLoadError({ retry }: { retry: () => Promise<void> }) {
  return (
    <div role="alert" className="nl-notice">
      We couldn’t load the planning tools for this check-in.{" "}
      <button className="nl-secondary" onClick={() => void retry()}>
        Retry check-in
      </button>
    </div>
  );
}

export function CheckinFooter({
  task,
  cadence: defaultCadence,
  title,
  description,
  beforeComplete,
  saveLabel,
  disabled = false,
  children,
}: {
  task: CheckinTask;
  cadence: Cadence;
  title: string;
  description: React.ReactNode;
  beforeComplete?: () => Promise<boolean>;
  saveLabel?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const flow = useCheckinFlow(task, defaultCadence);
  const { data, error, refreshing } = useBudget();
  const router = useRouter();
  const locked = useRef(false);
  const visit = useRef(0);
  const [continuing, setContinuing] = useState(false);
  useEffect(
    () => () => {
      visit.current++;
    },
    [
      task,
      flow.cadence,
      flow.active,
      data?.userId,
      data?.identity.activeAccountId,
    ],
  );
  if (flow.active ? flow.index < 0 : !beforeComplete) return null;
  const unavailable =
    disabled ||
    continuing ||
    (flow.active && (flow.loading || !!flow.error || !flow.ready)) ||
    !data ||
    !!error ||
    refreshing;
  async function complete() {
    if (unavailable || locked.current) return;
    locked.current = true;
    const startedVisit = visit.current;
    setContinuing(true);
    try {
      if (beforeComplete && !(await beforeComplete())) return;
      if (!flow.active) return;
      // A user may leave while a save is in flight. Let the save finish without
      // marking a different visit reviewed or navigating them away again.
      if (startedVisit !== visit.current) return;
      const updated = flow.mark(task);
      const next = nextCheckinStep(flow.steps, task, updated);
      router.push(
        next
          ? `${next.href}?checkin=${flow.cadence}`
          : `/new/check-in/complete?checkin=${flow.cadence}`,
      );
    } catch {
      toast.error(
        flow.active
          ? "This step could not be completed. Your progress has not advanced. Please try again."
          : "Changes could not be saved. Please try again.",
      );
    } finally {
      locked.current = false;
      setContinuing(false);
    }
  }
  return (
    <section
      className={flow.active ? "nl-checkin-footer" : "nl-savebar"}
      aria-label={flow.active ? "Complete this check-in step" : "Save changes"}
    >
      <div>
        <strong>{title}</strong>
        <p aria-live="polite">{description}</p>
        {flow.active && saveLabel && (
          <p className="nl-checkin-next">
            {flow.next
              ? `Up next: ${flow.next.label}`
              : "Up next: your check-in summary"}
          </p>
        )}
      </div>
      <div className="nl-checkin-actions">
        {children}
        <button
          className="nl-primary"
          disabled={unavailable}
          onClick={() => void complete()}
        >
          {continuing
            ? saveLabel
              ? "Saving…"
              : "Continuing…"
            : !flow.active
              ? saveLabel
              : saveLabel
                ? `${saveLabel} & ${flow.next ? "continue" : "finish"}`
                : flow.next
                  ? `Continue to ${flow.next.label.toLowerCase()}`
                  : `Finish ${flow.cadence} check-in`}
          {!continuing &&
            flow.active &&
            (flow.next ? <ArrowRight size={17} /> : <Check size={17} />)}
        </button>
      </div>
    </section>
  );
}

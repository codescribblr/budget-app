"use client";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { Cadence } from "@/lib/new-look";
import { checkinStatus, checkinStatusLabel } from "@/lib/checkins";
import { useCheckins } from "./budget-context";
import { useCheckinSteps } from "./checkin-flow";

function useRoutine(cadence: Cadence) {
  const { items, ready, period } = useCheckins(cadence);
  const { steps, loading, error } = useCheckinSteps(cadence);
  return {
    period,
    status: checkinStatus(steps, items),
    known: ready && !loading && !error,
    error,
  };
}

export function CheckinRoutines({ selected }: { selected: Cadence }) {
  const { period, status, known, error } = useRoutine(selected);
  return (
    <div className="nl-routine-picker">
      <div
        className="nl-tabs nl-routine-tabs"
        role="group"
        aria-label="Your check-ins"
      >
        {(["daily", "weekly", "monthly"] as const).map((cadence) => (
          <Routine
            key={cadence}
            cadence={cadence}
            selected={selected === cadence}
          />
        ))}
      </div>
      <p className="nl-routine-context" aria-live="polite" aria-atomic="true">
        <span>{period.periodLabel}</span>
        <span aria-hidden="true"> · </span>
        <span>
          {error
            ? "Status unavailable"
            : !known
              ? "Loading…"
              : status.state === "complete"
                ? checkinStatusLabel(selected, status.state)
                : status.done
                  ? `${status.done} of ${status.total} steps reviewed`
                  : `${status.total} steps to review`}
        </span>
      </p>
    </div>
  );
}

function Routine({
  cadence,
  selected,
}: {
  cadence: Cadence;
  selected: boolean;
}) {
  const router = useRouter();
  const { period, status, known, error } = useRoutine(cadence);
  const label = `${cadence[0].toUpperCase() + cadence.slice(1)} check-in`;
  const statusLabel = error
    ? "Status unavailable"
    : !known
      ? "Loading"
      : checkinStatusLabel(cadence, status.state);
  return (
    <button
      type="button"
      className={selected ? "active" : undefined}
      aria-pressed={selected}
      aria-label={`${label}: ${statusLabel}${known && status.state === "in-progress" ? `, ${status.done} of ${status.total} steps reviewed` : ""}`}
      title={`${label} · ${period.periodLabel} · ${statusLabel}`}
      onClick={() =>
        router.replace(`/new?checkin=${cadence}`, { scroll: false })
      }
    >
      <span>{cadence[0].toUpperCase() + cadence.slice(1)}</span>
      <span
        className="nl-routine-indicator"
        data-state={known ? status.state : "loading"}
        aria-hidden="true"
      >
        {error ? (
          "!"
        ) : !known ? (
          "…"
        ) : status.state === "complete" ? (
          <>
            <Check size={13} />
            <span className="nl-routine-done-label">Done</span>
          </>
        ) : status.state === "in-progress" ? (
          `${status.done}/${status.total}`
        ) : (
          "Due"
        )}
      </span>
    </button>
  );
}

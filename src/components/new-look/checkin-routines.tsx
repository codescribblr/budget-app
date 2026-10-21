"use client";
import { useRouter } from "next/navigation";
import { Check, Circle, CircleDot } from "lucide-react";
import type { Cadence } from "@/lib/new-look";
import { checkinStatus, checkinStatusLabel } from "@/lib/checkins";
import { useCheckins } from "./budget-context";
import { useCheckinSteps } from "./checkin-flow";

export function CheckinRoutines({ selected }: { selected: Cadence }) {
  return (
    <>
      <div className="nl-routines" role="group" aria-label="Your check-ins">
        {(["daily", "weekly", "monthly"] as const).map((cadence) => (
          <Routine
            key={cadence}
            cadence={cadence}
            selected={selected === cadence}
          />
        ))}
      </div>
      <p className="nl-routines-note">
        A fresh check-in each day, each Monday, and the first of each month.
      </p>
    </>
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
  const { items, ready, period } = useCheckins(cadence);
  const { steps, loading, error } = useCheckinSteps(cadence);
  const status = checkinStatus(steps, items);
  const known = ready && !loading && !error;
  const Icon =
    known && status.state === "complete"
      ? Check
      : known && status.state === "in-progress"
        ? CircleDot
        : Circle;
  return (
    <button
      type="button"
      className="nl-routine"
      aria-pressed={selected}
      onClick={() =>
        router.replace(`/new?checkin=${cadence}`, { scroll: false })
      }
    >
      <span className="nl-routine-title">
        {cadence[0].toUpperCase() + cadence.slice(1)} check-in
      </span>
      <span className="nl-routine-period">{period.periodLabel}</span>
      <span
        className="nl-routine-status"
        data-state={known ? status.state : "loading"}
      >
        <Icon size={15} aria-hidden="true" />
        {error
          ? "Status unavailable"
          : !known
            ? "Loading…"
            : checkinStatusLabel(cadence, status.state)}
        {known && status.state === "in-progress" && (
          <span className="nl-routine-count">
            {" "}
            · {status.done} of {status.total}
          </span>
        )}
      </span>
    </button>
  );
}

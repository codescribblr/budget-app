"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { type Cadence, money } from "@/lib/new-look";
import { useBudget, useCheckins } from "./budget-context";

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="nl-page-heading">
      <div>
        <p className="nl-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function TaskReturn({
  task,
  cadence: defaultCadence,
}: {
  task: string;
  cadence: Cadence;
}) {
  const params = useSearchParams();
  const requested = params.get("checkin");
  const cadence: Cadence =
    requested === "daily" || requested === "weekly" || requested === "monthly"
      ? requested
      : defaultCadence;
  const { items, mark } = useCheckins(cadence);
  const done = Boolean(items[task]);
  return (
    <div className="nl-task-return">
      <Link href={`/new?checkin=${cadence}`}>
        <ArrowLeft size={15} />
        Back to {cadence} check-in
      </Link>
      <button
        className={done ? "nl-completed" : "nl-secondary"}
        onClick={() => mark(task, !done)}
      >
        {done && <Check size={15} />}{" "}
        {done ? "Reviewed · Undo checkmark" : "Mark reviewed"}
      </button>
    </div>
  );
}
export function ReadOnlyNotice() {
  const { canEdit, refreshing, error } = useBudget();
  return canEdit || refreshing || error ? null : (
    <p className="nl-notice">
      You have read-only access to this budget. You can still review it and
      track your check-ins.
    </p>
  );
}
export function AvailableCalculation() {
  const { data } = useBudget();
  if (!data) return null;
  const s = data.summary;
  return (
    <details className="nl-calculation">
      <summary>How available to save is calculated</summary>
      <dl>
        <div>
          <dt>Included account balances</dt>
          <dd>{money(s.total_monies)}</dd>
        </div>
        <div>
          <dt>Envelope balances (including buffer)</dt>
          <dd>− {money(s.total_envelopes)}</dd>
        </div>
        <div>
          <dt>Included credit card balances owed</dt>
          <dd>− {money(s.total_credit_card_balances)}</dd>
        </div>
        <div>
          <dt>Pending checks, net</dt>
          <dd>{money(s.total_pending_checks)}</dd>
        </div>
        <div>
          <dt>Available to save</dt>
          <dd>{money(s.current_savings)}</dd>
        </div>
      </dl>
      <p>
        Based on recorded balances. Unimported spending may not be reflected in
        your envelopes.
      </p>
    </details>
  );
}

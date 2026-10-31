"use client";
import { useState, useEffect, useRef } from "react";
import { money } from "@/lib/new-look";
import { BudgetRequestError } from "@/lib/budget-request";
import { useBudget } from "./budget-context";

function fieldLabel(key: string) {
  return (
    (
      {
        annual_income: "Annual gross pay",
        current_balance: "Money left",
        monthly_amount: "Monthly budget",
        monthly_contribution: "Monthly goal funding",
        current_value: "Recorded value",
        balance: "Recorded balance",
      } as Record<string, string>
    )[key] ??
    key.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())
  );
}
function fieldValue(key: string, value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (
    typeof value === "number" &&
    /balance|amount|income|contribution|current_value/.test(key)
  )
    return money(value);
  return String(value ?? "—");
}
type RecordVersion = { revision?: string; [key: string]: unknown };
export function guardedMetadata(
  record: { revision?: string },
  budgetId: number,
) {
  if (!record.revision)
    throw new Error("Reload this record before saving safely.");
  return { expectedRevision: record.revision, expectedBudgetId: budgetId };
}
/** Original fields never advance automatically. Explicit review rebases only the
 * revision; fields the user never changed are omitted from the PATCH. */
export function useRecordGuard<T extends { revision?: string }>(
  record: T | null | undefined,
) {
  const { data, refresh } = useBudget();
  const [original] = useState(record);
  const [reviewed, setReviewed] = useState(record?.revision);
  const [server, setServer] = useState<RecordVersion | null>(null);
  const [missing, setMissing] = useState(false);
  const conflictProp = useRef(record?.revision);
  useEffect(() => {
    if (server && record?.revision !== conflictProp.current) setServer(null);
  }, [record?.revision, server]);
  const unavailable =
    missing || (record as RecordVersion)?.recordMissing === true;
  const latest = server ?? (record as RecordVersion | undefined);
  const conflict = !!original && latest?.revision !== reviewed;
  async function save(
    patch: Record<string, unknown>,
    commit: (payload: Record<string, unknown>) => Promise<unknown>,
  ) {
    if (unavailable)
      throw new Error(
        "This record was removed elsewhere. Your entries are retained, but it cannot be saved.",
      );
    if (!original) {
      await commit(patch);
      return;
    }
    if (!data || !reviewed)
      throw new Error("Reload this record before saving safely.");
    if (conflict) throw new Error("Review the changed details before saving.");
    const changed = Object.fromEntries(
      Object.entries(patch).filter(
        ([key, value]) =>
          JSON.stringify(value) !==
          JSON.stringify((original as RecordVersion)[key]),
      ),
    );
    if (!Object.keys(changed).length) return;
    try {
      await commit({
        ...changed,
        ...guardedMetadata(
          { revision: reviewed },
          data.identity.activeAccountId,
        ),
      });
    } catch (error) {
      if (
        error instanceof BudgetRequestError &&
        error.code === "STALE_RECORD"
      ) {
        conflictProp.current = record?.revision;
        setServer(error.latest as RecordVersion);
        void refresh().catch(() => {});
      }
      if (error instanceof BudgetRequestError && error.status === 404)
        setMissing(true);
      throw error;
    }
  }
  const notice = unavailable ? (
    <div className="nl-notice" role="alert">
      <strong>This record is no longer available.</strong>
      <p>
        Your entries are retained here, but saving is disabled. Close this
        editor when you have finished reviewing them.
      </p>
    </div>
  ) : conflict ? (
    <div className="nl-notice nl-edit-conflict" role="status">
      <strong>Saved details changed while you were editing.</strong>
      <p>Your entries are retained. These are the latest saved changes:</p>
      <dl>
        {Object.entries(latest ?? {})
          .filter(
            ([key, value]) =>
              ![
                "revision",
                "updated_at",
                "created_at",
                "user_id",
                "account_id",
              ].includes(key) &&
              typeof value !== "object" &&
              JSON.stringify(value) !==
                JSON.stringify((original as RecordVersion)[key]),
          )
          .map(([key, value]) => (
            <div key={key}>
              <dt>{fieldLabel(key)}</dt>
              <dd>{fieldValue(key, value)}</dd>
            </div>
          ))}
      </dl>
      <button
        type="button"
        className="nl-secondary"
        onClick={() => {
          setReviewed(latest?.revision);
        }}
      >
        Keep my edits · use latest for the rest
      </button>
      <p className="nl-muted">
        Only the fields you changed will be saved. To discard your entries,
        close this editor and open the record again.
      </p>
    </div>
  ) : null;
  return { original, save, notice, conflict };
}

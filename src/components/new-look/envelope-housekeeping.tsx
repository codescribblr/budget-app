"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Check,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  archiveBlock,
  deleteBlock,
  usageLabel,
  type ManagedEnvelope,
} from "@/lib/housekeeping";
import { money } from "@/lib/new-look";
import { BudgetRequestError } from "@/lib/budget-request";
import { DataBoundary, budgetRequest, useBudget } from "./budget-context";
import { PageHeading, ReadOnlyNotice } from "./common";
import { SkeletonRows } from "./skeleton-sections";
import { useResourceVersion } from "./use-resource-version";
import { useMoneyCommand } from "./use-money-command";
import { SetupDialog } from "./setup-dialog";
import { EnvelopeOrderWorkspace } from "./envelope-order-workspace";

type Action = "archive" | "restore" | "delete" | "rename-system";
export function EnvelopeHousekeeping() {
  const { data } = useBudget();
  return (
    <DataBoundary>
      <Organizer key={data?.identity.activeAccountId} />
    </DataBoundary>
  );
}
function Organizer() {
  const { canEdit, refresh } = useBudget();
  const version = useResourceVersion("envelopes", "planning");
  const [rows, setRows] = useState<ManagedEnvelope[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [dialog, setDialog] = useState<{
    action: Action;
    rows: ManagedEnvelope[];
  } | null>(null);
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current;
    try {
      const result = await budgetRequest<ManagedEnvelope[]>(
        "/api/categories/housekeeping",
      );
      if (id === request.current) {
        setRows(result);
        setError("");
      }
      return result;
    } catch (e) {
      if (id === request.current)
        setError(e instanceof Error ? e.message : "Could not load envelopes.");
      return null;
    }
  }, []);
  useEffect(() => {
    void load();
    return () => {
      request.current++;
    };
  }, [load, version]);
  const ordinary = rows?.filter((c) => !c.is_system && !c.is_buffer) ?? [];
  const active = ordinary.filter((c) => !c.is_archived);
  const archived = ordinary.filter((c) => c.is_archived);
  const system = rows?.filter((c) => c.is_system || c.is_buffer) ?? [];
  const shown = (
    tab === "system" ? system : tab === "archived" ? archived : active
  ).filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const chosen = (rows ?? []).filter((c) => selected.includes(c.id));
  const selectable = shown;
  const changeTab = (value: string) => {
    setTab(value);
    setSelected([]);
  };
  async function saved() {
    setSelected([]);
    await Promise.all([load(), refresh().catch(() => {})]);
  }
  return (
    <>
      <PageHeading
        eyebrow="Envelopes · organize"
        title="Organize envelopes"
        description="Put everyday envelopes first. Select a few to move together or archive the ones you no longer use."
      >
        <div className="nl-checkin-actions">
          <Link className="nl-secondary" href="/new/budget/manage">
            Back to envelope setup
          </Link>
        </div>
      </PageHeading>
      <ReadOnlyNotice />
      <div className="nl-toolbar">
        <div className="nl-filters" aria-label="Envelope status">
          {[
            ["active", "Active", active.length],
            ["archived", "Archived", archived.length],
            ["system", "System", system.length],
          ].map(([value, label, count]) => (
            <button
              key={value}
              className={tab === value ? "active" : ""}
              aria-pressed={tab === value}
              onClick={() => changeTab(String(value))}
            >
              {label} <span className="nl-muted">{rows ? count : "—"}</span>
            </button>
          ))}
        </div>
        <input
          aria-label="Find an envelope"
          placeholder="Find an envelope…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        />
      </div>
      {tab === "archived" && (
        <div className="nl-housekeeping-selection">
          <button
            className="nl-secondary"
            disabled={!canEdit || !!error || !selectable.length}
            onClick={() =>
              setSelected(selected.length ? [] : selectable.map((c) => c.id))
            }
          >
            {selected.length ? "Clear selection" : "Select visible envelopes"}
          </button>
          <span aria-live="polite">
            {chosen.length
              ? `${chosen.length} selected`
              : tab === "archived"
                ? "Restore envelopes when you need them again."
                : "Empty envelopes can be archived."}
          </span>
          {!!chosen.length && (
            <button
              className="nl-primary"
              disabled={!canEdit || !!error}
              onClick={() =>
                setDialog({
                  action: "restore",
                  rows: chosen,
                })
              }
            >
              Review restoration →
            </button>
          )}
        </div>
      )}
      {tab === "system" && (
        <p className="nl-footnote">
          System categories organize transactions without an envelope funding
          target. The income buffer is managed separately.
        </p>
      )}
      {error && (
        <p className="nl-notice" role="alert">
          {error}{" "}
          <button className="nl-secondary" onClick={() => void load()}>
            Try again
          </button>
        </p>
      )}
      {rows && (
        <div hidden={tab !== "active"}>
          <EnvelopeOrderWorkspace
            rows={active}
            search={search}
            canEdit={canEdit && !error}
            onArchive={(envelopes) =>
              setDialog({ action: "archive", rows: envelopes })
            }
            reload={load}
            onSaved={saved}
          />
        </div>
      )}
      {!rows && !error ? (
        <div className="nl-order-loading">
          <SkeletonRows
            kind="activity"
            count={7}
            label="Loading envelope organization"
          />
        </div>
      ) : (
        <div className="nl-housekeeping-list" hidden={tab === "active"}>
          {shown.map((c) => {
            const block = archiveBlock(c);
            return (
              <article
                className="nl-housekeeping-row"
                key={c.id}
                data-selected={selected.includes(c.id)}
              >
                {tab !== "system" && (
                  <button
                    className="nl-housekeeping-check"
                    disabled={!canEdit || !!error}
                    aria-label={`Select ${c.name}`}
                    aria-pressed={selected.includes(c.id)}
                    onClick={() =>
                      setSelected((old) =>
                        old.includes(c.id)
                          ? old.filter((id) => id !== c.id)
                          : [...old, c.id],
                      )
                    }
                  >
                    {selected.includes(c.id) && <Check size={16} />}
                  </button>
                )}
                <div className="nl-housekeeping-name">
                  <h3>{c.name}</h3>
                  <p>
                    {c.is_buffer
                      ? "Cash set aside for future pay periods"
                      : tab === "system"
                        ? c.notes || "Excluded from envelope balances"
                        : block ||
                          `${money(c.monthly_amount)} monthly funding target`}
                  </p>
                  {c.linkedGoals.map((g) => (
                    <Link key={g.id} href={`/new/goals?goal=${g.id}`}>
                      Manage {g.name} →
                    </Link>
                  ))}
                  {!c.is_system && !c.is_buffer && c.current_balance !== 0 && (
                    <Link href={`/new/budget?envelope=${c.id}&tab=transfer`}>
                      Move money →
                    </Link>
                  )}
                </div>
                {tab !== "system" && (
                  <div className="nl-housekeeping-money">
                    <strong>{money(c.current_balance)}</strong>
                    <small>in envelope</small>
                  </div>
                )}
                <div className="nl-housekeeping-actions">
                  {c.is_buffer ? (
                    <Link
                      className="nl-secondary"
                      href="/new/goals#income-buffer"
                    >
                      Manage buffer →
                    </Link>
                  ) : tab === "system" ? (
                    <button
                      className="nl-secondary"
                      disabled={!canEdit || !!error}
                      onClick={() =>
                        setDialog({ action: "rename-system", rows: [c] })
                      }
                    >
                      <Settings2 size={15} />
                      Edit label
                    </button>
                  ) : (
                    <>
                      <button
                        className="nl-secondary"
                        disabled={!canEdit || !!error}
                        onClick={() =>
                          setDialog({
                            action: c.is_archived ? "restore" : "archive",
                            rows: [c],
                          })
                        }
                      >
                        {c.is_archived ? (
                          <ArchiveRestore size={15} />
                        ) : (
                          <Archive size={15} />
                        )}{" "}
                        {c.is_archived ? "Restore" : "Archive"}
                      </button>
                      {c.is_archived && (
                        <button
                          className="nl-icon-button"
                          disabled={!canEdit || !!error}
                          aria-label={`Remove ${c.name} permanently`}
                          onClick={() =>
                            setDialog({ action: "delete", rows: [c] })
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
          {rows && !shown.length && (
            <div className="nl-setup-empty">
              <h3>
                {search
                  ? "No matching envelopes"
                  : tab === "archived"
                    ? "Nothing archived"
                    : tab === "system"
                      ? "No system categories"
                      : "No active envelopes"}
              </h3>
              <p>
                {search
                  ? "Try another name."
                  : tab === "archived"
                    ? "Archived envelopes and their history stay here until you need them again."
                    : "Your envelopes will appear here when they’re available."}
              </p>
            </div>
          )}
        </div>
      )}
      {tab === "archived" && !!archived.length && (
        <p className="nl-footnote">
          Permanent removal is available only for empty envelopes with no
          history or linked records.
        </p>
      )}
      {dialog && (
        <EnvelopeOrganizationDialog
          action={dialog.action}
          initial={dialog.rows}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
    </>
  );
}
function EnvelopeOrganizationDialog({
  action,
  initial,
  onClose,
  onSaved,
}: {
  action: Action;
  initial: ManagedEnvelope[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { data, canEdit } = useBudget();
  const command = useMoneyCommand(data?.identity.activeAccountId);
  const [rows, setRows] = useState(initial);
  const [labelOriginal, setLabelOriginal] = useState(initial[0]);
  const [name, setName] = useState(initial[0].name);
  const [notes, setNotes] = useState(initial[0].notes ?? "");
  const [confirmed, setConfirmed] = useState("");
  const [conflict, setConflict] = useState(false);
  const [missing, setMissing] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const selectionChanged =
    (action === "archive" && rows.some((c) => c.is_archived)) ||
    (action === "restore" && rows.some((c) => !c.is_archived));
  const blocked = selectionChanged
    ? "The selection changed. Close this dialog and choose the envelopes again."
    : action === "delete"
      ? deleteBlock(rows[0])
      : action === "archive" || action === "restore"
        ? rows.map(archiveBlock).find(Boolean)
        : null;
  const changed =
    action === "rename-system"
      ? name !== labelOriginal.name || notes !== (labelOriginal.notes ?? "")
      : !!confirmed;
  const monthly = rows.reduce((sum, c) => sum + c.monthly_amount, 0);
  async function latest() {
    setLoadingLatest(true);
    try {
      const fresh = await budgetRequest<ManagedEnvelope[]>(
        "/api/categories/housekeeping",
      );
      const next = rows
        .map((c) => fresh.find((n) => n.id === c.id))
        .filter((c): c is ManagedEnvelope => !!c);
      if (next.length !== rows.length) {
        setMissing(true);
        return;
      }
      if (action === "rename-system") {
        if (name === labelOriginal.name) setName(next[0].name);
        if (notes === (labelOriginal.notes ?? ""))
          setNotes(next[0].notes ?? "");
        setLabelOriginal(next[0]);
      }
      setRows(next);
      setConfirmed("");
      setConflict(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not refresh details.",
      );
    } finally {
      setLoadingLatest(false);
    }
  }
  const title =
    action === "archive"
      ? `Archive ${rows.length === 1 ? rows[0].name : `${rows.length} envelopes`}?`
      : action === "restore"
        ? `Restore ${rows.length === 1 ? rows[0].name : `${rows.length} envelopes`}?`
        : action === "delete"
          ? `Remove ${rows[0].name}?`
          : "Edit system category label";
  return (
    <SetupDialog
      title={title}
      description={
        action === "rename-system"
          ? "Change its name or notes. Its accounting behavior stays the same."
          : action === "delete"
            ? "Permanent removal is only for an unused envelope. Archiving keeps its history."
            : "Review the envelopes and the effect on your monthly plan."
      }
      dirty={changed || command.uncertain}
      allowUnchanged={
        action === "archive" || action === "restore" || command.uncertain
      }
      canEdit={canEdit}
      saveDisabled={
        conflict ||
        missing ||
        !!blocked ||
        loadingLatest ||
        (action === "delete" &&
          confirmed !== rows[0].name &&
          !command.uncertain)
      }
      destructive={action === "delete"}
      saveLabel={
        command.uncertain
          ? "Check & finish this change"
          : action === "archive"
            ? "Archive envelopes"
            : action === "restore"
              ? "Restore envelopes"
              : action === "delete"
                ? "Remove permanently"
                : "Save label"
      }
      onClose={onClose}
      onSave={async () => {
        try {
          await command.run("/api/categories/housekeeping", {
            command: {
              action,
              records: rows.map((c) => ({ id: c.id, revision: c.revision })),
              ...(action === "rename-system" ? { name, notes } : {}),
            },
          });
          toast.success(
            action === "delete"
              ? "Unused envelope removed."
              : "Envelopes updated.",
          );
          await onSaved();
        } catch (e) {
          if (e instanceof BudgetRequestError && e.code === "STALE_RECORD")
            setConflict(true);
          throw e;
        }
      }}
    >
      {command.uncertain && (
        <p className="nl-notice" role="alert">
          The outcome hasn’t been confirmed. Check the same change before
          starting another.
        </p>
      )}
      <fieldset disabled={command.uncertain} className="nl-housekeeping-fields">
        {action === "rename-system" ? (
          <>
            <p className="nl-setup-readout">
              Current label: <strong>{rows[0].name}</strong>
            </p>
            <label>
              Category name
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Notes
              <textarea
                maxLength={2000}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </>
        ) : (
          <>
            <div className="nl-housekeeping-review">
              {rows.map((c) => (
                <div key={c.id} className="nl-housekeeping-review-row">
                  <div>
                    <strong>{c.name}</strong>
                    <small>
                      {`${money(c.current_balance)} in envelope · ${money(c.monthly_amount)} / month`}
                    </small>
                    {(action === "archive" || action === "restore") &&
                      archiveBlock(c) && (
                        <small className="nl-warning">{archiveBlock(c)}</small>
                      )}
                    {(action === "archive" || action === "restore") &&
                      archiveBlock(c) && (
                        <div className="nl-housekeeping-resolution">
                          {c.linkedGoals.map((goal) => (
                            <Link
                              key={goal.id}
                              href={`/new/goals?goal=${goal.id}`}
                            >
                              Manage {goal.name} →
                            </Link>
                          ))}
                          {!c.is_goal &&
                            !c.linkedGoals.length &&
                            c.current_balance !== 0 && (
                              <Link
                                href={`/new/budget?envelope=${c.id}&tab=transfer`}
                              >
                                Move money →
                              </Link>
                            )}
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
            {action === "archive" || action === "restore" ? (
              <div className="nl-setup-preview">
                <span>Monthly funding plan</span>
                <strong>
                  {action === "archive" ? "−" : "+"}
                  {money(monthly)}
                </strong>
                <small>
                  {action === "archive"
                    ? "These funding targets leave your active plan. Their amounts and all transaction history are kept for later."
                    : "These saved funding targets return to your active plan. Restoring does not fund the envelopes."}
                </small>
              </div>
            ) : null}
            {action === "delete" && (
              <>
                <p className="nl-setup-callout">
                  {blocked ||
                    "This envelope is empty and has no history or linked records. Its name and saved funding target will be removed."}
                </p>
                {!!rows[0].usage.length && (
                  <ul>
                    {rows[0].usage.map((u, i) => (
                      <li key={i}>
                        {usageLabel(u.kind)} · {u.count}
                      </li>
                    ))}
                  </ul>
                )}
                {!blocked && (
                  <label>
                    Type “{rows[0].name}” to confirm
                    <input
                      autoComplete="off"
                      value={confirmed}
                      onChange={(e) => setConfirmed(e.target.value)}
                    />
                  </label>
                )}
              </>
            )}
            {(action === "archive" || action === "restore") && (
              <p className="nl-setup-help">
                Recorded balances and Available to save stay unchanged.
              </p>
            )}
          </>
        )}
      </fieldset>
      {selectionChanged && (
        <p className="nl-notice" role="alert">
          {blocked}
        </p>
      )}
      {missing ? (
        <p className="nl-notice" role="alert">
          An envelope was removed elsewhere. Close this dialog and select the
          remaining envelopes again.
        </p>
      ) : conflict ? (
        <div className="nl-notice" role="alert">
          <p>
            These details changed elsewhere. Your choices are kept; review the
            latest balances and links before saving.
          </p>
          <button
            type="button"
            className="nl-secondary"
            disabled={loadingLatest}
            onClick={() => void latest()}
          >
            {loadingLatest ? "Refreshing…" : "Review latest details"}
          </button>
        </div>
      ) : null}
    </SetupDialog>
  );
}

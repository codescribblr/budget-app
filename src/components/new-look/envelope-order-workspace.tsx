"use client";
import { useRef, useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  ArrowUpToLine,
  ArrowDownUp,
  Check,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { ManagedEnvelope } from "@/lib/housekeeping";
import {
  moveEnvelopes,
  rebaseEnvelopeOrder,
  sameEnvelopeOrder,
  type EnvelopePlacement,
} from "@/lib/envelope-order";
import { BudgetRequestError } from "@/lib/budget-request";
import { money } from "@/lib/new-look";
import { useBudget, useUnsavedChanges } from "./budget-context";
import { useMoneyCommand } from "./use-money-command";
import { SetupDialog } from "./setup-dialog";

type Draft = { rows: ManagedEnvelope[]; baseline: ManagedEnvelope[] };
export function EnvelopeOrderWorkspace({
  rows,
  search,
  canEdit,
  onArchive,
  reload,
  onSaved,
}: {
  rows: ManagedEnvelope[];
  search: string;
  canEdit: boolean;
  onArchive: (rows: ManagedEnvelope[]) => void;
  reload: () => Promise<ManagedEnvelope[] | null>;
  onSaved: () => Promise<void>;
}) {
  const { data } = useBudget();
  const command = useMoneyCommand(data?.identity.activeAccountId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [moving, setMoving] = useState<number[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const inFlight = useRef(false);
  const ordered = draft?.rows ?? rows;
  // Live values stay current without replacing the draft's revision snapshots.
  const current = new Map(rows.map((row) => [row.id, row]));
  const display = ordered.map((row) => current.get(row.id) ?? row);
  const shown = display.filter((row) =>
    row.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const chosen = display.filter((row) => selected.includes(row.id));
  const dirty = !!draft && !sameEnvelopeOrder(draft.rows, draft.baseline);
  const locked = !canEdit || saving || refreshing || command.uncertain;
  const allShownSelected =
    !!shown.length && shown.every((row) => selected.includes(row.id));
  useUnsavedChanges((dirty || command.uncertain) && !saving);
  function move(ids: number[], placement: EnvelopePlacement, anchor?: number) {
    const next = moveEnvelopes(ordered, ids, placement, anchor);
    setDraft(
      sameEnvelopeOrder(next, draft?.baseline ?? rows)
        ? null
        : { rows: next, baseline: draft?.baseline ?? rows },
    );
    setMoving(null);
    setError("");
    setAnnouncement(
      `${ids.length === 1 ? "Envelope moved" : `${ids.length} envelopes moved`}. Save order when you’re finished.`,
    );
  }
  async function save() {
    if (
      inFlight.current ||
      !canEdit ||
      conflict ||
      (!dirty && !command.uncertain)
    )
      return;
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      await command.run("/api/categories/housekeeping", {
        command: {
          action: "order",
          records: ordered.map((row) => ({
            id: row.id,
            revision: row.revision,
          })),
        },
      });
      // Hold the new order until the refresh arrives, so the list never snaps back.
      setDraft({ rows: ordered, baseline: ordered });
      setSelected([]);
      await onSaved();
      setDraft(null);
      setAnnouncement("Envelope order saved.");
      toast.success("Envelope order saved.");
    } catch (e) {
      if (e instanceof BudgetRequestError && e.code === "STALE_RECORD")
        setConflict(true);
      setError(
        e instanceof Error
          ? e.message
          : "Could not save the order. Your changes are still here.",
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  async function reviewLatest() {
    setRefreshing(true);
    const fresh = await reload();
    if (fresh) {
      const active = fresh.filter(
        (row) => !row.is_system && !row.is_buffer && !row.is_archived,
      );
      const next = rebaseEnvelopeOrder(ordered, active);
      setDraft(
        sameEnvelopeOrder(next, active)
          ? null
          : { rows: next, baseline: active },
      );
      setSelected((ids) =>
        ids.filter((id) => active.some((row) => row.id === id)),
      );
      setConflict(false);
      setError("");
      setAnnouncement(
        "Latest details loaded. Review your order before saving. Newly added envelopes appear last; removed or archived envelopes are no longer included.",
      );
    }
    setRefreshing(false);
  }
  return (
    <>
      <div className="nl-order-toolbar">
        <div className="nl-order-selection">
          <button
            className="nl-housekeeping-check"
            aria-label={
              allShownSelected
                ? "Deselect visible envelopes"
                : "Select visible envelopes"
            }
            aria-pressed={allShownSelected}
            disabled={locked || !shown.length}
            onClick={() =>
              setSelected((ids) =>
                allShownSelected
                  ? ids.filter((id) => !shown.some((row) => row.id === id))
                  : [...new Set([...ids, ...shown.map((row) => row.id)])],
              )
            }
          >
            {allShownSelected && <Check size={15} />}
          </button>
          <span aria-live="polite">
            {chosen.length
              ? `${chosen.length} selected`
              : `${display.length} envelopes`}
          </span>
          {!!chosen.length && (
            <button
              className="nl-order-clear"
              disabled={locked}
              onClick={() => setSelected([])}
            >
              Clear
            </button>
          )}
        </div>
        <div className="nl-order-actions">
          <button
            className="nl-secondary"
            disabled={
              locked || !chosen.length || chosen.length === ordered.length
            }
            onClick={() => setMoving(chosen.map((row) => row.id))}
          >
            <ArrowDownUp size={15} /> Move
            {chosen.length > 1 ? ` ${chosen.length}` : ""}
          </button>
          <button
            className="nl-secondary"
            disabled={locked || !chosen.length || dirty}
            title={
              dirty ? "Save or reset the order before archiving" : undefined
            }
            onClick={() => onArchive(chosen)}
          >
            <Archive size={15} /> Archive
          </button>
        </div>
        <div className="nl-order-save">
          {(dirty || command.uncertain) && (
            <button
              className="nl-order-clear"
              disabled={locked}
              onClick={() => {
                setDraft(null);
                setConflict(false);
                setError("");
                setAnnouncement("Order reset.");
              }}
            >
              Reset
            </button>
          )}
          <button
            className="nl-primary"
            disabled={
              !canEdit ||
              saving ||
              refreshing ||
              conflict ||
              (!dirty && !command.uncertain)
            }
            onClick={() => void save()}
          >
            {saving
              ? "Saving…"
              : command.uncertain
                ? "Check saved order"
                : "Save order"}
          </button>
        </div>
      </div>
      {command.uncertain ? (
        <p className="nl-notice" role="alert">
          The save hasn’t been confirmed. Check the saved order before making
          another change.
        </p>
      ) : conflict ? (
        <div className="nl-notice" role="alert">
          <p>
            Envelopes changed on another device. Your order is kept. Load the
            latest details, then review it before saving.
          </p>
          <button
            className="nl-secondary"
            disabled={refreshing}
            onClick={() => void reviewLatest()}
          >
            {refreshing ? "Refreshing…" : "Review latest details"}
          </button>
        </div>
      ) : error ? (
        <p className="nl-notice" role="alert">
          {error}
        </p>
      ) : null}
      <p className="nl-order-guidance" role="status">
        {announcement ||
          (chosen.length
            ? "Choose Move to place these envelopes together, or Archive to review what can be put away."
            : "Select envelopes to move them together, or use the move button on any row.")}
      </p>
      <div
        className="nl-housekeeping-list nl-order-list"
        aria-label="Envelope order"
      >
        {shown.map((row) => (
          <div
            key={row.id}
            className="nl-order-row"
            data-selected={selected.includes(row.id)}
          >
            <button
              className="nl-order-row-select"
              aria-label={`Select ${row.name}`}
              aria-pressed={selected.includes(row.id)}
              disabled={locked}
              onClick={() =>
                setSelected((ids) =>
                  ids.includes(row.id)
                    ? ids.filter((id) => id !== row.id)
                    : [...ids, row.id],
                )
              }
            >
              <span className="nl-housekeeping-check" aria-hidden="true">
                {selected.includes(row.id) && <Check size={15} />}
              </span>
              <span className="nl-order-position">
                {ordered.findIndex((item) => item.id === row.id) + 1}
              </span>
              <span className="nl-order-name">
                <strong>{row.name}</strong>
                <small>
                  {money(row.monthly_amount)} / month
                  {row.is_goal ? " · Goal" : ""}
                </small>
              </span>
              <span className="nl-order-balance">
                <strong>{money(row.current_balance)}</strong>
                <small>in envelope</small>
              </span>
            </button>
            <button
              className="nl-icon-button nl-order-move"
              disabled={locked || ordered.length < 2}
              aria-label={`Move ${row.name}`}
              title={`Move ${row.name}`}
              onClick={() => setMoving([row.id])}
            >
              <ArrowDownUp size={17} />
            </button>
          </div>
        ))}
        {!shown.length && (
          <div className="nl-setup-empty">
            <h3>{search ? "No matching envelopes" : "No active envelopes"}</h3>
            <p>
              {search
                ? "Try another name. Your selection is kept."
                : "Your envelopes will appear here when they’re available."}
            </p>
          </div>
        )}
      </div>
      {moving && (
        <EnvelopeMoveDialog
          rows={display}
          selected={moving}
          canEdit={!locked}
          onClose={() => setMoving(null)}
          onMove={move}
        />
      )}
    </>
  );
}

function EnvelopeMoveDialog({
  rows,
  selected,
  canEdit,
  onClose,
  onMove,
}: {
  rows: ManagedEnvelope[];
  selected: number[];
  canEdit: boolean;
  onClose: () => void;
  onMove: (
    ids: number[],
    placement: EnvelopePlacement,
    anchor?: number,
  ) => void;
}) {
  const [search, setSearch] = useState("");
  const [placement, setPlacement] = useState<"before" | "after">("before");
  const [anchor, setAnchor] = useState<number | null>(null);
  const chosen = rows.filter((row) => selected.includes(row.id));
  const targets = rows.filter((row) => !selected.includes(row.id));
  const shown = targets.filter((row) =>
    row.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const destination = targets.find((row) => row.id === anchor);
  return (
    <SetupDialog
      title={
        chosen.length === 1
          ? `Move ${chosen[0].name}`
          : `Move ${chosen.length} envelopes`
      }
      description="Choose a place in your envelope list. Save the order on the page when you’re finished."
      dirty={false}
      allowUnchanged
      canEdit={canEdit}
      saveDisabled={!destination}
      saveLabel="Move here"
      onClose={onClose}
      onSave={async () => {
        if (destination) onMove(selected, placement, destination.id);
      }}
    >
      {chosen.length > 1 && (
        <p className="nl-move-selection">
          {chosen.map((row) => row.name).join(" · ")}
        </p>
      )}
      <div className="nl-move-shortcuts">
        <button
          type="button"
          className="nl-secondary"
          onClick={() => onMove(selected, "top")}
        >
          <ArrowUpToLine size={16} /> Move to top
        </button>
        <button
          type="button"
          className="nl-secondary"
          onClick={() => onMove(selected, "bottom")}
        >
          <ArrowDownToLine size={16} /> Move to bottom
        </button>
      </div>
      <div className="nl-move-relative">
        <span>Or place</span>
        <div className="nl-filters" aria-label="Placement">
          <button
            type="button"
            className={placement === "before" ? "active" : ""}
            aria-pressed={placement === "before"}
            onClick={() => setPlacement("before")}
          >
            Before
          </button>
          <button
            type="button"
            className={placement === "after" ? "active" : ""}
            aria-pressed={placement === "after"}
            onClick={() => setPlacement("after")}
          >
            After
          </button>
        </div>
      </div>
      <label className="nl-move-search">
        <Search size={16} aria-hidden="true" />
        <input
          aria-label="Find destination envelope"
          placeholder="Find destination envelope…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="nl-move-destinations" aria-label="Destination envelopes">
        {shown.map((row) => (
          <button
            key={row.id}
            type="button"
            aria-pressed={anchor === row.id}
            onClick={() => setAnchor(row.id)}
          >
            <span className="nl-order-position">
              {rows.findIndex((item) => item.id === row.id) + 1}
            </span>
            <span>{row.name}</span>
            <Check
              size={16}
              aria-hidden="true"
              className={anchor === row.id ? "" : "invisible"}
            />
          </button>
        ))}
        {!shown.length && (
          <p className="nl-footnote">
            No matching envelopes. Try another name.
          </p>
        )}
      </div>
      <p className="nl-move-preview" role="status">
        {destination ? (
          <>
            Move{" "}
            {chosen.length === 1
              ? chosen[0].name
              : `${chosen.length} envelopes`}{" "}
            {placement} <strong>{destination.name}</strong>.
          </>
        ) : (
          "Choose a destination above."
        )}
      </p>
    </SetupDialog>
  );
}

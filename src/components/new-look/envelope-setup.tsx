"use client";
import { NativeSelect } from "./native-select";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore, Mail, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFeatures } from "@/contexts/FeatureContext";
import type { Category } from "@/lib/types";
import { money, cents, ordinaryEnvelopes } from "@/lib/new-look";
import { envelopeReviewHref } from "@/lib/envelope-navigation";
import {
  envelopeArchiveBlock,
  envelopePurposeLabel,
  envelopePurposes,
  prepareEnvelopeSetup,
  setupReturnTarget,
  type EnvelopeSetupDraft,
  type EnvelopePurpose,
} from "@/lib/budget-setup";
import { budgetRequest, DataBoundary, useBudget } from "./budget-context";
import { PageHeading, ReadOnlyNotice } from "./common";
import { SetupDialog } from "./setup-dialog";

export function GuidedEnvelopeSetup() {
  return (
    <DataBoundary>
      <EnvelopeSetupContent />
    </DataBoundary>
  );
}
function EnvelopeSetupContent() {
  const { data, canEdit, refresh } = useBudget();
  const {
    hasPremium,
    isFeatureEnabled,
    loading: featuresLoading,
    error: featureError,
  } = useFeatures();
  const advanced = hasPremium && isFeatureEnabled("category_types");
  const priorityEnabled = hasPremium && isFeatureEnabled("priority_system");
  const router = useRouter();
  const params = useSearchParams();
  const back = setupReturnTarget("envelopes", params.get("from"));
  const [archived, setArchived] = useState<Category[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [archiveError, setArchiveError] = useState("");
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null);
  const request = useRef(0);
  const loadArchived = useCallback(async () => {
    const id = ++request.current;
    setArchiveLoading(true);
    setArchiveError("");
    try {
      const result = await budgetRequest<Category[]>(
        "/api/categories?includeArchived=only",
      );
      if (id === request.current)
        setArchived(result.filter((c) => !c.is_buffer && !c.is_system));
    } catch (err) {
      if (id === request.current)
        setArchiveError(
          err instanceof Error
            ? err.message
            : "Could not load archived envelopes.",
        );
    } finally {
      if (id === request.current) setArchiveLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadArchived();
    return () => {
      request.current++;
    };
  }, [loadArchived, data?.identity.activeAccountId]);
  if (!data) return null;
  const active = ordinaryEnvelopes(data.categories);
  const all = [...active, ...archived];
  const editParam = params.get("edit");
  const editing =
    editParam === "new" ? null : all.find((c) => String(c.id) === editParam);
  const editable = canEdit && !featuresLoading && !featureError;
  const shown = (filter === "archived" ? archived : active).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );
  const monthlyTotal = active.reduce((sum, c) => sum + c.monthly_amount, 0);
  function openEditor(value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete("edit");
    else next.set("edit", value);
    router.replace(`/new/budget/manage${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  }
  async function refreshAfterWrite() {
    await Promise.all([
      refresh().catch(() => {
        toast.error(
          "Saved, but your budget could not refresh. Reload before making more changes.",
        );
      }),
      loadArchived(),
    ]);
  }
  return (
    <>
      <PageHeading
        eyebrow="Envelopes · setup"
        title="Give each envelope a clear purpose"
        description="Choose what you’re setting money aside for, shape the funding plan, and retire envelopes you no longer use."
      >
        <div className="nl-checkin-actions">
          <Link href={back.href} className="nl-secondary">
            {back.label}
          </Link>
          <button
            className="nl-primary"
            disabled={!editable}
            onClick={() => openEditor("new")}
          >
            <Plus size={16} aria-hidden="true" />
            Add envelope
          </button>
        </div>
      </PageHeading>
      <ReadOnlyNotice />
      <div className="nl-setup-intro">
        <Mail size={20} aria-hidden="true" />
        <p>
          <strong>A funding target is a plan for future money.</strong>
          <br />
          New envelopes start at $0. Add money from Allocate paycheck, or move
          existing money during your envelope review.
        </p>
      </div>
      {featureError && (
        <p className="nl-notice" role="alert">
          Planning settings couldn’t load. Refresh this page before editing an
          envelope.
        </p>
      )}
      <div className="nl-toolbar">
        <div className="nl-filters">
          <button
            className={filter === "active" ? "active" : ""}
            aria-pressed={filter === "active"}
            onClick={() => setFilter("active")}
          >
            Active <span className="nl-muted">{active.length}</span>
          </button>
          <button
            className={filter === "archived" ? "active" : ""}
            aria-pressed={filter === "archived"}
            onClick={() => setFilter("archived")}
          >
            Archived{" "}
            <span className="nl-muted">
              {archiveLoading || archiveError ? "—" : archived.length}
            </span>
          </button>
        </div>
        <input
          aria-label="Search envelope setup"
          value={search}
          placeholder="Find an envelope…"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {filter === "archived" && archiveError ? (
        <div className="nl-panel" role="alert">
          <p>{archiveError}</p>
          <button className="nl-secondary" onClick={() => void loadArchived()}>
            Try again
          </button>
        </div>
      ) : filter === "archived" && archiveLoading ? (
        <p role="status">Loading archived envelopes…</p>
      ) : (
        <div className="nl-setup-list">
          {shown.map((category) => (
            <article key={category.id} className="nl-setup-row">
              <div>
                <h3>{category.name}</h3>
                <p>
                  {envelopePurposeLabel(category)}
                  {category.is_archived ? " · Archived" : ""}
                </p>
                {category.category_type === "target_balance" && (
                  <span className="nl-subtext">
                    Balance target {money(category.target_balance || 0)}
                  </span>
                )}
                {category.category_type === "accumulation" && (
                  <span className="nl-subtext">
                    {money(
                      category.annual_target ?? category.monthly_amount * 12,
                    )}{" "}
                    per year
                  </span>
                )}
              </div>
              <div className="nl-setup-amount">
                <strong>
                  {money(category.monthly_amount)}
                  <small> / month</small>
                </strong>
                <span>Balance {money(category.current_balance)}</span>
              </div>
              <div className="nl-setup-row-actions">
                {category.is_goal ? (
                  <Link className="nl-secondary" href={`/new/goals?category=${category.id}`}>
                    Manage linked goal →
                  </Link>
                ) : (
                  <>
                    <button
                      className="nl-secondary"
                      disabled={
                        !editable ||
                        (filter === "archived" &&
                          (!!archiveError || archiveLoading))
                      }
                      aria-label={`Edit ${category.name}`}
                      onClick={() => openEditor(String(category.id))}
                    >
                      <Pencil size={15} aria-hidden="true" />
                      Edit plan
                    </button>
                    <button
                      className="nl-icon-button"
                      disabled={
                        !editable ||
                        (filter === "archived" &&
                          (!!archiveError || archiveLoading))
                      }
                      aria-label={`${category.is_archived ? "Restore" : "Archive"} ${category.name}`}
                      title={
                        category.is_archived
                          ? "Restore envelope"
                          : "Archive envelope"
                      }
                      onClick={() => setArchiveTarget(category)}
                    >
                      {category.is_archived ? (
                        <ArchiveRestore size={18} />
                      ) : (
                        <Archive size={18} />
                      )}
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
          {!shown.length && (
            <div className="nl-setup-empty">
              <h3>
                {search
                  ? "No matching envelopes"
                  : filter === "archived"
                    ? "Nothing archived"
                    : "Start with the things you spend on"}
              </h3>
              <p>
                {search
                  ? "Try a different name."
                  : filter === "archived"
                    ? "When an envelope is no longer useful, archive it here. Its transaction history stays available."
                    : "Try groceries, housing, and transportation. Add more as your plan takes shape."}
              </p>
              {!search && filter === "active" && (
                <button
                  className="nl-primary"
                  disabled={!editable}
                  onClick={() => openEditor("new")}
                >
                  Add your first envelope
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <p className="nl-footnote">
        For a quick pass over all funding amounts, use{" "}
        <Link href="/new/plan">Monthly plan →</Link>. Goal-linked envelopes,
        system categories, ordering, and permanent removal still use{" "}
        <Link href="/categories">classic category tools ↗</Link>.
      </p>
      {editParam && editing === undefined && !archiveLoading && (
        <p role="alert" className="nl-notice">
          That envelope is unavailable.{" "}
          <button className="nl-secondary" onClick={() => openEditor(null)}>
            Dismiss
          </button>
        </p>
      )}
      {editParam && editing !== undefined && !editing?.is_goal && (
        <EnvelopeSetupEditor
          key={editParam}
          category={editing}
          advanced={advanced}
          priorityEnabled={priorityEnabled}
          canEdit={!!editable}
          monthlyTotal={monthlyTotal}
          netIncome={data.summary.monthly_net_income}
          onClose={() => openEditor(null)}
          onSave={async (payload) => {
            await budgetRequest(
              editing ? `/api/categories/${editing.id}` : "/api/categories",
              payload,
              editing ? "PATCH" : "POST",
            );
            toast.success(
              editing
                ? "Envelope plan saved. No money was moved."
                : "Envelope created. Ready to fund when you are.",
            );
            await refreshAfterWrite();
          }}
        />
      )}
      {archiveTarget && (
        <ArchiveEnvelopeDialog
          category={archiveTarget}
          canEdit={!!editable}
          onClose={() => setArchiveTarget(null)}
          onSave={async () => {
            // Recheck the current balance rather than hiding money after another update.
            const latest = await budgetRequest<Category>(
              `/api/categories/${archiveTarget.id}`,
            );
            const block = envelopeArchiveBlock(latest);
            if (block) throw new Error(block);
            await budgetRequest(
              "/api/categories/bulk-archive",
              {
                categoryIds: [latest.id],
                is_archived: !archiveTarget.is_archived,
              },
              "PATCH",
            );
            toast.success(
              archiveTarget.is_archived
                ? "Envelope restored."
                : "Envelope archived. Its history is preserved.",
            );
            await refreshAfterWrite();
          }}
        />
      )}
    </>
  );
}

export function EnvelopeSetupEditor({
  category,
  advanced,
  priorityEnabled,
  canEdit,
  monthlyTotal,
  netIncome,
  onSave,
  onClose,
}: {
  category: Category | null;
  advanced: boolean;
  priorityEnabled: boolean;
  canEdit: boolean;
  monthlyTotal: number;
  netIncome: number;
  onSave: (payload: ReturnType<typeof prepareEnvelopeSetup>) => Promise<void>;
  onClose: () => void;
}) {
  const [initial] = useState<EnvelopeSetupDraft>(() => ({
    name: category?.name || "",
    purpose: category?.category_type || "monthly_expense",
    monthly: category ? String(category.monthly_amount) : "",
    annual: category
      ? (category.annual_target ?? category.monthly_amount * 12).toFixed(2)
      : "",
    target: category ? String(category.target_balance ?? 0) : "",
    priority: category?.priority ?? 5,
    notes: category?.notes || "",
  }));
  const [draft, setDraft] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const change = <K extends keyof EnvelopeSetupDraft>(
    key: K,
    value: EnvelopeSetupDraft[K],
  ) => setDraft((old) => ({ ...old, [key]: value }));
  const lockedPlan =
    !advanced &&
    category?.category_type &&
    category.category_type !== "monthly_expense";
  const purpose = advanced || lockedPlan ? draft.purpose : "monthly_expense";
  let preview: ReturnType<typeof prepareEnvelopeSetup> | null = null;
  try {
    preview = prepareEnvelopeSetup(draft, category, advanced, priorityEnabled);
  } catch {
    /* Show errors only on submit. */
  }
  const monthly = preview
    ? (preview.monthly_amount ?? category?.monthly_amount ?? 0)
    : null;
  const nextTotal =
    monthly === null
      ? null
      : category?.is_archived
        ? monthlyTotal
        : monthlyTotal - (category?.monthly_amount || 0) + monthly;
  return (
    <SetupDialog
      title={
        category ? `Plan for ${category.name}` : "Give your money a new job"
      }
      description="Set the purpose and funding target. Saving this plan won’t change any envelope balances."
      dirty={dirty}
      canEdit={canEdit}
      saveLabel={category ? "Save envelope plan" : "Create envelope"}
      onClose={onClose}
      onSave={() =>
        onSave(prepareEnvelopeSetup(draft, category, advanced, priorityEnabled))
      }
    >
      <label>
        Envelope name
        <input
          autoFocus
          maxLength={100}
          value={draft.name}
          onChange={(e) => change("name", e.target.value)}
          placeholder="e.g., Groceries, car insurance, emergency reserve"
        />
      </label>
      {advanced && (
        <fieldset className="nl-purpose-picker">
          <legend>What is this money for?</legend>
          {envelopePurposes.map((option) => (
            <label
              key={option.value}
              className="nl-purpose-option"
              data-selected={draft.purpose === option.value}
            >
              <input
                type="radio"
                name="envelope-purpose"
                value={option.value}
                checked={draft.purpose === option.value}
                onChange={() =>
                  change("purpose", option.value as EnvelopePurpose)
                }
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {lockedPlan ? (
        <p className="nl-notice">
          This envelope uses {envelopePurposeLabel(category).toLowerCase()}. Its
          existing targets will be kept. Enable category types in settings to
          change its plan.
        </p>
      ) : (
        <div className="nl-setup-field-grid">
          {purpose === "target_balance" && (
            <label>
              Balance to build toward
              <input
                inputMode="decimal"
                value={draft.target}
                placeholder="0.00"
                onChange={(e) => change("target", e.target.value)}
              />
              <small>The amount you want to keep in reserve.</small>
            </label>
          )}
          {purpose === "accumulation" ? (
            <label>
              Amount needed per year
              <input
                inputMode="decimal"
                value={draft.annual}
                placeholder="0.00"
                onChange={(e) => change("annual", e.target.value)}
              />
              <small>We divide this by 12 to plan monthly funding.</small>
            </label>
          ) : (
            <label>
              {purpose === "target_balance"
                ? "Planned monthly contribution"
                : "Monthly funding target"}
              <input
                inputMode="decimal"
                value={draft.monthly}
                placeholder="0.00"
                onChange={(e) => change("monthly", e.target.value)}
              />
              <small>
                {purpose === "target_balance"
                  ? "Use $0 if you prefer to add money as it becomes available."
                  : "How much you want to set aside each month."}
              </small>
            </label>
          )}
          {purpose === "accumulation" && (
            <div className="nl-setup-readout">
              <span>Monthly equivalent</span>
              <strong>{monthly === null ? "—" : money(monthly)}</strong>
              <small>Balances can build up between expenses.</small>
            </div>
          )}
        </div>
      )}
      <details className="nl-setup-details">
        <summary>
          Notes{priorityEnabled ? " & funding priority" : ""}{" "}
          <span>· Optional</span>
        </summary>
        <div className="nl-form">
          <label>
            Notes
            <textarea
              rows={3}
              maxLength={5000}
              value={draft.notes}
              onChange={(e) => change("notes", e.target.value)}
              placeholder="What this covers, how you estimated the target, or a reminder for next month."
            />
          </label>
          {priorityEnabled && (
            <label>
              Funding priority
              <NativeSelect
                value={draft.priority}
                onChange={(e) => change("priority", Number(e.target.value))}
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                    {i === 0 ? " · Highest" : i === 9 ? " · Lowest" : ""}
                  </option>
                ))}
              </NativeSelect>
              <small>
                Used by Smart Allocation in classic. A lower number is funded
                first.
              </small>
            </label>
          )}
        </div>
      </details>
      <div className="nl-setup-preview" aria-live="polite">
        <span>
          {category?.is_archived
            ? "Monthly plan while archived"
            : "Your monthly plan after saving"}
        </span>
        <strong>{nextTotal === null ? "—" : money(nextTotal)}</strong>
        <small>
          {category?.is_archived
            ? "This envelope won’t be included until you restore it."
            : nextTotal !== null && cents(nextTotal) > cents(netIncome)
              ? `${money(nextTotal - netIncome)} above your planned net income. You can adjust the rest of your monthly plan.`
              : nextTotal !== null
                ? `${money(netIncome - nextTotal)} of planned net income remains unassigned.`
                : "Complete the target to see how it fits your income."}
        </small>
      </div>
    </SetupDialog>
  );
}

function ArchiveEnvelopeDialog({
  category,
  canEdit,
  onClose,
  onSave,
}: {
  category: Category;
  canEdit: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const block = envelopeArchiveBlock(category);
  async function save() {
    if (busy.current || !canEdit || block) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await onSave();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update this envelope.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy.current) onClose();
      }}
    >
      <DialogContent className="new-look">
        <DialogHeader>
          <DialogTitle>
            {category.is_archived ? "Restore" : "Archive"} {category.name}?
          </DialogTitle>
          <DialogDescription>
            {category.is_archived
              ? "Bring this envelope and its funding target back into your active budget. Its balance and history will stay the same."
              : "Remove it from your active plan and envelope review. Its transaction history is kept, and you can restore it later."}
          </DialogDescription>
        </DialogHeader>
        {block && <p className="nl-notice">{block}</p>}
        {error && (
          <p role="alert" className="nl-error">
            {error}
          </p>
        )}
        <div className="nl-form-actions">
          <button className="nl-secondary" disabled={saving} onClick={onClose}>
            Cancel
          </button>
          {block && !category.is_archived ? (
            <Link
              className="nl-primary"
              href={envelopeReviewHref(category.id, "transfer")}
            >
              Review balance →
            </Link>
          ) : (
            <button
              className="nl-primary"
              disabled={!!block || saving || !canEdit}
              onClick={() => void save()}
            >
              {saving
                ? "Saving…"
                : category.is_archived
                  ? "Restore envelope"
                  : "Archive envelope"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

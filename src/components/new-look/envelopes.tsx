"use client";
import { useTaskCheckin } from "./checkin-flow";
import { useState } from "react";
import {
  envelopeProgress,
  type EnvelopeProgress,
} from "@/lib/envelope-overview";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import * as Tabs from "@radix-ui/react-tabs";
import { EnvelopeActivity } from "./envelope-activity";
import {
  envelopeReviewHref,
  envelopeReviewTarget,
  type EnvelopeTab,
} from "@/lib/envelope-navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Category } from "@/lib/types";
import { money, parseMoney, ordinaryEnvelopes, cents } from "@/lib/new-look";
import { budgetRequest, useBudget, DataBoundary } from "./budget-context";
import {
  PageHeading,
  TaskReturn,
  ReadOnlyNotice,
  CheckinFooter,
} from "./common";

export function GuidedEnvelopes() {
  return (
    <DataBoundary>
      <EnvelopesContent />
    </DataBoundary>
  );
}
function EnvelopesContent() {
  const checkin = useTaskCheckin("budget");
  const { data } = useBudget();
  const router = useRouter();
  const params = useSearchParams();
  const { categoryId: selected, tab } = envelopeReviewTarget(params);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("envelope");
  if (!data) return null;
  const envelopes = ordinaryEnvelopes(data.categories);
  const rows = envelopes.map((category) => ({
    category,
    progress: envelopeProgress(
      category,
      data.spending[category.id] || 0,
      data.funding.categories.find((f) => f.categoryId === category.id)
        ?.fundedAmount || 0,
    ),
  }));
  const counts = {
    all: rows.length,
    negative: rows.filter((r) => r.progress.negative).length,
    spending: rows.filter((r) => r.progress.overPlan).length,
    surplus: rows.filter((r) => r.progress.surplus > 0).length,
  };
  const shown = rows
    .filter(
      ({ category: c, progress }) =>
        c.name.toLowerCase().includes(search.trim().toLowerCase()) &&
        (filter === "negative"
          ? progress.negative
          : filter === "spending"
            ? progress.overPlan
            : filter === "surplus"
              ? progress.surplus > 0
              : true),
    )
    .sort(
      (a, b) =>
        (sort === "attention"
          ? a.progress.attention - b.progress.attention
          : sort === "name"
            ? a.category.name.localeCompare(b.category.name)
            : 0) ||
        a.category.sort_order - b.category.sort_order ||
        a.category.id - b.category.id,
    );
  const available =
    envelopes.reduce((total, c) => total + cents(c.current_balance), 0) / 100;
  const toCover =
    envelopes.reduce(
      (total, c) => total + Math.max(0, -cents(c.current_balance)),
      0,
    ) / 100;
  const month = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const category = envelopes.find((c) => c.id === selected);
  return (
    <>
      <TaskReturn task="budget" cadence="daily" />
      <PageHeading
        eyebrow={
          checkin === "weekly"
            ? "Weekly · rebalance for the week ahead"
            : checkin
              ? "Daily · check before spending"
              : "Envelopes · your spending money"
        }
        title="Every envelope, in perspective"
        description="See how this month is going, what’s available, and where your money may need a second look."
      >
        <Link
          href={
            checkin
              ? `/new/budget/manage?from=${checkin}`
              : "/new/budget/manage"
          }
          className="nl-secondary"
        >
          Set up envelopes →
        </Link>
      </PageHeading>
      <ReadOnlyNotice />
      <section className="nl-envelope-overview" aria-label="Envelope overview">
        <div>
          <h2>{month}</h2>
          <p>Monthly spending, funding, and reserve balances.</p>
        </div>
        <dl>
          <div>
            <dt>Available in envelopes</dt>
            <dd className={available < 0 ? "nl-negative" : ""}>
              {money(available)}
            </dd>
          </div>
          <div>
            <dt>Negative balances to cover</dt>
            <dd className={toCover > 0 ? "nl-negative" : ""}>
              {money(toCover)}
            </dd>
          </div>
        </dl>
      </section>
      <div className="nl-toolbar">
        <div className="nl-filters">
          {(
            [
              ["all", "All envelopes"],
              ["negative", "Negative balances"],
              ["spending", "Spending over plan"],
              ["surplus", "Potential surplus"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? "active" : ""}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label} <span className="nl-muted">{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="nl-envelope-controls">
          <input
            aria-label="Search envelopes"
            placeholder="Find an envelope…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Sort envelopes"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="envelope">Envelope order</option>
            <option value="attention">Needs attention first</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>
      </div>
      {filter === "surplus" && (
        <p className="nl-notice">
          These monthly expense envelopes have more than one month’s plan
          available. That may be intentional. Goal, accumulation,
          target-balance, and buffer funds are excluded from this suggestion.
        </p>
      )}
      {shown.length > 0 && (
        <div className="nl-envelope-list">
          <div className="nl-envelope-list-heading" aria-hidden="true">
            <span>Envelope</span>
            <span>Progress</span>
            <span>Available now</span>
            <span />
          </div>
          <ul aria-label="Envelopes and progress">
            {shown.map(({ category: c, progress }) => (
              <li
                key={c.id}
                className="nl-envelope-row"
                data-attention={progress.negative}
              >
                <div className="nl-envelope-name">
                  <Link
                    className="nl-row-button"
                    href={envelopeReviewHref(
                      c.id,
                      "activity",
                      params.toString(),
                    )}
                    scroll={false}
                  >
                    {c.name}
                  </Link>
                  <span>{progress.typeLabel}</span>
                </div>
                <EnvelopeProgressBar name={c.name} progress={progress} />
                <div className="nl-envelope-balance">
                  <span className="nl-envelope-mobile-label" aria-hidden="true">
                    Available now
                  </span>
                  <span className="sr-only">Available now: </span>
                  <strong className={progress.negative ? "nl-negative" : ""}>
                    {money(c.current_balance)}
                  </strong>
                  {progress.balanceNote && (
                    <span className={progress.negative ? "nl-negative" : ""}>
                      {progress.balanceNote}
                    </span>
                  )}
                </div>
                <div className="nl-envelope-actions">
                  <Link
                    className="nl-secondary"
                    aria-label={`Review ${c.name}`}
                    href={envelopeReviewHref(
                      c.id,
                      "activity",
                      params.toString(),
                    )}
                    scroll={false}
                  >
                    Review →
                  </Link>
                  <Link
                    className="nl-activity-link"
                    aria-label={`Move money for ${c.name}`}
                    href={envelopeReviewHref(
                      c.id,
                      "transfer",
                      params.toString(),
                    )}
                    scroll={false}
                  >
                    Move money
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!shown.length && (
        <div className="nl-panel">
          {envelopes.length ? (
            "No envelopes match this view. Try All envelopes or clear your search."
          ) : (
            <>
              No envelopes yet.{" "}
              <Link
                href={`/new/budget/manage?edit=new${checkin ? `&from=${checkin}` : ""}`}
              >
                Create your first envelope →
              </Link>
            </>
          )}
        </div>
      )}
      <p className="nl-footnote">
        Spending is based on recorded transactions minus refunds; import your
        latest transactions to keep it current. Left in plan is not your
        available balance: available money includes carryover, transfers, and
        adjustments. Savings and goal bars show monthly funding, except
        reserves, which show their balance target. Goal completion is tracked on
        the Goals page. Buffer money is shown there separately.
      </p>
      <CheckinFooter
        task="budget"
        cadence="daily"
        title="Envelopes reviewed?"
        description="Cover any overages you choose to, and check for money that could be more useful elsewhere. You can finish without moving money."
        disabled={!!category}
      />
      {category && (
        <EnvelopeEditor
          key={`${data.identity.activeAccountId}:${category.id}`}
          category={category}
          mode={tab}
          onTabChange={(nextTab) =>
            router.replace(
              envelopeReviewHref(category.id, nextTab, params.toString()),
              { scroll: false },
            )
          }
          onClose={() =>
            router.replace(
              envelopeReviewHref(null, "activity", params.toString()),
              { scroll: false },
            )
          }
        />
      )}
    </>
  );
}

function EnvelopeProgressBar({
  name,
  progress: p,
}: {
  name: string;
  progress: EnvelopeProgress;
}) {
  const amount = p.kind === "spending" && p.amount < 0 ? -p.amount : p.amount;
  return (
    <div className="nl-envelope-progress" data-tone={p.tone}>
      <div className="nl-envelope-progress-heading">
        <span>{p.label}</span>
        <strong>
          {money(amount)}
          {p.target > 0 && (
            <>
              {" "}
              <span>
                {p.kind === "spending" && p.amount < 0 ? "· plan" : "of"}{" "}
                {money(p.target)}
              </span>
            </>
          )}
        </strong>
      </div>
      {p.percent === null ? (
        <div
          className="nl-envelope-meter nl-envelope-meter-empty"
          aria-hidden="true"
        />
      ) : (
        <div
          className="nl-envelope-meter"
          role="progressbar"
          aria-label={`${name}: ${p.label.toLowerCase()}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p.percent)}
          aria-valuetext={`${money(amount)} of ${money(p.target)}. ${p.detail}`}
        >
          <span style={{ width: `${p.percent}%` }} />
        </div>
      )}
      <div className="nl-envelope-progress-caption">
        <span className="nl-envelope-progress-detail">{p.detail}</span>
        <span className="nl-envelope-progress-secondary">{p.secondary}</span>
      </div>
    </div>
  );
}

export function EnvelopeEditor({
  category,
  mode,
  onTabChange,
  onClose,
}: {
  category: Category;
  mode: EnvelopeTab;
  onTabChange: (tab: EnvelopeTab) => void;
  onClose: () => void;
}) {
  const { data, canEdit, refresh } = useBudget();
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [other, setOther] = useState("");
  const [amount, setAmount] = useState(
    category.current_balance < 0
      ? Math.abs(category.current_balance).toFixed(2)
      : "",
  );
  const [balance, setBalance] = useState(
    Number(category.current_balance).toFixed(2),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!data) return null;
  const others = ordinaryEnvelopes(data.categories).filter(
    (c) => c.id !== category.id,
  );
  const counterpart = others.find((c) => String(c.id) === other);
  const transferAmount = parseMoney(amount);
  const newBalance = parseMoney(balance);
  const source = direction === "in" ? counterpart : category;
  const target = direction === "in" ? category : counterpart;
  const validTransfer = Boolean(
    source &&
    target &&
    transferAmount !== null &&
    transferAmount > 0 &&
    cents(transferAmount) <= cents(source.current_balance),
  );
  const valid =
    mode === "activity"
      ? false
      : mode === "transfer"
        ? validTransfer
        : newBalance !== null && newBalance !== category.current_balance;
  const after =
    mode === "adjust"
      ? newBalance
      : transferAmount === null
        ? null
        : (cents(category.current_balance) +
            (direction === "in"
              ? cents(transferAmount)
              : -cents(transferAmount))) /
          100;
  const availableAfter =
    mode === "adjust" && newBalance !== null
      ? (cents(data.summary.current_savings) +
          cents(category.current_balance) -
          cents(newBalance)) /
        100
      : data.summary.current_savings;
  async function save() {
    if (saving || !canEdit || !valid) return;
    setSaving(true);
    setError("");
    let succeeded = false;
    try {
      if (mode === "transfer")
        await budgetRequest("/api/transfers/envelopes", {
          fromCategoryId: source!.id,
          toCategoryId: target!.id,
          amount: transferAmount,
        });
      else
        await budgetRequest(
          `/api/categories/${category.id}`,
          { current_balance: newBalance },
          "PATCH",
        );
      succeeded = true;
      toast.success(
        mode === "transfer"
          ? "Money moved between envelopes."
          : "Envelope balance adjusted.",
      );
    } catch (err) {
      setError(
        `${err instanceof Error ? err.message : "Could not save."} Review the refreshed balances before trying again.`,
      );
    }
    try {
      await refresh();
    } catch {
      toast.error("Refresh failed. Reload before making more changes.");
    }
    setSaving(false);
    if (succeeded) onClose();
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="new-look nl-envelope-dialog sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{category.name}</DialogTitle>
          <DialogDescription>
            Available now: {money(category.current_balance)}. Review what
            changed, then decide whether to move money.
          </DialogDescription>
        </DialogHeader>
        <Tabs.Root
          className="nl-envelope-review"
          value={mode}
          onValueChange={(value) => onTabChange(value as EnvelopeTab)}
        >
          <Tabs.List
            className="nl-tabs nl-envelope-tabs"
            aria-label="Review envelope"
          >
            <Tabs.Trigger value="activity" disabled={saving}>
              Activity
            </Tabs.Trigger>
            <Tabs.Trigger value="transfer" disabled={saving}>
              Move money
            </Tabs.Trigger>
            <Tabs.Trigger value="adjust" disabled={saving}>
              Set balance
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content
            className="nl-envelope-activity"
            value="activity"
            forceMount
            hidden={mode !== "activity"}
          >
            <EnvelopeActivity
              categoryId={category.id}
              currentBalance={category.current_balance}
              funded={
                data.funding.categories.find(
                  (f) => f.categoryId === category.id,
                )?.fundedAmount || 0
              }
              spent={data.spending[category.id] || 0}
            />
          </Tabs.Content>
          {mode !== "activity" && (
            <Tabs.Content value={mode}>
              <form
                className="nl-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save();
                }}
              >
                {mode === "transfer" ? (
                  <>
                    <label>
                      Direction
                      <select
                        aria-label="Direction"
                        value={direction}
                        disabled={saving || !canEdit}
                        onChange={(e) => {
                          setDirection(e.target.value as "in" | "out");
                          setOther("");
                        }}
                      >
                        <option value="in">
                          Move money into {category.name}
                        </option>
                        <option value="out">
                          Move money out of {category.name}
                        </option>
                      </select>
                    </label>
                    <label>
                      {direction === "in" ? "From envelope" : "To envelope"}
                      <select
                        aria-label={
                          direction === "in" ? "From envelope" : "To envelope"
                        }
                        value={other}
                        disabled={saving || !canEdit}
                        onChange={(e) => setOther(e.target.value)}
                      >
                        <option value="">Choose an envelope</option>
                        {others.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} · {money(c.current_balance)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Amount
                      <input
                        inputMode="decimal"
                        value={amount}
                        disabled={saving || !canEdit}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                    {source &&
                      transferAmount !== null &&
                      transferAmount > source.current_balance && (
                        <p className="nl-error">
                          The source envelope does not have enough available.
                        </p>
                      )}
                    <small>
                      A transfer changes both envelopes. Available to save and
                      monthly funding stay the same.
                    </small>
                  </>
                ) : (
                  <>
                    <label>
                      New envelope balance
                      <input
                        inputMode="decimal"
                        value={balance}
                        disabled={saving || !canEdit}
                        onChange={(e) => setBalance(e.target.value)}
                      />
                    </label>
                    <small>
                      Increasing this balance uses available-to-save money.
                      Decreasing it releases money. This is a balance adjustment
                      and does not count as monthly funding.{" "}
                      <Link href="/new/payday">
                        Use payday allocation to record funding.
                      </Link>
                    </small>
                  </>
                )}
                <div className="nl-dialog-summary">
                  <div>
                    <span>{category.name} after</span>
                    <strong>{after === null ? "—" : money(after)}</strong>
                  </div>
                  <div>
                    <span>Available to save after</span>
                    <strong className={availableAfter < 0 ? "nl-negative" : ""}>
                      {money(availableAfter)}
                    </strong>
                  </div>
                </div>
                {mode === "adjust" && availableAfter < 0 && (
                  <p className="nl-error">
                    This adjustment leaves available to save below zero. Review
                    your recorded balances and commitments before saving.
                  </p>
                )}
                {error && (
                  <p className="nl-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="nl-form-actions">
                  <button
                    type="button"
                    className="nl-secondary"
                    disabled={saving}
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="nl-primary"
                    disabled={!canEdit || !valid || saving}
                  >
                    {saving
                      ? "Saving…"
                      : mode === "transfer"
                        ? "Move money"
                        : "Save balance adjustment"}
                  </button>
                </div>
              </form>
            </Tabs.Content>
          )}
        </Tabs.Root>
      </DialogContent>
    </Dialog>
  );
}

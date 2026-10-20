"use client";
import { NativeSelect } from "./native-select";
import { useTaskCheckin } from "./checkin-flow";
import { useState } from "react";
import {
  envelopeOverview,
  type EnvelopeOverview,
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
    overview: envelopeOverview(
      category,
      data.funding.categories.find((f) => f.categoryId === category.id)
        ?.fundedAmount || 0,
    ),
  }));
  const counts = {
    all: rows.length,
    negative: rows.filter((r) => r.overview.negative).length,
    surplus: rows.filter((r) => r.overview.surplus > 0).length,
  };
  const shown = rows
    .filter(
      ({ category: c, overview }) =>
        c.name.toLowerCase().includes(search.trim().toLowerCase()) &&
        (filter === "negative"
          ? overview.negative
          : filter === "surplus"
            ? overview.surplus > 0
            : true),
    )
    .sort(
      (a, b) =>
        (sort === "attention"
          ? a.overview.attention - b.overview.attention
          : sort === "name"
            ? a.category.name.localeCompare(b.category.name)
            : 0) ||
        a.category.sort_order - b.category.sort_order ||
        a.category.id - b.category.id,
    );
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
        title="What’s in your envelopes"
        description="See what you have left before you spend. Cover shortfalls, move extra money, or add to your envelopes."
      >
        <Link
          href={
            checkin
              ? `/new/budget/manage?from=${checkin}`
              : "/new/budget/manage"
          }
          className="nl-secondary nl-envelope-setup-link"
        >
          Set up envelopes →
        </Link>
      </PageHeading>
      <ReadOnlyNotice />
      <section className="nl-envelope-overview" aria-label="Envelope overview">
        <div>
          <h2>{month}</h2>
          <p>Your budget and funding for this month.</p>
        </div>
        <div className="nl-envelope-fund-action">
          <dl>
            <div>
              <dt>Available to save</dt>
              <dd
                className={
                  data.summary.current_savings < 0 ? "nl-negative" : ""
                }
              >
                {money(data.summary.current_savings)}
              </dd>
            </div>
          </dl>
          <Link href="/new/payday" className="nl-primary">
            Fund envelopes →
          </Link>
        </div>
      </section>
      <div className="nl-toolbar">
        <div className="nl-filters">
          {(
            [
              ["all", "All envelopes"],
              ["negative", "Needs covering"],
              ["surplus", "Extra to review"],
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
          <NativeSelect
            wrapperClassName="nl-envelope-sort"
            aria-label="Sort envelopes"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="envelope">Envelope order</option>
            <option value="attention">Needs attention first</option>
            <option value="name">Name: A to Z</option>
          </NativeSelect>
        </div>
      </div>
      {filter === "surplus" && (
        <p className="nl-notice">
          These everyday spending envelopes hold more than their monthly budget.
          You may want to keep that money for later or move some elsewhere.
          Savings, yearly expenses, and reserves aren’t included here.
        </p>
      )}
      {shown.length > 0 && (
        <div className="nl-envelope-list">
          <p className="nl-envelope-bar-guide">
            <span className="nl-envelope-bar-key" aria-hidden="true" />
            Bars show money left compared with the budget or target named below
            each bar.
          </p>
          <div className="nl-envelope-list-heading" aria-hidden="true">
            <span>Envelope</span>
            <span>Money left</span>
            <span>Monthly budget</span>
            <span>Funded this month</span>
          </div>
          <ul aria-label="Envelope balances and monthly funding">
            {shown.map(({ category: c, overview }) => (
              <li
                key={c.id}
                className="nl-envelope-row"
                data-attention={overview.negative}
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
                  <span>{overview.typeLabel}</span>
                  <div className="nl-envelope-actions">
                    <Link
                      className="nl-activity-link"
                      aria-label={`View activity for ${c.name}`}
                      href={envelopeReviewHref(
                        c.id,
                        "activity",
                        params.toString(),
                      )}
                      scroll={false}
                    >
                      Activity
                    </Link>
                    <Link
                      className="nl-activity-link"
                      aria-label={`${overview.negative ? "Cover shortfall in" : "Move money for"} ${c.name}`}
                      href={envelopeReviewHref(
                        c.id,
                        "transfer",
                        params.toString(),
                      )}
                      scroll={false}
                    >
                      {overview.negative ? "Cover shortfall" : "Move money"}
                    </Link>
                  </div>
                </div>
                <EnvelopeMoney name={c.name} overview={overview} />
                <div className="nl-envelope-budget">
                  <span className="nl-envelope-mobile-label">
                    Monthly budget
                  </span>
                  <strong>{money(overview.budget)}</strong>
                </div>
                <div className="nl-envelope-funding">
                  <span className="nl-envelope-mobile-label">
                    Funded this month
                  </span>
                  <strong>{money(overview.funding)}</strong>
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
        Money left is your current envelope balance, including money carried
        over. Funded this month records allocations; moving money between
        envelopes doesn’t change that total.{" "}
        <Link href="/new/imports">Import recent transactions</Link> to keep your
        balances up to date.
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

function EnvelopeMoney({
  name,
  overview: o,
}: {
  name: string;
  overview: EnvelopeOverview;
}) {
  return (
    <div className="nl-envelope-money" data-negative={o.negative}>
      <span className="nl-envelope-mobile-label">Money left</span>
      <strong className={o.negative ? "nl-negative" : ""}>
        {money(o.balance)}
      </strong>
      {o.percent !== null && (
        <div className="nl-envelope-comparison">
          <div
            className="nl-envelope-meter"
            role="meter"
            aria-label={`${name}: money left compared with ${o.referenceLabel.toLowerCase()}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(o.percent)}
            aria-valuetext={`${money(o.balance)} left in this envelope. ${o.meterCaption}.`}
          >
            <span style={{ width: `${o.percent}%` }} />
          </div>
          <span>{o.meterCaption}</span>
        </div>
      )}
      {o.balanceNote && (
        <span
          className={o.negative ? "nl-negative" : "nl-envelope-balance-note"}
        >
          {o.balanceNote}
        </span>
      )}
      {o.kind === "goal" && (
        <span className="nl-envelope-reference">Set aside for your goal</span>
      )}
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
                      <NativeSelect
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
                      </NativeSelect>
                    </label>
                    <label>
                      {direction === "in" ? "From envelope" : "To envelope"}
                      <NativeSelect
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
                      </NativeSelect>
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

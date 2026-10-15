"use client";
import { useTaskCheckin } from "./checkin-flow";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import * as Tabs from "@radix-ui/react-tabs";
import { EnvelopeActivity } from "./envelope-activity";
import { envelopeReviewHref, envelopeReviewTarget, type EnvelopeTab } from "@/lib/envelope-navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Category } from "@/lib/types";
import {
  money,
  parseMoney,
  ordinaryEnvelopes,
  potentialSurplus,
  cents,
} from "@/lib/new-look";
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
  if (!data) return null;
  const envelopes = ordinaryEnvelopes(data.categories);
  const counts = {
    all: envelopes.length,
    negative: envelopes.filter((c) => c.current_balance < 0).length,
    spending: envelopes.filter(
      (c) =>
        !c.is_goal &&
        (!c.category_type || c.category_type === "monthly_expense") &&
        (data.spending[c.id] || 0) > c.monthly_amount,
    ).length,
    surplus: envelopes.filter((c) => potentialSurplus(c) > 0).length,
  };
  const shown = envelopes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "negative"
        ? c.current_balance < 0
        : filter === "spending"
          ? !c.is_goal &&
            (!c.category_type || c.category_type === "monthly_expense") &&
            (data.spending[c.id] || 0) > c.monthly_amount
          : filter === "surplus"
            ? potentialSurplus(c) > 0
            : true),
  );
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
        description="Scan balances, cover overages, and decide where your money is most useful. Review the whole picture before moving anything."
      >
        <Link href="/categories" className="nl-secondary">
          Manage envelopes in classic ↗
        </Link>
      </PageHeading>
      <ReadOnlyNotice />
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
        <input
          aria-label="Search envelopes"
          placeholder="Find an envelope…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {filter === "surplus" && (
        <p className="nl-notice">
          These monthly expense envelopes have more than one month’s plan
          available. That may be intentional. Goal, accumulation,
          target-balance, and buffer funds are excluded from this suggestion.
        </p>
      )}
      <div className="nl-table-wrap">
        <table className="nl-table">
          <caption className="sr-only">
            Envelope balances, spending, and funding this month
          </caption>
          <thead>
            <tr>
              <th>Envelope</th>
              <th className="nl-right">Monthly plan</th>
              <th className="nl-right">Funded this month</th>
              <th className="nl-right">Spent this month</th>
              <th className="nl-right">Available now</th>
              <th>
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} data-attention={c.current_balance < 0}>
                <td>
                  <Link
                    className="nl-row-button"
                    href={envelopeReviewHref(c.id, "activity", params.toString())}
                    scroll={false}
                  >
                    {c.name}
                  </Link>
                  <span className="nl-subtext">
                    {c.is_goal
                      ? "Goal envelope"
                      : c.category_type === "accumulation"
                        ? "Saving for irregular expenses"
                        : c.category_type === "target_balance"
                          ? "Target balance"
                          : c.current_balance < 0
                            ? "Consider covering this overage"
                            : potentialSurplus(c) > 0
                              ? "Above one month’s plan"
                              : "Monthly expense"}
                  </span>
                </td>
                <td data-label="Monthly plan" className="nl-right nl-number">
                  {money(c.monthly_amount)}
                </td>
                <td
                  data-label="Funded this month"
                  className="nl-right nl-number"
                >
                  {money(
                    data.funding.categories.find((f) => f.categoryId === c.id)
                      ?.fundedAmount || 0,
                  )}
                </td>
                <td
                  data-label="Spent this month"
                  className="nl-right nl-number"
                >
                  {money(data.spending[c.id] || 0)}
                </td>
                <td
                  data-label="Available now"
                  className={`nl-right nl-number ${c.current_balance < 0 ? "nl-negative" : ""}`}
                >
                  <strong>{money(c.current_balance)}</strong>
                </td>
                <td>
                  <div className="nl-envelope-actions">
                  <Link
                    className="nl-secondary"
                    aria-label={`Review ${c.name}`}
                    href={envelopeReviewHref(c.id, "activity", params.toString())}
                    scroll={false}
                  >
                    Review →
                  </Link>
                  <Link
                    className="nl-activity-link"
                    aria-label={`Move money for ${c.name}`}
                    href={envelopeReviewHref(c.id, "transfer", params.toString())}
                    scroll={false}
                  >
                    Move money
                  </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!shown.length && (
        <div className="nl-panel">
          {envelopes.length ? (
            "No envelopes match this view. Try All envelopes or clear your search."
          ) : (
            <>
              No envelopes yet.{" "}
              <Link href="/categories">
                Create your categories in classic →
              </Link>
            </>
          )}
        </div>
      )}
      <p className="nl-footnote">
        Available now includes carryover and adjustments. Funded this month
        measures allocations; spent this month uses recorded transactions and
        refunds. These numbers answer different questions.
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
          onTabChange={nextTab => router.replace(
            envelopeReviewHref(category.id, nextTab, params.toString()),
            { scroll: false },
          )}
          onClose={() => router.replace(
            envelopeReviewHref(null, "activity", params.toString()),
            { scroll: false },
          )}
        />
      )}
    </>
  );
}

function EnvelopeEditor({
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
    mode === "activity" ? false : mode === "transfer"
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
            Available now: {money(category.current_balance)}. Review what changed,
            then decide whether to move money.
          </DialogDescription>
        </DialogHeader>
        <Tabs.Root className="nl-envelope-review" value={mode} onValueChange={value => onTabChange(value as EnvelopeTab)}>
          <Tabs.List className="nl-tabs nl-envelope-tabs" aria-label="Review envelope">
            <Tabs.Trigger value="activity" disabled={saving}>Activity</Tabs.Trigger>
            <Tabs.Trigger value="transfer" disabled={saving}>Move money</Tabs.Trigger>
            <Tabs.Trigger value="adjust" disabled={saving}>Set balance</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content className="nl-envelope-activity" value="activity" forceMount hidden={mode !== "activity"}>
            <EnvelopeActivity
              categoryId={category.id}
              currentBalance={category.current_balance}
              funded={data.funding.categories.find(f => f.categoryId === category.id)?.fundedAmount || 0}
              spent={data.spending[category.id] || 0}
            />
          </Tabs.Content>
          {mode !== "activity" && <Tabs.Content value={mode}>
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
                  <option value="in">Move money into {category.name}</option>
                  <option value="out">Move money out of {category.name}</option>
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
                A transfer changes both envelopes. Available to save and monthly
                funding stay the same.
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
                Increasing this balance uses available-to-save money. Decreasing
                it releases money. This is a balance adjustment and does not
                count as monthly funding.{" "}
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
              This adjustment leaves available to save below zero. Review your
              recorded balances and commitments before saving.
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
          </Tabs.Content>}
        </Tabs.Root>
      </DialogContent>
    </Dialog>
  );
}

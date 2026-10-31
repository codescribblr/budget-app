"use client";
import { BudgetRequestError } from "@/lib/budget-request";
import type { Account, CreditCard } from "@/lib/types";
import { AccountNavigation } from "./account-navigation";
import { NativeSelect } from "./native-select";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Landmark, CreditCard as CardIcon, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { money, cents } from "@/lib/new-look";
import { getCreditCardBalanceOwed } from "@/lib/credit-card-balance";
import {
  accountBudgetContribution,
  prepareAccountSetup,
  setupReturnTarget,
  type AccountSelection,
  type AccountSetupDraft,
} from "@/lib/budget-setup";
import { budgetRequest, DataBoundary, useBudget } from "./budget-context";
import { PageHeading, ReadOnlyNotice } from "./common";
import { SetupDialog } from "./setup-dialog";

export function GuidedAccountSetup() {
  return (
    <DataBoundary>
      <AccountSetupContent />
    </DataBoundary>
  );
}
function AccountSetupContent() {
  const { data, canEdit, refresh } = useBudget();
  const [editing, setEditing] = useState<AccountSelection | null>(null);
  const params = useSearchParams();
  const back = setupReturnTarget("accounts", params.get("from"));
  if (!data) return null;
  return (
    <>
      <AccountNavigation />
      <PageHeading
        eyebrow="Accounts · setup"
        title="Choose what belongs in your budget"
        description="Add your bank accounts and cards, keep their details current, and decide which balances count toward available to save."
      >
        <Link className="nl-secondary" href={back.href}>
          {back.label}
        </Link>
      </PageHeading>
      <ReadOnlyNotice />
      <div className="nl-setup-intro">
        <Landmark size={20} aria-hidden="true" />
        <p>
          <strong>Accounts hold your money. Envelopes give it a job.</strong>
          <br />
          Including an account makes its cash available to your budget; it
          doesn’t fund any envelopes automatically.
        </p>
      </div>
      {(["account", "card"] as const).map((kind) => {
        const items = kind === "account" ? data.accounts : data.cards;
        const Icon = kind === "account" ? Landmark : CardIcon;
        return (
          <section
            key={kind}
            className="nl-setup-section"
            aria-labelledby={`${kind}-setup-title`}
          >
            <div className="nl-section-title">
              <h2 id={`${kind}-setup-title`} className="nl-icon-heading">
                <Icon size={19} aria-hidden="true" />
                {kind === "account" ? "Bank & cash accounts" : "Credit cards"}
                <span className="nl-tag">{items.length}</span>
              </h2>
              <button
                className="nl-secondary"
                disabled={!canEdit}
                onClick={() =>
                  setEditing(
                    kind === "account"
                      ? { kind, item: null }
                      : { kind, item: null },
                  )
                }
              >
                <Plus size={16} aria-hidden="true" />
                {kind === "account" ? "Add account" : "Add credit card"}
              </button>
            </div>
            <div className="nl-setup-list">
              {items.map((item) => {
                const isCard = "credit_limit" in item;
                const balance = isCard
                  ? (cents(item.credit_limit) - cents(item.available_credit)) /
                    100
                  : item.balance;
                return (
                  <article key={item.id} className="nl-setup-row">
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        {isCard
                          ? `Credit limit ${money(item.credit_limit)}`
                          : `${item.account_type[0].toUpperCase()}${item.account_type.slice(1)}`}
                      </p>
                      <span className="nl-tag">
                        {item.include_in_totals
                          ? "Included in budget"
                          : "Tracking only"}
                      </span>
                    </div>
                    <div className="nl-setup-amount">
                      <strong>
                        {money(isCard ? Math.max(0, balance) : balance)}
                      </strong>
                      <span>
                        {isCard ? "Calculated owed" : "Recorded balance"}
                      </span>
                      {isCard && balance < 0 && (
                        <small>{money(-balance)} card credit</small>
                      )}
                    </div>
                    <button
                      className="nl-secondary"
                      disabled={!canEdit}
                      aria-label={`Edit ${item.name}`}
                      onClick={() =>
                        setEditing(
                          isCard
                            ? { kind: "card", item }
                            : { kind: "account", item },
                        )
                      }
                    >
                      <Pencil size={15} aria-hidden="true" />
                      Edit details
                    </button>
                  </article>
                );
              })}
              {!items.length && (
                <div className="nl-setup-empty">
                  <h3>
                    {kind === "account"
                      ? "Start with the money you can spend"
                      : "Account for what’s already on your cards"}
                  </h3>
                  <p>
                    {kind === "account"
                      ? "Add checking, savings, or cash on hand. Use Investments & assets for retirement and investment accounts."
                      : "Save the credit limit and available credit shown by your card provider. We’ll work out what’s owed."}
                  </p>
                </div>
              )}
            </div>
          </section>
        );
      })}
      <p className="nl-footnote">
        Need balance history, statement balances, or account removal?{" "}
        <Link href="/accounts">Bank account tools in classic ↗</Link> ·{" "}
        <Link href="/credit-cards">Card tools in classic ↗</Link>
      </p>
      {editing && (
        <AccountSetupEditor
          selection={editing}
          latest={editing.item ? (editing.kind === "card" ? data.cards : data.accounts).find(item => item.id === editing.item!.id) : undefined}
          canEdit={canEdit}
          availableToSave={data.summary.current_savings}
          onClose={() => setEditing(null)}
          onSave={async (payload, revision) => {
            if (editing.item && !revision) throw new Error("Reload this account before saving safely.");
            const endpoint =
              editing.kind === "card" ? "/api/credit-cards" : "/api/accounts";
            try {
              await budgetRequest(
                editing.item ? `${endpoint}/${editing.item.id}` : endpoint,
                editing.item ? { ...payload, expectedRevision: revision, expectedBudgetId: data.identity.activeAccountId } : payload,
                editing.item ? "PATCH" : "POST",
              );
            } catch (error) {
              // Resolve against the same authoritative version even when the
              // live channel is unavailable; never rebase onto the old list row.
              if (error instanceof BudgetRequestError && error.code === "STALE_RECORD")
                await refresh().catch(() => {});
              throw error;
            }
            toast.success(
              editing.item
                ? "Account details saved."
                : editing.kind === "card"
                  ? "Credit card added."
                  : "Account added.",
            );
            // The write succeeded: a refresh failure must not offer to create it again.
            await refresh().catch(() => {
              toast.error(
                "Saved, but totals could not refresh. Reload before making more changes.",
              );
            });
          }}
        />
      )}
    </>
  );
}

function AccountSetupEditor({
  selection: originalSelection,
  latest,
  availableToSave,
  canEdit,
  onSave,
  onClose,
}: {
  selection: AccountSelection;
  latest?: Account | CreditCard;
  availableToSave: number;
  canEdit: boolean;
  onSave: (
    payload: ReturnType<typeof prepareAccountSetup>["payload"],
    revision?: string,
  ) => Promise<void>;
  onClose: () => void;
}) {
  const [selection, setSelection] = useState(originalSelection);
  const [serverConflict, setServerConflict] = useState<Account | CreditCard | null>(null);
  const current = serverConflict || latest;
  const conflict = !!selection.item && !!current && selection.item.revision !== current.revision;
  const isCard = selection.kind === "card";
  const [initial] = useState<AccountSetupDraft>(() => ({
    name: selection.item?.name || "",
    accountType:
      selection.kind === "account"
        ? selection.item?.account_type || "checking"
        : "checking",
    balance:
      selection.kind === "account" && selection.item
        ? String(selection.item.balance)
        : "",
    limit:
      selection.kind === "card" && selection.item
        ? String(selection.item.credit_limit)
        : "",
    available:
      selection.kind === "card" && selection.item
        ? String(selection.item.available_credit)
        : "",
    included: selection.item?.include_in_totals ?? true,
  }));
  const [draft, setDraft] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const change = <K extends keyof AccountSetupDraft>(
    key: K,
    value: AccountSetupDraft[K],
  ) => setDraft((old) => ({ ...old, [key]: value }));
  let preview: ReturnType<typeof prepareAccountSetup> | null = null;
  try {
    preview = prepareAccountSetup(selection, draft);
  } catch {
    /* Validate on submit; preview only complete inputs. */
  }
  const previousBalance = selection.item
    ? selection.kind === "card"
      ? getCreditCardBalanceOwed(selection.item)
      : selection.item.balance
    : 0;
  const previousContribution = accountBudgetContribution(
    selection.kind,
    previousBalance,
    selection.item?.include_in_totals ?? false,
  );
  const nextAvailable = preview
    ? (cents(availableToSave) -
        cents(previousContribution) +
        cents(preview.contribution)) /
      100
    : null;
  return (
    <SetupDialog
      title={
        selection.item
          ? `Edit ${selection.item.name}`
          : isCard
            ? "Add a credit card"
            : "Add a bank or cash account"
      }
      description={
        isCard
          ? "Use the credit limit and available credit from your card provider."
          : "Track where your cash lives and whether it belongs in this budget."
      }
      dirty={dirty}
      canEdit={canEdit}
      saveLabel={
        selection.item
          ? "Save details"
          : isCard
            ? "Add credit card"
            : "Add account"
      }
      onClose={onClose}
      onSave={async () => {
        if (conflict) throw new Error("Review the changed details below before saving.");
        if (selection.item && !latest) throw new Error("This account is no longer available.");
        try { await onSave(prepareAccountSetup(selection, draft).payload, selection.item?.revision); }
        catch (error) {
          if (error instanceof BudgetRequestError && error.code === "STALE_RECORD" && error.latest)
            setServerConflict(error.latest as Account | CreditCard);
          throw error;
        }
      }}
    >
      {conflict && current && <div className="nl-sync-conflict" role="alert">
        <strong>These details changed elsewhere</strong>
        <p>Latest saved: {current.name}. {"credit_limit" in current ? `Limit ${money(current.credit_limit)} · Available credit ${money(current.available_credit)}` : `Balance ${money(current.balance)}`}. {current.include_in_totals ? "Included in budget" : "Tracking only"}.</p>
        <p>Your entries are still below. Review them before saving.</p>
        <div className="nl-form-actions">
          <button type="button" className="nl-secondary" onClick={onClose}>Close without saving</button>
          <button type="button" className="nl-secondary" onClick={() => {
            // Carry forward only fields actually edited, not stale untouched values.
            const previous = selection.item!;
            setDraft(old => ({ ...old,
              name: old.name === previous.name ? current.name : old.name,
              included: old.included === previous.include_in_totals ? current.include_in_totals : old.included,
              accountType: "account_type" in previous && "account_type" in current && old.accountType === previous.account_type ? current.account_type : old.accountType,
              limit: "credit_limit" in previous && "credit_limit" in current && Number(old.limit) === previous.credit_limit ? String(current.credit_limit) : old.limit,
              available: "available_credit" in previous && "available_credit" in current && Number(old.available) === previous.available_credit ? String(current.available_credit) : old.available,
            }));
            setSelection("credit_limit" in current ? { kind: "card", item: current } : { kind: "account", item: current });
            setServerConflict(null);
          }}>Keep my edits, use latest for the rest</button>
        </div>
      </div>}
      <label>
        Account name
        <input
          autoFocus
          maxLength={100}
          value={draft.name}
          onChange={(e) => change("name", e.target.value)}
          placeholder={isCard ? "e.g., Everyday Visa" : "e.g., Main checking"}
        />
      </label>
      {isCard ? (
        <>
          <div className="nl-setup-field-grid">
            <label>
              Credit limit
              <input
                inputMode="decimal"
                value={draft.limit}
                placeholder="0.00"
                onChange={(e) => change("limit", e.target.value)}
              />
            </label>
            <label>
              Available credit
              <input
                inputMode="decimal"
                value={draft.available}
                placeholder="0.00"
                onChange={(e) => change("available", e.target.value)}
              />
            </label>
          </div>
          <p className="nl-setup-help">
            When your limit changes, copy the latest available credit too. A
            negative available amount is valid if you’re over your limit; an
            amount above your limit means a card credit.
          </p>
          <div className="nl-setup-preview" aria-live="polite">
            <span>
              {preview && preview.balance < 0
                ? "Card credit · nothing owed"
                : "Calculated amount owed"}
            </span>
            <strong>{preview ? money(Math.abs(preview.balance)) : "—"}</strong>
            <small>
              Credit limit − available credit. A card credit doesn’t increase
              available to save.
            </small>
          </div>
        </>
      ) : (
        <>
          <div className="nl-setup-field-grid">
            <label>
              Account type
              <NativeSelect
                value={draft.accountType}
                onChange={(e) =>
                  change(
                    "accountType",
                    e.target.value as AccountSetupDraft["accountType"],
                  )
                }
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="cash">Cash on hand</option>
              </NativeSelect>
            </label>
            {!selection.item ? (
              <label>
                Current balance
                <input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={draft.balance}
                  onChange={(e) => change("balance", e.target.value)}
                />
              </label>
            ) : (
              <div className="nl-setup-readout">
                <span>Recorded balance</span>
                <strong>{money(selection.item.balance)}</strong>
                <small>Update this on the balances page.</small>
              </div>
            )}
          </div>
        </>
      )}
      <label className="nl-switch-label nl-setup-switch">
        <Switch
          className="nl-switch"
          aria-label="Include in my budget"
          aria-describedby="account-inclusion-help"
          checked={draft.included}
          disabled={!canEdit}
          onCheckedChange={(value) => change("included", value)}
        />
        <span>
          Include in my budget
          <small id="account-inclusion-help">
            {isCard
              ? "Reserve cash for the amount owed when calculating available to save."
              : "Count this account’s balance when calculating available to save."}{" "}
            Turn off to track it outside your budget.
          </small>
        </span>
      </label>
      <div className="nl-setup-preview" aria-live="polite">
        <span>Available to save after saving</span>
        <strong
          className={
            nextAvailable !== null && nextAvailable < 0 ? "nl-negative" : ""
          }
        >
          {nextAvailable === null ? "—" : money(nextAvailable)}
        </strong>
        <small>
          Currently {money(availableToSave)}. Envelope balances stay the same.
        </small>
      </div>
    </SetupDialog>
  );
}

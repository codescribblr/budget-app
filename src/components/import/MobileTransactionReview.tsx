"use client";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  X,
  Plus,
  Trash2,
  SlidersHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { OptionToggle } from "@/components/ui/option-toggle";
import { NativeSelect } from "@/components/new-look/native-select";
import TagSelector from "@/components/tags/TagSelector";
import { useFeature } from "@/contexts/FeatureContext";
import { formatCurrency } from "@/lib/utils";
import type { Account, Category, CreditCard } from "@/lib/types";
import type { ParsedTransaction } from "@/lib/import-types";
import {
  filterCategoriesForTransactionSelect,
  sortCategoriesForTransactionSelect,
} from "@/lib/transaction-categories";
import {
  formatReviewDate,
  includeReviewedTransaction,
  isReviewDuplicate,
  reviewValidation,
} from "@/lib/import/mobile-review";

export default function MobileTransactionReview({
  transaction,
  categories,
  accounts,
  cards,
  position,
  total,
  onClose,
  onMove,
  onFinish,
}: {
  categories: Category[];
  accounts: Account[];
  cards: CreditCard[];
  transaction: ParsedTransaction;
  position: number;
  total: number;
  onClose: () => void;
  onMove: (direction: -1 | 1) => void;
  onFinish: (item: ParsedTransaction) => void;
}) {
  const tagsEnabled = useFeature("tags");
  const [draft, setDraft] = useState<ParsedTransaction>(() => ({
    ...transaction,
    splits: transaction.splits.length
      ? transaction.splits.map((split) => ({ ...split }))
      : [{ categoryId: 0, categoryName: "", amount: transaction.amount }],
  }));
  const [dirty, setDirty] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState<number | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [archived, setArchived] = useState(false);
  const [separate, setSeparate] = useState(false);
  const duplicate = isReviewDuplicate(transaction);
  const ready = reviewValidation(draft) === null;
  function change(update: Partial<ParsedTransaction>) {
    setDraft((previous) => ({ ...previous, ...update }));
    setDirty(true);
    setError("");
  }
  function close() {
    if (dirty) setDiscarding(true);
    else onClose();
  }
  const accountValue = draft.account_id
    ? `account-${draft.account_id}`
    : draft.credit_card_id
      ? `card-${draft.credit_card_id}`
      : "none";
  const accountName =
    accounts.find((a) => a.id === draft.account_id)?.name ??
    cards.find((c) => c.id === draft.credit_card_id)?.name ??
    "No account assigned";
  const allocated = draft.splits.reduce((sum, split) => sum + split.amount, 0);
  const remaining = Math.round((draft.amount - allocated) * 100) / 100;
  function splitChange(
    index: number,
    changes: Partial<ParsedTransaction["splits"][number]>,
  ) {
    change({
      splits: draft.splits.map((split, i) =>
        i === index ? { ...split, ...changes, isAICategorized: false } : split,
      ),
    });
  }
  function include() {
    const problem = reviewValidation(draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (duplicate && !separate) {
      setError("Confirm this is a separate transaction, or keep it left out.");
      return;
    }
    onFinish(includeReviewedTransaction(draft, duplicate && separate));
  }
  const categoryChoices = sortCategoriesForTransactionSelect(
    filterCategoriesForTransactionSelect(categories, {
      showArchivedCategories: archived,
      includeCategoryId:
        picker !== null ? draft.splits[picker]?.categoryId : undefined,
    }),
  ).filter((category) =>
    category.name
      .toLocaleLowerCase()
      .includes(categorySearch.trim().toLocaleLowerCase()),
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        className="nl-mobile-transaction-dialog translate-x-0 translate-y-0"
        showCloseButton={false}
      >
        <DialogHeader className="nl-mobile-review-header">
          <div>
            <p>
              Transaction {position} of {total}
            </p>
            <DialogTitle>Review transaction</DialogTitle>
          </div>
          <button
            className="nl-mobile-icon-action"
            aria-label="Close transaction review"
            onClick={close}
          >
            <X size={21} />
          </button>
          <DialogDescription className="sr-only">
            Check the envelope and details, then include or leave out this
            transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="nl-mobile-review-body" key={transaction.id}>
          <div className="nl-mobile-transaction-heading">
            <p>
              {formatReviewDate(draft.date)} · {accountName}
            </p>
            <h2>{draft.merchant || draft.description}</h2>
            <strong
              className={draft.transaction_type === "income" ? "nl-accent" : ""}
            >
              {draft.transaction_type === "income" ? "+" : "−"}
              {formatCurrency(draft.amount)}
            </strong>
            <p className="nl-mobile-full-description">{draft.description}</p>
          </div>
          {duplicate && (
            <div className="nl-notice">
              <strong>
                {transaction.duplicateType === "within-file"
                  ? "This may repeat another row in this file."
                  : "This matches a transaction already imported."}
              </strong>
              <p>It is left out by default to avoid counting it twice.</p>
              <label className="nl-mobile-switch">
                <OptionToggle
                  checked={separate}
                  onCheckedChange={(value) => {
                    setSeparate(value);
                    setDirty(true);
                  }}
                />
                This is a separate transaction
              </label>
              {separate && (
                <p>This will add another transaction to your budget.</p>
              )}
            </div>
          )}
          <section
            className="nl-mobile-envelope-choice"
            aria-label="Transaction envelopes"
          >
            <div className="nl-mobile-section-heading">
              <h3>
                {draft.splits.length > 1
                  ? "Split between envelopes"
                  : "Which envelope?"}
              </h3>
              <button
                type="button"
                onClick={() =>
                  change({
                    splits: [
                      ...draft.splits,
                      {
                        categoryId: 0,
                        categoryName: "",
                        amount: Math.max(0, remaining),
                      },
                    ],
                  })
                }
              >
                <Plus size={15} />
                Split
              </button>
            </div>
            {draft.splits.map((split, index) => (
              <div className="nl-mobile-split" key={index}>
                <button
                  className="nl-mobile-category-button"
                  aria-label={`Choose envelope${draft.splits.length > 1 ? ` for split ${index + 1}` : ""}`}
                  aria-expanded={picker === index}
                  onClick={() => {
                    setPicker(picker === index ? null : index);
                    setCategorySearch("");
                  }}
                >
                  <span>
                    {split.categoryName || "Choose an envelope"}
                    {split.isAICategorized && (
                      <small>AI suggestion · check before importing</small>
                    )}
                  </span>
                  <ChevronRight size={18} />
                </button>
                {picker === index && (
                  <div className="nl-mobile-category-picker">
                    <input
                      aria-label="Search envelopes"
                      placeholder="Search envelopes…"
                      value={categorySearch}
                      onChange={(event) =>
                        setCategorySearch(event.target.value)
                      }
                    />
                    <label className="nl-mobile-switch">
                      <OptionToggle
                        checked={archived}
                        onCheckedChange={setArchived}
                      />
                      Include archived envelopes
                    </label>
                    <div role="group" aria-label="Choose an envelope">
                      {categoryChoices.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          aria-pressed={category.id === split.categoryId}
                          onClick={() => {
                            splitChange(index, {
                              categoryId: category.id,
                              categoryName: category.name,
                            });
                            setPicker(null);
                          }}
                        >
                          <span>
                            {category.name}
                            {category.is_archived ? " (archived)" : ""}
                          </span>
                          {category.id === split.categoryId && (
                            <Check size={16} />
                          )}
                        </button>
                      ))}
                      {!categoryChoices.length && <p>No matching envelopes.</p>}
                    </div>
                  </div>
                )}
                {draft.splits.length > 1 && (
                  <div className="nl-mobile-split-amount">
                    <label>
                      Split {index + 1} amount
                      <input
                        aria-label={`Split ${index + 1} amount`}
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.01"
                        value={split.amount || ""}
                        onChange={(event) =>
                          splitChange(index, {
                            amount: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <button
                      className="nl-mobile-icon-action"
                      aria-label={`Remove split ${index + 1}`}
                      onClick={() => {
                        const splits = draft.splits.filter(
                          (_, i) => index !== i,
                        );
                        change({
                          splits:
                            splits.length === 1
                              ? [{ ...splits[0], amount: draft.amount }]
                              : splits,
                        });
                        setPicker(null);
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {draft.splits.length > 1 && (
              <p className={remaining !== 0 ? "nl-negative" : "nl-accent"}>
                {remaining === 0
                  ? "The split amounts match the total."
                  : `${formatCurrency(Math.abs(remaining))} ${remaining > 0 ? "left to assign" : "over the transaction total"}`}
              </p>
            )}
          </section>
          <details className="nl-mobile-edit-details">
            <summary>
              Edit transaction details <SlidersHorizontal size={16} />
            </summary>
            <div className="nl-form">
              <label>
                Merchant
                <input
                  value={draft.merchant}
                  onChange={(event) => change({ merchant: event.target.value })}
                />
              </label>
              <label>
                Bank description
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(event) =>
                    change({ description: event.target.value })
                  }
                />
              </label>
              <div className="nl-mobile-field-pair">
                <label>
                  Date
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => change({ date: event.target.value })}
                  />
                </label>
                <label>
                  Amount
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={draft.amount || ""}
                    onChange={(event) => {
                      const amount = Number(event.target.value);
                      change({
                        amount,
                        splits:
                          draft.splits.length === 1
                            ? [{ ...draft.splits[0], amount }]
                            : draft.splits,
                      });
                    }}
                  />
                </label>
              </div>
              <label>
                Type
                <NativeSelect
                  value={draft.transaction_type}
                  onChange={(event) =>
                    change({
                      transaction_type: event.target.value as
                        | "income"
                        | "expense",
                    })
                  }
                >
                  <option value="expense">Money out</option>
                  <option value="income">Money in / refund</option>
                </NativeSelect>
              </label>
              <label>
                Account or card
                <NativeSelect
                  value={accountValue}
                  onChange={(event) => {
                    const [type, id] = event.target.value.split("-");
                    change({
                      account_id: type === "account" ? Number(id) : null,
                      credit_card_id: type === "card" ? Number(id) : null,
                    });
                  }}
                >
                  <option value="none">No account assigned</option>
                  <optgroup label="Accounts">
                    {accounts.map((account) => (
                      <option key={account.id} value={`account-${account.id}`}>
                        {account.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Credit cards">
                    {cards.map((card) => (
                      <option key={card.id} value={`card-${card.id}`}>
                        {card.name}
                      </option>
                    ))}
                  </optgroup>
                </NativeSelect>
              </label>
              <label className="nl-mobile-switch">
                <OptionToggle
                  checked={!!draft.is_historical}
                  onCheckedChange={(value) => change({ is_historical: value })}
                />
                Historical transaction
              </label>
              <small>
                Historical transactions appear in reports without changing
                current envelope balances.
              </small>
              {tagsEnabled && (
                <TagSelector
                  selectedTagIds={draft.tag_ids ?? []}
                  onChange={(tag_ids) => change({ tag_ids })}
                  transactionDescription={draft.description}
                  categoryIds={draft.splits
                    .map((split) => split.categoryId)
                    .filter(Boolean)}
                />
              )}
            </div>
          </details>
          {draft.is_historical && (
            <p className="nl-footnote">
              Historical · won’t change your current envelope balances.
            </p>
          )}
        </div>
        <div className="nl-mobile-review-footer">
          {error && (
            <p className="nl-error" role="alert">
              {error}
            </p>
          )}
          {discarding ? (
            <div className="nl-mobile-discard" role="alert">
              <p>Discard your changes to this transaction?</p>
              <div>
                <button
                  className="nl-secondary"
                  onClick={() => setDiscarding(false)}
                >
                  Keep editing
                </button>
                <button className="nl-secondary" onClick={onClose}>
                  Discard changes
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="nl-mobile-review-navigation">
                <button
                  aria-label="Previous transaction"
                  disabled={position === 1 || dirty}
                  onClick={() => onMove(-1)}
                >
                  <ArrowLeft size={17} />
                  Previous
                </button>
                <span>
                  {position} / {total}
                </span>
                <button
                  aria-label="Next transaction"
                  disabled={position === total || dirty}
                  onClick={() => onMove(1)}
                >
                  Next
                  <ArrowRight size={17} />
                </button>
              </div>
              {dirty && (
                <p className="nl-mobile-edit-hint">
                  Apply your changes below, or close to discard them.
                </p>
              )}
              <div className="nl-mobile-review-decisions">
                <button
                  className="nl-secondary"
                  onClick={() =>
                    onFinish({
                      ...draft,
                      splits: draft.splits.filter(
                        (split) => split.categoryId > 0,
                      ),
                      status: "excluded",
                      reviewSkipped: true,
                    })
                  }
                >
                  {duplicate ? "Keep left out" : "Leave out"}
                  {position < total ? " & next" : ""}
                </button>
                <button
                  className="nl-primary"
                  disabled={duplicate && !separate}
                  onClick={include}
                >
                  {ready
                    ? position === total
                      ? "Ready · done"
                      : "Ready & next"
                    : position === total
                      ? "Mark ready"
                      : "Mark ready & next"}
                  <Check size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

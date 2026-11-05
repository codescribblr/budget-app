"use client";

import { useRef, useState, type Ref } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { ParsedTransaction } from "@/lib/import-types";
import type { Category } from "@/lib/types";
import { TransactionFlowAmount } from "@/components/new-look/transaction-flow-amount";
import {
  filterCategoriesForTransactionSelect,
  sortCategoriesForTransactionSelect,
} from "@/lib/transaction-categories";
import { TransactionCategorySelectLabel } from "@/components/transactions/TransactionCategorySelectLabel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";

/** Two-click review: open the picker, then choose and persist the envelope. */
export default function ImportEnvelopePicker({
  transaction,
  categories,
  disabled,
  triggerRef,
  onChoose,
  onDetails,
}: {
  transaction: ParsedTransaction;
  categories: Category[];
  disabled: boolean;
  triggerRef: Ref<HTMLButtonElement>;
  onChoose: (snapshot: ParsedTransaction, category: Category) => Promise<void>;
  onDetails: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(transaction);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const committing = useRef(false);
  // Never rebase an open picker onto a newer revision: a remote edit must conflict.
  const options = sortCategoriesForTransactionSelect(
    filterCategoriesForTransactionSelect(categories, {
      showArchivedCategories: showArchived,
      includeCategoryId: snapshot.splits[0]?.categoryId,
    }),
  );
  const evidence = new Map<number, string>();
  const suggestion = snapshot.categorization;
  suggestion?.history.candidates.forEach((c) =>
    evidence.set(c.categoryId, "History"),
  );
  const ai = suggestion?.ai?.candidate;
  if (ai)
    evidence.set(
      ai.categoryId,
      evidence.has(ai.categoryId) ? "AI + history" : "AI",
    );
  const suggested = options.filter((c) => evidence.has(c.id));
  const remaining = options.filter((c) => !evidence.has(c.id));
  async function choose(category: Category) {
    if (committing.current || disabled) return;
    committing.current = true;
    setSaving(true);
    setError("");
    try {
      await onChoose(snapshot, category);
      setOpen(false);
    } catch (e) {
      committing.current = false;
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  function option(category: Category) {
    return (
      <CommandItem
        key={category.id}
        value={String(category.id)}
        keywords={[category.name]}
        disabled={saving || disabled}
        onSelect={() => void choose(category)}
      >
        <span className="nl-envelope-option-label">
          <TransactionCategorySelectLabel category={category} />
          {evidence.has(category.id) && (
            <small>{evidence.get(category.id)} suggestion</small>
          )}
        </span>
        {snapshot.splits[0]?.categoryId === category.id && (
          <Check size={16} aria-hidden="true" />
        )}
      </CommandItem>
    );
  }
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        if (committing.current && saving) return;
        if (value) {
          setSnapshot(transaction);
          setError("");
          setShowArchived(false);
          committing.current = false;
        }
        setOpen(value);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          ref={triggerRef}
          className="nl-envelope-picker-trigger"
          disabled={disabled}
          aria-label={`Choose envelope for ${transaction.merchant || transaction.description}, currently ${transaction.splits[0]?.categoryName || "unassigned"}`}
        >
          <span>
            {saving
              ? "Saving…"
              : transaction.splits[0]?.categoryName || "Choose an envelope"}
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="nl-envelope-picker-popover"
        align="start"
        collisionPadding={12}
        aria-label={`Envelope for ${snapshot.merchant || snapshot.description}`}
        onOpenAutoFocus={(event) => {
          // Touch users can pick immediately without the keyboard covering the options.
          if (window.matchMedia("(pointer: coarse)").matches)
            event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          // The parent restores focus to the same row without scrolling after a save.
          if (committing.current) event.preventDefault();
        }}
      >
        <div className="nl-envelope-picker-title">
          <strong>{snapshot.merchant || snapshot.description}</strong>
          <TransactionFlowAmount
            amount={snapshot.amount}
            transactionType={snapshot.transaction_type}
          />
        </div>
        <Command label="Choose an envelope">
          <CommandInput
            placeholder="Find an envelope…"
            aria-label="Find an envelope"
            disabled={saving}
          />
          <CommandList aria-label="Envelopes">
            <CommandEmpty>No matching envelopes.</CommandEmpty>
            {!!suggested.length && (
              <CommandGroup heading="Suggestions">
                {suggested.map(option)}
              </CommandGroup>
            )}
            <CommandGroup
              heading={suggested.length ? "All envelopes" : undefined}
            >
              {remaining.map(option)}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="nl-envelope-picker-footer">
          <p role="status">
            {saving
              ? "Saving your choice…"
              : "Choosing an envelope saves & confirms it."}
          </p>
          {error && (
            <p className="nl-envelope-picker-error" role="alert">
              {error}
            </p>
          )}
          <div>
            <label>
              <Switch
                checked={showArchived}
                onCheckedChange={setShowArchived}
                disabled={saving}
              />
              Archived
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setOpen(false);
                onDetails();
              }}
            >
              Details & split
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

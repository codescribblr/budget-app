"use client";
import { Sparkles, History } from "lucide-react";
import { OptionToggle } from "@/components/ui/option-toggle";
import { TransactionFlowAmount } from "@/components/new-look/transaction-flow-amount";
import type {
  CategoryCandidate,
  CategorySuggestion,
} from "@/lib/import/categorization";
export default function CategorySuggestionPanel({
  suggestion,
  reviewed = false,
  onChoose,
  onAI,
  aiBusy,
  onPreference,
  busy,
}: {
  suggestion?: CategorySuggestion;
  reviewed?: boolean;
  onChoose: (candidate: CategoryCandidate) => void;
  onAI?: () => void;
  aiBusy?: boolean;
  onPreference?: (value: boolean) => void;
  busy?: boolean;
}) {
  const choices = new Map<number, CategoryCandidate>();
  if (suggestion?.ai?.candidate)
    choices.set(suggestion.ai.candidate.categoryId, suggestion.ai.candidate);
  suggestion?.history.candidates.forEach((c) => {
    if (!choices.has(c.categoryId)) choices.set(c.categoryId, c);
  });
  if (!choices.size && !onAI && !suggestion?.merchantId)
    return (
      <p className="nl-footnote">
        {reviewed
          ? "Your envelope choices are saved. You can adjust them below."
          : "Choose an envelope below. Your confirmed choices will help with future imports."}
      </p>
    );
  return (
    <section
      className="nl-category-suggestions"
      aria-label="Envelope suggestions"
    >
      <div className="nl-category-heading">
        <h3>What was this purchase for?</h3>
        {onAI && (
          <button
            type="button"
            className="nl-text-action"
            disabled={aiBusy || busy}
            onClick={onAI}
          >
            <Sparkles size={15} />
            {aiBusy ? "Asking AI…" : suggestion?.ai ? "Ask AI again" : "Ask AI"}
          </button>
        )}
      </div>
      <p>
        {suggestion?.reason ??
          "Choose the envelope that fits this purchase. A previous guess still needs your confirmation."}
      </p>
      {choices.size > 0 && (
        <div className="nl-category-choices">
          {[...choices.values()].slice(0, 3).map((c) => (
            <button
              type="button"
              className="nl-secondary"
              key={c.categoryId}
              onClick={() => onChoose(c)}
              disabled={busy}
            >
              <strong>{c.categoryName}</strong>
              <small>
                {suggestion?.ai?.candidate?.categoryId === c.categoryId
                  ? suggestion.history.candidates[0]?.categoryId ===
                    c.categoryId
                    ? "AI + history"
                    : "AI suggestion"
                  : "Your history"}
              </small>
            </button>
          ))}
        </div>
      )}
      {suggestion && (
        <details>
          <summary>
            <History size={15} /> Why these choices?
          </summary>
          {suggestion.ai && (
            <p>
              <strong>AI:</strong> {suggestion.ai.reason}
            </p>
          )}
          <p>
            {suggestion.history.reason} {suggestion.history.confirmedCount}{" "}
            confirmed transactions in the last year
            {suggestion.history.otherCount
              ? ` · ${suggestion.history.otherCount} earlier transactions with unknown review status`
              : ""}
            .
          </p>
          {suggestion.history.candidates.map((c) => (
            <p key={c.categoryId}>
              {c.categoryName}: {c.reason}
            </p>
          ))}
          {suggestion.history.recent.length > 0 && (
            <>
              <h4>Recent transactions at {suggestion.merchantName}</h4>
              <ul>
                {suggestion.history.recent.map((t) => (
                  <li key={t.id}>
                    <span>
                      {t.date} ·{" "}
                      {t.splits.map((s) => s.categoryName).join(" + ")}
                      <small>{t.description}</small>
                    </span>
                    <TransactionFlowAmount
                      amount={t.amount}
                      transactionType={t.transaction_type}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </details>
      )}
      {suggestion?.merchantId && onPreference && (
        <label className="nl-category-preference">
          <OptionToggle
            checked={suggestion.alwaysAsk}
            onCheckedChange={onPreference}
            disabled={busy}
          />
          <span>
            Always ask me for {suggestion.merchantName}
            <small>Keep suggestions, but require my confirmation.</small>
          </span>
        </label>
      )}
    </section>
  );
}

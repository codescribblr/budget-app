"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ordinaryEnvelopes } from "@/lib/new-look";
import { envelopeOverview } from "@/lib/envelope-overview";
import { useBudget } from "./budget-context";
import { EnvelopeRow } from "./envelope-row";
import { HomeEnvelopesSkeleton } from "./home-skeleton";

type RecentEnvelope = { category_id: number; transaction_date: string };
export function HomeEnvelopes() {
  const { data } = useBudget();
  const accountId = data?.identity.activeAccountId;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    accountId: number;
    rows?: RecentEnvelope[];
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    setResult(null);
    void fetch(`/api/categories/recent?accountId=${accountId}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const rows = await response.json();
        if (!response.ok)
          throw new Error("Recently used envelopes could not be loaded.");
        if (!controller.signal.aborted) setResult({ accountId, rows });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({ accountId, error: error.message });
      });
    return () => controller.abort();
  }, [accountId, attempt]);
  if (!data) return null;
  const envelopes = ordinaryEnvelopes(data.categories);
  const current = result?.accountId === accountId ? result : null;
  const recent = (current?.rows ?? []).flatMap((row) => {
    const category = envelopes.find((c) => c.id === row.category_id);
    return category ? [category] : [];
  });
  // When there is no history yet, show the user's first envelopes, clearly labeled.
  const shown = recent.length ? recent : envelopes.slice(0, 7);
  const negative = envelopes.filter((c) => c.current_balance < 0).length;
  return (
    <section
      className="nl-home-envelopes"
      aria-labelledby="home-envelopes-title"
    >
      <div className="nl-section-title">
        <h2 id="home-envelopes-title">Your envelopes at a glance</h2>
        <Link href="/new/budget">All envelopes →</Link>
      </div>
      {!envelopes.length ? (
        <div className="nl-panel">
          <h3>Your envelopes start here</h3>
          <p>
            Create your envelopes, then return to plan and review them here.
          </p>
          <Link href="/new/budget/manage?edit=new" className="nl-secondary">
            Set up envelopes →
          </Link>
        </div>
      ) : current?.error ? (
        <div className="nl-panel" role="alert">
          <p>{current.error}</p>
          <button
            className="nl-secondary"
            onClick={() => setAttempt((a) => a + 1)}
          >
            Try again
          </button>
        </div>
      ) : !current?.rows ? (
        <HomeEnvelopesSkeleton count={Math.min(envelopes.length, 3)} />
      ) : (
        <>
          <p className="nl-home-envelope-intro">
            {recent.length
              ? "Up to seven envelopes, ordered by most recent transaction. Check what’s left before spending."
              : "Your first envelopes. As you record or import transactions, your recently used envelopes will appear here."}
          </p>
          {negative > 0 && (
            <p className="nl-home-envelope-attention">
              <Link href="/new/budget?filter=negative">
                {negative}{" "}
                {negative === 1 ? "envelope needs" : "envelopes need"} covering
                across your budget →
              </Link>
            </p>
          )}
          <div className="nl-envelope-list nl-home-envelope-list">
            <ul aria-label="Recently used envelope balances and monthly funding">
              {shown.map((category) => (
                <EnvelopeRow
                  key={category.id}
                  category={category}
                  overview={envelopeOverview(
                    category,
                    data.funding.categories.find(
                      (f) => f.categoryId === category.id,
                    )?.fundedAmount ?? 0,
                  )}
                />
              ))}
            </ul>
          </div>
          <p className="nl-footnote">
            Money left includes carried-over balances. Bars compare it with the
            budget or target named below. Funding records money allocated this
            month.
          </p>
        </>
      )}
    </section>
  );
}

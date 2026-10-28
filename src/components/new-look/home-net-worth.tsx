"use client";
import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined } from "lucide-react";
import { money } from "@/lib/new-look";
import type { WorthSummary } from "@/lib/net-worth-report";
import { useNetWorth } from "./use-net-worth";

export function HomeNetWorth() {
  const { data, enabled, features, loading, error, retry } =
    useNetWorth<WorthSummary>();
  if (!enabled || features.loading || features.error) return null;
  return (
    <section
      className="nl-panel nl-worth-card"
      aria-labelledby="home-worth-title"
    >
      <h2 className="nl-icon-heading" id="home-worth-title">
        <ChartNoAxesCombined
          size={21}
          className="nl-accent"
          aria-hidden="true"
        />
        Your net worth
      </h2>
      {loading ? (
        <p role="status">Loading net worth…</p>
      ) : error || !data ? (
        <div role="alert">
          <p>Net worth couldn’t load.</p>
          <button className="nl-secondary" onClick={retry}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="nl-worth-card-amount">
            {money(data.current.netWorth)}
          </div>
          <p>What you own, minus what you owe.</p>
          {data.change30Days && (
            <small className="nl-worth-card-change">
              {data.change30Days.amount > 0 ? "+" : ""}
              {money(data.change30Days.amount)} since{" "}
              {new Date(
                `${data.change30Days.baselineDate}T12:00:00`,
              ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </small>
          )}
        </>
      )}
      <Link href="/new/reports/net-worth">
        View net worth report <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </section>
  );
}

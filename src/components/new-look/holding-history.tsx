"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { money } from "@/lib/new-look";
import {
  holdingEndpoint,
  recordedDate,
  type HoldingKind,
} from "@/lib/long-term-planning";
interface RecordEntry {
  id: number;
  created_at: string;
  old_balance?: number;
  new_balance?: number;
  old_value?: number;
  new_value?: number;
  change_amount: number;
  change_type: string;
  description?: string;
}
export function HoldingHistory({
  kind,
  id,
  revision,
}: {
  kind: HoldingKind;
  id: number;
  revision: number;
}) {
  const [records, setRecords] = useState<RecordEntry[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [more, setMore] = useState(false);
  const generation = useRef(0),
    inFlight = useRef(false);
  const load = useCallback(
    async (offset: number, token: number) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${holdingEndpoint(kind)}/${id}/audit?limit=20&offset=${offset}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("History could not be loaded.");
        const result = await response.json();
        if (!Array.isArray(result.records))
          throw new Error("History could not be read.");
        if (token === generation.current) {
          setRecords((prev) =>
            offset
              ? [
                  ...prev,
                  ...result.records.filter(
                    (r: RecordEntry) => !prev.some((p) => p.id === r.id),
                  ),
                ]
              : result.records,
          );
          setMore(result.hasMore === true);
        }
      } catch (err) {
        if (token === generation.current)
          setError(err instanceof Error ? err.message : "History unavailable.");
      } finally {
        if (token === generation.current) {
          inFlight.current = false;
          setLoading(false);
        }
      }
    },
    [kind, id],
  );
  useEffect(() => {
    const token = ++generation.current;
    inFlight.current = false;
    setRecords([]);
    setMore(false);
    void load(0, token);
    return () => {
      generation.current++;
    };
  }, [load, revision]);
  const chart = [...records]
    .reverse()
    .map((r) => ({
      time: new Date(r.created_at).getTime(),
      value: Number(kind === "loans" ? r.new_balance : r.new_value),
    }));
  return (
    <section
      className="nl-panel nl-holding-history"
      aria-label="Recorded balance history"
    >
      <div className="nl-section-title">
        <div>
          <p className="nl-eyebrow">The recorded story</p>
          <h2>{kind === "loans" ? "Debt over time" : "Value over time"}</h2>
        </div>
        <span className="nl-tag">{records.length} changes shown</span>
      </div>
      <p className="nl-muted">
        {kind === "loans"
          ? "Balance changes include payments, interest, fees, or corrections. They are not a payment ledger."
          : "Recorded values include contributions, withdrawals, and market movements. This chart does not calculate investment returns."}
      </p>
      {chart.length > 1 && (
        <div
          className="nl-holding-chart"
          role="img"
          aria-label={`${kind === "loans" ? "Debt" : "Asset value"} in dollars across the ${chart.length} loaded changes; exact values in history below.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chart}
              margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 11 }}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v) =>
                  v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
                }
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 11 }}
                width={66}
              />
              <Tooltip
                labelFormatter={(v) =>
                  recordedDate(new Date(Number(v)).toISOString())
                }
                formatter={(v) => [
                  money(Number(v)),
                  kind === "loans" ? "Amount owed" : "Recorded value",
                ]}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--foreground)",
                }}
              />
              <Line
                dataKey="value"
                type="linear"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="nl-history-list">
        {records.map((r) => {
          const old = Number(kind === "loans" ? r.old_balance : r.old_value),
            next = Number(kind === "loans" ? r.new_balance : r.new_value),
            delta = next - old;
          return (
            <article key={r.id}>
              <div>
                <strong>
                  {r.description ||
                    {
                      manual_edit: "Balance updated",
                      value_update: "Value updated",
                      payment: "Payment recorded",
                      interest_accrual: "Interest recorded",
                      appreciation: "Value increased",
                      depreciation: "Value decreased",
                    }[r.change_type] ||
                    "Recorded change"}
                </strong>
                <span>
                  {new Date(r.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div>
                <strong>{money(next)}</strong>
                <span>
                  {money(old)} → {money(next)}
                </span>
                <small>
                  {delta > 0 ? "+" : delta < 0 ? "−" : ""}
                  {money(Math.abs(delta))} change
                </small>
              </div>
            </article>
          );
        })}
      </div>
      {!loading && !error && !records.length && (
        <div className="nl-setup-empty">
          <h3>Your next update starts the history</h3>
          <p>
            Save a changed balance when you have a new statement or valuation.
            Your current amount remains visible above.
          </p>
        </div>
      )}
      {error && (
        <p className="nl-error" role="alert">
          {error}{" "}
          <button
            className="nl-text-button"
            onClick={() => void load(records.length, generation.current)}
          >
            Try again
          </button>
        </p>
      )}
      {loading && (
        <p role="status" className="nl-muted">
          Loading history…
        </p>
      )}
      {more && !error && (
        <button
          className="nl-secondary"
          disabled={loading}
          onClick={() => void load(records.length, generation.current)}
        >
          Load older changes
        </button>
      )}
    </section>
  );
}

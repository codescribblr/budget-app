"use client";
import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Landmark,
  Sprout,
  CreditCard,
  ChartNoAxesCombined,
  ChevronDown,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "@/lib/new-look";
import {
  worthGroups,
  worthPeriod,
  type WorthItem,
  type WorthRange,
  type WorthReport,
} from "@/lib/net-worth-report";
import { PageHeading } from "./common";
import { DataBoundary, useBudget } from "./budget-context";
import { useNetWorth } from "./use-net-worth";
import "./net-worth.css";

const day = (value: string) =>
  new Date(
    value.includes("T") ? value : `${value}T12:00:00`,
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const signed = (amount: number) => `${amount > 0 ? "+" : ""}${money(amount)}`;
const icons = {
  cash: Landmark,
  assets: Sprout,
  cards: CreditCard,
  loans: Landmark,
};
const compact = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
const ranges: { key: WorthRange; label: string }[] = [
  { key: "1m", label: "1 month" },
  { key: "6m", label: "6 months" },
  { key: "1y", label: "1 year" },
  { key: "all", label: "All time" },
];

export function GuidedNetWorth() {
  return (
    <DataBoundary>
      <NetWorthContent />
    </DataBoundary>
  );
}
function NetWorthContent() {
  const { data, enabled, features, loading, error, retry } = useNetWorth(true);
  return (
    <div className="nl-worth-page">
      <PageHeading
        eyebrow="Reports · the bigger picture"
        title="Your net worth"
        description="Step back from the monthly budget. See what you’ve built and what you still owe."
      >
        <Link href="/new/accounts" className="nl-secondary">
          Update balances <ArrowRight size={16} />
        </Link>
      </PageHeading>
      <nav className="nl-account-nav" aria-label="Report views">
        <Link href="/new/reports">Spending review</Link>
        <Link href="/new/reports?view=plan">Monthly plan check</Link>
        <Link href="/new/reports/net-worth" aria-current="page">
          Net worth
        </Link>
      </nav>
      {features.loading ? (
        <div className="nl-panel" role="status">
          Loading report access…
        </div>
      ) : features.error ? (
        <div className="nl-panel" role="alert">
          <h2>Your account settings could not load</h2>
          <button
            className="nl-secondary"
            onClick={() => void features.refreshFeatures()}
          >
            Try again
          </button>
        </div>
      ) : !enabled ? (
        <section className="nl-panel nl-worth-empty">
          <ChartNoAxesCombined size={32} aria-hidden="true" />
          <h2>A longer view of your money</h2>
          <p>
            Net worth is included with Retirement Planning. Enable it with
            Premium to see your balances, debt, and progress together.
          </p>
          <Link className="nl-primary" href="/new/settings/features">
            Manage features <ArrowRight size={16} />
          </Link>
        </section>
      ) : loading ? (
        <div className="nl-panel" role="status">
          Bringing your balances and history together…
        </div>
      ) : error || !data ? (
        <div className="nl-panel" role="alert">
          <h2>Net worth could not load</h2>
          <p>{error || "Please try again."}</p>
          <button className="nl-secondary" onClick={retry}>
            Try again
          </button>
        </div>
      ) : (
        <WorthDashboard report={data} />
      )}
    </div>
  );
}

function WorthDashboard({ report }: { report: WorthReport }) {
  const { today } = useBudget();
  const [range, setRange] = useState<WorthRange>("1y");
  const gradient = useId().replaceAll(":", "");
  const { current, items, snapshots } = report;
  const { baseline, points, drivers, change } = worthPeriod(
    snapshots,
    current,
    today,
    range,
  );
  const owned = current.totalAccounts + current.totalAssets;
  const owed = current.totalCreditCards + current.totalLoans;
  const excluded = items.filter((i) => !i.included);
  const maxComponent = Math.max(
    ...worthGroups.map((g) => Math.abs(current[g.field])),
    1,
  );
  const recorded = [...snapshots]
    .filter((s) => s.snapshot_date <= today)
    .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date));
  const [historyLimit, setHistoryLimit] = useState(12);
  return (
    <>
      <section className="nl-worth-hero" aria-labelledby="worth-current-title">
        <div className="nl-worth-total">
          <p className="nl-eyebrow" id="worth-current-title">
            Current net worth
          </p>
          <div className="nl-worth-number">{money(current.netWorth)}</div>
          <p>Based on your recorded balances today.</p>
          <span className="nl-worth-note">
            A view of your wealth, not money available to spend.
          </span>
        </div>
        <div
          className="nl-worth-equation"
          aria-label="How net worth is calculated"
        >
          <div>
            <span>Cash & assets</span>
            <strong>{money(owned)}</strong>
            <small>What you own</small>
          </div>
          <Minus size={20} aria-hidden="true" />
          <div>
            <span>Cards & loans</span>
            <strong>{money(owed)}</strong>
            <small>What you owe</small>
          </div>
        </div>
      </section>

      <section
        className="nl-panel nl-worth-history"
        aria-labelledby="worth-history-title"
      >
        <div className="nl-worth-section-head">
          <div>
            <p className="nl-eyebrow">The long view</p>
            <h2 id="worth-history-title">Your progress over time</h2>
          </div>
          <div
            className="nl-worth-ranges"
            role="group"
            aria-label="Net worth history period"
          >
            {ranges.map((r) => (
              <button
                key={r.key}
                aria-pressed={range === r.key}
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {baseline && change !== null ? (
          <>
            <div className="nl-worth-change" aria-live="polite">
              <Change amount={change} />
              <span>since {day(baseline.snapshot_date)}</span>
            </div>
            <div
              className="nl-worth-chart"
              role="img"
              aria-label={`Net worth from ${money(Number(baseline.net_worth))} on ${day(baseline.snapshot_date)} to ${money(current.netWorth)} today. Change: ${signed(change)}. Recorded values are also listed below.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={points.map((p) => ({
                    ...p,
                    timestamp: new Date(`${p.date}T12:00:00`).getTime(),
                  }))}
                  margin={{ top: 18, right: 12, bottom: 4, left: 0 }}
                >
                  <defs>
                    <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0.22}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={55}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("en-US", {
                        month: "short",
                        year:
                          baseline &&
                          today.slice(0, 4) !==
                            baseline.snapshot_date.slice(0, 4)
                            ? "2-digit"
                            : undefined,
                        day:
                          baseline &&
                          new Date(`${today}T12:00:00`).getTime() -
                            new Date(
                              `${baseline.snapshot_date}T12:00:00`,
                            ).getTime() <
                            90 * 86400000
                            ? "numeric"
                            : undefined,
                      })
                    }
                  />
                  <YAxis
                    width={60}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={compact}
                    domain={["auto", "auto"]}
                  />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Tooltip
                    content={({ active, payload }) => {
                      const point = payload?.[0]?.payload;
                      return active && point ? (
                        <div className="nl-worth-tooltip">
                          <strong>
                            {point.current
                              ? "Today · recorded balances"
                              : day(point.date)}
                          </strong>
                          <span>{money(point.value)}</span>
                        </div>
                      ) : null;
                    }}
                  />
                  <Area
                    type="linear"
                    dataKey="value"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fill={`url(#${gradient})`}
                    isAnimationActive={false}
                    dot={
                      points.length < 4
                        ? { r: 4, fill: "var(--chart-1)" }
                        : false
                    }
                    activeDot={{
                      r: 5,
                      fill: "var(--chart-1)",
                      stroke: "var(--card)",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="nl-footnote">
              {day(baseline.snapshot_date)} – {day(today)} · Recorded snapshots,
              ending with today’s current balances. Dates reflect the history
              available for this period.
            </p>
          </>
        ) : (
          <div className="nl-worth-empty">
            <ChartNoAxesCombined size={32} aria-hidden="true" />
            <h3>Your starting point is {money(current.netWorth)}</h3>
            <p>
              Your chart will grow as balances are recorded over time. A
              previous day’s snapshot is needed to show a change.
            </p>
            <Link href="/new/accounts">
              Review your balances <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </section>

      <div className="nl-worth-section-head nl-worth-breakdown-title">
        <div>
          <p className="nl-eyebrow">Behind the number</p>
          <h2>What makes up your net worth</h2>
        </div>
        <span>Current recorded values</span>
      </div>
      <div className="nl-worth-breakdown">
        {[false, true].map((debt) => (
          <section className="nl-panel nl-worth-side" key={String(debt)}>
            <div className="nl-worth-side-heading">
              <h3>{debt ? "What you owe" : "What you own"}</h3>
              <strong>{money(debt ? owed : owned)}</strong>
            </div>
            {worthGroups
              .filter((g) => g.debt === debt)
              .map((g) => {
                const Icon = icons[g.key];
                const records = items
                  .filter((i) => i.group === g.key && i.included)
                  .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
                return (
                  <details
                    className={`nl-worth-group nl-worth-group-${g.key}`}
                    key={g.key}
                  >
                    <summary>
                      <Icon size={19} aria-hidden="true" />
                      <div>
                        <span>{g.label}</span>
                        <div className="nl-worth-bar" aria-hidden="true">
                          <i
                            style={{
                              width: `${(Math.abs(current[g.field]) / maxComponent) * 100}%`,
                            }}
                          />
                        </div>
                        <small>
                          {records.length}{" "}
                          {records.length === 1 ? "record" : "records"} included
                        </small>
                      </div>
                      <strong>{money(current[g.field])}</strong>
                      <ChevronDown
                        size={15}
                        className="nl-worth-chevron"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="nl-worth-records">
                      {records.length ? (
                        records.map((item) => (
                          <WorthRecord item={item} key={item.id} />
                        ))
                      ) : (
                        <p>No {g.label.toLowerCase()} included yet.</p>
                      )}
                      <Link className="nl-worth-manage" href={g.href}>
                        Review {g.label.toLowerCase()} <ArrowRight size={14} />
                      </Link>
                    </div>
                  </details>
                );
              })}
          </section>
        ))}
      </div>
      <p className="nl-footnote">
        Bars compare the four current totals. Envelopes divide money already in
        your accounts, so they aren’t added again. All cards are included;
        accounts and loans follow their inclusion settings.
      </p>
      {excluded.length > 0 && (
        <details className="nl-panel nl-worth-excluded">
          <summary>
            {excluded.length}{" "}
            {excluded.length === 1 ? "record is" : "records are"} excluded from
            this total <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <p>
            These accounts or loans have their inclusion setting turned off.
          </p>
          {excluded.map((item) => (
            <WorthRecord item={item} key={`${item.group}-${item.id}`} />
          ))}
        </details>
      )}

      {baseline && (
        <section
          className="nl-panel nl-worth-drivers"
          aria-labelledby="worth-drivers-title"
        >
          <div className="nl-worth-section-head">
            <div>
              <p className="nl-eyebrow">What changed</p>
              <h2 id="worth-drivers-title">The pieces behind your progress</h2>
            </div>
            <span>Since {day(baseline.snapshot_date)}</span>
          </div>
          <div className="nl-worth-driver-grid">
            {drivers.map((g) => (
              <div key={g.key}>
                <span>{g.label}</span>
                <Change amount={g.impact} />
                <p>
                  {money(g.before)} → {money(g.after)}
                </p>
                <small>
                  {g.impact === 0
                    ? "No change in the total"
                    : g.debt
                      ? g.impact > 0
                        ? "Less debt raises net worth"
                        : "More debt lowers net worth"
                      : g.impact > 0
                        ? "A higher balance raises net worth"
                        : "A lower balance lowers net worth"}
                </small>
              </div>
            ))}
          </div>
          <p className="nl-footnote">
            These are balance changes, not investment returns. Deposits,
            payments, value updates, and adding or excluding records can all
            change the total.
          </p>
        </section>
      )}

      <details className="nl-panel nl-worth-recorded-history">
        <summary>
          <span>
            <strong>Recorded history</strong>
            <small>Look up a past total and its breakdown</small>
          </span>
          <ChevronDown size={18} aria-hidden="true" />
        </summary>
        {recorded.length ? (
          <>
            <div
              className="nl-worth-history-scroll"
              tabIndex={0}
              role="region"
              aria-label="Recorded net worth snapshots"
            >
              <table>
                <caption className="sr-only">
                  Recorded net worth snapshots, newest first. Today’s current
                  balances are shown at the top of the report.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Net worth</th>
                    <th scope="col">Cash</th>
                    <th scope="col">Assets</th>
                    <th scope="col">Cards</th>
                    <th scope="col">Loans</th>
                  </tr>
                </thead>
                <tbody>
                  {recorded.slice(0, historyLimit).map((s) => (
                    <tr key={s.snapshot_date}>
                      <th scope="row">{day(s.snapshot_date)}</th>
                      <td>{money(Number(s.net_worth))}</td>
                      <td>{money(Number(s.total_accounts))}</td>
                      <td>{money(Number(s.total_assets))}</td>
                      <td>{money(Number(s.total_credit_cards))}</td>
                      <td>{money(Number(s.total_loans))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {historyLimit < recorded.length && (
              <button
                className="nl-secondary"
                onClick={() => setHistoryLimit((n) => n + 24)}
              >
                Show older records
              </button>
            )}
          </>
        ) : (
          <p>
            No snapshots have been recorded yet. Your current total above is
            calculated directly from your balances.
          </p>
        )}
      </details>
      <div className="nl-worth-guidance">
        <Sprout size={25} aria-hidden="true" />
        <div>
          <h2>A clearer picture starts with current balances</h2>
          <p>
            Update bank balances and available credit often. Review investment,
            property, and loan values when you have a new figure.
          </p>
        </div>
        <Link className="nl-secondary" href="/new/accounts">
          Review accounts <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}

function WorthRecord({ item }: { item: WorthItem }) {
  const path =
    item.group === "assets"
      ? `/new/investments/${item.id}`
      : item.group === "loans"
        ? `/new/loans/${item.id}`
        : "/new/accounts";
  return (
    <Link className="nl-worth-record" href={path}>
      <span>
        <strong>{item.name}</strong>
        <small>
          {item.updatedAt
            ? `Record updated ${day(item.updatedAt)}`
            : "Update date unavailable"}
          {!item.included ? " · Excluded" : ""}
        </small>
      </span>
      <strong>{money(item.value)}</strong>
      <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );
}
function Change({ amount }: { amount: number }) {
  const Icon = amount > 0 ? ArrowUpRight : amount < 0 ? ArrowDownRight : Minus;
  return (
    <strong
      className={`nl-worth-delta ${amount > 0 ? "is-up" : amount < 0 ? "is-down" : ""}`}
    >
      <Icon size={19} aria-hidden="true" />
      {signed(amount)}
    </strong>
  );
}

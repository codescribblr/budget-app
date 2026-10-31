import type { ReactNode } from "react";
import { SkeletonLine } from "./home-skeleton";

/** One announcement per loading region; placeholders never behave like controls. */
export function SkeletonRegion({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`nl-skeleton-region ${className}`}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <div aria-hidden="true">{children}</div>
    </div>
  );
}
export function SkeletonToolbar() {
  return (
    <div className="nl-skeleton-toolbar" aria-hidden="true">
      <SkeletonLine width="min(320px, 60%)" height={38} />
      <SkeletonLine width={132} height={38} />
    </div>
  );
}
export function SkeletonSummary({
  labels = ["Money left", "Monthly budget", "Funded this month"],
}: {
  labels?: string[];
}) {
  return (
    <div className="nl-skeleton-metrics" aria-hidden="true">
      {labels.map((label) => (
        <section className="nl-panel" key={label}>
          <p className="nl-eyebrow">{label}</p>
          <SkeletonLine width="68%" height={32} />
          <SkeletonLine width="86%" />
        </section>
      ))}
    </div>
  );
}
export function SkeletonRows({
  count = 4,
  kind = "list",
  label = "Loading records",
}: {
  count?: number;
  kind?:
    "list" | "envelopes" | "balances" | "transactions" | "activity" | "toggles";
  label?: string;
}) {
  return (
    <SkeletonRegion
      label={label}
      className={`nl-skeleton-rows nl-skeleton-rows-${kind}`}
    >
      {kind === "envelopes" && (
        <div className="nl-envelope-list-heading">
          <span>Envelope</span>
          <span>Money left</span>
          <span>Monthly budget</span>
          <span>Funded this month</span>
        </div>
      )}
      {Array.from({ length: count }, (_, i) => (
        <div
          className={`nl-skeleton-record nl-skeleton-record-${kind} ${kind === "envelopes" ? "nl-envelope-row" : ""}`}
          key={i}
        >
          {(kind === "activity" || kind === "transactions") && (
            <SkeletonLine
              width={32}
              height={32}
              className="nl-skeleton-circle"
            />
          )}
          <div className="nl-skeleton-copy">
            <SkeletonLine width={`${62 + (i % 3) * 10}%`} height={17} />
            <SkeletonLine width="45%" />
            {kind === "envelopes" && <SkeletonLine width="80%" height={10} />}
          </div>
          <div className="nl-skeleton-copy nl-skeleton-value">
            {kind === "envelopes" && (
              <span className="nl-envelope-mobile-label">Money left</span>
            )}
            <SkeletonLine
              width={kind === "toggles" ? 40 : 94}
              height={kind === "balances" ? 42 : kind === "toggles" ? 24 : 23}
              className={kind === "toggles" ? "nl-skeleton-pill" : ""}
            />
            {kind !== "toggles" && (
              <SkeletonLine width={72} height={kind === "envelopes" ? 5 : 10} />
            )}
          </div>
          {kind === "envelopes" && (
            <>
              <div className="nl-skeleton-copy">
                <span className="nl-envelope-mobile-label">Monthly budget</span>
                <SkeletonLine width={75} height={16} />
              </div>
              <div className="nl-skeleton-copy">
                <span className="nl-envelope-mobile-label">
                  Funded this month
                </span>
                <SkeletonLine width={75} height={16} />
              </div>
            </>
          )}
        </div>
      ))}
    </SkeletonRegion>
  );
}
export function SkeletonFields({
  count = 3,
  label = "Loading saved settings",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <SkeletonRegion label={label} className="nl-skeleton-fields">
      {Array.from({ length: count }, (_, i) => (
        <div className="nl-skeleton-copy" key={i}>
          <SkeletonLine width={120 + (i % 2) * 50} />
          <SkeletonLine height={42} />
          <SkeletonLine width="70%" height={10} />
        </div>
      ))}
      <SkeletonLine width={136} height={40} />
    </SkeletonRegion>
  );
}
export function SkeletonChart({ title = "History" }: { title?: string }) {
  return (
    <section className="nl-panel nl-skeleton-chart" aria-hidden="true">
      <h2>{title}</h2>
      <div className="nl-skeleton-chart-plot">
        <SkeletonLine width="100%" height="100%" />
      </div>
      <div className="nl-skeleton-chart-labels">
        {[0, 1, 2, 3].map((n) => (
          <SkeletonLine key={n} width={38} height={9} />
        ))}
      </div>
    </section>
  );
}
export function GoalCardsSkeleton() {
  return (
    <SkeletonRegion label="Loading your goals" className="nl-skeleton-cards">
      {[0, 1, 2].map((i) => (
        <section className="nl-panel nl-skeleton-copy" key={i}>
          <SkeletonLine width="55%" height={20} />
          <SkeletonLine width="80%" />
          <div className="nl-skeleton-toolbar">
            <SkeletonLine width={110} height={28} />
            <SkeletonLine width={90} />
          </div>
          <SkeletonLine height={7} />
          <SkeletonLine width="65%" />
          <SkeletonLine width={124} height={36} />
        </section>
      ))}
    </SkeletonRegion>
  );
}

export function SkeletonTable({
  columns,
  count = 4,
  label = "Loading balances",
}: {
  columns: string[];
  count?: number;
  label?: string;
}) {
  return (
    <SkeletonRegion label={label}>
      <div className="nl-table-wrap">
        <table className="nl-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: count }, (_, i) => (
              <tr key={i}>
                {columns.map((column, j) => (
                  <td key={column}>
                    <div className="nl-skeleton-copy">
                      <SkeletonLine
                        width={j === 0 ? 130 : 88}
                        height={j === columns.length - 1 ? 38 : 16}
                      />
                      {j === 0 && <SkeletonLine width={90} height={10} />}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SkeletonRegion>
  );
}

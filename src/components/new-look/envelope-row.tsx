import Link from "next/link";
import type { Category } from "@/lib/types";
import type { EnvelopeOverview } from "@/lib/envelope-overview";
import { money } from "@/lib/new-look";
import {
  envelopeDetailHref,
  envelopeReviewHref,
} from "@/lib/envelope-navigation";

export function EnvelopeRow({
  category: c,
  overview,
  query = "",
}: {
  category: Category;
  overview: EnvelopeOverview;
  query?: string;
}) {
  return (
    <li className="nl-envelope-row" data-attention={overview.negative}>
      <div className="nl-envelope-name">
        <Link className="nl-row-button" href={envelopeDetailHref(c.id, query)}>
          {c.name}
        </Link>
        <span>{overview.typeLabel}</span>
        <div className="nl-envelope-actions">
          <Link
            className="nl-activity-link"
            aria-label={`View activity for ${c.name}`}
            href={envelopeReviewHref(c.id, "activity", query)}
            scroll={false}
          >
            Activity
          </Link>
          <Link
            className="nl-activity-link"
            aria-label={`${overview.negative ? "Cover shortfall in" : "Move money for"} ${c.name}`}
            href={envelopeReviewHref(c.id, "transfer", query)}
            scroll={false}
          >
            {overview.negative ? "Cover shortfall" : "Move money"}
          </Link>
        </div>
      </div>
      <EnvelopeMoney name={c.name} overview={overview} />
      <div className="nl-envelope-budget">
        <span className="nl-envelope-mobile-label">Monthly budget</span>
        <strong>{money(overview.budget)}</strong>
      </div>
      <div className="nl-envelope-funding">
        <span className="nl-envelope-mobile-label">Funded this month</span>
        <strong>{money(overview.funding)}</strong>
      </div>
    </li>
  );
}

export function EnvelopeMoney({
  name,
  overview: o,
}: {
  name: string;
  overview: EnvelopeOverview;
}) {
  return (
    <div className="nl-envelope-money" data-negative={o.negative}>
      <span className="nl-envelope-mobile-label">Money left</span>
      <strong className={o.negative ? "nl-negative" : ""}>
        {money(o.balance)}
      </strong>
      {o.percent !== null && (
        <div className="nl-envelope-comparison">
          <div
            className="nl-envelope-meter"
            role="meter"
            aria-label={`${name}: money left compared with ${o.referenceLabel.toLowerCase()}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(o.percent)}
            aria-valuetext={`${money(o.balance)} left in this envelope. ${o.meterCaption}.`}
          >
            <span style={{ width: `${o.percent}%` }} />
          </div>
          <span>{o.meterCaption}</span>
        </div>
      )}
      {o.balanceNote && (
        <span
          className={o.negative ? "nl-negative" : "nl-envelope-balance-note"}
        >
          {o.balanceNote}
        </span>
      )}
      {o.kind === "goal" && (
        <span className="nl-envelope-reference">Set aside for your goal</span>
      )}
    </div>
  );
}

"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { HomeSkeleton, SkeletonLine } from "./home-skeleton";
import {
  SkeletonRegion,
  SkeletonRows,
  SkeletonFields,
  SkeletonSummary,
  SkeletonToolbar,
  SkeletonChart,
  SkeletonTable,
  GoalCardsSkeleton,
} from "./skeleton-sections";
import { settingsSections } from "./settings/catalog";

export type SkeletonView =
  | "envelopes"
  | "envelope-detail"
  | "envelope-setup"
  | "accounts"
  | "cash-detail"
  | "card-detail"
  | "pending-checks"
  | "account-setup"
  | "transactions"
  | "imports"
  | "import-review"
  | "import-mapping"
  | "income"
  | "plan"
  | "payday"
  | "goals"
  | "loans"
  | "investments"
  | "holding-detail"
  | "reports"
  | "plan-report"
  | "net-worth"
  | "checkin"
  | "settings";
const headings: Record<SkeletonView, [string, string, string]> = {
  envelopes: [
    "Envelopes · your spending money",
    "What’s in your envelopes",
    "See what you have left before you spend. Cover shortfalls, move extra money, or add to your envelopes.",
  ],
  "envelope-detail": ["Your envelope", "Envelope details", ""],
  "envelope-setup": [
    "Envelopes · setup",
    "Give each envelope a clear purpose",
    "Choose what you’re setting money aside for, shape the funding plan, and retire envelopes you no longer use.",
  ],
  accounts: [
    "Accounts · keep balances current",
    "One balance pass. All your accounts.",
    "Check your bank balances, then copy the available credit shown for each card. We’ll calculate what’s owed. Import transactions separately to update spending in your envelopes.",
  ],
  "cash-detail": [
    "Your account",
    "Account details",
    "Know what’s here, keep the balance current, and review its history.",
  ],
  "card-detail": [
    "Your credit card",
    "Credit card details",
    "Keep what you owe clear, review changes, and find the purchases behind them.",
  ],
  "pending-checks": [
    "Accounts · between balances",
    "Pending checks & deposits",
    "Keep track of money that isn’t reflected in your recorded bank balances yet.",
  ],
  "account-setup": [
    "Accounts · setup",
    "Choose what belongs in your budget",
    "Add your bank accounts and cards, keep their details current, and decide which balances count toward available to save.",
  ],
  transactions: [
    "Your spending history",
    "Transactions",
    "Find a purchase, see where it belongs, and make the details right.",
  ],
  imports: [
    "Import & review",
    "Bring your spending into focus",
    "Upload bank or card CSVs, then review transactions before importing.",
  ],
  "import-review": ["Import & review", "Review transactions", ""],
  "import-mapping": ["Import & review", "Map CSV Columns", ""],
  income: [
    "Income planning",
    "Know what you can plan with",
    "Bring your income sources together into a monthly estimate. Use it to set funding targets you can sustain.",
  ],
  plan: [
    "Your monthly plan",
    "A plan you can keep up with",
    "Set your regular funding targets using what you’ve learned from real spending. Targets guide future allocations; editing them doesn’t move any money.",
  ],
  payday: [
    "When you get paid",
    "Give this paycheck a job",
    "Allocate money already reflected in your account balances. Your monthly plan guides the choices; you decide what gets funded now.",
  ],
  goals: [
    "Goals & buffer",
    "Make room for what’s next",
    "Build breathing room and make steady progress toward the things that matter to you.",
  ],
  loans: [
    "Accounts · loans",
    "A clear view of what you owe",
    "Keep debt balances current, see your progress, and connect payments to your budget.",
  ],
  investments: [
    "Accounts · investments & assets",
    "Give your future a place to grow",
    "Track investments and other assets separately from the cash you use for everyday budgeting.",
  ],
  "holding-detail": ["Your accounts", "Account details", ""],
  reports: [
    "Reports · understand your budget",
    "See what deserves your attention",
    "Follow the money, notice what changed, and make a plan that fits real life.",
  ],
  "plan-report": [
    "Reports · understand your budget",
    "See what deserves your attention",
    "Follow the money, notice what changed, and make a plan that fits real life.",
  ],
  "net-worth": [
    "Reports · the bigger picture",
    "Your net worth",
    "Step back from the monthly budget. See what you’ve built and what you still owe.",
  ],
  checkin: ["Your routine", "Your check-in", ""],
  settings: [
    "Your workspace",
    "A budget that fits you",
    "Manage your budget tools, connections, and account.",
  ],
};
export function skeletonViewForPath(path: string): SkeletonView {
  const [, , area, detail] = path.split("/");
  if (area === "budget")
    return detail === "manage"
      ? "envelope-setup"
      : detail
        ? "envelope-detail"
        : "envelopes";
  if (area === "accounts")
    return detail === "manage"
      ? "account-setup"
      : detail
        ? "cash-detail"
        : "accounts";
  if (area === "credit-cards") return "card-detail";
  if (area === "imports")
    return detail === "map-columns"
      ? "import-mapping"
      : detail
        ? "import-review"
        : "imports";
  if (area === "reports")
    return detail === "net-worth" ? "net-worth" : "reports";
  if (area === "loans" || area === "investments")
    return detail ? "holding-detail" : area;
  if (area === "check-in") return "checkin";
  return area && area in headings ? (area as SkeletonView) : "envelopes";
}
function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="nl-panel nl-skeleton-panel">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
function Hero({ label, split = false }: { label: string; split?: boolean }) {
  return (
    <section
      className={`nl-panel nl-skeleton-hero ${split ? "nl-skeleton-split" : ""}`}
    >
      <div className="nl-skeleton-copy">
        <p className="nl-eyebrow">{label}</p>
        <SkeletonLine width={210} height={42} />
        <SkeletonLine width="min(380px, 90%)" />
        <SkeletonLine width={130} height={32} />
      </div>
      {split && <SkeletonFields count={2} />}
    </section>
  );
}
function SettingsContent({ section = "" }: { section?: string }) {
  if (section === "subscription")
    return (
      <>
        <Hero label="Your plan" />
        <div className="nl-skeleton-split">
          <Panel title="Free">
            <SkeletonRows count={3} />
          </Panel>
          <Panel title="Premium">
            <SkeletonRows count={4} />
          </Panel>
        </div>
      </>
    );
  if (["notifications", "features", "dashboard"].includes(section))
    return (
      <Panel>
        <SkeletonToolbar />
        <SkeletonRows kind="toggles" count={5} label="Loading preferences" />
      </Panel>
    );
  if (["profile", "account", "password", "integrations"].includes(section))
    return (
      <Panel>
        <SkeletonFields count={section === "profile" ? 1 : 2} />
      </Panel>
    );
  if (!section)
    return (
      <>
        <SkeletonToolbar />
        <div className="nl-skeleton-split">
          {[0, 1, 2, 3].map((n) => (
            <Panel key={n}>
              <SkeletonRows count={2} />
            </Panel>
          ))}
        </div>
      </>
    );
  return (
    <Panel>
      <SkeletonToolbar />
      <SkeletonRows
        count={section === "import-templates" ? 3 : 4}
        label="Loading settings records"
      />
    </Panel>
  );
}
function ViewContent({
  view,
  settingsSection,
}: {
  view: SkeletonView;
  settingsSection?: string;
}) {
  switch (view) {
    case "envelopes":
      return (
        <>
          <section className="nl-envelope-overview">
            <div className="nl-skeleton-copy">
              <SkeletonLine width={150} height={22} />
              <p>Your budget and funding for this month.</p>
            </div>
            <div className="nl-envelope-fund-action">
              <div className="nl-skeleton-copy">
                <span>Available to save</span>
                <SkeletonLine width={110} height={26} />
              </div>
              <SkeletonLine width={150} height={40} />
            </div>
          </section>
          <SkeletonToolbar />
          <div className="nl-envelope-list">
            <SkeletonRows kind="envelopes" count={6} />
          </div>
        </>
      );
    case "accounts":
      return (
        <>
          <SkeletonSummary
            labels={["Recorded cash", "Credit cards owed", "Available to save"]}
          />
          <section className="nl-balance-section">
            <h2>Bank & cash accounts</h2>
            <SkeletonTable
              columns={[
                "Account",
                "Included in totals",
                "Recorded balance",
                "Balance now",
              ]}
              count={3}
            />
          </section>
          <section className="nl-balance-section">
            <h2>Credit cards</h2>
            <SkeletonTable
              columns={[
                "Card",
                "Credit limit",
                "Calculated owed",
                "Available credit now",
              ]}
              count={2}
            />
          </section>
        </>
      );
    case "cash-detail":
    case "card-detail":
      return (
        <div className="nl-cash-detail-grid">
          <div className="nl-cash-main">
            <section className="nl-panel nl-cash-hero">
              <div className="nl-cash-hero-top">
                <SkeletonLine width={48} height={48} />
                <SkeletonLine width={132} height={24} />
              </div>
              <p className="nl-eyebrow">
                {view === "card-detail"
                  ? "Calculated amount owed"
                  : "Recorded balance"}
              </p>
              <div className="nl-cash-amount">
                <SkeletonLine width={220} height={58} />
              </div>
              <SkeletonLine width="90%" height={18} />
              <div style={{ marginTop: 18 }}>
                <SkeletonLine
                  width={view === "card-detail" ? 220 : 170}
                  height={40}
                />
              </div>
              {view === "card-detail" && (
                <div className="nl-cash-credit">
                  {["Available credit", "Credit limit"].map((label) => (
                    <div key={label}>
                      <span>{label}</span>
                      <SkeletonLine width={120} height={24} />
                    </div>
                  ))}
                  <div className="nl-credit-track">
                    <SkeletonLine width="100%" height={7} />
                  </div>
                  <p>
                    <SkeletonLine width="60%" height={16} />
                  </p>
                </div>
              )}
            </section>
            <Panel title="Account activity">
              <SkeletonToolbar />
              <SkeletonChart />
              <SkeletonRows kind="activity" count={4} />
            </Panel>
          </div>
          <aside className="nl-cash-aside">
            <Panel title="In your budget">
              <SkeletonRows count={2} />
            </Panel>
            {view === "card-detail" && (
              <Panel title="Last statement">
                <SkeletonLine width={120} height={26} />
                <SkeletonLine width="80%" />
              </Panel>
            )}
            {view === "card-detail" && (
              <Panel title="Carried balance to repay">
                <SkeletonRows count={2} />
              </Panel>
            )}
            <Panel title="Keep this account current">
              <SkeletonRows count={3} />
            </Panel>
          </aside>
        </div>
      );
    case "pending-checks":
      return (
        <>
          <div className="nl-pending-intro nl-panel">
            How pending money affects your budget
          </div>
          <SkeletonSummary
            labels={[
              "Payments not yet in balances",
              "Deposits not yet in balances",
              "Available to save",
            ]}
          />
          <SkeletonToolbar />
          <SkeletonRows kind="activity" count={4} />
        </>
      );
    case "account-setup":
    case "envelope-setup":
      return (
        <>
          <SkeletonToolbar />
          <Panel>
            <SkeletonRows count={5} />
          </Panel>
        </>
      );
    case "plan":
      return (
        <>
          <SkeletonSummary
            labels={[
              "Monthly net income",
              "Planned monthly funding",
              "Income less plan",
            ]}
          />
          <SkeletonTable
            columns={[
              "Envelope",
              "Planning basis",
              "Monthly equivalent",
              "Funding target",
            ]}
            count={6}
            label="Loading monthly funding targets"
          />
        </>
      );
    case "transactions":
      return (
        <>
          <SkeletonToolbar />
          <SkeletonSummary labels={["Spent", "Income", "Transactions"]} />
          <Panel>
            <SkeletonToolbar />
            <SkeletonRows kind="transactions" count={6} />
          </Panel>
        </>
      );
    case "imports":
      return (
        <>
          <Panel title="Upload transactions">
            <div className="nl-skeleton-dropzone">
              <SkeletonLine width={36} height={36} />
              <SkeletonLine width="min(280px, 85%)" />
              <SkeletonLine width={140} height={36} />
            </div>
          </Panel>
          <Panel title="Queued imports">
            <SkeletonRows count={3} />
          </Panel>
        </>
      );
    case "import-review":
      return (
        <>
          <div className="nl-category-intro">
            <div>
              <h2>A place for every purchase</h2>
              <p>
                Confirm the uncertain ones. Your choices are saved as you go.
              </p>
            </div>
          </div>
          <SkeletonToolbar />
          <SkeletonRows kind="transactions" count={6} />
          <SkeletonLine width="100%" height={72} />
        </>
      );
    case "import-mapping":
      return (
        <>
          <Panel title="File details">
            <SkeletonFields count={2} />
          </Panel>
          <Panel title="Match your columns">
            <SkeletonRows kind="balances" count={5} />
          </Panel>
        </>
      );
    case "income":
      return (
        <>
          <Hero label="Estimated monthly net income" split />
          <div className="nl-two-column">
            <Panel title="Income sources">
              <SkeletonRows count={3} />
            </Panel>
            <Panel title="Your monthly plan">
              <SkeletonRows count={3} />
            </Panel>
          </div>
        </>
      );
    case "payday":
      return (
        <div className="nl-two-column">
          <Panel title="Money to allocate">
            <SkeletonFields count={3} />
          </Panel>
          <Panel title="Your monthly plan">
            <SkeletonRows count={4} />
          </Panel>
        </div>
      );
    case "goals":
      return (
        <div className="nl-two-column">
          <div>
            <SkeletonToolbar />
            <GoalCardsSkeleton />
          </div>
          <Panel title="Income buffer">
            <SkeletonFields count={2} />
          </Panel>
        </div>
      );
    case "loans":
    case "investments":
      return (
        <>
          <Hero
            label={view === "loans" ? "Recorded debt" : "Recorded value"}
            split
          />
          <SkeletonToolbar />
          <Panel>
            <SkeletonRows count={4} />
          </Panel>
        </>
      );
    case "holding-detail":
    case "envelope-detail":
      return (
        <>
          <Hero
            label={
              view === "envelope-detail" ? "Money left" : "Recorded balance"
            }
            split
          />
          <div className="nl-two-column">
            <Panel title="Activity">
              <SkeletonRows kind="activity" count={5} />
            </Panel>
            <Panel
              title={
                view === "envelope-detail"
                  ? "Your funding plan"
                  : "Account details"
              }
            >
              <SkeletonRows count={3} />
            </Panel>
          </div>
        </>
      );
    case "reports":
      return (
        <>
          <Hero label="Recorded spending" split />
          <div className="nl-skeleton-split">
            <SkeletonChart title="Where your money went" />
            <Panel title="Your envelopes">
              <SkeletonRows count={4} />
            </Panel>
          </div>
        </>
      );
    case "plan-report":
      return (
        <>
          <SkeletonSummary
            labels={["Monthly budget", "Funded this month", "Money left"]}
          />
          <Panel>
            <SkeletonRows
              kind="envelopes"
              count={5}
              label="Loading monthly plan comparison"
            />
          </Panel>
        </>
      );
    case "net-worth":
      return (
        <>
          <Hero label="Your net worth" split />
          <SkeletonChart title="Your progress over time" />
          <div className="nl-skeleton-split">
            <Panel title="What you own">
              <SkeletonRows count={3} />
            </Panel>
            <Panel title="What you owe">
              <SkeletonRows count={3} />
            </Panel>
          </div>
        </>
      );
    case "checkin":
      return (
        <div className="nl-checkin-summary">
          <SkeletonLine width={56} height={56} className="nl-skeleton-circle" />
          <div className="nl-skeleton-copy">
            <SkeletonLine width="70%" height={30} />
            <SkeletonLine />
            <SkeletonLine width="80%" />
          </div>
          <SkeletonRows count={3} />
          <SkeletonLine width={180} height={42} />
        </div>
      );
    case "settings":
      return <SettingsContent section={settingsSection} />;
  }
}
/** Full route fallback or just the data region beneath a page's real heading. */
export function PageSkeleton({
  heading = true,
  variant,
  view,
  path,
}: {
  heading?: boolean;
  variant?: "list" | "report" | "settings" | "detail";
  view?: SkeletonView;
  path?: string;
}) {
  const pathname = usePathname();
  const route = path ?? pathname;
  if (route === "/new" && !view && heading) return <HomeSkeleton />;
  const kind =
    view ?? (variant === "settings" ? "settings" : skeletonViewForPath(route));
  const sectionId = kind === "settings" ? route.split("/")[3] : undefined;
  const section = settingsSections.find((item) => item.id === sectionId);
  const [eyebrow, title, description] = headings[kind];
  const cashDetail = kind === "cash-detail" || kind === "card-detail";
  const dynamicTitle =
    kind === "envelope-detail" || kind === "holding-detail" || cashDetail;
  return (
    <SkeletonRegion
      label={`Loading ${section?.title ?? kind.replaceAll("-", " ")}`}
      className={`nl-page-skeleton nl-page-skeleton-${kind}`}
    >
      {heading && (cashDetail || kind === "pending-checks") && (
        <SkeletonToolbar />
      )}
      {heading && cashDetail && (
        <div className="nl-cash-back">
          <SkeletonLine width={120} height={18} />
        </div>
      )}
      {heading && (
        <div className="nl-page-heading">
          <div>
            <p className="nl-eyebrow">
              {section ? `Settings · ${section.scope}` : eyebrow}
            </p>
            {dynamicTitle ? (
              <h1>
                <SkeletonLine width="min(360px, 80vw)" height={40} />
              </h1>
            ) : (
              <h1>{section?.title ?? title}</h1>
            )}
            {(section?.detail || description) && (
              <p>{section?.detail ?? description}</p>
            )}
          </div>
          <SkeletonLine width={134} height={40} />
        </div>
      )}
      {heading && kind === "settings" && section ? (
        <div className="nl-skeleton-settings-layout">
          <aside className="nl-skeleton-copy">
            {settingsSections.map((item) => (
              <SkeletonLine key={item.id} width="80%" height={18} />
            ))}
          </aside>
          <div className="nl-skeleton-page-content">
            <ViewContent view={kind} settingsSection={sectionId} />
          </div>
        </div>
      ) : (
        <div className="nl-skeleton-page-content">
          <ViewContent view={kind} settingsSection={sectionId} />
        </div>
      )}
    </SkeletonRegion>
  );
}
/** Shared classic/new screens opt into section placeholders without changing classic. */
export function ContentLoading({
  children,
  kind = "list",
  label = "Loading details",
}: {
  children: ReactNode;
  kind?: "list" | "activity" | "fields" | "chart" | "page";
  label?: string;
}) {
  const modern = usePathname().startsWith("/new");
  if (!modern) return children;
  if (kind === "page") return <PageSkeleton heading={false} />;
  return kind === "fields" ? (
    <SkeletonFields label={label} />
  ) : kind === "chart" ? (
    <SkeletonRegion label={label}>
      <SkeletonChart title="" />
    </SkeletonRegion>
  ) : (
    <SkeletonRows kind={kind} count={3} label={label} />
  );
}

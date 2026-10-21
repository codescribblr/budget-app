"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Landmark,
  Plus,
  Pencil,
  Sprout,
  Target,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useFeatures } from "@/contexts/FeatureContext";
import type { GoalWithDetails, Loan, NonCashAsset } from "@/lib/types";
import { cents, money } from "@/lib/new-look";
import { getAssetTypeLabel } from "@/lib/non-cash-asset-types";
import {
  holdingEndpoint,
  holdingValue,
  loanReduction,
  paymentDay,
  recordedDate,
  type Holding,
  type HoldingKind,
} from "@/lib/long-term-planning";
import { DataBoundary, budgetRequest, useBudget } from "./budget-context";
import { PageHeading, ReadOnlyNotice } from "./common";
import { AccountNavigation } from "./account-navigation";
import { HoldingEditor } from "./holding-editor";
import { HoldingHistory } from "./holding-history";
import { NativeSelect } from "./native-select";

export function GuidedHoldings({
  kind,
  id,
}: {
  kind: HoldingKind;
  id?: number;
}) {
  const features = useFeatures();
  const enabled =
    kind === "loans"
      ? features.hasPremium && features.isFeatureEnabled("loans")
      : features.isFeatureEnabled("non_cash_assets");
  return (
    <DataBoundary>
      <AccountNavigation />
      {features.loading ? (
        <p role="status">Loading account tools…</p>
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
        <div className="nl-panel">
          <h1>{kind === "loans" ? "Loan tracking" : "Investments & assets"}</h1>
          <p>
            {kind === "loans"
              ? "Enable Loans with Premium to track debt and connect it to your goals."
              : "Enable Non-Cash Assets to track investments and property separately from spendable money."}
          </p>
          <Link className="nl-primary" href="/new/settings/features">
            Manage features
          </Link>
        </div>
      ) : (
        <HoldingsContent kind={kind} id={id} />
      )}
    </DataBoundary>
  );
}
function HoldingsContent({ kind, id }: { kind: HoldingKind; id?: number }) {
  const { data, canEdit, refresh } = useBudget();
  const features = useFeatures();
  const params = useSearchParams();
  const [items, setItems] = useState<Holding[]>([]),
    [assets, setAssets] = useState<NonCashAsset[]>([]),
    [loans, setLoans] = useState<Loan[]>([]),
    [goals, setGoals] = useState<GoalWithDetails[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [relatedError, setRelatedError] = useState(false),
    [revision, setRevision] = useState(0);
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  const generation = useRef(0);
  const loan = kind === "loans";
  const goalsEnabled =
    features.hasPremium && features.isFeatureEnabled("goals");
  const loanEnabled = features.hasPremium && features.isFeatureEnabled("loans");
  const assetEnabled = features.isFeatureEnabled("non_cash_assets");
  const load = useCallback(async () => {
    const token = ++generation.current;
    setLoading(true);
    setError("");
    setRelatedError(false);
    const result = await Promise.allSettled([
      budgetRequest<Holding[]>(holdingEndpoint(kind)),
      goalsEnabled
        ? budgetRequest<GoalWithDetails[]>("/api/goals")
        : Promise.resolve([]),
      kind === "loans" && assetEnabled
        ? budgetRequest<NonCashAsset[]>("/api/non-cash-assets")
        : kind === "investments" && loanEnabled
          ? budgetRequest<Loan[]>("/api/loans")
          : Promise.resolve([]),
    ]);
    if (token !== generation.current) return;
    const primary = result[0];
    if (primary.status === "fulfilled" && Array.isArray(primary.value)) {
      setItems(primary.value);
      if (kind === "loans") setLoans(primary.value as Loan[]);
      else setAssets(primary.value as NonCashAsset[]);
    } else setError("Your records could not load. Please try again.");
    const linked = result[1];
    setGoals(
      linked.status === "fulfilled" && Array.isArray(linked.value)
        ? linked.value
        : [],
    );
    const other = result[2];
    if (kind === "loans")
      setAssets(
        other.status === "fulfilled" && Array.isArray(other.value)
          ? (other.value as NonCashAsset[])
          : [],
      );
    else
      setLoans(
        other.status === "fulfilled" && Array.isArray(other.value)
          ? (other.value as Loan[])
          : [],
      );
    setRelatedError(
      result
        .slice(1)
        .some((r) => r.status === "rejected" || !Array.isArray(r.value)),
    );
    setLoading(false);
    setRevision((r) => r + 1);
  }, [kind, goalsEnabled, loanEnabled, assetEnabled]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load, data?.identity.activeAccountId]);
  const selected = items.find((i) => i.id === id);
  const action = params.get("action");
  const listPath = `/new/${kind}`;
  const path = id ? `${listPath}/${id}` : listPath;
  function setAction(value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("action", value);
    else next.delete("action");
    window.history[value ? "pushState" : "replaceState"](
      null,
      "",
      `${path}${next.size ? `?${next}` : ""}`,
    );
  }
  const selection =
    action === "new"
      ? undefined
      : action === "edit" || action === "balance"
        ? selected
        : undefined;
  const editing =
    action === "new" ||
    (!!selected && (action === "edit" || action === "balance"));
  const sum = (values: Holding[]) =>
    values.reduce((s, i) => s + cents(holdingValue(i)), 0) / 100;
  const total = sum(items);
  const activeLoans = loans.filter((l) => Number(l.balance) > 0);
  const goalsFor = (item: Holding) =>
    goals.filter((g) =>
      loan
        ? g.linked_loan_id === item.id
        : g.linked_non_cash_asset_id === item.id,
    );
  const matching = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" ||
        (loan
          ? filter === "active"
            ? holdingValue(i) > 0
            : holdingValue(i) === 0
          : "asset_type" in i && i.asset_type === filter)),
  );
  const title = loan
    ? "A clear view of what you owe"
    : "Give your future a place to grow";
  return (
    <div className="nl-holdings">
      {id ? (
        <div className="nl-detail-topline">
          <Link className="nl-detail-back" href={listPath}>
            <ArrowLeft size={16} />
            {loan ? "All loans" : "All investments & assets"}
          </Link>
          <Link className="nl-secondary" href="/new/goals">
            Goals & buffer <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <PageHeading
          eyebrow={
            loan ? "Accounts · loans" : "Accounts · investments & assets"
          }
          title={title}
          description={
            loan
              ? "Keep debt balances current, see your progress, and connect payments to your budget."
              : "Track investments and other assets separately from the cash you use for everyday budgeting."
          }
        >
          <button
            className="nl-primary"
            disabled={!canEdit || loading || !!error}
            onClick={() => setAction("new")}
          >
            <Plus size={16} />
            {loan ? "Add loan" : "Add investment or asset"}
          </button>
        </PageHeading>
      )}
      <ReadOnlyNotice />
      {loading ? (
        <div className="nl-panel" role="status">
          Loading {loan ? "loans" : "investments & assets"}…
        </div>
      ) : error ? (
        <div className="nl-panel" role="alert">
          <h2>Unable to load your records</h2>
          <p>{error}</p>
          <button className="nl-secondary" onClick={() => void load()}>
            Try again
          </button>
        </div>
      ) : id && !selected ? (
        <div className="nl-panel">
          <h1>Record unavailable</h1>
          <p>
            This record may have been removed or belong to a different budget.
          </p>
          <Link href={listPath}>Return to accounts</Link>
        </div>
      ) : (
        <>
          {relatedError && (
            <div className="nl-notice" role="alert">
              Linked goals or accounts could not load.{" "}
              <button className="nl-text-button" onClick={() => void load()}>
                Retry linked information
              </button>
            </div>
          )}
          {selected ? (
            <HoldingDetail
              kind={kind}
              item={selected}
              goals={goalsFor(selected)}
              assets={assets}
              loans={loans}
              canEdit={canEdit}
              goalsEnabled={goalsEnabled}
              relatedError={relatedError}
              revision={revision}
              onAction={setAction}
            />
          ) : (
            <>
              <section
                className="nl-position-hero"
                aria-label={loan ? "Loan overview" : "Asset overview"}
              >
                <div>
                  <p className="nl-eyebrow">
                    {loan ? "Total remaining debt" : "Total recorded value"}
                  </p>
                  <strong className="nl-position-total">{money(total)}</strong>
                  <p>
                    {loan
                      ? "Across your loans. Credit cards are on Cash & cards."
                      : "Investments and other assets. None of this is included in available to save."}
                  </p>
                </div>
                <div className="nl-position-facts">
                  <div>
                    <span>
                      {loan
                        ? "Minimum monthly payments"
                        : "Investment accounts"}
                    </span>
                    <strong>
                      {money(
                        loan
                          ? activeLoans.reduce(
                              (s, l) =>
                                s + cents(Number(l.minimum_payment || 0)),
                              0,
                            ) / 100
                          : sum(
                              items.filter(
                                (i) =>
                                  "asset_type" in i &&
                                  i.asset_type === "investment",
                              ),
                            ),
                      )}
                    </strong>
                    <small>
                      {loan
                        ? activeLoans.some((l) => l.minimum_payment == null)
                          ? `${activeLoans.filter((l) => l.minimum_payment == null).length} active loans without a saved payment amount`
                          : "Saved minimums; extra payments are separate"
                        : "Current value, not contributions or returns"}
                    </small>
                  </div>
                  <div>
                    <span>{loan ? "Active loans" : "Other assets"}</span>
                    <strong>
                      {loan
                        ? activeLoans.length
                        : money(
                            sum(
                              items.filter(
                                (i) =>
                                  "asset_type" in i &&
                                  i.asset_type !== "investment",
                              ),
                            ),
                          )}
                    </strong>
                    <small>
                      {loan
                        ? "Balances greater than zero"
                        : "Property, vehicles, and other recorded assets"}
                    </small>
                  </div>
                </div>
              </section>
              <div className="nl-holdings-toolbar">
                <label className="nl-search">
                  <input
                    aria-label={
                      loan ? "Search loans" : "Search investments and assets"
                    }
                    placeholder={
                      loan ? "Find a loan…" : "Find an investment or asset…"
                    }
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <NativeSelect
                  aria-label={loan ? "Loan status" : "Asset type"}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">
                    {loan ? "All loans" : "All types"}
                  </option>
                  {loan ? (
                    <>
                      <option value="active">Active loans</option>
                      <option value="paid">Zero balance</option>
                    </>
                  ) : (
                    Array.from(new Set(assets.map((a) => a.asset_type))).map(
                      (t) => (
                        <option key={t} value={t}>
                          {getAssetTypeLabel(t)}
                        </option>
                      ),
                    )
                  )}
                </NativeSelect>
                <button
                  className="nl-icon-button"
                  aria-label="Refresh records"
                  onClick={() => void load()}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              <div className="nl-holding-list" hidden={!matching.length}>
                {matching.map((item) => {
                  const reduction =
                    "balance" in item ? loanReduction(item) : null;
                  const linked = goalsFor(item);
                  return (
                    <article className="nl-holding-row" key={item.id}>
                      <span className="nl-holding-emblem">
                        {loan ? <Landmark size={22} /> : <Sprout size={22} />}
                      </span>
                      <div className="nl-holding-name">
                        <Link href={`${listPath}/${item.id}`}>
                          {item.name}
                          <ArrowRight size={15} />
                        </Link>
                        <p>
                          {"balance" in item
                            ? [
                                item.institution,
                                paymentDay(item.payment_due_date),
                              ]
                                .filter(Boolean)
                                .join(" · ")
                            : getAssetTypeLabel(item.asset_type)}
                        </p>
                        {linked.length > 0 && (
                          <span className="nl-tag">
                            <Target size={12} />
                            {linked.length === 1
                              ? linked[0].name
                              : `${linked.length} linked goals`}
                          </span>
                        )}
                      </div>
                      <div className="nl-holding-amount">
                        <strong>{money(holdingValue(item))}</strong>
                        <span>{loan ? "remaining" : "recorded value"}</span>
                      </div>
                      <div className="nl-holding-context">
                        {reduction ? (
                          <>
                            <strong>
                              {money(Math.abs(reduction.reduction))}{" "}
                              {reduction.reduction >= 0
                                ? "less debt"
                                : "above starting debt"}
                            </strong>
                            <div className="nl-meter">
                              <span
                                style={{
                                  width: `${Math.max(0, Math.min(100, reduction.percent))}%`,
                                }}
                              />
                            </div>
                            <small>
                              Compared with {money(reduction.start)} original
                              debt
                            </small>
                          </>
                        ) : (
                          <>
                            <span>Record updated</span>
                            <strong>{recordedDate(item.updated_at)}</strong>
                          </>
                        )}
                      </div>
                      <Link
                        className="nl-secondary"
                        href={`${listPath}/${item.id}?action=balance`}
                      >
                        {loan ? "Update balance" : "Update value"}
                      </Link>
                    </article>
                  );
                })}
              </div>
              {!matching.length && (
                <div className="nl-panel nl-position-empty">
                  <Sprout size={32} />
                  <h2>
                    {items.length
                      ? "No matching records"
                      : loan
                        ? "Start with the balance your lender shows"
                        : "Start with an account or asset you want to track"}
                  </h2>
                  <p>
                    {items.length
                      ? "Try another name or filter."
                      : loan
                        ? "Add your loan, then connect a goal and payment envelope when you’re ready."
                        : "Add an investment account, retirement account, or other asset. You can update its value whenever you review a statement."}
                  </p>
                  {!items.length && (
                    <button
                      className="nl-primary"
                      disabled={!canEdit}
                      onClick={() => setAction("new")}
                    >
                      {loan ? "Add your first loan" : "Add your first asset"}
                    </button>
                  )}
                </div>
              )}
              <div className="nl-position-guidance">
                <div>
                  <h2>
                    {loan
                      ? "One payment, two different records"
                      : "A monthly check is usually enough"}
                  </h2>
                  <p>
                    {loan
                      ? "Your imported payment shows where budget money went. The lender’s updated balance shows how much debt remains after interest and other changes. Updating one does not update the other."
                      : "Use a statement or current valuation when you review your goals. A higher balance may reflect new contributions as well as changes in market value."}
                  </p>
                </div>
                <Link
                  className="nl-secondary"
                  href={loan ? "/new/transactions" : "/new/goals"}
                >
                  {loan ? "Review payments" : "Review goals"}{" "}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </>
          )}
        </>
      )}
      {editing && !loading && !error && (
        <HoldingEditor
          key={`${action}:${selection?.id || "new"}`}
          kind={kind}
          item={selection}
          balanceOnly={action === "balance"}
          assets={assets}
          canEdit={canEdit && (!relatedError || action === "balance")}
          onClose={() => setAction(null)}
          onSave={async (payload) => {
            const saved = await budgetRequest<Holding>(
              `${holdingEndpoint(kind)}${selection ? `/${selection.id}` : ""}`,
              payload,
              selection ? "PATCH" : "POST",
            );
            toast.success(
              selection
                ? "Recorded details saved."
                : loan
                  ? "Loan added."
                  : "Asset added.",
            );
            setAction(null);
            // Close a successful write even if refreshing fails; never invite a duplicate create.
            await Promise.all([
              load(),
              refresh().catch(() =>
                toast.error(
                  "Saved, but budget totals could not refresh. Reload before making more changes.",
                ),
              ),
            ]);
            if (!selection && saved?.id) {
              window.location.assign(`${listPath}/${saved.id}`);
            }
          }}
        />
      )}
    </div>
  );
}
function HoldingDetail({
  kind,
  item,
  goals,
  assets,
  loans,
  canEdit,
  goalsEnabled,
  relatedError,
  revision,
  onAction,
}: {
  kind: HoldingKind;
  item: Holding;
  goals: GoalWithDetails[];
  assets: NonCashAsset[];
  loans: Loan[];
  canEdit: boolean;
  goalsEnabled: boolean;
  relatedError: boolean;
  revision: number;
  onAction: (action: string) => void;
}) {
  const loan = "balance" in item ? item : null;
  const asset = "current_value" in item ? item : null;
  const reduction = loan ? loanReduction(loan) : null;
  const linkedAsset = loan
    ? assets.find((a) => a.id === loan.linked_non_cash_asset_id)
    : null;
  const securedLoans = asset
    ? loans.filter((l) => l.linked_non_cash_asset_id === asset.id)
    : [];
  return (
    <>
      <header className="nl-detail-heading">
        <span className="nl-detail-emblem">
          {loan ? <Landmark size={26} /> : <Sprout size={26} />}
        </span>
        <div>
          <p className="nl-eyebrow">
            {loan
              ? loan.institution || "Loan"
              : getAssetTypeLabel(asset!.asset_type)}
          </p>
          <h1>{item.name}</h1>
        </div>
        <button
          className="nl-secondary"
          disabled={!canEdit || relatedError}
          onClick={() => onAction("edit")}
        >
          <Pencil size={14} />
          Edit details
        </button>
      </header>
      <section className="nl-position-hero">
        <div>
          <p className="nl-eyebrow">
            {loan ? "Amount still owed" : "Current recorded value"}
          </p>
          <strong className="nl-position-total">
            {money(holdingValue(item))}
          </strong>
          <p>Record updated {recordedDate(item.updated_at)}</p>
          <button
            className="nl-primary"
            disabled={!canEdit}
            onClick={() => onAction("balance")}
          >
            {loan ? "Update amount owed" : "Update value"}
          </button>
        </div>
        <div className="nl-position-facts">
          {loan ? (
            <>
              <div>
                <span>Minimum monthly payment</span>
                <strong>
                  {loan.minimum_payment == null
                    ? "Not set"
                    : money(Number(loan.minimum_payment))}
                </strong>
                <small>
                  {paymentDay(loan.payment_due_date)} · schedule only, not
                  payment status
                </small>
              </div>
              <div>
                <span>Annual interest rate</span>
                <strong>
                  {loan.interest_rate == null
                    ? "Not set"
                    : `${Number(loan.interest_rate)}%`}
                </strong>
                <small>
                  {loan.include_in_net_worth
                    ? "Included in net worth"
                    : "Excluded from net worth"}{" "}
                  · outside available to save
                </small>
              </div>
            </>
          ) : (
            <>
              <div>
                <span>Budget impact</span>
                <strong>Tracked separately</strong>
                <small>This value is outside your spendable budget.</small>
              </div>
              <div>
                <span>What changes the value?</span>
                <strong>Money in, money out, markets</strong>
                <small>The recorded balance alone cannot separate these.</small>
              </div>
            </>
          )}
        </div>
      </section>
      {reduction && (
        <section className="nl-loan-progress">
          <div>
            <strong>
              {money(Math.abs(reduction.reduction))}{" "}
              {reduction.reduction >= 0
                ? "less debt than when you started"
                : "above the original loan amount"}
            </strong>
            <span>
              {Math.abs(reduction.percent).toFixed(1)}%{" "}
              {reduction.percent >= 0 ? "reduction from" : "increase over"}{" "}
              {money(reduction.start)}
            </span>
          </div>
          <div className="nl-meter">
            <span
              style={{
                width: `${Math.max(0, Math.min(100, reduction.percent))}%`,
              }}
            />
          </div>
          <p>
            Reduction in the recorded debt balance, not the total amount you’ve
            paid.
          </p>
        </section>
      )}
      <div className="nl-position-detail-grid">
        <HoldingHistory kind={kind} id={item.id} revision={revision} />
        <aside className="nl-position-aside">
          <section className="nl-panel">
            <h2 className="nl-icon-heading">
              <Target size={18} />
              Connect this to your plan
            </h2>
            {goals.map((g) => (
              <div className="nl-linked-goal" key={g.id}>
                <Link href={`/new/goals?goal=${g.id}`}>
                  {g.name}
                  <ArrowRight size={15} />
                </Link>
                <p>
                  {loan
                    ? "Debt progress follows this recorded balance."
                    : "Goal progress follows this recorded asset value."}
                </p>
                {g.funding_category && (
                  <>
                    <Link href={`/new/budget/${g.funding_category.id}`}>
                      {g.funding_category.name}
                    </Link>
                    <strong>
                      {money(Number(g.funding_category.current_balance))} set
                      aside
                    </strong>
                    <p>
                      Envelope cash is ready for a future payment. It does not
                      reduce your debt until the lender records it.
                    </p>
                  </>
                )}
              </div>
            ))}
            {!goals.length && !relatedError && (
              <>
                <p>
                  {loan
                    ? "Add a payoff goal to track progress and optionally connect an envelope for future payments."
                    : asset?.asset_type === "investment"
                      ? "Connect a retirement goal to track this account’s value toward a target."
                      : "This asset contributes to your longer-term financial picture."}
                </p>
                {goalsEnabled &&
                  (loan || asset?.asset_type === "investment") && (
                    <Link
                      className="nl-secondary"
                      href={`/new/goals?goal=new&source=${loan ? "loan" : "asset"}:${item.id}`}
                    >
                      Set up a goal <ArrowRight size={15} />
                    </Link>
                  )}
              </>
            )}
            {relatedError && (
              <p className="nl-muted">
                Linked goals are temporarily unavailable.
              </p>
            )}
          </section>
          {linkedAsset && (
            <section className="nl-panel">
              <h2>What this loan finances</h2>
              <Link href={`/new/investments/${linkedAsset.id}`}>
                {linkedAsset.name} →
              </Link>
              <p>
                {money(Number(linkedAsset.current_value))} recorded asset value
              </p>
            </section>
          )}
          {asset && securedLoans.length > 0 && (
            <section className="nl-panel">
              <h2>Debt linked to this asset</h2>
              {securedLoans.map((l) => (
                <p key={l.id}>
                  <Link href={`/new/loans/${l.id}`}>{l.name} →</Link>
                  <br />
                  {money(Number(l.balance))} owed
                </p>
              ))}
              <strong>
                {money(
                  (cents(Number(asset.current_value)) -
                    securedLoans.reduce(
                      (s, l) => s + cents(Number(l.balance)),
                      0,
                    )) /
                    100,
                )}{" "}
                recorded equity
              </strong>
              <p>
                Asset value minus the linked loans shown here. Sale costs and
                taxes are not included.
              </p>
            </section>
          )}
          <section className="nl-position-note">
            <h3>
              {loan
                ? "After making a payment"
                : asset?.asset_type === "investment"
                  ? "When you move money into an investment"
                  : "Keep your valuation useful"}
            </h3>
            <p>
              {loan
                ? "Import the payment into its envelope, then update this balance from your lender. Part of a payment may cover interest, so it usually does not reduce the debt by the full payment amount."
                : asset?.asset_type === "investment"
                  ? "Your imported contribution records the money leaving your budget. Update the investment value separately when you check the account. Adding or changing this asset does not move envelope money."
                  : "Use a current estimate when you review this asset. Its value helps describe your financial position, but it is not money available to fund envelopes. Record purchases, sale proceeds, and related expenses separately when they affect your budget."}
            </p>
            <Link href="/new/imports">Import & review →</Link>
          </section>
          <p className="nl-footnote">
            {asset
              ? "Property valuations, specialized asset settings, and removal"
              : "Amortization, specialized loan tools, and removal"}{" "}
            remain in{" "}
            <Link href={`${loan ? "/loans" : "/non-cash-assets"}/${item.id}`}>
              classic ↗
            </Link>
            .
          </p>
        </aside>
      </div>
    </>
  );
}

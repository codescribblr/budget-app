"use client";
import Link from "next/link";
import { useState } from "react";
import { useTaskCheckin } from "./checkin-flow";
import { useImportPaths } from "@/components/import/use-import-paths";
import ImportTransactionsPage from "@/components/import/ImportTransactionsPage";
import TransactionsPage from "@/components/transactions/TransactionsPage";
import ReportsPage from "@/components/reports/ReportsPage";
import { PageHeading, TaskReturn, CheckinFooter } from "./common";

export function GuidedImports() {
  const checkin = useTaskCheckin("imports");
  const { transactionsHref } = useImportPaths();
  return (
    <>
      <TaskReturn task="imports" cadence="weekly" />
      <PageHeading
        eyebrow={checkin ? "Weekly · catch up on spending" : "Import & review"}
        title={
          checkin
            ? "Bring the week into focus"
            : "Bring your spending into focus"
        }
        description="Upload a CSV from each bank and card, then review the queued transactions. Keep the original merchant and description; check the categories before approving."
      >
        <Link className="nl-secondary" href={transactionsHref}>
          View transactions →
        </Link>
      </PageHeading>
      <ImportTransactionsPage />
      <p className="nl-footnote">
        {checkin &&
          "Before continuing, confirm that you’ve included each account you use. "}
        Automatic import settings remain in{" "}
        <Link href="/settings/automatic-imports">classic ↗</Link>.
      </p>
      <CheckinFooter
        task="imports"
        cadence="weekly"
        title="Ready to look at your spending?"
        description="Check that you’ve imported and reviewed the accounts you use. Continuing records your review; it does not approve queued transactions."
      />
    </>
  );
}
export function GuidedTransactions() {
  const { importPath } = useImportPaths();
  return (
    <>
      <div className="nl-task-return">
        <Link href={importPath()}>← Import & review CSVs</Link>
        <Link href="/new">Budget overview →</Link>
      </div>
      <TransactionsPage />
    </>
  );
}
export function GuidedReports() {
  const [reportReady, setReportReady] = useState(false);
  const checkin = useTaskCheckin("reports");
  const monthly = checkin === "monthly";
  return (
    <>
      <TaskReturn task="reports" cadence="weekly" />
      {checkin && (
        <p className="nl-notice">
          {monthly
            ? "Reflect on the previous month and notice what you’d like to plan differently. Adjust the dates if you’re reviewing another period."
            : "Review spending over the past week. Adjust the dates to match the period you’re reviewing."}{" "}
          Reports include recorded transactions.
        </p>
      )}
      <ReportsPage onReviewReadyChange={setReportReady} />
      <CheckinFooter
        task="reports"
        cadence="weekly"
        title="What would you like to adjust?"
        description="Notice where spending differed from your expectations. Take those observations into the next step."
        disabled={!reportReady}
      />
    </>
  );
}

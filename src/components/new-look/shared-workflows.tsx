"use client";
import Link from "next/link";
import ImportTransactionsPage from "@/components/import/ImportTransactionsPage";
import TransactionsPage from "@/components/transactions/TransactionsPage";
import ReportsPage from "@/components/reports/ReportsPage";
import { PageHeading, TaskReturn } from "./common";

export function GuidedImports() {
  return (
    <>
      <TaskReturn task="imports" cadence="weekly" />
      <PageHeading
        eyebrow="Weekly · catch up on spending"
        title="Bring the week into focus"
        description="Upload a CSV from each bank and card, then review the queued transactions. Keep the original merchant and description; check the categories before approving."
      >
        <Link className="nl-secondary" href="/new/transactions">
          View transactions →
        </Link>
      </PageHeading>
      <ImportTransactionsPage />
      <p className="nl-footnote">
        The review checkmark records your own review, not automatic coverage of
        every bank. Confirm that you’ve included each account you use. Automatic
        import settings remain in{" "}
        <Link href="/settings/automatic-imports">classic ↗</Link>.
      </p>
    </>
  );
}
export function GuidedTransactions() {
  return (
    <>
      <div className="nl-task-return">
        <Link href="/new/imports">← Import & review CSVs</Link>
        <Link href="/new">Back to check-in →</Link>
      </div>
      <TransactionsPage />
    </>
  );
}
export function GuidedReports() {
  return (
    <>
      <TaskReturn task="reports" cadence="weekly" />
      <p className="nl-notice">
        For your weekly check-in, select the dates since your last review. For
        your monthly check-in, choose the month you’re reflecting on. Reports
        include recorded transactions.
      </p>
      <ReportsPage />
    </>
  );
}

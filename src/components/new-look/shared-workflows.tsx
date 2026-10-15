"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ImportTransactionsPage from "@/components/import/ImportTransactionsPage";
import TransactionsPage from "@/components/transactions/TransactionsPage";
import ReportsPage from "@/components/reports/ReportsPage";
import { PageHeading, TaskReturn, CheckinFooter } from "./common";

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
  const monthly = useSearchParams().get("checkin") === "monthly";
  return (
    <>
      <TaskReturn task="reports" cadence="weekly" />
      <p className="nl-notice">
        {monthly
          ? "Reflect on the previous month and notice what you’d like to plan differently. Adjust the dates if you’re reviewing another period."
          : "Review spending since your last check-in. Adjust the dates to match the week you’re reviewing."}{" "}
        Reports include recorded transactions.
      </p>
      <ReportsPage />
      <CheckinFooter
        task="reports"
        cadence="weekly"
        title="What would you like to adjust?"
        description="Notice where spending differed from your expectations. Take those observations into the next step."
      />
    </>
  );
}

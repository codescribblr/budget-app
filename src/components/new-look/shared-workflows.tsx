"use client";
import Link from "next/link";
import { useTaskCheckin } from "./checkin-flow";
import { useImportPaths } from "@/components/import/use-import-paths";
import ImportTransactionsPage from "@/components/import/ImportTransactionsPage";
export { GuidedTransactions } from "./transactions";
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
        Manage connections in{" "}
        <Link href="/new/settings/automatic-imports">automatic import settings</Link>.
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

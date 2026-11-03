"use client";
import { useState } from "react";
import Link from "next/link";
import { NativeSelect } from "./native-select";
import { PageSkeleton } from "./page-skeleton";
const views = [
  ["/new", "Home"],
  ["/new/budget", "Envelopes"],
  ["/new/budget/1", "Envelope details"],
  ["/new/budget/manage", "Manage envelopes"],
  ["/new/budget/organize", "Organize envelopes"],
  ["/new/accounts", "Account balances"],
  ["/new/accounts/manage", "Manage accounts"],
  ["/new/accounts/1", "Cash account details"],
  ["/new/credit-cards/1", "Credit card details"],
  ["/new/pending-checks", "Pending checks & deposits"],
  ["/new/transactions", "Transactions"],
  ["/new/imports", "Imports"],
  ["/new/imports/preview", "Import review"],
  ["/new/imports/map-columns", "Column mapping"],
  ["/new/income", "Income"],
  ["/new/plan", "Monthly plan"],
  ["/new/payday", "Paycheck allocation"],
  ["/new/goals", "Goals & buffer"],
  ["/new/loans", "Loans"],
  ["/new/investments", "Investments"],
  ["/new/loans/1", "Account details"],
  ["/new/reports", "Reports"],
  ["/new/reports/net-worth", "Net worth"],
  ["/new/check-in/complete", "Check-in summary"],
  ["/new/settings/profile", "Profile settings"],
  ["/new/settings/notifications", "Notification settings"],
  ["/new/settings/subscription", "Subscription settings"],
  ["/new/settings/import-templates", "Import templates"],
];
export function LoadingPreview() {
  const [path, setPath] = useState("/new/budget");
  return (
    <>
      <div className="nl-notice nl-loading-preview">
        <label>
          Loading preview{" "}
          <NativeSelect
            aria-label="Preview page"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          >
            {views.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </label>
        <span>Local preview · real loading components</span>
        <Link
          href={
            path.includes("/1") || path.endsWith("/preview") ? "/new" : path
          }
          className="nl-secondary"
        >
          Exit preview →
        </Link>
      </div>
      <PageSkeleton path={path} />
    </>
  );
}

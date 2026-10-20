import { Suspense } from "react";
import { GuidedBudgetReports } from "@/components/new-look/budget-reports";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <GuidedBudgetReports />
    </Suspense>
  );
}

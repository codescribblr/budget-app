import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import { GuidedBudgetReports } from "@/components/new-look/budget-reports";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuidedBudgetReports />
    </Suspense>
  );
}

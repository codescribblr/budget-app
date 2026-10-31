import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import { GuidedPlan } from "@/components/new-look/monthly-plan";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuidedPlan />
    </Suspense>
  );
}

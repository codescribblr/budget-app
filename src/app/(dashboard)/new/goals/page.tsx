import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import { GuidedGoals } from "@/components/new-look/goals";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuidedGoals />
    </Suspense>
  );
}

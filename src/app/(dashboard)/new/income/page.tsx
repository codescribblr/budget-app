import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import { GuidedIncome } from "@/components/new-look/income";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuidedIncome />
    </Suspense>
  );
}

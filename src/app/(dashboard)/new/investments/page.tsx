import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import { GuidedHoldings } from "@/components/new-look/holdings";
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuidedHoldings kind="investments" />
    </Suspense>
  );
}

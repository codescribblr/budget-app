import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import { GuidedTransactions } from "@/components/new-look/shared-workflows";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuidedTransactions />
    </Suspense>
  );
}

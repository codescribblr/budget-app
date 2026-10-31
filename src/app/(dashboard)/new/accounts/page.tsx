import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import { GuidedAccounts } from "@/components/new-look/accounts";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuidedAccounts />
    </Suspense>
  );
}

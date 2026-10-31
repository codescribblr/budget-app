import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { GuidedAccountSetup } from "@/components/new-look/account-setup";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuidedAccountSetup />
    </Suspense>
  );
}

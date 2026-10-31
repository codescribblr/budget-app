import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import { GuidedEnvelopeSetup } from "@/components/new-look/envelope-setup";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuidedEnvelopeSetup />
    </Suspense>
  );
}

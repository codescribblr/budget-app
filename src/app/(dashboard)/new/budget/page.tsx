import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import { GuidedEnvelopes } from "@/components/new-look/envelopes";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuidedEnvelopes />
    </Suspense>
  );
}

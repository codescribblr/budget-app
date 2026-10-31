import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import { GuidedPayday } from "@/components/new-look/payday";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuidedPayday />
    </Suspense>
  );
}

import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import { CheckinComplete } from "@/components/new-look/checkin-complete";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CheckinComplete />
    </Suspense>
  );
}

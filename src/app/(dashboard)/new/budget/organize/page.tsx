import { Suspense } from "react";
import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { EnvelopeHousekeeping } from "@/components/new-look/envelope-housekeeping";
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton view="envelope-organize" />}>
      <EnvelopeHousekeeping />
    </Suspense>
  );
}

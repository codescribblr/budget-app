import { Suspense } from "react";
import { GuidedReports } from "@/components/new-look/shared-workflows";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <GuidedReports />
    </Suspense>
  );
}

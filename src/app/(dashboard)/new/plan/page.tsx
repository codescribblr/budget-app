import { Suspense } from "react";
import { GuidedPlan } from "@/components/new-look/monthly-plan";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <GuidedPlan />
    </Suspense>
  );
}

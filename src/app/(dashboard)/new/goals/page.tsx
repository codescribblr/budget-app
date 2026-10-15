import { Suspense } from "react";
import { GuidedGoals } from "@/components/new-look/goals";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <GuidedGoals />
    </Suspense>
  );
}

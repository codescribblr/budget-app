import { Suspense } from "react";
import { GuidedIncome } from "@/components/new-look/income";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <GuidedIncome />
    </Suspense>
  );
}

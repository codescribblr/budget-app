import { Suspense } from "react";
import { GuidedTransactions } from "@/components/new-look/shared-workflows";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <GuidedTransactions />
    </Suspense>
  );
}

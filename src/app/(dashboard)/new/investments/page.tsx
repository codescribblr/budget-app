import { Suspense } from "react";
import { GuidedHoldings } from "@/components/new-look/holdings";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading accounts…</p>}>
      <GuidedHoldings kind="investments" />
    </Suspense>
  );
}

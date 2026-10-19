import { Suspense } from "react";
import { GuidedEnvelopeSetup } from "@/components/new-look/envelope-setup";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <GuidedEnvelopeSetup />
    </Suspense>
  );
}

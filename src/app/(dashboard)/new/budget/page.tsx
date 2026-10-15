import { Suspense } from "react";
import { GuidedEnvelopes } from "@/components/new-look/envelopes";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <GuidedEnvelopes />
    </Suspense>
  );
}

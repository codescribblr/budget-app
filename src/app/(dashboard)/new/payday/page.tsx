import { Suspense } from "react";
import { GuidedPayday } from "@/components/new-look/payday";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <GuidedPayday />
    </Suspense>
  );
}

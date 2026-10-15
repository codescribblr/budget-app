import { Suspense } from "react";
import { CheckinComplete } from "@/components/new-look/checkin-complete";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <CheckinComplete />
    </Suspense>
  );
}

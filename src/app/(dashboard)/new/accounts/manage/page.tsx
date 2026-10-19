import { GuidedAccountSetup } from "@/components/new-look/account-setup";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <GuidedAccountSetup />
    </Suspense>
  );
}

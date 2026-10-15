import { Suspense } from "react";
import { GuidedAccounts } from "@/components/new-look/accounts";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <GuidedAccounts />
    </Suspense>
  );
}

import { Suspense } from "react";
import { GuidedImports } from "@/components/new-look/shared-workflows";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <GuidedImports />
    </Suspense>
  );
}

import { Suspense } from "react";
import { GuidedHome } from "@/components/new-look/home";

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <GuidedHome />
    </Suspense>
  );
}

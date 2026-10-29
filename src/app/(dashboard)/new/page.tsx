import { Suspense } from "react";
import { GuidedHome } from "@/components/new-look/home";
import { HomeSkeleton } from "@/components/new-look/home-skeleton";

export default function Page() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <GuidedHome />
    </Suspense>
  );
}

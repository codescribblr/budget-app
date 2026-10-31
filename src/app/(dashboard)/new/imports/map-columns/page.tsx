import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import ImportMappingPage from "@/components/import/ImportMappingPage";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ImportMappingPage />
    </Suspense>
  );
}

import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import ImportBatchPage from "@/components/import/ImportBatchPage";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ImportBatchPage />
    </Suspense>
  );
}

import { PageSkeleton } from "@/components/new-look/page-skeleton";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GuidedHoldings } from "@/components/new-look/holdings";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)
    notFound();
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GuidedHoldings kind="loans" id={Number(id)} />
    </Suspense>
  );
}

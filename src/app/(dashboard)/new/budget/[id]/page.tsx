import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GuidedEnvelopeDetail } from "@/components/new-look/envelope-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)
    notFound();
  return (
    <Suspense fallback={<p role="status">Loading envelope…</p>}>
      <GuidedEnvelopeDetail categoryId={Number(id)} />
    </Suspense>
  );
}

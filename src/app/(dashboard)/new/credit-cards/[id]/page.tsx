import { GuidedCashAccountDetail } from "@/components/new-look/cash-account-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GuidedCashAccountDetail kind="card" id={Number(id)} />;
}

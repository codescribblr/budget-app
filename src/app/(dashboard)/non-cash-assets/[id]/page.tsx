import AssetDetailPage from '@/components/assets/AssetDetailPage';

export default async function AssetDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssetDetailPage assetId={id} />;
}

import PendingCheckDetailPage from '@/components/pending-checks/PendingCheckDetailPage';

export default async function PendingCheckDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PendingCheckDetailPage pendingCheckId={id} />;
}

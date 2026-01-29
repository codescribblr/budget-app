import LoanDetailPage from '@/components/loans/LoanDetailPage';

export default async function LoanDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LoanDetailPage loanId={id} />;
}

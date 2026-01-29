import CreditCardDetailPage from '@/components/credit-cards/CreditCardDetailPage';

export default async function CreditCardDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CreditCardDetailPage creditCardId={id} />;
}

import { Suspense } from 'react';
import CategoryDetailPage from '@/components/categories/CategoryDetailPage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default async function CategoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CategoryDetailPage categoryId={id} />
    </Suspense>
  );
}

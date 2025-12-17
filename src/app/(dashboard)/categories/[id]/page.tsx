import CategoryDetailPage from '@/components/categories/CategoryDetailPage';

export default async function CategoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CategoryDetailPage categoryId={id} />;
}


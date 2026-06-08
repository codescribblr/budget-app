import { redirect } from 'next/navigation';

export default async function CategoryReportDetailRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      urlParams.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((v) => urlParams.append(key, v));
    }
  }

  const qs = urlParams.toString();
  redirect(`/categories/${id}${qs ? `?${qs}` : ''}`);
}

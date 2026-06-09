import { redirect } from 'next/navigation';

export default async function ImportQueueBatchRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { batchId } = await params;
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
  const path = `/imports/${encodeURIComponent(batchId)}`;
  redirect(qs ? `${path}?${qs}` : path);
}

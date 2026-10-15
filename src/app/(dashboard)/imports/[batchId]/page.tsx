import { Suspense } from 'react';
import ImportBatchPage from '@/components/import/ImportBatchPage';

export default function Page() {
  return <Suspense fallback={<p>Loading import…</p>}><ImportBatchPage/></Suspense>;
}

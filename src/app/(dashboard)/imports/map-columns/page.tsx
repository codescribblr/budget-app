import { Suspense } from 'react';
import ImportMappingPage from '@/components/import/ImportMappingPage';

export default function Page() {
  return <Suspense fallback={<p>Loading import…</p>}><ImportMappingPage/></Suspense>;
}

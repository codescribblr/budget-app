'use client';
import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { importPaths } from '@/lib/import-paths';

/** Both interfaces share import components and records; only their navigation differs. */
export function useImportPaths() {
  const modern = usePathname().startsWith('/new/');
  const checkin = useSearchParams().get('checkin');
  return useMemo(() => importPaths(modern, checkin), [modern, checkin]);
}

'use client';
import { usePathname } from 'next/navigation';

/** Both interfaces share import components and records; only their navigation differs. */
export function useImportPaths() {
  const modern = usePathname().startsWith('/new/');
  return { importsBase: modern ? '/new/imports' : '/imports', transactionsPath: modern ? '/new/transactions' : '/transactions' };
}

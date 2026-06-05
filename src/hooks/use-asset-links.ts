import { useEffect, useState } from 'react';
import {
  buildAssetLinksMap,
  type AssetLinks,
  type LinkedIncomeStreamRow,
  type LinkedLoanRow,
} from '@/lib/asset-links';

export function useAssetLinks() {
  const [linksByAssetId, setLinksByAssetId] = useState<Map<number, AssetLinks>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLinks() {
      setLoading(true);
      try {
        const [streamsRes, loansRes] = await Promise.all([
          fetch('/api/income-streams'),
          fetch('/api/loans'),
        ]);

        const streams: LinkedIncomeStreamRow[] = streamsRes.ok ? await streamsRes.json() : [];
        const loans: LinkedLoanRow[] = loansRes.ok ? await loansRes.json() : [];

        if (!cancelled) {
          setLinksByAssetId(buildAssetLinksMap(streams || [], loans || []));
        }
      } catch {
        if (!cancelled) {
          setLinksByAssetId(new Map());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLinks();

    return () => {
      cancelled = true;
    };
  }, []);

  const getLinksForAsset = (assetId: number): AssetLinks | undefined => linksByAssetId.get(assetId);

  return { linksByAssetId, getLinksForAsset, loading };
}

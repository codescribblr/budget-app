'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import type { NonCashAsset } from '@/lib/types';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import { ArrowLeft, TrendingUp, Edit } from 'lucide-react';
import AssetValueChart from './AssetValueChart';
import AssetValueAudit from './AssetValueAudit';
import AssetDialog from './AssetDialog';

export default function AssetDetailPage({ assetId }: { assetId: string }) {
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<NonCashAsset | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchAsset = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/non-cash-assets/${assetId}`);
      if (!response.ok) {
        const msg = await handleApiError(response, 'Failed to load asset');
        throw new Error(msg || 'Failed to load asset');
      }
      const data = await response.json();
      setAsset(data);
    } catch (error: any) {
      console.error('Error fetching asset:', error);
      toast.error(error.message || 'Failed to load asset');
      setAsset(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      fetchAsset();
    }
  }, [assetId]);

  const getAssetTypeLabel = (assetType: NonCashAsset['asset_type']) => {
    return assetType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/non-cash-assets">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assets
            </Link>
          </Button>
        </div>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Asset not found.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link href="/non-cash-assets">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <Button onClick={() => setIsEditDialogOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <h1 className="text-2xl md:text-3xl font-bold">{asset.name}</h1>
        </div>
        <p className="text-muted-foreground">
          Type: <span className="font-medium">{getAssetTypeLabel(asset.asset_type)}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Current Value</div>
          <div className="text-lg font-semibold">{formatCurrency(asset.current_value)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Estimated Return</div>
          <div className="text-lg font-semibold">{asset.estimated_return_percentage}%</div>
        </Card>
        {asset.address && (
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Address</div>
            <div className="text-sm font-semibold">{asset.address}</div>
          </Card>
        )}
        {asset.vin && (
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">VIN</div>
            <div className="text-sm font-semibold">{asset.vin}</div>
          </Card>
        )}
      </div>

      {asset.id && (
        <>
          <AssetValueChart assetId={asset.id} />
          <AssetValueAudit assetId={asset.id} />
        </>
      )}

      <AssetDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        asset={asset}
        onSuccess={() => {
          fetchAsset();
          setIsEditDialogOpen(false);
        }}
      />
    </div>
  );
}

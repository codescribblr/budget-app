'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { NonCashAsset } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { TrendingUp, Plus, Edit } from 'lucide-react';
import AssetDialog from '@/components/assets/AssetDialog';

export default function NonCashAssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<NonCashAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<NonCashAsset | null>(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/non-cash-assets');
      if (!response.ok) throw new Error('Failed to fetch assets');
      const data = await response.json();
      setAssets(data);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Non-cash Assets</h1>
          <p className="text-muted-foreground mt-1">Manage your non-cash assets</p>
        </div>
        <Button
          onClick={() => {
            setEditingAsset(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {assets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No assets yet</h3>
            <p className="text-muted-foreground">
              Assets will appear here once you add them from the dashboard
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <Card
              key={asset.id}
              className="cursor-pointer hover:shadow-md transition-shadow h-full"
              onClick={() => router.push(`/non-cash-assets/${asset.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <CardTitle className="text-lg">{asset.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAsset(asset);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>{getAssetTypeLabel(asset.asset_type)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Current Value</div>
                    <div className="text-2xl font-bold">{formatCurrency(asset.current_value)}</div>
                  </div>
                  {asset.estimated_return_percentage !== 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Est. Return</span>
                      <span className="font-medium">{asset.estimated_return_percentage}%</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AssetDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingAsset(null);
        }}
        asset={editingAsset}
        onSuccess={() => {
          fetchAssets();
          setIsDialogOpen(false);
          setEditingAsset(null);
        }}
      />
    </div>
  );
}

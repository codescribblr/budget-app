import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/utils';
import type { NonCashAsset } from '@/lib/types';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import { 
  Check, 
  X, 
  MoreVertical, 
  Edit, 
  Trash2, 
  TrendingUp, 
  Building2, 
  Car, 
  Palette, 
  Shield, 
  Gem, 
  Coins, 
  Package 
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import AssetDialog from '@/components/assets/AssetDialog';

interface AssetListProps {
  assets: NonCashAsset[];
  onUpdate: (updatedAssets: NonCashAsset[]) => void;
  disabled?: boolean;
}

export default function AssetList({ assets, onUpdate, disabled = false }: AssetListProps) {
  const [linkedAssetIds, setLinkedAssetIds] = useState<Set<number>>(new Set());
  const [editingAsset, setEditingAsset] = useState<NonCashAsset | null>(null);

  useEffect(() => {
    fetch('/api/income-streams')
      .then((res) => (res.ok ? res.json() : []))
      .then((streams: { linked_non_cash_asset_id?: number | null }[]) => {
        const ids = new Set(
          (streams || [])
            .filter((s) => s.linked_non_cash_asset_id != null)
            .map((s) => s.linked_non_cash_asset_id as number)
        );
        setLinkedAssetIds(ids);
      })
      .catch(() => setLinkedAssetIds(new Set()));
  }, []);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<NonCashAsset | null>(null);

  // Inline editing state
  const [editingValueId, setEditingValueId] = useState<number | null>(null);
  const [editingValueAmount, setEditingValueAmount] = useState('');

  const handleAssetSuccess = async () => {
    // Refetch assets after successful add/edit
    try {
      const response = await fetch('/api/non-cash-assets');
      if (response.ok) {
        const updatedAssets = await response.json();
        onUpdate(updatedAssets);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;

    const updatedAssets = assets.filter(asset => asset.id !== assetToDelete.id);
    onUpdate(updatedAssets);
    setDeleteDialogOpen(false);
    setAssetToDelete(null);

    try {
      const response = await fetch(`/api/non-cash-assets/${assetToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to delete asset');
        throw new Error(errorMessage || 'Failed to delete asset');
      }

      toast.success('Asset deleted successfully');
    } catch (error) {
      onUpdate(assets);
      console.error('Error deleting asset:', error);
      // Error toast already shown by handleApiError
    }
  };

  const openEditDialog = (asset: NonCashAsset) => {
    setEditingAsset(asset);
    setIsAssetDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingAsset(null);
    setIsAssetDialogOpen(true);
  };

  const handleCloseAssetDialog = () => {
    setIsAssetDialogOpen(false);
    setEditingAsset(null);
  };

  const startEditingValue = (asset: NonCashAsset) => {
    if (disabled) return;
    setEditingValueId(asset.id);
    setEditingValueAmount(asset.current_value.toString());
  };

  const saveInlineValue = async (id: number) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;

    const updatedAsset: NonCashAsset = {
      ...asset,
      current_value: parseFloat(editingValueAmount) || 0,
    };
    const updatedAssets = assets.map(a => a.id === id ? updatedAsset : a);
    onUpdate(updatedAssets);
    setEditingValueId(null);
    setEditingValueAmount('');

    try {
      const response = await fetch(`/api/non-cash-assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_value: parseFloat(editingValueAmount) || 0,
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to update asset value');
        throw new Error(errorMessage || 'Failed to update asset value');
      }

      toast.success('Asset value updated');
    } catch (error) {
      onUpdate(assets);
      console.error('Error updating asset value:', error);
      // Error toast already shown by handleApiError
    }
  };

  const cancelEditingValue = () => {
    setEditingValueId(null);
    setEditingValueAmount('');
  };

  const totalValue = Array.isArray(assets) ? assets.reduce((sum, asset) => sum + asset.current_value, 0) : 0;

  const getAssetTypeIcon = (type: NonCashAsset['asset_type']) => {
    switch (type) {
      case 'investment':
        return <TrendingUp className="h-4 w-4" />;
      case 'real_estate':
        return <Building2 className="h-4 w-4" />;
      case 'vehicle':
        return <Car className="h-4 w-4" />;
      case 'art':
        return <Palette className="h-4 w-4" />;
      case 'insurance':
        return <Shield className="h-4 w-4" />;
      case 'collectibles':
        return <Gem className="h-4 w-4" />;
      case 'cryptocurrency':
        return <Coins className="h-4 w-4" />;
      case 'other':
        return <Package className="h-4 w-4" />;
    }
  };

  const getAssetTypeLabel = (type: NonCashAsset['asset_type']) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Button onClick={openAddDialog} size="sm" disabled={disabled} className="shrink-0">
          Add Asset
        </Button>
        {totalValue > 0 && (
          <div className="text-sm text-muted-foreground shrink-0">
            Total: <span className="font-semibold">{formatCurrency(totalValue)}</span>
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">Est. Return</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                No assets added yet. Click "Add Asset" to get started.
              </TableCell>
            </TableRow>
          ) : (
            assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-muted-foreground cursor-help">
                          {getAssetTypeIcon(asset.asset_type)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getAssetTypeLabel(asset.asset_type)}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Link href={`/non-cash-assets/${asset.id}`} className="font-medium hover:underline">
                      {asset.name}
                    </Link>
                    {linkedAssetIds.has(asset.id) && (
                      <Badge variant="default" className="text-xs bg-blue-600 hover:bg-blue-600">
                        Linked
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {editingValueId === asset.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={editingValueAmount}
                        onChange={(e) => setEditingValueAmount(e.target.value)}
                        className="w-28 h-8 text-right"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveInlineValue(asset.id);
                          } else if (e.key === 'Escape') {
                            cancelEditingValue();
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => saveInlineValue(asset.id)}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={cancelEditingValue}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <span
                      className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                      onClick={() => startEditingValue(asset)}
                    >
                      {formatCurrency(asset.current_value)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {asset.estimated_return_percentage !== 0
                    ? `${asset.estimated_return_percentage.toFixed(2)}%`
                    : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={disabled}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(asset)} disabled={disabled}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setAssetToDelete(asset);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={disabled}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Asset Dialog (used for both add and edit) */}
      <AssetDialog
        isOpen={isAssetDialogOpen}
        onClose={handleCloseAssetDialog}
        asset={editingAsset}
        onSuccess={handleAssetSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{assetToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAsset} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

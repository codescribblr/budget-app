import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AssetListProps {
  assets: NonCashAsset[];
  onUpdate: (updatedAssets: NonCashAsset[]) => void;
  disabled?: boolean;
}

export default function AssetList({ assets, onUpdate, disabled = false }: AssetListProps) {
  const [editingAsset, setEditingAsset] = useState<NonCashAsset | null>(null);
  const [assetName, setAssetName] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [estimatedReturn, setEstimatedReturn] = useState('');
  const [assetType, setAssetType] = useState<NonCashAsset['asset_type']>('investment');
  const [address, setAddress] = useState('');
  const [vin, setVin] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<NonCashAsset | null>(null);

  // Inline editing state
  const [editingValueId, setEditingValueId] = useState<number | null>(null);
  const [editingValueAmount, setEditingValueAmount] = useState('');

  const handleUpdateAsset = async () => {
    if (!editingAsset) return;

    const updatedAsset: NonCashAsset = {
      ...editingAsset,
      name: assetName,
      current_value: parseFloat(currentValue) || 0,
      estimated_return_percentage: parseFloat(estimatedReturn) || 0,
      asset_type: assetType,
      address: assetType === 'real_estate' ? (address.trim() || null) : null,
      vin: assetType === 'vehicle' ? (vin.trim() || null) : null,
    };
    const updatedAssets = assets.map(asset => 
      asset.id === editingAsset.id ? updatedAsset : asset
    );
    onUpdate(updatedAssets);
    setIsEditDialogOpen(false);
    setEditingAsset(null);
    setAssetName('');
    setCurrentValue('');
    setEstimatedReturn('');
    setAssetType('investment');
    setAddress('');
    setVin('');

    try {
      const response = await fetch(`/api/non-cash-assets/${editingAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: assetName,
          current_value: parseFloat(currentValue) || 0,
          estimated_return_percentage: parseFloat(estimatedReturn) || 0,
          asset_type: assetType,
          address: assetType === 'real_estate' ? (address.trim() || null) : null,
          vin: assetType === 'vehicle' ? (vin.trim() || null) : null,
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to update asset');
        throw new Error(errorMessage || 'Failed to update asset');
      }

      toast.success('Asset updated successfully');
    } catch (error) {
      onUpdate(assets);
      console.error('Error updating asset:', error);
      // Error toast already shown by handleApiError
    }
  };

  const handleAddAsset = async () => {
    if (!assetName.trim()) {
      toast.error('Please enter an asset name');
      return;
    }

    // Save values before resetting state
    const assetNameValue = assetName;
    const assetTypeValue = assetType;
    const currentValueNum = parseFloat(currentValue) || 0;
    const estimatedReturnNum = parseFloat(estimatedReturn) || 0;
    const addressValue = assetTypeValue === 'real_estate' ? (address.trim() || null) : null;
    const vinValue = assetTypeValue === 'vehicle' ? (vin.trim() || null) : null;

    const tempAssetId = Date.now();
    const newAsset: NonCashAsset = {
      id: tempAssetId, // Temporary ID
      name: assetNameValue,
      asset_type: assetTypeValue,
      current_value: currentValueNum,
      estimated_return_percentage: estimatedReturnNum,
      address: addressValue,
      vin: vinValue,
      sort_order: assets.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedAssets = [...assets, newAsset];
    onUpdate(updatedAssets);
    setIsAddDialogOpen(false);
    setAssetName('');
    setCurrentValue('');
    setEstimatedReturn('');
    setAssetType('investment');
    setAddress('');
    setVin('');

    try {
      const response = await fetch('/api/non-cash-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: assetNameValue,
          asset_type: assetTypeValue,
          current_value: currentValueNum,
          estimated_return_percentage: estimatedReturnNum,
          address: addressValue,
          vin: vinValue,
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to add asset');
        throw new Error(errorMessage || 'Failed to add asset');
      }

      const createdAsset = await response.json();
      // Replace the temporary asset with the real one from the server
      const finalAssets = updatedAssets.map(asset => 
        asset.id === tempAssetId ? createdAsset : asset
      );
      onUpdate(finalAssets);
      toast.success('Asset added successfully');
    } catch (error) {
      // Revert to original assets on error
      onUpdate(assets);
      console.error('Error adding asset:', error);
      // Error toast already shown by handleApiError
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
    setAssetName(asset.name);
    setCurrentValue(asset.current_value.toString());
    setEstimatedReturn(asset.estimated_return_percentage.toString());
    setAssetType(asset.asset_type);
    setAddress(asset.address || '');
    setVin(asset.vin || '');
    setIsEditDialogOpen(true);
  };

  const openAddDialog = () => {
    setAssetName('');
    setCurrentValue('');
    setEstimatedReturn('');
    setAssetType('investment');
    setAddress('');
    setVin('');
    setIsAddDialogOpen(true);
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
      <div className="mb-3 flex items-center justify-between">
        <Button onClick={openAddDialog} size="sm" disabled={disabled}>
          Add Asset
        </Button>
        {totalValue > 0 && (
          <div className="text-sm text-muted-foreground">
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
                    <span className="font-medium">{asset.name}</span>
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

      {/* Edit Asset Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update the asset details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="asset-name-edit">Asset Name</Label>
              <Input
                id="asset-name-edit"
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="e.g., 401(k) Retirement Account"
              />
            </div>
            <div>
              <Label htmlFor="asset-type-edit">Asset Type</Label>
              <Select value={assetType} onValueChange={(value: NonCashAsset['asset_type']) => {
                setAssetType(value);
                // Clear address/VIN when switching away from relevant types
                if (value !== 'real_estate') setAddress('');
                if (value !== 'vehicle') setVin('');
              }}>
                <SelectTrigger id="asset-type-edit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="art">Art</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="collectibles">Collectibles</SelectItem>
                  <SelectItem value="cryptocurrency">Cryptocurrency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assetType === 'real_estate' && (
              <div>
                <Label htmlFor="address-edit">Address</Label>
                <Input
                  id="address-edit"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., 123 Main St, City, State ZIP"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used for potential integration with real estate value APIs
                </p>
              </div>
            )}
            {assetType === 'vehicle' && (
              <div>
                <Label htmlFor="vin-edit">VIN (Vehicle Identification Number)</Label>
                <Input
                  id="vin-edit"
                  type="text"
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  placeholder="e.g., 1HGBH41JXMN109186"
                  maxLength={17}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used for potential integration with auto value APIs
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="current-value-edit">Current Value</Label>
              <Input
                id="current-value-edit"
                type="number"
                step="0.01"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="estimated-return-edit">Estimated Return % (Annual)</Label>
              <Input
                id="estimated-return-edit"
                type="number"
                step="0.01"
                value={estimatedReturn}
                onChange={(e) => setEstimatedReturn(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for forecasting future value (e.g., 7.5 for 7.5% annual return, or -2.0 for -2% depreciation)
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateAsset}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Asset Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>
              Add a non-cash asset to track your net worth.
            </DialogDescription>
          </DialogHeader>
          <div 
            className="space-y-4 pt-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (assetName.trim()) {
                  handleAddAsset();
                }
              }
            }}
          >
            <div>
              <Label htmlFor="asset-name">Asset Name</Label>
              <Input
                id="asset-name"
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="e.g., 401(k) Retirement Account"
              />
            </div>
            <div>
              <Label htmlFor="asset-type">Asset Type</Label>
              <Select value={assetType} onValueChange={(value: NonCashAsset['asset_type']) => {
                setAssetType(value);
                // Clear address/VIN when switching away from relevant types
                if (value !== 'real_estate') setAddress('');
                if (value !== 'vehicle') setVin('');
              }}>
                <SelectTrigger id="asset-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="art">Art</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="collectibles">Collectibles</SelectItem>
                  <SelectItem value="cryptocurrency">Cryptocurrency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assetType === 'real_estate' && (
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., 123 Main St, City, State ZIP"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used for potential integration with real estate value APIs
                </p>
              </div>
            )}
            {assetType === 'vehicle' && (
              <div>
                <Label htmlFor="vin">VIN (Vehicle Identification Number)</Label>
                <Input
                  id="vin"
                  type="text"
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  placeholder="e.g., 1HGBH41JXMN109186"
                  maxLength={17}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used for potential integration with auto value APIs
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="current-value">Current Value</Label>
              <Input
                id="current-value"
                type="number"
                step="0.01"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="estimated-return">Estimated Return % (Annual)</Label>
              <Input
                id="estimated-return"
                type="number"
                step="0.01"
                value={estimatedReturn}
                onChange={(e) => setEstimatedReturn(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for forecasting future value (e.g., 7.5 for 7.5% annual return, or -2.0 for -2% depreciation)
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAsset}>Add Asset</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

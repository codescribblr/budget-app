'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NonCashAsset } from '@/lib/types';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';

interface AssetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset?: NonCashAsset | null;
  onSuccess: () => void;
}

export default function AssetDialog({ isOpen, onClose, asset, onSuccess }: AssetDialogProps) {
  const [assetName, setAssetName] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [estimatedReturn, setEstimatedReturn] = useState('');
  const [assetType, setAssetType] = useState<NonCashAsset['asset_type']>('investment');
  const [address, setAddress] = useState('');
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (asset) {
        // Edit mode
        setAssetName(asset.name);
        setCurrentValue(asset.current_value.toString());
        setEstimatedReturn(asset.estimated_return_percentage.toString());
        setAssetType(asset.asset_type);
        setAddress(asset.address || '');
        setVin(asset.vin || '');
      } else {
        // Add mode
        setAssetName('');
        setCurrentValue('');
        setEstimatedReturn('');
        setAssetType('investment');
        setAddress('');
        setVin('');
      }
    }
  }, [isOpen, asset]);

  const handleSave = async () => {
    if (!assetName.trim()) {
      toast.error('Please enter an asset name');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: assetName.trim(),
        asset_type: assetType,
        current_value: parseFloat(currentValue) || 0,
        estimated_return_percentage: parseFloat(estimatedReturn) || 0,
        address: assetType === 'real_estate' ? (address.trim() || null) : null,
        vin: assetType === 'vehicle' ? (vin.trim().toUpperCase() || null) : null,
      };

      if (asset) {
        // Update existing asset
        const response = await fetch(`/api/non-cash-assets/${asset.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const msg = await handleApiError(response, 'Failed to update asset');
          throw new Error(msg || 'Failed to update asset');
        }

        toast.success('Asset updated');
      } else {
        // Create new asset
        const response = await fetch('/api/non-cash-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const msg = await handleApiError(response, 'Failed to add asset');
          throw new Error(msg || 'Failed to add asset');
        }

        toast.success('Asset added');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving asset:', error);
      toast.error(error.message || 'Failed to save asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{asset ? `Edit ${asset.name}` : 'Add New Asset'}</DialogTitle>
          <DialogDescription>
            {asset ? 'Update the asset details.' : 'Add a non-cash asset to track your net worth.'}
          </DialogDescription>
        </DialogHeader>
        <div
          className="space-y-4 pt-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (assetName.trim()) {
                handleSave();
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
            <Select
              value={assetType}
              onValueChange={(value: NonCashAsset['asset_type']) => {
                setAssetType(value);
                if (value !== 'real_estate') setAddress('');
                if (value !== 'vehicle') setVin('');
              }}
            >
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
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !assetName.trim()}>
              {loading ? 'Saving...' : asset ? 'Save' : 'Add Asset'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
import { Checkbox } from '@/components/ui/checkbox';
import type { NonCashAsset, RentCastPropertyType } from '@/lib/types';
import { RENTCAST_PROPERTY_TYPES } from '@/lib/integrations/rentcast/types';
import { validateRentCastAssetReadiness } from '@/lib/integrations/rentcast/validation';
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
  const [isRmdQualified, setIsRmdQualified] = useState(false);
  const [isLiquid, setIsLiquid] = useState(true);
  const [rentcastEnabled, setRentcastEnabled] = useState(false);
  const [propertyType, setPropertyType] = useState<RentCastPropertyType | ''>('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [squareFootage, setSquareFootage] = useState('');
  const [integrationEnabled, setIntegrationEnabled] = useState(false);
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
        setIsRmdQualified(asset.is_rmd_qualified ?? false);
        setIsLiquid(asset.is_liquid ?? true);
        setRentcastEnabled(asset.rentcast_enabled ?? false);
        setPropertyType(asset.property_type ?? '');
        setBedrooms(asset.bedrooms != null ? String(asset.bedrooms) : '');
        setBathrooms(asset.bathrooms != null ? String(asset.bathrooms) : '');
        setSquareFootage(asset.square_footage != null ? String(asset.square_footage) : '');
      } else {
        // Add mode
        setAssetName('');
        setCurrentValue('');
        setEstimatedReturn('');
        setAssetType('investment');
        setAddress('');
        setVin('');
        setIsRmdQualified(false);
        setIsLiquid(true);
        setRentcastEnabled(false);
        setPropertyType('');
        setBedrooms('');
        setBathrooms('');
        setSquareFootage('');
      }
    }
  }, [isOpen, asset]);

  useEffect(() => {
    if (!isOpen || assetType !== 'real_estate') return;

    const fetchIntegration = async () => {
      try {
        const response = await fetch('/api/integrations/rentcast/status');
        if (!response.ok) return;
        const data = await response.json();
        setIntegrationEnabled(Boolean(data.is_enabled));
      } catch {
        setIntegrationEnabled(false);
      }
    };

    fetchIntegration();
  }, [isOpen, assetType]);

  const handleSave = async () => {
    if (!assetName.trim()) {
      toast.error('Please enter an asset name');
      return;
    }

    if (rentcastEnabled) {
      const readiness = validateRentCastAssetReadiness({
        asset_type: assetType,
        address: address.trim() || null,
        rentcast_enabled: true,
      });
      if (!readiness.ready) {
        toast.error(readiness.messages[0] || 'Complete required fields before enabling RentCast tracking');
        return;
      }
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
        is_rmd_qualified: isRmdQualified,
        is_liquid: isLiquid,
        rentcast_enabled: assetType === 'real_estate' ? rentcastEnabled : false,
        property_type: assetType === 'real_estate' && propertyType ? propertyType : null,
        bedrooms: assetType === 'real_estate' && bedrooms ? parseFloat(bedrooms) : null,
        bathrooms: assetType === 'real_estate' && bathrooms ? parseFloat(bathrooms) : null,
        square_footage: assetType === 'real_estate' && squareFootage ? parseInt(squareFootage, 10) : null,
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
                if (value !== 'real_estate') {
                  setAddress('');
                  setRentcastEnabled(false);
                  setPropertyType('');
                  setBedrooms('');
                  setBathrooms('');
                  setSquareFootage('');
                }
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
                Required for RentCast valuations. Use format: Street, City, State, Zip
              </p>
            </div>
          )}
          {assetType === 'real_estate' && (
            <div className="space-y-4 rounded-md border p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="property-type">Property Type</Label>
                  <Select
                    value={propertyType || undefined}
                    onValueChange={(value: RentCastPropertyType) => setPropertyType(value)}
                  >
                    <SelectTrigger id="property-type">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {RENTCAST_PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    step="1"
                    min="0"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    step="0.5"
                    min="0"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="square-footage">Square Footage</Label>
                  <Input
                    id="square-footage"
                    type="number"
                    step="1"
                    min="0"
                    value={squareFootage}
                    onChange={(e) => setSquareFootage(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="rentcast-enabled"
                  checked={rentcastEnabled}
                  disabled={!integrationEnabled}
                  onCheckedChange={(checked) => setRentcastEnabled(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="rentcast-enabled"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Track value with RentCast.io
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {integrationEnabled
                      ? 'Requires a property address. Values update automatically each month and can be synced manually.'
                      : 'Enable the RentCast integration in Settings → Integrations first.'}
                  </p>
                </div>
              </div>
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
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="is-rmd-qualified"
                checked={isRmdQualified}
                onCheckedChange={(checked) => setIsRmdQualified(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="is-rmd-qualified"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Subject to Required Minimum Distributions (RMD)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Check if this is an IRA/401(k) type account that requires RMDs starting at age 73. Examples: Traditional IRA, 401(k), 403(b), SEP IRA, SIMPLE IRA.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="is-liquid"
                checked={isLiquid}
                onCheckedChange={(checked) => setIsLiquid(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="is-liquid"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Liquid Asset
                </Label>
                <p className="text-xs text-muted-foreground">
                  Check if this asset can be easily converted to cash for distributions. Liquid assets (stocks, bonds, cash accounts) can be distributed immediately. Illiquid assets (real estate, collectibles) may take time to sell.
                </p>
              </div>
            </div>
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

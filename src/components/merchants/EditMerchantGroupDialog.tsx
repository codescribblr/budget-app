'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { MerchantGroupWithStats } from '@/lib/types';

interface EditMerchantGroupDialogProps {
  group: MerchantGroupWithStats;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newDisplayName: string) => void;
}

interface MerchantMapping {
  id: number;
  pattern: string;
  is_automatic: boolean;
}

export default function EditMerchantGroupDialog({
  group,
  open,
  onOpenChange,
  onSuccess,
}: EditMerchantGroupDialogProps) {
  const [displayName, setDisplayName] = useState(group.display_name);
  const [mappings, setMappings] = useState<MerchantMapping[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDisplayName(group.display_name);
      fetchMappings();
    }
  }, [open, group.id]);

  const fetchMappings = async () => {
    setLoadingMappings(true);
    try {
      const response = await fetch(`/api/merchant-groups/${group.id}/mappings`);
      if (response.ok) {
        const data = await response.json();
        setMappings(data);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
      toast.error('Failed to load transaction patterns');
    } finally {
      setLoadingMappings(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error('Please enter a merchant name');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/merchant-groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });

      if (response.ok) {
        toast.success('Merchant group updated successfully');
        onSuccess(displayName.trim());
        onOpenChange(false);
      } else {
        toast.error('Failed to update merchant group');
      }
    } catch (error) {
      console.error('Error updating merchant group:', error);
      toast.error('Failed to update merchant group');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMapping = async (mappingId: number) => {
    try {
      const response = await fetch(`/api/merchant-group-mappings`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mappingId }),
      });

      if (response.ok) {
        toast.success('Pattern removed from group');
        // Just refresh the mappings list, don't reload the whole page
        setMappings(prevMappings => prevMappings.filter(m => m.id !== mappingId));
      } else {
        toast.error('Failed to remove pattern');
      }
    } catch (error) {
      console.error('Error removing mapping:', error);
      toast.error('Failed to remove pattern');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Merchant Group</DialogTitle>
          <DialogDescription>
            Update the merchant name and manage transaction patterns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display-name">Merchant Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter merchant name"
            />
          </div>

          {/* Transaction Patterns */}
          <div className="space-y-2">
            <Label>Transaction Patterns ({mappings.length})</Label>
            <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
              {loadingMappings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : mappings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transaction patterns
                </div>
              ) : (
                mappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm truncate">{mapping.pattern}</span>
                      {!mapping.is_automatic && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          Manual
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMapping(mapping.id)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Remove patterns that don't belong to this merchant. Transactions with removed patterns will become ungrouped.
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <div className="text-sm text-muted-foreground">Transactions</div>
              <div className="text-2xl font-bold">{group.transaction_count}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold">
                ${group.total_amount.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Average</div>
              <div className="text-2xl font-bold">
                {group.transaction_count > 0
                  ? `$${(group.total_amount / group.transaction_count).toFixed(2)}`
                  : '-'}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



'use client';

import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import type { MerchantGroupWithStats } from '@/lib/types';

interface MergeMerchantGroupsDialogProps {
  groupIds: number[];
  groups: MerchantGroupWithStats[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (targetGroupId: number, mergedGroupIds: number[]) => void;
}

export default function MergeMerchantGroupsDialog({
  groupIds,
  groups,
  open,
  onOpenChange,
  onSuccess,
}: MergeMerchantGroupsDialogProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [useCustomName, setUseCustomName] = useState(false);
  const [merging, setMerging] = useState(false);

  const totalTransactions = groups.reduce((sum, g) => sum + g.transaction_count, 0);
  const totalAmount = groups.reduce((sum, g) => sum + g.total_amount, 0);
  const totalPatterns = groups.reduce((sum, g) => sum + g.unique_patterns, 0);

  const handleMerge = async () => {
    if (!useCustomName && !selectedTargetId) {
      toast.error('Please select a target group or enter a custom name');
      return;
    }

    if (useCustomName && !customName.trim()) {
      toast.error('Please enter a custom name');
      return;
    }

    setMerging(true);
    try {
      // Determine the target group ID and name
      let targetGroupId: number;
      let targetName: string;

      if (useCustomName) {
        // Create a new group with the custom name
        const createResponse = await fetch('/api/merchant-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_name: customName.trim() }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create new group');
        }

        const newGroup = await createResponse.json();
        targetGroupId = newGroup.id;
        targetName = customName.trim();
      } else {
        targetGroupId = parseInt(selectedTargetId);
        const targetGroup = groups.find(g => g.id === targetGroupId);
        targetName = targetGroup?.display_name || '';
      }

      // Move all mappings from other groups to the target group
      const sourceGroupIds = groupIds.filter(id => id !== targetGroupId);

      for (const sourceId of sourceGroupIds) {
        // Get mappings for this source group
        const mappingsResponse = await fetch(`/api/merchant-groups/${sourceId}/mappings`);
        if (!mappingsResponse.ok) continue;

        const mappings = await mappingsResponse.json();

        // Update each mapping to point to the target group
        for (const mapping of mappings) {
          await fetch('/api/merchant-group-mappings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: mapping.id,
              merchant_group_id: targetGroupId,
            }),
          });
        }

        // Delete the source group
        await fetch(`/api/merchant-groups/${sourceId}`, {
          method: 'DELETE',
        });
      }

      toast.success(`Merged ${groups.length} groups into "${targetName}"`);
      onSuccess(targetGroupId, sourceGroupIds);
      onOpenChange(false);
    } catch (error) {
      console.error('Error merging groups:', error);
      toast.error('Failed to merge groups');
    } finally {
      setMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Merge Merchant Groups</DialogTitle>
          <DialogDescription>
            Combine {groups.length} merchant groups into one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Total Patterns</div>
              <div className="text-2xl font-bold">{totalPatterns}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Transactions</div>
              <div className="text-2xl font-bold">{totalTransactions}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            </div>
          </div>

          {/* Groups to Merge */}
          <div className="space-y-2">
            <Label>Groups to Merge</Label>
            <div className="border rounded-lg p-4 space-y-2 max-h-40 overflow-y-auto">
              {groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{group.display_name}</span>
                  <span className="text-muted-foreground">
                    {group.unique_patterns} patterns, {group.transaction_count} transactions
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Target Selection */}
          <div className="space-y-3">
            <Label>Merge Into</Label>
            
            {/* Option 1: Select existing group */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="use-existing"
                  checked={!useCustomName}
                  onChange={() => setUseCustomName(false)}
                  className="h-4 w-4"
                />
                <Label htmlFor="use-existing" className="font-normal cursor-pointer">
                  Use one of the selected groups
                </Label>
              </div>
              {!useCustomName && (
                <div className="ml-6 space-y-2">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`group-${group.id}`}
                        value={group.id.toString()}
                        checked={selectedTargetId === group.id.toString()}
                        onChange={(e) => setSelectedTargetId(e.target.value)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`group-${group.id}`} className="font-normal cursor-pointer">
                        {group.display_name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Option 2: Custom name */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="use-custom"
                  checked={useCustomName}
                  onChange={() => setUseCustomName(true)}
                  className="h-4 w-4"
                />
                <Label htmlFor="use-custom" className="font-normal cursor-pointer">
                  Create new group with custom name
                </Label>
              </div>
              {useCustomName && (
                <div className="ml-6">
                  <Input
                    placeholder="Enter new merchant name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Warning:</strong> This action cannot be undone. All transaction patterns from the selected groups will be merged into the target group, and the other groups will be deleted.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={merging}>
            {merging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Merge Groups
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



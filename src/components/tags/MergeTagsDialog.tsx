'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface MergeTagsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTagIds: number[];
  onSuccess: () => void;
}

export default function MergeTagsDialog({ isOpen, onClose, sourceTagIds, onSuccess }: MergeTagsDialogProps) {
  const [tags, setTags] = useState<Array<{ id: number; name: string }>>([]);
  const [targetTagId, setTargetTagId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tags');
      if (response.ok) {
        const data = await response.json();
        // Filter out source tags from the list
        const availableTags = data.filter((tag: any) => !sourceTagIds.includes(tag.id));
        setTags(availableTags);
        if (availableTags.length > 0) {
          setTargetTagId(availableTags[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!targetTagId) {
      toast.error('Please select a target tag');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/tags/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_tag_ids: sourceTagIds,
          target_tag_id: targetTagId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to merge tags');
      }

      const result = await response.json();
      toast.success(`Successfully merged ${result.merged_count} tag assignments`);
      setTargetTagId(null);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error merging tags:', error);
      toast.error(error.message || 'Failed to merge tags');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge Tags</DialogTitle>
          <DialogDescription>
            Select a target tag to merge {sourceTagIds.length} selected tag{sourceTagIds.length !== 1 ? 's' : ''} into.
            All transactions tagged with the source tags will be tagged with the target tag instead.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-4">Loading tags...</div>
          ) : tags.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No other tags available to merge into. Create a new tag first.
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium">Target Tag</label>
                <Select value={targetTagId?.toString() || ''} onValueChange={(value) => setTargetTagId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id.toString()}>
                        {tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleMerge} disabled={isSubmitting || !targetTagId}>
                  {isSubmitting ? 'Merging...' : 'Merge Tags'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


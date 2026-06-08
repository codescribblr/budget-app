'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import TagSelector from './TagSelector';
import type { Tag } from '@/lib/types';
import { toast } from 'sonner';

interface BulkTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transactionIds: number[];
  onSuccess: () => void;
}

export default function BulkTagDialog({ isOpen, onClose, transactionIds, onSuccess }: BulkTagDialogProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
      setSelectedTagIds([]);
    }
  }, [isOpen]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tags');
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedTagIds.length === 0) {
      toast.error('Please select at least one tag');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/tags/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_ids: transactionIds,
          tag_ids: selectedTagIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign tags');
      }

      const result = await response.json();
      const tagCount = result.updated_count || 0;
      const transactionCount = transactionIds.length;
      const tagWord = tagCount === 1 ? 'tag' : 'tags';
      const transactionWord = transactionCount === 1 ? 'transaction' : 'transactions';
      toast.success(`${tagCount} ${tagWord} assigned to ${transactionCount} ${transactionWord}`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error assigning tags:', error);
      toast.error(error.message || 'Failed to assign tags');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Assign Tags</DialogTitle>
          <DialogDescription>
            Assign tags to {transactionIds.length} selected transaction{transactionIds.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <TagSelector
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
                placeholder="Select tags to assign..."
              />

              {selectedTagIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTagIds.map(tagId => {
                    const tag = tags.find(t => t.id === tagId);
                    return tag ? (
                      <Badge key={tagId} variant="secondary" className="flex items-center gap-1">
                        {tag.color && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                        )}
                        {tag.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || selectedTagIds.length === 0}>
                  {isSubmitting ? 'Assigning...' : `Assign to ${transactionIds.length} Transaction${transactionIds.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


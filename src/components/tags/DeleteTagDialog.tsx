'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { TagWithStats } from '@/lib/types';

interface DeleteTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tag: TagWithStats;
  onSuccess: () => void;
}

export default function DeleteTagDialog({ isOpen, onClose, tag, onSuccess }: DeleteTagDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);

  const handleDelete = async () => {
    if (!forceDelete && tag.transaction_count > 0) {
      toast.error(`This tag is used by ${tag.transaction_count} transactions. Enable force delete to proceed.`);
      return;
    }

    if (forceDelete && confirmText !== 'delete') {
      toast.error('Please type "delete" to confirm');
      return;
    }

    try {
      setIsSubmitting(true);
      const url = `/api/tags/${tag.id}${forceDelete ? '?force=true' : ''}`;
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete tag');
      }

      toast.success('Tag deleted successfully');
      setConfirmText('');
      setForceDelete(false);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      toast.error(error.message || 'Failed to delete tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Tag</DialogTitle>
          <DialogDescription>
            {tag.transaction_count > 0 ? (
              <>
                This tag is currently used by <strong>{tag.transaction_count}</strong> transaction{tag.transaction_count !== 1 ? 's' : ''}.
                Deleting it will remove the tag from all transactions.
              </>
            ) : (
              'Are you sure you want to delete this tag? This action cannot be undone.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {tag.transaction_count > 0 && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="forceDelete"
                checked={forceDelete}
                onChange={(e) => setForceDelete(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="forceDelete" className="cursor-pointer">
                Force delete (remove from {tag.transaction_count} transaction{tag.transaction_count !== 1 ? 's' : ''})
              </Label>
            </div>
          )}

          {forceDelete && (
            <div>
              <Label htmlFor="confirm">Type "delete" to confirm</Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="delete"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting || (forceDelete && confirmText !== 'delete')}
            >
              {isSubmitting ? 'Deleting...' : 'Delete Tag'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface CreateTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TAG_COLORS = [
  '#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33',
  '#33FFF5', '#FF8C33', '#8C33FF', '#33FF8C', '#FF338C',
  '#338CFF', '#FFD700', '#FF69B4', '#00CED1', '#32CD32',
];

export default function CreateTagDialog({ isOpen, onClose, onSuccess }: CreateTagDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Tag name is required');
      return;
    }

    if (name.length > 50) {
      toast.error('Tag name must be 50 characters or less');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          color: selectedColor,
          description: description.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tag');
      }

      toast.success('Tag created successfully');
      setName('');
      setDescription('');
      setSelectedColor(null);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating tag:', error);
      toast.error(error.message || 'Failed to create tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Tag</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 124 Irene Circle"
              maxLength={50}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          <div>
            <Label>Color (optional)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(selectedColor === color ? null : color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              {selectedColor && (
                <button
                  type="button"
                  onClick={() => setSelectedColor(null)}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Tag'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


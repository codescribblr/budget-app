'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { X, Tag, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Tag as TagType } from '@/lib/types';

interface TagSelectorProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  placeholder?: string;
  maxDisplay?: number;
  transactionDescription?: string;
  categoryIds?: number[];
  merchantGroupId?: number | null;
}

export default function TagSelector({
  selectedTagIds,
  onChange,
  placeholder = 'Select tags...',
  maxDisplay = 3,
  transactionDescription,
  categoryIds = [],
  merchantGroupId,
}: TagSelectorProps) {
  const [tags, setTags] = useState<TagType[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (transactionDescription && (categoryIds.length > 0 || merchantGroupId)) {
      fetchSuggestions();
    }
  }, [transactionDescription, categoryIds, merchantGroupId]);

  const fetchSuggestions = async () => {
    try {
      const params = new URLSearchParams();
      if (transactionDescription) params.set('description', transactionDescription);
      if (categoryIds.length > 0) params.set('categoryIds', categoryIds.join(','));
      if (merchantGroupId) params.set('merchantGroupId', merchantGroupId.toString());

      const response = await fetch(`/api/tags/suggestions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestedTags(data);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

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

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name is required');
      return;
    }

    if (newTagName.length > 50) {
      toast.error('Tag name must be 50 characters or less');
      return;
    }

    try {
      setCreatingTag(true);
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tag');
      }

      const newTag = await response.json();
      setTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
      onChange([...selectedTagIds, newTag.id]);
      setNewTagName('');
      toast.success('Tag created');
    } catch (error: any) {
      console.error('Error creating tag:', error);
      toast.error(error.message || 'Failed to create tag');
    } finally {
      setCreatingTag(false);
    }
  };

  const handleTagToggle = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleRemoveTag = (tagId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedTagIds.filter(id => id !== tagId));
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));
  const visibleTags = selectedTags.slice(0, maxDisplay);
  const remainingCount = selectedTags.length - maxDisplay;

  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal min-h-[2.5rem] h-auto py-2"
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedTags.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <>
                  {visibleTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tag.color && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      {tag.name}
                      <button
                        onClick={(e) => handleRemoveTag(tag.id, e)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {remainingCount > 0 && (
                    <Badge variant="secondary">
                      +{remainingCount} more
                    </Badge>
                  )}
                </>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading tags...</div>
            ) : (
              <>
                {suggestedTags.length > 0 && !searchQuery && (
                  <div className="mb-2">
                    <div className="text-xs font-semibold text-muted-foreground px-2 py-1">Suggestions</div>
                    <div className="space-y-1">
                      {suggestedTags.map((tag) => (
                        <div
                          key={tag.id}
                          className="flex items-center space-x-2 p-2 hover:bg-blue-50 rounded cursor-pointer bg-blue-50/50"
                          onClick={() => handleTagToggle(tag.id)}
                        >
                          <Checkbox
                            checked={selectedTagIds.includes(tag.id)}
                            onCheckedChange={() => handleTagToggle(tag.id)}
                          />
                          {tag.color && (
                            <div
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: tag.color }}
                            />
                          )}
                          <Label className="flex-1 cursor-pointer">{tag.name}</Label>
                        </div>
                      ))}
                    </div>
                    <div className="border-t my-2"></div>
                  </div>
                )}
                {filteredTags.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    {searchQuery ? 'No tags found' : 'No tags available'}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredTags.map((tag) => {
                      const isSuggested = suggestedTags.some(st => st.id === tag.id);
                      return (
                        <div
                          key={tag.id}
                          className={`flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer ${
                            isSuggested && !searchQuery ? 'bg-blue-50/50' : ''
                          }`}
                          onClick={() => handleTagToggle(tag.id)}
                        >
                          <Checkbox
                            checked={selectedTagIds.includes(tag.id)}
                            onCheckedChange={() => handleTagToggle(tag.id)}
                          />
                          {tag.color && (
                            <div
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: tag.color }}
                            />
                          )}
                          <Label className="flex-1 cursor-pointer">{tag.name}</Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="p-2 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Create new tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || creatingTag}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

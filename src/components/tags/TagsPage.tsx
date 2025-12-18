'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, Edit, Trash2, Merge, MoreVertical, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import type { TagWithStats } from '@/lib/types';
import EditTagDialog from './EditTagDialog';
import MergeTagsDialog from './MergeTagsDialog';
import DeleteTagDialog from './DeleteTagDialog';
import CreateTagDialog from './CreateTagDialog';

export default function TagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<TagWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<TagWithStats | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<Set<number>>(new Set());

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tags?includeStats=true');
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      } else {
        toast.error('Failed to fetch tags');
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleEdit = (tag: TagWithStats) => {
    setSelectedTag(tag);
    setShowEditDialog(true);
  };

  const handleDelete = (tag: TagWithStats) => {
    setSelectedTag(tag);
    setShowDeleteDialog(true);
  };

  const handleMergeToggle = (tagId: number) => {
    const newSelected = new Set(selectedForMerge);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedForMerge(newSelected);
  };

  const handleMergeClick = () => {
    if (selectedForMerge.size < 2) {
      toast.error('Please select at least 2 tags to merge');
      return;
    }
    setShowMergeDialog(true);
  };

  const handleCancelMerge = () => {
    setSelectedForMerge(new Set());
  };

  const handleUpdateTag = (tagId: number, updates: Partial<TagWithStats>) => {
    setTags(prevTags =>
      prevTags.map(t =>
        t.id === tagId ? { ...t, ...updates } : t
      )
    );
  };

  const handleMergeSuccess = async () => {
    await fetchTags();
    setSelectedForMerge(new Set());
  };

  const handleDeleteSuccess = async () => {
    await fetchTags();
  };

  const handleCreateSuccess = async () => {
    await fetchTags();
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTransactions = tags.reduce((sum, t) => sum + t.transaction_count, 0);
  const totalAmount = tags.reduce((sum, t) => sum + t.total_amount, 0);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Tags</h1>
        <p className="text-muted-foreground mt-1">Manage and organize your transaction tags</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Tags</CardDescription>
            <CardTitle className="text-3xl">{tags.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Transactions</CardDescription>
            <CardTitle className="text-3xl">{totalTransactions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Amount</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(totalAmount)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {selectedForMerge.size > 0 ? (
                <>
                  <Badge variant="secondary" className="px-3 py-1">
                    {selectedForMerge.size} selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelMerge}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleMergeClick}
                    disabled={selectedForMerge.size < 2}
                  >
                    <Merge className="mr-2 h-4 w-4" />
                    Merge Tags
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Tag
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No tags found matching your search' : 'No tags yet. Create your first tag to get started.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    {selectedForMerge.size > 0 && (
                      <input
                        type="checkbox"
                        checked={selectedForMerge.size === filteredTags.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedForMerge(new Set(filteredTags.map(t => t.id)));
                          } else {
                            setSelectedForMerge(new Set());
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    )}
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      {selectedForMerge.size > 0 && (
                        <input
                          type="checkbox"
                          checked={selectedForMerge.has(tag.id)}
                          onChange={() => handleMergeToggle(tag.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => router.push(`/transactions?tags=${tag.id}`)}
                        className="flex items-center gap-2 hover:underline text-left"
                      >
                        <Tag className="h-4 w-4" />
                        {tag.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      {tag.color && (
                        <div
                          className="w-6 h-6 rounded-full border border-gray-300"
                          style={{ backgroundColor: tag.color }}
                          title={tag.color}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {tag.transaction_count}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(tag.total_amount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {tag.last_used
                        ? new Date(tag.last_used).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(tag)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/transactions?tags=${tag.id}`)}
                          >
                            <Tag className="mr-2 h-4 w-4" />
                            View Transactions
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(tag)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateTagDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showEditDialog && selectedTag && (
        <EditTagDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          tag={selectedTag}
          onSuccess={handleUpdateTag}
        />
      )}

      {showMergeDialog && (
        <MergeTagsDialog
          isOpen={showMergeDialog}
          onClose={() => setShowMergeDialog(false)}
          sourceTagIds={Array.from(selectedForMerge)}
          onSuccess={handleMergeSuccess}
        />
      )}

      {showDeleteDialog && selectedTag && (
        <DeleteTagDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          tag={selectedTag}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}

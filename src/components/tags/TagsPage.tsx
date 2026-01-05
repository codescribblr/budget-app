'use client';

import { useEffect, useState, useRef } from 'react';
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
import { Search, Plus, Edit, Trash2, Merge, MoreVertical, Tag, Settings, Download, Upload } from 'lucide-react';
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
  const [totalUniqueTransactions, setTotalUniqueTransactions] = useState<number>(0);
  const [totalUniqueAmount, setTotalUniqueAmount] = useState<number>(0);

  // Track if fetch is in progress to prevent duplicate calls
  const fetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  const fetchTags = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);
      const response = await fetch('/api/tags?includeStats=true');
      if (response.ok) {
        const data = await response.json();
        // Handle both array response (old) and object response (new with total_unique_transactions)
        if (Array.isArray(data)) {
          setTags(data);
          // Fallback: calculate from tags if API doesn't return total
          // This will be inaccurate but better than showing 0
          setTotalUniqueTransactions(data.reduce((sum: number, t: TagWithStats) => sum + t.transaction_count, 0));
          setTotalUniqueAmount(data.reduce((sum: number, t: TagWithStats) => sum + t.total_amount, 0));
        } else {
          setTags(data.tags || []);
          setTotalUniqueTransactions(data.total_unique_transactions || 0);
          setTotalUniqueAmount(data.total_unique_amount || 0);
        }
      } else {
        toast.error('Failed to fetch tags');
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Failed to fetch tags');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Only fetch once on mount
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      fetchTags();
    }
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

  const handleExportTags = async () => {
    try {
      const response = await fetch('/api/tags/export');
      if (!response.ok) throw new Error('Failed to export tags');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tags-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Tags exported successfully');
    } catch (error) {
      console.error('Error exporting tags:', error);
      toast.error('Failed to export tags');
    }
  };

  const handleImportTags = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/tags/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import tags');
      }

      const result = await response.json();
      toast.success(`Imported ${result.created} tag${result.created !== 1 ? 's' : ''}${result.skipped > 0 ? `, skipped ${result.skipped}` : ''}`);
      await fetchTags();
    } catch (error: any) {
      console.error('Error importing tags:', error);
      toast.error(error.message || 'Failed to import tags');
    } finally {
      // Reset input
      e.target.value = '';
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <CardTitle className="text-3xl">{totalUniqueTransactions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Amount</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(totalUniqueAmount)}</CardTitle>
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
                <div className="flex gap-2">
                  <Button
                    onClick={() => router.push('/tags/rules')}
                    variant="outline"
                    size="sm"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Rules
                  </Button>
                  <Button
                    onClick={handleExportTags}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button
                    onClick={() => document.getElementById('tag-import-input')?.click()}
                    variant="outline"
                    size="sm"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                  <input
                    id="tag-import-input"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleImportTags}
                  />
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Tag
                  </Button>
                </div>
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


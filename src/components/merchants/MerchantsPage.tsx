'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Edit, Trash2, ArrowLeft, Merge } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import type { MerchantGroupWithStats } from '@/lib/types';
import EditMerchantGroupDialog from './EditMerchantGroupDialog';
import MergeMerchantGroupsDialog from './MergeMerchantGroupsDialog';
import DeleteMerchantGroupDialog from './DeleteMerchantGroupDialog';

export default function MerchantsPage() {
  const router = useRouter();
  const [merchantGroups, setMerchantGroups] = useState<MerchantGroupWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<MerchantGroupWithStats | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<Set<number>>(new Set());

  const fetchMerchantGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/merchant-groups');
      if (response.ok) {
        const data = await response.json();
        setMerchantGroups(data);
      } else {
        toast.error('Failed to fetch merchant groups');
      }
    } catch (error) {
      console.error('Error fetching merchant groups:', error);
      toast.error('Failed to fetch merchant groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchantGroups();
  }, []);

  const handleEdit = (group: MerchantGroupWithStats) => {
    setSelectedGroup(group);
    setShowEditDialog(true);
  };

  const handleDelete = (group: MerchantGroupWithStats) => {
    setSelectedGroup(group);
    setShowDeleteDialog(true);
  };

  const handleMergeToggle = (groupId: number) => {
    const newSelected = new Set(selectedForMerge);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedForMerge(newSelected);
  };

  const handleMergeClick = () => {
    if (selectedForMerge.size < 2) {
      toast.error('Please select at least 2 groups to merge');
      return;
    }
    setShowMergeDialog(true);
  };

  const handleCancelMerge = () => {
    setSelectedForMerge(new Set());
  };

  const filteredGroups = merchantGroups.filter(group =>
    group.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTransactions = merchantGroups.reduce((sum, g) => sum + g.transaction_count, 0);
  const totalAmount = merchantGroups.reduce((sum, g) => sum + g.total_amount, 0);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Merchant Groups</h1>
          <p className="text-muted-foreground mt-1">
            Manage and organize your merchant groups
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <Separator />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Groups</CardDescription>
            <CardTitle className="text-3xl">{merchantGroups.length}</CardTitle>
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
                  placeholder="Search merchant groups..."
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
                    Merge Groups
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Select groups to merge by clicking the checkboxes')}
                >
                  <Merge className="mr-2 h-4 w-4" />
                  Merge Mode
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No merchant groups found matching your search' : 'No merchant groups yet'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Merchant Name</TableHead>
                  <TableHead className="text-right">Patterns</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedForMerge.has(group.id)}
                        onChange={() => handleMergeToggle(group.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {group.display_name}
                        {group.has_manual_mappings && (
                          <Badge variant="outline" className="text-xs">Manual</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {group.unique_patterns}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {group.transaction_count}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(group.total_amount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {group.transaction_count > 0
                        ? formatCurrency(group.total_amount / group.transaction_count)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(group)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(group)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedGroup && (
        <>
          <EditMerchantGroupDialog
            group={selectedGroup}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            onSuccess={fetchMerchantGroups}
          />
          <DeleteMerchantGroupDialog
            group={selectedGroup}
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onSuccess={fetchMerchantGroups}
          />
        </>
      )}
      <MergeMerchantGroupsDialog
        groupIds={Array.from(selectedForMerge)}
        groups={merchantGroups.filter(g => selectedForMerge.has(g.id))}
        open={showMergeDialog}
        onOpenChange={setShowMergeDialog}
        onSuccess={() => {
          setSelectedForMerge(new Set());
          fetchMerchantGroups();
        }}
      />
    </div>
  );
}


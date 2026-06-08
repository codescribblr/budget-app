'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Link2, ChevronLeft, ChevronRight, Loader2, Plus, X, CheckCircle, ChevronDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MerchantLogo } from './MerchantLogo';

interface GlobalMerchantPattern {
  id: number;
  global_merchant_id: number | null;
  pattern: string;
  normalized_pattern: string;
  usage_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

interface GlobalMerchant {
  id: number;
  display_name: string;
  status: 'active' | 'draft';
  logo_url: string | null;
  icon_name: string | null;
}

const PATTERNS_PER_PAGE = 200;

export function AdminMerchantPatternsPage() {
  const [patterns, setPatterns] = useState<GlobalMerchantPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatterns, setSelectedPatterns] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPatterns, setTotalPatterns] = useState(0);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<GlobalMerchant | null>(null);
  const [merchantSearchQuery, setMerchantSearchQuery] = useState('');
  const [availableMerchants, setAvailableMerchants] = useState<GlobalMerchant[]>([]);
  const [grouping, setGrouping] = useState(false);
  const [merchantPopoverOpen, setMerchantPopoverOpen] = useState(false);
  const [showCreateMerchantInline, setShowCreateMerchantInline] = useState(false);
  const [newMerchantNameInline, setNewMerchantNameInline] = useState('');
  const [creatingInline, setCreatingInline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const selectAllCheckboxRef = useRef<HTMLButtonElement>(null);

  const fetchPatterns = async (page: number = currentPage, search: string = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter: 'ungrouped',
        page: page.toString(),
        limit: PATTERNS_PER_PAGE.toString(),
      });
      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      
      const response = await fetch(
        `/api/admin/global-merchants/patterns?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setPatterns(data.patterns || []);
        setTotalPatterns(data.total || 0);
      } else {
        toast.error('Failed to fetch patterns');
      }
    } catch (error) {
      console.error('Error fetching patterns:', error);
      toast.error('Failed to fetch patterns');
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchants = async (query: string = '') => {
    try {
      const response = await fetch(`/api/admin/global-merchants/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableMerchants(data.merchants || []);
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
    }
  };

  const isInitialMount = useRef(true);

  useEffect(() => {
    fetchPatterns(1).finally(() => {
      isInitialMount.current = false;
    });
  }, []);

  // Debounce search and fetch patterns when search query changes
  useEffect(() => {
    // Skip if this is the initial mount (handled by the other useEffect)
    if (isInitialMount.current) return;

    const timeoutId = setTimeout(() => {
      // Reset to page 1 when search changes
      setCurrentPage(1);
      // Clear selection when searching (only if there are selections)
      setSelectedPatterns(prev => prev.size > 0 ? new Set() : prev);
      fetchPatterns(1, searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (showGroupDialog) {
      fetchMerchants(merchantSearchQuery);
    }
  }, [showGroupDialog, merchantSearchQuery]);

  const handleGroupPatterns = async () => {
    if (selectedPatterns.size === 0) {
      toast.error('Please select at least one pattern');
      return;
    }

    if (!selectedMerchant) {
      toast.error('Please select a merchant');
      return;
    }

    setGrouping(true);
    try {
      const response = await fetch('/api/admin/global-merchants/patterns/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: selectedMerchant.id,
          pattern_ids: Array.from(selectedPatterns),
        }),
      });

      if (response.ok) {
        toast.success(`Grouped ${selectedPatterns.size} pattern(s) to ${selectedMerchant.display_name}`);
        setShowGroupDialog(false);
        setSelectedPatterns(new Set());
        setSelectedMerchant(null);
        setMerchantSearchQuery('');
        setShowCreateMerchantInline(false);
        setNewMerchantNameInline('');
        // Refresh patterns - grouped patterns will disappear from the list
        await fetchPatterns(currentPage, searchQuery);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to group patterns');
      }
    } catch (error) {
      console.error('Error grouping patterns:', error);
      toast.error('Failed to group patterns');
    } finally {
      setGrouping(false);
    }
  };

  const handleCreateMerchantInline = async () => {
    if (!newMerchantNameInline.trim()) {
      toast.error('Merchant name is required');
      return;
    }

    setCreatingInline(true);
    try {
      const response = await fetch('/api/admin/global-merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: newMerchantNameInline.trim(),
          status: 'active',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newMerchant = data.merchant;
        setSelectedMerchant(newMerchant);
        setNewMerchantNameInline('');
        setShowCreateMerchantInline(false);
        // Refresh merchants list
        await fetchMerchants(merchantSearchQuery);
        toast.success('Merchant created');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create merchant');
      }
    } catch (error) {
      console.error('Error creating merchant:', error);
      toast.error('Failed to create merchant');
    } finally {
      setCreatingInline(false);
    }
  };

  const togglePatternSelection = (patternId: number) => {
    setSelectedPatterns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patternId)) {
        newSet.delete(patternId);
      } else {
        newSet.add(patternId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPatterns.size === patterns.length && patterns.length > 0) {
      setSelectedPatterns(new Set());
    } else {
      // Select all patterns on current page
      setSelectedPatterns(new Set(patterns.map(p => p.id)));
    }
  };

  const allSelected = patterns.length > 0 && selectedPatterns.size === patterns.length;
  const someSelected = selectedPatterns.size > 0 && selectedPatterns.size < patterns.length;

  const totalPages = Math.ceil(totalPatterns / PATTERNS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setSelectedPatterns(new Set()); // Clear selection when changing pages
      fetchPatterns(newPage, searchQuery);
    }
  };

  const handleSyncPatterns = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/global-merchants/patterns/sync', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Patterns synced successfully');
        // Refresh the patterns list
        await fetchPatterns(currentPage, searchQuery);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to sync patterns');
      }
    } catch (error) {
      console.error('Error syncing patterns:', error);
      toast.error('Failed to sync patterns');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Merchant Patterns</h1>
        <p className="text-muted-foreground mt-2">
          Associate transaction patterns with global merchants. Only ungrouped patterns are shown.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Ungrouped Patterns ({totalPatterns.toLocaleString()})
              </CardTitle>
              <CardDescription>
                Select patterns and associate them with merchants to update matching transactions.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSyncPatterns}
                disabled={syncing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync All Patterns'}
              </Button>
              {selectedPatterns.size > 0 && (
                <Button
                  onClick={() => setShowGroupDialog(true)}
                  disabled={selectedPatterns.size === 0}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Associate Selected ({selectedPatterns.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patterns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      ref={selectAllCheckboxRef}
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Pattern</TableHead>
                  <TableHead>Usage Count</TableHead>
                  <TableHead>First Seen</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && patterns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {searchQuery ? 'No patterns match your search' : 'No ungrouped patterns found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  patterns.map((pattern) => (
                    <TableRow key={pattern.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPatterns.has(pattern.id)}
                          onCheckedChange={() => togglePatternSelection(pattern.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{pattern.pattern}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{pattern.usage_count}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(pattern.first_seen_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(pattern.last_seen_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PATTERNS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * PATTERNS_PER_PAGE, totalPatterns)} of {totalPatterns.toLocaleString()} patterns
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group Patterns Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={(open) => {
        setShowGroupDialog(open);
        if (!open) {
          setMerchantSearchQuery('');
          setSelectedMerchant(null);
          setShowCreateMerchantInline(false);
          setNewMerchantNameInline('');
          setMerchantPopoverOpen(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associate Patterns with Merchant</DialogTitle>
            <DialogDescription>
              Select a merchant to associate {selectedPatterns.size} selected pattern(s) with, or create a new one.
              This will update all matching transactions to use this merchant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-merchant">Select Merchant</Label>
              <Popover open={merchantPopoverOpen} onOpenChange={setMerchantPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                  >
                    {selectedMerchant
                      ? selectedMerchant.display_name
                      : 'Select merchant...'}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search merchants..."
                      value={merchantSearchQuery}
                      onChange={(e) => {
                        setMerchantSearchQuery(e.target.value);
                        fetchMerchants(e.target.value);
                      }}
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-1">
                    {availableMerchants.length === 0 ? (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        No merchants found
                      </div>
                    ) : (
                      availableMerchants.map((merchant) => (
                        <div
                          key={merchant.id}
                          className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
                          onClick={() => {
                            setSelectedMerchant(merchant);
                            setMerchantSearchQuery('');
                            setMerchantPopoverOpen(false);
                          }}
                        >
                          {(merchant.logo_url || merchant.icon_name) && (
                            <MerchantLogo
                              logoUrl={merchant.logo_url}
                              iconName={merchant.icon_name}
                              displayName={merchant.display_name}
                              size="xs"
                            />
                          )}
                          <span className="flex-1">{merchant.display_name}</span>
                          {selectedMerchant?.id === merchant.id && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))
                    )}
                    {merchantSearchQuery.trim() &&
                      !availableMerchants.find(m =>
                        m.display_name.toLowerCase() === merchantSearchQuery.toLowerCase()
                      ) && (
                        <div className="border-t mt-1 pt-1">
                          <div
                            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
                            onClick={() => {
                              setShowCreateMerchantInline(true);
                              setNewMerchantNameInline(merchantSearchQuery);
                            }}
                          >
                            <Plus className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Create &quot;{merchantSearchQuery}&quot;
                            </span>
                          </div>
                        </div>
                      )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {showCreateMerchantInline && (
              <div className="space-y-2 p-3 border rounded-md bg-muted/50">
                <Label htmlFor="new-merchant-name">New Merchant Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-merchant-name"
                    value={newMerchantNameInline}
                    onChange={(e) => setNewMerchantNameInline(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateMerchantInline();
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    onClick={handleCreateMerchantInline}
                    disabled={!newMerchantNameInline.trim() || creatingInline}
                    size="sm"
                  >
                    {creatingInline ? 'Creating...' : 'Create'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateMerchantInline(false);
                      setNewMerchantNameInline('');
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {selectedMerchant && (
              <div className="p-3 border rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedMerchant.display_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Status: <Badge variant={selectedMerchant.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {selectedMerchant.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedMerchant(null);
                      setMerchantSearchQuery('');
                    }}
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowGroupDialog(false);
              setMerchantSearchQuery('');
              setSelectedMerchant(null);
              setShowCreateMerchantInline(false);
              setNewMerchantNameInline('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleGroupPatterns}
              disabled={!selectedMerchant || selectedPatterns.size === 0 || grouping}
            >
              {grouping ? 'Associating...' : 'Associate Patterns'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

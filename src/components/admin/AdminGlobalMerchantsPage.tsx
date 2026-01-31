'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, Edit, Trash2, MoreVertical, CheckCircle, FileText, Link2, Unlink, ChevronDown, Upload, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Image from 'next/image';
import { searchIcons, getIconComponent, getIconCount, getAllMerchantIcons } from '@/lib/merchant-icons';
import { MerchantLogo } from './MerchantLogo';

interface GlobalMerchant {
  id: number;
  display_name: string;
  status: 'active' | 'draft';
  logo_url: string | null;
  icon_name: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface GlobalMerchantPattern {
  id: number;
  global_merchant_id: number | null;
  pattern: string;
  normalized_pattern: string;
  usage_count: number;
  first_seen_at: string;
  last_seen_at: string;
  global_merchants?: {
    id: number;
    display_name: string;
    status: string;
  } | null;
}

export function AdminGlobalMerchantsPage() {
  const [merchants, setMerchants] = useState<GlobalMerchant[]>([]);
  const [patterns, setPatterns] = useState<GlobalMerchantPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [patternSearchQuery, setPatternSearchQuery] = useState('');
  const [merchantSearchQuery, setMerchantSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [patternFilter, setPatternFilter] = useState<'all' | 'ungrouped' | 'grouped'>('all');
  const [selectedMerchant, setSelectedMerchant] = useState<GlobalMerchant | null>(null);
  const [selectedPatterns, setSelectedPatterns] = useState<Set<number>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [merging, setMerging] = useState(false);
  const [targetMerchantId, setTargetMerchantId] = useState<number | null>(null);
  const [mergeMerchantSearchQuery, setMergeMerchantSearchQuery] = useState('');
  const [mergePopoverOpen, setMergePopoverOpen] = useState(false);
  const [newMerchantName, setNewMerchantName] = useState('');
  const [newMerchantStatus, setNewMerchantStatus] = useState<'active' | 'draft'>('draft');
  const [editMerchantName, setEditMerchantName] = useState('');
  const [editMerchantStatus, setEditMerchantStatus] = useState<'active' | 'draft'>('draft');
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [grouping, setGrouping] = useState(false);
  const [showCreateMerchantInline, setShowCreateMerchantInline] = useState(false);
  const [newMerchantNameInline, setNewMerchantNameInline] = useState('');
  const [creatingInline, setCreatingInline] = useState(false);
  const [showLogoUploadDialog, setShowLogoUploadDialog] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [logoDialogTab, setLogoDialogTab] = useState<'icon' | 'upload'>('icon');

  const fetchMerchants = async () => {
    try {
      const statusParam = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await fetch(`/api/admin/global-merchants${statusParam}`);
      if (response.ok) {
        const data = await response.json();
        setMerchants(data.merchants || []);
      } else {
        toast.error('Failed to fetch global merchants');
      }
    } catch (error) {
      console.error('Error fetching global merchants:', error);
      toast.error('Failed to fetch global merchants');
    }
  };

  const fetchPatterns = async (filter: 'all' | 'ungrouped' | 'grouped' = patternFilter) => {
    try {
      const filterParam = filter === 'all' ? '' : `?filter=${filter}`;
      const response = await fetch(`/api/admin/global-merchants/patterns${filterParam}`);
      if (response.ok) {
        const data = await response.json();
        setPatterns(data.patterns || []);
      } else {
        toast.error('Failed to fetch patterns');
      }
    } catch (error) {
      console.error('Error fetching patterns:', error);
      toast.error('Failed to fetch patterns');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMerchants(), fetchPatterns(patternFilter)]);
      setLoading(false);
    };
    loadData();
  }, [statusFilter, patternFilter]);

  const handleCreate = async () => {
    if (!newMerchantName.trim()) {
      toast.error('Merchant name is required');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/admin/global-merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: newMerchantName.trim(),
          status: newMerchantStatus,
        }),
      });

      if (response.ok) {
        toast.success('Merchant created successfully');
        setShowCreateDialog(false);
        setNewMerchantName('');
        setNewMerchantStatus('draft');
        fetchMerchants();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create merchant');
      }
    } catch (error) {
      console.error('Error creating merchant:', error);
      toast.error('Failed to create merchant');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (merchant: GlobalMerchant) => {
    setSelectedMerchant(merchant);
    setEditMerchantName(merchant.display_name);
    setEditMerchantStatus(merchant.status);
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!selectedMerchant) return;

    if (!editMerchantName.trim()) {
      toast.error('Merchant name is required');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/global-merchants/${selectedMerchant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: editMerchantName.trim(),
          status: editMerchantStatus,
        }),
      });

      if (response.ok) {
        toast.success('Merchant updated successfully');
        setShowEditDialog(false);
        setSelectedMerchant(null);
        fetchMerchants();
        fetchPatterns();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update merchant');
      }
    } catch (error) {
      console.error('Error updating merchant:', error);
      toast.error('Failed to update merchant');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async (merchant: GlobalMerchant, newStatus: 'active' | 'draft') => {
    if (merchant.status === newStatus) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/global-merchants/${merchant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Merchant status changed to ${newStatus}`);
        fetchMerchants();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update merchant status');
      }
    } catch (error) {
      console.error('Error updating merchant status:', error);
      toast.error('Failed to update merchant status');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogoClick = (merchant: GlobalMerchant) => {
    setSelectedMerchant(merchant);
    setSelectedIconName(merchant.icon_name);
    setIconSearchQuery('');
    // Set default tab based on what the merchant currently has
    setLogoDialogTab(merchant.icon_name ? 'icon' : merchant.logo_url ? 'upload' : 'icon');
    setShowLogoUploadDialog(true);
  };

  const handleIconSelect = async (iconName: string) => {
    if (!selectedMerchant) return;
    
    setUploadingLogo(true);
    try {
      const response = await fetch(`/api/admin/global-merchants/${selectedMerchant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon_name: iconName }),
      });

      if (response.ok) {
        toast.success('Icon selected successfully');
        setShowLogoUploadDialog(false);
        setSelectedMerchant(null);
        setSelectedIconName(null);
        setIconSearchQuery('');
        fetchMerchants();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to select icon');
      }
    } catch (error) {
      console.error('Error selecting icon:', error);
      toast.error('Failed to select icon');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoFileSelect = async (file: File) => {
    if (!selectedMerchant) {
      toast.error('Please select a merchant first');
      return;
    }

    try {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload JPG, PNG, or SVG');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Validate image dimensions (for non-SVG)
      if (file.type !== 'image/svg+xml') {
        // Use window.Image to avoid conflict with Next.js Image component
        const img = new window.Image();
        const objectUrl = URL.createObjectURL(file);
        
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              URL.revokeObjectURL(objectUrl);
              reject(new Error('Image validation timed out'));
            }, 10000); // 10 second timeout
            
            img.onload = () => {
              clearTimeout(timeout);
              URL.revokeObjectURL(objectUrl);
              // Only check minimum size, allow any aspect ratio
              if (img.width < 256 || img.height < 256) {
                reject(new Error('Image must be at least 256x256 pixels'));
                return;
              }
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timeout);
              URL.revokeObjectURL(objectUrl);
              reject(new Error('Failed to load image'));
            };
            img.src = objectUrl;
          });
        } catch (validationError: any) {
          toast.error(validationError.message || 'Invalid image');
          return;
        }
      }
      
      // If validation passes, upload
      await uploadLogo(file);
    } catch (error: any) {
      console.error('Error in handleLogoFileSelect:', error);
      toast.error(error.message || 'Failed to process file');
    }
  };

  const uploadLogo = async (file: File) => {
    if (!selectedMerchant) return;

    setUploadingLogo(true);
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('merchant_id', selectedMerchant.id.toString());

      const response = await fetch('/api/admin/global-merchants/upload-logo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Logo uploaded successfully');
        setShowLogoUploadDialog(false);
        setSelectedMerchant(null);
        fetchMerchants();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLogo(true);
  };

  const handleLogoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLogo(false);
  };

  const handleLogoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLogo(false);

    try {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        await handleLogoFileSelect(files[0]);
      }
    } catch (error) {
      console.error('Error handling file drop:', error);
      toast.error('Failed to process dropped file');
    }
  };

  const handleMerge = (merchant: GlobalMerchant) => {
    setSelectedMerchant(merchant);
    setTargetMerchantId(null);
    setMergeMerchantSearchQuery('');
    setMergePopoverOpen(false);
    setShowMergeDialog(true);
  };

  const handleDelete = (merchant: GlobalMerchant) => {
    setSelectedMerchant(merchant);
    setShowDeleteDialog(true);
  };

  const confirmMerge = async () => {
    if (!selectedMerchant || !targetMerchantId) return;

    if (selectedMerchant.id === targetMerchantId) {
      toast.error('Cannot merge a merchant into itself');
      return;
    }

    setMerging(true);
    try {
      const response = await fetch(`/api/admin/global-merchants/${selectedMerchant.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_merchant_id: targetMerchantId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Merged "${selectedMerchant.display_name}" into "${data.target_merchant.display_name}"`);
        setShowMergeDialog(false);
        setSelectedMerchant(null);
        setTargetMerchantId(null);
        setMergeMerchantSearchQuery('');
        fetchMerchants();
        fetchPatterns();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to merge merchants');
      }
    } catch (error) {
      console.error('Error merging merchants:', error);
      toast.error('Failed to merge merchants');
    } finally {
      setMerging(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedMerchant) return;

    try {
      const response = await fetch(`/api/admin/global-merchants/${selectedMerchant.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Merchant deleted successfully');
        setShowDeleteDialog(false);
        setSelectedMerchant(null);
        fetchMerchants();
        fetchPatterns();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete merchant');
      }
    } catch (error) {
      console.error('Error deleting merchant:', error);
      toast.error('Failed to delete merchant');
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
          status: 'draft',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Merchant created successfully');
        setSelectedMerchant(data.merchant);
        setNewMerchantNameInline('');
        setShowCreateMerchantInline(false);
        setMerchantSearchQuery('');
        fetchMerchants();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create merchant');
      }
    } catch (error) {
      console.error('Error creating merchant:', error);
      toast.error('Failed to create merchant');
    } finally {
      setCreatingInline(false);
    }
  };

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
        fetchMerchants();
        // Refresh patterns with current filter - grouped patterns will disappear from ungrouped view
        fetchPatterns(patternFilter);
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

  const handleUngroupPatterns = async (patternIds: number[]) => {
    try {
      const response = await fetch('/api/admin/global-merchants/patterns/ungroup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern_ids: patternIds }),
      });

      if (response.ok) {
        toast.success('Patterns ungrouped successfully');
        fetchMerchants();
        // Refresh patterns with current filter - ungrouped patterns will appear in ungrouped view
        fetchPatterns(patternFilter);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to ungroup patterns');
      }
    } catch (error) {
      console.error('Error ungrouping patterns:', error);
      toast.error('Failed to ungroup patterns');
    }
  };

  const togglePatternSelection = (patternId: number) => {
    setSelectedPatterns(prev => {
      const next = new Set(prev);
      if (next.has(patternId)) {
        next.delete(patternId);
      } else {
        next.add(patternId);
      }
      return next;
    });
  };

  const filteredMerchants = merchants.filter(merchant =>
    merchant.display_name.toLowerCase().includes(merchantSearchQuery.toLowerCase())
  );

  // Filter patterns based on search query (filter by patternFilter is already done in API)
  const filteredPatterns = patterns.filter(pattern =>
    pattern.pattern.toLowerCase().includes(patternSearchQuery.toLowerCase())
  );

  // Memoize filtered icons for performance
  const filteredIcons = useMemo(() => searchIcons(iconSearchQuery), [iconSearchQuery]);
  const displayIcons = useMemo(() => filteredIcons.slice(0, 200), [filteredIcons]);
  const hasMoreIcons = filteredIcons.length > 200;

  const toggleSelectAll = () => {
    if (selectedPatterns.size === filteredPatterns.length && filteredPatterns.length > 0) {
      // Deselect all
      setSelectedPatterns(new Set());
    } else {
      // Select all filtered patterns
      setSelectedPatterns(new Set(filteredPatterns.map(p => p.id)));
    }
  };

  const allSelected = filteredPatterns.length > 0 && selectedPatterns.size === filteredPatterns.length;
  const someSelected = selectedPatterns.size > 0 && selectedPatterns.size < filteredPatterns.length;
  const selectAllCheckboxRef = useRef<HTMLButtonElement>(null);

  // Set indeterminate state on checkbox (Radix UI checkbox doesn't support indeterminate prop directly)
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      // Access the underlying input element if available, or set on the button element
      const input = selectAllCheckboxRef.current.querySelector('input');
      if (input) {
        input.indeterminate = someSelected;
      }
    }
  }, [someSelected, allSelected]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Global Merchants</h1>
          <p className="text-muted-foreground mt-2">
            Manage global merchant definitions that apply to all users. Patterns are automatically created from transactions.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Merchant
        </Button>
      </div>

      <Tabs defaultValue="merchants" className="space-y-6">
        <TabsList>
          <TabsTrigger value="merchants">
            Merchants ({merchants.length})
          </TabsTrigger>
          <TabsTrigger value="patterns">
            Patterns ({patterns.length})
          </TabsTrigger>
        </TabsList>

        {/* Merchants Tab */}
        <TabsContent value="merchants" className="space-y-6">
          <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search merchants..."
                  value={merchantSearchQuery}
                  onChange={(e) => setMerchantSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'draft') => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="draft">Draft Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Logo</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMerchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No merchants found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMerchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell className="font-medium">{merchant.display_name}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Badge
                            variant={merchant.status === 'active' ? 'default' : 'secondary'}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            {merchant.status === 'active' ? (
                              <>
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Active
                              </>
                            ) : (
                              <>
                                <FileText className="mr-1 h-3 w-3" />
                                Draft
                              </>
                            )}
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(merchant, 'active')}
                            disabled={merchant.status === 'active'}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Active
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(merchant, 'draft')}
                            disabled={merchant.status === 'draft'}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Draft
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <div
                        className="cursor-pointer hover:opacity-80 transition-opacity inline-block"
                        onClick={() => handleLogoClick(merchant)}
                      >
                        {merchant.icon_name || merchant.logo_url ? (
                          <MerchantLogo
                            logoUrl={merchant.logo_url}
                            iconName={merchant.icon_name}
                            displayName={merchant.display_name}
                            size="md"
                          />
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground">
                            <Upload className="h-3 w-3" />
                            <span>No logo</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(merchant.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(merchant)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMerge(merchant)}>
                            <Link2 className="mr-2 h-4 w-4" />
                            Merge
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(merchant)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
          </Card>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Patterns ({patternFilter === 'all' ? patterns.length : patternFilter === 'ungrouped' ? patterns.filter(p => !p.global_merchant_id).length : patterns.filter(p => p.global_merchant_id).length})
                  </CardTitle>
                  <CardDescription>
                    Transaction patterns. Select patterns and group them into merchants.
                  </CardDescription>
                </div>
                {selectedPatterns.size > 0 && (
                  <Button
                    onClick={() => setShowGroupDialog(true)}
                    disabled={selectedPatterns.size === 0}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Group Selected ({selectedPatterns.size})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Pattern Filter Buttons */}
              <div className="mb-4 flex gap-2">
                <Button
                  variant={patternFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPatternFilter('all');
                    fetchPatterns('all');
                  }}
                >
                  All Patterns
                </Button>
                <Button
                  variant={patternFilter === 'ungrouped' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPatternFilter('ungrouped');
                    fetchPatterns('ungrouped');
                  }}
                >
                  Ungrouped
                </Button>
                <Button
                  variant={patternFilter === 'grouped' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPatternFilter('grouped');
                    fetchPatterns('grouped');
                  }}
                >
                  Grouped
                </Button>
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patterns..."
                  value={patternSearchQuery}
                  onChange={(e) => setPatternSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
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
                    <TableHead>Merchant</TableHead>
                    <TableHead>Usage Count</TableHead>
                    <TableHead>First Seen</TableHead>
                    <TableHead>Last Seen</TableHead>
                    {patternFilter === 'grouped' && (
                      <TableHead>Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatterns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={patternFilter === 'grouped' ? 7 : 6} className="text-center text-muted-foreground">
                        {patternFilter === 'all' && 'No patterns found'}
                        {patternFilter === 'ungrouped' && 'No ungrouped patterns found'}
                        {patternFilter === 'grouped' && 'No grouped patterns found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatterns.map((pattern) => (
                      <TableRow key={pattern.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPatterns.has(pattern.id)}
                            onCheckedChange={() => togglePatternSelection(pattern.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{pattern.pattern}</TableCell>
                        <TableCell>
                          {pattern.global_merchant_id && pattern.global_merchants ? (
                            <Badge variant="default">{pattern.global_merchants.display_name}</Badge>
                          ) : (
                            <Badge variant="outline">Ungrouped</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{pattern.usage_count}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(pattern.first_seen_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(pattern.last_seen_at).toLocaleDateString()}
                        </TableCell>
                        {patternFilter === 'grouped' && pattern.global_merchant_id && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUngroupPatterns([pattern.id])}
                            >
                              Ungroup
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Global Merchant</DialogTitle>
            <DialogDescription>
              Create a new global merchant that can be used across all user accounts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Merchant Name</Label>
              <Input
                id="name"
                placeholder="e.g., Amazon"
                value={newMerchantName}
                onChange={(e) => setNewMerchantName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreate();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={newMerchantStatus}
                onValueChange={(value: 'active' | 'draft') => setNewMerchantStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newMerchantName.trim() || creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Global Merchant</DialogTitle>
            <DialogDescription>
              Update merchant details
            </DialogDescription>
          </DialogHeader>
          {selectedMerchant && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Merchant Name</Label>
                <Input
                  id="edit-name"
                  value={editMerchantName}
                  onChange={(e) => setEditMerchantName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdate();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editMerchantStatus}
                  onValueChange={(value: 'active' | 'draft') => setEditMerchantStatus(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!editMerchantName.trim() || updating}>
              {updating ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Patterns Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={(open) => {
        setShowGroupDialog(open);
        if (!open) {
          setMerchantSearchQuery('');
          setShowCreateMerchantInline(false);
          setNewMerchantNameInline('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group Patterns to Merchant</DialogTitle>
            <DialogDescription>
              Select a merchant to group {selectedPatterns.size} selected pattern(s) into, or create a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-merchant">Merchant</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedMerchant ? selectedMerchant.display_name : 'Select or create merchant...'}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search merchants..."
                        value={merchantSearchQuery}
                        onChange={(e) => {
                          setMerchantSearchQuery(e.target.value);
                          setShowCreateMerchantInline(false);
                        }}
                        className="pl-8"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && merchantSearchQuery.trim() && !merchants.find(m => m.display_name.toLowerCase() === merchantSearchQuery.toLowerCase())) {
                            setShowCreateMerchantInline(true);
                            setNewMerchantNameInline(merchantSearchQuery);
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-1">
                    {merchants
                      .filter(merchant =>
                        merchant.display_name.toLowerCase().includes(merchantSearchQuery.toLowerCase())
                      )
                      .map((merchant) => (
                        <div
                          key={merchant.id}
                          className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
                          onClick={() => {
                            setSelectedMerchant(merchant);
                            setMerchantSearchQuery('');
                            setShowCreateMerchantInline(false);
                          }}
                        >
                          <CheckCircle
                            className={`h-4 w-4 ${
                              selectedMerchant?.id === merchant.id ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                          {merchant.display_name}
                          <Badge variant={merchant.status === 'active' ? 'default' : 'secondary'} className="ml-auto text-xs">
                            {merchant.status}
                          </Badge>
                        </div>
                      ))}
                    {merchantSearchQuery.trim() &&
                      !merchants.find(m =>
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
              setShowCreateMerchantInline(false);
              setNewMerchantNameInline('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleGroupPatterns}
              disabled={!selectedMerchant || selectedPatterns.size === 0 || grouping}
            >
              {grouping ? 'Grouping...' : 'Group Patterns'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={(open) => {
        setShowMergeDialog(open);
        if (!open) {
          setMergeMerchantSearchQuery('');
          setTargetMerchantId(null);
          setMergePopoverOpen(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Global Merchant</DialogTitle>
            <DialogDescription>
              Merge &quot;{selectedMerchant?.display_name}&quot; into another merchant. 
              All patterns, user groups, and transactions will be moved to the target merchant, 
              and the source merchant will be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="merge-target">Target Merchant</Label>
              <Popover open={mergePopoverOpen} onOpenChange={setMergePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {targetMerchantId 
                      ? merchants.find(m => m.id === targetMerchantId)?.display_name 
                      : 'Select target merchant...'}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search merchants..."
                        value={mergeMerchantSearchQuery}
                        onChange={(e) => setMergeMerchantSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-1">
                    {merchants
                      .filter(merchant => 
                        merchant.id !== selectedMerchant?.id && // Exclude source merchant
                        merchant.display_name.toLowerCase().includes(mergeMerchantSearchQuery.toLowerCase())
                      )
                      .map((merchant) => (
                        <div
                          key={merchant.id}
                          className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
                          onClick={() => {
                            setTargetMerchantId(merchant.id);
                            setMergeMerchantSearchQuery('');
                            setMergePopoverOpen(false);
                          }}
                        >
                          <CheckCircle
                            className={`h-4 w-4 ${
                              targetMerchantId === merchant.id ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                          {merchant.display_name}
                          <Badge variant={merchant.status === 'active' ? 'default' : 'secondary'} className="ml-auto text-xs">
                            {merchant.status}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {targetMerchantId && (
              <div className="p-3 border rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {merchants.find(m => m.id === targetMerchantId)?.display_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Status: <Badge variant={merchants.find(m => m.id === targetMerchantId)?.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {merchants.find(m => m.id === targetMerchantId)?.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTargetMerchantId(null);
                      setMergeMerchantSearchQuery('');
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
              setShowMergeDialog(false);
              setMergeMerchantSearchQuery('');
              setTargetMerchantId(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={confirmMerge}
              disabled={!targetMerchantId || merging}
              variant="destructive"
            >
              {merging ? 'Merging...' : 'Merge Merchants'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Global Merchant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedMerchant?.display_name}&quot;? 
              This will unlink all patterns from this merchant but will not delete the patterns themselves.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logo/Icon Upload Dialog */}
      <Dialog open={showLogoUploadDialog} onOpenChange={(open) => {
        setShowLogoUploadDialog(open);
        if (!open) {
          setSelectedIconName(null);
          setIconSearchQuery('');
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Set Logo/Icon for {selectedMerchant?.display_name}</DialogTitle>
            <DialogDescription>
              Upload an image or select an icon from the icon library
            </DialogDescription>
          </DialogHeader>
          <Tabs value={logoDialogTab} onValueChange={(value) => setLogoDialogTab(value as 'icon' | 'upload')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="icon">Select Icon</TabsTrigger>
              <TabsTrigger value="upload">Upload Image</TabsTrigger>
            </TabsList>
            
            {/* Icon Selection Tab */}
            <TabsContent value="icon" className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${getIconCount()} icons (e.g., Amazon, Visa, Starbucks, payment, food)...`}
                    value={iconSearchQuery}
                    onChange={(e) => setIconSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    {iconSearchQuery.trim() 
                      ? `${filteredIcons.length} icon${filteredIcons.length !== 1 ? 's' : ''} found`
                      : `${getIconCount()} icons available`
                    }
                  </span>
                  {iconSearchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => setIconSearchQuery('')}
                      className="text-primary hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto border rounded-md p-4">
                {displayIcons.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p className="mb-2">No icons found matching &quot;{iconSearchQuery}&quot;</p>
                    <p className="text-xs">Try different keywords or clear the search to see all {getIconCount()} available icons</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-3">
                      {displayIcons.map((icon) => {
                      const IconComponent = getIconComponent(icon.name);
                      const isSelected = selectedIconName === icon.name;
                      return (
                        <div
                          key={icon.name}
                          className={`flex flex-col items-center justify-center p-3 border rounded-md cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-muted hover:border-primary/50 hover:bg-accent'
                          }`}
                          onClick={() => setSelectedIconName(icon.name)}
                          title={icon.displayName}
                        >
                          {IconComponent ? (
                            <IconComponent className="h-8 w-8 mb-2" />
                          ) : (
                            <div className="h-8 w-8 mb-2 bg-muted rounded" />
                          )}
                          <span className="text-xs text-center line-clamp-2">{icon.displayName}</span>
                        </div>
                      );
                      })}
                    </div>
                    {hasMoreIcons && (
                      <div className="mt-4 text-center text-sm text-muted-foreground border-t pt-4">
                        Showing 200 of {filteredIcons.length} results. Refine your search to see more.
                      </div>
                    )}
                  </>
                )}
              </div>
              {selectedMerchant?.icon_name && (
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const CurrentIcon = getIconComponent(selectedMerchant.icon_name);
                      return CurrentIcon ? (
                        <CurrentIcon className="h-8 w-8" />
                      ) : (
                        <div className="h-8 w-8 bg-muted rounded" />
                      );
                    })()}
                    <div>
                      <p className="text-sm font-medium">Current Icon</p>
                      <p className="text-xs text-muted-foreground">
                        {getAllMerchantIcons().find(i => i.name === selectedMerchant.icon_name)?.displayName || selectedMerchant.icon_name}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!selectedMerchant) return;
                      setUpdating(true);
                      try {
                        const response = await fetch(`/api/admin/global-merchants/${selectedMerchant.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ icon_name: null }),
                        });
                        if (response.ok) {
                          toast.success('Icon removed');
                          setSelectedIconName(null);
                          fetchMerchants();
                        } else {
                          toast.error('Failed to remove icon');
                        }
                      } catch (error) {
                        toast.error('Failed to remove icon');
                      } finally {
                        setUpdating(false);
                      }
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
            </TabsContent>
            
            {/* Image Upload Tab */}
            <TabsContent value="upload" className="space-y-4 py-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDraggingLogo
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDragOver={handleLogoDragOver}
                onDragLeave={handleLogoDragLeave}
                onDrop={handleLogoDrop}
                onClick={() => logoFileInputRef.current?.click()}
              >
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/svg+xml"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        await handleLogoFileSelect(file);
                      } catch (error) {
                        console.error('Error handling file selection:', error);
                        toast.error('Failed to process selected file');
                      } finally {
                        // Reset the input so the same file can be selected again
                        if (e.target) {
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }
                  }}
                />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Drag and drop an image here, or{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        logoFileInputRef.current?.click();
                      }}
                      className="text-primary hover:underline"
                    >
                      click to select
                    </button>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: JPG, PNG, SVG
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requirements: Minimum 256x256 pixels (any aspect ratio)
                  </p>
                </div>
              </div>
              {selectedMerchant?.logo_url && (
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <MerchantLogo
                      logoUrl={selectedMerchant.logo_url}
                      iconName={selectedMerchant.icon_name}
                      displayName={selectedMerchant.display_name}
                      size="lg"
                    />
                    <div>
                      <p className="text-sm font-medium">Current Logo</p>
                      <p className="text-xs text-muted-foreground">Click above to replace</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!selectedMerchant) return;
                      setUpdating(true);
                      try {
                        const response = await fetch(`/api/admin/global-merchants/${selectedMerchant.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ logo_url: null }),
                        });
                        if (response.ok) {
                          toast.success('Logo removed');
                          setShowLogoUploadDialog(false);
                          setSelectedMerchant(null);
                          fetchMerchants();
                        } else {
                          toast.error('Failed to remove logo');
                        }
                      } catch (error) {
                        toast.error('Failed to remove logo');
                      } finally {
                        setUpdating(false);
                      }
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowLogoUploadDialog(false);
              setSelectedIconName(null);
              setIconSearchQuery('');
            }}>
              Cancel
            </Button>
            {logoDialogTab === 'icon' && (
              <Button
                onClick={() => {
                  if (selectedIconName) {
                    handleIconSelect(selectedIconName);
                  }
                }}
                disabled={!selectedIconName || uploadingLogo}
              >
                {uploadingLogo ? 'Saving...' : 'Save Icon'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { Search, Plus, Edit, Trash2, MoreVertical, CheckCircle, FileText, Link2, ChevronDown, Upload, X, Loader2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [merchantSearchQuery, setMerchantSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [selectedMerchant, setSelectedMerchant] = useState<GlobalMerchant | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [merging, setMerging] = useState(false);
  const [targetMerchantId, setTargetMerchantId] = useState<number | null>(null);
  const [mergeMerchantSearchQuery, setMergeMerchantSearchQuery] = useState('');
  const [mergePopoverOpen, setMergePopoverOpen] = useState(false);
  const [newMerchantName, setNewMerchantName] = useState('');
  const [newMerchantStatus, setNewMerchantStatus] = useState<'active' | 'draft'>('active');
  const [editMerchantName, setEditMerchantName] = useState('');
  const [editMerchantStatus, setEditMerchantStatus] = useState<'active' | 'draft'>('draft');
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
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
  const [showPatternsDialog, setShowPatternsDialog] = useState(false);
  const [merchantPatterns, setMerchantPatterns] = useState<GlobalMerchantPattern[]>([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [removingPattern, setRemovingPattern] = useState<number | null>(null);

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


  const fetchMerchantPatterns = async (merchantId: number) => {
    setLoadingPatterns(true);
    try {
      const response = await fetch(`/api/admin/global-merchants/patterns?merchant_id=${merchantId}`);
      if (response.ok) {
        const data = await response.json();
        setMerchantPatterns(data.patterns || []);
      } else {
        toast.error('Failed to fetch merchant patterns');
      }
    } catch (error) {
      console.error('Error fetching merchant patterns:', error);
      toast.error('Failed to fetch merchant patterns');
    } finally {
      setLoadingPatterns(false);
    }
  };

  const handleViewPatterns = async (merchant: GlobalMerchant) => {
    setSelectedMerchant(merchant);
    setShowPatternsDialog(true);
    await fetchMerchantPatterns(merchant.id);
  };

  const handleRemovePattern = async (patternId: number) => {
    if (!selectedMerchant) return;

    setRemovingPattern(patternId);
    try {
      const response = await fetch('/api/admin/global-merchants/patterns/ungroup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern_ids: [patternId] }),
      });

      if (response.ok) {
        toast.success('Pattern removed from merchant');
        // Refresh merchant patterns
        await fetchMerchantPatterns(selectedMerchant.id);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove pattern');
      }
    } catch (error) {
      console.error('Error removing pattern:', error);
      toast.error('Failed to remove pattern');
    } finally {
      setRemovingPattern(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchMerchants();
      setLoading(false);
    };
    loadData();
  }, [statusFilter]);

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
        setNewMerchantStatus('active');
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
          status: 'active',
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
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to ungroup patterns');
      }
    } catch (error) {
      console.error('Error ungrouping patterns:', error);
      toast.error('Failed to ungroup patterns');
    }
  };

  const filteredMerchants = merchants.filter(merchant =>
    merchant.display_name.toLowerCase().includes(merchantSearchQuery.toLowerCase())
  );

  // Memoize filtered icons for performance
  const filteredIcons = useMemo(() => searchIcons(iconSearchQuery), [iconSearchQuery]);
  const displayIcons = useMemo(() => filteredIcons.slice(0, 200), [filteredIcons]);
  const hasMoreIcons = filteredIcons.length > 200;

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

      <div className="space-y-6">
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
                    <TableCell>
                      <button
                        onClick={() => handleViewPatterns(merchant)}
                        className="font-medium hover:underline text-left"
                      >
                        {merchant.display_name}
                      </button>
                    </TableCell>
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
      </div>

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

      {/* Patterns Dialog */}
      <Dialog open={showPatternsDialog} onOpenChange={(open) => {
        setShowPatternsDialog(open);
        if (!open) {
          setMerchantPatterns([]);
          setSelectedMerchant(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Patterns for {selectedMerchant?.display_name}
            </DialogTitle>
            <DialogDescription>
              View and manage patterns associated with this merchant. Removing a pattern will ungroup it and update matching transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingPatterns ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : merchantPatterns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No patterns found for this merchant
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {merchantPatterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm break-all">{pattern.pattern}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Used in {pattern.usage_count} transaction{pattern.usage_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePattern(pattern.id)}
                      disabled={removingPattern === pattern.id}
                      className="ml-4 shrink-0"
                    >
                      {removingPattern === pattern.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPatternsDialog(false)}>
              Close
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

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Play, Loader2, CheckCircle, XCircle, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { MerchantLogo } from './MerchantLogo';

interface GlobalMerchantOption {
  id: number;
  display_name: string;
  logo_url: string | null;
  icon_name: string | null;
}

interface PatternRow {
  id: number;
  pattern: string;
  usage_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

interface Suggestion {
  id: number;
  suggested_global_merchant_id: number | null;
  suggested_display_name: string | null;
  status: string;
  batch_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  global_merchant: { id: number; display_name: string; status: string } | null;
  pattern_count: number;
  patterns: PatternRow[];
}

export function AdminMerchantSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [batchIdFilter, setBatchIdFilter] = useState('');
  const [runningJob, setRunningJob] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [removingPatternId, setRemovingPatternId] = useState<number | null>(null);
  // Review dialog: create new vs link to existing
  const [approveMode, setApproveMode] = useState<'create' | 'existing'>('create');
  const [newMerchantName, setNewMerchantName] = useState('');
  const [selectedExistingMerchant, setSelectedExistingMerchant] = useState<GlobalMerchantOption | null>(null);
  const [availableMerchants, setAvailableMerchants] = useState<GlobalMerchantOption[]>([]);
  const [merchantSearchQuery, setMerchantSearchQuery] = useState('');
  const [merchantPopoverOpen, setMerchantPopoverOpen] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      if (batchIdFilter.trim()) params.set('batch_id', batchIdFilter.trim());
      params.set('limit', '50');
      const res = await fetch(`/api/admin/global-merchants/suggestions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [statusFilter, batchIdFilter]);

  const handleRunNow = async () => {
    setRunningJob(true);
    try {
      const res = await fetch('/api/admin/global-merchants/suggestions/run', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(data.message || 'Suggestions generated. Refreshing list.');
        await fetchSuggestions();
      } else {
        toast.error(data.error || 'Failed to run suggestions');
      }
    } catch (e) {
      toast.error('Failed to run suggestions');
    } finally {
      setRunningJob(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSuggestion) return;
    const body: { merchant_id?: number; merchant_name?: string } = {};
    if (approveMode === 'existing' && selectedExistingMerchant) {
      body.merchant_id = selectedExistingMerchant.id;
    } else if (approveMode === 'create' && newMerchantName.trim()) {
      body.merchant_name = newMerchantName.trim();
    }
    setApproving(true);
    try {
      const res = await fetch(
        `/api/admin/global-merchants/suggestions/${selectedSuggestion.id}/approve`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(`Approved: ${data.patterns_grouped} pattern(s) grouped`);
        closeDetailDialog();
        await fetchSuggestions();
      } else {
        toast.error(data.error || 'Failed to approve');
      }
    } catch (e) {
      toast.error('Failed to approve');
    } finally {
      setApproving(false);
    }
  };

  const canApprove =
    selectedSuggestion &&
    selectedSuggestion.pattern_count > 0 &&
    (approveMode === 'existing' ? !!selectedExistingMerchant : !!newMerchantName.trim());

  const handleReject = async () => {
    if (!selectedSuggestion) return;
    setRejecting(true);
    try {
      const res = await fetch(
        `/api/admin/global-merchants/suggestions/${selectedSuggestion.id}/reject`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
      );
      if (res.ok) {
        toast.success('Suggestion rejected');
        closeDetailDialog();
        await fetchSuggestions();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to reject');
      }
    } catch (e) {
      toast.error('Failed to reject');
    } finally {
      setRejecting(false);
    }
  };

  const handleRemovePattern = async (patternId: number) => {
    if (!selectedSuggestion) return;
    setRemovingPatternId(patternId);
    try {
      const res = await fetch(
        `/api/admin/global-merchants/suggestions/${selectedSuggestion.id}/remove-pattern`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pattern_id: patternId }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (data.remaining_count === 0) {
          setShowDetailDialog(false);
          setSelectedSuggestion(null);
          toast.success('Pattern removed; suggestion had no patterns left and was rejected.');
        } else {
          setSelectedSuggestion((prev) =>
            prev
              ? {
                  ...prev,
                  patterns: prev.patterns.filter((p) => p.id !== patternId),
                  pattern_count: data.remaining_count,
                }
              : null
          );
          toast.success('Pattern removed from suggestion');
        }
        await fetchSuggestions();
      } else {
        toast.error(data.error || 'Failed to remove pattern');
      }
    } catch (e) {
      toast.error('Failed to remove pattern');
    } finally {
      setRemovingPatternId(null);
    }
  };

  const displayName = (s: Suggestion) =>
    s.global_merchant
      ? s.global_merchant.display_name
      : s.suggested_display_name
        ? `Create new: ${s.suggested_display_name}`
        : '—';
  const isNewMerchant = (s: Suggestion) => !s.global_merchant && s.suggested_display_name;

  const fetchMerchants = async (query: string) => {
    try {
      const res = await fetch(`/api/admin/global-merchants/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableMerchants(data.merchants || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openDetailDialog = (s: Suggestion) => {
    setSelectedSuggestion(s);
    setShowDetailDialog(true);
    if (s.global_merchant) {
      setApproveMode('existing');
      setSelectedExistingMerchant({
        id: s.global_merchant.id,
        display_name: s.global_merchant.display_name,
        logo_url: null,
        icon_name: null,
      });
      setNewMerchantName('');
      setMerchantSearchQuery('');
      fetchMerchants(''); // load list for dropdown
    } else {
      setApproveMode('create');
      setNewMerchantName(s.suggested_display_name || '');
      setSelectedExistingMerchant(null);
      setMerchantSearchQuery('');
      fetchMerchants('');
    }
    setMerchantPopoverOpen(false);
  };

  const closeDetailDialog = () => {
    setShowDetailDialog(false);
    setSelectedSuggestion(null);
    setApproveMode('create');
    setNewMerchantName('');
    setSelectedExistingMerchant(null);
    setMerchantSearchQuery('');
    setMerchantPopoverOpen(false);
  };

  if (loading && suggestions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI Merchant Suggestions</h1>
          <p className="text-muted-foreground mt-2">
            Review AI-suggested groupings. Approve to apply, or remove patterns you don&apos;t agree with.
          </p>
        </div>
        <Button onClick={handleRunNow} disabled={runningJob}>
          {runningJob ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Run suggestions now
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Batch</span>
              <Input
                placeholder="Filter by batch"
                value={batchIdFilter}
                onChange={(e) => setBatchIdFilter(e.target.value)}
                className="w-[180px]"
              />
            </div>
          </div>
          <CardTitle className="pt-2">Suggestions ({total})</CardTitle>
          <CardDescription>
            Click a row to review and approve or reject. Remove individual patterns with the trash icon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {statusFilter === 'pending'
                ? 'No pending suggestions. Click "Run suggestions now" to generate a batch, or wait for the weekly run.'
                : 'No suggestions match the filters.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Suggested merchant</TableHead>
                  <TableHead>Patterns</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => {
                      if (s.status === 'pending') openDetailDialog(s);
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {s.global_merchant?.display_name && (
                          <MerchantLogo
                            logoUrl={null}
                            iconName={null}
                            displayName={s.global_merchant.display_name}
                            size="xs"
                          />
                        )}
                        <span className="font-medium">{displayName(s)}</span>
                        {isNewMerchant(s) && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                        {s.global_merchant && (
                          <Badge variant="outline" className="text-xs">
                            Existing
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.pattern_count}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.batch_id || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {s.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailDialog(s)}
                        >
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDetailDialog} onOpenChange={(open) => !open && closeDetailDialog()}>
        <DialogContent className="max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review suggestion</DialogTitle>
            <DialogDescription>
              {selectedSuggestion && (
                <>
                  AI suggested: {displayName(selectedSuggestion)}. You can edit the name or link to an existing merchant below.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Label>Approve as</Label>
                <RadioGroup
                  value={approveMode}
                  onValueChange={(v) => setApproveMode(v as 'create' | 'existing')}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="create" id="approve-create" />
                    <Label htmlFor="approve-create" className="font-normal cursor-pointer">
                      Create new merchant
                    </Label>
                  </div>
                  {approveMode === 'create' && (
                    <div className="pl-6">
                      <Input
                        placeholder="Merchant name"
                        value={newMerchantName}
                        onChange={(e) => setNewMerchantName(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="existing" id="approve-existing" />
                    <Label htmlFor="approve-existing" className="font-normal cursor-pointer">
                      Link to existing merchant
                    </Label>
                  </div>
                  {approveMode === 'existing' && (
                    <div className="pl-6">
                      <Popover open={merchantPopoverOpen} onOpenChange={setMerchantPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full max-w-md justify-between">
                            {selectedExistingMerchant ? selectedExistingMerchant.display_name : 'Select merchant...'}
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
                                    setSelectedExistingMerchant(merchant);
                                    setMerchantPopoverOpen(false);
                                  }}
                                >
                                  <MerchantLogo
                                    logoUrl={merchant.logo_url}
                                    iconName={merchant.icon_name}
                                    displayName={merchant.display_name}
                                    size="xs"
                                  />
                                  <span className="flex-1">{merchant.display_name}</span>
                                  {selectedExistingMerchant?.id === merchant.id && (
                                    <CheckCircle className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </RadioGroup>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Patterns ({selectedSuggestion.patterns.length})</div>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-2">
                  {selectedSuggestion.patterns.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 text-sm font-mono bg-muted rounded px-2 py-1.5"
                    >
                      <span className="truncate flex-1">{p.pattern}</span>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {p.usage_count} uses
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={() => handleRemovePattern(p.id)}
                        disabled={removingPatternId === p.id}
                        title="Remove from suggestion (pattern returns to ungrouped)"
                      >
                        {removingPatternId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDetailDialog}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={rejecting || !selectedSuggestion}
            >
              {rejecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving || !canApprove}
            >
              {approving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

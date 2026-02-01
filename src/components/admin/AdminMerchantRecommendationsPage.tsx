'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, CheckCircle, XCircle, Merge, ChevronDown, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { MerchantLogo } from '@/components/admin/MerchantLogo';

interface MerchantRecommendation {
  id: number;
  user_id: string;
  account_id: number;
  pattern: string;
  suggested_merchant_name: string;
  transaction_id: number | null;
  status: 'pending' | 'approved' | 'denied' | 'merged';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  original_merchant_group_id: number | null;
  pattern_count: number;
  created_at: string;
  merchant_recommendation_patterns?: Array<{ pattern: string }>;
  transactions?: Array<{ id: number; description: string; date: string }>;
}

interface GlobalMerchant {
  id: number;
  display_name: string;
  logo_url?: string | null;
  icon_name?: string | null;
}

export function AdminMerchantRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<MerchantRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState<MerchantRecommendation | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'approve_rename' | 'deny' | 'merge' | null>(null);
  const [newMerchantName, setNewMerchantName] = useState('');
  const [selectedMerchantId, setSelectedMerchantId] = useState<number | null>(null);
  const [merchantSearchQuery, setMerchantSearchQuery] = useState('');
  const [availableMerchants, setAvailableMerchants] = useState<GlobalMerchant[]>([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [merchantPopoverOpen, setMerchantPopoverOpen] = useState(false);
  const [selectedRecommendationIds, setSelectedRecommendationIds] = useState<Set<number>>(new Set());
  const [selectedRecommendations, setSelectedRecommendations] = useState<MerchantRecommendation[]>([]);
  // Track which patterns are included for each recommendation (key: recommendationId, value: Set of pattern strings)
  const [includedPatterns, setIncludedPatterns] = useState<Map<number, Set<string>>>(new Map());

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/merchant-recommendations`);
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } else {
        toast.error('Failed to fetch recommendations');
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast.error('Failed to fetch recommendations');
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

  useEffect(() => {
    fetchRecommendations();
  }, []);

  useEffect(() => {
    if (reviewAction === 'merge' && showReviewDialog) {
      fetchMerchants(merchantSearchQuery);
    }
  }, [reviewAction, merchantSearchQuery, showReviewDialog]);

  const initializePatterns = (recs: MerchantRecommendation[]) => {
    const newIncludedPatterns = new Map<number, Set<string>>();
    recs.forEach(rec => {
      const patterns = rec.merchant_recommendation_patterns || [];
      const allPatterns = patterns.length > 0 
        ? patterns.map(p => p.pattern)
        : [rec.pattern];
      newIncludedPatterns.set(rec.id, new Set(allPatterns));
    });
    setIncludedPatterns(newIncludedPatterns);
  };

  const handleReview = (recommendation: MerchantRecommendation, action: 'approve' | 'approve_rename' | 'deny' | 'merge') => {
    setSelectedRecommendation(recommendation);
    setSelectedRecommendations([recommendation]);
    initializePatterns([recommendation]);
    setReviewAction(action);
    setNewMerchantName(recommendation.suggested_merchant_name);
    setSelectedMerchantId(null);
    setMerchantSearchQuery('');
    setAdminNotes('');
    setMerchantPopoverOpen(false);
    setShowReviewDialog(true);
  };

  const handleBulkReview = (action: 'approve' | 'approve_rename' | 'deny' | 'merge') => {
    // Get full recommendation objects from state (which include patterns)
    const selected = recommendations.filter(rec => 
      selectedRecommendationIds.has(rec.id)
    );
    if (selected.length === 0) {
      toast.error('Please select at least one recommendation');
      return;
    }
    setSelectedRecommendation(null);
    setSelectedRecommendations(selected);
    initializePatterns(selected);
    setReviewAction(action);
    // Use the first recommendation's suggested name as default
    setNewMerchantName(selected[0]?.suggested_merchant_name || '');
    setSelectedMerchantId(null);
    setMerchantSearchQuery('');
    setAdminNotes('');
    setMerchantPopoverOpen(false);
    setShowReviewDialog(true);
  };

  const removePattern = (recommendationId: number, pattern: string) => {
    const newIncludedPatterns = new Map(includedPatterns);
    const patterns = newIncludedPatterns.get(recommendationId);
    if (patterns) {
      const newPatterns = new Set(patterns);
      newPatterns.delete(pattern);
      if (newPatterns.size === 0) {
        toast.error('At least one pattern must be included');
        return;
      }
      newIncludedPatterns.set(recommendationId, newPatterns);
      setIncludedPatterns(newIncludedPatterns);
    }
  };

  const restorePattern = (recommendationId: number, pattern: string) => {
    const newIncludedPatterns = new Map(includedPatterns);
    const patterns = newIncludedPatterns.get(recommendationId);
    if (patterns) {
      const newPatterns = new Set(patterns);
      newPatterns.add(pattern);
      newIncludedPatterns.set(recommendationId, newPatterns);
      setIncludedPatterns(newIncludedPatterns);
    }
  };

  const toggleRecommendationSelection = (id: number) => {
    const newSet = new Set(selectedRecommendationIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRecommendationIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedRecommendationIds.size === filteredRecommendations.length) {
      setSelectedRecommendationIds(new Set());
    } else {
      setSelectedRecommendationIds(new Set(filteredRecommendations.map(rec => rec.id)));
    }
  };

  const handleSubmitReview = async () => {
    const recommendationsToProcess = selectedRecommendations.length > 0 
      ? selectedRecommendations 
      : selectedRecommendation 
        ? [selectedRecommendation] 
        : [];

    if (recommendationsToProcess.length === 0) return;

    if (reviewAction === 'approve_rename' && !newMerchantName.trim()) {
      toast.error('Please enter a merchant name');
      return;
    }

    if (reviewAction === 'merge' && !selectedMerchantId) {
      toast.error('Please select a merchant to merge with');
      return;
    }

    setIsProcessing(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const totalPatternsGrouped: number[] = [];

      // Process each recommendation sequentially
      for (const rec of recommendationsToProcess) {
        try {
          // Get included patterns for this recommendation
          const included = includedPatterns.get(rec.id);
          const patternsToProcess = included ? Array.from(included) : undefined;

          const response = await fetch(`/api/admin/merchant-recommendations/${rec.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: reviewAction,
              merchant_name: reviewAction === 'approve_rename' ? newMerchantName.trim() : undefined,
              merchant_id: reviewAction === 'merge' ? selectedMerchantId : undefined,
              admin_notes: adminNotes.trim() || undefined,
              patterns: patternsToProcess, // Send only included patterns
            }),
          });

          if (response.ok) {
            const data = await response.json();
            successCount++;
            if (data.patterns_grouped) {
              totalPatternsGrouped.push(data.patterns_grouped);
            }
          } else {
            const error = await response.json();
            console.error(`Error processing recommendation ${rec.id}:`, error);
            errorCount++;
          }
        } catch (error) {
          console.error(`Error processing recommendation ${rec.id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        const totalPatterns = totalPatternsGrouped.reduce((a, b) => a + b, 0);
        const patternText = totalPatterns > 0 ? ` and ${totalPatterns} pattern(s) grouped` : '';
        toast.success(
          reviewAction === 'approve' || reviewAction === 'approve_rename'
            ? `${successCount} merchant(s) created${patternText}`
            : reviewAction === 'merge'
            ? `${successCount} recommendation(s) merged into existing merchant`
            : `${successCount} recommendation(s) denied`
        );
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} recommendation(s) failed to process`);
      }

      setShowReviewDialog(false);
      setSelectedRecommendation(null);
      setSelectedRecommendations([]);
      setSelectedRecommendationIds(new Set());
      setReviewAction(null);
      fetchRecommendations();
    } catch (error) {
      console.error('Error processing recommendations:', error);
      toast.error('Failed to process recommendations');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRecommendations = recommendations.filter(rec =>
    rec.suggested_merchant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.pattern.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Collect all patterns from selected recommendations (only included ones)
  const getAllPatterns = () => {
    const allPatternsSet = new Set<string>();
    const recsToUse = selectedRecommendations.length > 0 
      ? selectedRecommendations 
      : selectedRecommendation 
        ? [selectedRecommendation] 
        : [];
    
    recsToUse.forEach(rec => {
      const included = includedPatterns.get(rec.id);
      if (included && included.size > 0) {
        included.forEach(pattern => allPatternsSet.add(pattern));
      }
    });
    
    return Array.from(allPatternsSet);
  };

  // Get all patterns for a specific recommendation (including excluded ones)
  const getAllPatternsForRecommendation = (rec: MerchantRecommendation) => {
    const patterns = rec.merchant_recommendation_patterns || [];
    return patterns.length > 0 
      ? patterns.map(p => p.pattern)
      : [rec.pattern];
  };

  const allPatterns = getAllPatterns();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Merchant Recommendations</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve user recommendations for new merchants
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search recommendations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedRecommendationIds.size > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedRecommendationIds.size} recommendation(s) selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRecommendationIds(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkReview('approve')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkReview('approve_rename')}
                >
                  Rename All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkReview('merge')}
                >
                  <Merge className="h-4 w-4 mr-1" />
                  Merge All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkReview('deny')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Deny All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Recommendations</CardTitle>
          <CardDescription>
            {filteredRecommendations.length} recommendation(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRecommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recommendations found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredRecommendations.length > 0 &&
                        filteredRecommendations.every(rec => selectedRecommendationIds.has(rec.id))
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Pattern</TableHead>
                  <TableHead>Suggested Name</TableHead>
                  <TableHead>Pattern Count</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecommendations.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRecommendationIds.has(rec.id)}
                        onCheckedChange={() => toggleRecommendationSelection(rec.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{rec.pattern}</TableCell>
                    <TableCell className="font-medium">{rec.suggested_merchant_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rec.pattern_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(rec, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(rec, 'approve_rename')}
                        >
                          Rename
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(rec, 'merge')}
                        >
                          <Merge className="h-4 w-4 mr-1" />
                          Merge
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(rec, 'deny')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Deny
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

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={(open) => {
        setShowReviewDialog(open);
        if (!open) {
          setMerchantSearchQuery('');
          setSelectedMerchantId(null);
          setMerchantPopoverOpen(false);
          setIncludedPatterns(new Map()); // Clear pattern selections
          // Don't clear selectedRecommendationIds here - let user keep selection after dialog closes
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRecommendations.length > 1 ? (
                <>
                  {reviewAction === 'approve' && 'Approve Recommendations'}
                  {reviewAction === 'approve_rename' && 'Approve & Rename Recommendations'}
                  {reviewAction === 'merge' && 'Merge Recommendations with Existing Merchant'}
                  {reviewAction === 'deny' && 'Deny Recommendations'}
                </>
              ) : (
                <>
                  {reviewAction === 'approve' && 'Approve Recommendation'}
                  {reviewAction === 'approve_rename' && 'Approve & Rename'}
                  {reviewAction === 'merge' && 'Merge with Existing Merchant'}
                  {reviewAction === 'deny' && 'Deny Recommendation'}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedRecommendations.length > 1 ? (
                <>
                  Processing {selectedRecommendations.length} recommendation(s)
                  <br />
                  Total patterns to group: {allPatterns.length}
                </>
              ) : selectedRecommendation ? (
                <>
                  Pattern: <span className="font-mono">{selectedRecommendation.pattern}</span>
                  <br />
                  Suggested name: <span className="font-medium">{selectedRecommendation.suggested_merchant_name}</span>
                  <br />
                  Patterns to group: {allPatterns.length}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedRecommendations.length > 1 && (
              <div>
                <Label>Selected Recommendations</Label>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {selectedRecommendations.map((rec) => (
                    <div key={rec.id} className="text-sm bg-muted p-2 rounded">
                      <span className="font-medium">{rec.suggested_merchant_name}</span>
                      <span className="text-muted-foreground ml-2">
                        ({includedPatterns.get(rec.id)?.size || 0} of {getAllPatternsForRecommendation(rec).length} pattern{getAllPatternsForRecommendation(rec).length !== 1 ? 's' : ''} selected)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>
                Patterns to Process
                {selectedRecommendations.length === 1 && (
                  <span className="text-muted-foreground ml-2 text-sm font-normal">
                    (click × to exclude a pattern)
                  </span>
                )}
              </Label>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {selectedRecommendations.length > 1 ? (
                  // Show patterns grouped by recommendation for bulk operations
                  selectedRecommendations.map((rec) => {
                    const allRecPatterns = getAllPatternsForRecommendation(rec);
                    const included = includedPatterns.get(rec.id) || new Set();
                    const excluded = allRecPatterns.filter(p => !included.has(p));
                    
                    return (
                      <div key={rec.id} className="border rounded-lg p-3 space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">
                          {rec.suggested_merchant_name}
                        </div>
                        <div className="space-y-1">
                          {allRecPatterns.map((pattern) => {
                            const isIncluded = included.has(pattern);
                            return (
                              <div
                                key={pattern}
                                className={`text-sm font-mono p-2 rounded flex items-center justify-between gap-2 ${
                                  isIncluded ? 'bg-muted' : 'bg-muted/50 opacity-60'
                                }`}
                              >
                                <span>{pattern}</span>
                                {isIncluded ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => removePattern(rec.id, pattern)}
                                    title="Remove pattern"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => restorePattern(rec.id, pattern)}
                                    title="Add pattern back"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : selectedRecommendation ? (
                  // Show patterns for single recommendation
                  (() => {
                    const allRecPatterns = getAllPatternsForRecommendation(selectedRecommendation);
                    const included = includedPatterns.get(selectedRecommendation.id) || new Set();
                    
                    return allRecPatterns.map((pattern) => {
                      const isIncluded = included.has(pattern);
                      return (
                        <div
                          key={pattern}
                          className={`text-sm font-mono p-2 rounded flex items-center justify-between gap-2 ${
                            isIncluded ? 'bg-muted' : 'bg-muted/50 opacity-60'
                          }`}
                        >
                          <span>{pattern}</span>
                          {isIncluded ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => removePattern(selectedRecommendation.id, pattern)}
                              title="Remove pattern"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => restorePattern(selectedRecommendation.id, pattern)}
                              title="Add pattern back"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    });
                  })()
                ) : null}
              </div>
              {allPatterns.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No patterns selected. At least one pattern must be included.
                </p>
              )}
            </div>

            {reviewAction === 'approve_rename' && (
              <div>
                <Label htmlFor="new-merchant-name">New Merchant Name</Label>
                <Input
                  id="new-merchant-name"
                  value={newMerchantName}
                  onChange={(e) => setNewMerchantName(e.target.value)}
                  placeholder="Enter merchant name"
                />
              </div>
            )}

            {reviewAction === 'merge' && (
              <div>
                <Label htmlFor="merge-merchant">Select Merchant to Merge With</Label>
                <Popover open={merchantPopoverOpen} onOpenChange={setMerchantPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {selectedMerchantId
                        ? availableMerchants.find(m => m.id === selectedMerchantId)?.display_name || 'Select merchant...'
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
                      {availableMerchants
                        .filter(m => m.display_name.toLowerCase().includes(merchantSearchQuery.toLowerCase()))
                        .map((merchant) => (
                          <div
                            key={merchant.id}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
                            onClick={() => {
                              setSelectedMerchantId(merchant.id);
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
                            <span>{merchant.display_name}</span>
                          </div>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div>
              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
              <Input
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this decision..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={
                isProcessing ||
                (reviewAction === 'approve_rename' && !newMerchantName.trim()) ||
                (reviewAction === 'merge' && !selectedMerchantId) ||
                allPatterns.length === 0
              }
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

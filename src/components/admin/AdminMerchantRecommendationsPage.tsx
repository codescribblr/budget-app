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
import { Search, CheckCircle, XCircle, Merge, ChevronDown } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'denied' | 'merged'>('pending');
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

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const statusParam = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await fetch(`/api/admin/merchant-recommendations${statusParam}`);
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
  }, [statusFilter]);

  useEffect(() => {
    if (reviewAction === 'merge') {
      fetchMerchants(merchantSearchQuery);
    }
  }, [reviewAction, merchantSearchQuery]);

  const handleReview = (recommendation: MerchantRecommendation, action: 'approve' | 'approve_rename' | 'deny' | 'merge') => {
    setSelectedRecommendation(recommendation);
    setReviewAction(action);
    setNewMerchantName(recommendation.suggested_merchant_name);
    setSelectedMerchantId(null);
    setMerchantSearchQuery('');
    setAdminNotes('');
    setShowReviewDialog(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedRecommendation) return;

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
      const response = await fetch(`/api/admin/merchant-recommendations/${selectedRecommendation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          merchant_name: reviewAction === 'approve_rename' ? newMerchantName.trim() : undefined,
          merchant_id: reviewAction === 'merge' ? selectedMerchantId : undefined,
          admin_notes: adminNotes.trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          reviewAction === 'approve' || reviewAction === 'approve_rename'
            ? `Merchant created and ${data.patterns_grouped || 1} pattern(s) grouped`
            : reviewAction === 'merge'
            ? `Patterns merged into existing merchant`
            : 'Recommendation denied'
        );
        setShowReviewDialog(false);
        setSelectedRecommendation(null);
        setReviewAction(null);
        fetchRecommendations();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to process recommendation');
      }
    } catch (error) {
      console.error('Error processing recommendation:', error);
      toast.error('Failed to process recommendation');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRecommendations = recommendations.filter(rec =>
    rec.suggested_merchant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.pattern.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const patterns = selectedRecommendation?.merchant_recommendation_patterns || [];
  const allPatterns = patterns.length > 0 
    ? patterns.map(p => p.pattern)
    : [selectedRecommendation?.pattern || ''];

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
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Pending ({recommendations.filter(r => r.status === 'pending').length})
              </Button>
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
            </div>
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

      {/* Recommendations Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === 'pending' ? 'Pending Recommendations' : 'All Recommendations'}
          </CardTitle>
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
                  <TableHead>Pattern</TableHead>
                  <TableHead>Suggested Name</TableHead>
                  <TableHead>Pattern Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecommendations.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-mono text-sm">{rec.pattern}</TableCell>
                    <TableCell className="font-medium">{rec.suggested_merchant_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rec.pattern_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          rec.status === 'approved' ? 'default' :
                          rec.status === 'denied' ? 'destructive' :
                          rec.status === 'merged' ? 'secondary' :
                          'outline'
                        }
                      >
                        {rec.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(rec.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {rec.status === 'pending' && (
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
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' && 'Approve Recommendation'}
              {reviewAction === 'approve_rename' && 'Approve & Rename'}
              {reviewAction === 'merge' && 'Merge with Existing Merchant'}
              {reviewAction === 'deny' && 'Deny Recommendation'}
            </DialogTitle>
            <DialogDescription>
              {selectedRecommendation && (
                <>
                  Pattern: <span className="font-mono">{selectedRecommendation.pattern}</span>
                  <br />
                  Suggested name: <span className="font-medium">{selectedRecommendation.suggested_merchant_name}</span>
                  <br />
                  Patterns to group: {allPatterns.length}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {allPatterns.length > 1 && (
              <div>
                <Label>All Patterns (will be grouped together)</Label>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {allPatterns.map((pattern, idx) => (
                    <div key={idx} className="text-sm font-mono bg-muted p-2 rounded">
                      {pattern}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                <Popover>
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
                (reviewAction === 'merge' && !selectedMerchantId)
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

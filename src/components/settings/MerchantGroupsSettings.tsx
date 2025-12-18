'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Sparkles, Eye, Link } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAccountPermissions } from '@/hooks/use-account-permissions';

interface AutoGroupPreview {
  display_name: string;
  description_count: number;
  confidence: number;
  sample_descriptions: string[];
}

interface AutoGroupResult {
  dry_run?: boolean;
  total_descriptions: number;
  groups_to_create?: number;
  groups_created?: number;
  mappings_created?: number;
  threshold_used?: number;
  preview?: AutoGroupPreview[];
}

export default function MerchantGroupsSettings() {
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const [isRunning, setIsRunning] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<AutoGroupResult | null>(null);
  const [unlinkedCount, setUnlinkedCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(true);

  // Track if fetch is in progress to prevent duplicate calls
  const fetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  // Fetch unlinked transaction count on mount
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      fetchUnlinkedCount();
    }
  }, []);

  const fetchUnlinkedCount = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setIsLoadingCount(true);
      const response = await fetch('/api/merchant-groups/unlinked-count');

      if (!response.ok) {
        throw new Error('Failed to fetch unlinked count');
      }

      const data = await response.json();
      
      // Validate count is a number
      if (typeof data.count === 'number') {
        setUnlinkedCount(data.count);
      } else {
        console.error('Invalid unlinked count data:', data);
        setUnlinkedCount(null);
      }
    } catch (error) {
      console.error('Error fetching unlinked count:', error);
      // Don't show error toast, just set count to null
      setUnlinkedCount(null);
    } finally {
      setIsLoadingCount(false);
      fetchingRef.current = false;
    }
  };

  const runAutoGroup = async (dryRun: boolean = false) => {
    try {
      setIsRunning(true);

      const response = await fetch('/api/merchant-groups/auto-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: 0.85, dryRun }),
      });

      if (!response.ok) {
        throw new Error('Failed to auto-group merchants');
      }

      const result: AutoGroupResult = await response.json();

      if (dryRun) {
        setPreviewData(result);
        setShowPreview(true);
      } else {
        toast.success(
          `Created ${result.groups_created} merchant groups with ${result.mappings_created} mappings from ${result.total_descriptions} unique descriptions.`
        );
        setShowPreview(false);
      }
    } catch (error) {
      console.error('Error auto-grouping merchants:', error);
      toast.error('Failed to auto-group merchants. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  const handlePreview = () => {
    runAutoGroup(true);
  };

  const handleRunAutoGroup = () => {
    runAutoGroup(false);
  };

  const handleBackfill = async () => {
    try {
      setIsBackfilling(true);

      const response = await fetch('/api/merchant-groups/backfill', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to backfill merchant groups');
      }

      const result = await response.json();

      if (result.updated > 0) {
        toast.success(
          `Successfully linked ${result.updated} transactions to their merchant groups.`
        );
      } else {
        toast.info('All transactions are already linked to merchant groups.');
      }

      // Refresh the unlinked count after backfilling
      await fetchUnlinkedCount();
    } catch (error) {
      console.error('Error backfilling merchant groups:', error);
      toast.error('Failed to backfill merchant groups. Please try again.');
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Merchant Grouping</CardTitle>
          <CardDescription>
            Automatically group similar merchant names to clean up your reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">What is Merchant Grouping?</h4>
            <p className="text-sm text-muted-foreground">
              Merchant grouping analyzes your transaction descriptions and automatically groups
              similar merchants together. For example, transactions like:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 space-y-1">
              <li>"PROVIDENT FUNDIN ACH PMT 250801 9133080725"</li>
              <li>"PROVIDENT FUNDIN ACH PMT 251001 9133080725"</li>
              <li>"PROVIDENT FUNDIN ACH PMT 250901 9133080725"</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Will all be grouped under a single merchant: "Provident Fundin"
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">How It Works</h4>
            <ol className="text-sm text-muted-foreground list-decimal list-inside ml-4 space-y-1">
              <li>Analyzes all unique transaction descriptions</li>
              <li>Removes dates, transaction IDs, and noise words</li>
              <li>Groups similar descriptions using fuzzy matching (85% similarity)</li>
              <li>Creates merchant groups with clean, readable names</li>
              <li>You can manually adjust any groupings later</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Link Existing Transactions</h4>
            <p className="text-sm text-muted-foreground">
              If you have existing transactions that aren't showing merchant names, use the "Link Transactions"
              button to connect them to their merchant groups. This is useful after importing old data or if
              merchant names aren't appearing in your transaction list.
            </p>
          </div>

          <div className="flex gap-2 pt-4 flex-wrap">
            <Button
              onClick={handlePreview}
              disabled={isRunning || isBackfilling || !isEditor || permissionsLoading}
              variant="outline"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Grouping
                </>
              )}
            </Button>
            <Button
              onClick={handleRunAutoGroup}
              disabled={isRunning || isBackfilling || !isEditor || permissionsLoading}
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Run Auto-Grouping
                </>
              )}
            </Button>
            {!isLoadingCount && unlinkedCount !== null && unlinkedCount > 0 && (
              <Button
                onClick={handleBackfill}
                disabled={isRunning || isBackfilling || !isEditor || permissionsLoading}
                variant="secondary"
              >
                {isBackfilling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    Link {unlinkedCount} {unlinkedCount === 1 ? 'Transaction' : 'Transactions'}
                  </>
                )}
              </Button>
            )}
          </div>
          {!isEditor && !permissionsLoading && (
            <p className="text-sm text-muted-foreground">Only editors and owners can manage merchant groups</p>
          )}

          <p className="text-xs text-muted-foreground">
            Note: Auto-grouping is safe and reversible. You can always manually adjust or remove
            groupings later.
          </p>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Auto-Grouping Preview</DialogTitle>
            <DialogDescription>
              Review the merchant groups that will be created
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Descriptions</p>
                  <p className="text-2xl font-bold">{previewData.total_descriptions}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Groups to Create</p>
                  <p className="text-2xl font-bold">{previewData.groups_to_create}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reduction</p>
                  <p className="text-2xl font-bold">
                    {previewData.groups_to_create && previewData.total_descriptions
                      ? Math.round(
                          ((previewData.total_descriptions - previewData.groups_to_create) /
                            previewData.total_descriptions) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Preview (Top 10 Groups)</h4>
                {previewData.preview?.map((group, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{group.display_name}</CardTitle>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          <span>{group.description_count} descriptions</span>
                          <span>•</span>
                          <span>{Math.round(group.confidence * 100)}% confidence</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">Sample descriptions:</p>
                      <ul className="text-xs space-y-1">
                        {group.sample_descriptions.map((desc, descIdx) => (
                          <li key={descIdx} className="font-mono bg-muted p-2 rounded">
                            {desc}
                          </li>
                        ))}
                        {group.description_count > 3 && (
                          <li className="text-muted-foreground italic">
                            ... and {group.description_count - 3} more
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowPreview(false);
                    handleRunAutoGroup();
                  }}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Confirm & Run
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import { useRouter } from 'next/navigation';

interface QueuedImportBatch {
  batch_id: string;
  import_setup_id: number;
  setup_name: string;
  source_type: string;
  count: number;
  date_range: { start: string; end: string };
  created_at: string;
  status: string;
}

export default function QueueReviewPage() {
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const router = useRouter();
  const [batches, setBatches] = useState<QueuedImportBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!permissionsLoading) {
      fetchBatches();
    }
  }, [permissionsLoading]);

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/automatic-imports/queue?batches=true');
      if (!response.ok) throw new Error('Failed to fetch batches');
      const data = await response.json();
      setBatches(data.batches || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewBatch = (batchId: string) => {
    router.push(`/imports/queue/${batchId}`);
  };

  if (permissionsLoading || loading) {
    return <div>Loading...</div>;
  }

  if (!isEditor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Queue</CardTitle>
          <CardDescription>
            You don't have permission to review imports. Only editors and owners can review and approve imports.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Queue</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve transactions queued from automatic imports before they are added to your budget.
        </p>
      </div>

      {batches.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Queued Imports</CardTitle>
            <CardDescription>
              When automatic imports fetch new transactions, they will appear here for review.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {batches.map((batch) => (
            <Card key={batch.batch_id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{batch.setup_name}</CardTitle>
                    <CardDescription>
                      {batch.count} transaction{batch.count !== 1 ? 's' : ''} • {batch.source_type}
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleReviewBatch(batch.batch_id)}>
                    Review
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Date range: {new Date(batch.date_range.start).toLocaleDateString()} - {new Date(batch.date_range.end).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

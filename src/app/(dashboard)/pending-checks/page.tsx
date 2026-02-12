'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import type { PendingCheck } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { FileText, Plus, Edit, Grid3X3, List } from 'lucide-react';
import PendingCheckDialog from '@/components/pending-checks/PendingCheckDialog';
import { useLocalStorage } from '@/hooks/use-local-storage';

type ViewMode = 'cards' | 'list';

export default function PendingChecksPage() {
  const router = useRouter();
  const [pendingChecks, setPendingChecks] = useState<PendingCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPendingCheck, setEditingPendingCheck] = useState<PendingCheck | null>(null);
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('pending-checks-view', 'cards');

  const fetchPendingChecks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pending-checks');
      if (!response.ok) throw new Error('Failed to fetch pending checks');
      const data = await response.json();
      setPendingChecks(data);
    } catch (error) {
      console.error('Error fetching pending checks:', error);
      toast.error('Failed to load pending checks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingChecks();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Pending Checks</h1>
          <p className="text-muted-foreground mt-1">Manage your pending checks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center border rounded-md p-0.5">
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setViewMode('cards')}
              aria-label="Card view"
            >
              <Grid3X3 className="h-4 w-4 mr-1.5" />
              Cards
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List className="h-4 w-4 mr-1.5" />
              List
            </Button>
          </div>
          <Button
            onClick={() => {
              setEditingPendingCheck(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Pending Check
          </Button>
        </div>
      </div>

      {pendingChecks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pending checks</h3>
            <p className="text-muted-foreground">
              Pending checks will appear here once you add them from the dashboard
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <Card>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingChecks.map((check) => (
                <TableRow
                  key={check.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/pending-checks/${check.id}`)}
                >
                  <TableCell className="font-medium">{check.description}</TableCell>
                  <TableCell>
                    <Badge variant={check.type === 'income' ? 'default' : 'destructive'}>
                      {check.type === 'income' ? 'Income' : 'Expense'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(check.amount)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPendingCheck(check);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingChecks.map((check) => (
            <Card
              key={check.id}
              className="cursor-pointer hover:shadow-md transition-shadow h-full"
              onClick={() => router.push(`/pending-checks/${check.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <CardTitle className="text-lg">{check.description}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={check.type === 'income' ? 'default' : 'destructive'}>
                      {check.type === 'income' ? 'Income' : 'Expense'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPendingCheck(check);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(check.amount)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PendingCheckDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingPendingCheck(null);
        }}
        pendingCheck={editingPendingCheck}
        onSuccess={() => {
          fetchPendingChecks();
          setIsDialogOpen(false);
          setEditingPendingCheck(null);
        }}
      />
    </div>
  );
}

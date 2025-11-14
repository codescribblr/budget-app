'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Trash2, HardDrive, RotateCcw } from 'lucide-react';

interface Backup {
  id: number;
  created_at: string;
}

export default function DataBackup() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreBackupId, setRestoreBackupId] = useState<number | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');

  // Fetch backups
  const fetchBackups = async () => {
    try {
      const response = await fetch('/api/backups');
      if (!response.ok) throw new Error('Failed to fetch backups');
      const data = await response.json();
      setBackups(data.backups);
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast.error('Failed to load backups');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  // Create backup
  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/backups', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create backup');
      }

      toast.success('Backup created successfully');
      await fetchBackups();
    } catch (error: any) {
      console.error('Error creating backup:', error);
      toast.error(error.message || 'Failed to create backup');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete backup
  const handleDeleteBackup = async (id: number) => {
    setIsDeletingId(id);
    try {
      const response = await fetch(`/api/backups/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete backup');

      toast.success('Backup deleted successfully');
      await fetchBackups();
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast.error('Failed to delete backup');
    } finally {
      setIsDeletingId(null);
    }
  };

  // Open restore dialog
  const openRestoreDialog = (id: number) => {
    setRestoreBackupId(id);
    setRestoreConfirmText('');
    setShowRestoreDialog(true);
  };

  // Restore backup
  const handleRestoreBackup = async () => {
    if (restoreConfirmText.toLowerCase() !== 'restore') {
      toast.error('Please type "restore" to confirm');
      return;
    }

    if (!restoreBackupId) return;

    setIsRestoring(true);
    try {
      const response = await fetch(`/api/backups/${restoreBackupId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to restore backup');

      toast.success('Backup restored successfully! Refreshing page...');
      setShowRestoreDialog(false);
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast.error('Failed to restore backup');
      setIsRestoring(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Data Backup
          </CardTitle>
          <CardDescription>
            Create and manage backups of your budget data (maximum 3 backups)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create Backup Button */}
          <div>
            <Button
              onClick={handleCreateBackup}
              disabled={isCreating || isLoading}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Backup
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              {backups.length}/3 backups used
            </p>
          </div>

          {/* Backups List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No backups yet. Create your first backup to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{formatDate(backup.created_at)}</p>
                    <p className="text-sm text-muted-foreground">
                      Backup ID: {backup.id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRestoreDialog(backup.id)}
                      disabled={isRestoring}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restore
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteBackup(backup.id)}
                      disabled={isDeletingId === backup.id}
                    >
                      {isDeletingId === backup.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-4">
                This will <strong>permanently delete all your current data</strong> and replace it with the backup data.
              </p>
              <p className="mb-4 text-destructive font-semibold">
                This action cannot be undone!
              </p>
              <p className="mb-2">
                To confirm, please type <strong>restore</strong> below:
              </p>
              <Input
                value={restoreConfirmText}
                onChange={(e) => setRestoreConfirmText(e.target.value)}
                placeholder="Type 'restore' to confirm"
                className="mt-2"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreBackup}
              disabled={isRestoring || restoreConfirmText.toLowerCase() !== 'restore'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRestoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restore Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


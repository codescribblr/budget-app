'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Loader2, Trash2, HardDrive, RotateCcw, Download, Upload } from 'lucide-react';
import { handleApiError } from '@/lib/api-error-handler';

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

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importConfirmText, setImportConfirmText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  // Track if fetch is in progress to prevent duplicate calls
  const fetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  // Fetch backups
  const fetchBackups = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      const response = await fetch('/api/backups');
      if (!response.ok) throw new Error('Failed to fetch backups');
      const data = await response.json();
      
      // Ensure backups is always an array
      if (data && Array.isArray(data.backups)) {
        setBackups(data.backups);
      } else {
        console.error('Invalid backups data:', data);
        setBackups([]);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast.error('Failed to load backups');
      setBackups([]); // Set empty array on error
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      fetchBackups();
    }
  }, []);

  // Create backup
  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/backups', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to create backup');
        throw new Error(errorMessage || 'Failed to create backup');
      }

      toast.success('Backup created successfully');
      await fetchBackups();
    } catch (error: any) {
      console.error('Error creating backup:', error);
      // Error toast already shown by handleApiError
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

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to delete backup');
        throw new Error(errorMessage || 'Failed to delete backup');
      }

      toast.success('Backup deleted successfully');
      await fetchBackups();
    } catch (error) {
      console.error('Error deleting backup:', error);
      // Error toast already shown by handleApiError
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
    setShowRestoreDialog(false);
    setShowProgressDialog(true);
    setImportProgress('Preparing to restore backup...');

    try {
      setImportProgress('Deleting existing data...');
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for UI update

      const response = await fetch(`/api/backups/${restoreBackupId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to restore backup');
        throw new Error(errorMessage || 'Failed to restore backup');
      }

      setImportProgress('Restore complete! Refreshing page...');

      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast.error('Failed to restore backup');
      setIsRestoring(false);
      setShowProgressDialog(false);
    }
  };

  // Download backup as JSON file
  const handleDownloadBackup = async (id: number) => {
    try {
      const response = await fetch(`/api/backups/${id}/export`);

      if (!response.ok) throw new Error('Failed to download backup');

      const backupData = await response.json();

      // Create a blob from the JSON data
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Backup downloaded successfully');
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast.error('Failed to download backup');
    }
  };

  // Open import dialog
  const openImportDialog = () => {
    setImportFile(null);
    setImportConfirmText('');
    setShowImportDialog(true);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json') {
        toast.error('Please select a JSON file');
        return;
      }
      setImportFile(file);
    }
  };

  // Import backup from file
  const handleImportFromFile = async () => {
    if (importConfirmText.toLowerCase() !== 'restore') {
      toast.error('Please type "restore" to confirm');
      return;
    }

    if (!importFile) {
      toast.error('Please select a file to import');
      return;
    }

    setIsImporting(true);
    setShowImportDialog(false);
    setShowProgressDialog(true);
    setImportProgress('Reading backup file...');

    try {
      // Read the file
      const fileContent = await importFile.text();
      const backupData = JSON.parse(fileContent);

      setImportProgress('Deleting existing data...');
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for UI update

      // Send to API
      const response = await fetch('/api/backups/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupData),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to import backup');
        throw new Error(errorMessage || 'Failed to import backup');
      }

      setImportProgress('Import complete! Refreshing page...');

      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (error) {
      console.error('Error importing backup:', error);
      toast.error('Failed to import backup. Please check the file format.');
      setIsImporting(false);
      setShowProgressDialog(false);
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
          {/* Create Backup and Import Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleCreateBackup}
              disabled={isCreating || isLoading}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Backup
            </Button>
            <Button
              variant="outline"
              onClick={openImportDialog}
              disabled={isLoading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import from File
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {backups.length}/3 backups used
          </p>

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
                      onClick={() => handleDownloadBackup(backup.id)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
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
            <AlertDialogDescription asChild>
              <div>
                <div className="mb-4">
                  This will <strong>permanently delete all your current data</strong> and replace it with the backup data.
                </div>
                <div className="mb-4 text-destructive font-semibold">
                  This action cannot be undone!
                </div>
                <div className="mb-2">
                  To confirm, please type <strong>restore</strong> below:
                </div>
                <Input
                  value={restoreConfirmText}
                  onChange={(e) => setRestoreConfirmText(e.target.value)}
                  placeholder="Type 'restore' to confirm"
                  className="mt-2"
                />
              </div>
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

      {/* Import from File Dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Backup from File?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <div className="mb-4">
                  This will <strong>permanently delete all your current data</strong> and replace it with the data from the imported file.
                </div>
                <div className="mb-4 text-destructive font-semibold">
                  This action cannot be undone!
                </div>
                <div className="mb-4">
                  <Label htmlFor="backup-file">Select Backup File (JSON)</Label>
                  <Input
                    id="backup-file"
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="mt-2"
                  />
                  {importFile && (
                    <div className="text-sm text-muted-foreground mt-2">
                      Selected: {importFile.name}
                    </div>
                  )}
                </div>
                <div className="mb-2">
                  To confirm, please type <strong>restore</strong> below:
                </div>
                <Input
                  value={importConfirmText}
                  onChange={(e) => setImportConfirmText(e.target.value)}
                  placeholder="Type 'restore' to confirm"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImportFromFile}
              disabled={isImporting || !importFile || importConfirmText.toLowerCase() !== 'restore'}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress Dialog - Cannot be dismissed */}
      <AlertDialog open={showProgressDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing Backup...
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <div className="mb-4">
                  Please wait while we process your data. This may take a few moments.
                </div>
                <div className="text-sm font-medium text-foreground">
                  {importProgress}
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Do not close this window or navigate away from this page.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


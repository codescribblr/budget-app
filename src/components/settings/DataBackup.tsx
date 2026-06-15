'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Trash2, HardDrive, RotateCcw, Download, Upload, FileOutput } from 'lucide-react';
import { handleApiError } from '@/lib/api-error-handler';
import BackupTypeSelector, { ALL_BACKUP_DATA_TYPES, BACKUP_SELECTION_DIALOG_CLASS } from '@/components/settings/BackupTypeSelector';
import {
  type BackupDataType,
  filterBackupDataByTypes,
  getBackupRecordCount,
  getTypesPresentInBackup,
  resolveBackupTypeSelection,
} from '@/lib/backup-data-types';
import { validateBackupJsonString } from '@/lib/backup-validation';

interface Backup {
  id: number;
  created_at: string;
}

interface BackupPreview {
  typesPresent: BackupDataType[];
  recordCounts: Partial<Record<BackupDataType, number>>;
  included_types?: BackupDataType[];
}

export default function DataBackup() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [maxBackups, setMaxBackups] = useState(3);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreBackupId, setRestoreBackupId] = useState<number | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [restoreSelectedTypes, setRestoreSelectedTypes] = useState<BackupDataType[]>([]);
  const [restorePreview, setRestorePreview] = useState<BackupPreview | null>(null);
  const [isLoadingRestorePreview, setIsLoadingRestorePreview] = useState(false);

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importConfirmText, setImportConfirmText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [importBackupData, setImportBackupData] = useState<Record<string, unknown> | null>(null);
  const [importSelectedTypes, setImportSelectedTypes] = useState<BackupDataType[]>([]);
  const [importTypesPresent, setImportTypesPresent] = useState<BackupDataType[]>([]);
  const [importRecordCounts, setImportRecordCounts] = useState<Partial<Record<BackupDataType, number>>>({});

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportSelectedTypes, setExportSelectedTypes] = useState<BackupDataType[]>([...ALL_BACKUP_DATA_TYPES]);
  const [isExporting, setIsExporting] = useState(false);

  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloadBackupId, setDownloadBackupId] = useState<number | null>(null);
  const [downloadSelectedTypes, setDownloadSelectedTypes] = useState<BackupDataType[]>([]);
  const [downloadPreview, setDownloadPreview] = useState<BackupPreview | null>(null);
  const [isLoadingDownloadPreview, setIsLoadingDownloadPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  const isPartialRestore =
    !restorePreview ||
    restoreSelectedTypes.length < ALL_BACKUP_DATA_TYPES.length ||
    restorePreview.typesPresent.length < ALL_BACKUP_DATA_TYPES.length;

  const isPartialImport =
    importTypesPresent.length === 0 ||
    importSelectedTypes.length < ALL_BACKUP_DATA_TYPES.length ||
    importTypesPresent.length < ALL_BACKUP_DATA_TYPES.length;

  const fetchBackups = async () => {
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      const response = await fetch('/api/backups');
      if (!response.ok) throw new Error('Failed to fetch backups');
      const data = await response.json();

      if (data && Array.isArray(data.backups)) {
        setBackups(data.backups);
      } else {
        console.error('Invalid backups data:', data);
        setBackups([]);
      }

      if (data.maxBackups !== undefined) {
        setMaxBackups(data.maxBackups);
      }
      if (data.isPremium !== undefined) {
        setIsPremium(data.isPremium);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast.error('Failed to load backups');
      setBackups([]);
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

  const loadBackupPreview = async (backupId: number): Promise<BackupPreview> => {
    const response = await fetch(`/api/backups/${backupId}/preview`);
    if (!response.ok) {
      const errorMessage = await handleApiError(response, 'Failed to load backup details');
      throw new Error(errorMessage || 'Failed to load backup details');
    }
    return response.json();
  };

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
    } catch (error) {
      console.error('Error creating backup:', error);
    } finally {
      setIsCreating(false);
    }
  };

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
    } finally {
      setIsDeletingId(null);
    }
  };

  const openRestoreDialog = async (id: number) => {
    setRestoreBackupId(id);
    setRestoreConfirmText('');
    setRestorePreview(null);
    setRestoreSelectedTypes([]);
    setShowRestoreDialog(true);
    setIsLoadingRestorePreview(true);

    try {
      const preview = await loadBackupPreview(id);
      setRestorePreview(preview);
      setRestoreSelectedTypes(preview.typesPresent);
    } catch (error) {
      console.error('Error loading restore preview:', error);
      toast.error('Failed to load backup details');
      setShowRestoreDialog(false);
    } finally {
      setIsLoadingRestorePreview(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (restoreConfirmText.toLowerCase() !== 'restore') {
      toast.error('Please type "restore" to confirm');
      return;
    }

    if (!restoreBackupId || restoreSelectedTypes.length === 0) return;

    setIsRestoring(true);
    setShowRestoreDialog(false);
    setShowProgressDialog(true);
    setImportProgress('Preparing to restore backup...');

    try {
      setImportProgress(
        isPartialRestore
          ? 'Replacing selected data types...'
          : 'Deleting existing data...'
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await fetch(`/api/backups/${restoreBackupId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedTypes: restoreSelectedTypes }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to restore backup');
        throw new Error(errorMessage || 'Failed to restore backup');
      }

      setImportProgress('Restore complete! Refreshing page...');
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

  const openDownloadDialog = async (id: number) => {
    setDownloadBackupId(id);
    setDownloadPreview(null);
    setDownloadSelectedTypes([]);
    setShowDownloadDialog(true);
    setIsLoadingDownloadPreview(true);

    try {
      const preview = await loadBackupPreview(id);
      setDownloadPreview(preview);
      setDownloadSelectedTypes(preview.typesPresent);
    } catch (error) {
      console.error('Error loading download preview:', error);
      toast.error('Failed to load backup details');
      setShowDownloadDialog(false);
    } finally {
      setIsLoadingDownloadPreview(false);
    }
  };

  const handleDownloadBackup = async () => {
    if (!downloadBackupId || downloadSelectedTypes.length === 0) return;

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/backups/${downloadBackupId}/export`);
      if (!response.ok) throw new Error('Failed to download backup');

      const backupData = await response.json();
      const resolvedTypes = resolveBackupTypeSelection(downloadSelectedTypes, {
        limitTo: downloadPreview?.typesPresent,
      });
      const filteredBackup = filterBackupDataByTypes(backupData, resolvedTypes);

      const blob = new Blob([JSON.stringify(filteredBackup, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Backup downloaded successfully');
      setShowDownloadDialog(false);
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast.error('Failed to download backup');
    } finally {
      setIsDownloading(false);
    }
  };

  const openExportDialog = () => {
    setExportSelectedTypes([...ALL_BACKUP_DATA_TYPES]);
    setShowExportDialog(true);
  };

  const handleExportToFile = async () => {
    if (exportSelectedTypes.length === 0) {
      toast.error('Select at least one data type to export');
      return;
    }

    setIsExporting(true);
    try {
      const isFullExport = exportSelectedTypes.length === ALL_BACKUP_DATA_TYPES.length;
      const response = await fetch('/api/backups/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isFullExport ? {} : { selectedTypes: exportSelectedTypes }
        ),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to export backup');
        throw new Error(errorMessage || 'Failed to export backup');
      }

      const backupData = await response.json();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Backup exported successfully');
      setShowExportDialog(false);
    } catch (error) {
      console.error('Error exporting backup:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const openImportDialog = () => {
    setImportFile(null);
    setImportConfirmText('');
    setImportBackupData(null);
    setImportSelectedTypes([]);
    setImportTypesPresent([]);
    setImportRecordCounts({});
    setShowImportDialog(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      toast.error('Please select a JSON file');
      return;
    }

    setImportFile(file);

    try {
      const fileContent = await file.text();
      const validation = validateBackupJsonString(fileContent);
      if (!validation.valid) {
        toast.error(validation.error);
        setImportFile(null);
        return;
      }

      const backupData = validation.backup;

      const typesPresent = getTypesPresentInBackup(backupData);
      const recordCounts = Object.fromEntries(
        ALL_BACKUP_DATA_TYPES.map((type) => [type, getBackupRecordCount(backupData, type)])
      ) as Partial<Record<BackupDataType, number>>;

      setImportBackupData(backupData);
      setImportTypesPresent(typesPresent);
      setImportRecordCounts(recordCounts);
      setImportSelectedTypes(typesPresent);
    } catch (error) {
      console.error('Error reading backup file:', error);
      toast.error('Failed to read backup file');
      setImportFile(null);
    }
  };

  const handleImportFromFile = async () => {
    if (importConfirmText.toLowerCase() !== 'restore') {
      toast.error('Please type "restore" to confirm');
      return;
    }

    if (!importFile || !importBackupData || importSelectedTypes.length === 0) {
      toast.error('Please select a file and at least one data type to import');
      return;
    }

    setIsImporting(true);
    setShowImportDialog(false);
    setShowProgressDialog(true);
    setImportProgress('Reading backup file...');

    try {
      setImportProgress(
        isPartialImport
          ? 'Replacing selected data types...'
          : 'Deleting existing data...'
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('selectedTypes', JSON.stringify(importSelectedTypes));

      const response = await fetch('/api/backups/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to import backup');
        throw new Error(errorMessage || 'Failed to import backup');
      }

      setImportProgress('Import complete! Refreshing page...');
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
            Create and manage backups of your budget data (maximum {maxBackups}{' '}
            {isPremium ? 'premium' : ''} backups)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreateBackup} disabled={isCreating || isLoading}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Backup
            </Button>
            <Button variant="outline" onClick={openExportDialog} disabled={isLoading}>
              <FileOutput className="mr-2 h-4 w-4" />
              Export to File
            </Button>
            <Button variant="outline" onClick={openImportDialog} disabled={isLoading}>
              <Upload className="mr-2 h-4 w-4" />
              Import from File
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {backups.length}/{maxBackups} backups used. Use Export to File to choose which data
            types to include. Imports let you restore only the types present in your backup file.
          </p>

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
                    <p className="text-sm text-muted-foreground">Backup ID: {backup.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDownloadDialog(backup.id)}
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

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className={BACKUP_SELECTION_DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle>Export to File</DialogTitle>
            <DialogDescription>
              Choose which data types to include. Related data is selected automatically when
              needed (for example, transactions require accounts and categories).
            </DialogDescription>
          </DialogHeader>
          <BackupTypeSelector
            availableTypes={[...ALL_BACKUP_DATA_TYPES]}
            selectedTypes={exportSelectedTypes}
            onChange={setExportSelectedTypes}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportToFile} disabled={isExporting || exportSelectedTypes.length === 0}>
              {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className={BACKUP_SELECTION_DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle>Download Backup</DialogTitle>
            <DialogDescription>
              Choose which data types from this stored backup to include in the download.
            </DialogDescription>
          </DialogHeader>
          {isLoadingDownloadPreview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : downloadPreview ? (
            <BackupTypeSelector
              availableTypes={downloadPreview.typesPresent}
              selectedTypes={downloadSelectedTypes}
              onChange={setDownloadSelectedTypes}
              recordCounts={downloadPreview.recordCounts}
            />
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDownloadDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDownloadBackup}
              disabled={isDownloading || downloadSelectedTypes.length === 0 || isLoadingDownloadPreview}
            >
              {isDownloading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent className={BACKUP_SELECTION_DIALOG_CLASS}>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Backup?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <div className="mb-4">
                  {isPartialRestore ? (
                    <>
                      This will <strong>replace only the selected data types</strong>. Other data
                      in your account will be left unchanged.
                    </>
                  ) : (
                    <>
                      This will <strong>permanently delete all your current data</strong> and
                      replace it with the backup data.
                    </>
                  )}
                </div>
                <div className="mb-4 text-destructive font-semibold">
                  This action cannot be undone!
                </div>

                {isLoadingRestorePreview ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : restorePreview ? (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Data types to restore:</p>
                    <BackupTypeSelector
                      availableTypes={restorePreview.typesPresent}
                      selectedTypes={restoreSelectedTypes}
                      onChange={setRestoreSelectedTypes}
                      recordCounts={restorePreview.recordCounts}
                    />
                  </div>
                ) : null}

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
              disabled={
                isRestoring ||
                restoreConfirmText.toLowerCase() !== 'restore' ||
                restoreSelectedTypes.length === 0 ||
                isLoadingRestorePreview
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRestoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restore Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent className={BACKUP_SELECTION_DIALOG_CLASS}>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Backup from File?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <div className="mb-4">
                  {isPartialImport ? (
                    <>
                      This will <strong>replace only the selected data types</strong>. Other data
                      in your account will be left unchanged.
                    </>
                  ) : (
                    <>
                      This will <strong>permanently delete all your current data</strong> and
                      replace it with the data from the imported file.
                    </>
                  )}
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

                {importTypesPresent.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Data types in this file:</p>
                    <BackupTypeSelector
                      availableTypes={importTypesPresent}
                      selectedTypes={importSelectedTypes}
                      onChange={setImportSelectedTypes}
                      recordCounts={importRecordCounts}
                    />
                  </div>
                )}

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
              disabled={
                isImporting ||
                !importFile ||
                importSelectedTypes.length === 0 ||
                importConfirmText.toLowerCase() !== 'restore'
              }
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <div className="text-sm font-medium text-foreground">{importProgress}</div>
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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Trash2 } from 'lucide-react';
import { listTemplates, deleteTemplate, type CSVImportTemplate } from '@/lib/mapping-templates';
import { toast } from 'sonner';
import { useAccountPermissions } from '@/hooks/use-account-permissions';

export default function ImportTemplatesPage() {
  const router = useRouter();
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const [templates, setTemplates] = useState<CSVImportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<CSVImportTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [templatesInUse, setTemplatesInUse] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!permissionsLoading) {
      fetchTemplates();
    }
  }, [permissionsLoading]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await listTemplates();
      setTemplates(data);
      
      // Fetch which templates are currently in use by queued imports
      await fetchTemplatesInUse();
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplatesInUse = async () => {
    try {
      // Fetch all queued imports (no status filter) to check which templates are in use
      // We'll filter for pending/reviewing status client-side
      const response = await fetch('/api/automatic-imports/queue');
      if (response.ok) {
        const data = await response.json();
        const allImports = data.imports || [];
        
        // Filter for pending or reviewing imports and get unique template IDs
        const templateIds = new Set<number>();
        
        allImports.forEach((qi: any) => {
          if ((qi.status === 'pending' || qi.status === 'reviewing') && qi.csv_mapping_template_id) {
            templateIds.add(qi.csv_mapping_template_id);
          }
        });
        
        setTemplatesInUse(templateIds);
      }
    } catch (error) {
      console.warn('Failed to fetch templates in use:', error);
      // Non-critical error, continue without this data
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete?.id) return;

    setIsDeleting(true);
    try {
      await deleteTemplate(templateToDelete.id);
      toast.success('Template deleted successfully');
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  };


  if (permissionsLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!isEditor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Templates</CardTitle>
          <CardDescription>
            You don't have permission to manage templates. Only editors and owners can manage templates.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Templates</h1>
        <p className="text-muted-foreground mt-2">
          Manage your CSV import mapping templates for faster imports.
        </p>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Templates</CardTitle>
            <CardDescription>
              You don't have any saved import templates yet. Templates are created when you save a mapping during CSV import.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Saved Templates</CardTitle>
            <CardDescription>
              {templates.length} template{templates.length !== 1 ? 's' : ''} saved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Fingerprint</TableHead>
                  <TableHead>Columns</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.templateName || 'Unnamed Template'}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {template.fingerprint.substring(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>{template.columnCount}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.usageCount || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      {template.lastUsed
                        ? new Date(template.lastUsed).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      {template.createdAt
                        ? new Date(template.createdAt).toLocaleDateString()
                        : 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {template.id && !templatesInUse.has(template.id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setTemplateToDelete(template);
                              setDeleteDialogOpen(true);
                            }}
                            title="Delete template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {template.id && templatesInUse.has(template.id) && (
                          <span className="text-xs text-muted-foreground" title="Template is in use by queued imports">
                            In use
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.templateName || 'this template'}"?
              This action cannot be undone. Future imports using this template will need to be mapped again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, Edit, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
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

interface ImportSetup {
  id: number;
  source_type: string;
  integration_name: string | null;
  bank_name: string | null;
  is_active: boolean;
  last_successful_fetch_at: string | null;
  last_error: string | null;
  error_count: number;
  estimated_monthly_cost: number | null;
}

interface ImportSetupCardProps {
  setup: ImportSetup;
  onDeleted: () => void;
  onUpdated: () => void;
}

export default function ImportSetupCard({ setup, onDeleted, onUpdated }: ImportSetupCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isActive, setIsActive] = useState(setup.is_active);
  const [updating, setUpdating] = useState(false);

  const handleToggleActive = async (checked: boolean) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/automatic-imports/setups/${setup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: checked }),
      });

      if (!response.ok) throw new Error('Failed to update setup');
      setIsActive(checked);
      onUpdated();
    } catch (error) {
      console.error('Error updating setup:', error);
      alert('Failed to update setup');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/automatic-imports/setups/${setup.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete setup');
      setShowDeleteDialog(false);
      onDeleted();
    } catch (error) {
      console.error('Error deleting setup:', error);
      alert('Failed to delete setup');
    }
  };

  const getSourceIcon = () => {
    switch (setup.source_type) {
      case 'email':
        return <Mail className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getSourceBadge = () => {
    const colors: Record<string, string> = {
      email: 'bg-blue-100 text-blue-800',
      plaid: 'bg-purple-100 text-purple-800',
      finicity: 'bg-green-100 text-green-800',
      mx: 'bg-orange-100 text-orange-800',
      teller: 'bg-gray-100 text-gray-800',
    };
    return colors[setup.source_type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {getSourceIcon()}
              <div>
                <CardTitle className="text-lg">
                  {setup.integration_name || `${setup.source_type} Import`}
                </CardTitle>
                <CardDescription>
                  {setup.bank_name && `${setup.bank_name} • `}
                  <Badge className={getSourceBadge()}>{setup.source_type}</Badge>
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={`active-${setup.id}`} className="text-sm">
                  Active
                </Label>
                <Switch
                  id={`active-${setup.id}`}
                  checked={isActive}
                  onCheckedChange={handleToggleActive}
                  disabled={updating}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last successful fetch:</span>
              <span>{formatDate(setup.last_successful_fetch_at)}</span>
            </div>
            
            {setup.error_count > 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{setup.error_count} error(s)</span>
                {setup.last_error && (
                  <span className="text-muted-foreground">• {setup.last_error.substring(0, 50)}...</span>
                )}
              </div>
            )}

            {setup.error_count === 0 && setup.last_successful_fetch_at && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Working correctly</span>
              </div>
            )}

            {setup.estimated_monthly_cost && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated monthly cost:</span>
                <span>${setup.estimated_monthly_cost.toFixed(2)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Import Setup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this import setup. Any queued transactions from this setup will also be deleted.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, KeyRound, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { AdminApiKeyListItem } from '@/lib/admin-api/types';

function statusBadge(status: AdminApiKeyListItem['status']) {
  switch (status) {
    case 'active':
      return <Badge variant="default">Active</Badge>;
    case 'grace':
      return <Badge variant="secondary">Grace period</Badge>;
    case 'expired':
      return <Badge variant="outline">Expired</Badge>;
    case 'revoked':
      return <Badge variant="destructive">Revoked</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function AdminApiKeysPage() {
  const [keys, setKeys] = useState<AdminApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const [secret, setSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<AdminApiKeyListItem | null>(null);
  const [rotateTarget, setRotateTarget] = useState<AdminApiKeyListItem | null>(null);
  const [graceHours, setGraceHours] = useState('24');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchingRef = useRef(false);

  const fetchKeys = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch('/api/admin/api-keys');
      if (!res.ok) throw new Error('Failed to load keys');
      const data = await res.json();
      setKeys(data.keys ?? []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load admin API keys');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.error || 'Create failed');
      }
      setSecret(data.secret);
      setShowSecret(true);
      setShowCreate(false);
      setName('');
      setExpiresAt('');
      await fetchKeys();
      toast.success('API key created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setBusyId(revokeTarget.id);
    try {
      const res = await fetch(`/api/admin/api-keys/${revokeTarget.id}/revoke`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Revoke failed');
      }
      toast.success('API key revoked');
      setRevokeTarget(null);
      await fetchKeys();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Revoke failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleRotate = async () => {
    if (!rotateTarget) return;
    setBusyId(rotateTarget.id);
    try {
      const hours = parseFloat(graceHours);
      const graceSeconds =
        !Number.isNaN(hours) && hours > 0 ? Math.round(hours * 3600) : 0;
      const res = await fetch(`/api/admin/api-keys/${rotateTarget.id}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grace_seconds: graceSeconds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Rotate failed');
      }
      setSecret(data.secret);
      setShowSecret(true);
      setRotateTarget(null);
      await fetchKeys();
      toast.success('API key rotated — copy the new secret');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Rotate failed');
    } finally {
      setBusyId(null);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin API Keys</h1>
          <p className="text-muted-foreground mt-2">
            Shared keys for the versioned Admin API (<code>/api/admin/v1</code>).
            Any admin can create or revoke. The full secret is shown only once.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Keys
          </CardTitle>
          <CardDescription>
            Use <code>Authorization: Bearer adm_…</code> against admin v1 endpoints.
            See <code>docs/ADMIN_API_V1.md</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              No admin API keys yet. Create one for your external merchant agent.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs">{key.key_prefix}…</code>
                    </TableCell>
                    <TableCell>{statusBadge(key.status)}</TableCell>
                    <TableCell className="text-sm">
                      {key.created_by_email || key.created_by.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(key.created_at)}</TableCell>
                    <TableCell className="text-sm">{formatDate(key.expires_at)}</TableCell>
                    <TableCell className="text-sm">{formatDate(key.last_used_at)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {key.status !== 'revoked' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === key.id}
                            onClick={() => {
                              setGraceHours('24');
                              setRotateTarget(key);
                            }}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Rotate
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busyId === key.id}
                            onClick={() => setRevokeTarget(key)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Revoke
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create admin API key</DialogTitle>
            <DialogDescription>
              The full secret is shown once after creation. Store it in your agent
              secrets manager.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="merchant-agent-prod"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-expires">Expires (optional)</Label>
              <Input
                id="key-expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showSecret}
        onOpenChange={(open) => {
          setShowSecret(open);
          if (!open) setSecret(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your API secret</DialogTitle>
            <DialogDescription>
              This is the only time the full secret is shown.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertDescription className="font-mono text-xs break-all">
              {secret}
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={copySecret}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              “{revokeTarget?.name}” will stop working immediately. This cannot be
              undone (create a new key instead).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!rotateTarget}
        onOpenChange={(open) => !open && setRotateTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate API key</DialogTitle>
            <DialogDescription>
              Issues a new secret for “{rotateTarget?.name}”. Optionally keep the
              old secret valid for a grace period so agents can roll over.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="grace-hours">Grace period (hours, 0 = immediate)</Label>
            <Input
              id="grace-hours"
              type="number"
              min={0}
              step={1}
              value={graceHours}
              onChange={(e) => setGraceHours(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRotateTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleRotate} disabled={!!busyId}>
              {busyId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rotate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

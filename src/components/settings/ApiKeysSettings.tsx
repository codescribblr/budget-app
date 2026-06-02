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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, KeyRound, Loader2, Plus, ScrollText, Trash2 } from 'lucide-react';
import { handleApiError } from '@/lib/api-error-handler';
import type { ApiScope } from '@/lib/external-api/types';

interface ApiKeyListItem {
  id: string;
  name: string;
  key_prefix: string;
  permissions: ApiScope[];
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface ScopeSection {
  section: string;
  label: string;
  description: string;
}

interface ScopePreset {
  id: string;
  name: string;
  description: string;
  permissions: ApiScope[];
}

interface ApiKeyUsageLog {
  id: number;
  method: string;
  path: string;
  scope_used: string | null;
  status_code: number;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function ApiKeysSettings() {
  const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
  const [sections, setSections] = useState<ScopeSection[]>([]);
  const [presets, setPresets] = useState<ScopePreset[]>([]);
  const [apiAccessEnabled, setApiAccessEnabled] = useState(true);
  const [apiDisabledMessage, setApiDisabledMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('read_only_assistant');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<ApiScope>>(new Set());
  const [optionalExpiry, setOptionalExpiry] = useState('');
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);

  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [showSecretDialog, setShowSecretDialog] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyListItem | null>(null);
  const [logsTarget, setLogsTarget] = useState<ApiKeyListItem | null>(null);
  const [logs, setLogs] = useState<ApiKeyUsageLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  const fetchKeys = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const response = await fetch('/api/settings/api-keys');
      if (!response.ok) {
        const message = await handleApiError(response, 'Failed to load API keys');
        throw new Error(message || 'Failed to load API keys');
      }

      const data = await response.json();
      setKeys(data.keys ?? []);
      setSections(data.scopes ?? []);
      setPresets(data.presets ?? []);
      setApiAccessEnabled(data.apiAccessEnabled !== false);
      setApiDisabledMessage(data.apiDisabledMessage ?? null);

      const defaultPreset = (data.presets ?? []).find((p: ScopePreset) => p.id === 'read_only_assistant');
      if (defaultPreset) {
        setSelectedPermissions(new Set(defaultPreset.permissions));
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      fetchKeys();
    }
  }, []);

  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPermissions(new Set(preset.permissions));
    }
  };

  const togglePermission = (scope: ApiScope, checked: boolean) => {
    setUseCustomPermissions(true);
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(scope);
        if (scope.endsWith(':write')) {
          next.add(scope.replace(':write', ':read') as ApiScope);
        }
      } else {
        next.delete(scope);
        if (scope.endsWith(':read')) {
          next.delete(scope.replace(':read', ':write') as ApiScope);
        }
      }
      return next;
    });
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for this API key');
      return;
    }
    if (selectedPermissions.size === 0) {
      toast.error('Select at least one permission');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          permissions: Array.from(selectedPermissions),
          expires_at: optionalExpiry ? new Date(optionalExpiry).toISOString() : null,
        }),
      });

      if (!response.ok) {
        const message = await handleApiError(response, 'Failed to create API key');
        throw new Error(message || 'Failed to create API key');
      }

      const data = await response.json();
      setCreatedSecret(data.secret);
      setShowSecretDialog(true);
      setShowCreateForm(false);
      setNewKeyName('');
      setOptionalExpiry('');
      setUseCustomPermissions(false);
      applyPreset('read_only_assistant');
      await fetchKeys();
      toast.success('API key created');
    } catch (error) {
      console.error('Error creating API key:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!revokeTarget) return;

    setRevokingId(revokeTarget.id);
    try {
      const response = await fetch(`/api/settings/api-keys/${revokeTarget.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const message = await handleApiError(response, 'Failed to revoke API key');
        throw new Error(message || 'Failed to revoke API key');
      }

      toast.success('API key revoked');
      setRevokeTarget(null);
      await fetchKeys();
    } catch (error) {
      console.error('Error revoking API key:', error);
    } finally {
      setRevokingId(null);
    }
  };

  const copySecret = async () => {
    if (!createdSecret) return;
    await navigator.clipboard.writeText(createdSecret);
    toast.success('API key copied to clipboard');
  };

  const openLogs = async (key: ApiKeyListItem) => {
    setLogsTarget(key);
    setLogsLoading(true);
    setLogs([]);

    try {
      const response = await fetch(`/api/settings/api-keys/${key.id}/logs?pageSize=50`);
      if (!response.ok) {
        const message = await handleApiError(response, 'Failed to load usage logs');
        throw new Error(message || 'Failed to load usage logs');
      }
      const data = await response.json();
      setLogs(data.logs ?? []);
    } catch (error) {
      console.error('Error fetching API key logs:', error);
      toast.error('Failed to load usage logs');
      setLogsTarget(null);
    } finally {
      setLogsLoading(false);
    }
  };

  const activeKeys = keys.filter((key) => !key.revoked_at);
  const revokedKeys = keys.filter((key) => key.revoked_at);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Create scoped API keys so external apps and AI assistants can read and update your budget data.
            Keys are premium-only and can only be managed by the account owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!apiAccessEnabled && apiDisabledMessage && (
            <Alert variant="destructive">
              <AlertDescription>{apiDisabledMessage}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Documentation:</strong>{' '}
              <a href="/api/v1/docs" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Interactive API docs
              </a>
              {' · '}
              <a href="/api/v1/openapi.json" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                OpenAPI 3.1 spec
              </a>
            </p>
            <p>
              Discover all available endpoints:{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">GET /api/v1/me</code>
            </p>
            <p>
              Use keys with the external API at <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/v1/*</code>.
              Authenticate with <code className="text-xs bg-muted px-1 py-0.5 rounded">Authorization: Bearer YOUR_KEY</code>.
            </p>
            <p>
              Example: <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">curl -H &quot;Authorization: Bearer bud_test_...&quot; http://localhost:3000/api/v1/me</code>
            </p>
          </div>

          {!showCreateForm ? (
            <Button onClick={() => setShowCreateForm(true)} disabled={!apiAccessEnabled}>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          ) : (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. ChatGPT integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Preset</Label>
                <Select
                  value={selectedPreset}
                  onValueChange={(value) => {
                    setUseCustomPermissions(false);
                    applyPreset(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {presets.find((p) => p.id === selectedPreset)?.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="optional-expiry">Optional expiration</Label>
                <Input
                  id="optional-expiry"
                  type="datetime-local"
                  value={optionalExpiry}
                  onChange={(e) => setOptionalExpiry(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Permissions</Label>
                  {useCustomPermissions && (
                    <Badge variant="secondary">Custom</Badge>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {sections.map((section) => {
                    const readScope = `${section.section}:read` as ApiScope;
                    const writeScope = `${section.section}:write` as ApiScope;
                    return (
                      <div key={section.section} className="rounded-md border p-3 space-y-2">
                        <div>
                          <p className="text-sm font-medium">{section.label}</p>
                          <p className="text-xs text-muted-foreground">{section.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={selectedPermissions.has(readScope)}
                              onCheckedChange={(checked) =>
                                togglePermission(readScope, checked === true)
                              }
                            />
                            Read
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={selectedPermissions.has(writeScope)}
                              onCheckedChange={(checked) =>
                                togglePermission(writeScope, checked === true)
                              }
                            />
                            Write
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateKey} disabled={isCreating}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Key
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewKeyName('');
                    setOptionalExpiry('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Keys</CardTitle>
          <CardDescription>
            {activeKeys.length === 0
              ? 'No active API keys yet.'
              : `${activeKeys.length} active key${activeKeys.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeKeys.map((key) => (
            <div key={key.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium">{key.name}</p>
                <p className="text-sm text-muted-foreground font-mono">{key.key_prefix}...</p>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(key.created_at).toLocaleString()}
                  {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleString()}`}
                  {key.expires_at && ` · Expires ${new Date(key.expires_at).toLocaleString()}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {key.permissions.length} permission{key.permissions.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openLogs(key)}>
                  <ScrollText className="h-4 w-4 mr-2" />
                  View Activity
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRevokeTarget(key)}
                  disabled={revokingId === key.id}
                >
                {revokingId === key.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Revoke
                  </>
                )}
              </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {revokedKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revoked Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {revokedKeys.map((key) => (
              <div key={key.id} className="rounded-lg border p-4 opacity-70">
                <p className="font-medium">{key.name}</p>
                <p className="text-sm text-muted-foreground font-mono">{key.key_prefix}...</p>
                <p className="text-xs text-muted-foreground">
                  Revoked {key.revoked_at ? new Date(key.revoked_at).toLocaleString() : ''}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showSecretDialog} onOpenChange={setShowSecretDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save your API key</AlertDialogTitle>
            <AlertDialogDescription>
              This is the only time the full key will be shown. Copy it now and store it securely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border bg-muted p-3 font-mono text-sm break-all">
            {createdSecret}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCreatedSecret(null)}>Done</AlertDialogCancel>
            <AlertDialogAction onClick={copySecret}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget?.name} will stop working immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!logsTarget} onOpenChange={(open) => !open && setLogsTarget(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>API key activity</DialogTitle>
            <DialogDescription>
              Recent requests for {logsTarget?.name}. Logs are retained for 90 days.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0">
            {logsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No activity recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-md border p-3 text-sm space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={log.status_code >= 400 ? 'destructive' : 'secondary'}>
                        {log.status_code}
                      </Badge>
                      <span className="font-mono text-xs">{log.method}</span>
                      <span className="font-mono text-xs break-all">{log.path}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                      {log.scope_used && ` · ${log.scope_used}`}
                      {log.ip_address && ` · ${log.ip_address}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

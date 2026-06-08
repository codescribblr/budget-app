'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, User, Mail, Calendar, Shield, Sparkles, CreditCard, Cpu } from 'lucide-react';
import { format } from 'date-fns';
import type { AdminUserDetail } from '@/app/api/admin/users/[id]/route';

export function AdminUserDetailView({ userId }: { userId: string }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.status === 404) {
        setError('User not found');
        setUser(null);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to users
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {error ?? 'User not found'}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to users
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>{user.email ?? 'No email'}</CardTitle>
                <CardDescription className="font-mono text-xs">{user.id}</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.isAdmin && (
                <Badge className="bg-amber-600">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
              {user.wizardCompleted && (
                <Badge variant="secondary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Wizard done
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Verified</p>
                <p className="font-medium">{user.emailConfirmedAt ? 'Yes' : 'No'}</p>
                {user.emailConfirmedAt && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(user.emailConfirmedAt), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="font-medium">{format(new Date(user.createdAt), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Last activity</p>
                <p className="font-medium">
                  {user.lastActivityAt
                    ? format(new Date(user.lastActivityAt), 'MMM d, yyyy HH:mm')
                    : 'Never'}
                </p>
              </div>
            </div>
            {user.birthYear != null && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Birth year</p>
                  <p className="font-medium">{user.birthYear}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Accounts & subscriptions
          </CardTitle>
          <CardDescription>Budget accounts and subscription status per account</CardDescription>
        </CardHeader>
        <CardContent>
          {user.accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial end</TableHead>
                  <TableHead>Period end</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.accounts.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-medium">{acc.name}</TableCell>
                    <TableCell>{acc.isOwner ? 'Owner' : 'Member'}</TableCell>
                    <TableCell>
                      {acc.subscription ? (
                        <Badge
                          variant={acc.subscription.status === 'active' || acc.subscription.status === 'trialing' ? 'default' : 'secondary'}
                          className={acc.subscription.tier === 'premium' && ['active', 'trialing'].includes(acc.subscription.status) ? 'bg-amber-600' : ''}
                        >
                          {acc.subscription.status} / {acc.subscription.tier}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {acc.subscription?.trialEnd
                        ? format(new Date(acc.subscription.trialEnd), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {acc.subscription?.currentPeriodEnd
                        ? format(new Date(acc.subscription.currentPeriodEnd), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            AI usage
          </CardTitle>
          <CardDescription>Today and all-time usage by feature</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Today</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(user.aiUsage.today).map(([feature, data]) => (
                <Badge key={feature} variant="outline" className="font-mono">
                  {feature}: {data.used}
                  {data.limit != null ? ` / ${data.limit}` : ''}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">All time</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(user.aiUsage.allTime).map(([feature, count]) => (
                <Badge key={feature} variant="secondary" className="font-mono">
                  {feature}: {count}
                </Badge>
              ))}
              {Object.keys(user.aiUsage.allTime).length === 0 && (
                <span className="text-sm text-muted-foreground">No AI usage recorded</span>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Total AI requests (all time): <strong>{user.aiUsage.totalRequests}</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

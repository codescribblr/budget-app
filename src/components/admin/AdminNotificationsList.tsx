'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plus, Send, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
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

interface AdminNotification {
  id: number;
  createdBy: string | null;
  title: string;
  content: string;
  pushTitle: string | null;
  pushBody: string | null;
  targetType: 'global' | 'account' | 'user';
  targetId: string | null;
  sendEmail: boolean;
  status: 'draft' | 'sent';
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NotificationStats {
  totalRecipients: number;
  readCount: number;
  unreadCount: number;
  pushSentCount: number;
}

export function AdminNotificationsList() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [stats, setStats] = useState<Record<number, NotificationStats>>({});
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);

        // Fetch stats for sent notifications
        const sentNotifications = data.notifications.filter(
          (n: AdminNotification) => n.status === 'sent'
        );
        const statsPromises = sentNotifications.map(async (n: AdminNotification) => {
          const statsResponse = await fetch(`/api/admin/notifications/${n.id}/stats`);
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            return { id: n.id, stats: statsData.stats };
          }
          return null;
        });

        const statsResults = await Promise.all(statsPromises);
        const statsMap: Record<number, NotificationStats> = {};
        statsResults.forEach((result) => {
          if (result) {
            statsMap[result.id] = result.stats;
          }
        });
        setStats(statsMap);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!notificationToDelete) return;

    try {
      const response = await fetch(`/api/admin/notifications/${notificationToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Notification deleted');
        fetchNotifications();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    } finally {
      setDeleteDialogOpen(false);
      setNotificationToDelete(null);
    }
  };

  const getTargetDescription = (notification: AdminNotification): string => {
    if (notification.targetType === 'global') {
      return 'All users';
    } else if (notification.targetType === 'account') {
      return `Account: ${notification.targetId || 'Unknown'}`;
    } else {
      return `User: ${notification.targetId || 'Unknown'}`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Notifications</h1>
          <p className="text-muted-foreground mt-2">
            Create and send notifications to users
          </p>
        </div>
        <Button onClick={() => router.push('/admin/notifications/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Notification
        </Button>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No notifications yet</p>
            <Button onClick={() => router.push('/admin/notifications/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Notification
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const notificationStats = stats[notification.id];
            return (
              <Card key={notification.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{notification.title}</CardTitle>
                        <Badge variant={notification.status === 'sent' ? 'default' : 'secondary'}>
                          {notification.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        Target: {getTargetDescription(notification)}
                      </CardDescription>
                      {notification.status === 'sent' && notificationStats && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {notificationStats.totalRecipients} recipients •{' '}
                          {notificationStats.readCount} read •{' '}
                          {notificationStats.pushSentCount} push sent
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {notification.status === 'draft' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/notifications/${notification.id}/edit`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setNotificationToDelete(notification.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {notification.status === 'sent' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/notifications/${notification.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Created {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    {notification.sentAt && (
                      <> • Sent {formatDistanceToNow(new Date(notification.sentAt), { addSuffix: true })}</>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the notification draft.
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
    </div>
  );
}

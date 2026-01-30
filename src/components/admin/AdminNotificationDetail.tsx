'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, CheckCircle2, Circle, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

interface Recipient {
  id: number;
  adminNotificationId: number;
  userId: string;
  budgetAccountId: number | null;
  notificationId: number | null;
  pushSent: boolean;
  pushSentAt: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  userEmail: string;
  accountName: string | null;
}

interface NotificationStats {
  totalRecipients: number;
  readCount: number;
  unreadCount: number;
  pushSentCount: number;
}

export function AdminNotificationDetail({ notificationId }: { notificationId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<AdminNotification | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);

  useEffect(() => {
    fetchData();
  }, [notificationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notifResponse, recipientsResponse, statsResponse] = await Promise.all([
        fetch(`/api/admin/notifications/${notificationId}`),
        fetch(`/api/admin/notifications/${notificationId}/recipients`),
        fetch(`/api/admin/notifications/${notificationId}/stats`),
      ]);

      if (notifResponse.ok) {
        const notifData = await notifResponse.json();
        setNotification(notifData.notification);
      }

      if (recipientsResponse.ok) {
        const recipientsData = await recipientsResponse.json();
        setRecipients(recipientsData.recipients || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error fetching notification details:', error);
    } finally {
      setLoading(false);
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

  if (!notification) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push('/admin/notifications')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Notification not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/admin/notifications')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{notification.title}</h1>
            <Badge variant={notification.status === 'sent' ? 'default' : 'secondary'}>
              {notification.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            Target: {getTargetDescription(notification)}
          </p>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          {notification.status === 'sent' && (
            <>
              <TabsTrigger value="recipients">
                Recipients ({recipients.length})
              </TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: notification.content }}
              />
            </CardContent>
          </Card>

          {(notification.pushTitle || notification.pushBody) && (
            <Card>
              <CardHeader>
                <CardTitle>Push Notification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <strong>Title:</strong> {notification.pushTitle || notification.title}
                </div>
                <div>
                  <strong>Body:</strong> {notification.pushBody || 'You have new notifications'}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <strong>Created:</strong>{' '}
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </div>
              {notification.sentAt && (
                <div>
                  <strong>Sent:</strong>{' '}
                  {formatDistanceToNow(new Date(notification.sentAt), { addSuffix: true })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {notification.status === 'sent' && (
          <>
            <TabsContent value="recipients" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recipients</CardTitle>
                  <CardDescription>
                    {recipients.length} total recipients
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          {recipient.isRead ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <div className="font-medium">{recipient.userEmail}</div>
                            {recipient.accountName && (
                              <div className="text-sm text-muted-foreground">
                                Account: {recipient.accountName}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {recipient.pushSent && (
                            <div className="flex items-center gap-1">
                              <Send className="h-3 w-3" />
                              Push sent
                            </div>
                          )}
                          {recipient.isRead && recipient.readAt && (
                            <div>
                              Read {formatDistanceToNow(new Date(recipient.readAt), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              {stats && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalRecipients}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Read</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{stats.readCount}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Unread</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.unreadCount}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Push Sent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.pushSentCount}</div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

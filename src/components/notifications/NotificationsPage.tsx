'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Archive, ArchiveRestore, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { getNotificationPreview } from '@/lib/notification-utils';

const PAGE_SIZE = 25;

interface Notification {
  id: number;
  title: string;
  message: string;
  action_url: string | null;
  action_label: string | null;
  is_read: boolean;
  is_archived?: boolean;
  archived_at?: string | null;
  created_at: string;
  notification_type_id: string;
  metadata?: Record<string, any>;
}

type NotificationFilter = 'all' | 'unread' | 'archived';

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0);

  const initialFilter = searchParams.get('filter');
  const [filter, setFilter] = useState<NotificationFilter>(
    initialFilter === 'archived' || initialFilter === 'unread' ? initialFilter : 'all'
  );
  const [page, setPage] = useState(
    Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1)
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isArchivedView = filter === 'archived';

  const updateUrl = useCallback((nextFilter: NotificationFilter, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextFilter !== 'all') {
      params.set('filter', nextFilter);
    }
    if (nextPage > 1) {
      params.set('page', String(nextPage));
    }
    const query = params.toString();
    router.replace(query ? `/notifications?${query}` : '/notifications');
  }, [router]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count');
      if (response.ok) {
        const data = await response.json();
        setGlobalUnreadCount(data.count || 0);
      }
    } catch {
      // non-fatal
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (filter === 'unread') {
        params.set('isRead', 'false');
      }
      if (filter === 'archived') {
        params.set('archived', 'true');
      }

      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setTotal(data.total ?? 0);
      } else {
        toast.error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    const paramFilter = searchParams.get('filter');
    const paramPage = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);

    if (paramFilter === 'archived' || paramFilter === 'unread') {
      setFilter(paramFilter);
    } else {
      setFilter('all');
    }
    setPage(paramPage);
  }, [searchParams]);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    if (page > totalPages) {
      const clamped = totalPages;
      setPage(clamped);
      updateUrl(filter, clamped);
    }
  }, [page, totalPages, filter, updateUrl]);

  const changeFilter = (nextFilter: NotificationFilter) => {
    setFilter(nextFilter);
    setPage(1);
    updateUrl(nextFilter, 1);
  };

  const changePage = (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(clamped);
    updateUrl(filter, clamped);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });

      if (response.ok) {
        setNotifications(prev => {
          const updated = prev.map(n => n.id === id ? { ...n, is_read: true } : n);
          return filter === 'unread' ? updated.filter(n => !n.is_read) : updated;
        });
        setGlobalUnreadCount(prev => Math.max(0, prev - 1));
        toast.success('Notification marked as read');
        return true;
      }

      const data = await response.json().catch(() => ({}));
      toast.error(data.error || 'Failed to mark notification as read');
      return false;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
      return false;
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'Failed to mark all as read');
        return;
      }

      const data = await response.json();
      await fetchNotifications();
      await fetchUnreadCount();
      toast.success(
        data.markedRead > 0
          ? `Marked ${data.markedRead} notification${data.markedRead !== 1 ? 's' : ''} as read`
          : 'All notifications are already read'
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleArchive = async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const archived = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        setTotal(prev => Math.max(0, prev - 1));
        if (archived && !archived.is_read) {
          setGlobalUnreadCount(prev => Math.max(0, prev - 1));
        }
        toast.success('Notification archived');
        if (notifications.length === 1 && page > 1) {
          changePage(page - 1);
        } else {
          await fetchNotifications();
        }
        return;
      }

      const data = await response.json().catch(() => ({}));
      toast.error(data.error || 'Failed to archive notification');
    } catch (error) {
      console.error('Error archiving notification:', error);
      toast.error('Failed to archive notification');
    }
  };

  const handleUnarchive = async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false }),
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setTotal(prev => Math.max(0, prev - 1));
        toast.success('Notification restored to inbox');
        if (notifications.length === 1 && page > 1) {
          changePage(page - 1);
        } else {
          await fetchNotifications();
        }
        return;
      }

      const data = await response.json().catch(() => ({}));
      toast.error(data.error || 'Failed to restore notification');
    } catch (error) {
      console.error('Error restoring notification:', error);
      toast.error('Failed to restore notification');
    }
  };

  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {isArchivedView
              ? `${total} archived notification${total !== 1 ? 's' : ''}`
              : filter === 'unread'
              ? `${total} unread notification${total !== 1 ? 's' : ''}`
              : `${total} in inbox, ${globalUnreadCount} unread`}
          </p>
        </div>
        {!isArchivedView && globalUnreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeFilter('all')}
            >
              Inbox
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeFilter('unread')}
            >
              Unread ({filter === 'unread' ? total : globalUnreadCount})
            </Button>
            <Button
              variant={filter === 'archived' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeFilter('archived')}
            >
              Archived
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isArchivedView ? 'No archived notifications' : 'No notifications found'}
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg ${
                    !notification.is_read && !isArchivedView ? 'bg-accent/50 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{notification.title}</h3>
                        {!notification.is_read && !isArchivedView && (
                          <Badge variant="default" className="bg-blue-500">New</Badge>
                        )}
                        {isArchivedView && (
                          <Badge variant="secondary">Archived</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getNotificationPreview(notification.message, 150)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(
                          new Date(
                            isArchivedView && notification.archived_at
                              ? notification.archived_at
                              : notification.created_at
                          ),
                          { addSuffix: true }
                        )}
                        {isArchivedView && notification.archived_at ? ' (archived)' : ''}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={async () => {
                          if (!notification.is_read && !isArchivedView) {
                            await handleMarkAsRead(notification.id);
                          }
                          router.push(`/notifications/${notification.id}`);
                        }}
                      >
                        View Details
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isArchivedView && !notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Mark as read"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {isArchivedView ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Restore to inbox"
                          onClick={() => handleUnarchive(notification.id)}
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Archive notification"
                          onClick={() => handleArchive(notification.id)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && !loading && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {showingFrom}–{showingTo} of {total}
              </p>
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) changePage(page - 1);
                      }}
                      className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-3 text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages) changePage(page + 1);
                      }}
                      className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

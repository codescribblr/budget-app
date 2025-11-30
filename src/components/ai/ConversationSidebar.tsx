'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistance } from 'date-fns';
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
import type { ChatMessage } from '@/lib/ai/types';

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
  is_archived?: boolean;
}

interface ConversationSidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversation: Conversation | null) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Update current time every minute to refresh relative times
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (conversationId: string) => {
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!conversationToDelete) return;

    try {
      const response = await fetch(`/api/ai/conversations/${conversationToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      toast.success('Conversation archived');
      setConversations((prev) => prev.filter((c) => c.id !== conversationToDelete));
      
      // If archived conversation was selected, clear selection
      if (selectedConversationId === conversationToDelete) {
        onSelectConversation(null);
      }
    } catch (error) {
      console.error('Error archiving conversation:', error);
      toast.error('Failed to archive conversation');
    } finally {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };


  return (
    <>
      <div className="flex h-full flex-col border-r bg-muted/30">
        <div className="border-b p-3">
          <Button
            onClick={onNewConversation}
            className="w-full justify-center gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="truncate">New Conversation</span>
          </Button>
        </div>

        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="mb-3 h-8 w-8 opacity-50" />
              <p>No conversations yet</p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Start a new conversation to begin
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2 p-2">
                {conversations.map((conversation) => {
                  const isSelected = conversation.id === selectedConversationId;
                  // Calculate time based on stored updated_at timestamp
                  // Use currentTime state (updated every minute) as reference to prevent recalculation on every render
                  const updatedDate = new Date(conversation.updated_at);
                  const timeAgo = isNaN(updatedDate.getTime())
                    ? 'Unknown'
                    : formatDistance(updatedDate, currentTime, {
                        addSuffix: true,
                      });

                  // Truncate title to 20 characters
                  const displayTitle = conversation.title 
                    ? (conversation.title.length > 20 
                        ? conversation.title.slice(0, 20) + '...' 
                        : conversation.title)
                    : 'Untitled conversation';

                  return (
                    <div key={conversation.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onSelectConversation(conversation)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-background/80 text-foreground hover:bg-muted'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'truncate text-sm font-medium',
                              isSelected ? 'text-primary-foreground' : 'text-foreground'
                            )}
                            title={conversation.title || 'Untitled conversation'}
                          >
                            {displayTitle}
                          </p>
                          <p
                            className={cn(
                              'truncate text-xs text-muted-foreground',
                              isSelected && 'text-primary-foreground/80'
                            )}
                          >
                            {timeAgo}
                          </p>
                        </div>
                      </button>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Archive conversation"
                        className={cn(
                          'absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/40',
                          isSelected && 'text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary/30'
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(conversation.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive this conversation. It will be removed from your conversation list but the data will be preserved for analytics purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


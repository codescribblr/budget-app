'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import { AIChatInterface } from '@/components/ai/AIChatInterface';
import { ConversationSidebar } from '@/components/ai/ConversationSidebar';
import { ConversationMobileNav } from '@/components/ai/ConversationMobileNav';
import { PremiumFeatureGate } from '@/components/subscription/PremiumFeatureGate';
import { useFeature } from '@/contexts/FeatureContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import type { ChatMessage } from '@/lib/ai/types';
import type { Conversation } from '@/components/ai/ConversationSidebar';
import { toast } from 'sonner';

export default function AIAssistantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aiChatEnabled = useFeature('ai_chat');
  const { isPremium } = useSubscription();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Only show sidebar if user has premium AND feature is enabled
  const showSidebar = isPremium && aiChatEnabled;

  // Update URL when conversation changes
  const updateURL = useCallback((id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set('conversation', id);
    } else {
      params.delete('conversation');
    }
    router.push(`/dashboard/ai-assistant?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Initialize from URL on mount
  useEffect(() => {
    const conversationParam = searchParams.get('conversation');
    if (conversationParam) {
      // Validate that the conversation exists and user has access
      // The API will return 404 if user doesn't have access
      fetch(`/api/ai/conversations/${conversationParam}`)
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          // If 404, conversation doesn't exist or user doesn't have access
          if (response.status === 404) {
            // Remove invalid conversation ID from URL
            const params = new URLSearchParams(searchParams.toString());
            params.delete('conversation');
            router.push(`/dashboard/ai-assistant?${params.toString()}`, { scroll: false });
            return null;
          }
          throw new Error('Failed to load conversation');
        })
        .then((data) => {
          if (data) {
            setSelectedConversationId(data.id);
            setConversationId(data.id);
          }
        })
        .catch((error) => {
          console.error('Error loading conversation from URL:', error);
          // Remove invalid conversation ID from URL
          const params = new URLSearchParams(searchParams.toString());
          params.delete('conversation');
          router.push(`/dashboard/ai-assistant?${params.toString()}`, { scroll: false });
        })
        .finally(() => {
          setIsInitialized(true);
        });
    } else {
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleSelectConversation = useCallback((conversation: Conversation | null) => {
    if (conversation) {
      setSelectedConversationId(conversation.id);
      setConversationId(conversation.id);
      updateURL(conversation.id);
    } else {
      setSelectedConversationId(null);
      setConversationId(null);
      updateURL(null);
    }
  }, [updateURL]);

  const handleNewConversation = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Conversation',
          messages: [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      setSelectedConversationId(data.id);
      setConversationId(data.id);
      updateURL(data.id);
      setRefreshKey((prev) => prev + 1); // Refresh sidebar
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    }
  }, [updateURL]);

  const handleConversationUpdate = useCallback((id: string, messages: ChatMessage[]) => {
    // Refresh sidebar to show updated conversation
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleConversationCreated = useCallback((id: string) => {
    setSelectedConversationId(id);
    setConversationId(id);
    updateURL(id);
    setRefreshKey((prev) => prev + 1); // Refresh sidebar
  }, [updateURL]);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="shrink-0">
        <AppHeader
          title="AI Assistant"
          subtitle="Get intelligent insights about your finances"
          showNavigation={false}
          actions={
            showSidebar ? (
              <div className="lg:hidden">
                <ConversationMobileNav
                  selectedConversationId={selectedConversationId}
                  onSelectConversation={handleSelectConversation}
                  onNewConversation={handleNewConversation}
                />
              </div>
            ) : undefined
          }
        />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex h-full">
          {/* Desktop Sidebar */}
          {showSidebar && (
            <aside className="hidden lg:block w-64 shrink-0 border-r">
              <ConversationSidebar
                key={refreshKey}
                selectedConversationId={selectedConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
              />
            </aside>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0 min-h-0 p-4 md:p-6">
            <div className="h-full max-w-4xl mx-auto">
              <PremiumFeatureGate
                featureName="AI Features"
                featureDescription="Enable AI-powered features throughout the app, including intelligent transaction categorization, financial insights, and chat assistant that understands your budget, goals, and spending patterns"
              >
                {isInitialized ? (
                  <AIChatInterface
                    conversationId={conversationId}
                    onConversationUpdate={handleConversationUpdate}
                    onConversationCreated={handleConversationCreated}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <p className="text-sm">Loading conversation...</p>
                    </div>
                  </div>
                )}
              </PremiumFeatureGate>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


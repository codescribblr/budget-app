'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/lib/ai/types';

interface UseAIChatOptions {
  conversationId?: string | null;
  onConversationUpdate?: (conversationId: string, messages: ChatMessage[]) => void;
  onConversationCreated?: (conversationId: string) => void;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { conversationId, onConversationUpdate, onConversationCreated } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const isLoadingConversationRef = useRef(false); // Track if we're loading a conversation (not editing)

  // Keep ref in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Update current conversation ID when prop changes
  useEffect(() => {
    setCurrentConversationId(conversationId || null);
  }, [conversationId]);

  // Save conversation after messages update (but not during loading or when loading a conversation)
  useEffect(() => {
    if (currentConversationId && messages.length > 0 && !loading && !isLoadingConversationRef.current) {
      saveConversation(currentConversationId, messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, currentConversationId, loading]);

  const saveConversation = async (id: string, msgs: ChatMessage[]) => {
    // Don't save if we're currently loading a conversation
    if (isLoadingConversationRef.current) {
      return;
    }

    try {
      // Generate title from first user message if not already set
      const firstUserMessage = msgs.find((m) => m.role === 'user');
      const title = firstUserMessage
        ? firstUserMessage.content.slice(0, 60) + (firstUserMessage.content.length > 60 ? '...' : '')
        : 'New Conversation';

      await fetch(`/api/ai/conversations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          messages: msgs,
        }),
      });

      onConversationUpdate?.(id, msgs);
    } catch (error) {
      console.error('Error saving conversation:', error);
      // Don't throw - saving conversation failure shouldn't break the chat
    }
  };

  const sendMessage = async (content: string, createConversationIfNeeded: () => Promise<string | null> = async () => null) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Create conversation if it doesn't exist and this is the first message
    // Check BEFORE adding the message to state
    let convId = currentConversationId;
    const isFirstMessage = !convId && messages.length === 0;
    if (isFirstMessage) {
      convId = await createConversationIfNeeded();
      if (convId) {
        setCurrentConversationId(convId);
        onConversationCreated?.(convId);
      }
    }

    // Add user message to state immediately for better UX
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      // Use ref to get current messages (includes the user message we just added)
      // But exclude it from history since we're sending it as the query
      const historyForRequest = messagesRef.current.slice(0, -1); // All previous messages except the one we just added
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content.trim(),
          history: historyForRequest, // All previous conversation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        metadata: data.metadata,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Remove the user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      isLoadingConversationRef.current = true; // Mark that we're loading, not editing
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/ai/conversations/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }
      const data = await response.json();
      // Only update messages if we're actually loading a different conversation
      // Don't overwrite if we have messages and are loading the same conversation
      if (id !== currentConversationId || messages.length === 0) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load conversation'));
      console.error('Error loading conversation:', err);
    } finally {
      setLoading(false);
      // Reset the flag after a short delay to allow any pending effects to complete
      setTimeout(() => {
        isLoadingConversationRef.current = false;
      }, 100);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  return {
    messages,
    sendMessage,
    loading,
    error,
    clearMessages,
    loadConversation,
  };
}



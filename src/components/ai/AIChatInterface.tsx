'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles } from 'lucide-react';
import { useAIChat } from '@/hooks/use-ai-chat';
import { useAIUsage } from '@/hooks/use-ai-usage';
import { useRotatingLoadingMessage } from '@/hooks/use-rotating-loading-message';
import { DataSummary } from '@/components/ai/DataSummary';
import { MarkdownRenderer } from '@/components/ai/MarkdownRenderer';
import { toast } from 'sonner';
import type { ChatMessage } from '@/lib/ai/types';

function messageTimestampKey(ts: ChatMessage['timestamp']): number | string {
  if (ts == null) return '';
  return ts instanceof Date ? ts.getTime() : new Date(ts).getTime();
}

interface AIChatInterfaceProps {
  conversationId?: string | null;
  onConversationUpdate?: (conversationId: string, messages: ChatMessage[]) => void;
  onConversationCreated?: (conversationId: string) => void;
}

interface ChatQuickAction {
  id: string;
  label: string;
  query: string;
}

const FALLBACK_QUICK_ACTIONS: ChatQuickAction[] = [
  {
    id: 'income-workflow',
    label: 'My Income Workflow',
    query:
      'Recommend a step-by-step workflow for using this budgeting app based on how I earn income. Reference specific app features and help pages.',
  },
  {
    id: 'budget-check',
    label: 'Budget Check',
    query: 'Am I on track with my budget this month? Highlight any categories that need attention.',
  },
  {
    id: 'debt-workflow',
    label: 'Pay Down Debt',
    query:
      'I want to pay down credit card debt using this app. Recommend a concrete monthly workflow with categories, allocation, and tracking.',
  },
];

export function AIChatInterface({ 
  conversationId, 
  onConversationUpdate,
  onConversationCreated 
}: AIChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [quickActions, setQuickActions] = useState<ChatQuickAction[]>(FALLBACK_QUICK_ACTIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousConversationIdRef = useRef<string | null>(conversationId || null);
  
  const { messages, sendMessage, loading, error, clearMessages, loadConversation } = useAIChat({
    conversationId: currentConversationId || undefined,
    onConversationUpdate: onConversationUpdate
      ? (id, msgs) => onConversationUpdate(id, msgs)
      : undefined,
    onConversationCreated: (id) => {
      setIsCreatingConversation(true);
      onConversationCreated?.(id);
      // Reset flag after a short delay
      setTimeout(() => setIsCreatingConversation(false), 100);
    },
  });
  const { stats, refreshStats } = useAIUsage();
  const loadingMessage = useRotatingLoadingMessage(5000, loading);

  // Load personalized quick actions based on income/debt profile
  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      try {
        const response = await fetch('/api/ai/chat/suggestions');
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && Array.isArray(data.quickActions) && data.quickActions.length > 0) {
          setQuickActions(data.quickActions);
        }
      } catch {
        // Keep fallback actions on error
      }
    }

    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load conversation when conversationId prop changes
  // But don't load if we just created it (to preserve messages)
  useEffect(() => {
    // Only load if conversationId actually changed and we're not creating a new one
    if (conversationId && conversationId !== previousConversationIdRef.current && !isCreatingConversation) {
      setCurrentConversationId(conversationId);
      loadConversation(conversationId);
    } else if (conversationId && conversationId !== previousConversationIdRef.current && isCreatingConversation) {
      // Just update the ID without loading (messages are already in state)
      setCurrentConversationId(conversationId);
    } else if (!conversationId && previousConversationIdRef.current) {
      // Conversation was cleared
      setCurrentConversationId(null);
      clearMessages();
    }
    previousConversationIdRef.current = conversationId || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, isCreatingConversation]);

  // Auto-scroll to bottom when new messages arrive or when loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const remainingQueries = stats ? stats.chat.limit - stats.chat.used : 0;

  const sendQuery = async (messageContent: string) => {
    const trimmed = messageContent.trim();
    if (!trimmed) return;

    if (remainingQueries === 0) {
      toast.error('Daily AI query limit reached. Try again tomorrow.');
      return;
    }

    setInput('');

    const createConversation = async (): Promise<string | null> => {
      try {
        const response = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: trimmed.slice(0, 60) + (trimmed.length > 60 ? '...' : ''),
            messages: [],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.id || null;
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
      return null;
    };

    await sendMessage(trimmed, createConversation);
    refreshStats();
  };

  const handleSend = async () => {
    await sendQuery(input);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="shrink-0">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Financial Assistant
          </CardTitle>
          <Badge variant={remainingQueries > 3 ? 'default' : 'destructive'}>
            {remainingQueries} queries remaining today
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0 p-0 overflow-hidden">
        {/* Chat messages - scrollable area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {messages.length === 0 && !loading ? (
                <div className="text-center text-muted-foreground py-8">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-medium text-foreground mb-1">Ask me anything about your finances</p>
                  <p className="text-xs">
                    Get personalized workflows for your income type, debt payoff plans, budget checks, and more — tap a suggestion to start.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div
                      key={`${msg.role}-${i}-${messageTimestampKey(msg.timestamp) || i}`}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <div className="text-sm">
                            <MarkdownRenderer content={msg.content} />
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                        {msg.role === 'assistant' && msg.metadata && (
                          <DataSummary
                            transactionCount={msg.metadata.transactionCount || 0}
                            dateRange={msg.metadata.dateRange || { start: '', end: '' }}
                            categoriesSearched={msg.metadata.categoriesSearched || 0}
                            merchantsSearched={msg.metadata.merchantsSearched || 0}
                            goalsAccessed={msg.metadata.goalsAccessed}
                            loansAccessed={msg.metadata.loansAccessed}
                            accountsAccessed={msg.metadata.accountsAccessed}
                            incomeBufferAccessed={msg.metadata.incomeBufferAccessed}
                            incomeSettingsAccessed={msg.metadata.incomeSettingsAccessed}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 animate-pulse text-purple-500" />
                          <p className="text-sm text-muted-foreground italic">
                            {loadingMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
              {error && (
                <div className="text-sm text-destructive mt-4">
                  Error: {error.message}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Quick action buttons — one tap sends immediately */}
        {messages.length === 0 && (
          <div className="shrink-0 px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant="outline"
                  onClick={() => sendQuery(action.query)}
                  disabled={loading || remainingQueries === 0}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 p-4 border-t">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your spending, budget, or goals..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading || remainingQueries === 0}
              rows={2}
              className="min-h-[2.5rem] max-h-[6rem] resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={loading || remainingQueries === 0 || !input.trim()}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ChatMessage } from '@/lib/ai/types';

interface AIChatInterfaceProps {
  conversationId?: string | null;
  onConversationUpdate?: (conversationId: string, messages: ChatMessage[]) => void;
  onConversationCreated?: (conversationId: string) => void;
}

export function AIChatInterface({ 
  conversationId, 
  onConversationUpdate,
  onConversationCreated 
}: AIChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, sendMessage, loading, error, clearMessages, loadConversation } = useAIChat({
    conversationId: currentConversationId || undefined,
    onConversationUpdate: onConversationUpdate
      ? (id, msgs) => onConversationUpdate(id, msgs)
      : undefined,
    onConversationCreated: onConversationCreated,
  });
  const { stats, refreshStats } = useAIUsage();
  const loadingMessage = useRotatingLoadingMessage(5000, loading);

  // Load conversation when conversationId prop changes
  useEffect(() => {
    if (conversationId) {
      setCurrentConversationId(conversationId);
      loadConversation(conversationId);
    } else {
      setCurrentConversationId(null);
      clearMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const remainingQueries = stats ? stats.chat.limit - stats.chat.used : 0;

  const createConversation = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: input.trim().slice(0, 60) + (input.trim().length > 60 ? '...' : ''),
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

  const handleSend = async () => {
    if (!input.trim()) return;

    if (remainingQueries === 0) {
      toast.error('Daily AI query limit reached. Try again tomorrow.');
      return;
    }

    await sendMessage(input, createConversation);
    setInput('');
    refreshStats();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: 'Dining Analysis', query: 'How much did I spend on dining last month?' },
    { label: 'Budget Check', query: 'Am I on track with my budget?' },
    { label: 'Savings Tips', query: 'Where can I save money?' },
  ];

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
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Ask me anything about your spending, budget, or goals!</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div
                      key={i}
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

        {/* Quick action buttons */}
        {messages.length === 0 && (
          <div className="shrink-0 px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  size="sm"
                  variant="outline"
                  onClick={() => setInput(action.query)}
                  disabled={remainingQueries === 0}
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


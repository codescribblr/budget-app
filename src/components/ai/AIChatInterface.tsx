'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles } from 'lucide-react';
import { useAIChat } from '@/hooks/use-ai-chat';
import { useAIUsage } from '@/hooks/use-ai-usage';
import { useRotatingLoadingMessage } from '@/hooks/use-rotating-loading-message';
import { toast } from 'sonner';

export function AIChatInterface() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, loading, error, clearMessages } = useAIChat();
  const { stats, refreshStats } = useAIUsage();
  const loadingMessage = useRotatingLoadingMessage(3000, loading);

  const remainingQueries = stats ? stats.chat.limit - stats.chat.used : 0;

  const handleSend = async () => {
    if (!input.trim()) return;

    if (remainingQueries === 0) {
      toast.error('Daily AI query limit reached. Try again tomorrow.');
      return;
    }

    await sendMessage(input);
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
      <CardHeader>
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
      <CardContent className="flex flex-col flex-1 min-h-0 p-0">
        {/* Chat messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Ask me anything about your spending, budget, or goals!</p>
            </div>
          ) : (
            <div className="space-y-4">
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
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive mt-4">
              Error: {error.message}
            </div>
          )}
        </ScrollArea>

        {/* Quick action buttons */}
        {messages.length === 0 && (
          <div className="px-4 pb-2">
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
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your spending, budget, or goals..."
              onKeyPress={handleKeyPress}
              disabled={loading || remainingQueries === 0}
            />
            <Button
              onClick={handleSend}
              disabled={loading || remainingQueries === 0 || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


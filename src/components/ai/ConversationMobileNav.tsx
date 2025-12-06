'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu, Plus } from 'lucide-react';
import { ConversationSidebar } from './ConversationSidebar';
import type { Conversation } from './ConversationSidebar';

interface ConversationMobileNavProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversation: Conversation | null) => void;
  onNewConversation: () => void;
}

export function ConversationMobileNav({
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationMobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Conversations</SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100vh-4rem)]">
          <ConversationSidebar
            selectedConversationId={selectedConversationId}
            onSelectConversation={(conv) => {
              onSelectConversation(conv);
              setOpen(false);
            }}
            onNewConversation={() => {
              onNewConversation();
              setOpen(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}





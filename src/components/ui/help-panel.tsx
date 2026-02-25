'use client';

import * as React from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface HelpPanelProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When opening, scroll to element with this id */
  scrollToId?: string;
}

export function HelpPanel({ title, description, children, trigger, open, onOpenChange, scrollToId }: HelpPanelProps) {
  const isControlled = open !== undefined;

  React.useEffect(() => {
    if (open && scrollToId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(scrollToId);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [open, scrollToId]);

  return (
    <Sheet open={isControlled ? open : undefined} onOpenChange={isControlled ? onOpenChange : undefined}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <BookOpen className="h-4 w-4 mr-2" />
            Help
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="p-6">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <Separator />
        <div className="px-6 py-6 space-y-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface HelpSectionProps {
  title: string;
  children: React.ReactNode;
}

export function HelpSection({ title, children }: HelpSectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="text-sm text-muted-foreground space-y-2">
        {children}
      </div>
    </div>
  );
}



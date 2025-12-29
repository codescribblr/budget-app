'use client';

import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TruncatedTextWithTooltipProps {
  text: string | null | undefined;
  className?: string;
  maxWidth?: string;
  children?: React.ReactNode;
}

/**
 * Component that displays text with truncation and shows a tooltip on hover/click
 * if the text is truncated. Works for both hover and click interactions.
 */
export function TruncatedTextWithTooltip({
  text,
  className = '',
  maxWidth,
  children,
}: TruncatedTextWithTooltipProps) {
  const textRef = React.useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  // Check if text is truncated
  React.useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        const element = textRef.current;
        // Use requestAnimationFrame to ensure layout is complete
        requestAnimationFrame(() => {
          if (textRef.current) {
            setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
          }
        });
      }
    };

    // Initial check with a small delay to ensure layout is complete
    const timeoutId = setTimeout(checkTruncation, 0);
    
    // Recheck on window resize
    window.addEventListener('resize', checkTruncation);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkTruncation);
    };
  }, [text, children]);

  const displayText = text || '—';
  const shouldShowTooltip = isTruncated && displayText !== '—';

  const content = (
    <div
      ref={textRef}
      className={`truncate ${shouldShowTooltip ? 'cursor-pointer' : ''} ${className}`}
      style={maxWidth ? { maxWidth } : undefined}
      onClick={shouldShowTooltip ? (e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
      } : undefined}
    >
      {children || displayText}
    </div>
  );

  // If not truncated, just render the text without tooltip wrapper
  if (!shouldShowTooltip) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-md break-words"
          onClick={(e) => e.stopPropagation()}
        >
          {displayText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


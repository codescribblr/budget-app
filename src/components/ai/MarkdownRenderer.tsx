'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none prose-headings:mt-0 prose-p:my-1', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Style code blocks
          code({ node, inline, className: codeClassName, children, ...props }: any) {
            if (inline) {
              return (
                <code
                  className="bg-muted/50 px-1.5 py-0.5 rounded text-sm font-mono text-foreground"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto my-2 border border-border">
                <code className="text-sm font-mono text-foreground" {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          // Style paragraphs
          p({ children }: any) {
            return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
          },
          // Style lists
          ul({ children }: any) {
            return <ul className="list-disc list-inside mb-2 space-y-1 ml-2">{children}</ul>;
          },
          ol({ children }: any) {
            return <ol className="list-decimal list-inside mb-2 space-y-1 ml-2">{children}</ol>;
          },
          li({ children }: any) {
            return <li className="ml-1">{children}</li>;
          },
          // Style headings
          h1({ children }: any) {
            return <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>;
          },
          h2({ children }: any) {
            return <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>;
          },
          h3({ children }: any) {
            return <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>;
          },
          // Style links
          a({ href, children }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                {children}
              </a>
            );
          },
          // Style blockquotes
          blockquote({ children }: any) {
            return (
              <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic my-2 text-muted-foreground">
                {children}
              </blockquote>
            );
          },
          // Style tables
          table({ children }: any) {
            return (
              <div className="overflow-x-auto my-2">
                <table className="min-w-full border-collapse border border-border">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }: any) {
            return (
              <th className="border border-border px-3 py-2 bg-muted font-semibold text-left text-sm">
                {children}
              </th>
            );
          },
          td({ children }: any) {
            return (
              <td className="border border-border px-3 py-2 text-sm">{children}</td>
            );
          },
          // Style horizontal rules
          hr() {
            return <hr className="my-4 border-border" />;
          },
          // Style strong/bold
          strong({ children }: any) {
            return <strong className="font-semibold">{children}</strong>;
          },
          // Style emphasis/italic
          em({ children }: any) {
            return <em className="italic">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}


import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RelatedArticle {
  title: string;
  href: string;
  description?: string;
}

interface RelatedArticlesProps {
  articles: RelatedArticle[];
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Related Articles</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {articles.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="block p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{article.title}</div>
                  {article.description && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {article.description}
                    </div>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


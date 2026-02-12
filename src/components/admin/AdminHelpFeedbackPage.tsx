'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ThumbsUp, ThumbsDown, ExternalLink, MessageSquare, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface HelpFeedbackSummary {
  articlePath: string;
  helpful: number;
  notHelpful: number;
  total: number;
  notHelpfulRatio: number;
  recentComments: { text: string; createdAt: string }[];
}

interface HelpFeedbackAdminResponse {
  byArticle: HelpFeedbackSummary[];
  recentFeedback: {
    id: number;
    articlePath: string;
    wasHelpful: boolean;
    feedbackText: string | null;
    createdAt: string;
  }[];
}

export function AdminHelpFeedbackPage() {
  const [data, setData] = useState<HelpFeedbackAdminResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/help-feedback');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to load help feedback');
      setData({ byArticle: [], recentFeedback: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const byArticle = data?.byArticle ?? [];
  const recentFeedback = data?.recentFeedback ?? [];
  const needsAttention = byArticle.filter((a) => a.notHelpful > 0 && a.notHelpfulRatio >= 0.3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Help Article Feedback</h1>
          <p className="text-muted-foreground text-sm mt-1">
            &quot;Was this helpful?&quot; responses from the help center. Review articles with low ratings to improve documentation.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFeedback}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {needsAttention.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-lg">Needs attention</CardTitle>
            <CardDescription>
              Articles with at least 30% &quot;not helpful&quot; and at least one negative response. Consider revising these.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {needsAttention.slice(0, 10).map((a) => (
                <li key={a.articlePath} className="flex items-center justify-between gap-4 text-sm">
                  <Link
                    href={a.articlePath}
                    className="font-medium text-primary hover:underline truncate"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {a.articlePath}
                  </Link>
                  <span className="text-muted-foreground shrink-0">
                    {a.notHelpful} / {a.total} not helpful
                    {a.recentComments.length > 0 && (
                      <span className="ml-1" title={a.recentComments.map((c) => c.text).join('\n')}>
                        ({a.recentComments.length} comment{a.recentComments.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>By article</CardTitle>
          <CardDescription>
            All help articles that have received feedback. Sorted by number of &quot;not helpful&quot; responses (highest first).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byArticle.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No feedback recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-medium">Article</th>
                    <th className="text-right py-3 font-medium w-24">
                      <ThumbsUp className="h-4 w-4 inline mr-1" /> Yes
                    </th>
                    <th className="text-right py-3 font-medium w-24">
                      <ThumbsDown className="h-4 w-4 inline mr-1" /> No
                    </th>
                    <th className="text-right py-3 font-medium w-20">% No</th>
                    <th className="text-left py-3 font-medium">Recent comments</th>
                  </tr>
                </thead>
                <tbody>
                  {byArticle.map((a) => (
                    <tr key={a.articlePath} className="border-b last:border-0">
                      <td className="py-3">
                        <Link
                          href={a.articlePath}
                          className="text-primary hover:underline flex items-center gap-1"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {a.articlePath}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                      <td className="text-right py-3 text-muted-foreground">{a.helpful}</td>
                      <td className="text-right py-3">
                        {a.notHelpful > 0 ? (
                          <Badge variant="secondary">{a.notHelpful}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="text-right py-3">
                        {a.total > 0 ? (
                          <span className={a.notHelpfulRatio >= 0.3 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'}>
                            {Math.round(a.notHelpfulRatio * 100)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 max-w-xs">
                        {a.recentComments.length > 0 ? (
                          <ul className="space-y-1">
                            {a.recentComments.slice(0, 2).map((c, i) => (
                              <li key={i} className="truncate text-muted-foreground" title={c.text}>
                                &quot;{c.text}&quot;
                              </li>
                            ))}
                            {a.recentComments.length > 2 && (
                              <li className="text-muted-foreground">+{a.recentComments.length - 2} more</li>
                            )}
                          </ul>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent feedback
          </CardTitle>
          <CardDescription>
            Latest 50 submissions. Comments are shown when the user chose &quot;No&quot; and left optional feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentFeedback.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No feedback recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentFeedback.map((r) => (
                <li key={r.id} className="flex flex-col gap-1 text-sm border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={r.articlePath}
                      className="font-medium text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {r.articlePath}
                    </Link>
                    {r.wasHelpful ? (
                      <Badge variant="outline" className="text-green-600 border-green-300 dark:border-green-700">
                        <ThumbsUp className="h-3 w-3 mr-1" /> Helpful
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700">
                        <ThumbsDown className="h-3 w-3 mr-1" /> Not helpful
                      </Badge>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {r.feedbackText && (
                    <p className="text-muted-foreground pl-4 border-l-2 border-muted">&quot;{r.feedbackText}&quot;</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

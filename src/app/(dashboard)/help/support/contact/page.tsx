import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MessageSquare, Github } from 'lucide-react';
import Link from 'next/link';

export default function ContactSupportPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Support', href: '/help/support/contact' },
          { label: 'Contact Support', href: '/help/support/contact' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Contact Support</h1>
        <p className="text-lg text-muted-foreground">
          Get help with your budget app questions
        </p>
      </div>

      <Callout type="info" title="Before contacting support">
        <p>
          Please check our{' '}
          <Link href="/help/faq/general" className="text-primary hover:underline">
            FAQ section
          </Link>{' '}
          and{' '}
          <Link href="/help/faq/troubleshooting" className="text-primary hover:underline">
            Troubleshooting guide
          </Link>{' '}
          first - you might find an immediate answer to your question!
        </p>
      </Callout>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">GitHub Discussions</CardTitle>
                <CardDescription>Ask questions & get help</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Join the community to ask questions, share tips, and get help from other users.
            </p>
            <a
              href="https://github.com/codescribblr/budget-app/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Visit Discussions →
            </a>
            <div className="mt-4 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Great for:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>General questions about using the app</li>
                <li>Tips and best practices</li>
                <li>Feature discussions</li>
                <li>Community support</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Report a Bug</CardTitle>
                <CardDescription>Found something broken?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Help us improve by reporting bugs and issues.
            </p>
            <Link
              href="/help/support/report-bug"
              className="text-primary hover:underline font-medium"
            >
              Report a Bug →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                <Github className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Feature Requests</CardTitle>
                <CardDescription>Suggest new features</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Have an idea for a new feature? We'd love to hear it!
            </p>
            <Link
              href="/help/support/feature-request"
              className="text-primary hover:underline font-medium"
            >
              Request a Feature →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Response Time & Process</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>GitHub Discussions:</strong> Community members and maintainers typically respond within 1-2 days.
          </p>
          <p>
            <strong>Bug Reports:</strong> Critical bugs are addressed immediately. Other bugs are triaged
            and fixed based on severity and impact.
          </p>
          <p>
            <strong>Feature Requests:</strong> We review all feature requests and consider them for our
            roadmap. Popular requests (with more upvotes) are prioritized.
          </p>
        </CardContent>
      </Card>

      <Callout type="info" title="Why GitHub?">
        <p>
          We use GitHub for support because it's transparent, searchable, and allows the community to help each other.
          You can see if your question has already been answered, upvote feature requests you care about, and track
          the progress of bug fixes.
        </p>
      </Callout>
    </div>
  );
}


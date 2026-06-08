import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default function ReportBugPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Support', href: '/help/support/contact' },
          { label: 'Report a Bug', href: '/help/support/report-bug' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Report a Bug</h1>
        <p className="text-lg text-muted-foreground">
          Help us improve by reporting issues you encounter
        </p>
      </div>

      <Callout type="tip" title="Thank you!">
        Your bug reports help us make the app better for everyone. We appreciate you taking the time
        to report issues!
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle>How to Report a Bug</CardTitle>
          <CardDescription>
            Please include as much detail as possible to help us reproduce and fix the issue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. What were you trying to do?</h3>
            <p className="text-sm text-muted-foreground">
              Describe what you were attempting to accomplish when you encountered the bug.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. What happened instead?</h3>
            <p className="text-sm text-muted-foreground">
              Describe what actually happened. Include any error messages you saw.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Steps to reproduce</h3>
            <p className="text-sm text-muted-foreground">
              List the exact steps someone else could follow to see the same bug:
            </p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground mt-1 space-y-1">
              <li>Go to...</li>
              <li>Click on...</li>
              <li>Enter...</li>
              <li>See error</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">4. Screenshots (if applicable)</h3>
            <p className="text-sm text-muted-foreground">
              A picture is worth a thousand words! Screenshots help us understand the issue faster.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">5. Your environment</h3>
            <p className="text-sm text-muted-foreground">
              Please include:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
              <li>Browser (Chrome, Firefox, Safari, etc.) and version</li>
              <li>Operating system (Windows, Mac, iOS, Android)</li>
              <li>Screen size (desktop, tablet, mobile)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submit a Bug Report</CardTitle>
          <CardDescription>
            Use our GitHub issue template to report bugs with all the necessary details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We use GitHub Issues to track bugs. This allows you to:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
            <li>See if the bug has already been reported</li>
            <li>Track the status of the fix</li>
            <li>Get notified when it's resolved</li>
            <li>Participate in discussions about the bug</li>
          </ul>

          <Button asChild className="w-full sm:w-auto">
            <a
              href="https://github.com/codescribblr/budget-app/issues/new?template=bug_report.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report a Bug
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>

          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Before submitting:</strong> Search{' '}
              <a
                href="https://github.com/codescribblr/budget-app/issues?q=label%3Abug"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                existing bug reports
              </a>{' '}
              to see if it's already been reported. If so, add any additional details you have!
            </p>
          </div>
        </CardContent>
      </Card>

      <Callout type="important" title="Security Vulnerabilities">
        If you've found a security vulnerability, please DO NOT report it publicly. Instead, use{' '}
        <a
          href="https://github.com/codescribblr/budget-app/security/advisories/new"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          GitHub Security Advisories
        </a>{' '}
        to report it privately so we can address it before disclosure.
      </Callout>
    </div>
  );
}



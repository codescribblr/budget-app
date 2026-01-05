import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default function FeatureRequestPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Support', href: '/help/support/contact' },
          { label: 'Feature Requests', href: '/help/support/feature-request' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Feature Requests</h1>
        <p className="text-lg text-muted-foreground">
          Help shape the future of the app with your ideas
        </p>
      </div>

      <Callout type="tip" title="We love your ideas!">
        Your feedback and feature requests help us prioritize what to build next. Every suggestion
        is reviewed and considered for our roadmap.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle>How to Submit a Feature Request</CardTitle>
          <CardDescription>
            Help us understand your needs by providing detailed information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. What problem are you trying to solve?</h3>
            <p className="text-sm text-muted-foreground">
              Describe the challenge or limitation you're facing. Understanding the "why" helps us
              design better solutions.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. What would you like to see?</h3>
            <p className="text-sm text-muted-foreground">
              Describe your ideal solution. Be as specific as possible about how it would work.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. How would this help you?</h3>
            <p className="text-sm text-muted-foreground">
              Explain the benefits and how it would improve your budgeting experience.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">4. Any examples or alternatives?</h3>
            <p className="text-sm text-muted-foreground">
              If you've seen similar features in other apps, let us know! Examples help us understand
              your vision.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submit Your Feature Request</CardTitle>
          <CardDescription>
            Use our GitHub issue template to submit a detailed feature request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We use GitHub Issues to track feature requests. This allows you to:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
            <li>See what features others have requested</li>
            <li>Upvote features you want (👍 reaction)</li>
            <li>Track the status of your request</li>
            <li>Participate in discussions about features</li>
          </ul>

          <Button asChild className="w-full sm:w-auto">
            <a
              href="https://github.com/codescribblr/budget-app/issues/new?template=feature_request.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              Submit Feature Request
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>

          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Before submitting:</strong> Search{' '}
              <a
                href="https://github.com/codescribblr/budget-app/issues?q=label%3Aenhancement"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                existing feature requests
              </a>{' '}
              to see if someone has already suggested it. If so, add a 👍 reaction to show your support!
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What Happens Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Review:</strong> We review all feature requests and consider them for our product
            roadmap.
          </p>
          <p>
            <strong>Prioritization:</strong> Features are prioritized based on:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
            <li>Number of users requesting it</li>
            <li>Impact on user experience</li>
            <li>Alignment with product vision</li>
            <li>Technical feasibility</li>
            <li>Development effort required</li>
          </ul>
          <p className="mt-2">
            <strong>Updates:</strong> We may reach out for clarification or to let you know when a
            feature is being developed.
          </p>
        </CardContent>
      </Card>

      <Callout type="info" title="Popular Requests">
        <p>Some features that are frequently requested and on our roadmap:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Multi-user budgets and budget sharing</li>
          <li>Mobile app (iOS and Android)</li>
          <li>Automatic bank sync</li>
          <li>Budget templates</li>
          <li>More detailed reports and charts</li>
          <li>Recurring transactions</li>
        </ul>
      </Callout>
    </div>
  );
}



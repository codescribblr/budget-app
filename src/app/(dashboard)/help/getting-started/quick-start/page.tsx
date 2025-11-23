import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { StepList } from '@/components/help/StepList';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { Button } from '@/components/ui/button';

export default function QuickStartPage() {
  const steps = [
    {
      title: 'Add Your Accounts',
      content: (
        <>
          <p>Start by adding your bank accounts and credit cards.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Go to the <Link href="/" className="text-primary hover:underline">Dashboard</Link></li>
            <li>Click "Add Account" in the Accounts card</li>
            <li>Enter your account name and current balance</li>
            <li>Repeat for all your accounts</li>
          </ul>
        </>
      ),
    },
    {
      title: 'Create Budget Categories',
      content: (
        <>
          <p>Create categories (envelopes) for your spending.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>On the Dashboard, click "Add Category" in the Budget Categories card</li>
            <li>Name your category (e.g., "Groceries", "Rent", "Entertainment")</li>
            <li>Set a monthly amount (how much you plan to spend each month)</li>
            <li>Create categories for all your regular expenses</li>
          </ul>
          <p className="mt-2 text-xs">
            <strong>Tip:</strong> Start with 5-10 broad categories. You can always add more later.
          </p>
        </>
      ),
    },
    {
      title: 'Allocate Your Current Balance',
      content: (
        <>
          <p>Distribute your available money into your categories.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Go to <Link href="/money-movement" className="text-primary hover:underline">Money Movement</Link></li>
            <li>You'll see your "Available to Save" amount</li>
            <li>Allocate money to each category based on upcoming expenses</li>
            <li>Use "Use Monthly Amounts" for a quick start</li>
          </ul>
        </>
      ),
    },
    {
      title: 'Start Tracking Transactions',
      content: (
        <>
          <p>Record your spending to keep your budget accurate.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Go to <Link href="/transactions" className="text-primary hover:underline">Transactions</Link></li>
            <li>Click "Add Transaction"</li>
            <li>Enter the date, amount, description, and category</li>
            <li>Watch your category balances update automatically</li>
          </ul>
          <p className="mt-2 text-xs">
            <strong>Tip:</strong> You can also <Link href="/import" className="text-primary hover:underline">import transactions</Link> from your bank's CSV export.
          </p>
        </>
      ),
    },
    {
      title: 'Review Your Dashboard',
      content: (
        <>
          <p>Check your financial overview regularly.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>The Dashboard shows your complete financial picture</li>
            <li>Monitor your "Available to Save" amount</li>
            <li>Check category balances to avoid overspending</li>
            <li>Review your accounts and credit card balances</li>
          </ul>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Getting Started', href: '/help/getting-started/welcome' },
          { label: 'Quick Start Guide', href: '/help/getting-started/quick-start' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Quick Start Guide</h1>
        <p className="text-lg text-muted-foreground">
          Get up and running with your budget in just 10 minutes
        </p>
      </div>

      <Callout type="info" title="Estimated Time: 10 minutes">
        This guide will help you set up the basics. You can always come back and add more details later.
      </Callout>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          Welcome! This quick start guide will walk you through the essential steps to get your budget
          up and running. By the end, you'll have your accounts added, categories created, and be ready
          to start tracking your spending.
        </p>
      </div>

      <StepList steps={steps} />

      <Callout type="tip" title="What to Do Next">
        <p>Now that you have the basics set up, here are some next steps:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>
            <Link href="/help/tutorials/importing" className="text-primary hover:underline">
              Import your transaction history
            </Link> from your bank
          </li>
          <li>
            <Link href="/help/tutorials/auto-categorization" className="text-primary hover:underline">
              Set up auto-categorization
            </Link> for recurring transactions
          </li>
          <li>
            <Link href="/help/features/goals" className="text-primary hover:underline">
              Create financial goals
            </Link> to save for specific things
          </li>
          <li>
            <Link href="/help/getting-started/core-concepts" className="text-primary hover:underline">
              Learn more about core concepts
            </Link> to deepen your understanding
          </li>
        </ul>
      </Callout>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild>
          <Link href="/help/getting-started/core-concepts">
            Next: Core Concepts
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/help/getting-started/first-budget">
            Detailed Budget Setup
          </Link>
        </Button>
      </div>

      <WasThisHelpful articlePath="/help/getting-started/quick-start" />
    </div>
  );
}


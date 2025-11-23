import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { InlineCode } from '@/components/help/CodeBlock';

export default function DashboardFeaturePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Dashboard', href: '/help/features/dashboard' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Your complete financial overview at a glance
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          The Dashboard is your financial command center. It shows you everything you need to know
          about your money in one place: how much you have, where it's allocated, and what you owe.
        </p>

        <h2>Understanding the Summary Cards</h2>
        <p>
          The Dashboard displays several cards, each showing a different aspect of your finances:
        </p>

        <h3>Total Monies</h3>
        <p>
          This is the sum of all money in your accounts that are included in totals. It represents
          the actual cash you have available across all your bank accounts and savings.
        </p>
        <p>
          <strong>Formula:</strong> <InlineCode>Sum of all account balances (where include_in_totals = true)</InlineCode>
        </p>

        <h3>Available to Save</h3>
        <p>
          This is one of the most important numbers in envelope budgeting. It shows how much money
          you have that hasn't been allocated to any category yet.
        </p>
        <p>
          <strong>Formula:</strong> <InlineCode>Total Monies - Total Allocated to Categories - Pending Checks</InlineCode>
        </p>
        <Callout type="tip" title="Goal: Zero Available to Save">
          Ideally, this number should be zero (or close to it). This means every dollar has been
          given a job. If it's positive, you have unallocated money. If it's negative, you've
          allocated more than you have.
        </Callout>

        <h3>Budget Categories (Envelopes)</h3>
        <p>
          Shows the total amount of money currently allocated across all your budget categories.
          This is money that has been assigned a specific purpose.
        </p>
        <p>
          Click "View All" to see the full list of categories, or "Add Category" to create a new one.
        </p>

        <h3>Accounts</h3>
        <p>
          Lists all your bank accounts with their current balances. You can:
        </p>
        <ul>
          <li>Add new accounts</li>
          <li>Update account balances</li>
          <li>Toggle whether an account is included in totals</li>
          <li>Delete accounts you no longer use</li>
        </ul>

        <h3>Credit Cards</h3>
        <p>
          Shows all your credit cards with:
        </p>
        <ul>
          <li><strong>Credit Limit:</strong> Your maximum credit line</li>
          <li><strong>Available Credit:</strong> How much credit you have left</li>
          <li><strong>Balance:</strong> How much you owe (calculated as Limit - Available)</li>
        </ul>
        <p>
          Credit card balances are shown as negative numbers because they represent money you owe.
        </p>

        <h3>Pending Checks</h3>
        <p>
          Tracks checks you've written but haven't cleared yet. This helps you avoid overdrafts by
          accounting for money that's already committed but hasn't left your account yet.
        </p>
        <p>
          Pending checks reduce your "Available to Save" amount.
        </p>

        <h3>Loans</h3>
        <p>
          Shows all your loans (mortgages, car loans, student loans, etc.) with:
        </p>
        <ul>
          <li>Current balance</li>
          <li>Interest rate</li>
          <li>Minimum payment</li>
          <li>Payment due date</li>
        </ul>
        <p>
          Loans can be included or excluded from net worth calculations.
        </p>

        <h3>Goals</h3>
        <p>
          Displays your financial goals and progress toward them. Each goal shows:
        </p>
        <ul>
          <li>Target amount</li>
          <li>Current amount saved</li>
          <li>Progress percentage</li>
          <li>Target date (if set)</li>
        </ul>

        <h3>Income Buffer (if enabled)</h3>
        <p>
          If you have the Income Buffer feature enabled, you'll see a card showing:
        </p>
        <ul>
          <li>Current buffer balance</li>
          <li>Months of runway (how many months of expenses you have buffered)</li>
          <li>Quick actions to add to or fund from the buffer</li>
        </ul>

        <h2>Quick Actions</h2>
        <p>
          Each card has quick action buttons to perform common tasks without leaving the Dashboard:
        </p>
        <ul>
          <li><strong>Add Account/Category/Goal:</strong> Create new items</li>
          <li><strong>Update Balance:</strong> Quickly update account balances</li>
          <li><strong>View All:</strong> Navigate to the full page for that feature</li>
        </ul>

        <h2>Tips for Using the Dashboard</h2>
        <ul>
          <li>Check your Dashboard daily to stay on top of your finances</li>
          <li>Keep "Available to Save" at or near zero by allocating all your money</li>
          <li>Update account balances regularly to keep your budget accurate</li>
          <li>Use the Dashboard as your starting point each time you open the app</li>
        </ul>
      </div>

      <WasThisHelpful articlePath="/help/features/dashboard" />
    </div>
  );
}


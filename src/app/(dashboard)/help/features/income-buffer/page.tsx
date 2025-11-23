import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';

export default function IncomeBufferFeaturePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Income Buffer', href: '/help/features/income-buffer' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Income Buffer</h1>
        <p className="text-lg text-muted-foreground">
          Break the paycheck-to-paycheck cycle by living on last month's income
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          The Income Buffer is an advanced feature that helps you "age your money" - living on
          last month's income instead of this month's. This provides financial stability and
          reduces stress.
        </p>

        <h2>What is the Income Buffer?</h2>
        <p>
          The Income Buffer is a special category that holds one month (or more) of income. Instead
          of budgeting with money you just received, you budget with money you received last month.
        </p>

        <h3>Benefits</h3>
        <ul>
          <li><strong>Break the paycheck-to-paycheck cycle:</strong> You're not waiting for the
            next paycheck to pay bills</li>
          <li><strong>Reduce stress:</strong> You know you have a full month of expenses covered</li>
          <li><strong>Better planning:</strong> You can budget for the entire month at once, not
            piece by piece</li>
          <li><strong>Handle irregular income:</strong> Smooth out income fluctuations</li>
        </ul>

        <h2>Enabling the Income Buffer</h2>
        <ol>
          <li>Go to <Link href="/settings" className="text-primary hover:underline">Settings</Link></li>
          <li>Enable the "Income Buffer" feature</li>
          <li>A special "Income Buffer" category will be created</li>
          <li>An Income Buffer card will appear on your Dashboard</li>
        </ol>

        <Callout type="important" title="Advanced feature">
          The Income Buffer is an advanced feature. Make sure you understand basic envelope
          budgeting before enabling it. See the{' '}
          <Link href="/help/getting-started/core-concepts" className="text-primary hover:underline">
            Core Concepts guide
          </Link>{' '}
          first.
        </Callout>

        <h2>Building Your Buffer</h2>
        <p>
          Building a full month's buffer takes time. Here's how to do it:
        </p>

        <h3>Step 1: Calculate Your Target</h3>
        <p>
          Your target buffer amount is one month of expenses. Add up all your monthly expenses:
        </p>
        <ul>
          <li>Rent/mortgage</li>
          <li>Utilities</li>
          <li>Groceries</li>
          <li>Transportation</li>
          <li>Insurance</li>
          <li>Other regular expenses</li>
        </ul>

        <h3>Step 2: Start Small</h3>
        <p>
          Don't try to build the full buffer at once. Start by allocating a small amount each
          paycheck:
        </p>
        <ol>
          <li>When you get paid, allocate money to your regular categories</li>
          <li>If you have anything left over, allocate it to the Income Buffer</li>
          <li>Repeat with each paycheck</li>
        </ol>

        <h3>Step 3: Gradually Increase</h3>
        <p>
          As your buffer grows, you'll have more flexibility. Eventually, you'll have a full
          month's expenses in the buffer.
        </p>

        <Callout type="tip" title="Use windfalls">
          Tax refunds, bonuses, or other unexpected income are perfect for building your buffer
          quickly!
        </Callout>

        <h2>Using the Income Buffer</h2>
        <p>
          Once you have a buffer built up, here's how to use it:
        </p>

        <h3>When You Get Paid</h3>
        <ol>
          <li>Update your account balance to reflect the new income</li>
          <li>Allocate the entire paycheck to the Income Buffer category</li>
          <li>Your "Available to Save" should be zero (or close to it)</li>
        </ol>

        <h3>At the Start of Each Month</h3>
        <ol>
          <li>Go to the <Link href="/income-buffer" className="text-primary hover:underline">Income Buffer page</Link></li>
          <li>Click "Fund This Month"</li>
          <li>The app will transfer money from the buffer to your regular categories based on
            their monthly amounts</li>
          <li>Adjust allocations as needed</li>
        </ol>

        <h3>The Workflow</h3>
        <p>
          With the Income Buffer, your workflow changes:
        </p>
        <ul>
          <li><strong>Without buffer:</strong> Get paid → Allocate to categories → Spend</li>
          <li><strong>With buffer:</strong> Get paid → Add to buffer → Fund month from buffer → Spend</li>
        </ul>

        <h2>Income Buffer and Available to Save</h2>
        <p>
          The Income Buffer category is special:
        </p>
        <ul>
          <li>It's excluded from category dropdowns (like system categories)</li>
          <li>But it's included in "Total Envelopes" calculations</li>
          <li>Money allocated to the buffer reduces your "Available to Save"</li>
        </ul>
        <p>
          This ensures that money in the buffer is accounted for but not available for regular
          spending.
        </p>

        <h2>Months of Runway</h2>
        <p>
          The Income Buffer card shows "Months of Runway" - how many months of expenses you have
          buffered. This is calculated by:
        </p>
        <p>
          <strong>Months of Runway = Buffer Balance ÷ Total Monthly Expenses</strong>
        </p>
        <p>
          Your goal is to reach 1.0 months (or more for extra security).
        </p>

        <h2>Handling Irregular Income</h2>
        <p>
          The Income Buffer is especially useful if you have irregular income (freelance,
          commission-based, seasonal work):
        </p>
        <ol>
          <li>In high-income months, add extra to the buffer</li>
          <li>In low-income months, fund your budget from the buffer</li>
          <li>The buffer smooths out the fluctuations</li>
        </ol>

        <h2>Disabling the Income Buffer</h2>
        <p>
          If you decide the Income Buffer isn't for you:
        </p>
        <ol>
          <li>Transfer all money out of the Income Buffer category to other categories</li>
          <li>Go to Settings and disable the Income Buffer feature</li>
          <li>The Income Buffer category will be removed</li>
        </ol>

        <Callout type="warning" title="Don't disable with money in the buffer">
          Make sure to transfer all money out of the Income Buffer category before disabling
          the feature, or you'll lose track of that money!
        </Callout>

        <h2>Tips for Success</h2>
        <ul>
          <li>Start small - even a few hundred dollars is progress</li>
          <li>Use windfalls to build the buffer quickly</li>
          <li>Don't get discouraged - it takes time to build a full month's buffer</li>
          <li>Once you have the buffer, maintain it - don't let it drain</li>
          <li>Consider building more than one month for extra security</li>
          <li>Use the "Fund This Month" feature to make budgeting easier</li>
        </ul>
      </div>

      <WasThisHelpful articlePath="/help/features/income-buffer" />
    </div>
  );
}


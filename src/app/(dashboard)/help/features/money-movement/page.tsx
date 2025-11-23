import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';

export default function MoneyMovementFeaturePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Money Movement', href: '/help/features/money-movement' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Money Movement</h1>
        <p className="text-lg text-muted-foreground">
          Allocate funds to categories and transfer money between envelopes
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          Money Movement is where you allocate your income to budget categories and move money
          between categories as needed. This is the core of envelope budgeting.
        </p>

        <h2>Two Types of Money Movement</h2>
        <p>
          The Money Movement page has two tabs:
        </p>
        <ul>
          <li><strong>Allocate to Envelopes:</strong> Put new money into categories (when you get paid)</li>
          <li><strong>Transfer Between Envelopes:</strong> Move money from one category to another</li>
        </ul>

        <h2>Allocate to Envelopes</h2>
        <p>
          Use this when you receive income and need to allocate it to your budget categories.
        </p>

        <h3>Manual Allocation</h3>
        <StepList
          steps={[
            {
              title: 'Go to Money Movement',
              content: 'Navigate to the Money Movement page from the sidebar',
            },
            {
              title: 'Enter amounts for each category',
              content: 'Type the amount you want to allocate to each category',
            },
            {
              title: 'Check Available to Save',
              content: 'The "Available to Save" amount at the top shows how much unallocated money you have left',
            },
            {
              title: 'Click "Allocate Funds"',
              content: 'This will add the amounts to your category balances',
            },
          ]}
        />

        <Callout type="tip" title="Goal: Zero Available to Save">
          Keep allocating until "Available to Save" reaches zero. This means every dollar has a job!
        </Callout>

        <h3>Use Monthly Amounts</h3>
        <p>
          If you've set monthly amounts for your categories, you can use the "Use Monthly Amounts"
          button to quickly fill in all the fields with your planned amounts.
        </p>
        <ol>
          <li>Click "Use Monthly Amounts"</li>
          <li>All category fields will be filled with their monthly amounts</li>
          <li>Adjust any amounts as needed</li>
          <li>Click "Allocate Funds"</li>
        </ol>
        <p>
          This is a huge time-saver if you have a consistent budget each month!
        </p>

        <h3>Smart Allocation (Advanced Feature)</h3>
        <p>
          If you have the Smart Allocation feature enabled, the app can automatically allocate
          your money based on category priorities and types.
        </p>
        <ol>
          <li>Enter the amount you want to allocate (e.g., your paycheck amount)</li>
          <li>Click "Smart Allocate"</li>
          <li>The app will distribute the money according to your priorities</li>
          <li>Review the suggested allocations</li>
          <li>Adjust if needed</li>
          <li>Click "Allocate Funds"</li>
        </ol>

        <h2>Transfer Between Envelopes</h2>
        <p>
          Use this when you need to move money from one category to another. This is common when:
        </p>
        <ul>
          <li>You overspent in one category and need to cover it</li>
          <li>You have extra money in one category and want to reallocate it</li>
          <li>Your priorities changed and you need to adjust your budget</li>
        </ul>

        <h3>How to Transfer</h3>
        <StepList
          steps={[
            {
              title: 'Go to Transfer Between Envelopes tab',
              content: 'Click the "Transfer Between Envelopes" tab on the Money Movement page',
            },
            {
              title: 'Select source category',
              content: 'Choose the category you want to take money FROM',
            },
            {
              title: 'Select destination category',
              content: 'Choose the category you want to move money TO',
            },
            {
              title: 'Enter amount',
              content: 'Type how much you want to transfer',
            },
            {
              title: 'Click "Transfer Funds"',
              content: 'The money will be moved from one category to the other',
            },
          ]}
        />

        <Callout type="info" title="Transfers don't affect total money">
          Transferring between categories doesn't change your total money or Available to Save.
          It just moves money from one envelope to another.
        </Callout>

        <h2>Understanding the Numbers</h2>

        <h3>Available to Save</h3>
        <p>
          Shown at the top of the Allocate to Envelopes tab. This is money in your accounts that
          hasn't been allocated to any category yet.
        </p>
        <p>
          <strong>Formula:</strong> Total Money in Accounts - Total Allocated to Categories - Pending Checks
        </p>

        <h3>Category Current Balance</h3>
        <p>
          Shown next to each category name. This is how much money is currently in that category.
        </p>
        <ul>
          <li><strong>Positive balance:</strong> You have money allocated to this category</li>
          <li><strong>Negative balance:</strong> You've spent more than you allocated (need to cover it)</li>
          <li><strong>Zero balance:</strong> You've spent exactly what you allocated</li>
        </ul>

        <h3>Funded This Month (if enabled)</h3>
        <p>
          If you have Monthly Funding Tracking enabled, you'll see how much you've allocated to
          each category in the current month. This prevents accidentally re-funding categories.
        </p>

        <h2>Common Workflows</h2>

        <h3>When You Get Paid</h3>
        <ol>
          <li>Update your account balance to reflect the new money</li>
          <li>Go to Money Movement → Allocate to Envelopes</li>
          <li>Allocate the money to your categories (use Monthly Amounts or Smart Allocation)</li>
          <li>Make sure Available to Save is zero (or close to it)</li>
        </ol>

        <h3>When You Overspend a Category</h3>
        <ol>
          <li>Go to Money Movement → Transfer Between Envelopes</li>
          <li>Select a category with extra money as the source</li>
          <li>Select the overspent category as the destination</li>
          <li>Transfer enough to cover the negative balance</li>
        </ol>

        <h3>When You Want to Reallocate</h3>
        <ol>
          <li>Go to Money Movement → Transfer Between Envelopes</li>
          <li>Move money from categories with extra to categories that need more</li>
          <li>Adjust as many times as needed</li>
        </ol>

        <h2>Tips for Money Movement</h2>
        <ul>
          <li>Allocate money as soon as you receive it - don't let it sit unallocated</li>
          <li>Set monthly amounts for your categories to make allocation faster</li>
          <li>Review your category balances before allocating to see what needs funding</li>
          <li>Don't be afraid to transfer between categories - flexibility is key!</li>
          <li>Keep Available to Save at or near zero</li>
          <li>If you have irregular income, allocate conservatively and adjust as needed</li>
        </ul>

        <Callout type="tip" title="The envelope budgeting mindset">
          Think of Money Movement as physically putting cash into envelopes. When you get paid,
          you divide the cash into envelopes. When you need more in one envelope, you take it
          from another. The total cash doesn't change - you're just organizing it.
        </Callout>
      </div>

      <WasThisHelpful articlePath="/help/features/money-movement" />
    </div>
  );
}


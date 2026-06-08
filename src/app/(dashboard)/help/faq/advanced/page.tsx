import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { FAQItem } from '@/components/help/FAQItem';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import Link from 'next/link';

export default function AdvancedFAQPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'FAQ', href: '/help/faq/general' },
          { label: 'Advanced Features', href: '/help/faq/advanced' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Advanced Features FAQ</h1>
        <p className="text-lg text-muted-foreground">
          Questions about advanced budgeting features
        </p>
      </div>

      <div className="space-y-3">
        <FAQItem
          question="What are category types and should I use them?"
          answer={
            <>
              <p>
                Category types are an advanced feature that helps with automated budgeting. There
                are three types:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <strong>Monthly Expense:</strong> Expenses that happen every month (rent, utilities)
                </li>
                <li>
                  <strong>Accumulation:</strong> Periodic expenses you save for monthly (car insurance,
                  Christmas gifts)
                </li>
                <li>
                  <strong>Target Balance:</strong> Categories where you want to maintain a specific
                  balance (emergency fund)
                </li>
              </ul>
              <p className="mt-2">
                <strong>Should you use them?</strong> Only if you want to use Smart Allocation or
                need help calculating how much to save for periodic expenses. Most users can skip
                this feature and just use monthly amounts.
              </p>
            </>
          }
        />

        <FAQItem
          question="How does Smart Allocation work?"
          answer={
            <>
              <p>
                Smart Allocation automatically distributes money to your categories based on:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Priority:</strong> Higher priority categories get funded first</li>
                <li><strong>Category type:</strong> Different types have different funding rules</li>
                <li><strong>Current balance:</strong> Categories with negative balances get priority</li>
                <li><strong>Monthly amounts:</strong> How much each category needs</li>
              </ul>
              <p className="mt-2">
                To use it:
              </p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Enable Category Types and Priority in Settings</li>
                <li>Set priorities (1-10) for each category</li>
                <li>Set category types and monthly amounts</li>
                <li>Go to Money Movement and click "Smart Allocate"</li>
              </ol>
              <p className="mt-2">
                <strong>Note:</strong> This is an advanced feature. Make sure you understand basic
                budgeting before using it!
              </p>
            </>
          }
        />

        <FAQItem
          question="What is Monthly Funding Tracking and when should I use it?"
          answer={
            <>
              <p>
                Monthly Funding Tracking keeps track of how much you've allocated to each category
                in the current month, separate from the category balance.
              </p>
              <p className="mt-2">
                <strong>Why use it?</strong>
              </p>
              <p className="mt-1">
                It prevents accidentally re-funding categories for bills you've already paid. For
                example, if you allocated $100 to Electric in January and spent $95, the balance is
                $5. Without funding tracking, you might allocate another $100 in February, giving
                you $105 total. With funding tracking, you know you already funded Electric this
                month.
              </p>
              <p className="mt-2">
                <strong>When to use it:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>You get paid multiple times per month</li>
                <li>You want to ensure each category is only funded once per month</li>
                <li>You're using the Income Buffer feature</li>
              </ul>
            </>
          }
        />

        <FAQItem
          question="Should I use the Income Buffer feature?"
          answer={
            <>
              <p>
                The Income Buffer helps you "age your money" by living on last month's income. It's
                a powerful feature but not for everyone.
              </p>
              <p className="mt-2">
                <strong>Use it if:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>You want to break the paycheck-to-paycheck cycle</li>
                <li>You have irregular income (freelance, commission)</li>
                <li>You want to budget for the entire month at once</li>
                <li>You're comfortable with advanced budgeting concepts</li>
              </ul>
              <p className="mt-2">
                <strong>Skip it if:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>You're new to budgeting (learn the basics first)</li>
                <li>You don't have a month's expenses saved yet</li>
                <li>You prefer simpler budgeting</li>
              </ul>
              <p className="mt-2">
                See the{' '}
                <Link href="/help/features/income-buffer" className="text-primary hover:underline">
                  Income Buffer guide
                </Link>{' '}
                for more information.
              </p>
            </>
          }
        />

        <FAQItem
          question="How do I handle irregular income?"
          answer={
            <>
              <p>
                Irregular income (freelance, commission, seasonal work) requires a different approach:
              </p>
              <p className="mt-2">
                <strong>Option 1: Income Buffer (recommended)</strong>
              </p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Build up a buffer of 1-2 months of expenses</li>
                <li>In high-income months, add extra to the buffer</li>
                <li>In low-income months, fund your budget from the buffer</li>
                <li>The buffer smooths out the fluctuations</li>
              </ol>
              <p className="mt-2">
                <strong>Option 2: Conservative budgeting</strong>
              </p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Calculate your average monthly income over the past 6-12 months</li>
                <li>Budget based on this average (or slightly less)</li>
                <li>In high-income months, save the extra</li>
                <li>In low-income months, use the savings</li>
              </ol>
              <p className="mt-2">
                <strong>Option 3: Priority-based budgeting</strong>
              </p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Rank your categories by priority</li>
                <li>When income arrives, fund categories in priority order</li>
                <li>Stop when you run out of money</li>
                <li>Lower-priority categories get funded when you have extra income</li>
              </ol>
            </>
          }
        />

        <FAQItem
          question="What's the difference between merchant groups and category rules?"
          answer={
            <>
              <p>
                Both help with auto-categorization, but they work differently:
              </p>
              <p className="mt-2">
                <strong>Merchant Groups:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Group similar merchant names together (e.g., all Safeway stores)</li>
                <li>Assign a default category to the group</li>
                <li>Auto-categorize based on merchant name matching</li>
                <li>Best for consistent merchants (grocery stores, gas stations)</li>
              </ul>
              <p className="mt-2">
                <strong>Category Rules:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Create rules based on description patterns</li>
                <li>More flexible matching (can use wildcards, multiple conditions)</li>
                <li>Can override merchant group categorization</li>
                <li>Best for complex categorization needs</li>
              </ul>
              <p className="mt-2">
                Most users should start with merchant groups and only use category rules if they
                need more advanced matching.
              </p>
            </>
          }
        />

        <FAQItem
          question="How do I track shared expenses with a roommate?"
          answer={
            <>
              <p>
                There are several approaches:
              </p>
              <p className="mt-2">
                <strong>Option 1: Track your portion only</strong>
              </p>
              <p className="mt-1">
                Only track the expenses you pay directly. When your roommate pays shared expenses,
                record your reimbursement to them as a transaction in the appropriate category.
              </p>
              <p className="mt-2">
                <strong>Option 2: Track all expenses, use a "Roommate Reimbursement" category</strong>
              </p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Create a "Roommate Reimbursement" category</li>
                <li>When you pay a shared expense, record it in the appropriate category</li>
                <li>When your roommate pays you back, record it as income to "Roommate Reimbursement"</li>
                <li>The category balance shows how much you're owed (or owe)</li>
              </ol>
              <p className="mt-2">
                <strong>Option 3: Use a separate account</strong>
              </p>
              <p className="mt-1">
                Create a separate account in the app for shared expenses. Both you and your roommate
                contribute to it, and shared expenses come from this account.
              </p>
            </>
          }
        />

        <FAQItem
          question="Can I budget for annual expenses?"
          answer={
            <>
              <p>
                Yes! This is called a "sinking fund." Here's how:
              </p>
              <p className="mt-2">
                <strong>Method 1: Manual calculation</strong>
              </p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Create a category for the annual expense (e.g., "Car Insurance")</li>
                <li>Divide the annual cost by 12 to get the monthly amount</li>
                <li>Set this as the category's monthly amount</li>
                <li>Allocate this amount each month</li>
                <li>When the bill comes due, you'll have the full amount saved</li>
              </ol>
              <p className="mt-2">
                <strong>Method 2: Use Accumulation category type (advanced)</strong>
              </p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Enable Category Types in Settings</li>
                <li>Create a category and set type to "Accumulation"</li>
                <li>Set the annual target amount</li>
                <li>The app will calculate the monthly amount needed</li>
              </ol>
              <p className="mt-2">
                <strong>Examples of annual expenses:</strong> Car insurance, property taxes, HOA
                fees, Amazon Prime, holiday gifts, vacation.
              </p>
            </>
          }
        />
      </div>

      <WasThisHelpful articlePath="/help/faq/advanced" />
    </div>
  );
}



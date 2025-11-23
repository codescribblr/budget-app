import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { FAQItem } from '@/components/help/FAQItem';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import Link from 'next/link';

export default function GettingStartedFAQPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'FAQ', href: '/help/faq/general' },
          { label: 'Getting Started', href: '/help/faq/getting-started' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Getting Started FAQ</h1>
        <p className="text-lg text-muted-foreground">
          Common questions for new users
        </p>
      </div>

      <div className="space-y-3">
        <FAQItem
          question="I'm brand new. Where do I start?"
          answer={
            <>
              <p>
                Welcome! Here's the quickest path to get started:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>
                  Read the{' '}
                  <Link href="/help/getting-started/welcome" className="text-primary hover:underline">
                    Welcome & Overview
                  </Link>{' '}
                  to understand what envelope budgeting is
                </li>
                <li>
                  Follow the{' '}
                  <Link href="/help/getting-started/quick-start" className="text-primary hover:underline">
                    Quick Start Guide
                  </Link>{' '}
                  to set up your first budget
                </li>
                <li>
                  Read{' '}
                  <Link href="/help/getting-started/core-concepts" className="text-primary hover:underline">
                    Core Concepts
                  </Link>{' '}
                  to understand the key ideas
                </li>
                <li>
                  Work through{' '}
                  <Link href="/help/getting-started/first-budget" className="text-primary hover:underline">
                    Creating Your First Budget
                  </Link>{' '}
                  step by step
                </li>
              </ol>
              <p className="mt-2">
                Don't try to learn everything at once! Start simple and add features as you need them.
              </p>
            </>
          }
        />

        <FAQItem
          question="Do I need to enter all my past transactions?"
          answer={
            <>
              <p>
                No! You don't need historical data to start budgeting.
              </p>
              <p className="mt-2">
                <strong>Recommended approach:</strong>
              </p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Start with your current account balances (as of today)</li>
                <li>Create your budget categories</li>
                <li>Allocate your current money to categories</li>
                <li>Start recording transactions from today forward</li>
              </ol>
              <p className="mt-2">
                <strong>Optional:</strong> If you want historical data for reports, you can import
                past transactions from your bank. But it's not required to start budgeting!
              </p>
            </>
          }
        />

        <FAQItem
          question="How many categories should I create?"
          answer={
            <>
              <p>
                Start with 10-15 broad categories. You can always add more later.
              </p>
              <p className="mt-2">
                <strong>Essential categories for most people:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Rent/Mortgage</li>
                <li>Utilities</li>
                <li>Groceries</li>
                <li>Transportation/Gas</li>
                <li>Insurance</li>
                <li>Dining Out</li>
                <li>Entertainment</li>
                <li>Clothing</li>
                <li>Personal Care</li>
                <li>Emergency Fund</li>
              </ul>
              <p className="mt-2">
                Don't create too many categories at first - it makes budgeting harder. Add specific
                categories only when you need better tracking in a particular area.
              </p>
            </>
          }
        />

        <FAQItem
          question="What if I don't know how much to budget for each category?"
          answer={
            <>
              <p>
                That's normal! You'll learn as you go. Here's how to start:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>
                  <strong>Fixed expenses:</strong> Use the actual amount (rent, insurance, loan payments)
                </li>
                <li>
                  <strong>Variable expenses:</strong> Make your best guess based on recent spending
                </li>
                <li>
                  <strong>Unknown expenses:</strong> Start with a conservative estimate
                </li>
              </ol>
              <p className="mt-2">
                After a month or two, you'll have real data to work with. Use the{' '}
                <Link href="/reports" className="text-primary hover:underline">
                  Reports
                </Link>{' '}
                to see your actual spending and adjust your budget accordingly.
              </p>
              <p className="mt-2">
                <strong>Remember:</strong> Your budget is a living document. It's okay to adjust it!
              </p>
            </>
          }
        />

        <FAQItem
          question="Should I include my savings account in totals?"
          answer={
            <>
              <p>
                It depends on how you use the savings account:
              </p>
              <p className="mt-2">
                <strong>Include in totals if:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>It's part of your emergency fund that you might need to access</li>
                <li>You're saving for specific goals (vacation, car, etc.)</li>
                <li>It's money you're actively budgeting</li>
              </ul>
              <p className="mt-2">
                <strong>Exclude from totals if:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>It's a retirement account you can't access</li>
                <li>It's money you're tracking but not budgeting (like a child's account)</li>
                <li>It has restrictions that prevent you from using it</li>
              </ul>
              <p className="mt-2">
                Most people should include their regular savings accounts in totals.
              </p>
            </>
          }
        />

        <FAQItem
          question="What's the first thing I should do after creating my account?"
          answer={
            <>
              <p>
                Follow these steps in order:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>
                  <strong>Add your accounts:</strong> Enter all your bank accounts with current balances
                </li>
                <li>
                  <strong>Create categories:</strong> Start with 10-15 broad categories
                </li>
                <li>
                  <strong>Allocate your money:</strong> Go to Money Movement and allocate your current
                  money to categories
                </li>
                <li>
                  <strong>Set monthly amounts:</strong> Set the monthly amount for each category
                </li>
                <li>
                  <strong>Start recording transactions:</strong> Record your spending as it happens
                </li>
              </ol>
              <p className="mt-2">
                See the{' '}
                <Link href="/help/getting-started/first-budget" className="text-primary hover:underline">
                  Creating Your First Budget
                </Link>{' '}
                guide for detailed instructions.
              </p>
            </>
          }
        />

        <FAQItem
          question="How often should I update my budget?"
          answer={
            <>
              <p>
                Different tasks have different frequencies:
              </p>
              <p className="mt-2">
                <strong>Daily or as they happen:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Record transactions (or import them weekly)</li>
              </ul>
              <p className="mt-2">
                <strong>Weekly:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Update account balances</li>
                <li>Review category balances</li>
                <li>Check for pending checks that have cleared</li>
              </ul>
              <p className="mt-2">
                <strong>When you get paid:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Update account balance</li>
                <li>Allocate the new money to categories</li>
              </ul>
              <p className="mt-2">
                <strong>Monthly:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Review spending reports</li>
                <li>Adjust category amounts based on actual spending</li>
                <li>Update loan balances</li>
              </ul>
            </>
          }
        />

        <FAQItem
          question="Can I use this with my partner/spouse?"
          answer={
            <>
              <p>
                Yes! Here are some approaches:
              </p>
              <p className="mt-2">
                <strong>Option 1: Shared account</strong>
              </p>
              <p className="mt-1">
                Both use the same login and manage the budget together. This works well if you
                share all finances.
              </p>
              <p className="mt-2">
                <strong>Option 2: Separate accounts with shared categories</strong>
              </p>
              <p className="mt-1">
                Each person has their own account but uses similar category structures. Good for
                couples who keep some finances separate.
              </p>
              <p className="mt-2">
                <strong>Option 3: One person manages, both contribute</strong>
              </p>
              <p className="mt-1">
                One person maintains the budget, the other provides transaction information. Works
                if one person is more interested in budgeting.
              </p>
              <p className="mt-2">
                <strong>Tip:</strong> Whatever approach you choose, communicate regularly about the
                budget. Schedule a weekly "money date" to review together!
              </p>
            </>
          }
        />
      </div>

      <WasThisHelpful articlePath="/help/faq/getting-started" />
    </div>
  );
}


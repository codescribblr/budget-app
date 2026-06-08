import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { FAQItem } from '@/components/help/FAQItem';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import Link from 'next/link';

export default function EnvelopeBudgetingFAQPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'FAQ', href: '/help/faq/general' },
          { label: 'Envelope Budgeting', href: '/help/faq/envelope-budgeting' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Envelope Budgeting Basics</h1>
        <p className="text-lg text-muted-foreground">
          Common questions about envelope budgeting concepts
        </p>
      </div>

      <div className="space-y-3">
        <FAQItem
          question="What's the difference between a category and an account?"
          answer={
            <>
              <p>
                This is one of the most important concepts in envelope budgeting:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <strong>Accounts</strong> are where your money physically lives (checking account,
                  savings account, credit card). They represent the <em>location</em> of your money.
                </li>
                <li>
                  <strong>Categories (Envelopes)</strong> are what your money is <em>for</em> (groceries,
                  rent, vacation fund). They represent the <em>purpose</em> of your money.
                </li>
              </ul>
              <p className="mt-2">
                You might have $5,000 in your checking account, but that money is divided across many
                categories: $1,200 for rent, $400 for groceries, $500 for your emergency fund, etc.
              </p>
              <p className="mt-2">
                Learn more in our{' '}
                <Link href="/help/getting-started/core-concepts" className="text-primary hover:underline">
                  Core Concepts guide
                </Link>
                .
              </p>
            </>
          }
        />

        <FAQItem
          question="What does 'Available to Save' mean?"
          answer={
            <>
              <p>
                "Available to Save" is money in your accounts that hasn't been allocated to any category
                yet. It's money that doesn't have a job yet.
              </p>
              <p className="mt-2">
                <strong>Formula:</strong> Total Money in Accounts - Total Allocated to Categories - Pending Checks
              </p>
              <p className="mt-2">
                <strong>Goal:</strong> This number should ideally be zero (or close to it). This means
                every dollar has been given a job. If it's positive, you have unallocated money. If it's
                negative, you've allocated more than you have (planning to spend money you don't have yet).
              </p>
            </>
          }
        />

        <FAQItem
          question="Why is my Available to Save negative?"
          answer={
            <>
              <p>
                A negative "Available to Save" means you've allocated more money to categories than you
                actually have in your accounts. Common causes:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>You allocated money you're expecting to receive but haven't received yet</li>
                <li>You forgot to update an account balance after spending money</li>
                <li>You have pending checks that haven't been accounted for</li>
                <li>You allocated money to categories before it arrived in your account</li>
              </ul>
              <p className="mt-2">
                <strong>How to fix it:</strong>
              </p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Update all your account balances to match your bank</li>
                <li>Review your pending checks</li>
                <li>If still negative, reduce allocations in some categories until it's zero</li>
              </ol>
            </>
          }
        />

        <FAQItem
          question="Should I create a category for every expense?"
          answer={
            <>
              <p>
                No! Start with broad categories and only create more specific ones if you need them.
              </p>
              <p className="mt-2">
                <strong>Good approach:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Start with 10-15 broad categories</li>
                <li>Group similar expenses together (e.g., "Utilities" instead of separate electric, water, gas)</li>
                <li>Add more specific categories only if you need better tracking</li>
              </ul>
              <p className="mt-2">
                <strong>Too many categories</strong> makes budgeting harder and more time-consuming.
                <strong> Too few categories</strong> makes it hard to see where your money is going.
              </p>
              <p className="mt-2">
                Find the balance that works for you!
              </p>
            </>
          }
        />

        <FAQItem
          question="How often should I allocate money to envelopes?"
          answer={
            <>
              <p>
                Allocate money whenever you receive income:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Weekly paycheck:</strong> Allocate weekly</li>
                <li><strong>Bi-weekly paycheck:</strong> Allocate every two weeks</li>
                <li><strong>Monthly paycheck:</strong> Allocate once a month</li>
                <li><strong>Irregular income:</strong> Allocate whenever you get paid</li>
              </ul>
              <p className="mt-2">
                The key is to allocate money as soon as it arrives, giving every dollar a job immediately.
              </p>
            </>
          }
        />

        <FAQItem
          question="What happens if I overspend a category?"
          answer={
            <>
              <p>
                If you spend more than you allocated to a category, the category balance will go negative.
                This is okay! It just means you need to adjust.
              </p>
              <p className="mt-2">
                <strong>How to handle it:</strong>
              </p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Go to <Link href="/money-movement" className="text-primary hover:underline">Money Movement</Link></li>
                <li>Click the "Transfer Between Envelopes" tab</li>
                <li>Transfer money from another category to cover the overspending</li>
              </ol>
              <p className="mt-2">
                This is the flexibility of envelope budgeting - you can move money between categories
                as needed. Just make sure the total across all categories doesn't exceed what you have!
              </p>
            </>
          }
        />

        <FAQItem
          question="Can I have money in multiple accounts but track it as one budget?"
          answer={
            <>
              <p>
                Yes! This is exactly how envelope budgeting works.
              </p>
              <p className="mt-2">
                You might have money spread across:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Checking account: $2,000</li>
                <li>Savings account: $5,000</li>
                <li>Cash on hand: $100</li>
              </ul>
              <p className="mt-2">
                Total: $7,100
              </p>
              <p className="mt-2">
                That $7,100 is then divided across your budget categories (rent, groceries, emergency
                fund, etc.). The categories don't care which account the money is in - they just track
                what the money is for.
              </p>
            </>
          }
        />

        <FAQItem
          question="Do I need to move money between accounts to match my categories?"
          answer={
            <>
              <p>
                No! Your budget categories are separate from your physical accounts.
              </p>
              <p className="mt-2">
                For example, you might have:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>$3,000 in checking account</li>
                <li>$500 allocated to Groceries category</li>
                <li>$1,200 allocated to Rent category</li>
                <li>$1,300 allocated to Emergency Fund category</li>
              </ul>
              <p className="mt-2">
                All that money is still in your checking account. The categories just tell you what
                each portion is for. You don't need to physically move money around.
              </p>
              <p className="mt-2">
                Some people do like to keep certain money in separate accounts (like emergency fund
                in savings), but it's not required for the budget to work.
              </p>
            </>
          }
        />
      </div>

      <WasThisHelpful articlePath="/help/faq/envelope-budgeting" />
    </div>
  );
}



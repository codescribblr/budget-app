import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { InlineCode } from '@/components/help/CodeBlock';

export default function CoreConceptsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Getting Started', href: '/help/getting-started/welcome' },
          { label: 'Core Concepts', href: '/help/getting-started/core-concepts' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Core Concepts</h1>
        <p className="text-lg text-muted-foreground">
          Understanding the fundamental principles of envelope budgeting
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <h2>What is Envelope Budgeting?</h2>
        <p>
          Envelope budgeting is a cash management system where you divide your money into categories
          (envelopes) based on how you plan to spend it. Each envelope represents a specific purpose,
          like groceries, rent, or entertainment.
        </p>
        <p>
          The key principle: <strong>Every dollar has a job.</strong> When you get paid, you assign
          every dollar to a specific envelope. When you need to spend money, you take it from the
          appropriate envelope. Once an envelope is empty, you can't spend any more in that category
          until you add more money to it.
        </p>

        <h2>Categories vs Accounts</h2>
        <p>
          This is one of the most important concepts to understand:
        </p>
        <ul>
          <li>
            <strong>Accounts</strong> are where your money physically lives (checking account, savings
            account, credit card). They represent the <em>location</em> of your money.
          </li>
          <li>
            <strong>Categories (Envelopes)</strong> are what your money is <em>for</em> (groceries, rent,
            vacation fund). They represent the <em>purpose</em> of your money.
          </li>
        </ul>
        <p>
          You might have $5,000 in your checking account, but that money is divided across many categories:
          $1,200 for rent, $400 for groceries, $500 for your emergency fund, etc.
        </p>

        <Callout type="tip" title="Think of it this way">
          Your bank account is like a big bucket that holds all your money. Your budget categories are
          like labels on portions of that money, telling you what each portion is for.
        </Callout>

        <h2>Current Balance vs Available to Save</h2>
        <p>
          These are two critical numbers you'll see throughout the app:
        </p>
        <ul>
          <li>
            <strong>Current Balance (in categories):</strong> How much money is currently allocated to
            each category. This is money that has a specific job.
          </li>
          <li>
            <strong>Available to Save:</strong> Money in your accounts that hasn't been allocated to any
            category yet. This is money that doesn't have a job yet and needs to be assigned.
          </li>
        </ul>
        <p>
          The formula: <InlineCode>Total Money in Accounts - Total Allocated to Categories = Available to Save</InlineCode>
        </p>

        <Callout type="important" title="Goal: Zero Available to Save">
          Ideally, your "Available to Save" should be zero (or close to it). This means every dollar
          has been given a job. If it's positive, you have unallocated money. If it's negative, you've
          allocated more than you have (which is allowed, but means you're planning to spend money you
          don't have yet).
        </Callout>

        <h2>How Money Flows Through the System</h2>
        <p>
          Understanding the flow of money is key to mastering envelope budgeting:
        </p>
        <ol>
          <li>
            <strong>Income arrives:</strong> You get paid and the money goes into your bank account.
            Your account balance increases, and so does your "Available to Save."
          </li>
          <li>
            <strong>Allocate to categories:</strong> You go to Money Movement and allocate that income
            to your categories. Your "Available to Save" decreases, and your category balances increase.
          </li>
          <li>
            <strong>Spend money:</strong> When you make a purchase, you record a transaction in the
            appropriate category. The category balance decreases, but your "Available to Save" doesn't
            change (because the money was already allocated).
          </li>
          <li>
            <strong>Account balance decreases:</strong> The money leaves your bank account. Your account
            balance decreases to match the spending.
          </li>
        </ol>

        <h2>The Monthly Budget Cycle</h2>
        <p>
          Most people follow a monthly cycle:
        </p>
        <ol>
          <li>
            <strong>Start of month:</strong> Review your categories and plan for the month ahead.
          </li>
          <li>
            <strong>Get paid:</strong> When income arrives, allocate it to categories based on your plan.
          </li>
          <li>
            <strong>Throughout the month:</strong> Record transactions as you spend. Watch your category
            balances to avoid overspending.
          </li>
          <li>
            <strong>Adjust as needed:</strong> If you overspend in one category, transfer money from
            another category to cover it.
          </li>
          <li>
            <strong>End of month:</strong> Review your spending, see what worked and what didn't, and
            plan for next month.
          </li>
        </ol>

        <h2>Understanding the Dashboard Summary</h2>
        <p>
          The Dashboard gives you a complete picture of your finances:
        </p>
        <ul>
          <li>
            <strong>Total Monies:</strong> All the money in your accounts (checking, savings, etc.)
          </li>
          <li>
            <strong>Available to Save:</strong> Money that hasn't been allocated to categories yet
          </li>
          <li>
            <strong>Budget Categories:</strong> Total amount allocated across all your envelopes
          </li>
          <li>
            <strong>Credit Cards:</strong> Total credit card debt (shown as negative)
          </li>
          <li>
            <strong>Pending Checks:</strong> Checks you've written but haven't cleared yet
          </li>
          <li>
            <strong>Loans:</strong> Outstanding loan balances
          </li>
          <li>
            <strong>Goals:</strong> Progress toward your savings goals
          </li>
        </ul>

        <h2>Key Principles to Remember</h2>
        <ul>
          <li>Every dollar has a job - allocate all your money to categories</li>
          <li>Categories are flexible - you can move money between them as needed</li>
          <li>Negative category balances are okay - they show you overspent and need to adjust</li>
          <li>Your budget is a plan, not a restriction - adjust it as life happens</li>
          <li>Consistency is key - record transactions regularly to keep your budget accurate</li>
        </ul>
      </div>

      <WasThisHelpful articlePath="/help/getting-started/core-concepts" />
    </div>
  );
}


import React from 'react';

export const HELP_CONTENT = {
  monthly_funding_tracking: {
    title: 'Monthly Funding Tracking',
    tooltip: 'Track how much you\'ve funded to each category this month, separate from the current balance.',
    description: 'Monthly Funding Tracking prevents refunding already-paid bills by tracking "funded this month" separately from "current balance".',
    sections: [
      {
        title: 'What is Monthly Funding Tracking?',
        content: (
          <>
            <p>
              This feature tracks how much money you've allocated to each category <strong>this month</strong>,
              separate from the current balance in the envelope.
            </p>
            <p className="mt-2">
              <strong>Example:</strong> You allocate $1,000 to your mortgage category and pay the bill.
              The balance is now $0, but the system remembers you already funded $1,000 this month.
              When you get another paycheck, it won't try to refund the mortgage.
            </p>
          </>
        ),
      },
      {
        title: 'Who Should Use This?',
        content: (
          <ul className="list-disc list-inside space-y-1">
            <li>Anyone who gets multiple paychecks per month</li>
            <li>People with variable income who allocate funds incrementally</li>
            <li>Users who want to see funding progress throughout the month</li>
          </ul>
        ),
      },
      {
        title: 'How It Works',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Each time you allocate money to a category, it's recorded for the current month</li>
            <li>The system tracks both "current balance" and "funded this month"</li>
            <li>Progress bars show funding progress vs. monthly target</li>
            <li>On the 1st of each month, funding tracking resets automatically</li>
          </ol>
        ),
      },
    ],
  },

  category_types: {
    title: 'Category Types',
    tooltip: 'Categorize your envelopes as Monthly Expense, Accumulation, or Target Balance with type-specific progress tracking.',
    description: 'Different categories serve different purposes. Category Types let you specify how each category should behave.',
    sections: [
      {
        title: 'Three Category Types',
        content: (
          <div className="space-y-3">
            <div>
              <strong>Monthly Expense</strong>
              <p className="text-muted-foreground">
                Regular monthly spending like groceries, gas, utilities. No catch-up if you underfund.
              </p>
            </div>
            <div>
              <strong>Accumulation</strong>
              <p className="text-muted-foreground">
                Save for periodic expenses like annual insurance or car registration. Tracks year-to-date
                progress and catches up if behind.
              </p>
            </div>
            <div>
              <strong>Target Balance</strong>
              <p className="text-muted-foreground">
                Build a buffer like an emergency fund or medical savings. Stops allocating when target is reached.
              </p>
            </div>
          </div>
        ),
      },
      {
        title: 'Progress Tracking',
        content: (
          <>
            <p>
              Each category type shows progress differently:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Monthly Expense:</strong> Shows current balance vs. monthly target</li>
              <li><strong>Accumulation:</strong> Shows total funded YTD vs. annual target</li>
              <li><strong>Target Balance:</strong> Shows current balance vs. target balance</li>
            </ul>
          </>
        ),
      },
    ],
  },

  priority_system: {
    title: 'Priority System',
    tooltip: 'Assign priorities (1-10) to categories to control funding order when money is limited.',
    description: 'When you have limited funds, the Priority System ensures your most important categories get funded first.',
    sections: [
      {
        title: 'How Priorities Work',
        content: (
          <>
            <p>
              Assign each category a priority from 1 (highest) to 10 (lowest). When using Smart Allocation,
              categories are funded in priority order.
            </p>
            <p className="mt-2">
              <strong>Example:</strong> Mortgage (priority 1), groceries (priority 2), entertainment (priority 8).
              If you only have $2,000, mortgage and groceries get funded first.
            </p>
          </>
        ),
      },
      {
        title: 'Recommended Priorities',
        content: (
          <ul className="list-disc list-inside space-y-1">
            <li><strong>1-2:</strong> Essential bills (mortgage, utilities, insurance)</li>
            <li><strong>3-4:</strong> Food and transportation</li>
            <li><strong>5-6:</strong> Debt payments and savings</li>
            <li><strong>7-8:</strong> Discretionary spending</li>
            <li><strong>9-10:</strong> Nice-to-haves and luxuries</li>
          </ul>
        ),
      },
    ],
  },

  smart_allocation: {
    title: 'Smart Allocation',
    tooltip: 'Automatically allocate funds to categories based on priorities, with catch-up for underfunded categories.',
    description: 'Smart Allocation automatically distributes your money across categories based on priorities and needs.',
    sections: [
      {
        title: 'What is Smart Allocation?',
        content: (
          <>
            <p>
              Instead of manually allocating to each category, Smart Allocation does it for you based on:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Category priorities (1-10)</li>
              <li>Category types (Monthly Expense, Accumulation, Target Balance)</li>
              <li>What's already been funded this month</li>
              <li>Catch-up needs for underfunded categories</li>
            </ul>
          </>
        ),
      },
      {
        title: 'How It Works',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Enter the amount you want to allocate</li>
            <li>Click "Smart Allocate"</li>
            <li>System funds categories in priority order</li>
            <li>Accumulation categories get catch-up funding if behind</li>
            <li>Target Balance categories stop when target is reached</li>
            <li>Review and confirm the allocation</li>
          </ol>
        ),
      },
    ],
  },

  income_buffer: {
    title: 'Income Buffer',
    tooltip: 'Smooth irregular income by storing large payments and releasing funds monthly.',
    description: 'The Income Buffer helps you create a regular monthly rhythm even with irregular income.',
    sections: [
      {
        title: 'What is an Income Buffer?',
        content: (
          <>
            <p>
              An Income Buffer is a special category that holds excess income and releases it to you
              in regular monthly amounts, creating predictability from irregular income.
            </p>
            <p className="mt-2">
              <strong>Example:</strong> You earn $10,000 in January but $2,000 in February. The buffer
              stores the January surplus and supplements February's income, giving you $6,000 each month.
            </p>
          </>
        ),
      },
    ],
  },

  advanced_reporting: {
    title: 'Advanced Reporting',
    tooltip: 'Detailed reports and analytics for income volatility, funding consistency, and spending patterns.',
    description: 'Advanced Reporting provides insights into your budgeting patterns and financial health.',
    sections: [
      {
        title: 'Available Reports',
        content: (
          <ul className="list-disc list-inside space-y-1">
            <li>Income volatility analysis</li>
            <li>Funding consistency by category</li>
            <li>Spending patterns over time</li>
            <li>Category performance metrics</li>
            <li>Budget vs. actual comparisons</li>
          </ul>
        ),
      },
    ],
  },
};


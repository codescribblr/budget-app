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

  ai_chat: {
    title: 'AI Features',
    tooltip: 'Enable AI-powered features including transaction categorization, financial insights, and chat assistant.',
    description: 'AI Features use advanced machine learning to help automate categorization, generate insights, and answer questions about your finances.',
    sections: [
      {
        title: 'What\'s Included',
        content: (
          <div className="space-y-3">
            <div>
              <strong>Transaction Categorization</strong>
              <p className="text-muted-foreground">
                Automatically categorize uncategorized transactions during import. The AI analyzes merchant names, 
                descriptions, and amounts to suggest appropriate categories based on your existing categorization patterns.
              </p>
            </div>
            <div>
              <strong>Financial Insights</strong>
              <p className="text-muted-foreground">
                Get monthly AI-generated insights about your spending patterns, budget performance, and savings 
                opportunities. Insights appear in the dashboard widget and are updated daily.
              </p>
            </div>
            <div>
              <strong>AI Chat Assistant</strong>
              <p className="text-muted-foreground">
                Ask questions about your budget, spending, goals, and financial patterns. The assistant understands 
                your complete financial picture and can provide personalized recommendations.
              </p>
            </div>
          </div>
        ),
      },
      {
        title: 'How It Works',
        content: (
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>Transaction Categorization:</strong> When importing transactions, uncategorized items are 
              automatically analyzed and assigned to categories based on patterns from your past transactions.
            </li>
            <li>
              <strong>Financial Insights:</strong> The AI analyzes your spending, budget, and goals to generate 
              monthly insights with actionable recommendations.
            </li>
            <li>
              <strong>Chat Assistant:</strong> Ask questions in natural language about your finances. The AI 
              has access to your transactions, categories, goals, and budget to provide contextual answers.
            </li>
            <li>
              <strong>Learning:</strong> The AI learns from your manual corrections and category choices to 
              improve suggestions over time.
            </li>
          </ol>
        ),
      },
      {
        title: 'Daily Limits',
        content: (
          <div className="space-y-2">
            <p>
              To ensure fair usage and maintain service quality, AI features have daily limits:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Chat:</strong> 15 queries per day</li>
              <li><strong>Categorization:</strong> 5 import sessions per day</li>
              <li><strong>Dashboard Insights:</strong> 1 generation per day</li>
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              Limits reset daily at midnight UTC. You can always review and manually adjust AI suggestions.
            </p>
          </div>
        ),
      },
      {
        title: 'Accuracy & Review',
        content: (
          <div className="space-y-2">
            <p>
              AI suggestions are designed to be helpful, but they're not always perfect. Always review AI 
              categorizations before importing transactions.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>AI categorizations are marked with a sparkles icon (✨) for easy identification</li>
              <li>You can accept, modify, or reject any AI suggestion</li>
              <li>Manual corrections help the AI learn your preferences</li>
              <li>Rule-based categorization still runs as a backup</li>
            </ul>
          </div>
        ),
      },
      {
        title: 'Privacy & Data',
        content: (
          <div className="space-y-2">
            <p>
              Your financial data privacy is important:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Transaction data is sent to Google's Gemini AI service for processing</li>
              <li>Data is used only for categorization and insights generation</li>
              <li>We do not store your data with third-party AI services beyond what's necessary for processing</li>
              <li>You can disable AI features at any time in Settings</li>
              <li>When disabled, no data is sent to AI services</li>
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              AI features require an active Premium subscription. Disabling this feature turns off all AI 
              functionality across the app.
            </p>
          </div>
        ),
      },
    ],
  },

  automatic_imports: {
    title: 'Automatic Imports',
    tooltip: 'Set up automatic transaction imports from your bank accounts via email forwarding or API integrations.',
    description: 'Automatic Imports allows you to connect your bank accounts and automatically import transactions without manual file uploads.',
    sections: [
      {
        title: 'What is Automatic Imports?',
        content: (
          <>
            <p>
              Automatic Imports eliminates the need to manually download and upload transaction files. 
              Instead, transactions are automatically fetched from your bank accounts and queued for review before being added to your budget.
            </p>
            <p className="mt-2">
              <strong>Two Integration Methods:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li><strong>Email Forwarding:</strong> Forward bank statements or transaction emails to a special address</li>
              <li><strong>API Integration:</strong> Connect directly via services like Teller for real-time transaction sync</li>
            </ul>
          </>
        ),
      },
      {
        title: 'How It Works',
        content: (
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>Set Up Integration:</strong> Choose email forwarding or API integration (like Teller) 
              and configure which accounts to import from
            </li>
            <li>
              <strong>Transactions Are Queued:</strong> When new transactions are detected, they're added to 
              the import queue for review - nothing is automatically imported
            </li>
            <li>
              <strong>Review & Approve:</strong> Go to the Import Queue page to review transactions, assign categories, 
              and approve them for import
            </li>
            <li>
              <strong>Automatic Processing:</strong> Transactions are automatically categorized using your merchant rules 
              and AI categorization (if enabled)
            </li>
          </ol>
        ),
      },
      {
        title: 'Email Forwarding Setup',
        content: (
          <div className="space-y-2">
            <p>
              <strong>Step 1:</strong> Create an email import setup in Settings → Automatic Imports
            </p>
            <p>
              <strong>Step 2:</strong> You'll receive a unique email address (e.g., import-abc123@yourdomain.com)
            </p>
            <p>
              <strong>Step 3:</strong> Forward transaction emails or bank statements to this address
            </p>
            <p>
              <strong>Step 4:</strong> The system automatically extracts transactions from CSV or PDF attachments
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Supported formats: CSV files, PDF statements from major banks, and transaction emails with attachments
            </p>
          </div>
        ),
      },
      {
        title: 'API Integration (Teller)',
        content: (
          <div className="space-y-2">
            <p>
              <strong>Teller Integration:</strong> Connect your bank accounts directly via Teller's secure API
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Real-time transaction sync (no email forwarding needed)</li>
              <li>Supports 11,000+ banks and credit unions</li>
              <li>Secure read-only access (we can't move money)</li>
              <li>Automatic account detection and mapping</li>
            </ul>
            <p className="mt-2">
              <strong>Setup:</strong> Click "Connect Bank Account" and follow the Teller authentication flow. 
              You'll be redirected to your bank's login page for secure authentication.
            </p>
            <p className="text-sm text-muted-foreground">
              Note: Teller may charge a small fee per account connection. Check their pricing for details.
            </p>
          </div>
        ),
      },
      {
        title: 'Transaction Queue & Review',
        content: (
          <div className="space-y-2">
            <p>
              All imported transactions go through a review queue before being added to your budget:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Batch Review:</strong> Transactions are grouped by import source and date range</li>
              <li><strong>Categorization:</strong> Transactions are pre-categorized using merchant rules and AI</li>
              <li><strong>Account Mapping:</strong> Transactions are mapped to your budget accounts or credit cards</li>
              <li><strong>Approval Required:</strong> You must review and approve batches before they're imported</li>
              <li><strong>Edit Before Import:</strong> Change categories, amounts, dates, or accounts before approving</li>
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              This two-step process ensures accuracy and prevents incorrect transactions from being added to your budget.
            </p>
          </div>
        ),
      },
      {
        title: 'Security & Privacy',
        content: (
          <div className="space-y-2">
            <p>
              Your financial data security is our top priority:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Email:</strong> Unique import addresses are account-specific and encrypted</li>
              <li><strong>API Integrations:</strong> Use bank-level security (OAuth) - we never see your login credentials</li>
              <li><strong>Read-Only Access:</strong> Integrations can only read transactions, never move money</li>
              <li><strong>Data Storage:</strong> All transaction data is encrypted at rest</li>
              <li><strong>You Control Everything:</strong> You can disconnect integrations or delete import setups at any time</li>
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              Automatic Imports requires a Premium subscription. You can disable this feature at any time in Settings → Features.
            </p>
          </div>
        ),
      },
    ],
  },

  tags: {
    title: 'Tags',
    tooltip: 'Assign custom tags to transactions for flexible categorization, filtering, and reporting beyond categories and merchants.',
    description: 'Tags provide a flexible, user-defined way to categorize and filter transactions beyond the existing category and merchant systems.',
    sections: [
      {
        title: 'What are Tags?',
        content: (
          <>
            <p>
              Tags are custom labels you can assign to transactions to track specific attributes, projects, 
              or classifications that don't fit into your category or merchant structure.
            </p>
            <p className="mt-2">
              <strong>Example Use Cases:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li><strong>Rental Property Tracking:</strong> Tag all expenses related to "124 Irene Circle" to track property-specific costs</li>
              <li><strong>Project Tracking:</strong> Tag transactions related to specific projects or clients</li>
              <li><strong>Tax Preparation:</strong> Tag transactions for tax categories (e.g., "Business Expense", "Medical", "Charitable")</li>
              <li><strong>Event Tracking:</strong> Tag expenses related to specific events or trips</li>
              <li><strong>Custom Classifications:</strong> Any user-defined grouping that doesn't fit categories or merchants</li>
            </ul>
          </>
        ),
      },
      {
        title: 'How Tags Work',
        content: (
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>Create Tags:</strong> Go to the Tags page to create custom tags with names, colors, and optional descriptions
            </li>
            <li>
              <strong>Assign to Transactions:</strong> When editing or creating transactions, use the tag selector to assign one or more tags
            </li>
            <li>
              <strong>Filter by Tags:</strong> Use tags to filter transactions in the Transactions page or search by tag name
            </li>
            <li>
              <strong>Tag Rules:</strong> Set up automatic tag assignment rules based on merchant, category, or description patterns
            </li>
            <li>
              <strong>Tag Reports:</strong> View spending reports filtered by tags to analyze spending patterns across your custom classifications
            </li>
          </ol>
        ),
      },
      {
        title: 'Tag Management',
        content: (
          <div className="space-y-3">
            <div>
              <strong>Creating Tags</strong>
              <p className="text-muted-foreground">
                Create tags from the Tags page or inline when assigning tags to transactions. Each tag can have:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>A unique name</li>
                <li>An optional color for visual identification</li>
                <li>An optional description</li>
              </ul>
            </div>
            <div>
              <strong>Editing Tags</strong>
              <p className="text-muted-foreground">
                Edit tag names, colors, or descriptions at any time. Changes apply to all transactions using that tag.
              </p>
            </div>
            <div>
              <strong>Merging Tags</strong>
              <p className="text-muted-foreground">
                If you have duplicate or similar tags, you can merge them. All transactions using the merged tags will be updated automatically.
              </p>
            </div>
            <div>
              <strong>Deleting Tags</strong>
              <p className="text-muted-foreground">
                When deleting a tag, you'll see how many transactions are using it. The tag will be removed from all transactions, but the transactions themselves remain unchanged.
              </p>
            </div>
          </div>
        ),
      },
      {
        title: 'Tag Rules',
        content: (
          <div className="space-y-2">
            <p>
              Tag Rules automatically assign tags to transactions based on patterns you define:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Merchant-based:</strong> Automatically tag transactions from specific merchants</li>
              <li><strong>Category-based:</strong> Tag all transactions in certain categories</li>
              <li><strong>Description-based:</strong> Tag transactions containing specific keywords in descriptions</li>
              <li><strong>Combined Rules:</strong> Create complex rules using multiple conditions</li>
            </ul>
            <p className="mt-2">
              Tag Rules run automatically when transactions are imported or created, saving you time on manual tagging.
            </p>
          </div>
        ),
      },
      {
        title: 'Tag Reporting',
        content: (
          <div className="space-y-2">
            <p>
              Tag Reports provide insights into spending patterns by your custom tags:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Spending by Tag:</strong> See total spending for each tag over any time period</li>
              <li><strong>Tag Trends:</strong> Track how spending changes over time for specific tags</li>
              <li><strong>Multi-Tag Analysis:</strong> Compare spending across multiple tags</li>
              <li><strong>Tag Breakdowns:</strong> See which categories or merchants are associated with each tag</li>
            </ul>
            <p className="mt-2">
              Tag Reports help you understand spending patterns that might not be visible when looking only at categories or merchants.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Access Tag Reports from the Reports menu or by clicking on a tag in the Tags page.
            </p>
          </div>
        ),
      },
      {
        title: 'Best Practices',
        content: (
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Keep it Simple:</strong> Don't create too many tags - aim for 10-20 meaningful tags</li>
            <li><strong>Use Consistent Naming:</strong> Establish a naming convention (e.g., "Property: 124 Irene Circle" vs "124 Irene Circle")</li>
            <li><strong>Leverage Tag Rules:</strong> Set up rules for common patterns to reduce manual tagging</li>
            <li><strong>Review Regularly:</strong> Periodically review and merge duplicate tags to keep your tag list clean</li>
            <li><strong>Combine with Categories:</strong> Tags work alongside categories - use categories for budgeting and tags for tracking</li>
          </ul>
        ),
      },
    ],
  },
};


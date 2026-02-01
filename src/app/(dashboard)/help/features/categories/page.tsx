import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FolderOpen,
  Tag,
  DollarSign,
  TrendingUp,
  Calendar,
  ArrowUpDown,
  Edit3,
  Shield,
  Lightbulb,
  Layers,
  Archive,
  List,
  Grid3X3,
  Search,
  Filter,
  FileText,
  History,
  Eye
} from 'lucide-react';

export default function CategoriesFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Budget Categories', href: '/help/features/categories' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Budget Categories (Envelopes)</h1>
        <p className="text-lg text-muted-foreground">
          Create and manage your spending categories
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            Categories (also called envelopes) are the heart of envelope budgeting. Each category
            represents a specific purpose for your money - like groceries, rent, or savings.
          </p>
        </CardContent>
      </Card>

      {/* Creating Categories */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Creating Categories</CardTitle>
              <CardDescription className="text-base">
                Follow these steps to add a new budget category
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StepList
            steps={[
              { title: 'Go to the Dashboard', content: 'Navigate to your main dashboard page' },
              { title: 'Click "Add Category"', content: 'Find the Budget Categories card and click the "Add Category" button' },
              { title: 'Enter category name', content: 'Choose a clear name (e.g., "Groceries", "Rent", "Entertainment")' },
              { title: 'Set monthly amount', content: 'Enter how much you plan to spend/save in this category each month' },
              { title: 'Optional settings', content: 'Set category type and priority if these features are enabled' },
              { title: 'Save', content: 'Click "Add Category" to create your new category' },
            ]}
          />
          <Callout type="tip" title="Start simple">
            Begin with 10-15 broad categories. You can always add more specific categories later as
            you refine your budget.
          </Callout>
        </CardContent>
      </Card>

      {/* Categories List Page */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Categories List Page</CardTitle>
              <CardDescription className="text-base">
                A comprehensive view for managing all your categories
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The <Link href="/categories" className="text-primary hover:underline">Categories</Link> page provides powerful tools for managing your budget categories:
          </p>

          {/* View Modes */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">View Modes</h3>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <List className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm flex-1">
                  <div className="font-medium">List View</div>
                  <div className="text-muted-foreground">Table format showing category name, type, monthly amount, current balance, spending this month, and year-to-date spending</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Grid3X3 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm flex-1">
                  <div className="font-medium">Grid View</div>
                  <div className="text-muted-foreground">Card-based layout for a visual overview of your categories</div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Search and Filters</h3>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Search className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm flex-1">
                  <div className="font-medium">Search</div>
                  <div className="text-muted-foreground">Quickly find categories by name</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Filter className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm flex-1">
                  <div className="font-medium">Status Filter</div>
                  <div className="text-muted-foreground">Filter by Active, Archived, or both</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Filter className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm flex-1">
                  <div className="font-medium">Type Filter</div>
                  <div className="text-muted-foreground">Filter by category type (Monthly Expense, Accumulation, Target Balance) when category types are enabled</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Shield className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm flex-1">
                  <div className="font-medium">Show System/Buffer</div>
                  <div className="text-muted-foreground">Toggle visibility of system categories and buffer categories</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Bulk Actions</h3>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Archive className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm flex-1">
                  <div className="font-medium">Bulk Archive/Restore</div>
                  <div className="text-muted-foreground">Select multiple categories and archive or restore them at once</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Edit3 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm flex-1">
                  <div className="font-medium">Bulk Delete</div>
                  <div className="text-muted-foreground">Select multiple categories and delete them together</div>
                </div>
              </div>
            </div>
            <Callout type="tip" title="Selection tip">
              Use Shift+Click to select multiple categories quickly. Click the "Bulk" button to enter bulk selection mode.
            </Callout>
          </div>

          {/* Reordering */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Reordering</h3>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <ArrowUpDown className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm flex-1">
                <div className="font-medium">Drag to Reorder</div>
                <div className="text-muted-foreground">Click "Reorder" to enter reorder mode, then drag categories by their grip handles to change their order. Your preferences are saved automatically.</div>
              </div>
            </div>
          </div>

          {/* Click to View Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Viewing Category Details</h3>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Eye className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm flex-1">
                <div className="font-medium">Click Category Name</div>
                <div className="text-muted-foreground">Click any category name to view its detail page with spending statistics, activity, and balance history</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Detail Page */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Category Detail Page</CardTitle>
              <CardDescription className="text-base">
                Deep dive into a single category's information and history
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click any category name from the list page to view its detail page. This page provides comprehensive information about the category:
          </p>

          <div className="grid gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm mb-2">Category Overview</div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Category name, type, and status badges (Archived, System, Buffer)</li>
                <li>Monthly amount or target (depending on category type)</li>
                <li>Current balance</li>
              </ul>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm mb-2">Spending Statistics</div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Spent this month</li>
                <li>Spent year-to-date (YTD)</li>
                <li>Transaction count for the current month</li>
                <li>Last activity date</li>
              </ul>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm mb-2">Category Notes</div>
              <p className="text-sm text-muted-foreground">Any notes you've added to the category are displayed here</p>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm mb-2">Balance History</div>
              <p className="text-sm text-muted-foreground mb-2">
                A complete audit trail showing every change to the category's balance, including:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Old balance → New balance</li>
                <li>Change amount (increase or decrease)</li>
                <li>Timestamp and user who made the change</li>
                <li>Related transaction (if applicable)</li>
                <li>Change type (transaction, manual adjustment, transfer, etc.)</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                Click on any transaction link in the history to view full transaction details. Use "Load More" to see older history entries.
              </p>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm mb-2">Quick Actions</div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Edit category details</li>
                <li>Archive or restore the category</li>
                <li>Delete the category</li>
                <li>View full category report</li>
                <li>Navigate back to categories list</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Understanding Category Fields */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Understanding Category Fields</h2>

        {/* Category Name */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Tag className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Category Name</CardTitle>
                <CardDescription className="text-base">
                  Choose clear, descriptive names that make sense to you
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm mb-2">Fixed Expenses</p>
                <p className="text-sm text-muted-foreground">Rent/Mortgage, Insurance, Loan Payments</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm mb-2">Variable Expenses</p>
                <p className="text-sm text-muted-foreground">Groceries, Gas, Utilities, Dining Out</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm mb-2">Savings</p>
                <p className="text-sm text-muted-foreground">Emergency Fund, Vacation, Down Payment</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm mb-2">Discretionary</p>
                <p className="text-sm text-muted-foreground">Entertainment, Hobbies, Clothing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Amount */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Monthly Amount</CardTitle>
                <CardDescription className="text-base">
                  How much you plan to allocate to this category each month
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This is used by the "Use Monthly Amounts" feature in Money Movement to quickly allocate your paycheck.
            </p>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[140px]">Fixed Expenses</div>
                <div className="text-sm text-muted-foreground">Use the actual amount (e.g., $1,200 for rent)</div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[140px]">Variable Expenses</div>
                <div className="text-sm text-muted-foreground">Estimate based on past spending or your goal</div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[140px]">Periodic Expenses</div>
                <div className="text-sm text-muted-foreground">Divide annual cost by 12 (e.g., $600/year car insurance = $50/month)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Balance */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Current Balance</CardTitle>
                <CardDescription className="text-base">
                  Shows how much money is currently allocated to this category
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The balance increases when you allocate money to it, and decreases when you record transactions in this category.
            </p>
            <Callout type="warning">
              A negative balance means you've spent more than you allocated - you'll need to transfer
              money from another category or allocate more in your next paycheck.
            </Callout>
          </CardContent>
        </Card>

        {/* Funded This Month */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Funded This Month</CardTitle>
                <CardDescription className="text-base">
                  Available if Monthly Funding Tracking feature is enabled
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Shows how much you've allocated to this category in the current month, separate from the current balance.
            </p>
            <p className="text-sm text-muted-foreground">
              This prevents accidentally re-funding categories for bills you've already paid.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Features */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Advanced Features</h2>

        {/* Archiving */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Archiving Categories</CardTitle>
            <CardDescription className="text-base">
              Keep history, remove clutter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Archiving is the recommended way to stop using a category going forward without losing historical data.
            </p>
            <div className="grid gap-2 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-medium">Where archived categories are hidden by default</div>
                <div className="text-muted-foreground mt-1">Dashboard category list and most category pickers</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-medium">Where archived categories still appear</div>
                <div className="text-muted-foreground mt-1">Category reports and historical transactions</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-medium">Need to use an archived category?</div>
                <div className="text-muted-foreground mt-1">
                  Some screens (like transaction edits and imports) have a “Show archived categories” toggle for edge cases (refunds, late adjustments).
                </div>
              </div>
            </div>
            <Callout type="tip" title="Best practice">
              If you find yourself repeatedly using an archived category again, restore it instead of selecting it as archived.
            </Callout>
          </CardContent>
        </Card>

        {/* Category Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Category Types</CardTitle>
            <CardDescription className="text-base">
              Available when Category Types feature is enabled in Settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h3 className="font-semibold mb-2">Monthly Expense</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  For expenses that happen every month and should be fully funded each month.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Examples:</strong> Rent, utilities, groceries
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h3 className="font-semibold mb-2">Accumulation</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  For expenses that happen periodically or goals you're saving toward. You set an annual
                  target, and the app calculates how much to save each month.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Examples:</strong> Car insurance, vacation fund, Christmas gifts
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h3 className="font-semibold mb-2">Target Balance</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  For categories where you want to maintain a specific balance. The app will suggest funding
                  to reach that target.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Examples:</strong> Emergency fund, buffer category
                </p>
              </div>
            </div>
            <Callout type="info" title="Learn more">
              See the <Link href="/help/features/advanced" className="text-primary hover:underline">Advanced Features</Link> guide
              for detailed information about category types.
            </Callout>
          </CardContent>
        </Card>

        {/* Priority System */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Priority System</CardTitle>
            <CardDescription className="text-base">
              Assign priorities to determine which categories to fund first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If enabled, you can assign a priority (1-10) to each category. This is used by Smart
              Allocation to determine which categories to fund first.
            </p>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[80px]">1-3</div>
                <div className="text-sm text-muted-foreground">
                  <strong>Essential:</strong> Rent, utilities, minimum debt payments
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[80px]">4-6</div>
                <div className="text-sm text-muted-foreground">
                  <strong>Important:</strong> Groceries, insurance, savings
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[80px]">7-10</div>
                <div className="text-sm text-muted-foreground">
                  <strong>Nice to have:</strong> Entertainment, hobbies, extra savings
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance History */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Balance History</CardTitle>
              <CardDescription className="text-base">
                Track every change to your category balances
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Every category detail page includes a complete balance history showing all changes to the category's balance over time.
          </p>

          <div className="grid gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm mb-2">What's Tracked</div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Transaction-based changes (when you record spending or income)</li>
                <li>Manual balance adjustments</li>
                <li>Money transfers between categories</li>
                <li>Allocation changes</li>
                <li>Any other balance modifications</li>
              </ul>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm mb-2">History Details</div>
              <p className="text-sm text-muted-foreground mb-2">For each change, you'll see:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>The previous balance and new balance</li>
                <li>The amount of change (with + or - indicator)</li>
                <li>When the change occurred</li>
                <li>Who made the change (in multi-user accounts)</li>
                <li>A link to the related transaction (if applicable)</li>
                <li>The type of change (transaction, adjustment, transfer, etc.)</li>
              </ul>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm mb-2">Viewing History</div>
              <p className="text-sm text-muted-foreground">
                The balance history appears at the bottom of each category's detail page. Use the "Load More" button to view older entries. 
                Click on any transaction link to see full transaction details in a popup dialog.
              </p>
            </div>
          </div>

          <Callout type="info" title="Audit Trail">
            The balance history provides a complete audit trail, making it easy to understand how your category balances changed over time and to identify any discrepancies.
          </Callout>
        </CardContent>
      </Card>

      {/* Editing and Deleting */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit3 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Editing and Deleting Categories</CardTitle>
              <CardDescription className="text-base">
                Modify or remove categories at any time
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You can edit or delete categories from both the list page and the detail page:
          </p>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[100px]">From List Page</div>
              <div className="text-sm text-muted-foreground">
                Click the "..." menu on any category row or card and select "Edit" or "Delete"
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[100px]">From Detail Page</div>
              <div className="text-sm text-muted-foreground">
                Use the "Edit", "Archive", or "Delete" buttons in the top-right corner of the detail page
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[100px]">What You Can Edit</div>
              <div className="text-sm text-muted-foreground">
                Category name, monthly amount, current balance, category type, annual target, target balance, priority, and notes
              </div>
            </div>
          </div>
          <Callout type="warning" title="Deleting categories">
            Deleting a category will remove the category assignments from all transactions in that category.
            The transactions will remain in your history but will become uncategorized. Re-categorize
            transactions before deleting if you want to preserve their category assignments. Consider archiving instead to keep history intact.
          </Callout>
        </CardContent>
      </Card>

      {/* System Categories */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">System Categories</CardTitle>
              <CardDescription className="text-base">
                Special categories created automatically by the system
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Transfer:</strong> Used for money transfers between accounts (not shown in category list)</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Income Buffer:</strong> Created when you enable the Income Buffer feature</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            System categories have special behavior and can't be deleted through the normal interface.
          </p>
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">Tips for Managing Categories</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Start broad, then get specific as needed
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Group similar expenses together (e.g., "Utilities" instead of separate electric, water, gas)
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Create categories for irregular expenses (car maintenance, gifts, etc.)
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Review and adjust monthly amounts based on actual spending
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use descriptive names that make sense to you
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">6</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Don't create too many categories - it makes budgeting harder
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/categories" />
    </div>
  );
}



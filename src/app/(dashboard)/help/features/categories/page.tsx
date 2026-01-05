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
  Archive
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

      {/* Standalone Categories Page */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Standalone Categories Page</CardTitle>
              <CardDescription className="text-base">
                A dedicated place to manage categories in detail
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You can manage categories from the dashboard, but the <Link href="/categories" className="text-primary hover:underline">Categories</Link> page provides a full management experience:
          </p>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Edit3 className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm">
                <div className="font-medium">Edit details</div>
                <div className="text-muted-foreground">Update type, targets, notes, and balances in one place</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <ArrowUpDown className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm">
                <div className="font-medium">Reorder and bulk actions</div>
                <div className="text-muted-foreground">Drag to reorder and optionally archive/delete multiple categories</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Archive className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm">
                <div className="font-medium">Archive instead of delete</div>
                <div className="text-muted-foreground">Hide old categories while keeping transaction history intact</div>
              </div>
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

      {/* Sorting and Organizing */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ArrowUpDown className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Sorting and Organizing Categories</CardTitle>
              <CardDescription className="text-base">
                Reorder your categories to match your preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StepList
            steps={[
              { title: 'Navigate to categories', content: 'Go to the Dashboard or view all categories' },
              { title: 'Click "Reorder"', content: 'Find and click the "Reorder" button' },
              { title: 'Drag to reorder', content: 'Drag categories to your desired order' },
              { title: 'Save changes', content: 'Click "Save" to keep the new order' },
            ]}
          />
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
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[80px]">Edit</div>
              <div className="text-sm text-muted-foreground">
                Click the "..." menu and select "Edit" to change name, monthly amount, type, or priority
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[80px]">Delete</div>
              <div className="text-sm text-muted-foreground">
                Click the "..." menu and select "Delete" to remove the category
              </div>
            </div>
          </div>
          <Callout type="warning" title="Deleting categories">
            Deleting a category will remove the category assignments from all transactions in that category.
            The transactions will remain in your history but will become uncategorized. Re-categorize
            transactions before deleting if you want to preserve their category assignments.
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



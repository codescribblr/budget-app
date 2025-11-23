import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';

export default function CategoriesFeaturePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Budget Categories', href: '/help/features/categories' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Budget Categories (Envelopes)</h1>
        <p className="text-lg text-muted-foreground">
          Create and manage your spending categories
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          Categories (also called envelopes) are the heart of envelope budgeting. Each category
          represents a specific purpose for your money - like groceries, rent, or savings.
        </p>

        <h2>Creating Categories</h2>
        <ol>
          <li>Go to the Dashboard</li>
          <li>In the Budget Categories card, click "Add Category"</li>
          <li>Enter a category name (e.g., "Groceries", "Rent", "Entertainment")</li>
          <li>Set a monthly amount (how much you plan to spend/save in this category each month)</li>
          <li>Optionally set category type and priority (if features are enabled)</li>
          <li>Click "Add Category"</li>
        </ol>

        <Callout type="tip" title="Start simple">
          Begin with 10-15 broad categories. You can always add more specific categories later as
          you refine your budget.
        </Callout>

        <h2>Understanding Category Fields</h2>

        <h3>Category Name</h3>
        <p>
          Choose clear, descriptive names that make sense to you. Common categories include:
        </p>
        <ul>
          <li><strong>Fixed expenses:</strong> Rent/Mortgage, Insurance, Loan Payments</li>
          <li><strong>Variable expenses:</strong> Groceries, Gas, Utilities, Dining Out</li>
          <li><strong>Savings:</strong> Emergency Fund, Vacation, Down Payment</li>
          <li><strong>Discretionary:</strong> Entertainment, Hobbies, Clothing</li>
        </ul>

        <h3>Monthly Amount</h3>
        <p>
          This is how much you plan to allocate to this category each month. It's used by the
          "Use Monthly Amounts" feature in Money Movement to quickly allocate your paycheck.
        </p>
        <p>
          <strong>For fixed expenses:</strong> Use the actual amount (e.g., $1,200 for rent)
        </p>
        <p>
          <strong>For variable expenses:</strong> Estimate based on past spending or your goal
        </p>
        <p>
          <strong>For periodic expenses:</strong> Divide the annual cost by 12 (e.g., $600/year car insurance = $50/month)
        </p>

        <h3>Current Balance</h3>
        <p>
          This shows how much money is currently allocated to this category. It increases when you
          allocate money to it, and decreases when you record transactions in this category.
        </p>
        <p>
          A negative balance means you've spent more than you allocated - you'll need to transfer
          money from another category or allocate more in your next paycheck.
        </p>

        <h3>Funded This Month (if enabled)</h3>
        <p>
          If you have the Monthly Funding Tracking feature enabled, this shows how much you've
          allocated to this category in the current month, separate from the current balance.
        </p>
        <p>
          This prevents accidentally re-funding categories for bills you've already paid.
        </p>

        <h2>Category Types (Advanced Feature)</h2>
        <p>
          If you enable the Category Types feature in Settings, you can assign a type to each category:
        </p>

        <h3>Monthly Expense</h3>
        <p>
          For expenses that happen every month and should be fully funded each month. Examples:
          rent, utilities, groceries.
        </p>

        <h3>Accumulation</h3>
        <p>
          For expenses that happen periodically or goals you're saving toward. You set an annual
          target, and the app calculates how much to save each month. Examples: car insurance,
          vacation fund, Christmas gifts.
        </p>

        <h3>Target Balance</h3>
        <p>
          For categories where you want to maintain a specific balance. The app will suggest funding
          to reach that target. Examples: emergency fund, buffer category.
        </p>

        <Callout type="info" title="Learn more">
          See the <Link href="/help/features/advanced" className="text-primary hover:underline">Advanced Features</Link> guide
          for detailed information about category types.
        </Callout>

        <h2>Priority System (Advanced Feature)</h2>
        <p>
          If enabled, you can assign a priority (1-10) to each category. This is used by Smart
          Allocation to determine which categories to fund first.
        </p>
        <ul>
          <li><strong>1-3:</strong> Essential (rent, utilities, minimum debt payments)</li>
          <li><strong>4-6:</strong> Important (groceries, insurance, savings)</li>
          <li><strong>7-10:</strong> Nice to have (entertainment, hobbies, extra savings)</li>
        </ul>

        <h2>Sorting and Organizing Categories</h2>
        <p>
          You can reorder your categories to match your preferences:
        </p>
        <ol>
          <li>Go to the Dashboard or view all categories</li>
          <li>Click "Reorder" button</li>
          <li>Drag categories to your desired order</li>
          <li>Click "Save" to keep the new order</li>
        </ol>

        <h2>Editing and Deleting Categories</h2>
        <p>
          You can edit or delete categories at any time:
        </p>
        <ul>
          <li><strong>Edit:</strong> Click the "..." menu and select "Edit" to change name, monthly amount, type, or priority</li>
          <li><strong>Delete:</strong> Click the "..." menu and select "Delete" to remove the category</li>
        </ul>

        <Callout type="warning" title="Deleting categories">
          Deleting a category will also delete all transactions in that category. Make sure to
          re-categorize or export transactions before deleting if you want to keep the history.
        </Callout>

        <h2>System Categories</h2>
        <p>
          Some categories are created automatically by the system:
        </p>
        <ul>
          <li><strong>Transfer:</strong> Used for money transfers between accounts (not shown in category list)</li>
          <li><strong>Income Buffer:</strong> Created when you enable the Income Buffer feature</li>
        </ul>
        <p>
          System categories have special behavior and can't be deleted through the normal interface.
        </p>

        <h2>Tips for Managing Categories</h2>
        <ul>
          <li>Start broad, then get specific as needed</li>
          <li>Group similar expenses together (e.g., "Utilities" instead of separate electric, water, gas)</li>
          <li>Create categories for irregular expenses (car maintenance, gifts, etc.)</li>
          <li>Review and adjust monthly amounts based on actual spending</li>
          <li>Use descriptive names that make sense to you</li>
          <li>Don't create too many categories - it makes budgeting harder</li>
        </ul>
      </div>

      <WasThisHelpful articlePath="/help/features/categories" />
    </div>
  );
}


import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';

export default function TransactionsFeaturePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Transactions', href: '/help/features/transactions' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Transactions</h1>
        <p className="text-lg text-muted-foreground">
          Record and categorize your spending and income
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          Transactions are the record of money moving in and out of your accounts. Every purchase,
          bill payment, and income deposit should be recorded as a transaction.
        </p>

        <h2>Adding a Transaction</h2>
        <ol>
          <li>Go to the <Link href="/transactions" className="text-primary hover:underline">Transactions page</Link></li>
          <li>Click "Add Transaction"</li>
          <li>Enter the transaction details:
            <ul>
              <li><strong>Date:</strong> When the transaction occurred</li>
              <li><strong>Description:</strong> What the transaction was for</li>
              <li><strong>Amount:</strong> How much (positive for expenses, negative for income/refunds)</li>
              <li><strong>Category:</strong> Which budget category this belongs to</li>
              <li><strong>Merchant:</strong> (Optional) The store or company</li>
            </ul>
          </li>
          <li>Click "Add Transaction"</li>
        </ol>

        <Callout type="tip" title="Positive vs Negative Amounts">
          <ul>
            <li><strong>Positive amounts:</strong> Money leaving your account (expenses)</li>
            <li><strong>Negative amounts:</strong> Money coming into your account (income, refunds)</li>
          </ul>
          This matches how most bank statements show transactions.
        </Callout>

        <h2>Editing Transactions</h2>
        <p>
          You can edit any transaction after it's been added:
        </p>
        <ol>
          <li>Find the transaction in the list</li>
          <li>Click on the transaction row to open the edit dialog</li>
          <li>Make your changes</li>
          <li>Click "Save"</li>
        </ol>
        <p>
          When you edit a transaction, the category balances are automatically updated to reflect
          the changes.
        </p>

        <h2>Deleting Transactions</h2>
        <p>
          To delete a transaction:
        </p>
        <ol>
          <li>Click the "..." menu on the transaction</li>
          <li>Select "Delete"</li>
          <li>Confirm the deletion</li>
        </ol>
        <p>
          Deleting a transaction will restore the money to the category balance.
        </p>

        <Callout type="warning" title="Be careful with deletions">
          Deleted transactions cannot be recovered. If you're not sure, consider editing the
          transaction instead of deleting it.
        </Callout>

        <h2>Transaction Splits</h2>
        <p>
          Sometimes a single transaction needs to be split across multiple categories. For example,
          a grocery store trip where you bought both food and household items.
        </p>
        <p>
          To split a transaction:
        </p>
        <ol>
          <li>Click on the transaction to edit it</li>
          <li>Click "Split Transaction"</li>
          <li>Enter the amount and category for each split</li>
          <li>Make sure the splits add up to the total amount</li>
          <li>Click "Save"</li>
        </ol>

        <h2>How Transactions Affect Category Balances</h2>
        <p>
          When you add a transaction:
        </p>
        <ul>
          <li>The category balance <strong>decreases</strong> by the transaction amount (for expenses)</li>
          <li>The category balance <strong>increases</strong> by the transaction amount (for income/refunds)</li>
        </ul>
        <p>
          This is separate from allocating money to categories. Allocating adds money to a category,
          transactions remove money from a category.
        </p>

        <Callout type="info" title="Example">
          <ol>
            <li>You allocate $400 to your Groceries category (balance: $400)</li>
            <li>You spend $50 at the grocery store and record a transaction (balance: $350)</li>
            <li>You spend another $75 (balance: $275)</li>
            <li>You return an item for $20 refund (balance: $295)</li>
          </ol>
        </Callout>

        <h2>Filtering and Searching</h2>
        <p>
          The Transactions page has powerful filtering options:
        </p>
        <ul>
          <li><strong>Search:</strong> Find transactions by description or merchant</li>
          <li><strong>Category filter:</strong> Show only transactions in specific categories</li>
          <li><strong>Date range:</strong> Filter by date (this month, last month, custom range)</li>
          <li><strong>Amount filter:</strong> Find transactions above or below a certain amount</li>
        </ul>

        <h2>Transaction History</h2>
        <p>
          All your transactions are stored permanently (unless you delete them). You can:
        </p>
        <ul>
          <li>View transactions from any time period</li>
          <li>Export transactions to CSV</li>
          <li>Search through your entire history</li>
          <li>Generate reports based on transaction data</li>
        </ul>

        <h2>Importing Transactions</h2>
        <p>
          Instead of manually entering every transaction, you can import them from your bank:
        </p>
        <ol>
          <li>Export transactions from your bank as a CSV file</li>
          <li>Go to the <Link href="/import" className="text-primary hover:underline">Import page</Link></li>
          <li>Upload your CSV file</li>
          <li>Map the columns to match the app's format</li>
          <li>Review and categorize the transactions</li>
          <li>Import them into your budget</li>
        </ol>
        <p>
          See the <Link href="/help/features/csv-import" className="text-primary hover:underline">CSV Import guide</Link> for
          detailed instructions.
        </p>

        <h2>Auto-Categorization</h2>
        <p>
          The app can automatically categorize transactions based on the merchant:
        </p>
        <ul>
          <li>When you categorize a transaction from a specific merchant, the app remembers it</li>
          <li>Future transactions from that merchant are automatically categorized</li>
          <li>You can set up merchant groups for more control</li>
        </ul>
        <p>
          See the <Link href="/help/features/merchants" className="text-primary hover:underline">Merchants guide</Link> for
          more information.
        </p>

        <h2>Tips for Managing Transactions</h2>
        <ul>
          <li>Record transactions as soon as possible - don't wait until the end of the month</li>
          <li>Use descriptive descriptions so you can find transactions later</li>
          <li>Categorize transactions accurately to get useful reports</li>
          <li>Review your transactions weekly to catch any errors</li>
          <li>Use the search and filter features to find specific transactions</li>
          <li>Consider importing transactions from your bank to save time</li>
        </ul>
      </div>

      <WasThisHelpful articlePath="/help/features/transactions" />
    </div>
  );
}


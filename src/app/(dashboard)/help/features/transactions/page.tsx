import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Receipt,
  Plus,
  Edit3,
  Trash2,
  Split,
  TrendingDown,
  Search,
  History,
  Upload,
  Zap,
  Lightbulb,
  GitMerge,
  Copy,
  Eye
} from 'lucide-react';

export default function TransactionsFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Transactions', href: '/help/features/transactions' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Transactions</h1>
        <p className="text-lg text-muted-foreground">
          Record and categorize your spending and income
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            Transactions are the record of money moving in and out of your accounts. Every purchase,
            bill payment, and income deposit should be recorded as a transaction.
          </p>
        </CardContent>
      </Card>

      {/* Adding a Transaction */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Adding a Transaction</CardTitle>
              <CardDescription className="text-base">
                Record a new expense or income transaction
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StepList
            steps={[
              {
                title: 'Go to Transactions page',
                content: <span>Navigate to the <Link href="/transactions" className="text-primary hover:underline">Transactions page</Link></span>
              },
              { title: 'Click "Add Transaction"', content: 'Find and click the "Add Transaction" button' },
              {
                title: 'Enter transaction details',
                content: 'Fill in the date, description, amount, category, and optionally the merchant'
              },
              { title: 'Save', content: 'Click "Add Transaction" to save the transaction' },
            ]}
          />

          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-sm font-medium mb-3">Transaction Fields</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Date:</strong> When the transaction occurred</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Description:</strong> What the transaction was for</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Amount:</strong> How much (positive for expenses, negative for income/refunds)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Category:</strong> Which budget category this belongs to</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Merchant:</strong> (Optional) The store or company</span>
              </li>
            </ul>
          </div>

          <Callout type="tip" title="Positive vs Negative Amounts">
            <ul>
              <li><strong>Positive amounts:</strong> Money leaving your account (expenses)</li>
              <li><strong>Negative amounts:</strong> Money coming into your account (income, refunds)</li>
            </ul>
            This matches how most bank statements show transactions.
          </Callout>
        </CardContent>
      </Card>

      {/* Editing Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit3 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Editing Transactions</CardTitle>
              <CardDescription className="text-base">
                Modify any transaction after it's been added
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StepList
            steps={[
              { title: 'Find the transaction', content: 'Locate the transaction in the list' },
              { title: 'Click to edit', content: 'Click on the transaction row to open the edit dialog' },
              { title: 'Make changes', content: 'Update any fields as needed' },
              { title: 'Save', content: 'Click "Save" to apply your changes' },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            When you edit a transaction, the category balances are automatically updated to reflect the changes.
          </p>
        </CardContent>
      </Card>

      {/* Deleting Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Trash2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Deleting Transactions</CardTitle>
              <CardDescription className="text-base">
                Remove transactions from your budget
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StepList
            steps={[
              { title: 'Open transaction menu', content: 'Click the "..." menu on the transaction' },
              { title: 'Select "Delete"', content: 'Choose the delete option from the menu' },
              { title: 'Confirm', content: 'Confirm the deletion when prompted' },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            Deleting a transaction will restore the money to the category balance.
          </p>
          <Callout type="warning" title="Be careful with deletions">
            Deleted transactions cannot be recovered. If you're not sure, consider editing the
            transaction instead of deleting it.
          </Callout>
        </CardContent>
      </Card>

      {/* Transaction Splits */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Split className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Transaction Splits</CardTitle>
              <CardDescription className="text-base">
                Split a single transaction across multiple categories
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sometimes a single transaction needs to be split across multiple categories. For example,
            a grocery store trip where you bought both food and household items.
          </p>
          <StepList
            steps={[
              { title: 'Open transaction', content: 'Click on the transaction to edit it' },
              { title: 'Click "Split Transaction"', content: 'Find and click the split button' },
              { title: 'Enter split details', content: 'Enter the amount and category for each split' },
              { title: 'Verify total', content: 'Make sure the splits add up to the total amount' },
              { title: 'Save', content: 'Click "Save" to apply the split' },
            ]}
          />
        </CardContent>
      </Card>

      {/* How Transactions Affect Category Balances */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingDown className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">How Transactions Affect Category Balances</CardTitle>
              <CardDescription className="text-base">
                Understanding the relationship between transactions and category balances
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">When you add a transaction:</p>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[100px]">Expenses</div>
              <div className="text-sm text-muted-foreground">
                The category balance <strong>decreases</strong> by the transaction amount
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[100px]">Income/Refunds</div>
              <div className="text-sm text-muted-foreground">
                The category balance <strong>increases</strong> by the transaction amount
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
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
        </CardContent>
      </Card>

      {/* Filtering and Searching */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Filtering and Searching</CardTitle>
              <CardDescription className="text-base">
                Powerful tools to find specific transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Search:</strong> Find transactions by description or merchant</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Category filter:</strong> Show only transactions in specific categories</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Date range:</strong> Filter by date (this month, last month, custom range)</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Amount filter:</strong> Find transactions above or below a certain amount</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Transaction History</CardTitle>
              <CardDescription className="text-base">
                All your transactions are stored permanently
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>View transactions from any time period</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Export transactions to CSV</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Search through your entire history</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Generate reports based on transaction data</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Viewing Transaction Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Eye className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Viewing Transaction Details</CardTitle>
              <CardDescription className="text-base">
                See complete information about any transaction including import metadata
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StepList
            steps={[
              { title: 'Find the transaction', content: 'Locate the transaction in the list' },
              { title: 'Click on the row', content: 'Click anywhere on the transaction row to open the detail dialog' },
              { title: 'Review details', content: 'View all transaction information, category splits, and import metadata' },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            The transaction detail dialog shows:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground ml-4">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Complete transaction information (date, description, amount, type, merchant, account)</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>All category splits with amounts</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Import metadata (if imported): original CSV row data, source filename, suggested categories</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Creation and update timestamps</span>
            </li>
          </ul>
          <Callout type="tip" title="Import Metadata">
            For imported transactions, you can see the original CSV row data, which includes all columns
            from your bank export. This is helpful when reviewing duplicates or understanding where
            transaction data came from.
          </Callout>
        </CardContent>
      </Card>

      {/* Finding and Managing Duplicates */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Copy className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Finding and Managing Duplicate Transactions</CardTitle>
              <CardDescription className="text-base">
                Identify and merge duplicate transactions to keep your budget clean
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StepList
            steps={[
              {
                title: 'Go to Transactions page',
                content: <span>Navigate to the <Link href="/transactions" className="text-primary hover:underline">Transactions page</Link></span>
              },
              {
                title: 'Click "Find Duplicates"',
                content: 'Click the "Find Duplicates" button in the page header'
              },
              {
                title: 'Review duplicate groups',
                content: 'The app will show groups of transactions that appear to be duplicates based on amount, date, and description'
              },
              {
                title: 'Select transactions',
                content: 'Select individual transactions or use the group checkbox to select all transactions in a group'
              },
              {
                title: 'Take action',
                content: 'Merge selected transactions or mark them as "Not Duplicates" if they\'re not actually duplicates'
              },
            ]}
          />
          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-sm font-medium mb-3">Duplicate Detection</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Transactions are grouped as duplicates if they have the same amount and date (within ±1 day)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>The app checks both exact matches and similar descriptions</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Groups marked as "Not Duplicates" won't appear again unless new matching transactions are added</span>
              </li>
            </ul>
          </div>
          <Callout type="info" title="Click to View Details">
            Click on any transaction row to see full details including import metadata. This helps
            you determine if transactions are truly duplicates or just similar.
          </Callout>
        </CardContent>
      </Card>

      {/* Merging Duplicate Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GitMerge className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Merging Duplicate Transactions</CardTitle>
              <CardDescription className="text-base">
                Combine duplicate transactions while choosing which data to keep
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            When you find duplicate transactions, you can merge them instead of deleting them. This
            allows you to combine the best information from each transaction.
          </p>
          <StepList
            steps={[
              {
                title: 'Select transactions to merge',
                content: 'Select at least 2 transactions in a duplicate group (use checkboxes)'
              },
              {
                title: 'Click "Merge Selected"',
                content: 'The merge dialog will open showing all selected transactions'
              },
              {
                title: 'Review quick merge preview',
                content: 'The app suggests the best values for each field based on smart defaults'
              },
              {
                title: 'Customize if needed',
                content: 'Click "Customize Merge" to choose specific values for date, description, merchant, category, and historical status'
              },
              {
                title: 'Combine category splits',
                content: 'If transactions have different categories, you can combine them into a single merged transaction'
              },
              {
                title: 'Confirm merge',
                content: 'Review the preview and click "Merge Transactions" to complete the merge'
              },
            ]}
          />
          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-sm font-medium mb-3">What Gets Merged</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Date:</strong> Choose which transaction's date to keep</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Description:</strong> Select the most descriptive description</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Merchant:</strong> Choose which merchant group to use</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Categories:</strong> Combine splits from all transactions</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Historical Status:</strong> Choose whether the merged transaction affects category balances</span>
              </li>
            </ul>
          </div>
          <Callout type="warning" title="Category Balance Updates">
            When merging transactions, the app automatically reverses the balance changes from the
            original transactions and applies the correct changes for the merged transaction. If
            you mark the merged transaction as historical, it won't affect category balances.
          </Callout>
          <Callout type="info" title="Import Metadata Preserved">
            All import metadata (original CSV row data, source filename) from merged transactions
            is preserved and linked to the merged transaction. This ensures duplicate detection
            continues to work correctly.
          </Callout>
        </CardContent>
      </Card>

      {/* Importing Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Importing Transactions</CardTitle>
              <CardDescription className="text-base">
                Import transactions from your bank instead of manual entry
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StepList
            steps={[
              { title: 'Export from bank', content: 'Export transactions from your bank as a CSV file' },
              {
                title: 'Go to Import page',
                content: <span>Navigate to the <Link href="/import" className="text-primary hover:underline">Import page</Link></span>
              },
              { title: 'Upload CSV', content: 'Upload your CSV file' },
              { title: 'Map columns', content: 'Map the columns to match the app\'s format' },
              { title: 'Review and categorize', content: 'Review and categorize the transactions' },
              { title: 'Import', content: 'Import them into your budget' },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            See the <Link href="/help/tutorials/importing" className="text-primary hover:underline">Importing Transactions tutorial</Link> for
            detailed instructions.
          </p>
          <Callout type="info" title="Duplicate Detection During Import">
            The app automatically detects duplicates during import by comparing transaction hashes.
            If a transaction has been imported before (or manually entered), it will be marked as
            a duplicate. You can review and merge duplicates later using the "Find Duplicates" feature.
          </Callout>
        </CardContent>
      </Card>

      {/* Auto-Categorization */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Auto-Categorization</CardTitle>
              <CardDescription className="text-base">
                Automatically categorize transactions based on merchant
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>When you categorize a transaction from a specific merchant, the app remembers it</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Future transactions from that merchant are automatically categorized</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>You can set up merchant groups for more control</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            See the <Link href="/help/features/merchants" className="text-primary hover:underline">Merchants guide</Link> for
            more information.
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
              <CardTitle className="text-xl">Tips for Managing Transactions</CardTitle>
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
                Record transactions as soon as possible - don't wait until the end of the month
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use descriptive descriptions so you can find transactions later
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Categorize transactions accurately to get useful reports
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Review your transactions weekly to catch any errors
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use the search and filter features to find specific transactions
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">6</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Consider importing transactions from your bank to save time
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/transactions" />
    </div>
  );
}



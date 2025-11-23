import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';

export default function MerchantsFeaturePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Merchants & Auto-Categorization', href: '/help/features/merchants' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Merchants & Auto-Categorization</h1>
        <p className="text-lg text-muted-foreground">
          Automatically categorize transactions based on merchant
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          The merchant system helps you automatically categorize transactions based on where you
          spent money. Once set up, it can save you hours of manual categorization!
        </p>

        <h2>How Auto-Categorization Works</h2>
        <p>
          When you categorize a transaction, the app remembers the merchant and category. Future
          transactions from that merchant are automatically categorized the same way.
        </p>

        <h3>Example</h3>
        <ol>
          <li>You import a transaction from "Safeway #1234" and categorize it as "Groceries"</li>
          <li>Next month, you import another transaction from "Safeway #5678"</li>
          <li>The app recognizes "Safeway" and automatically categorizes it as "Groceries"</li>
        </ol>

        <h2>Merchant Groups</h2>
        <p>
          Merchant groups solve the problem of merchants appearing with different names. For example:
        </p>
        <ul>
          <li>"Safeway #1234"</li>
          <li>"Safeway #5678"</li>
          <li>"SAFEWAY STORE 1234"</li>
          <li>"Safeway Online"</li>
        </ul>
        <p>
          These are all the same merchant (Safeway), but they appear differently in your bank
          statement. Merchant groups let you group them together.
        </p>

        <h3>Creating a Merchant Group</h3>
        <ol>
          <li>Go to the <Link href="/merchants" className="text-primary hover:underline">Merchants page</Link></li>
          <li>Click "Create Merchant Group"</li>
          <li>Enter a group name (e.g., "Safeway")</li>
          <li>Select a default category (e.g., "Groceries")</li>
          <li>Click "Create"</li>
        </ol>

        <h3>Adding Merchants to a Group</h3>
        <p>
          Once you've created a group, you need to add merchant names to it:
        </p>
        <ol>
          <li>Click on a merchant group to view details</li>
          <li>Click "Add Merchant Mapping"</li>
          <li>Enter the merchant name as it appears in your transactions (e.g., "Safeway #1234")</li>
          <li>Click "Add"</li>
          <li>Repeat for all variations of this merchant</li>
        </ol>

        <Callout type="tip" title="Use wildcards">
          You can use wildcards in merchant mappings. For example, "Safeway*" will match any
          merchant name starting with "Safeway". This saves you from adding every store number!
        </Callout>

        <h2>Auto-Grouping</h2>
        <p>
          The app can automatically create merchant groups based on your transaction history:
        </p>
        <ol>
          <li>Go to the <Link href="/merchants" className="text-primary hover:underline">Merchants page</Link></li>
          <li>Click "Auto-Group Merchants"</li>
          <li>The app will analyze your transactions and suggest merchant groups</li>
          <li>Review the suggestions and approve the ones you want</li>
        </ol>
        <p>
          This is a huge time-saver when you're first setting up the merchant system!
        </p>

        <h2>Backfilling Categories</h2>
        <p>
          After setting up merchant groups, you can backfill categories for existing transactions:
        </p>
        <ol>
          <li>Go to the <Link href="/merchants" className="text-primary hover:underline">Merchants page</Link></li>
          <li>Click "Backfill Categories"</li>
          <li>The app will re-categorize all uncategorized transactions based on merchant groups</li>
        </ol>
        <p>
          This is useful if you imported transactions before setting up merchant groups.
        </p>

        <h2>Merchant Statistics</h2>
        <p>
          The Merchants page shows statistics for each merchant group:
        </p>
        <ul>
          <li><strong>Transaction count:</strong> How many transactions from this merchant</li>
          <li><strong>Total spent:</strong> How much you've spent at this merchant</li>
          <li><strong>Average transaction:</strong> Typical transaction amount</li>
          <li><strong>Most common category:</strong> Which category you use most for this merchant</li>
        </ul>
        <p>
          This helps you understand your spending patterns and verify that merchant groups are
          set up correctly.
        </p>

        <h2>Editing and Deleting Merchant Groups</h2>
        <p>
          You can edit or delete merchant groups at any time:
        </p>
        <ul>
          <li><strong>Edit:</strong> Click on a merchant group to view details, then click "Edit"
            to change the name or default category</li>
          <li><strong>Delete:</strong> Click the "..." menu and select "Delete" to remove the group</li>
        </ul>

        <Callout type="warning" title="Deleting merchant groups">
          Deleting a merchant group doesn't delete transactions or change their categories. It
          just removes the auto-categorization rule for future transactions.
        </Callout>

        <h2>Best Practices</h2>

        <h3>Start with Common Merchants</h3>
        <p>
          Focus on merchants you visit frequently:
        </p>
        <ul>
          <li>Grocery stores</li>
          <li>Gas stations</li>
          <li>Restaurants you visit regularly</li>
          <li>Utility companies</li>
          <li>Subscription services</li>
        </ul>

        <h3>Use Descriptive Group Names</h3>
        <p>
          Use the merchant's common name, not the exact text from your bank statement:
        </p>
        <ul>
          <li>Good: "Safeway"</li>
          <li>Less good: "SAFEWAY STORE 1234"</li>
        </ul>

        <h3>Review Auto-Categorization</h3>
        <p>
          Periodically review auto-categorized transactions to make sure they're correct. If you
          find errors, adjust the merchant group's default category.
        </p>

        <h3>Handle Split Merchants</h3>
        <p>
          Some merchants sell items in multiple categories (e.g., Target sells groceries, clothing,
          and household items). You have two options:
        </p>
        <ol>
          <li><strong>Choose the most common category:</strong> Set the default to the category you
            use most often, then manually adjust exceptions</li>
          <li><strong>Don't auto-categorize:</strong> Leave these merchants without a group and
            categorize each transaction manually</li>
        </ol>

        <h2>Tips for Success</h2>
        <ul>
          <li>Set up merchant groups before importing large batches of transactions</li>
          <li>Use the auto-grouping feature to get started quickly</li>
          <li>Add new merchants as you encounter them</li>
          <li>Use wildcards to match multiple store locations</li>
          <li>Review merchant statistics to find patterns in your spending</li>
          <li>Update default categories if your spending habits change</li>
          <li>Don't try to create groups for every merchant - focus on frequent ones</li>
        </ul>

        <Callout type="tip" title="The 80/20 rule">
          You probably spend 80% of your money at 20% of merchants. Focus on setting up groups
          for those frequent merchants, and you'll auto-categorize most of your transactions!
        </Callout>
      </div>

      <WasThisHelpful articlePath="/help/features/merchants" />
    </div>
  );
}


import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { FAQItem } from '@/components/help/FAQItem';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import Link from 'next/link';

export default function GeneralFAQPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'FAQ', href: '/help/faq/general' },
          { label: 'General Questions', href: '/help/faq/general' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">General Questions</h1>
        <p className="text-lg text-muted-foreground">
          Common questions about the app and envelope budgeting
        </p>
      </div>

      <div className="space-y-3">
        <FAQItem
          question="What is envelope budgeting?"
          answer={
            <>
              <p>
                Envelope budgeting is a cash management system where you divide your money into categories
                (envelopes) based on how you plan to spend it. Each envelope represents a specific purpose,
                like groceries, rent, or entertainment.
              </p>
              <p className="mt-2">
                The key principle: <strong>Every dollar has a job.</strong> When you get paid, you assign
                every dollar to a specific envelope. When you need to spend money, you take it from the
                appropriate envelope.
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
          question="Is my data secure?"
          answer={
            <>
              <p>
                Yes! Your data is stored securely using industry-standard encryption. We use Supabase for
                our database, which provides:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>End-to-end encryption for data in transit</li>
                <li>Encrypted storage for data at rest</li>
                <li>Row-level security to ensure you can only access your own data</li>
                <li>Regular security audits and updates</li>
              </ul>
              <p className="mt-2">
                We never share your financial data with third parties, and we don't have access to your
                actual bank accounts - you manually enter or import your transaction data.
              </p>
            </>
          }
        />

        <FAQItem
          question="Can I use this on mobile?"
          answer={
            <>
              <p>
                Yes! The app is fully responsive and works great on mobile browsers. Simply visit the app
                in your mobile browser (Safari, Chrome, etc.) and you'll get a mobile-optimized experience.
              </p>
              <p className="mt-2">
                We don't currently have a native mobile app, but the web app is designed to work seamlessly
                on phones and tablets.
              </p>
            </>
          }
        />

        <FAQItem
          question="How do I export my data?"
          answer={
            <>
              <p>
                You can export your data using the Backup feature:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>
                  Go to <Link href="/settings/backup" className="text-primary hover:underline">Settings → Backup & Restore</Link>
                </li>
                <li>Click "Create Backup"</li>
                <li>Your data will be downloaded as a JSON file</li>
              </ol>
              <p className="mt-2">
                This backup includes all your accounts, categories, transactions, goals, and settings.
                You can use it to restore your data later or transfer it to another account.
              </p>
            </>
          }
        />

        <FAQItem
          question="Can I share my budget with someone?"
          answer={
            <>
              <p>
                Currently, the app is designed for individual use - each account is private and can only
                be accessed by the account owner.
              </p>
              <p className="mt-2">
                However, you can export your data and share the backup file with someone else, who can then
                import it into their own account. Note that this creates a copy of the data, not a shared
                budget.
              </p>
              <p className="mt-2">
                Multi-user budgets and budget sharing are on our roadmap for future development!
              </p>
            </>
          }
        />

        <FAQItem
          question="How much does this cost?"
          answer={
            <>
              <p>
                This app is currently free to use! We're in active development and focused on building
                the best budgeting experience possible.
              </p>
              <p className="mt-2">
                In the future, we may introduce premium features or a subscription model, but the core
                budgeting functionality will always remain free.
              </p>
            </>
          }
        />

        <FAQItem
          question="What browsers are supported?"
          answer={
            <>
              <p>
                The app works best on modern browsers:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Chrome/Edge:</strong> Version 90 or later</li>
                <li><strong>Firefox:</strong> Version 88 or later</li>
                <li><strong>Safari:</strong> Version 14 or later</li>
              </ul>
              <p className="mt-2">
                We recommend keeping your browser up to date for the best experience and security.
              </p>
            </>
          }
        />
      </div>

      <WasThisHelpful articlePath="/help/faq/general" />
    </div>
  );
}


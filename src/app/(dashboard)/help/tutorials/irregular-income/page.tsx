import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { StepList } from '@/components/help/StepList';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { ComparisonTable } from '@/components/help/ComparisonTable';
import { VisualChecklist } from '@/components/help/VisualChecklist';
import { ExampleBox, ExampleSteps, ExampleResults } from '@/components/help/ExampleBox';
import Link from 'next/link';

export default function IrregularIncomeTutorialPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Tutorials', href: '/help' },
          { label: 'Irregular Income', href: '/help/tutorials/irregular-income' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Tutorial: Managing Irregular Income</h1>
        <p className="text-lg text-muted-foreground">
          How to budget when your income varies month to month
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          Budgeting with irregular income (freelance, commission, seasonal work) is challenging
          but absolutely possible. This tutorial shows you three proven approaches.
        </p>

        <Callout type="info" title="Who this is for">
          This tutorial is for freelancers, contractors, commission-based workers, seasonal
          employees, or anyone whose income varies significantly month to month.
        </Callout>

        <h2>The Challenge</h2>
        <p>
          Traditional budgeting assumes you know how much money you'll make each month. With
          irregular income, you might make $5,000 one month and $2,000 the next. This makes it
          hard to plan.
        </p>

        <h2>Approach 1: The Income Buffer Method (Recommended)</h2>
        <p>
          This is the most effective approach for irregular income. You build up a buffer of
          money and live on last month's income.
        </p>

        <StepList
          steps={[
            {
              title: 'Build Your Buffer',
              content: (
                <>
                  <p>First, save up 1-2 months of expenses:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Calculate your average monthly expenses</li>
                    <li>Create an "Income Buffer" category</li>
                    <li>In high-income months, add extra money to this category</li>
                    <li>Keep building until you have 1-2 months of expenses saved</li>
                  </ol>
                  <Callout type="tip" title="How long will this take?">
                    If you can save $500/month, it might take 4-6 months to build a one-month
                    buffer. Be patient!
                  </Callout>
                </>
              ),
            },
            {
              title: 'Enable Income Buffer Feature',
              content: (
                <>
                  <p>Once your buffer is built:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to Settings</li>
                    <li>Enable "Income Buffer" feature</li>
                    <li>Transfer your buffer amount to the Income Buffer</li>
                  </ol>
                  <p className="mt-2">
                    See the{' '}
                    <Link href="/help/features/income-buffer" className="text-primary hover:underline">
                      Income Buffer guide
                    </Link>{' '}
                    for detailed instructions.
                  </p>
                </>
              ),
            },
            {
              title: 'Use the Buffer',
              content: (
                <>
                  <p>Now you can budget predictably:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>At the start of each month, fund your budget from the buffer</li>
                    <li>When income arrives during the month, add it to the buffer</li>
                    <li>The buffer smooths out the income fluctuations</li>
                    <li>You're now living on last month's income!</li>
                  </ol>
                  <Callout type="info" title="Benefits">
                    With a buffer, you can budget for the entire month at once, regardless of
                    when income arrives. This eliminates the stress of irregular income!
                  </Callout>
                </>
              ),
            },
          ]}
        />

        <h2>Approach 2: Conservative Budgeting</h2>
        <p>
          If you're not ready to build a buffer, you can budget based on your lowest expected
          income.
        </p>

        <StepList
          steps={[
            {
              title: 'Analyze Your Income History',
              content: (
                <p>Look at your income for the past 6-12 months and find your lowest month (or average of the lowest 3 months).</p>
              ),
            },
            {
              title: 'Set Your Budget Amount',
              content: (
                <p>Budget based on this conservative amount. This ensures you can always cover your expenses.</p>
              ),
            },
            {
              title: 'Save the Surplus',
              content: (
                <p>In higher-income months, save the extra money. In lower-income months, use these savings to cover the gap.</p>
              ),
            },
          ]}
        />

        <ExampleBox
          title="Conservative Budgeting Example"
          persona="6-month income history: $4,000, $2,500, $5,500, $3,000, $2,000, $4,500"
        >
          <div className="grid grid-cols-2 gap-4 p-4 bg-background rounded-lg border">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Lowest Month</div>
              <div className="font-semibold">$2,000</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Budget Based On</div>
              <div className="font-semibold">$2,000-2,500/month</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Average Income</div>
              <div className="font-semibold">$3,583/month</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Average Surplus</div>
              <div className="font-semibold text-green-600 dark:text-green-400">$1,083-1,583/month</div>
            </div>
          </div>
        </ExampleBox>

        <Callout type="tip" title="Build toward a buffer">
          Use the surplus from high-income months to build an income buffer. Once you have it,
          switch to Approach 1!
        </Callout>

        <h2>Approach 3: Priority-Based Budgeting</h2>
        <p>
          This approach works well if your income is very unpredictable and you can't build a
          buffer yet.
        </p>

        <StepList
          steps={[
            {
              title: 'List and Rank Your Expenses',
              content: (
                <p>List all your expenses and rank them by priority (1 = most important). Create categories for each priority level.</p>
              ),
            },
            {
              title: 'Allocate by Priority',
              content: (
                <p>When income arrives, allocate to Priority 1 categories first. If there's money left, move to Priority 2, and so on.</p>
              ),
            },
            {
              title: 'Adjust Each Month',
              content: (
                <p>In low-income months, you might only fund Priority 1 and 2. In high-income months, you can fund everything plus savings.</p>
              ),
            },
          ]}
        />

        <div className="my-6 grid gap-4">
          <div className="rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">1</span>
              Priority 1: Essential
            </div>
            <div className="text-sm text-muted-foreground">Rent, utilities, minimum food, insurance</div>
          </div>
          <div className="rounded-lg border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-4">
            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-white text-xs font-bold">2</span>
              Priority 2: Important
            </div>
            <div className="text-sm text-muted-foreground">Debt payments, transportation, phone</div>
          </div>
          <div className="rounded-lg border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 p-4">
            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-600 text-white text-xs font-bold">3</span>
              Priority 3: Nice to Have
            </div>
            <div className="text-sm text-muted-foreground">Dining out, entertainment, subscriptions</div>
          </div>
          <div className="rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-4">
            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold">4</span>
              Priority 4: Savings
            </div>
            <div className="text-sm text-muted-foreground">Emergency fund, goals, extra debt payments</div>
          </div>
        </div>

        <Callout type="warning" title="This is temporary">
          Priority-based budgeting is stressful because you never know what you can afford. Use
          it as a stepping stone while you build a buffer!
        </Callout>

        <h2>Tips for All Approaches</h2>

        <div className="grid md:grid-cols-2 gap-4 my-6">
          <VisualChecklist
            title="Track Your Income Patterns"
            items={[
              { text: 'Keep a record of monthly income for at least 6 months' },
              { text: 'Look for seasonal patterns (busy months vs slow months)' },
              { text: 'Use this data to predict future income' },
            ]}
            variant="compact"
          />

          <VisualChecklist
            title="Build Multiple Buffers"
            items={[
              { text: 'Income buffer', subtext: '1-2 months of expenses' },
              { text: 'Emergency fund', subtext: '3-6 months of expenses' },
              { text: 'Tax savings', subtext: 'If self-employed, save 25-30%' },
            ]}
            variant="compact"
          />

          <VisualChecklist
            title="Plan for Slow Months"
            items={[
              { text: 'Save extra beforehand if you know certain months are slow' },
              { text: 'Reduce discretionary spending in slow months' },
              { text: 'Have a plan for what to cut if income is very low' },
            ]}
            variant="compact"
          />

          <VisualChecklist
            title="Celebrate High-Income Months"
            items={[
              { text: 'Save most of the extra when you have a great month' },
              { text: 'Reward yourself a little - you earned it!' },
              { text: 'Use windfalls to accelerate buffer building' },
            ]}
            variant="compact"
          />
        </div>

        <h2>Common Mistakes to Avoid</h2>

        <div className="grid md:grid-cols-2 gap-4 my-6">
          <div className="rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
            <h3 className="font-semibold mb-2">❌ Lifestyle Inflation</h3>
            <p className="text-sm text-muted-foreground">
              Don't increase your spending just because you had a good month. Save the extra to
              cover slow months.
            </p>
          </div>

          <div className="rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
            <h3 className="font-semibold mb-2">❌ Ignoring Taxes</h3>
            <p className="text-sm text-muted-foreground">
              If you're self-employed, set aside money for taxes immediately. Don't wait until tax
              season!
            </p>
          </div>

          <div className="rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
            <h3 className="font-semibold mb-2">❌ Not Tracking Income</h3>
            <p className="text-sm text-muted-foreground">
              Keep detailed records of all income. You need this data to budget effectively and for
              tax purposes.
            </p>
          </div>

          <div className="rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
            <h3 className="font-semibold mb-2">❌ Giving Up Too Soon</h3>
            <p className="text-sm text-muted-foreground">
              Budgeting with irregular income is hard at first. Give it 3-4 months before deciding
              if an approach works for you.
            </p>
          </div>
        </div>

        <h2>Real-World Example</h2>

        <ExampleBox
          title="Sarah's Success Story"
          persona="Freelance graphic designer"
          situation="Income varies from $2,000 to $6,000 per month"
          variant="success"
        >
          <ExampleSteps
            title="What She Did"
            steps={[
              'Tracked income for 6 months: average was $3,800/month',
              'Started budgeting based on $3,000/month (conservative)',
              'Saved surplus from good months in an "Income Buffer" category',
              'After 5 months, had $3,000 saved (one month of expenses)',
              'Enabled Income Buffer feature and switched to living on last month\'s income',
              'Now budgets confidently at the start of each month',
            ]}
          />

          <ExampleResults
            title="Results"
            results={[
              'Reduced financial stress significantly',
              'Can plan for the entire month without worrying about when clients pay',
              'Built emergency fund to 3 months of expenses',
              'Feels in control of her finances for the first time',
            ]}
          />
        </ExampleBox>

        <h2>Next Steps</h2>
        <p>Choose your approach and get started:</p>
        <ul>
          <li>
            <strong>Ready to build a buffer?</strong> Use the{' '}
            <Link href="/help/wizards/income-buffer" className="text-primary hover:underline">
              Income Buffer Wizard
            </Link>
          </li>
          <li>
            <strong>Want to learn more?</strong> Read the{' '}
            <Link href="/help/features/income-buffer" className="text-primary hover:underline">
              Income Buffer guide
            </Link>
          </li>
          <li>
            <strong>Have questions?</strong> Check the{' '}
            <Link href="/help/faq/advanced" className="text-primary hover:underline">
              Advanced Features FAQ
            </Link>
          </li>
        </ul>

        <Callout type="tip" title="You can do this!">
          Thousands of people successfully budget with irregular income. It takes more planning
          than a regular paycheck, but the peace of mind is worth it!
        </Callout>
      </div>

      <WasThisHelpful articlePath="/help/tutorials/irregular-income" />
    </div>
  );
}



import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { StepList } from '@/components/help/StepList';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
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

        <h3>How It Works</h3>
        <ol>
          <li>Look at your income for the past 6-12 months</li>
          <li>Find your lowest month (or average of the lowest 3 months)</li>
          <li>Budget based on this conservative amount</li>
          <li>In higher-income months, save the extra</li>
          <li>In lower-income months, use the savings</li>
        </ol>

        <h3>Example</h3>
        <p>
          If your income over 6 months was: $4,000, $2,500, $5,500, $3,000, $2,000, $4,500
        </p>
        <ul>
          <li>Lowest month: $2,000</li>
          <li>Budget based on: $2,000-2,500/month</li>
          <li>Average income: $3,583/month</li>
          <li>Average surplus: $1,083-1,583/month to save</li>
        </ul>

        <Callout type="tip" title="Build toward a buffer">
          Use the surplus from high-income months to build an income buffer. Once you have it,
          switch to Approach 1!
        </Callout>

        <h2>Approach 3: Priority-Based Budgeting</h2>
        <p>
          This approach works well if your income is very unpredictable and you can't build a
          buffer yet.
        </p>

        <h3>Setup</h3>
        <ol>
          <li>List all your expenses</li>
          <li>Rank them by priority (1 = most important)</li>
          <li>Create categories for each priority level</li>
        </ol>

        <h3>Priority Levels</h3>
        <ul>
          <li>
            <strong>Priority 1 (Essential):</strong> Rent, utilities, minimum food, insurance
          </li>
          <li>
            <strong>Priority 2 (Important):</strong> Debt payments, transportation, phone
          </li>
          <li>
            <strong>Priority 3 (Nice to have):</strong> Dining out, entertainment, subscriptions
          </li>
          <li>
            <strong>Priority 4 (Savings):</strong> Emergency fund, goals, extra debt payments
          </li>
        </ul>

        <h3>How to Use It</h3>
        <ol>
          <li>When income arrives, allocate to Priority 1 categories first</li>
          <li>If there's money left, allocate to Priority 2</li>
          <li>Continue down the priority list until money runs out</li>
          <li>In low-income months, you might only fund Priority 1 and 2</li>
          <li>In high-income months, you can fund everything plus savings</li>
        </ol>

        <Callout type="warning" title="This is temporary">
          Priority-based budgeting is stressful because you never know what you can afford. Use
          it as a stepping stone while you build a buffer!
        </Callout>

        <h2>Tips for All Approaches</h2>

        <h3>Track Your Income Patterns</h3>
        <ul>
          <li>Keep a record of monthly income for at least 6 months</li>
          <li>Look for seasonal patterns (busy months vs slow months)</li>
          <li>Use this data to predict future income</li>
        </ul>

        <h3>Build Multiple Buffers</h3>
        <ul>
          <li>Income buffer (1-2 months of expenses)</li>
          <li>Emergency fund (3-6 months of expenses)</li>
          <li>Tax savings (if self-employed, save 25-30% for taxes)</li>
        </ul>

        <h3>Plan for Slow Months</h3>
        <ul>
          <li>If you know certain months are slow, save extra beforehand</li>
          <li>Reduce discretionary spending in slow months</li>
          <li>Have a plan for what to cut if income is very low</li>
        </ul>

        <h3>Celebrate High-Income Months</h3>
        <ul>
          <li>When you have a great month, save most of the extra</li>
          <li>But also reward yourself a little - you earned it!</li>
          <li>Use windfalls to accelerate buffer building</li>
        </ul>

        <h2>Common Mistakes to Avoid</h2>

        <h3>Lifestyle Inflation</h3>
        <p>
          Don't increase your spending just because you had a good month. Save the extra to
          cover slow months.
        </p>

        <h3>Ignoring Taxes</h3>
        <p>
          If you're self-employed, set aside money for taxes immediately. Don't wait until tax
          season!
        </p>

        <h3>Not Tracking Income</h3>
        <p>
          Keep detailed records of all income. You need this data to budget effectively and for
          tax purposes.
        </p>

        <h3>Giving Up Too Soon</h3>
        <p>
          Budgeting with irregular income is hard at first. Give it 3-4 months before deciding
          if an approach works for you.
        </p>

        <h2>Real-World Example</h2>
        <p>
          <strong>Sarah is a freelance graphic designer.</strong> Her income varies from $2,000
          to $6,000 per month.
        </p>

        <h3>What She Did</h3>
        <ol>
          <li>Tracked income for 6 months: average was $3,800/month</li>
          <li>Started budgeting based on $3,000/month (conservative)</li>
          <li>Saved surplus from good months in an "Income Buffer" category</li>
          <li>After 5 months, had $3,000 saved (one month of expenses)</li>
          <li>Enabled Income Buffer feature and switched to living on last month's income</li>
          <li>Now budgets confidently at the start of each month</li>
        </ol>

        <h3>Results</h3>
        <ul>
          <li>Reduced financial stress significantly</li>
          <li>Can plan for the entire month without worrying about when clients pay</li>
          <li>Built emergency fund to 3 months of expenses</li>
          <li>Feels in control of her finances for the first time</li>
        </ul>

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


import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';

export default function ReportsFeaturePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Reports & Analytics', href: '/help/features/reports' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
        <p className="text-lg text-muted-foreground">
          Analyze your spending patterns and track trends over time
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          The Reports feature helps you understand where your money goes and how your spending
          changes over time. Use it to find opportunities to save and track your progress.
        </p>

        <h2>Accessing Reports</h2>
        <p>
          There are two main reports pages:
        </p>
        <ul>
          <li><strong><Link href="/reports" className="text-primary hover:underline">Spending by Category</Link>:</strong> See
            how much you spent in each category for a specific time period</li>
          <li><strong><Link href="/reports/trends" className="text-primary hover:underline">Spending Trends</Link>:</strong> Track
            how your spending changes over time</li>
        </ul>

        <h2>Spending by Category Report</h2>
        <p>
          This report shows your spending broken down by category for a selected time period.
        </p>

        <h3>Features</h3>
        <ul>
          <li><strong>Pie chart:</strong> Visual breakdown of spending by category</li>
          <li><strong>Category list:</strong> Detailed list with amounts and percentages</li>
          <li><strong>Total spending:</strong> Sum of all expenses for the period</li>
          <li><strong>Date range selector:</strong> Choose the time period to analyze</li>
        </ul>

        <h3>How to Use It</h3>
        <ol>
          <li>Go to the <Link href="/reports" className="text-primary hover:underline">Reports page</Link></li>
          <li>Select a date range (this month, last month, last 3 months, custom range)</li>
          <li>Review the pie chart to see your spending distribution</li>
          <li>Click on a category to see all transactions in that category</li>
          <li>Look for categories where you're spending more than expected</li>
        </ol>

        <Callout type="tip" title="Find savings opportunities">
          Look for categories that are larger than you expected. These are often the best places
          to find savings opportunities!
        </Callout>

        <h3>What to Look For</h3>
        <ul>
          <li><strong>Largest categories:</strong> Where most of your money goes</li>
          <li><strong>Unexpected spending:</strong> Categories that are higher than you thought</li>
          <li><strong>Discretionary spending:</strong> Areas where you could cut back if needed</li>
          <li><strong>Fixed vs. variable:</strong> Which expenses are consistent vs. fluctuating</li>
        </ul>

        <h2>Spending Trends Report</h2>
        <p>
          This report shows how your spending changes over time, helping you identify patterns
          and trends.
        </p>

        <h3>Features</h3>
        <ul>
          <li><strong>Line chart:</strong> Shows spending over time (by month or week)</li>
          <li><strong>Category comparison:</strong> Compare multiple categories side-by-side</li>
          <li><strong>Total spending trend:</strong> See if your overall spending is increasing or decreasing</li>
          <li><strong>Date range selector:</strong> Choose how far back to look</li>
        </ul>

        <h3>How to Use It</h3>
        <ol>
          <li>Go to the <Link href="/reports/trends" className="text-primary hover:underline">Trends page</Link></li>
          <li>Select a date range (last 3 months, last 6 months, last year)</li>
          <li>Choose which categories to display (or show all)</li>
          <li>Look for patterns in the line chart</li>
          <li>Identify seasonal trends or unusual spikes</li>
        </ol>

        <h3>What to Look For</h3>
        <ul>
          <li><strong>Seasonal patterns:</strong> Do you spend more in certain months? (holidays, summer, etc.)</li>
          <li><strong>Increasing trends:</strong> Are any categories growing over time?</li>
          <li><strong>Decreasing trends:</strong> Are you successfully reducing spending in any areas?</li>
          <li><strong>Spikes:</strong> Unusual one-time expenses that might need planning next year</li>
          <li><strong>Consistency:</strong> Which categories are stable vs. variable</li>
        </ul>

        <Callout type="info" title="Plan for seasonal expenses">
          If you notice seasonal patterns (like higher spending in December), use this information
          to plan ahead. Create sinking funds for these predictable expenses!
        </Callout>

        <h2>Filtering and Customization</h2>
        <p>
          Both reports offer filtering options:
        </p>

        <h3>Date Ranges</h3>
        <ul>
          <li>This month</li>
          <li>Last month</li>
          <li>Last 3 months</li>
          <li>Last 6 months</li>
          <li>Last year</li>
          <li>Custom range (select specific start and end dates)</li>
        </ul>

        <h3>Category Filters</h3>
        <ul>
          <li>All categories (default)</li>
          <li>Specific category (click on a category to filter)</li>
          <li>Multiple categories (select multiple to compare)</li>
        </ul>

        <h2>Exporting Reports</h2>
        <p>
          You can export report data for further analysis:
        </p>
        <ol>
          <li>Generate the report you want</li>
          <li>Click "Export to CSV"</li>
          <li>Open the CSV in Excel or Google Sheets</li>
          <li>Create custom charts or analysis</li>
        </ol>

        <h2>Using Reports to Improve Your Budget</h2>

        <h3>Monthly Review</h3>
        <p>
          At the end of each month:
        </p>
        <ol>
          <li>Run the Spending by Category report for the month</li>
          <li>Compare actual spending to your budgeted amounts</li>
          <li>Identify categories where you overspent or underspent</li>
          <li>Adjust next month's budget based on what you learned</li>
        </ol>

        <h3>Quarterly Review</h3>
        <p>
          Every 3 months:
        </p>
        <ol>
          <li>Run the Spending Trends report for the last 3 months</li>
          <li>Look for patterns and trends</li>
          <li>Identify areas where you're improving or struggling</li>
          <li>Set goals for the next quarter</li>
        </ol>

        <h3>Annual Review</h3>
        <p>
          Once a year:
        </p>
        <ol>
          <li>Run reports for the entire year</li>
          <li>Calculate your total spending by category</li>
          <li>Identify your biggest expenses</li>
          <li>Plan for next year based on this year's patterns</li>
        </ol>

        <h2>Tips for Using Reports</h2>
        <ul>
          <li>Review reports regularly (monthly at minimum)</li>
          <li>Don't just look at the numbers - take action based on what you learn</li>
          <li>Compare your spending to your budget to find discrepancies</li>
          <li>Use trends to predict future expenses</li>
          <li>Share reports with your partner or accountability buddy</li>
          <li>Celebrate improvements - if spending is down in a category, that's progress!</li>
          <li>Be honest about problem areas - reports help you face reality</li>
        </ul>

        <Callout type="tip" title="Knowledge is power">
          The more you understand your spending patterns, the better you can control them. Make
          reports a regular part of your budgeting routine!
        </Callout>
      </div>

      <WasThisHelpful articlePath="/help/features/reports" />
    </div>
  );
}


import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Filter,
  Lightbulb,
  Download,
  Target,
  CheckCircle2
} from 'lucide-react';

export default function ReportsFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Reports & Analytics', href: '/help/features/reports' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
        <p className="text-lg text-muted-foreground">
          Analyze your spending patterns and track trends over time
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            The Reports feature helps you understand where your money goes and how your spending
            changes over time. Use it to find opportunities to save and track your progress.
          </p>
        </CardContent>
      </Card>

      {/* Accessing Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Accessing Reports</CardTitle>
              <CardDescription className="text-base">
                Two main reports to analyze your spending
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[160px]">
                <Link href="/reports" className="text-primary hover:underline">Spending by Category</Link>
              </div>
              <div className="text-sm text-muted-foreground">
                See how much you spent in each category for a specific time period
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[160px]">
                <Link href="/reports/trends" className="text-primary hover:underline">Spending Trends</Link>
              </div>
              <div className="text-sm text-muted-foreground">
                Track how your spending changes over time
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spending by Category Report */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Spending by Category Report</h2>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <PieChart className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Features</CardTitle>
                <CardDescription className="text-base">
                  Visual breakdown of your spending by category
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Pie chart:</strong> Visual breakdown of spending by category</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Category list:</strong> Detailed list with amounts and percentages</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Total spending:</strong> Sum of all expenses for the period</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Date range selector:</strong> Choose the time period to analyze</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">How to Use It</CardTitle>
                <CardDescription className="text-base">
                  Steps to analyze your spending by category
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <StepList
              steps={[
                { title: 'Go to Reports', content: <><Link href="/reports" className="text-primary hover:underline">Navigate to the Reports page</Link></> },
                { title: 'Select date range', content: 'Select a date range (this month, last month, last 3 months, custom range)' },
                { title: 'Review pie chart', content: 'Review the pie chart to see your spending distribution' },
                { title: 'Click category', content: 'Click on a category to see all transactions in that category' },
                { title: 'Find opportunities', content: 'Look for categories where you\'re spending more than expected' },
              ]}
            />
            <Callout type="tip" title="Find savings opportunities">
              Look for categories that are larger than you expected. These are often the best places
              to find savings opportunities!
            </Callout>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">What to Look For</CardTitle>
                <CardDescription className="text-base">
                  Key insights from the category report
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Largest categories:</strong> Where most of your money goes</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Unexpected spending:</strong> Categories that are higher than you thought</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Discretionary spending:</strong> Areas where you could cut back if needed</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Fixed vs. variable:</strong> Which expenses are consistent vs. fluctuating</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Spending Trends Report */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Spending Trends Report</h2>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Features</CardTitle>
                <CardDescription className="text-base">
                  Track how your spending changes over time
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This report shows how your spending changes over time, helping you identify patterns and trends.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Line chart:</strong> Shows spending over time (by month or week)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Category comparison:</strong> Compare multiple categories side-by-side</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Total spending trend:</strong> See if your overall spending is increasing or decreasing</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Date range selector:</strong> Choose how far back to look</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">How to Use It</CardTitle>
                <CardDescription className="text-base">
                  Steps to analyze spending trends
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'Go to Trends', content: <><Link href="/reports/trends" className="text-primary hover:underline">Navigate to the Trends page</Link></> },
                { title: 'Select date range', content: 'Select a date range (last 3 months, last 6 months, last year)' },
                { title: 'Choose categories', content: 'Choose which categories to display (or show all)' },
                { title: 'Look for patterns', content: 'Look for patterns in the line chart' },
                { title: 'Identify trends', content: 'Identify seasonal trends or unusual spikes' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">What to Look For</CardTitle>
                <CardDescription className="text-base">
                  Key insights from the trends report
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Seasonal patterns:</strong> Do you spend more in certain months? (holidays, summer, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Increasing trends:</strong> Are any categories growing over time?</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Decreasing trends:</strong> Are you successfully reducing spending in any areas?</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Spikes:</strong> Unusual one-time expenses that might need planning next year</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Consistency:</strong> Which categories are stable vs. variable</span>
              </li>
            </ul>
            <Callout type="info" title="Plan for seasonal expenses">
              If you notice seasonal patterns (like higher spending in December), use this information
              to plan ahead. Create sinking funds for these predictable expenses!
            </Callout>
          </CardContent>
        </Card>
      </div>

      {/* Filtering and Customization */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Filter className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Filtering and Customization</CardTitle>
              <CardDescription className="text-base">
                Customize your reports with filters
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Date Ranges</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>This month</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Last month</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Last 3 months</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Last 6 months</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Last year</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Custom range (select specific start and end dates)</span>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Category Filters</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>All categories (default)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Specific category (click on a category to filter)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Multiple categories (select multiple to compare)</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Exporting Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Exporting Reports</CardTitle>
              <CardDescription className="text-base">
                Export data for further analysis
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StepList
            steps={[
              { title: 'Generate report', content: 'Generate the report you want' },
              { title: 'Export', content: 'Click "Export to CSV"' },
              { title: 'Open in spreadsheet', content: 'Open the CSV in Excel or Google Sheets' },
              { title: 'Analyze', content: 'Create custom charts or analysis' },
            ]}
          />
        </CardContent>
      </Card>

      {/* Using Reports to Improve Your Budget */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Using Reports to Improve Your Budget</h2>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Monthly Review</CardTitle>
                <CardDescription className="text-base">
                  At the end of each month
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'Run report', content: 'Run the Spending by Category report for the month' },
                { title: 'Compare', content: 'Compare actual spending to your budgeted amounts' },
                { title: 'Identify variances', content: 'Identify categories where you overspent or underspent' },
                { title: 'Adjust', content: 'Adjust next month\'s budget based on what you learned' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Quarterly Review</CardTitle>
                <CardDescription className="text-base">
                  Every 3 months
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'Run trends', content: 'Run the Spending Trends report for the last 3 months' },
                { title: 'Look for patterns', content: 'Look for patterns and trends' },
                { title: 'Identify areas', content: 'Identify areas where you\'re improving or struggling' },
                { title: 'Set goals', content: 'Set goals for the next quarter' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Annual Review</CardTitle>
                <CardDescription className="text-base">
                  Once a year
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'Run annual reports', content: 'Run reports for the entire year' },
                { title: 'Calculate totals', content: 'Calculate your total spending by category' },
                { title: 'Identify biggest expenses', content: 'Identify your biggest expenses' },
                { title: 'Plan ahead', content: 'Plan for next year based on this year\'s patterns' },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">Tips for Using Reports</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Review reports regularly (monthly at minimum)
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Don't just look at the numbers - take action based on what you learn
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Compare your spending to your budget to find discrepancies
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use trends to predict future expenses
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Share reports with your partner or accountability buddy
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">6</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Celebrate improvements - if spending is down in a category, that's progress!
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">7</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Be honest about problem areas - reports help you face reality
              </p>
            </li>
          </ul>

          <Callout type="tip" title="Knowledge is power">
            The more you understand your spending patterns, the better you can control them. Make
            reports a regular part of your budgeting routine!
          </Callout>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/reports" />
    </div>
  );
}


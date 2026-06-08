import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, TrendingUp, Calendar, DollarSign, Info, Target, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';

export default function RetirementPlanningFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Retirement Planning', href: '/help/features/retirement-planning' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Retirement Planning & Net Worth Forecast</h1>
        <p className="text-lg text-muted-foreground">
          Project your financial future and plan for retirement with comprehensive forecasting tools
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            The Retirement Planning feature (Net Worth Forecast) helps you visualize your financial future by projecting
            your net worth over time. It considers your current assets, loans, income growth, savings rate, retirement
            age, Social Security benefits, Required Minimum Distributions (RMDs), and more to give you a realistic picture
            of your financial trajectory.
          </p>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
          <p className="text-muted-foreground mb-6">
            Before you can use the forecast feature, you'll need to set up a few basic pieces of information:
          </p>
        </div>

        {/* Birth Year */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Setting Your Birth Year</CardTitle>
                <CardDescription className="text-base">
                  Required for accurate age-based calculations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The first time you access the forecast page, you'll be prompted to enter your birth year. This is essential
              for calculating:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Your current age and years until retirement</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>When Required Minimum Distributions (RMDs) become required (age 73)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Social Security start dates</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Forecast timeline (defaults to age 90)</span>
              </li>
            </ul>
            <Callout type="info" title="Privacy">
              Your birth year is stored securely and is only used for financial forecasting calculations. It's not shared
              with third parties.
            </Callout>
          </CardContent>
        </Card>

        {/* Forecast Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Forecast Settings</CardTitle>
                <CardDescription className="text-base">
                  Configure how your financial future is projected
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold mb-2">Forecast Age</h4>
                <p className="text-sm text-muted-foreground">
                  The age up to which you want to forecast (default: 90). The forecast will automatically calculate
                  how many years to project based on your current age.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold mb-2">Retirement Age</h4>
                <p className="text-sm text-muted-foreground">
                  The age at which you plan to retire (default: 67). After this age, work income stops and retirement
                  income (Social Security, pensions, etc.) begins.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold mb-2">Income Growth Rate</h4>
                <p className="text-sm text-muted-foreground">
                  Expected annual percentage increase in your income before retirement (default: 3%). This accounts for
                  raises, promotions, and career advancement.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold mb-2">Savings Rate</h4>
                <p className="text-sm text-muted-foreground">
                  Percentage of your net income that you save before retirement (default: 20%). This is applied to
                  positive cash flow after expenses.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold mb-2">Retirement Savings Rate</h4>
                <p className="text-sm text-muted-foreground">
                  Percentage of retirement income that you continue to save (default: 0%). If you have excess income
                  in retirement, you can continue saving a portion of it.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold mb-2">Inflation Rate</h4>
                <p className="text-sm text-muted-foreground">
                  Expected annual inflation rate (default: 4%). This is used to adjust your expenses over time,
                  making your budget more expensive each year.
                </p>
              </div>
            </div>
            <Callout type="tip" title="Settings are saved automatically">
              All forecast settings are automatically saved as you change them, so you don't need to worry about losing
              your configuration.
            </Callout>
          </CardContent>
        </Card>
      </div>

      {/* Social Security */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Social Security Benefits</CardTitle>
              <CardDescription className="text-base">
                Configure when and how much Social Security you'll receive
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Social Security benefits are an important part of retirement income. The forecast allows you to configure:
          </p>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[180px]">Social Security Start Age</div>
              <div className="text-sm text-muted-foreground">
                The age at which you'll start receiving Social Security benefits (default: 67). This can be different
                from your retirement age.
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[180px]">Benefit Level</div>
              <div className="text-sm text-muted-foreground">
                Choose from Full, Half, or None. Use "Half" if you're estimating benefits for a spouse or if you expect
                reduced benefits. The benefit amount is calculated based on your current income.
              </div>
            </div>
          </div>
          <Callout type="info" title="Social Security calculation">
            The forecast estimates your Social Security benefit based on your current monthly net income. For more
            accurate estimates, check your Social Security statement at{' '}
            <a href="https://www.ssa.gov" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              ssa.gov
            </a> and adjust the benefit level accordingly.
          </Callout>
        </CardContent>
      </Card>

      {/* Required Minimum Distributions */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Info className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Required Minimum Distributions (RMDs)</CardTitle>
              <CardDescription className="text-base">
                Automatic distributions from retirement accounts starting at age 73
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Required Minimum Distributions are mandatory withdrawals from certain retirement accounts starting at age 73.
            The forecast automatically calculates and applies RMDs for assets marked as RMD-qualified.
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium mb-3">RMD-Qualified Accounts:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Traditional IRAs</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>401(k) accounts</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>403(b) accounts</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>SEP IRAs and SIMPLE IRAs</span>
              </li>
            </ul>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-sm font-medium mb-2">How RMDs Work in the Forecast:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>RMDs start automatically at age 73 (configurable)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>The required amount is calculated based on account balance and IRS life expectancy tables</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>RMDs are distributed from liquid assets first, then illiquid assets if needed</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Distributed amounts are added to your cash accounts</span>
              </li>
            </ul>
          </div>
          <Callout type="info" title="Marking assets as RMD-qualified">
            When adding or editing non-cash assets, check the "Subject to Required Minimum Distributions (RMD)" option
            for retirement accounts that require RMDs. See{' '}
            <Link href="/help/features/non-cash-assets" className="text-primary hover:underline">Non-Cash Assets</Link> for
            more information.
          </Callout>
        </CardContent>
      </Card>

      {/* Timeline Events */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Timeline Events</CardTitle>
              <CardDescription className="text-base">
                Add one-time events that affect your financial forecast
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Timeline events allow you to model specific one-time financial events that will impact your forecast:
          </p>
          <div className="grid gap-3">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold mb-2">Asset Liquidation</h4>
              <p className="text-sm text-muted-foreground">
                Model selling a non-cash asset (like real estate or a vehicle) at a specific year. The asset's value
                is removed from your assets and added to your cash accounts.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold mb-2">Windfall</h4>
              <p className="text-sm text-muted-foreground">
                Add a one-time income event like an inheritance, bonus, or sale proceeds. The amount is added to your
                cash accounts in the specified year.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold mb-2">Expense Change</h4>
              <p className="text-sm text-muted-foreground">
                Model a permanent change in your annual expenses (positive or negative). For example, paying off a
                mortgage would reduce expenses, while moving to a more expensive area would increase them.
              </p>
            </div>
          </div>
          <Callout type="tip" title="Planning ahead">
            Use timeline events to model major life changes like selling your home, receiving an inheritance, or
            relocating. This helps you see how these events will impact your long-term financial picture.
          </Callout>
        </CardContent>
      </Card>

      {/* Understanding the Forecast */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Understanding the Forecast</h2>
          <p className="text-muted-foreground mb-6">
            The forecast page displays several key visualizations and metrics to help you understand your financial future:
          </p>
        </div>

        {/* Key Metrics */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Key Metrics</CardTitle>
                <CardDescription className="text-base">
                  Summary statistics at the top of the forecast page
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[200px]">Current Net Worth</div>
                <div className="text-sm text-muted-foreground">
                  Your current total net worth (assets minus liabilities) based on your accounts, non-cash assets,
                  credit cards, and loans.
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[200px]">Projected Net Worth</div>
                <div className="text-sm text-muted-foreground">
                  Your estimated net worth at the end of the forecast period (default: age 90).
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[200px]">Net Worth Change</div>
                <div className="text-sm text-muted-foreground">
                  The dollar amount and percentage change in your net worth over the forecast period.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sun className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Forecast Charts</CardTitle>
                <CardDescription className="text-base">
                  Visual representations of your financial projection
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The forecast displays several charts showing different aspects of your financial future:
            </p>
            <div className="space-y-3">
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold mb-2">Net Worth Chart</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Shows your projected net worth over time, combining historical net worth snapshots (if available) with
                  future projections. The chart includes:
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                  <li className="list-disc">Historical data points (from net worth snapshots)</li>
                  <li className="list-disc">Forecasted net worth (projected future)</li>
                  <li className="list-disc">Retirement marker (vertical line at your retirement age)</li>
                  <li className="list-disc">Timeline event markers (dots showing when events occur)</li>
                </ul>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold mb-2">Component Breakdown</h4>
                <p className="text-sm text-muted-foreground">
                  Shows how your net worth is composed: cash accounts, non-cash assets, credit cards, and loans.
                  This helps you understand what's driving your net worth changes over time.
                </p>
              </div>
            </div>
            <Callout type="info" title="Hover for details">
              Hover over any point on the charts to see detailed information for that year, including income, expenses,
              distributions, and RMD amounts.
            </Callout>
          </CardContent>
        </Card>

        {/* Distribution Planning */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Distribution Planning</CardTitle>
                <CardDescription className="text-base">
                  Understanding when and how much to withdraw from assets
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The forecast automatically calculates when you'll need to start taking distributions from your assets to
              cover expenses in retirement:
            </p>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm font-medium mb-2">Distribution Logic:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Distributions start when retirement income (Social Security + other) is less than expenses</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Liquid assets are distributed first (stocks, bonds, cash accounts)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Illiquid assets (real estate, collectibles) are distributed only when liquid assets are exhausted</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>RMDs are automatically applied starting at age 73 for RMD-qualified accounts</span>
                </li>
              </ul>
            </div>
            <Callout type="warning" title="Cash runs out">
              The forecast will show when your cash accounts would go negative if you don't take distributions. This
              helps you plan when to start withdrawing from your assets.
            </Callout>
          </CardContent>
        </Card>
      </div>

      {/* Best Practices */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Best Practices</h2>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Keep Your Data Current</CardTitle>
                <CardDescription className="text-base">
                  Accurate forecasts require up-to-date information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Update account balances regularly</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Keep non-cash asset values current (especially retirement accounts)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Review and update forecast settings annually or when your situation changes</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Mark retirement accounts as RMD-qualified for accurate distribution planning</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Use Realistic Assumptions</CardTitle>
                <CardDescription className="text-base">
                  Conservative estimates lead to better planning
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Use conservative return rates for investments (7-8% for stocks, 3-5% for bonds)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Account for inflation (default 4% is reasonable for long-term planning)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Don't overestimate income growth - 2-3% is typical</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Consider running multiple scenarios with different assumptions</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Plan for Major Events</CardTitle>
                <CardDescription className="text-base">
                  Use timeline events to model significant financial changes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Consider adding timeline events for:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Paying off your mortgage (reduces expenses)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Selling your home and downsizing (liquidation event)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Receiving an inheritance or large bonus (windfall)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Major lifestyle changes (expense changes)</span>
              </li>
            </ul>
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
              <CardTitle className="text-xl">Tips for Using the Forecast</CardTitle>
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
                Review your forecast quarterly to see how your actual progress compares to projections
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use the forecast to identify potential shortfalls early and adjust your savings rate accordingly
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Experiment with different retirement ages to see how working longer impacts your financial security
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Pay attention to when cash runs out - this tells you when you'll need to start taking distributions
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Remember that forecasts are estimates - actual results will vary based on market performance and life events
              </p>
            </li>
          </ul>

          <Callout type="info" title="Premium Feature">
            The Retirement Planning forecast is a premium feature. If you don't have premium, you'll see an upgrade
            prompt when accessing the forecast page.
          </Callout>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/retirement-planning" />
    </div>
  );
}

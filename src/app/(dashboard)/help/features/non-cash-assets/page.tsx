import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Plus, Edit, RefreshCw, Lightbulb, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function NonCashAssetsFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Non-Cash Assets', href: '/help/features/non-cash-assets' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Non-Cash Assets</h1>
        <p className="text-lg text-muted-foreground">
          Track investments, retirement accounts, real estate, and other non-cash assets
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            Non-cash assets represent investments and property that aren't immediately spendable cash.
            This includes retirement accounts (401(k), IRA, etc.), investment portfolios, real estate,
            vehicles, and other valuable assets. Tracking these assets gives you a complete picture of
            your net worth and helps with long-term financial planning.
          </p>
        </CardContent>
      </Card>

      {/* What Are Non-Cash Assets */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">What Are Non-Cash Assets?</CardTitle>
              <CardDescription className="text-base">
                Assets that aren't immediately spendable cash
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Non-cash assets are valuable items you own that aren't cash in a bank account. These include:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Investment Accounts</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Retirement accounts (401(k), IRA, 403(b), SEP IRA, SIMPLE IRA)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Brokerage accounts (stocks, bonds, mutual funds)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Cryptocurrency holdings</span>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Physical Assets</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Real estate (primary residence, rental properties)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Vehicles (cars, motorcycles, boats)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Art, collectibles, jewelry</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Insurance policies with cash value</span>
                </li>
              </ul>
            </div>
          </div>
          <Callout type="info" title="Why separate from cash accounts?">
            Non-cash assets are tracked separately from your cash accounts because they're not immediately
            spendable. Your cash accounts (checking, savings) are for day-to-day budgeting, while non-cash
            assets represent long-term wealth. Both are included in your net worth, but only cash accounts
            affect your "Available to Save" budget calculation.
          </Callout>
        </CardContent>
      </Card>

      {/* Adding an Asset */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Adding a Non-Cash Asset</CardTitle>
              <CardDescription className="text-base">
                Follow these steps to add a new asset to track
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StepList
            steps={[
              { title: 'Go to Non-Cash Assets', content: 'Navigate to the Non-Cash Assets page from the dashboard or sidebar' },
              { title: 'Click "Add Asset"', content: 'Click the "Add Asset" button' },
              { title: 'Enter asset details', content: 'Provide the asset name (e.g., "401(k) Retirement Account", "Primary Residence")' },
              { title: 'Select asset type', content: 'Choose the appropriate type (Investment, Real Estate, Vehicle, etc.)' },
              { title: 'Enter current value', content: 'Enter the current market value of the asset' },
              { title: 'Set estimated return', content: 'Optionally set an estimated annual return percentage for forecasting (e.g., 7.5 for 7.5% growth)' },
              { title: 'Configure options', content: 'Set whether it\'s RMD-qualified (for retirement accounts) and whether it\'s liquid' },
              { title: 'Save', content: 'Click "Add Asset" to save your new asset' },
            ]}
          />
        </CardContent>
      </Card>

      {/* Asset Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Asset Types</CardTitle>
          <CardDescription className="text-base">
            Different types of assets you can track
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold mb-2">Investment</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Retirement accounts, brokerage accounts, stocks, bonds, mutual funds, ETFs, etc.
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Examples:</strong> 401(k), Traditional IRA, Roth IRA, 403(b), SEP IRA, SIMPLE IRA, taxable brokerage account
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold mb-2">Real Estate</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Property you own, including your primary residence and rental properties.
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> You can optionally include the property address for potential future integrations with real estate value APIs.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold mb-2">Vehicle</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Cars, trucks, motorcycles, boats, RVs, and other vehicles.
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> You can optionally include the VIN (Vehicle Identification Number) for potential future integrations with auto value APIs.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold mb-2">Other Types</h4>
              <p className="text-sm text-muted-foreground">
                Art, collectibles, cryptocurrency, insurance policies with cash value, and other valuable assets.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RMD and Liquidity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">RMD Qualification & Liquidity</CardTitle>
          <CardDescription className="text-base">
            Important settings for retirement planning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                RMD-Qualified
              </h4>
              <p className="text-sm text-muted-foreground">
                Check this for retirement accounts that require Required Minimum Distributions (RMDs)
                starting at age 73. This includes Traditional IRAs, 401(k)s, 403(b)s, SEP IRAs, and SIMPLE IRAs.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Note:</strong> Roth IRAs are NOT RMD-qualified since they don't require distributions.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Liquid Asset
              </h4>
              <p className="text-sm text-muted-foreground">
                Check this if the asset can be easily converted to cash. Liquid assets (stocks, bonds, cash accounts)
                can be distributed immediately. Illiquid assets (real estate, collectibles) may take time to sell.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Note:</strong> This affects retirement distribution planning in forecasts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estimated Return */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Estimated Return Percentage</CardTitle>
              <CardDescription className="text-base">
                Set expected growth or depreciation for forecasting
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The estimated return percentage is used in financial forecasts to project future asset values:
          </p>
          <div className="bg-muted/50 rounded-lg p-4 border">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Positive values:</strong> Expected growth (e.g., 7.5% for stock market investments, 3% for bonds)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Negative values:</strong> Expected depreciation (e.g., -10% for vehicles, -2% for real estate in some markets)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Zero:</strong> No expected change in value</span>
              </li>
            </ul>
          </div>
          <Callout type="tip" title="Historical averages">
            Common estimates: Stock market (7-10%), Bonds (3-5%), Real estate (3-5%), Vehicles (-10% to -15%).
            These are just estimates - actual returns will vary.
          </Callout>
        </CardContent>
      </Card>

      {/* Updating Asset Values */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Updating Asset Values</CardTitle>
              <CardDescription className="text-base">
                Keep your asset values current for accurate net worth tracking
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StepList
            steps={[
              { title: 'Open asset', content: 'Click on an asset to view its details' },
              { title: 'Click "Edit"', content: 'Click the "Edit" button' },
              { title: 'Update value', content: 'Enter the new current value' },
              { title: 'Save changes', content: 'Click "Save" to update the asset' },
            ]}
          />
          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-sm font-medium mb-1">Recommended Update Frequency</p>
            <p className="text-sm text-muted-foreground">
              Update asset values regularly to maintain accurate net worth tracking. Monthly updates are
              recommended for most assets, though you may want to update retirement accounts quarterly when
              statements arrive.
            </p>
          </div>
          <Callout type="tip" title="Value history">
            The app tracks value changes over time, so you can see how your assets have grown or changed
            in value. This helps you understand your financial progress.
          </Callout>
        </CardContent>
      </Card>

      {/* Net Worth and Forecasting */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Net Worth & Financial Forecasting</CardTitle>
              <CardDescription className="text-base">
                How assets contribute to your financial picture
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Non-cash assets are included in your net worth calculation, giving you a complete picture of
            your financial health:
          </p>
          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-sm font-medium mb-2">Net Worth Formula</p>
            <p className="text-sm font-mono mb-2">Net Worth = Cash Accounts + Non-Cash Assets - Credit Cards - Loans</p>
            <p className="text-xs text-muted-foreground">
              This gives you your total financial position, including both liquid cash and long-term assets.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Assets also play a role in financial forecasting, especially for retirement planning:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Growth projection:</strong> Assets grow based on their estimated return percentage</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Retirement distributions:</strong> RMD-qualified assets are subject to required minimum distributions starting at age 73</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Liquidity planning:</strong> Liquid vs. illiquid assets affect when you can access funds for distributions</span>
            </li>
          </ul>
        </CardContent>
      </Card>

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
                <CardTitle className="text-xl mb-2">Include All Major Assets</CardTitle>
                <CardDescription className="text-base">
                  Track everything that significantly impacts your net worth
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Include all assets that meaningfully contribute to your net worth:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>All retirement accounts (401(k), IRA, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Investment portfolios and brokerage accounts</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Real estate (primary residence and investment properties)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Vehicles worth tracking (typically $5,000+)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <AlertCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Use Market Values</CardTitle>
                <CardDescription className="text-base">
                  Track current market value, not purchase price
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Always use current market value when tracking assets:
            </p>
            <div className="grid gap-2 mt-3">
              <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="font-medium text-sm min-w-[100px] text-green-700 dark:text-green-400">Good</div>
                <div className="text-sm text-muted-foreground">Use current account balance from your latest statement</div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="font-medium text-sm min-w-[100px] text-yellow-700 dark:text-yellow-400">Less accurate</div>
                <div className="text-sm text-muted-foreground">Using purchase price or outdated values</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Set Realistic Return Estimates</CardTitle>
                <CardDescription className="text-base">
                  Use historical averages as a starting point
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Estimated returns are used for forecasting, not guaranteed outcomes. Use conservative estimates
              based on historical averages:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground mt-3">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Stock market investments:</strong> 7-10% (long-term historical average)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Bonds:</strong> 3-5%</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Real estate:</strong> 3-5% (appreciation, not including rental income)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Vehicles:</strong> -10% to -15% (depreciation)</span>
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
              <CardTitle className="text-xl">Tips for Managing Assets</CardTitle>
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
                Update values regularly - monthly for most assets, quarterly for retirement accounts
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Mark retirement accounts as RMD-qualified if they require distributions at age 73+
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use descriptive names that match your account statements (e.g., "401(k) - Employer Name")
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Set realistic return estimates based on asset type and historical averages
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Review your asset portfolio periodically to ensure everything is up to date
              </p>
            </li>
          </ul>

          <Callout type="tip" title="Complete financial picture">
            Tracking both cash accounts and non-cash assets gives you a complete view of your financial
            health. Cash accounts show what you can spend today, while assets show your long-term wealth
            and retirement readiness.
          </Callout>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/non-cash-assets" />
    </div>
  );
}

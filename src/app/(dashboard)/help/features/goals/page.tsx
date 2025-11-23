import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Target,
  Plus,
  TrendingUp,
  Calendar,
  DollarSign,
  Shield,
  Palmtree,
  Home,
  Lightbulb,
  Edit3,
  Link as LinkIcon
} from 'lucide-react';

export default function GoalsFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Goals', href: '/help/features/goals' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Financial Goals</h1>
        <p className="text-lg text-muted-foreground">
          Track progress toward your savings goals
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            Goals help you save for specific purposes - vacations, emergency funds, down payments,
            or anything else you're working toward. They provide motivation and track your progress.
          </p>
        </CardContent>
      </Card>

      {/* Creating a Goal */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Creating a Goal</CardTitle>
              <CardDescription className="text-base">
                Set up a new savings goal in just a few steps
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StepList
            steps={[
              {
                title: 'Navigate to Goals',
                content: (
                  <>
                    Go to the <Link href="/goals" className="text-primary hover:underline">Goals page</Link> or
                    click "Add Goal" on the Dashboard
                  </>
                )
              },
              { title: 'Enter goal name', content: 'E.g., "Emergency Fund", "Vacation", "New Car"' },
              { title: 'Set target amount', content: 'How much you want to save' },
              { title: 'Set target date (optional)', content: 'When you want to reach the goal' },
              { title: 'Enter current amount', content: 'How much you\'ve already saved' },
              { title: 'Click "Add Goal"', content: 'Save your new goal' },
            ]}
          />
        </CardContent>
      </Card>

      {/* Goal Fields */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Goal Fields Explained</h2>

        {/* Goal Name */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Goal Name</CardTitle>
                <CardDescription className="text-base">
                  A descriptive name for what you're saving for
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Be specific to stay motivated!
            </p>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="font-medium text-sm min-w-[60px] text-green-900 dark:text-green-100">Good</div>
                <div className="text-sm text-green-900 dark:text-green-100">
                  "Emergency Fund - 6 months expenses"
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="font-medium text-sm min-w-[60px] text-green-900 dark:text-green-100">Good</div>
                <div className="text-sm text-green-900 dark:text-green-100">
                  "Hawaii Vacation 2025"
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="font-medium text-sm min-w-[60px] text-yellow-900 dark:text-yellow-100">Less good</div>
                <div className="text-sm text-yellow-900 dark:text-yellow-100">
                  "Savings"
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Target Amount */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Target Amount</CardTitle>
                <CardDescription className="text-base">
                  How much you want to save - your finish line
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Current Amount */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Current Amount</CardTitle>
                <CardDescription className="text-base">
                  How much you've already saved toward this goal
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Update this as you add money to the goal to track your progress.
            </p>
          </CardContent>
        </Card>

        {/* Target Date */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Target Date (Optional)</CardTitle>
                <CardDescription className="text-base">
                  When you want to reach this goal
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This helps you calculate how much to save each month. If you set a target date, the app
              will show you how much you need to save per month to reach your goal on time.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tracking Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Tracking Progress</CardTitle>
              <CardDescription className="text-base">
                Visual indicators to keep you motivated
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Each goal shows:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Progress bar:</strong> Visual representation of how close you are</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Percentage complete:</strong> What portion of the goal you've achieved</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Amount remaining:</strong> How much more you need to save</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Monthly target:</strong> (If target date is set) How much to save per month</span>
            </li>
          </ul>
          <Callout type="tip" title="Stay motivated">
            Seeing your progress bar fill up is incredibly motivating! Update your goals regularly
            to see your progress.
          </Callout>
        </CardContent>
      </Card>

      {/* Adding Money to Goals */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Adding Money to Goals</h2>
        <p className="text-muted-foreground">There are two ways to add money to a goal:</p>

        {/* Method 1 */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Method 1: Update Current Amount</CardTitle>
                <CardDescription className="text-base">
                  Manually update the progress on your goal
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'Open goal menu', content: 'Click the "..." menu on a goal' },
                { title: 'Select "Add Progress"', content: 'Choose the add progress option' },
                { title: 'Enter new total', content: 'Enter the new total amount saved' },
                { title: 'Click "Update"', content: 'Save your progress' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Method 2 */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <LinkIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Method 2: Link to a Category</CardTitle>
                <CardDescription className="text-base">
                  Integrate goals into your regular budgeting workflow
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You can create a budget category for each goal and track it that way. For example:
            </p>
            <StepList
              steps={[
                { title: 'Create a category', content: 'Create a category called "Emergency Fund"' },
                { title: 'Create a goal', content: 'Create a goal called "Emergency Fund - $10,000"' },
                { title: 'Allocate monthly', content: 'Allocate money to the Emergency Fund category each month' },
                { title: 'Update goal progress', content: 'Update the goal\'s current amount to match the category balance' },
              ]}
            />
            <p className="text-sm text-muted-foreground">
              This approach integrates goals into your regular budgeting workflow.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Goal Types */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Goal Types</h2>
          <p className="text-muted-foreground">
            While the app doesn't formally categorize goals, it's helpful to think about different types:
          </p>
        </div>

        {/* Emergency Fund */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Emergency Fund</CardTitle>
                <CardDescription className="text-base">
                  Save 3-6 months of expenses for unexpected emergencies
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              This should be your first priority!
            </p>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm font-medium text-muted-foreground mb-1">Target Amount</p>
              <p className="text-sm font-mono">Monthly expenses × 3 to 6</p>
            </div>
          </CardContent>
        </Card>

        {/* Sinking Funds */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Sinking Funds</CardTitle>
                <CardDescription className="text-base">
                  Save for known future expenses
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Like car insurance, property taxes, or annual subscriptions.
            </p>
            <div className="grid gap-3">
              <div className="bg-muted/50 rounded-lg p-4 border">
                <p className="text-sm font-medium text-muted-foreground mb-1">Target Amount</p>
                <p className="text-sm font-mono">The annual cost</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 border">
                <p className="text-sm font-medium text-muted-foreground mb-1">Target Date</p>
                <p className="text-sm font-mono">When the expense is due</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Big Purchases */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Home className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Big Purchases</CardTitle>
                <CardDescription className="text-base">
                  Save for large one-time purchases
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Like a car, furniture, or home down payment.
            </p>
            <div className="grid gap-3">
              <div className="bg-muted/50 rounded-lg p-4 border">
                <p className="text-sm font-medium text-muted-foreground mb-1">Target Amount</p>
                <p className="text-sm font-mono">The purchase price (or down payment amount)</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 border">
                <p className="text-sm font-medium text-muted-foreground mb-1">Target Date</p>
                <p className="text-sm font-mono">When you want to make the purchase</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fun Goals */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Palmtree className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Fun Goals</CardTitle>
                <CardDescription className="text-base">
                  Save for vacations, hobbies, or other enjoyable expenses
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              These keep budgeting from feeling too restrictive!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Editing and Deleting */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit3 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Editing and Deleting Goals</CardTitle>
              <CardDescription className="text-base">
                Modify or remove goals at any time
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[60px]">Edit</div>
              <div className="text-sm text-muted-foreground">
                Click the "..." menu and select "Edit" to change the name, target amount, or target date
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[60px]">Delete</div>
              <div className="text-sm text-muted-foreground">
                Click the "..." menu and select "Delete" to remove the goal
              </div>
            </div>
          </div>
          <Callout type="info" title="Completed goals">
            When you reach a goal (current amount ≥ target amount), consider keeping it visible for
            a while to celebrate your achievement! Then you can delete it or repurpose it for a new goal.
          </Callout>
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
              <CardTitle className="text-xl">Tips for Goal Success</CardTitle>
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
                Start with one or two goals - don't overwhelm yourself
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Make your emergency fund your first priority
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Set realistic target dates based on your income
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Update goal progress regularly to stay motivated
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Create budget categories that match your goals
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">6</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Celebrate milestones (25%, 50%, 75% complete)
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">7</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Be flexible - it's okay to adjust targets if circumstances change
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">8</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use specific, motivating names for your goals
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Goals vs Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Goals vs. Categories</CardTitle>
          <CardDescription className="text-base">
            Understanding the difference and how to use them together
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[100px]">Categories</div>
              <div className="text-sm text-muted-foreground">
                For organizing your money and tracking spending
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[100px]">Goals</div>
              <div className="text-sm text-muted-foreground">
                For motivation and tracking progress toward specific targets
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            You can use them together: create a category for each goal, allocate money to the
            category, and update the goal to match the category balance.
          </p>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/goals" />
    </div>
  );
}


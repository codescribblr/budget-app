import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';

export default function GoalsFeaturePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Goals', href: '/help/features/goals' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Financial Goals</h1>
        <p className="text-lg text-muted-foreground">
          Track progress toward your savings goals
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          Goals help you save for specific purposes - vacations, emergency funds, down payments,
          or anything else you're working toward. They provide motivation and track your progress.
        </p>

        <h2>Creating a Goal</h2>
        <ol>
          <li>Go to the <Link href="/goals" className="text-primary hover:underline">Goals page</Link> or
            click "Add Goal" on the Dashboard</li>
          <li>Enter a goal name (e.g., "Emergency Fund", "Vacation", "New Car")</li>
          <li>Set a target amount (how much you want to save)</li>
          <li>Optionally set a target date (when you want to reach the goal)</li>
          <li>Enter the current amount (how much you've already saved)</li>
          <li>Click "Add Goal"</li>
        </ol>

        <h2>Goal Fields</h2>

        <h3>Goal Name</h3>
        <p>
          A descriptive name for what you're saving for. Be specific to stay motivated!
        </p>
        <ul>
          <li>Good: "Emergency Fund - 6 months expenses"</li>
          <li>Good: "Hawaii Vacation 2025"</li>
          <li>Less good: "Savings"</li>
        </ul>

        <h3>Target Amount</h3>
        <p>
          How much you want to save. This is your finish line.
        </p>

        <h3>Current Amount</h3>
        <p>
          How much you've already saved toward this goal. Update this as you add money to the goal.
        </p>

        <h3>Target Date (Optional)</h3>
        <p>
          When you want to reach this goal. This helps you calculate how much to save each month.
        </p>
        <p>
          If you set a target date, the app will show you how much you need to save per month to
          reach your goal on time.
        </p>

        <h2>Tracking Progress</h2>
        <p>
          Each goal shows:
        </p>
        <ul>
          <li><strong>Progress bar:</strong> Visual representation of how close you are</li>
          <li><strong>Percentage complete:</strong> What portion of the goal you've achieved</li>
          <li><strong>Amount remaining:</strong> How much more you need to save</li>
          <li><strong>Monthly target:</strong> (If target date is set) How much to save per month</li>
        </ul>

        <Callout type="tip" title="Stay motivated">
          Seeing your progress bar fill up is incredibly motivating! Update your goals regularly
          to see your progress.
        </Callout>

        <h2>Adding Money to Goals</h2>
        <p>
          There are two ways to add money to a goal:
        </p>

        <h3>Method 1: Update Current Amount</h3>
        <ol>
          <li>Click the "..." menu on a goal</li>
          <li>Select "Add Progress"</li>
          <li>Enter the new total amount saved</li>
          <li>Click "Update"</li>
        </ol>

        <h3>Method 2: Link to a Category</h3>
        <p>
          You can create a budget category for each goal and track it that way. For example:
        </p>
        <ol>
          <li>Create a category called "Emergency Fund"</li>
          <li>Create a goal called "Emergency Fund - $10,000"</li>
          <li>Allocate money to the Emergency Fund category each month</li>
          <li>Update the goal's current amount to match the category balance</li>
        </ol>
        <p>
          This approach integrates goals into your regular budgeting workflow.
        </p>

        <h2>Goal Types</h2>
        <p>
          While the app doesn't formally categorize goals, it's helpful to think about different
          types:
        </p>

        <h3>Emergency Fund</h3>
        <p>
          Save 3-6 months of expenses for unexpected emergencies. This should be your first priority!
        </p>
        <p>
          <strong>Target amount:</strong> Monthly expenses × 3 to 6
        </p>

        <h3>Sinking Funds</h3>
        <p>
          Save for known future expenses like car insurance, property taxes, or annual subscriptions.
        </p>
        <p>
          <strong>Target amount:</strong> The annual cost
        </p>
        <p>
          <strong>Target date:</strong> When the expense is due
        </p>

        <h3>Big Purchases</h3>
        <p>
          Save for large one-time purchases like a car, furniture, or home down payment.
        </p>
        <p>
          <strong>Target amount:</strong> The purchase price (or down payment amount)
        </p>
        <p>
          <strong>Target date:</strong> When you want to make the purchase
        </p>

        <h3>Fun Goals</h3>
        <p>
          Save for vacations, hobbies, or other enjoyable expenses. These keep budgeting from
          feeling too restrictive!
        </p>

        <h2>Editing and Deleting Goals</h2>
        <p>
          You can edit or delete goals at any time:
        </p>
        <ul>
          <li><strong>Edit:</strong> Click the "..." menu and select "Edit" to change the name,
            target amount, or target date</li>
          <li><strong>Delete:</strong> Click the "..." menu and select "Delete" to remove the goal</li>
        </ul>

        <Callout type="info" title="Completed goals">
          When you reach a goal (current amount ≥ target amount), consider keeping it visible for
          a while to celebrate your achievement! Then you can delete it or repurpose it for a new goal.
        </Callout>

        <h2>Tips for Goal Success</h2>
        <ul>
          <li>Start with one or two goals - don't overwhelm yourself</li>
          <li>Make your emergency fund your first priority</li>
          <li>Set realistic target dates based on your income</li>
          <li>Update goal progress regularly to stay motivated</li>
          <li>Create budget categories that match your goals</li>
          <li>Celebrate milestones (25%, 50%, 75% complete)</li>
          <li>Be flexible - it's okay to adjust targets if circumstances change</li>
          <li>Use specific, motivating names for your goals</li>
        </ul>

        <h2>Goals vs. Categories</h2>
        <p>
          Goals and categories serve different purposes:
        </p>
        <ul>
          <li><strong>Categories</strong> are for organizing your money and tracking spending</li>
          <li><strong>Goals</strong> are for motivation and tracking progress toward specific targets</li>
        </ul>
        <p>
          You can use them together: create a category for each goal, allocate money to the
          category, and update the goal to match the category balance.
        </p>
      </div>

      <WasThisHelpful articlePath="/help/features/goals" />
    </div>
  );
}


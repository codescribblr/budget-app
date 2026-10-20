import Link from "next/link";
import { Breadcrumbs } from "@/components/help/Breadcrumbs";
import { Callout } from "@/components/help/Callout";
import { WasThisHelpful } from "@/components/help/WasThisHelpful";
import { StepList } from "@/components/help/StepList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GoalsFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Help Center", href: "/help" },
          { label: "Features", href: "/help/features/dashboard" },
          { label: "Goals", href: "/help/features/goals" },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold mb-2">Give your goal a clear path</h1>
        <p className="text-lg text-muted-foreground">
          A goal tracks progress. An envelope reserves money. Sometimes you need
          both, and sometimes you don’t.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Set up a goal in the new interface</CardTitle>
        </CardHeader>
        <CardContent>
          <StepList
            steps={[
              {
                title: "Choose what you want to accomplish",
                content: (
                  <>
                    <Link href="/new/goals?goal=new" className="underline">
                      Start a new goal
                    </Link>{" "}
                    for debt payoff, a purchase or event, a safety reserve, or
                    retirement.
                  </>
                ),
              },
              {
                title: "Choose where progress comes from",
                content:
                  "Connect the appropriate envelope, bank account, investment, card, or loan. You can reuse an eligible envelope with its existing money and history.",
              },
              {
                title: "Set the target and pace",
                content:
                  "Enter a target amount and an optional date. A debt goal captures the current amount owed and aims for $0. Monthly amounts are plans, not automatic payments or deposits.",
              },
              {
                title: "Review what will change",
                content:
                  "The final step explains whether an envelope will be created, what happens to your monthly plan and Available to save, and how to use the goal. Creating a new envelope starts it at $0.",
              },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pay down a card or loan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Link the debt you want to pay off. Progress follows the reduction
            from its starting balance to the recorded amount still owed.
            Interest and new borrowing can move progress backward. Update
            balances after making a payment at your bank or lender; this app
            does not send payments.
          </p>
          <p>
            You can connect an existing payment envelope to see its balance and
            activity beside the debt, including when editing an existing debt
            goal. Loans and cards excluded from budget totals can also get a
            new, empty payment envelope during setup.
          </p>
          <Callout type="tip" title="Reserved is different from paid off">
            If a goal starts with $8,000 owed, putting $500 in a payment
            envelope leaves $8,000 of debt. After the lender records a $500
            reduction and you update the debt balance to $7,500, progress is
            $500. Interest or new charges may make the actual reduction smaller.
          </Callout>
          <p>
            Cards included in budget totals already reduce Available to save by
            the full amount owed, calculated from credit limit minus available
            credit. A payment envelope is an additional earmark. For these
            cards, exclude payment transfers from imports when their purchases
            are already categorized; update both the paying account and the card
            balance. Release any extra payment-envelope earmark after paying
            instead of also recording that payment as spending.
          </p>
          <p>
            For a debt excluded from budget totals, a payment envelope can
            reserve cash until you pay. Categorize the outgoing payment to that
            envelope once when appropriate for your budget; avoid counting the
            same spending again as card purchases.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Save for a purchase or event</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            A goal envelope counts money still reserved plus net spending
            categorized to it. For example, $700 left for a trip plus a $300
            hotel deposit is $1,000 of progress, with $700 still available to
            spend. Refunds reduce net spending. Moving money to another envelope
            reduces progress.
          </p>
          <p>
            An existing envelope brings its entire transaction history into the
            goal. Choose a new envelope if you want a fresh start. Fund it when
            money is available, then categorize purchases to it during your
            normal imports.
          </p>
          <p>
            You can instead dedicate a whole bank account. Its current balance
            becomes progress and it is excluded from budget totals; no envelope
            is created. Withdrawals reduce that goal’s progress, even when they
            pay for the purchase. Move money at your bank and update both
            account balances.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Build a safety reserve</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Choose an envelope or a dedicated bank account and set the reserve
            you want to maintain. Only money still available in that source
            counts. Earlier spending does not count toward an envelope reserve.
          </p>
          <p>
            When you use the reserve, categorize the expense to its envelope or
            move money to the envelope covering the expense. Progress falls. A
            reached reserve returns to “In progress” if its balance drops below
            the target, so you can refill it.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Save for retirement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            <strong>Investment value:</strong> link an investment already
            recorded in Assets, such as a retirement account. Progress follows
            its current recorded value, including gains, losses, contributions,
            and withdrawals. No envelope is created and spendable budget money
            is unchanged. Update values in{" "}
            <Link href="/non-cash-assets" className="underline">
              Assets
            </Link>
            .
          </p>
          <p>
            <strong>Contributions from take-home pay:</strong> use a dedicated
            envelope for a contribution target or period. Allocate money to it,
            send the contribution to your provider, then categorize the outgoing
            payment to it once. Only net contributions recorded as spending
            count as progress; money still waiting in the envelope is shown
            separately.
          </p>
          <p>
            Payroll deductions already removed before pay reaches your bank
            belong in your{" "}
            <Link href="/new/income" className="underline">
              income plan
            </Link>
            . Do not allocate that money again from your spending budget. Use
            investment-value tracking to follow that retirement account. Goal
            estimates do not forecast market returns or determine how much you
            need to retire.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Keep it part of your routine</CardTitle>
        </CardHeader>
        <CardContent>
          <StepList
            steps={[
              {
                title: "When money arrives",
                content: (
                  <>
                    <Link href="/new/payday" className="underline">
                      Allocate available money
                    </Link>{" "}
                    to your goal or payment envelopes. A monthly target does not
                    prove the envelope has been funded.
                  </>
                ),
              },
              {
                title: "During your weekly review",
                content:
                  "Import and categorize relevant purchases or contributions. Review envelope activity inside the goal to see funding, spending, transfers, and adjustments.",
              },
              {
                title: "During your monthly check-in",
                content:
                  "Review the target, pace, and deadline. Update investment or debt balances where applicable. The “How to use this goal” instructions remain available inside each goal.",
              },
            ]}
          />
        </CardContent>
      </Card>
      <Callout type="tip" title="Existing goals keep their original behavior">
        Existing envelope goals still count money left plus categorized
        spending. They are not automatically converted into safety reserves or
        retirement contribution goals. Pausing tracking does not release money
        or remove an envelope’s funding target.
      </Callout>
      <WasThisHelpful articlePath="/help/features/goals" />
    </div>
  );
}

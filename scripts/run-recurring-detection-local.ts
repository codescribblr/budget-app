/**
 * Run recurring detection locally for a user (service role).
 * Usage: npx tsx scripts/run-recurring-detection-local.ts [email]
 */
import { createClient } from '@supabase/supabase-js';
import { detectRecurringTransactionsFromData } from '../src/lib/recurring-transactions/detect-from-data';
import type { DetectionTransaction } from '../src/lib/recurring-transactions/types';

const email = process.argv[2] || 'jonathanwadsworth+1@gmail.com';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  const { data: userData } = await supabase.auth.admin.listUsers();
  const user = userData?.users.find((u) => u.email === email);
  if (!user) throw new Error(`User not found: ${email}`);

  const { data: budgetAccount } = await supabase
    .from('budget_accounts')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!budgetAccount) throw new Error('No budget account');

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 15);

  let all: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id, date, description, total_amount, transaction_type,
        merchant_group_id, account_id, credit_card_id,
        merchant_groups (display_name),
        transaction_splits (category_id, amount, categories (name, is_system, is_buffer))
      `)
      .eq('user_id', user.id)
      .eq('budget_account_id', budgetAccount.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const mapped: DetectionTransaction[] = all
    .filter((row) => row.merchant_group_id)
    .map((row) => ({
      id: row.id,
      date: row.date,
      description: row.description || '',
      total_amount: Math.abs(row.total_amount),
      transaction_type: row.transaction_type,
      merchant_group_id: row.merchant_group_id,
      merchant_name: row.merchant_groups?.display_name || 'Unknown',
      account_id: row.account_id,
      credit_card_id: row.credit_card_id,
      splits: (row.transaction_splits || []).map((s: any) => ({
        category_id: s.category_id,
        amount: s.amount,
        category_name: s.categories?.name || '',
        is_system: Boolean(s.categories?.is_system),
        is_buffer: Boolean(s.categories?.is_buffer),
      })),
    }));

  const { data: feedback } = await supabase
    .from('recurring_user_feedback')
    .select('merchant_group_id, amount_bucket, frequency, feedback_type')
    .eq('user_id', user.id)
    .eq('budget_account_id', budgetAccount.id);

  const patterns = detectRecurringTransactionsFromData(mapped, {
    userFeedback: (feedback || []) as any,
    lookbackMonths: 15,
  });

  console.log(`\nUser: ${email}`);
  console.log(`Transactions in lookback: ${mapped.length}`);
  console.log(`Patterns detected: ${patterns.length}\n`);

  for (const p of patterns.slice(0, 25)) {
    console.log(
      `- ${p.merchantName.padEnd(28)} ${p.chargeClass.padEnd(14)} conf=${p.confidenceScore.toFixed(2)} n=${p.occurrenceCount} $${p.expectedAmount.toFixed(2)} ${p.frequency}${p.isAmountVariable ? ' (variable)' : ''}`
    );
  }

  if (patterns.length > 25) {
    console.log(`... and ${patterns.length - 25} more`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

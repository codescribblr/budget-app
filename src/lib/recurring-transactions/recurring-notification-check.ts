import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { NotificationService } from '@/lib/notifications/notification-service';
import { createRecurringTransactionNotification } from '@/lib/notifications/helpers';
import { daysBetween, formatDateISO } from './utils/dates';

const GRACE_WINDOW_DAYS = 3;
const MATCH_WINDOW_DAYS = 3;
const REMINDER_LOOKAHEAD_DAYS = 30;

type RecurringRow = {
  id: number;
  user_id: string;
  budget_account_id: number;
  merchant_group_id: number;
  merchant_name: string;
  frequency: string;
  interval: number | null;
  day_of_month: number | null;
  day_of_week: number | null;
  expected_amount: number | null;
  transaction_type: 'income' | 'expense';
  next_expected_date: string;
  last_occurrence_date: string | null;
  occurrence_count: number | null;
  reminder_enabled: boolean;
  reminder_days_before: number | null;
  account_id: number | null;
  credit_card_id: number | null;
  missed_streak: number | null;
  is_amount_variable: boolean | null;
};

export interface RecurringNotificationResult {
  remindersSent: number;
  insufficientFundsSent: number;
  amountChangedSent: number;
  missedSent: number;
  occurrencesResolved: number;
  deactivated: number;
}

function calculateNextExpectedDate(
  lastDate: Date,
  frequency: string,
  interval: number,
  dayOfMonth: number | null,
  dayOfWeek: number | null
): Date {
  const next = new Date(lastDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + interval * 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + interval * 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      if (dayOfMonth !== null) {
        const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(dayOfMonth, lastDayOfMonth));
      }
      break;
    case 'bimonthly':
      next.setMonth(next.getMonth() + interval * 2);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + interval * 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
    default:
      next.setDate(next.getDate() + interval);
      break;
  }

  return next;
}

async function getReminderDays(
  notificationService: NotificationService,
  userId: string,
  rt: RecurringRow
): Promise<number> {
  const preferences = await notificationService.getUserPreferences(
    userId,
    'recurring_transaction_upcoming'
  );
  const fromPrefs = preferences.settings?.reminder_days_before;
  if (typeof fromPrefs === 'number' && fromPrefs >= 0) {
    return fromPrefs;
  }
  return rt.reminder_days_before ?? 2;
}

export function shouldSendUpcomingReminder(daysUntilDue: number, reminderDays: number): boolean {
  return daysUntilDue === reminderDays || daysUntilDue === 0;
}

async function notificationAlreadySent(
  supabase: SupabaseClient,
  userId: string,
  notificationTypeId: string,
  recurringTransactionId: number,
  dedupeKey: string
): Promise<boolean> {
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('notification_type_id', notificationTypeId)
    .eq('metadata->>recurring_transaction_id', String(recurringTransactionId))
    .eq('metadata->>dedupe_key', dedupeKey)
    .maybeSingle();

  return !!data;
}

async function getPaymentSourceBalance(
  supabase: SupabaseClient,
  rt: RecurringRow
): Promise<{ currentBalance: number; hasSufficientFunds: boolean }> {
  const expectedAmount = Math.abs(rt.expected_amount || 0);

  if (rt.account_id) {
    const { data: account } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', rt.account_id)
      .maybeSingle();

    if (account) {
      const currentBalance = Number(account.balance) || 0;
      return {
        currentBalance,
        hasSufficientFunds: currentBalance >= expectedAmount,
      };
    }
  }

  if (rt.credit_card_id) {
    const { data: creditCard } = await supabase
      .from('credit_cards')
      .select('credit_limit, current_balance')
      .eq('id', rt.credit_card_id)
      .maybeSingle();

    if (creditCard) {
      const available =
        Number(creditCard.credit_limit) - Number(creditCard.current_balance);
      return {
        currentBalance: available,
        hasSufficientFunds: available >= expectedAmount,
      };
    }
  }

  return { currentBalance: 0, hasSufficientFunds: true };
}

async function findMatchingTransaction(
  supabase: SupabaseClient,
  rt: RecurringRow,
  expectedDate: string
): Promise<{ id: number; date: string; total_amount: number } | null> {
  const expectedAmount = Math.abs(rt.expected_amount || 0);
  const amountTolerance = Math.max(5, expectedAmount * 0.05);

  const windowStart = new Date(expectedDate);
  windowStart.setDate(windowStart.getDate() - MATCH_WINDOW_DAYS);
  const windowEnd = new Date(expectedDate);
  windowEnd.setDate(windowEnd.getDate() + MATCH_WINDOW_DAYS);

  const { data: candidates } = await supabase
    .from('transactions')
    .select('id, date, total_amount')
    .eq('budget_account_id', rt.budget_account_id)
    .eq('merchant_group_id', rt.merchant_group_id)
    .eq('transaction_type', rt.transaction_type)
    .gte('date', formatDateISO(windowStart))
    .lte('date', formatDateISO(windowEnd));

  if (!candidates?.length) return null;

  const match = candidates.find((txn) => {
    const amount = Math.abs(Number(txn.total_amount));
    return amount >= expectedAmount - amountTolerance &&
      amount <= expectedAmount + amountTolerance;
  });

  return match ?? null;
}

function amountChangedSignificantly(
  expectedAmount: number,
  actualAmount: number,
  isVariable: boolean
): boolean {
  if (isVariable) return false;
  const tolerance = Math.max(5, expectedAmount * 0.05);
  return Math.abs(actualAmount - expectedAmount) > tolerance;
}

export async function processRecurringNotifications(): Promise<RecurringNotificationResult> {
  const supabase = createServiceRoleClient();
  const notificationService = new NotificationService();
  const today = new Date();
  const todayStr = formatDateISO(today);

  const graceDate = new Date(today);
  graceDate.setDate(graceDate.getDate() - GRACE_WINDOW_DAYS);
  const graceDateStr = formatDateISO(graceDate);

  const result: RecurringNotificationResult = {
    remindersSent: 0,
    insufficientFundsSent: 0,
    amountChangedSent: 0,
    missedSent: 0,
    occurrencesResolved: 0,
    deactivated: 0,
  };

  const { data: activeRecurring, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('is_active', true)
    .not('next_expected_date', 'is', null);

  if (error) {
    throw new Error(error.message);
  }

  for (const rt of (activeRecurring || []) as RecurringRow[]) {
    try {
      const daysUntilDue = daysBetween(todayStr, rt.next_expected_date);
      const expectedAmount = Math.abs(rt.expected_amount || 0);

      // --- Due or overdue: resolve occurrences, amount changes, missed ---
      if (daysUntilDue <= 0) {
        const match = await findMatchingTransaction(supabase, rt, rt.next_expected_date);

        if (match) {
          const matchedAmount = Math.abs(Number(match.total_amount));

          if (
            amountChangedSignificantly(expectedAmount, matchedAmount, rt.is_amount_variable ?? false)
          ) {
            const dedupeKey = `amount_changed:${rt.next_expected_date}:${expectedAmount}:${matchedAmount}`;
            if (
              !(await notificationAlreadySent(
                supabase,
                rt.user_id,
                'recurring_transaction_amount_changed',
                rt.id,
                dedupeKey
              ))
            ) {
              await createRecurringTransactionNotification(
                rt.user_id,
                rt.budget_account_id,
                rt.id,
                'amount_changed',
                {
                  merchantName: rt.merchant_name,
                  expectedAmount: matchedAmount,
                  oldAmount: expectedAmount,
                  newAmount: matchedAmount,
                  dedupeKey,
                }
              );
              result.amountChangedSent++;
            }

            await supabase
              .from('recurring_transactions')
              .update({
                expected_amount: matchedAmount,
                updated_at: new Date().toISOString(),
              })
              .eq('id', rt.id);
          }

          const nextDate = calculateNextExpectedDate(
            new Date(match.date),
            rt.frequency,
            rt.interval || 1,
            rt.day_of_month,
            rt.day_of_week
          );

          await supabase
            .from('recurring_transactions')
            .update({
              missed_streak: 0,
              last_missed_date: null,
              last_occurrence_date: match.date,
              occurrence_count: (rt.occurrence_count || 0) + 1,
              next_expected_date: formatDateISO(nextDate),
              updated_at: new Date().toISOString(),
            })
            .eq('id', rt.id);

          result.occurrencesResolved++;
          continue;
        }

        // No match and past grace window → missed handling
        if (rt.next_expected_date <= graceDateStr) {
          const currentStreak = rt.missed_streak || 0;
          const newStreak = currentStreak + 1;

          if (currentStreak === 0) {
            const dedupeKey = `missed:${rt.next_expected_date}`;
            if (
              !(await notificationAlreadySent(
                supabase,
                rt.user_id,
                'recurring_transaction_missed',
                rt.id,
                dedupeKey
              ))
            ) {
              await createRecurringTransactionNotification(
                rt.user_id,
                rt.budget_account_id,
                rt.id,
                'missed',
                {
                  merchantName: rt.merchant_name,
                  expectedAmount,
                  expectedDate: rt.next_expected_date,
                  dedupeKey,
                }
              );
              result.missedSent++;
            }
          }

          if (newStreak >= 2) {
            await supabase
              .from('recurring_transactions')
              .update({
                is_active: false,
                missed_streak: newStreak,
                last_missed_date: rt.next_expected_date,
                status_reason: 'missed_twice',
                updated_at: new Date().toISOString(),
              })
              .eq('id', rt.id);
            result.deactivated++;
          } else {
            await supabase
              .from('recurring_transactions')
              .update({
                missed_streak: newStreak,
                last_missed_date: rt.next_expected_date,
                updated_at: new Date().toISOString(),
              })
              .eq('id', rt.id);
          }
        }

        continue;
      }

      // --- Upcoming reminders ---
      if (!rt.reminder_enabled || daysUntilDue > REMINDER_LOOKAHEAD_DAYS) {
        continue;
      }

      const reminderDays = await getReminderDays(notificationService, rt.user_id, rt);
      if (!shouldSendUpcomingReminder(daysUntilDue, reminderDays)) {
        continue;
      }

      const reminderKind = daysUntilDue === 0 ? 'due_today' : `advance_${reminderDays}`;
      const upcomingDedupeKey = `upcoming:${rt.next_expected_date}:${reminderKind}`;

      if (
        !(await notificationAlreadySent(
          supabase,
          rt.user_id,
          'recurring_transaction_upcoming',
          rt.id,
          upcomingDedupeKey
        ))
      ) {
        await createRecurringTransactionNotification(
          rt.user_id,
          rt.budget_account_id,
          rt.id,
          'upcoming',
          {
            merchantName: rt.merchant_name,
            expectedAmount,
            dueDate: rt.next_expected_date,
            daysUntilDue,
            dedupeKey: upcomingDedupeKey,
          }
        );
        result.remindersSent++;
      }

      if (rt.transaction_type === 'expense') {
        const { currentBalance, hasSufficientFunds } = await getPaymentSourceBalance(
          supabase,
          rt
        );

        if (!hasSufficientFunds) {
          const insufficientDedupeKey = `insufficient:${rt.next_expected_date}:${reminderKind}`;
          if (
            !(await notificationAlreadySent(
              supabase,
              rt.user_id,
              'recurring_transaction_insufficient_funds',
              rt.id,
              insufficientDedupeKey
            ))
          ) {
            await createRecurringTransactionNotification(
              rt.user_id,
              rt.budget_account_id,
              rt.id,
              'insufficient_funds',
              {
                merchantName: rt.merchant_name,
                expectedAmount,
                dueDate: rt.next_expected_date,
                currentBalance,
                shortfall: expectedAmount - currentBalance,
                dedupeKey: insufficientDedupeKey,
              }
            );
            result.insufficientFundsSent++;
          }
        }
      }
    } catch (error) {
      console.error(`Error processing recurring notifications for ${rt.id}:`, error);
    }
  }

  return result;
}

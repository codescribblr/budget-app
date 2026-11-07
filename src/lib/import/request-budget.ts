import {NextResponse} from 'next/server';
import {getActiveAccountId} from '../account-context';

// Optional for older callers; batched clients pin this once before sending any
// chunk so a cookie changed by another tab cannot move later rows to a new budget.
export async function checkImportBudget(sourceBudgetId: unknown) {
  if(sourceBudgetId===undefined)return null;
  if(!Number.isSafeInteger(sourceBudgetId) || sourceBudgetId!==await getActiveAccountId()){
    return NextResponse.json({error:'The active budget changed. Reload this review before importing more rows.',code:'BUDGET_CHANGED'},{status:409});
  }
  return null;
}

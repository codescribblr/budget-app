/**
 * Rebuild category balance audit trails so they reconcile with envelope balances.
 *
 * This script:
 * - Leaves category current_balance values untouched
 * - Rebuilds audit history from current transactions + preserved non-transaction audit events
 * - Adds an opening audit_backfill entry when needed so the final audit balance matches current_balance
 *
 * Usage:
 *   npx tsx scripts/backfill-category-balance-audit.ts --account-ref=YOUR-UUID
 *   npx tsx scripts/backfill-category-balance-audit.ts --account-ref=YOUR-UUID --category-id=456
 *   npx tsx scripts/backfill-category-balance-audit.ts --account-ref=YOUR-UUID --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { rebuildCategoryBalanceAudit } from '../src/lib/audit/rebuild-category-balance-audit';
import { resolveBudgetAccountReference } from '../src/lib/budget-account-public-id';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Run with: set -a && source .env.local && set +a && npm run backfill:category-audit -- --account-ref=...');
  process.exit(1);
}

function parseArgs(argv: string[]) {
  let accountRef: string | undefined;
  let categoryId: number | undefined;
  let dryRun = false;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('--account-ref=')) {
      accountRef = arg.replace('--account-ref=', '').trim();
      continue;
    }
    if (arg.startsWith('--account-id=')) {
      accountRef = arg.replace('--account-id=', '').trim();
      continue;
    }
    if (arg.startsWith('--category-id=')) {
      categoryId = parseInt(arg.replace('--category-id=', ''), 10);
      continue;
    }
  }

  if (!accountRef) {
    console.error(
      'Usage: npx tsx scripts/backfill-category-balance-audit.ts --account-ref=YOUR-UUID [--category-id=456] [--dry-run]'
    );
    console.error('Find your account reference in Settings → Account.');
    process.exit(1);
  }

  if (categoryId !== undefined && Number.isNaN(categoryId)) {
    console.error('Invalid --category-id value');
    process.exit(1);
  }

  return { accountRef, categoryId, dryRun };
}

async function main() {
  const { accountRef, categoryId, dryRun } = parseArgs(process.argv.slice(2));
  const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

  const accountId = await resolveBudgetAccountReference(supabase, accountRef);
  if (!accountId) {
    console.error(`No budget account found for reference: ${accountRef}`);
    process.exit(1);
  }

  console.log(`Rebuilding category balance audit trails for account ${accountRef}${categoryId ? ` (category ${categoryId})` : ''}`);
  console.log(dryRun ? 'DRY RUN - no database changes will be made\n' : 'LIVE RUN - audit trails will be rebuilt\n');

  const result = await rebuildCategoryBalanceAudit(supabase, {
    accountId,
    categoryId,
    dryRun,
  });

  console.log(`Processed: ${result.categoriesProcessed}`);
  console.log(`Rebuilt:   ${result.categoriesRebuilt}`);
  console.log(`Skipped:   ${result.categoriesSkipped}\n`);

  for (const detail of result.details) {
    const status = detail.rebuilt ? 'REBUILT' : 'SKIPPED';
    console.log(`[${status}] ${detail.categoryName} (#${detail.categoryId})`);
    console.log(`  Envelope balance:      $${detail.currentBalance.toFixed(2)}`);
    console.log(`  Previous audit ending:   ${detail.previousAuditBalance === null ? 'none' : `$${detail.previousAuditBalance.toFixed(2)}`}`);
    console.log(`  Audit records:         ${detail.previousAuditCount} -> ${detail.newAuditCount}`);
    console.log(`  Transaction events:    ${detail.transactionEventCount}`);
    console.log(`  Preserved events:      ${detail.preservedEventCount}`);
    console.log(`  Opening backfill:      $${detail.openingBackfillAmount.toFixed(2)}`);
    if (detail.skippedReason) {
      console.log(`  Reason:                ${detail.skippedReason}`);
    }
    console.log('');
  }

  if (dryRun && result.categoriesRebuilt > 0) {
    console.log('Run again without --dry-run to apply these changes.');
  }
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});

/**
 * Insert missing reverse audit entries for recategorizations that happened
 * before updateTransaction logged the source category side of the change.
 *
 * Usage:
 *   npx tsx scripts/repair-category-audit-recategorizations.ts --account-ref=YOUR-UUID --dry-run
 *   npx tsx scripts/repair-category-audit-recategorizations.ts --account-ref=YOUR-UUID --category-id=123
 */

import { createClient } from '@supabase/supabase-js';
import { resolveBudgetAccountReference } from '../src/lib/budget-account-public-id';
import {
  categoryAuditTrailEndsAtCurrentBalance,
  repairMissingRecategorizationAudits,
} from '../src/lib/audit/repair-missing-recategorization-audits';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error(
    'Run with: set -a && source .env.local && set +a && npm run repair:category-audit-recategorizations -- --account-ref=... --dry-run'
  );
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
      'Usage: npx tsx scripts/repair-category-audit-recategorizations.ts --account-ref=YOUR-UUID [--category-id=123] [--dry-run]'
    );
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

  console.log(
    `Repairing missing recategorization audit entries for account ${accountRef}${
      categoryId ? ` (category ${categoryId})` : ''
    }`
  );
  console.log(
    dryRun ? 'DRY RUN - no database changes will be made\n' : 'LIVE RUN - missing reverse entries will be inserted\n'
  );

  const result = await repairMissingRecategorizationAudits(supabase, {
    accountId,
    categoryId,
    dryRun,
  });

  console.log(`Apply entries scanned: ${result.applyEntriesScanned}`);
  console.log(`Missing reverse entries: ${result.repairsFound}`);
  if (!dryRun) {
    console.log(`Inserted: ${result.repairsInserted}`);
  }
  console.log('');

  for (const repair of result.repairs) {
    console.log(
      `[${dryRun ? 'WOULD INSERT' : 'INSERTED'}] ${repair.sourceCategoryName} (#${repair.sourceCategoryId})`
    );
    console.log(`  Transaction:           ${repair.transactionDescription ?? `#${repair.transactionId}`}`);
    console.log(`  Moved to:              ${repair.destinationCategoryName} (#${repair.destinationCategoryId})`);
    console.log(`  Reverse balance change ${repair.oldBalance.toFixed(2)} -> ${repair.newBalance.toFixed(2)} (${repair.changeAmount >= 0 ? '+' : ''}${repair.changeAmount.toFixed(2)})`);
    console.log(`  Timestamp:             ${repair.createdAt}`);
    console.log(`  Based on apply audit:  #${repair.applyAuditId}`);
    console.log(`  Based on charge audit: #${repair.chargeAuditId}`);
    console.log('');
  }

  if (categoryId !== undefined) {
    const trail = await categoryAuditTrailEndsAtCurrentBalance(
      supabase,
      accountId,
      categoryId
    );
    console.log('Category trail check:');
    console.log(`  Current balance:       $${trail.currentBalance.toFixed(2)}`);
    console.log(
      `  Latest audit balance:  ${
        trail.latestAuditBalance === null ? 'none' : `$${trail.latestAuditBalance.toFixed(2)}`
      }`
    );
    console.log(`  Matches:               ${trail.matches ? 'yes' : 'no'}`);
  }

  if (dryRun && result.repairsFound > 0) {
    console.log('Run again without --dry-run to apply these changes.');
  }
}

main().catch((error) => {
  console.error('Repair failed:', error);
  process.exit(1);
});

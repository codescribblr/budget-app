import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';
import { syncTransactionsForPatterns } from '@/lib/db/sync-merchant-groups';

/**
 * POST /api/admin/global-merchants/backfill-transactions
 * Backfill transactions without merchant_group_id by matching their descriptions
 * to patterns in global_merchant_patterns
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // Get all transactions without merchant_group_id
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, description, user_id, budget_account_id, merchant_override_id')
      .is('merchant_group_id', null)
      .is('merchant_override_id', null); // Skip transactions with user overrides

    if (transactionsError) throw transactionsError;
    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        transactions_processed: 0,
        transactions_linked: 0,
        groups_created: 0,
        message: 'No transactions found without merchant_group_id',
      });
    }

    // Get all active global merchants first
    const { data: activeMerchants, error: merchantsError } = await supabase
      .from('global_merchants')
      .select('id')
      .eq('status', 'active');

    if (merchantsError) throw merchantsError;
    if (!activeMerchants || activeMerchants.length === 0) {
      return NextResponse.json({
        success: true,
        transactions_processed: transactions.length,
        transactions_linked: 0,
        groups_created: 0,
        message: 'No active global merchants found',
      });
    }

    const activeMerchantIds = activeMerchants.map(m => m.id);

    // Get all patterns for active merchants
    const { data: patterns, error: patternsError } = await supabase
      .from('global_merchant_patterns')
      .select('id, pattern, normalized_pattern, global_merchant_id')
      .in('global_merchant_id', activeMerchantIds);

    if (patternsError) throw patternsError;
    if (!patterns || patterns.length === 0) {
      return NextResponse.json({
        success: true,
        transactions_processed: transactions.length,
        transactions_linked: 0,
        groups_created: 0,
        message: 'No global merchant patterns found',
      });
    }

    // Build pattern lookup maps
    const patternToMerchantId = new Map<string, number>();
    const normalizedPatternToMerchantId = new Map<string, number>();
    const patternIdsByMerchant = new Map<number, number[]>();

    patterns.forEach((p: any) => {
      if (p.global_merchant_id) {
        patternToMerchantId.set(p.pattern, p.global_merchant_id);
        normalizedPatternToMerchantId.set(p.normalized_pattern, p.global_merchant_id);
        
        if (!patternIdsByMerchant.has(p.global_merchant_id)) {
          patternIdsByMerchant.set(p.global_merchant_id, []);
        }
        patternIdsByMerchant.get(p.global_merchant_id)!.push(p.id);
      }
    });

    // Group transactions by matching merchant
    const transactionsByMerchant = new Map<number, typeof transactions>();
    let matchedCount = 0;

    transactions.forEach((tx) => {
      // Check exact pattern match first
      let merchantId = patternToMerchantId.get(tx.description);
      
      // If no exact match, try normalized pattern
      if (!merchantId) {
        const normalized = tx.description.toLowerCase().trim().replace(/\s+/g, ' ');
        merchantId = normalizedPatternToMerchantId.get(normalized);
      }

      if (merchantId) {
        if (!transactionsByMerchant.has(merchantId)) {
          transactionsByMerchant.set(merchantId, []);
        }
        transactionsByMerchant.get(merchantId)!.push(tx);
        matchedCount++;
      }
    });

    if (matchedCount === 0) {
      return NextResponse.json({
        success: true,
        transactions_processed: transactions.length,
        transactions_linked: 0,
        groups_created: 0,
        message: 'No transactions matched any global merchant patterns',
      });
    }

    // Process each merchant's transactions
    let totalTransactionsLinked = 0;
    let totalGroupsCreated = 0;

    for (const [merchantId, merchantTransactions] of transactionsByMerchant.entries()) {
      // Get pattern IDs for this merchant
      const patternIds = patternIdsByMerchant.get(merchantId) || [];
      
      if (patternIds.length === 0) continue;

      // Use the existing sync function to create groups and link transactions
      try {
        const syncResult = await syncTransactionsForPatterns(patternIds, merchantId);
        totalTransactionsLinked += syncResult.transactionsUpdated;
        totalGroupsCreated += syncResult.groupsCreated;
      } catch (syncError: any) {
        console.error(`Error syncing transactions for merchant ${merchantId}:`, syncError);
        // Continue with next merchant
      }
    }

    return NextResponse.json({
      success: true,
      transactions_processed: transactions.length,
      transactions_matched: matchedCount,
      transactions_linked: totalTransactionsLinked,
      groups_created: totalGroupsCreated,
      message: `Processed ${transactions.length} transactions, linked ${totalTransactionsLinked} to merchant groups`,
    });
  } catch (error: any) {
    console.error('Error backfilling transactions:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to backfill transactions', details: error.message },
      { status: 500 }
    );
  }
}

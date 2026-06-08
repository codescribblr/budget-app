import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/global-merchants/patterns/ungroup
 * Ungroup patterns from a merchant (admin only)
 * Also updates transactions to remove merchant_group_id for matching patterns
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const body = await request.json();
    const { pattern_ids } = body;
    
    if (!Array.isArray(pattern_ids) || pattern_ids.length === 0) {
      return NextResponse.json(
        { error: 'Pattern IDs array is required' },
        { status: 400 }
      );
    }
    
    // Get patterns before ungrouping to get their patterns and merchant info
    const { data: patterns, error: patternsError } = await supabase
      .from('global_merchant_patterns')
      .select('id, pattern, normalized_pattern, global_merchant_id')
      .in('id', pattern_ids);
    
    if (patternsError) throw patternsError;
    if (!patterns || patterns.length === 0) {
      return NextResponse.json({ success: true, transactionsUpdated: 0 });
    }
    
    // Get unique merchant IDs to find merchant groups
    const merchantIds = [...new Set(patterns.map(p => p.global_merchant_id).filter(Boolean))];
    
    // Update patterns to unlink from merchant
    const { error: updateError } = await supabase
      .from('global_merchant_patterns')
      .update({ global_merchant_id: null })
      .in('id', pattern_ids);
    
    if (updateError) throw updateError;
    
    // Sync transactions: remove merchant_group_id for transactions matching these patterns
    let transactionsUpdated = 0;
    
    if (merchantIds.length > 0) {
      // Get merchant groups linked to these global merchants
      const { data: merchantGroups, error: groupsError } = await supabase
        .from('merchant_groups')
        .select('id, global_merchant_id, user_id, account_id')
        .in('global_merchant_id', merchantIds);
      
      if (groupsError) {
        console.error('Error fetching merchant groups:', groupsError);
      } else if (merchantGroups && merchantGroups.length > 0) {
        // Group merchant groups by user/account
        const groupsByUserAccount = new Map<string, Set<number>>();
        for (const group of merchantGroups) {
          const key = `${group.user_id}:${group.account_id}`;
          if (!groupsByUserAccount.has(key)) {
            groupsByUserAccount.set(key, new Set());
          }
          groupsByUserAccount.get(key)!.add(group.id);
        }
        
        // Get pattern strings for matching
        const patternSet = new Set(patterns.map(p => p.pattern));
        const normalizedPatternSet = new Set(patterns.map(p => p.normalized_pattern));
        
        // Process each user/account combination
        for (const [userAccountKey, groupIds] of groupsByUserAccount.entries()) {
          const [userId, accountIdStr] = userAccountKey.split(':');
          const accountId = parseInt(accountIdStr);
          
          // Get transactions for this user/account that match patterns and have merchant_group_id in groupIds
          const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('id, description, merchant_group_id, merchant_override_id')
            .eq('user_id', userId)
            .eq('budget_account_id', accountId)
            .in('merchant_group_id', Array.from(groupIds))
            .is('merchant_override_id', null); // Don't update transactions with overrides
          
          if (txError) {
            console.error(`Error fetching transactions for user ${userId}:`, txError);
            continue;
          }
          
          if (transactions && transactions.length > 0) {
            // Filter transactions that match the patterns
            const matchingTransactions = transactions.filter(tx => {
              if (patternSet.has(tx.description)) return true;
              const normalized = tx.description.toLowerCase().trim().replace(/\s+/g, ' ');
              return normalizedPatternSet.has(normalized);
            });
            
            if (matchingTransactions.length > 0) {
              const transactionIds = matchingTransactions.map(tx => tx.id);
              
              // Remove merchant_group_id from matching transactions
              const { error: updateTxError } = await supabase
                .from('transactions')
                .update({ merchant_group_id: null })
                .in('id', transactionIds);
              
              if (updateTxError) {
                console.error(`Error updating transactions for user ${userId}:`, updateTxError);
              } else {
                transactionsUpdated += transactionIds.length;
              }
            }
          }
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      transactionsUpdated 
    });
  } catch (error: any) {
    console.error('Error ungrouping patterns:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to ungroup patterns' },
      { status: 500 }
    );
  }
}

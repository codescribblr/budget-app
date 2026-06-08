import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/global-merchants/[id]/merge
 * Merge a source global merchant into a target global merchant (admin only)
 * This will:
 * 1. Move all patterns from source to target
 * 2. Update all user merchant groups linked to source to link to target
 * 3. Sync transactions for affected patterns
 * 4. Delete the source merchant
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { id } = await params;
    const sourceMerchantId = parseInt(id);
    
    if (isNaN(sourceMerchantId)) {
      return NextResponse.json(
        { error: 'Invalid source merchant ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { target_merchant_id } = body;

    if (!target_merchant_id || typeof target_merchant_id !== 'number') {
      return NextResponse.json(
        { error: 'target_merchant_id is required' },
        { status: 400 }
      );
    }

    if (sourceMerchantId === target_merchant_id) {
      return NextResponse.json(
        { error: 'Source and target merchants must be different' },
        { status: 400 }
      );
    }

    // Verify both merchants exist
    const { data: sourceMerchant, error: sourceError } = await supabase
      .from('global_merchants')
      .select('id, display_name')
      .eq('id', sourceMerchantId)
      .single();

    if (sourceError || !sourceMerchant) {
      return NextResponse.json(
        { error: 'Source merchant not found' },
        { status: 404 }
      );
    }

    const { data: targetMerchant, error: targetError } = await supabase
      .from('global_merchants')
      .select('id, display_name, status')
      .eq('id', target_merchant_id)
      .single();

    if (targetError || !targetMerchant) {
      return NextResponse.json(
        { error: 'Target merchant not found' },
        { status: 404 }
      );
    }

    // Get all patterns from source merchant
    const { data: sourcePatterns, error: patternsError } = await supabase
      .from('global_merchant_patterns')
      .select('id, pattern')
      .eq('global_merchant_id', sourceMerchantId);

    if (patternsError) throw patternsError;

    const patternIds: number[] = [];
    
    // Move all patterns to target merchant
    if (sourcePatterns && sourcePatterns.length > 0) {
      const patternIdsToMove = sourcePatterns.map(p => p.id);
      
      const { error: updatePatternsError } = await supabase
        .from('global_merchant_patterns')
        .update({ global_merchant_id: target_merchant_id })
        .in('id', patternIdsToMove);

      if (updatePatternsError) throw updatePatternsError;
      
      patternIds.push(...patternIdsToMove);
    }

    // Update all user merchant groups linked to source merchant to link to target merchant
    const { data: userGroups, error: userGroupsError } = await supabase
      .from('merchant_groups')
      .select('id, user_id, account_id')
      .eq('global_merchant_id', sourceMerchantId);

    if (userGroupsError) throw userGroupsError;

    if (userGroups && userGroups.length > 0) {
      // Process each user group individually to handle potential conflicts
      for (const userGroup of userGroups) {
        // Check if user already has a group linked to target merchant
        const { data: existingTargetGroup } = await supabase
          .from('merchant_groups')
          .select('id')
          .eq('user_id', userGroup.user_id)
          .eq('account_id', userGroup.account_id)
          .eq('global_merchant_id', target_merchant_id)
          .neq('id', userGroup.id)
          .maybeSingle();

        if (existingTargetGroup) {
          // User already has a group linked to target merchant
          // Update transactions to point to the existing group and delete the old one
          const { error: updateTxError } = await supabase
            .from('transactions')
            .update({ merchant_group_id: existingTargetGroup.id })
            .eq('merchant_group_id', userGroup.id);

          if (updateTxError) {
            console.error(`Error updating transactions for user group ${userGroup.id}:`, updateTxError);
          }

          // Delete the old group (no longer needed)
          await supabase
            .from('merchant_groups')
            .delete()
            .eq('id', userGroup.id);
        } else {
          // No existing group - update this one to link to target merchant
          // Don't update display_name to avoid unique constraint violations
          // The sync function will handle display_name updates when it runs
          const { error: updateGroupError } = await supabase
            .from('merchant_groups')
            .update({ global_merchant_id: target_merchant_id })
            .eq('id', userGroup.id);

          if (updateGroupError) {
            console.error(`Error updating user group ${userGroup.id}:`, updateGroupError);
          }
        }
      }
    }

    // Sync transactions for the merged patterns
    if (patternIds.length > 0) {
      try {
        const { syncTransactionsForPatterns } = await import('@/lib/db/sync-merchant-groups');
        await syncTransactionsForPatterns(patternIds, target_merchant_id);
      } catch (syncError) {
        console.error('Error syncing transactions after merge:', syncError);
        // Don't fail the request - patterns and groups are already merged
      }
    }

    // Delete the source merchant (patterns are already moved, user groups are updated)
    const { error: deleteError } = await supabase
      .from('global_merchants')
      .delete()
      .eq('id', sourceMerchantId);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      source_merchant: sourceMerchant,
      target_merchant: targetMerchant,
      patterns_moved: sourcePatterns?.length || 0,
      user_groups_updated: userGroups?.length || 0,
    });
  } catch (error: any) {
    console.error('Error merging global merchants:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to merge merchants' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/admin/merchant-recommendations/[id]
 * Review a merchant recommendation (admin only)
 * Actions: approve, approve_rename, deny, merge
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAdmin();
    const supabase = await createClient();
    const { id } = await params;
    const recommendationId = parseInt(id);
    
    if (isNaN(recommendationId)) {
      return NextResponse.json({ error: 'Invalid recommendation ID' }, { status: 400 });
    }

    const body = await request.json();
    const { action, merchant_name, merchant_id, admin_notes, patterns } = body;

    if (!action || !['approve', 'approve_rename', 'deny', 'merge'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action is required (approve, approve_rename, deny, merge)' },
        { status: 400 }
      );
    }

    // Get the recommendation with patterns
    const { data: recommendation, error: fetchError } = await supabase
      .from('merchant_recommendations')
      .select(`
        *,
        merchant_recommendation_patterns (
          pattern
        )
      `)
      .eq('id', recommendationId)
      .single();

    if (fetchError || !recommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      );
    }

    // Note: We only fetch pending recommendations, so this check is redundant but kept for safety

    // Get all patterns from the recommendation
    const allRecommendationPatterns = (recommendation.merchant_recommendation_patterns || []).map((p: any) => p.pattern);
    const defaultPatterns = allRecommendationPatterns.length > 0 ? allRecommendationPatterns : [recommendation.pattern];
    
    // Use provided patterns if specified, otherwise use all patterns (backward compatible)
    const patternsToProcess = patterns && Array.isArray(patterns) && patterns.length > 0
      ? patterns.filter((p: string) => defaultPatterns.includes(p)) // Only allow patterns that exist in the recommendation
      : defaultPatterns;
    
    if (patternsToProcess.length === 0) {
      return NextResponse.json(
        { error: 'At least one pattern must be included' },
        { status: 400 }
      );
    }

    if (action === 'approve' || action === 'approve_rename') {
      // Check for duplicate merchant name
      const merchantDisplayName = action === 'approve_rename' && merchant_name 
        ? merchant_name.trim() 
        : recommendation.suggested_merchant_name.trim();

      const { data: existingMerchant } = await supabase
        .from('global_merchants')
        .select('id')
        .eq('display_name', merchantDisplayName)
        .maybeSingle();

      if (existingMerchant) {
        return NextResponse.json(
          { error: `Merchant "${merchantDisplayName}" already exists. Use "merge" action instead.` },
          { status: 400 }
        );
      }

      // Create new global merchant
      const { data: newMerchant, error: createError } = await supabase
        .from('global_merchants')
        .insert({
          display_name: merchantDisplayName,
          status: 'active',
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Group all patterns under the new merchant and collect pattern IDs
      const patternIds: number[] = [];
      try {
        for (const pattern of patternsToProcess) {
          // Find or create pattern in global_merchant_patterns
          const { data: existingPattern } = await supabase
            .from('global_merchant_patterns')
            .select('id')
            .eq('pattern', pattern)
            .maybeSingle();

          let patternId: number | null = null;
          if (existingPattern) {
            patternId = existingPattern.id;
            await supabase
              .from('global_merchant_patterns')
              .update({ global_merchant_id: newMerchant.id })
              .eq('id', existingPattern.id);
          } else {
            // Pattern should exist (created by trigger), but handle gracefully
            const normalized = pattern.toLowerCase().trim().replace(/\s+/g, ' ');
            // Try insert first, handle conflict if pattern already exists
            const { data: insertedPattern, error: insertError } = await supabase
              .from('global_merchant_patterns')
              .insert({
                pattern,
                normalized_pattern: normalized,
                global_merchant_id: newMerchant.id,
              })
              .select('id')
              .maybeSingle();

            if (insertError) {
              // Pattern might already exist - try to get it and update
              const { data: existingPatternAfterConflict } = await supabase
                .from('global_merchant_patterns')
                .select('id')
                .eq('pattern', pattern)
                .maybeSingle();
              
              if (existingPatternAfterConflict) {
                patternId = existingPatternAfterConflict.id;
                await supabase
                  .from('global_merchant_patterns')
                  .update({ global_merchant_id: newMerchant.id })
                  .eq('id', patternId);
              }
            } else {
              patternId = insertedPattern?.id || null;
            }
          }
          if (patternId) patternIds.push(patternId);
        }

        // Sync transactions for the grouped patterns
        if (patternIds.length > 0) {
          try {
            const { syncTransactionsForPatterns } = await import('@/lib/db/sync-merchant-groups');
            await syncTransactionsForPatterns(patternIds, newMerchant.id);
          } catch (syncError) {
            console.error('Error syncing transactions after approval:', syncError);
            // Don't fail the request - merchant is created and patterns are grouped
          }
        }
      } catch (patternError) {
        console.error('Error processing patterns:', patternError);
        // Continue to delete recommendation even if pattern processing had errors
      }

      // Always delete recommendation after processing (cascade will delete merchant_recommendation_patterns)
      // Patterns that weren't included remain ungrouped in global_merchant_patterns
      const { error: deleteError, data: deleteData } = await supabase
        .from('merchant_recommendations')
        .delete()
        .eq('id', recommendationId)
        .select();
      
      if (deleteError) {
        console.error(`Error deleting recommendation ${recommendationId}:`, deleteError);
        throw deleteError; // Throw error so it's caught and logged properly
      }
      
      if (!deleteData || deleteData.length === 0) {
        console.warn(`Recommendation ${recommendationId} was not found for deletion (may have already been deleted)`);
      } else {
        console.log(`Successfully deleted recommendation ${recommendationId}`);
      }

      return NextResponse.json({ 
        success: true, 
        merchant: newMerchant,
        patterns_grouped: patternIds.length 
      });

    } else if (action === 'merge') {
      if (!merchant_id) {
        return NextResponse.json(
          { error: 'merchant_id is required for merge action' },
          { status: 400 }
        );
      }

      // Verify merchant exists
      const { data: existingMerchant } = await supabase
        .from('global_merchants')
        .select('id, display_name')
        .eq('id', merchant_id)
        .single();

      if (!existingMerchant) {
        return NextResponse.json(
          { error: 'Merchant not found' },
          { status: 404 }
        );
      }

      // Merge all patterns into the existing merchant
      const patternIds: number[] = [];
      try {
        for (const pattern of patternsToProcess) {
          const { data: existingPattern } = await supabase
            .from('global_merchant_patterns')
            .select('id, global_merchant_id')
            .eq('pattern', pattern)
            .maybeSingle();

          let patternId: number | null = null;
          if (existingPattern) {
            patternId = existingPattern.id;
            // If pattern is already grouped to a different merchant, admin can choose to move it
            if (existingPattern.global_merchant_id && existingPattern.global_merchant_id !== merchant_id) {
              // Move pattern to the selected merchant
              await supabase
                .from('global_merchant_patterns')
                .update({ global_merchant_id: merchant_id })
                .eq('id', existingPattern.id);
            } else {
              // Update to selected merchant
              await supabase
                .from('global_merchant_patterns')
                .update({ global_merchant_id: merchant_id })
                .eq('id', existingPattern.id);
            }
          } else {
            // Create pattern and link to merchant
            const normalized = pattern.toLowerCase().trim().replace(/\s+/g, ' ');
            const { data: insertedPattern, error: insertError } = await supabase
              .from('global_merchant_patterns')
              .insert({
                pattern,
                normalized_pattern: normalized,
                global_merchant_id: merchant_id,
              })
              .select('id')
              .maybeSingle();

            if (insertError) {
              // Pattern might already exist - try to get it and update
              const { data: existingPatternAfterConflict } = await supabase
                .from('global_merchant_patterns')
                .select('id')
                .eq('pattern', pattern)
                .maybeSingle();
              
              if (existingPatternAfterConflict) {
                patternId = existingPatternAfterConflict.id;
                await supabase
                  .from('global_merchant_patterns')
                  .update({ global_merchant_id: merchant_id })
                  .eq('id', patternId);
              }
            } else {
              patternId = insertedPattern?.id || null;
            }
          }
          if (patternId) patternIds.push(patternId);
        }

        // Sync transactions for the merged patterns
        if (patternIds.length > 0) {
          try {
            const { syncTransactionsForPatterns } = await import('@/lib/db/sync-merchant-groups');
            await syncTransactionsForPatterns(patternIds, merchant_id);
          } catch (syncError) {
            console.error('Error syncing transactions after merge:', syncError);
            // Don't fail the request - patterns are merged
          }
        }
      } catch (patternError) {
        console.error('Error processing patterns:', patternError);
        // Continue to delete recommendation even if pattern processing had errors
      }

      // Always delete recommendation after processing (cascade will delete merchant_recommendation_patterns)
      // Patterns that weren't included remain ungrouped in global_merchant_patterns
      const { error: deleteError, data: deleteData } = await supabase
        .from('merchant_recommendations')
        .delete()
        .eq('id', recommendationId)
        .select();
      
      if (deleteError) {
        console.error('Error deleting recommendation:', deleteError);
        throw deleteError; // Throw error so it's caught and logged properly
      }
      
      if (!deleteData || deleteData.length === 0) {
        console.warn(`Recommendation ${recommendationId} was not found for deletion (may have already been deleted)`);
      } else {
        console.log(`Successfully deleted recommendation ${recommendationId}`);
      }

      return NextResponse.json({ 
        success: true, 
        merchant: existingMerchant,
        patterns_merged: patternIds.length 
      });

    } else if (action === 'deny') {
      // Delete recommendation after denying (cascade will delete merchant_recommendation_patterns)
      const { error: deleteError, data: deleteData } = await supabase
        .from('merchant_recommendations')
        .delete()
        .eq('id', recommendationId)
        .select();
      
      if (deleteError) {
        console.error(`Error deleting recommendation ${recommendationId}:`, deleteError);
        throw deleteError;
      }
      
      if (!deleteData || deleteData.length === 0) {
        console.warn(`Recommendation ${recommendationId} was not found for deletion (may have already been deleted)`);
      } else {
        console.log(`Successfully deleted recommendation ${recommendationId}`);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error reviewing recommendation:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const errorMessage = error?.message || error?.toString() || 'Failed to review recommendation';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

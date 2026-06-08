import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/global-merchants/patterns/sync
 * Sync transaction patterns into global_merchant_patterns table
 * Uses efficient batch upserts with ON CONFLICT to handle duplicates gracefully
 * Only processes patterns that don't exist (determined by database unique constraint)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    // Use service role client to bypass RLS for admin operations
    const supabase = createServiceRoleClient();
    
    const startTime = Date.now();
    
    // Get unique transaction descriptions efficiently using pagination
    // This avoids loading all transactions into memory at once
    const PAGE_SIZE = 1000;
    const allUniqueDescriptions = new Set<string>();
    let page = 0;
    let hasMore = true;
    
    while (hasMore) {
      const offset = page * PAGE_SIZE;
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('description')
        .not('description', 'is', null)
        .neq('description', '')
        .range(offset, offset + PAGE_SIZE - 1);
      
      if (transactionsError) throw transactionsError;
      
      if (!transactions || transactions.length === 0) {
        hasMore = false;
        break;
      }
      
      // Add unique descriptions to the set
      transactions.forEach(t => {
        if (t.description && t.description.trim()) {
          allUniqueDescriptions.add(t.description.trim());
        }
      });
      
      // Check if we've fetched all transactions
      if (transactions.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    const uniqueDescriptionsArray = Array.from(allUniqueDescriptions);
    
    if (uniqueDescriptionsArray.length === 0) {
      const { count: ungroupedCount } = await supabase
        .from('global_merchant_patterns')
        .select('*', { count: 'exact', head: true })
        .is('global_merchant_id', null);
      
      return NextResponse.json({
        message: 'No valid transaction descriptions found',
        patternsProcessed: 0,
        ungroupedPatternsCount: ungroupedCount || 0,
        durationSeconds: ((Date.now() - startTime) / 1000).toFixed(2)
      });
    }
    
    let patternsProcessed = 0;
    let patternsSkipped = 0;
    const batchSize = 500; // Larger batches for better performance
    
    // Process patterns in batches
    // Use upsert with ignoreDuplicates: true - existing patterns will be skipped
    // The database unique constraint ensures no duplicates are created
    for (let i = 0; i < uniqueDescriptionsArray.length; i += batchSize) {
      const batch = uniqueDescriptionsArray.slice(i, i + batchSize);
      
      // Prepare upsert data for this batch
      const upsertData = batch.map(description => {
        if (!description || !description.trim()) return null;
        const normalized = description.trim().toLowerCase().replace(/\s+/g, ' ');
        return {
          pattern: description.trim(),
          normalized_pattern: normalized,
          usage_count: 1,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        };
      }).filter(Boolean) as Array<{
        pattern: string;
        normalized_pattern: string;
        usage_count: number;
        first_seen_at: string;
        last_seen_at: string;
      }>;
      
      if (upsertData.length > 0) {
        // Upsert with ignoreDuplicates: true - existing patterns are skipped (not updated)
        // This is much faster than checking existence first
        const { data: insertedData, error: upsertError } = await supabase
          .from('global_merchant_patterns')
          .upsert(upsertData, {
            onConflict: 'pattern',
            ignoreDuplicates: true // Skip existing patterns (they're already synced)
          })
          .select('pattern'); // Return inserted patterns to count them
        
        if (upsertError) {
          // If batch upsert fails, try individual inserts to handle errors gracefully
          console.error(`Error upserting batch starting at ${i}:`, upsertError);
          
          for (const item of upsertData) {
            const { error: insertError } = await supabase
              .from('global_merchant_patterns')
              .insert(item);
            
            if (insertError) {
              if (insertError.code === '23505') {
                // Duplicate - pattern already exists, skip it
                patternsSkipped++;
              } else {
                console.error(`Error inserting pattern "${item.pattern}":`, insertError);
              }
            } else {
              patternsProcessed++;
            }
          }
        } else {
          // Count successfully inserted patterns (only new ones, duplicates are ignored)
          const insertedCount = insertedData?.length || 0;
          patternsProcessed += insertedCount;
          patternsSkipped += upsertData.length - insertedCount;
        }
      }
    }
    
    // Update usage counts for newly inserted patterns only (in batches for efficiency)
    if (patternsProcessed > 0) {
      // Get the patterns we just inserted (first patternsProcessed items)
      const newlyInsertedPatterns: string[] = [];
      let insertedCount = 0;
      
      for (const description of uniqueDescriptionsArray) {
        if (insertedCount >= patternsProcessed) break;
        newlyInsertedPatterns.push(description);
        insertedCount++;
      }
      
      // Update usage counts in batches
      const updateBatchSize = 50;
      for (let i = 0; i < newlyInsertedPatterns.length; i += updateBatchSize) {
        const batch = newlyInsertedPatterns.slice(i, i + updateBatchSize);
        
        // Update each pattern's usage count
        const updatePromises = batch.map(async (description) => {
          if (!description || !description.trim()) return;
          
          // Count transactions matching this exact pattern
          const { count } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('description', description.trim());
          
          if (count !== null && count > 0) {
            await supabase
              .from('global_merchant_patterns')
              .update({ usage_count: count })
              .eq('pattern', description.trim());
          }
        });
        
        // Wait for batch to complete before moving to next batch
        await Promise.all(updatePromises);
      }
    }
    
    // Get count of ungrouped patterns after sync
    const { count: ungroupedCount } = await supabase
      .from('global_merchant_patterns')
      .select('*', { count: 'exact', head: true })
      .is('global_merchant_id', null);
    
    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return NextResponse.json({
      message: patternsProcessed > 0 
        ? `Synced ${patternsProcessed} new pattern(s). ${patternsSkipped} pattern(s) already existed.`
        : 'All patterns already synced',
      patternsProcessed,
      patternsSkipped,
      totalPatterns: uniqueDescriptionsArray.length,
      ungroupedPatternsCount: ungroupedCount || 0,
      durationSeconds: parseFloat(durationSeconds),
      note: 'Duplicates are automatically prevented by the database unique constraint.'
    });
  } catch (error: any) {
    console.error('Error syncing global merchant patterns:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to sync patterns', details: error.message },
      { status: 500 }
    );
  }
}

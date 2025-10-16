import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createMerchantGroup, createMerchantMapping } from '@/lib/db/merchant-groups';
import { clusterMerchants, calculateConfidence } from '@/lib/merchant-grouping';

/**
 * Auto-group all transactions by merchant
 * This analyzes all unique transaction descriptions and creates merchant groups
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { threshold = 0.85, dryRun = false } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all unique transaction descriptions
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('description')
      .eq('user_id', user.id);

    if (transactionsError) throw transactionsError;

    // Get unique descriptions
    const uniqueDescriptions = [...new Set(transactions?.map(t => t.description) || [])];

    if (uniqueDescriptions.length === 0) {
      return NextResponse.json({
        message: 'No transactions found',
        groups_created: 0,
        mappings_created: 0,
      });
    }

    // Cluster merchants
    const clusters = clusterMerchants(uniqueDescriptions, threshold);

    if (dryRun) {
      // Return preview without creating anything
      return NextResponse.json({
        dry_run: true,
        total_descriptions: uniqueDescriptions.length,
        groups_to_create: clusters.length,
        preview: clusters.slice(0, 10).map(cluster => ({
          display_name: cluster.displayName,
          description_count: cluster.descriptions.length,
          confidence: cluster.confidence,
          sample_descriptions: cluster.descriptions.slice(0, 3),
        })),
      });
    }

    // Create groups and mappings
    let groupsCreated = 0;
    let mappingsCreated = 0;

    for (const cluster of clusters) {
      try {
        // Create merchant group
        const group = await createMerchantGroup(cluster.displayName);
        groupsCreated++;

        // Create mappings for all descriptions in this cluster
        for (const description of cluster.descriptions) {
          const confidence = calculateConfidence(cluster.confidence, cluster.descriptions.length);
          
          await createMerchantMapping(
            description,
            cluster.normalizedPattern,
            group.id,
            true, // is_automatic
            confidence
          );
          mappingsCreated++;
        }
      } catch (error) {
        console.error(`Error creating group for ${cluster.displayName}:`, error);
        // Continue with next cluster
      }
    }

    return NextResponse.json({
      success: true,
      total_descriptions: uniqueDescriptions.length,
      groups_created: groupsCreated,
      mappings_created: mappingsCreated,
      threshold_used: threshold,
    });
  } catch (error) {
    console.error('Error auto-grouping merchants:', error);
    return NextResponse.json(
      { error: 'Failed to auto-group merchants' },
      { status: 500 }
    );
  }
}


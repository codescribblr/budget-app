import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Feature definitions with metadata
 */
const FEATURES = {
  monthly_funding_tracking: {
    name: 'Monthly Funding Tracking',
    description: 'Track how much you\'ve funded to each category this month, separate from the current balance. Prevents refunding already-paid bills.',
    level: 'basic',
    dependencies: [],
    dataLossWarning: false,
  },
  category_types: {
    name: 'Category Types',
    description: 'Categorize your envelopes as Monthly Expense, Accumulation, or Target Balance with type-specific progress tracking.',
    level: 'intermediate',
    dependencies: ['monthly_funding_tracking'],
    dataLossWarning: false,
  },
  priority_system: {
    name: 'Priority System',
    description: 'Assign priorities (1-10) to categories to control funding order when money is limited.',
    level: 'intermediate',
    dependencies: ['category_types'],
    dataLossWarning: false,
  },
  smart_allocation: {
    name: 'Smart Allocation',
    description: 'Automatically allocate funds to categories based on priorities, with catch-up for underfunded categories.',
    level: 'advanced',
    dependencies: ['priority_system'],
    dataLossWarning: false,
  },
  income_buffer: {
    name: 'Income Buffer',
    description: 'Smooth irregular income by storing large payments and releasing funds monthly.',
    level: 'advanced',
    dependencies: ['smart_allocation'],
    dataLossWarning: false,
  },
  advanced_reporting: {
    name: 'Advanced Reporting',
    description: 'Detailed reports and analytics for income volatility, funding consistency, and spending patterns.',
    level: 'power',
    dependencies: ['category_types'],
    dataLossWarning: false,
  },
} as const;

export type FeatureName = keyof typeof FEATURES;

/**
 * GET /api/features
 * Get all features with their enabled status for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's feature flags
    const { data: userFlags, error: flagsError } = await supabase
      .from('user_feature_flags')
      .select('feature_name, enabled, enabled_at, disabled_at')
      .eq('user_id', user.id);

    if (flagsError) {
      console.error('Error fetching feature flags:', flagsError);
      return NextResponse.json(
        { error: 'Failed to fetch feature flags' },
        { status: 500 }
      );
    }

    // Build response with feature metadata and user's enabled status
    const features = Object.entries(FEATURES).map(([key, metadata]) => {
      const userFlag = userFlags?.find(f => f.feature_name === key);
      return {
        key,
        ...metadata,
        enabled: userFlag?.enabled || false,
        enabledAt: userFlag?.enabled_at || null,
        disabledAt: userFlag?.disabled_at || null,
      };
    });

    return NextResponse.json({ features });
  } catch (error: any) {
    console.error('Error in GET /api/features:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/features
 * Toggle a feature on or off
 * Body: { featureName: string, enabled: boolean }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { featureName, enabled } = body;

    // Validate feature name
    if (!FEATURES[featureName as FeatureName]) {
      return NextResponse.json(
        { error: 'Invalid feature name' },
        { status: 400 }
      );
    }

    const feature = FEATURES[featureName as FeatureName];

    // Check dependencies if enabling
    if (enabled && feature.dependencies.length > 0) {
      const { data: userFlags } = await supabase
        .from('user_feature_flags')
        .select('feature_name, enabled')
        .eq('user_id', user.id)
        .in('feature_name', feature.dependencies);

      const missingDeps = feature.dependencies.filter(dep => {
        const flag = userFlags?.find(f => f.feature_name === dep);
        return !flag || !flag.enabled;
      });

      if (missingDeps.length > 0) {
        return NextResponse.json(
          {
            error: 'Missing dependencies',
            message: `You must enable ${missingDeps.map(d => FEATURES[d as FeatureName].name).join(', ')} first`,
            missingDependencies: missingDeps,
          },
          { status: 400 }
        );
      }
    }

    // Upsert the feature flag
    const { data, error } = await supabase
      .from('user_feature_flags')
      .upsert({
        user_id: user.id,
        feature_name: featureName,
        enabled,
        enabled_at: enabled ? new Date().toISOString() : null,
        disabled_at: !enabled ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,feature_name',
      })
      .select()
      .single();

    if (error) {
      console.error('Error toggling feature:', error);
      return NextResponse.json(
        { error: 'Failed to toggle feature' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feature: {
        key: featureName,
        ...feature,
        enabled: data.enabled,
        enabledAt: data.enabled_at,
        disabledAt: data.disabled_at,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/features:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


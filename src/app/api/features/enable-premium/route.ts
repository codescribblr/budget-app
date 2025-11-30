import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { getUserSubscription, isPremiumUser } from '@/lib/subscription-utils';
import { checkOwnerAccess } from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';
import { setupPremiumFeatures } from '@/lib/premium-feature-setup';

/**
 * POST /api/features/enable-premium
 * Manually enable all premium features for an account that has premium subscription
 * Useful if features weren't enabled when subscription was created
 */
export async function POST() {
  try {
    // Check if user is account owner
    const ownerCheck = await checkOwnerAccess();
    if (ownerCheck) return ownerCheck;

    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Verify account has premium subscription
    const subscription = await getUserSubscription(accountId);
    const hasPremium = isPremiumUser(subscription);

    if (!hasPremium) {
      return NextResponse.json(
        { error: 'Account does not have a premium subscription' },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // Enable all premium features
    const premiumFeatures = [
      'monthly_funding_tracking',
      'category_types',
      'priority_system',
      'smart_allocation',
      'income_buffer',
      'goals',
      'loans',
      'advanced_reporting',
      'ai_chat',
    ];

    const now = new Date().toISOString();
    const featureFlagsToInsert = premiumFeatures.map(featureName => ({
      account_id: accountId,
      user_id: user.id, // Include for backwards compatibility (can be null after migration)
      feature_name: featureName,
      enabled: true,
      enabled_at: now,
      disabled_at: null,
      updated_at: now,
    }));

    // Bulk upsert all premium features
    const { data: featuresData, error: featuresError } = await supabase
      .from('user_feature_flags')
      .upsert(featureFlagsToInsert, {
        onConflict: 'account_id,feature_name',
      })
      .select();

    if (featuresError) {
      console.error('Error enabling premium features:', featuresError);
      return NextResponse.json(
        { error: 'Failed to enable premium features' },
        { status: 500 }
      );
    }

    // Perform setup actions for premium features (e.g., create Income Buffer category)
    await setupPremiumFeatures(supabase, accountId, user.id);

    return NextResponse.json({
      success: true,
      message: `Enabled ${featuresData?.length || 0} premium features`,
      features: featuresData,
    });
  } catch (error: any) {
    console.error('Error enabling premium features:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enable premium features' },
      { status: 500 }
    );
  }
}


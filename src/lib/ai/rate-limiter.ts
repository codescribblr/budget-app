import { createClient } from '../supabase/server';
import { USER_LIMITS } from './constants';
import type { AIFeatureType, RateLimitResult, UsageStats } from './types';

class AIRateLimiter {
  /**
   * Check if user has remaining quota for a feature
   */
  async checkLimit(
    userId: string,
    featureType: AIFeatureType
  ): Promise<RateLimitResult> {
    const supabase = await createClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's usage for this feature
    const { count, error } = await supabase
      .from('ai_usage_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature_type', featureType)
      .gte('timestamp', today.toISOString());

    if (error) {
      console.error('Error checking rate limit:', error);
      // Fail open - allow the request if we can't check
      const defaultLimit = featureType in USER_LIMITS.daily 
        ? USER_LIMITS.daily[featureType as keyof typeof USER_LIMITS.daily] 
        : 0;
      return {
        allowed: true,
        remaining: defaultLimit,
        resetAt: this.getResetTime(),
      };
    }

    const used = count || 0;
    const limit = featureType in USER_LIMITS.daily 
      ? USER_LIMITS.daily[featureType as keyof typeof USER_LIMITS.daily] 
      : 0;
    const remaining = Math.max(0, limit - used);

    return {
      allowed: remaining > 0,
      remaining,
      resetAt: this.getResetTime(),
    };
  }

  /**
   * Record AI usage
   */
  async recordUsage(
    userId: string,
    accountId: number,
    featureType: AIFeatureType,
    tokensUsed: number,
    tokensInput: number = 0,
    tokensOutput: number = 0,
    responseTimeMs: number | null = null,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase.from('ai_usage_tracking').insert({
      user_id: userId,
      account_id: accountId,
      feature_type: featureType,
      tokens_used: tokensUsed,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      response_time_ms: responseTimeMs,
      request_metadata: metadata,
    });

    if (error) {
      console.error('Error recording AI usage:', error);
      // Don't throw - usage tracking failure shouldn't break the feature
    }
  }

  /**
   * Get usage statistics for a user
   */
  async getUsageStats(userId: string): Promise<UsageStats> {
    const supabase = await createClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('ai_usage_tracking')
      .select('feature_type')
      .eq('user_id', userId)
      .gte('timestamp', today.toISOString());

    if (error) {
      console.error('Error fetching usage stats:', error);
      return this.getDefaultStats();
    }

    const counts: Record<string, number> = {};
    data?.forEach((record) => {
      counts[record.feature_type] = (counts[record.feature_type] || 0) + 1;
    });

    return {
      chat: {
        used: counts.chat || 0,
        limit: USER_LIMITS.daily.chat,
      },
      categorization: {
        used: counts.categorization || 0,
        limit: USER_LIMITS.daily.categorization,
      },
      insights: {
        used: counts.insights || 0,
        limit: USER_LIMITS.daily.insights,
      },
      reports: {
        used: counts.reports || 0,
        limit: USER_LIMITS.daily.reports,
      },
    };
  }

  /**
   * Get reset time (midnight UTC)
   */
  private getResetTime(): Date {
    const reset = new Date();
    reset.setUTCHours(24, 0, 0, 0);
    return reset;
  }

  /**
   * Get default stats (all zeros)
   */
  private getDefaultStats(): UsageStats {
    return {
      chat: { used: 0, limit: USER_LIMITS.daily.chat },
      categorization: { used: 0, limit: USER_LIMITS.daily.categorization },
      insights: { used: 0, limit: USER_LIMITS.daily.insights },
      reports: { used: 0, limit: USER_LIMITS.daily.reports },
    };
  }
}

export const aiRateLimiter = new AIRateLimiter();


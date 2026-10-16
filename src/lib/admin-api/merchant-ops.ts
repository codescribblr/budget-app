import { createServiceRoleClient } from '@/lib/supabase/server';
import { syncTransactionsForPatterns } from '@/lib/db/sync-merchant-groups';
import { normalizeGlobalMerchantPattern } from '@/lib/merchant-pattern-normalize';
import { rejectionKey } from '@/lib/ai/merchant-suggestions';
import { AdminApiError } from './errors';
import type { AdminApiContext } from './types';

export async function listUngroupedPatterns(options: {
  limit: number;
  offset: number;
  minUsage?: number;
  q?: string;
}) {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from('global_merchant_patterns')
    .select(
      'id, pattern, normalized_pattern, usage_count, first_seen_at, last_seen_at, global_merchant_id',
      { count: 'exact' }
    )
    .is('global_merchant_id', null)
    .order('usage_count', { ascending: false })
    .range(options.offset, options.offset + options.limit - 1);

  if (options.minUsage != null && options.minUsage > 0) {
    query = query.gte('usage_count', options.minUsage);
  }
  if (options.q?.trim()) {
    query = query.ilike('pattern', `%${options.q.trim()}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    patterns: (data ?? []).map((p) => ({
      ...p,
      // Always expose the current shared normalizer form (may differ from stored until backfill)
      normalized_form: normalizeGlobalMerchantPattern(p.pattern),
    })),
    total: count ?? 0,
    limit: options.limit,
    offset: options.offset,
  };
}

export async function listGlobalMerchants(options: {
  q?: string;
  status?: 'active' | 'draft' | 'all';
  limit: number;
}) {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from('global_merchants')
    .select('id, display_name, status, logo_url, icon_name, created_at, updated_at')
    .order('display_name')
    .limit(options.limit);

  if (options.status === 'active' || options.status === 'draft') {
    query = query.eq('status', options.status);
  }
  if (options.q?.trim()) {
    query = query.ilike('display_name', `%${options.q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return { merchants: data ?? [] };
}

export async function createGlobalMerchant(
  context: AdminApiContext,
  input: { display_name: string; status?: 'active' | 'draft' }
) {
  const displayName = input.display_name.trim();
  if (!displayName) {
    throw new AdminApiError(400, 'validation_error', 'display_name is required');
  }

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from('global_merchants')
    .select('id')
    .eq('display_name', displayName)
    .maybeSingle();

  if (existing) {
    throw new AdminApiError(400, 'conflict', `Merchant "${displayName}" already exists`);
  }

  const { data, error } = await supabase
    .from('global_merchants')
    .insert({
      display_name: displayName,
      status: input.status === 'draft' ? 'draft' : 'active',
      created_by: context.userId,
    })
    .select('id, display_name, status, logo_url, icon_name, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AdminApiError(400, 'conflict', `Merchant "${displayName}" already exists`);
    }
    throw error;
  }

  await recordAgentAction(context, {
    action: 'create_merchant',
    globalMerchantId: data.id,
    patternIds: [],
    confidence: null,
    reasoning: null,
    suggestionId: null,
    metadata: { display_name: displayName },
  });

  return data;
}

export async function mapPatternsToMerchant(
  context: AdminApiContext,
  input: {
    merchant_id?: number;
    display_name?: string;
    pattern_ids: number[];
    confidence?: number;
    reasoning?: string;
  }
) {
  const patternIds = [...new Set(input.pattern_ids.filter((id) => Number.isFinite(id)))];
  if (patternIds.length === 0) {
    throw new AdminApiError(400, 'validation_error', 'pattern_ids is required');
  }

  const confidence =
    typeof input.confidence === 'number' && !Number.isNaN(input.confidence)
      ? input.confidence
      : null;
  const reasoning = input.reasoning?.trim() || null;

  const supabase = createServiceRoleClient();
  let merchantId = input.merchant_id ?? null;

  if (merchantId == null) {
    const name = input.display_name?.trim();
    if (!name) {
      throw new AdminApiError(
        400,
        'validation_error',
        'merchant_id or display_name is required'
      );
    }
    const { data: existing } = await supabase
      .from('global_merchants')
      .select('id')
      .eq('display_name', name)
      .maybeSingle();

    if (existing) {
      merchantId = existing.id;
    } else {
      const created = await createGlobalMerchant(context, {
        display_name: name,
        status: 'active',
      });
      merchantId = created.id;
    }
  } else {
    const { data: merchant } = await supabase
      .from('global_merchants')
      .select('id')
      .eq('id', merchantId)
      .maybeSingle();
    if (!merchant) {
      throw new AdminApiError(404, 'not_found', 'Merchant not found');
    }
  }

  if (merchantId == null) {
    throw new AdminApiError(400, 'validation_error', 'merchant_id or display_name is required');
  }
  const resolvedMerchantId: number = merchantId;

  const { data: patterns, error: patternsError } = await supabase
    .from('global_merchant_patterns')
    .select('id')
    .in('id', patternIds);

  if (patternsError) throw patternsError;
  const foundIds = new Set((patterns ?? []).map((p) => p.id));
  const missing = patternIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new AdminApiError(
      400,
      'validation_error',
      `Unknown pattern_ids: ${missing.join(', ')}`
    );
  }

  const { error: updateError } = await supabase
    .from('global_merchant_patterns')
    .update({ global_merchant_id: resolvedMerchantId })
    .in('id', patternIds);

  if (updateError) throw updateError;

  let syncResult = { transactionsUpdated: 0, groupsCreated: 0 };
  try {
    syncResult = await syncTransactionsForPatterns(patternIds, resolvedMerchantId);
  } catch (syncErr) {
    console.error('[admin-api] sync after map:', syncErr);
  }

  // Approved suggestion row for review-history visibility
  const { data: suggestion, error: suggestionError } = await supabase
    .from('global_merchant_suggestions')
    .insert({
      suggested_global_merchant_id: resolvedMerchantId,
      suggested_display_name: null,
      status: 'approved',
      batch_id: `agent_auto_${new Date().toISOString().slice(0, 10)}`,
      reviewed_at: new Date().toISOString(),
      reviewed_by: context.userId,
      metadata: {
        source: 'admin_agent',
        auto_approved: true,
        confidence,
        reasoning,
        api_key_id: context.apiKeyId,
        api_key_name: context.apiKeyName,
        auth_mode: context.mode,
      },
    })
    .select('id')
    .single();

  if (suggestionError) {
    console.error('[admin-api] failed to insert approved suggestion audit:', suggestionError);
  } else if (suggestion) {
    for (const pid of patternIds) {
      await supabase.from('global_merchant_suggestion_patterns').insert({
        suggestion_id: suggestion.id,
        pattern_id: pid,
      });
    }
  }

  const action = await recordAgentAction(context, {
    action: 'map_auto_approve',
    globalMerchantId: resolvedMerchantId,
    patternIds,
    confidence,
    reasoning,
    suggestionId: suggestion?.id ?? null,
    metadata: {
      transactions_updated: syncResult.transactionsUpdated,
      groups_created: syncResult.groupsCreated,
    },
  });

  return {
    merchant_id: resolvedMerchantId,
    patterns_grouped: patternIds.length,
    transactions_updated: syncResult.transactionsUpdated,
    groups_created: syncResult.groupsCreated,
    suggestion_id: suggestion?.id ?? null,
    audit_id: action?.id ?? null,
  };
}

export async function createPendingSuggestions(
  context: AdminApiContext,
  input: {
    suggestions: Array<{
      merchant_id?: number | null;
      display_name?: string | null;
      pattern_ids: number[];
      confidence?: number;
      reasoning?: string;
    }>;
    batch_id?: string;
  }
) {
  if (!Array.isArray(input.suggestions) || input.suggestions.length === 0) {
    throw new AdminApiError(400, 'validation_error', 'suggestions array is required');
  }

  const supabase = createServiceRoleClient();
  const { data: rejections } = await supabase
    .from('global_merchant_pattern_rejections')
    .select('pattern_id, rejected_global_merchant_id, rejected_suggested_display_name');

  const rejectionSet = new Set<string>();
  for (const r of rejections || []) {
    if (r.rejected_global_merchant_id != null) {
      rejectionSet.add(rejectionKey(r.pattern_id, r.rejected_global_merchant_id, null));
    }
    if (r.rejected_suggested_display_name) {
      rejectionSet.add(rejectionKey(r.pattern_id, null, r.rejected_suggested_display_name));
    }
  }

  const batchId =
    input.batch_id?.trim() || `agent_${new Date().toISOString().slice(0, 10)}`;
  const created: Array<{ id: number; pattern_count: number }> = [];
  const usedPatternIds = new Set<number>();

  for (const s of input.suggestions) {
    const merchantId = s.merchant_id ?? null;
    const displayName = s.display_name?.trim() || null;
    if (merchantId == null && !displayName) {
      continue;
    }

    let patternIds = [...new Set((s.pattern_ids || []).filter((id) => Number.isFinite(id)))];
    patternIds = patternIds.filter((pid) => {
      if (usedPatternIds.has(pid)) return false;
      const key =
        merchantId != null
          ? rejectionKey(pid, merchantId, null)
          : rejectionKey(pid, null, displayName || '');
      return !rejectionSet.has(key);
    });

    if (patternIds.length === 0) continue;

    if (merchantId != null) {
      const { data: merchant } = await supabase
        .from('global_merchants')
        .select('id')
        .eq('id', merchantId)
        .maybeSingle();
      if (!merchant) {
        throw new AdminApiError(404, 'not_found', `Merchant ${merchantId} not found`);
      }
    }

    const confidence =
      typeof s.confidence === 'number' && !Number.isNaN(s.confidence) ? s.confidence : null;
    const reasoning = s.reasoning?.trim() || null;

    const { data: row, error: insertError } = await supabase
      .from('global_merchant_suggestions')
      .insert({
        suggested_global_merchant_id: merchantId,
        suggested_display_name: merchantId == null ? displayName : null,
        status: 'pending',
        batch_id: batchId,
        metadata: {
          source: 'admin_agent',
          confidence,
          reasoning,
          api_key_id: context.apiKeyId,
          api_key_name: context.apiKeyName,
          auth_mode: context.mode,
        },
      })
      .select('id')
      .single();

    if (insertError || !row) {
      console.error('[admin-api] insert suggestion:', insertError);
      continue;
    }

    for (const pid of patternIds) {
      usedPatternIds.add(pid);
      await supabase.from('global_merchant_suggestion_patterns').insert({
        suggestion_id: row.id,
        pattern_id: pid,
      });
    }

    await recordAgentAction(context, {
      action: 'create_suggestion',
      globalMerchantId: merchantId,
      patternIds,
      confidence,
      reasoning,
      suggestionId: row.id,
      metadata: { batch_id: batchId, display_name: displayName },
    });

    created.push({ id: row.id, pattern_count: patternIds.length });
  }

  return { batch_id: batchId, suggestions: created, created: created.length };
}

export async function listPendingSuggestions(options: {
  limit: number;
  offset: number;
  batchId?: string;
}) {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from('global_merchant_suggestions')
    .select(
      `
      id,
      suggested_global_merchant_id,
      suggested_display_name,
      status,
      batch_id,
      created_at,
      reviewed_at,
      metadata,
      global_merchants (
        id,
        display_name,
        status
      )
    `,
      { count: 'exact' }
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .range(options.offset, options.offset + options.limit - 1);

  if (options.batchId?.trim()) {
    query = query.eq('batch_id', options.batchId.trim());
  }

  const { data: suggestions, error, count } = await query;
  if (error) throw error;

  const suggestionIds = (suggestions || []).map((s: { id: number }) => s.id);
  if (suggestionIds.length === 0) {
    return { suggestions: [], total: count ?? 0 };
  }

  const { data: patternRows } = await supabase
    .from('global_merchant_suggestion_patterns')
    .select('suggestion_id, pattern_id')
    .in('suggestion_id', suggestionIds);

  const patternIds = [...new Set((patternRows || []).map((r) => r.pattern_id))];
  let patternsMap: Record<number, unknown> = {};
  if (patternIds.length > 0) {
    const { data: patterns } = await supabase
      .from('global_merchant_patterns')
      .select('id, pattern, normalized_pattern, usage_count, first_seen_at, last_seen_at')
      .in('id', patternIds);
    patternsMap = (patterns || []).reduce(
      (acc: Record<number, unknown>, p: { id: number }) => {
        acc[p.id] = p;
        return acc;
      },
      {}
    );
  }

  const bySuggestion = (patternRows || []).reduce(
    (acc: Record<number, number[]>, r: { suggestion_id: number; pattern_id: number }) => {
      if (!acc[r.suggestion_id]) acc[r.suggestion_id] = [];
      acc[r.suggestion_id].push(r.pattern_id);
      return acc;
    },
    {}
  );

  const list = (suggestions || []).map((s: Record<string, unknown>) => {
    const ids = bySuggestion[s.id as number] || [];
    return {
      id: s.id,
      suggested_global_merchant_id: s.suggested_global_merchant_id,
      suggested_display_name: s.suggested_display_name,
      status: s.status,
      batch_id: s.batch_id,
      created_at: s.created_at,
      reviewed_at: s.reviewed_at,
      metadata: s.metadata,
      global_merchant: s.global_merchants ?? null,
      pattern_count: ids.length,
      patterns: ids.map((pid) => patternsMap[pid]).filter(Boolean),
    };
  });

  return { suggestions: list, total: count ?? 0, limit: options.limit, offset: options.offset };
}

async function recordAgentAction(
  context: AdminApiContext,
  params: {
    action: string;
    globalMerchantId: number | null;
    patternIds: number[];
    confidence: number | null;
    reasoning: string | null;
    suggestionId: number | null;
    metadata: Record<string, unknown>;
  }
) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('admin_merchant_agent_actions')
    .insert({
      admin_api_key_id: context.apiKeyId,
      actor_user_id: context.userId,
      action: params.action,
      global_merchant_id: params.globalMerchantId,
      pattern_ids: params.patternIds,
      confidence: params.confidence,
      reasoning: params.reasoning,
      suggestion_id: params.suggestionId,
      metadata: params.metadata,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[admin-api] audit insert failed:', error);
    return null;
  }
  return data;
}

import { createServiceRoleClient } from '@/lib/supabase/server';
import { syncTransactionsForPatterns } from '@/lib/db/sync-merchant-groups';
import { normalizeGlobalMerchantPattern } from '@/lib/merchant-pattern-normalize';
import { rejectionKey } from '@/lib/ai/merchant-suggestions';
import { AdminApiError } from './errors';
import type { AdminApiContext } from './types';
import {
  classifyPatternsForApprove,
  type ApproveSuggestionResult,
  type BulkApproveItemResult,
} from './approve-suggestion';

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

export async function getGlobalMerchant(merchantId: number) {
  if (!Number.isFinite(merchantId) || merchantId <= 0) {
    throw new AdminApiError(400, 'validation_error', 'Invalid merchant id');
  }

  const supabase = createServiceRoleClient();
  const { data: merchant, error: merchantError } = await supabase
    .from('global_merchants')
    .select('*')
    .eq('id', merchantId)
    .maybeSingle();

  if (merchantError) throw merchantError;
  if (!merchant) {
    throw new AdminApiError(404, 'not_found', 'Merchant not found');
  }

  const { data: patterns, error: patternsError } = await supabase
    .from('global_merchant_patterns')
    .select('id, pattern, normalized_pattern, usage_count, first_seen_at, last_seen_at')
    .eq('global_merchant_id', merchantId)
    .order('usage_count', { ascending: false });

  if (patternsError) throw patternsError;

  return {
    merchant,
    patterns: patterns ?? [],
  };
}

/**
 * Update a global merchant (mirrors session PATCH fields).
 * Name collisions return 409 with existing_id.
 * On rename, best-effort updates linked user merchant_groups.display_name.
 */
export async function updateGlobalMerchant(
  context: AdminApiContext,
  merchantId: number,
  input: {
    display_name?: string;
    status?: 'active' | 'draft';
    logo_url?: string | null;
    icon_name?: string | null;
  }
) {
  if (!Number.isFinite(merchantId) || merchantId <= 0) {
    throw new AdminApiError(400, 'validation_error', 'Invalid merchant id');
  }

  const supabase = createServiceRoleClient();
  const { data: existing, error: fetchError } = await supabase
    .from('global_merchants')
    .select('*')
    .eq('id', merchantId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) {
    throw new AdminApiError(404, 'not_found', 'Merchant not found');
  }

  const logoProvided = input.logo_url !== undefined && Boolean(input.logo_url);
  const iconProvided = input.icon_name !== undefined && Boolean(input.icon_name);
  if (logoProvided && iconProvided) {
    throw new AdminApiError(
      400,
      'validation_error',
      'logo_url and icon_name are mutually exclusive'
    );
  }

  const updateData: Record<string, unknown> = {};
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  if (input.display_name !== undefined) {
    const name = input.display_name.trim();
    if (!name) {
      throw new AdminApiError(400, 'validation_error', 'display_name cannot be empty');
    }
    if (name !== existing.display_name) {
      const { data: collision } = await supabase
        .from('global_merchants')
        .select('id, display_name')
        .eq('display_name', name)
        .neq('id', merchantId)
        .maybeSingle();
      if (collision) {
        throw new AdminApiError(
          409,
          'conflict',
          `A merchant with this name already exists`,
          { existing_id: collision.id }
        );
      }
      oldValues.display_name = existing.display_name;
      newValues.display_name = name;
      updateData.display_name = name;
    }
  }

  if (input.status !== undefined) {
    const status = input.status === 'active' ? 'active' : 'draft';
    if (status !== existing.status) {
      oldValues.status = existing.status;
      newValues.status = status;
      updateData.status = status;
    }
  }

  if (input.logo_url !== undefined) {
    const logoUrl = input.logo_url || null;
    if (logoUrl !== existing.logo_url) {
      oldValues.logo_url = existing.logo_url;
      newValues.logo_url = logoUrl;
      updateData.logo_url = logoUrl;
    }
    // logo and icon are mutually exclusive (same as session admin UI)
    if (logoUrl) {
      if (existing.icon_name) {
        oldValues.icon_name = existing.icon_name;
        newValues.icon_name = null;
      }
      updateData.icon_name = null;
    }
  }

  if (input.icon_name !== undefined) {
    const iconName = input.icon_name || null;
    if (iconName !== existing.icon_name) {
      oldValues.icon_name = existing.icon_name;
      newValues.icon_name = iconName;
      updateData.icon_name = iconName;
    }
    if (iconName) {
      if (existing.logo_url) {
        oldValues.logo_url = existing.logo_url;
        newValues.logo_url = null;
      }
      updateData.logo_url = null;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { merchant: existing, unchanged: true, audit_id: null as number | null };
  }

  const { data, error } = await supabase
    .from('global_merchants')
    .update(updateData)
    .eq('id', merchantId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const collidedName =
        typeof updateData.display_name === 'string'
          ? updateData.display_name
          : existing.display_name;
      const { data: collision } = await supabase
        .from('global_merchants')
        .select('id')
        .eq('display_name', collidedName)
        .neq('id', merchantId)
        .maybeSingle();
      throw new AdminApiError(
        409,
        'conflict',
        'A merchant with this name already exists',
        { existing_id: collision?.id ?? null }
      );
    }
    throw error;
  }

  // Keep per-user group display names in sync when renaming (best-effort).
  // Display often prefers global_merchants.display_name when linked, but some
  // queries still read merchant_groups.display_name.
  let groupsUpdated = 0;
  if (typeof updateData.display_name === 'string') {
    const { data: groups } = await supabase
      .from('merchant_groups')
      .select('id, user_id, account_id, display_name')
      .eq('global_merchant_id', merchantId);

    for (const group of groups ?? []) {
      if (group.display_name === updateData.display_name) continue;
      const { error: groupError } = await supabase
        .from('merchant_groups')
        .update({ display_name: updateData.display_name })
        .eq('id', group.id);
      if (groupError) {
        // Unique (user/account/name) collisions are possible; leave group name as-is.
        console.error(
          `[admin-api] skip merchant_group ${group.id} rename:`,
          groupError.message
        );
      } else {
        groupsUpdated++;
      }
    }
  }

  const action = await recordAgentAction(context, {
    action: 'update_merchant',
    globalMerchantId: merchantId,
    patternIds: [],
    confidence: null,
    reasoning: null,
    suggestionId: null,
    metadata: {
      old: oldValues,
      new: newValues,
      merchant_groups_updated: groupsUpdated,
    },
  });

  return { merchant: data, unchanged: false, audit_id: action?.id ?? null };
}

/**
 * Merge source merchant into target (into_id). Mirrors session admin merge:
 * move patterns, re-link user groups, sync transactions, delete source.
 */
export async function mergeGlobalMerchant(
  context: AdminApiContext,
  sourceMerchantId: number,
  intoId: number
) {
  if (!Number.isFinite(sourceMerchantId) || sourceMerchantId <= 0) {
    throw new AdminApiError(400, 'validation_error', 'Invalid source merchant id');
  }
  if (!Number.isFinite(intoId) || intoId <= 0) {
    throw new AdminApiError(400, 'validation_error', 'into_id is required');
  }
  if (sourceMerchantId === intoId) {
    throw new AdminApiError(
      400,
      'validation_error',
      'Source and target merchants must be different'
    );
  }

  const supabase = createServiceRoleClient();

  const { data: sourceMerchant, error: sourceError } = await supabase
    .from('global_merchants')
    .select('id, display_name, status')
    .eq('id', sourceMerchantId)
    .maybeSingle();
  if (sourceError) throw sourceError;
  if (!sourceMerchant) {
    throw new AdminApiError(404, 'not_found', 'Source merchant not found');
  }

  const { data: targetMerchant, error: targetError } = await supabase
    .from('global_merchants')
    .select('id, display_name, status')
    .eq('id', intoId)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!targetMerchant) {
    throw new AdminApiError(404, 'not_found', 'Target merchant not found');
  }

  const { data: sourcePatterns, error: patternsError } = await supabase
    .from('global_merchant_patterns')
    .select('id, pattern')
    .eq('global_merchant_id', sourceMerchantId);
  if (patternsError) throw patternsError;

  const patternIds = (sourcePatterns ?? []).map((p) => p.id as number);
  if (patternIds.length > 0) {
    const { error: updatePatternsError } = await supabase
      .from('global_merchant_patterns')
      .update({ global_merchant_id: intoId })
      .in('id', patternIds);
    if (updatePatternsError) throw updatePatternsError;
  }

  const { data: userGroups, error: userGroupsError } = await supabase
    .from('merchant_groups')
    .select('id, user_id, account_id')
    .eq('global_merchant_id', sourceMerchantId);
  if (userGroupsError) throw userGroupsError;

  let userGroupsUpdated = 0;
  for (const userGroup of userGroups ?? []) {
    const { data: existingTargetGroup } = await supabase
      .from('merchant_groups')
      .select('id')
      .eq('user_id', userGroup.user_id)
      .eq('account_id', userGroup.account_id)
      .eq('global_merchant_id', intoId)
      .neq('id', userGroup.id)
      .maybeSingle();

    if (existingTargetGroup) {
      await supabase
        .from('transactions')
        .update({ merchant_group_id: existingTargetGroup.id })
        .eq('merchant_group_id', userGroup.id);
      await supabase.from('merchant_groups').delete().eq('id', userGroup.id);
    } else {
      const { error: updateGroupError } = await supabase
        .from('merchant_groups')
        .update({ global_merchant_id: intoId })
        .eq('id', userGroup.id);
      if (updateGroupError) {
        console.error(`Error updating user group ${userGroup.id}:`, updateGroupError);
        continue;
      }
    }
    userGroupsUpdated++;
  }

  let syncResult = { transactionsUpdated: 0, groupsCreated: 0 };
  if (patternIds.length > 0) {
    try {
      syncResult = await syncTransactionsForPatterns(patternIds, intoId);
    } catch (syncError) {
      console.error('[admin-api] sync after merge:', syncError);
    }
  }

  const { error: deleteError } = await supabase
    .from('global_merchants')
    .delete()
    .eq('id', sourceMerchantId);
  if (deleteError) throw deleteError;

  const action = await recordAgentAction(context, {
    action: 'merge_merchant',
    globalMerchantId: intoId,
    patternIds,
    confidence: null,
    reasoning: null,
    suggestionId: null,
    metadata: {
      source_merchant_id: sourceMerchantId,
      source_display_name: sourceMerchant.display_name,
      into_id: intoId,
      into_display_name: targetMerchant.display_name,
      patterns_moved: patternIds.length,
      user_groups_updated: userGroupsUpdated,
      transactions_updated: syncResult.transactionsUpdated,
      groups_created: syncResult.groupsCreated,
    },
  });

  return {
    source_merchant: sourceMerchant,
    target_merchant: targetMerchant,
    patterns_moved: patternIds.length,
    user_groups_updated: userGroupsUpdated,
    transactions_updated: syncResult.transactionsUpdated,
    groups_created: syncResult.groupsCreated,
    audit_id: action?.id ?? null,
  };
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

/**
 * Approve a pending suggestion via admin v1.
 * Idempotent when already approved or patterns already mapped to the target.
 * Patterns mapped to a different merchant are skipped (not remapped) and reported.
 */
export async function approveSuggestion(
  context: AdminApiContext,
  suggestionId: number,
  input: {
    global_merchant_id?: number;
    display_name?: string;
    confidence?: number;
    reasoning?: string;
  } = {}
): Promise<ApproveSuggestionResult> {
  if (!Number.isFinite(suggestionId) || suggestionId <= 0) {
    throw new AdminApiError(400, 'validation_error', 'Invalid suggestion id');
  }

  const confidence =
    typeof input.confidence === 'number' && !Number.isNaN(input.confidence)
      ? input.confidence
      : null;
  const reasoning = input.reasoning?.trim() || null;

  const supabase = createServiceRoleClient();
  const { data: suggestion, error: fetchErr } = await supabase
    .from('global_merchant_suggestions')
    .select('id, suggested_global_merchant_id, suggested_display_name, status, metadata')
    .eq('id', suggestionId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!suggestion) {
    throw new AdminApiError(404, 'not_found', 'Suggestion not found');
  }

  if (suggestion.status === 'rejected') {
    throw new AdminApiError(400, 'validation_error', 'Suggestion was rejected');
  }

  const { data: junctionRows } = await supabase
    .from('global_merchant_suggestion_patterns')
    .select('pattern_id')
    .eq('suggestion_id', suggestionId);
  const allPatternIds = (junctionRows || []).map((r) => r.pattern_id as number);

  // Idempotent: already approved — audit + return without remapping
  if (suggestion.status === 'approved') {
    let merchantId: number;
    try {
      merchantId = await resolveApproveTargetMerchant(context, {
        overrideMerchantId: input.global_merchant_id,
        overrideDisplayName: input.display_name,
        suggestedMerchantId: suggestion.suggested_global_merchant_id,
        suggestedDisplayName: suggestion.suggested_display_name,
      });
    } catch {
      merchantId = await inferMerchantFromPatterns(allPatternIds);
    }
    const action = await recordAgentAction(context, {
      action: 'approve_suggestion',
      globalMerchantId: merchantId,
      patternIds: allPatternIds,
      confidence,
      reasoning,
      suggestionId,
      metadata: {
        already_approved: true,
        idempotent: true,
      },
    });
    return {
      suggestion_id: suggestionId,
      status: 'approved',
      already_approved: true,
      merchant_id: merchantId,
      patterns_grouped: 0,
      patterns_already_mapped: allPatternIds.length,
      skipped_conflicts: [],
      transactions_updated: 0,
      groups_created: 0,
      audit_id: action?.id ?? null,
    };
  }

  const merchantId = await resolveApproveTargetMerchant(context, {
    overrideMerchantId: input.global_merchant_id,
    overrideDisplayName: input.display_name,
    suggestedMerchantId: suggestion.suggested_global_merchant_id,
    suggestedDisplayName: suggestion.suggested_display_name,
  });

  if (allPatternIds.length === 0) {
    throw new AdminApiError(400, 'validation_error', 'No patterns on suggestion');
  }

  const { data: patternRows, error: patternsError } = await supabase
    .from('global_merchant_patterns')
    .select('id, global_merchant_id')
    .in('id', allPatternIds);

  if (patternsError) throw patternsError;

  const { toMap, alreadyMapped, skippedConflicts } = classifyPatternsForApprove(
    (patternRows || []).map((p) => ({
      id: p.id as number,
      global_merchant_id: (p.global_merchant_id as number | null) ?? null,
    })),
    merchantId
  );

  let syncResult = { transactionsUpdated: 0, groupsCreated: 0 };
  if (toMap.length > 0) {
    const { error: updateError } = await supabase
      .from('global_merchant_patterns')
      .update({ global_merchant_id: merchantId })
      .in('id', toMap);

    if (updateError) throw updateError;

    try {
      syncResult = await syncTransactionsForPatterns(toMap, merchantId);
    } catch (syncErr) {
      console.error('[admin-api] sync after approve:', syncErr);
    }
  }

  const existingMeta =
    suggestion.metadata && typeof suggestion.metadata === 'object'
      ? (suggestion.metadata as Record<string, unknown>)
      : {};

  await supabase
    .from('global_merchant_suggestions')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: context.userId,
      suggested_global_merchant_id: merchantId,
      metadata: {
        ...existingMeta,
        approved_via: 'admin_v1',
        confidence: confidence ?? existingMeta.confidence ?? null,
        reasoning: reasoning ?? existingMeta.reasoning ?? null,
        api_key_id: context.apiKeyId,
        api_key_name: context.apiKeyName,
        auth_mode: context.mode,
        patterns_grouped: toMap.length,
        patterns_already_mapped: alreadyMapped.length,
        skipped_conflicts: skippedConflicts,
      },
    })
    .eq('id', suggestionId);

  const action = await recordAgentAction(context, {
    action: 'approve_suggestion',
    globalMerchantId: merchantId,
    patternIds: [...toMap, ...alreadyMapped],
    confidence,
    reasoning,
    suggestionId,
    metadata: {
      patterns_grouped: toMap.length,
      patterns_already_mapped: alreadyMapped.length,
      skipped_conflicts: skippedConflicts,
      transactions_updated: syncResult.transactionsUpdated,
      groups_created: syncResult.groupsCreated,
    },
  });

  return {
    suggestion_id: suggestionId,
    status: 'approved',
    already_approved: false,
    merchant_id: merchantId,
    patterns_grouped: toMap.length,
    patterns_already_mapped: alreadyMapped.length,
    skipped_conflicts: skippedConflicts,
    transactions_updated: syncResult.transactionsUpdated,
    groups_created: syncResult.groupsCreated,
    audit_id: action?.id ?? null,
  };
}

export async function approveSuggestionsBulk(
  context: AdminApiContext,
  ids: number[],
  input: {
    global_merchant_id?: number;
    display_name?: string;
    confidence?: number;
    reasoning?: string;
  } = {}
): Promise<{ results: BulkApproveItemResult[] }> {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AdminApiError(400, 'validation_error', 'ids must be a non-empty array');
  }
  if (ids.length > 100) {
    throw new AdminApiError(400, 'validation_error', 'ids limited to 100 per request');
  }

  const results: BulkApproveItemResult[] = [];
  for (const id of ids) {
    try {
      const result = await approveSuggestion(context, id, input);
      results.push({ id, ok: true, ...result });
    } catch (error) {
      if (error instanceof AdminApiError) {
        results.push({
          id,
          ok: false,
          error: { code: error.code, message: error.message },
        });
      } else {
        console.error('[admin-api] bulk approve item failed:', error);
        results.push({
          id,
          ok: false,
          error: { code: 'internal_error', message: 'Failed to approve suggestion' },
        });
      }
    }
  }
  return { results };
}

async function resolveApproveTargetMerchant(
  context: AdminApiContext,
  opts: {
    overrideMerchantId?: number;
    overrideDisplayName?: string;
    suggestedMerchantId: number | null;
    suggestedDisplayName: string | null;
  }
): Promise<number> {
  const supabase = createServiceRoleClient();

  if (typeof opts.overrideMerchantId === 'number') {
    const { data: m } = await supabase
      .from('global_merchants')
      .select('id')
      .eq('id', opts.overrideMerchantId)
      .maybeSingle();
    if (!m) {
      throw new AdminApiError(404, 'not_found', 'Merchant not found');
    }
    return m.id;
  }

  const overrideName = opts.overrideDisplayName?.trim();
  if (overrideName) {
    return findOrCreateMerchantByName(context, overrideName);
  }

  if (opts.suggestedMerchantId != null) {
    const { data: m } = await supabase
      .from('global_merchants')
      .select('id')
      .eq('id', opts.suggestedMerchantId)
      .maybeSingle();
    if (!m) {
      throw new AdminApiError(404, 'not_found', 'Suggested merchant not found');
    }
    return m.id;
  }

  const suggestedName = (opts.suggestedDisplayName || '').trim();
  if (!suggestedName) {
    throw new AdminApiError(
      400,
      'validation_error',
      'Suggestion has no merchant; pass global_merchant_id or display_name'
    );
  }
  return findOrCreateMerchantByName(context, suggestedName);
}

async function inferMerchantFromPatterns(patternIds: number[]): Promise<number> {
  if (patternIds.length === 0) {
    throw new AdminApiError(400, 'validation_error', 'Cannot infer merchant for approved suggestion');
  }
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('global_merchant_patterns')
    .select('global_merchant_id')
    .in('id', patternIds)
    .not('global_merchant_id', 'is', null)
    .limit(1);
  const id = data?.[0]?.global_merchant_id;
  if (id == null) {
    throw new AdminApiError(400, 'validation_error', 'Cannot infer merchant for approved suggestion');
  }
  return id as number;
}

/** Find by exact display_name or create active merchant (safe for approve overrides). */
async function findOrCreateMerchantByName(
  context: AdminApiContext,
  displayName: string
): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from('global_merchants')
    .select('id')
    .eq('display_name', displayName)
    .maybeSingle();
  if (existing) return existing.id;

  try {
    const created = await createGlobalMerchant(context, {
      display_name: displayName,
      status: 'active',
    });
    return created.id;
  } catch (error) {
    if (error instanceof AdminApiError && error.code === 'conflict') {
      const { data: again } = await supabase
        .from('global_merchants')
        .select('id')
        .eq('display_name', displayName)
        .maybeSingle();
      if (again) return again.id;
    }
    throw error;
  }
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

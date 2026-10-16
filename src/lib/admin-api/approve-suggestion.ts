/**
 * Helpers for admin-v1 suggestion approval (idempotent, conflict-safe).
 */

export type PatternMappingState = {
  id: number;
  global_merchant_id: number | null;
};

export type SkippedConflictPattern = {
  pattern_id: number;
  current_global_merchant_id: number;
};

export type ClassifyApprovePatternsResult = {
  /** Patterns currently unmapped — safe to assign to target */
  toMap: number[];
  /** Already linked to the target merchant — no write needed */
  alreadyMapped: number[];
  /** Linked to a different merchant — do not remap; report */
  skippedConflicts: SkippedConflictPattern[];
};

/**
 * Split suggestion patterns into map / already-ok / conflict buckets.
 */
export function classifyPatternsForApprove(
  patterns: PatternMappingState[],
  targetMerchantId: number
): ClassifyApprovePatternsResult {
  const toMap: number[] = [];
  const alreadyMapped: number[] = [];
  const skippedConflicts: SkippedConflictPattern[] = [];

  for (const p of patterns) {
    if (p.global_merchant_id == null) {
      toMap.push(p.id);
    } else if (p.global_merchant_id === targetMerchantId) {
      alreadyMapped.push(p.id);
    } else {
      skippedConflicts.push({
        pattern_id: p.id,
        current_global_merchant_id: p.global_merchant_id,
      });
    }
  }

  return { toMap, alreadyMapped, skippedConflicts };
}

export type ApproveSuggestionResult = {
  suggestion_id: number;
  status: 'approved';
  already_approved: boolean;
  merchant_id: number;
  patterns_grouped: number;
  patterns_already_mapped: number;
  skipped_conflicts: SkippedConflictPattern[];
  transactions_updated: number;
  groups_created: number;
  audit_id: number | null;
};

export type BulkApproveItemResult =
  | ({ id: number; ok: true } & ApproveSuggestionResult)
  | {
      id: number;
      ok: false;
      error: { code: string; message: string };
    };

import { describe, expect, it } from 'vitest';
import { classifyPatternsForApprove } from '../approve-suggestion';

describe('classifyPatternsForApprove', () => {
  it('maps unmapped patterns and keeps already-mapped on target', () => {
    const result = classifyPatternsForApprove(
      [
        { id: 1, global_merchant_id: null },
        { id: 2, global_merchant_id: 10 },
        { id: 3, global_merchant_id: null },
      ],
      10
    );
    expect(result.toMap).toEqual([1, 3]);
    expect(result.alreadyMapped).toEqual([2]);
    expect(result.skippedConflicts).toEqual([]);
  });

  it('skips patterns mapped to a different merchant without remapping them', () => {
    const result = classifyPatternsForApprove(
      [
        { id: 1, global_merchant_id: null },
        { id: 2, global_merchant_id: 99 },
        { id: 3, global_merchant_id: 10 },
      ],
      10
    );
    expect(result.toMap).toEqual([1]);
    expect(result.alreadyMapped).toEqual([3]);
    expect(result.skippedConflicts).toEqual([
      { pattern_id: 2, current_global_merchant_id: 99 },
    ]);
  });

  it('reports all conflicts when nothing is safe to map', () => {
    const result = classifyPatternsForApprove(
      [
        { id: 1, global_merchant_id: 5 },
        { id: 2, global_merchant_id: 6 },
      ],
      10
    );
    expect(result.toMap).toEqual([]);
    expect(result.alreadyMapped).toEqual([]);
    expect(result.skippedConflicts).toHaveLength(2);
  });
});

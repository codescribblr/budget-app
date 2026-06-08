import type { DetectionTransaction } from '../types';

const BILL_LIKE =
  /utilit|electric|power|energy|water|sewer|trash|garbage|gas bill|internet|broadband|cable|phone|mobile|wireless|insurance|mortgage|rent|hoa|dues|subscription|streaming|medical|dental|health/i;

const INCOME_LIKE =
  /income|paycheck|salary|wages|payroll|dividend|rental income|pension|social security/i;

const DISCRETIONARY =
  /dining|restaurant|food|fast food|coffee|cafe|grocery|groceries|shopping|entertainment|fun money|hobby|clothing|gas|fuel|transport(?!ation bill)/i;

export interface CategoryProfile {
  dominantCategory: string | null;
  consensus: number;
  baseScore: number;
  weightedScore: number;
}

function getPrimarySplit(txn: DetectionTransaction) {
  const valid = txn.splits.filter((s) => !s.is_system && !s.is_buffer);
  if (valid.length === 0) return null;
  return valid.reduce((best, split) =>
    split.amount > best.amount ? split : best
  );
}

export function buildCategoryProfile(
  transactions: DetectionTransaction[]
): CategoryProfile {
  const weights = new Map<string, number>();

  for (const txn of transactions) {
    const primary = getPrimarySplit(txn);
    if (!primary?.category_name) continue;
    const name = primary.category_name.trim();
    weights.set(name, (weights.get(name) || 0) + 1);
  }

  if (weights.size === 0) {
    return {
      dominantCategory: null,
      consensus: 0,
      baseScore: 0,
      weightedScore: 0,
    };
  }

  let dominantCategory = '';
  let maxWeight = 0;
  for (const [name, weight] of weights.entries()) {
    if (weight > maxWeight) {
      maxWeight = weight;
      dominantCategory = name;
    }
  }

  const consensus = maxWeight / transactions.length;
  const normalized = dominantCategory.toLowerCase();

  let baseScore = 0;
  if (BILL_LIKE.test(normalized)) baseScore = 0.15;
  else if (INCOME_LIKE.test(normalized)) baseScore = 0.15;
  else if (DISCRETIONARY.test(normalized)) baseScore = -0.15;

  let consensusMultiplier = 0;
  if (consensus >= 0.8) consensusMultiplier = 1;
  else if (consensus >= 0.6) consensusMultiplier = 0.7;
  else if (consensus >= 0.4) consensusMultiplier = 0.4;

  return {
    dominantCategory,
    consensus,
    baseScore,
    weightedScore: baseScore * consensusMultiplier,
  };
}

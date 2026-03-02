/**
 * AI-powered merchant pattern suggestions (Google Gemini).
 * Used by the suggest_merchant_groupings job to propose groupings of ungrouped patterns.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS } from './constants';

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MERCHANT_SUGGESTIONS_MODEL || GEMINI_MODELS.pro;

export interface UngroupedPattern {
  id: number;
  pattern: string;
  normalized_pattern: string;
  usage_count: number;
}

export interface ExistingMerchant {
  id: number;
  display_name: string;
}

export interface RawSuggestion {
  suggested_merchant_id: number | null;
  suggested_display_name: string | null;
  pattern_ids: number[];
}

export interface MerchantSuggestionResult {
  suggestions: RawSuggestion[];
  tokensUsed?: number;
}

/**
 * Build rejection set key for (pattern_id, merchant_key).
 * merchant_key is either "m:<id>" or "n:<normalized_name>"
 */
export function rejectionKey(patternId: number, merchantId: number | null, suggestedName: string | null): string {
  if (merchantId !== null) return `${patternId}:m:${merchantId}`;
  const name = (suggestedName || '').toLowerCase().trim().replace(/\s+/g, ' ');
  return `${patternId}:n:${name}`;
}

/**
 * Post-filter AI output: remove any (pattern_id, merchant) pair that is in the rejection set.
 */
export function applyRejectionFilter(
  suggestions: RawSuggestion[],
  rejectionSet: Set<string>
): RawSuggestion[] {
  const result: RawSuggestion[] = [];
  for (const s of suggestions) {
    const filteredIds = s.pattern_ids.filter((pid) => {
      const keyMerchant = s.suggested_merchant_id !== null
        ? rejectionKey(pid, s.suggested_merchant_id, null)
        : rejectionKey(pid, null, s.suggested_display_name || '');
      return !rejectionSet.has(keyMerchant);
    });
    if (filteredIds.length > 0) {
      result.push({ ...s, pattern_ids: filteredIds });
    }
  }
  return result;
}

/**
 * Deduplicate pattern_ids across suggestions (first suggestion wins).
 */
export function deduplicatePatternIds(suggestions: RawSuggestion[]): RawSuggestion[] {
  const used = new Set<number>();
  return suggestions.map((s) => {
    const unique = s.pattern_ids.filter((id) => {
      if (used.has(id)) return false;
      used.add(id);
      return true;
    });
    return { ...s, pattern_ids: unique };
  }).filter((s) => s.pattern_ids.length > 0);
}

/**
 * Call Gemini to suggest merchant groupings for ungrouped patterns.
 * Returns parsed and post-filtered suggestions (rejection filter and dedup applied).
 */
export async function generateMerchantSuggestions(
  ungroupedPatterns: UngroupedPattern[],
  existingMerchants: ExistingMerchant[],
  rejectionSet: Set<string>
): Promise<MerchantSuggestionResult> {
  if (!API_KEY) {
    throw new Error('Google Gemini API key not configured (GOOGLE_GEMINI_API_KEY)');
  }
  if (ungroupedPatterns.length === 0) {
    return { suggestions: [] };
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const patternsJson = JSON.stringify(
    ungroupedPatterns.map((p) => ({
      id: p.id,
      pattern: p.pattern,
      normalized_pattern: p.normalized_pattern,
      usage_count: p.usage_count,
    }))
  );
  const merchantsJson = JSON.stringify(
    existingMerchants.map((m) => ({ id: m.id, display_name: m.display_name }))
  );

  const prompt = `You are an expert at matching transaction descriptions (merchant patterns) to canonical merchant names. Transaction patterns often contain unique IDs, dates, or location codes; your job is to recognize the underlying real-world merchant.

Given a list of ungrouped patterns and existing merchants, produce suggested groupings. For each group of patterns that clearly refer to the same merchant, either:
- Assign them to an existing merchant by setting suggested_merchant_id to that merchant's id and suggested_display_name to null, OR
- Propose a new merchant by setting suggested_merchant_id to null and suggested_display_name to a clear, human-readable name (e.g. "Amazon", "Starbucks").

Rules:
- Group only when you are confident (same real-world merchant).
- Use suggested_merchant_id when the pattern clearly matches an existing merchant (exact or obvious match to display_name).
- Use suggested_display_name only for "create new"; must be a clear, human-readable name. Do NOT suggest a new merchant name that already exists in the existing_merchants list.
- Leave ambiguous or generic patterns out of any suggestion (they stay ungrouped).
- Each pattern id may appear at most once across all suggestions.
- Patterns with unique IDs or dates in the text (e.g. "AMZN Mktp US*AB1C2D3E4") should be grouped under the recognizable merchant (e.g. Amazon).

Ungrouped patterns (JSON):
${patternsJson}

Existing merchants (JSON):
${merchantsJson}

Return ONLY a valid JSON object with this exact structure, no other text or markdown:
{"suggestions": [{"suggested_merchant_id": number or null, "suggested_display_name": string or null, "pattern_ids": [number, ...]}, ...]}

Each suggestion must have either suggested_merchant_id set (and suggested_display_name null) or suggested_display_name set (and suggested_merchant_id null).`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  let text = response.text?.()?.trim() ?? '';
  if (!text) throw new Error('Empty response from Gemini');

  // Strip markdown code blocks if present
  if (text.startsWith('```')) {
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }
  let parsed: { suggestions?: RawSuggestion[] };
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    console.error('Merchant suggestions parse error:', text.slice(0, 500));
    throw new Error('Invalid JSON from Gemini merchant suggestions');
  }
  let suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  suggestions = applyRejectionFilter(suggestions, rejectionSet);
  suggestions = deduplicatePatternIds(suggestions);

  const tokensUsed = (response as any).usageMetadata?.totalTokenCount;
  return { suggestions, tokensUsed };
}

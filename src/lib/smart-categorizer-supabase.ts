import { createClient } from './supabase/server';
import {
  findBestCategoryForMerchant,
  learnFromImportedTransactions as learnFromTransactions,
  normalizeMerchant as normalizeMerchantName
} from './merchant-category-rules';

/**
 * Normalize merchant name for consistent matching
 * Removes common variations, special characters, and standardizes format
 */
export function normalizeMerchant(merchant: string): string {
  return normalizeMerchantName(merchant);
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a score from 0 (completely different) to 1 (identical)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length);
    const shorter = Math.min(s1.length, s2.length);
    return shorter / longer * 0.95; // Slightly less than exact match
  }
  
  // Levenshtein distance
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - (distance / maxLength);
}

/**
 * Find the best matching category for a merchant using learned mappings
 * Only returns categories that currently exist in the database
 * Now uses the new merchant_category_rules table and merchant groups
 */
export async function findLearnedCategory(merchant: string): Promise<{ categoryId: number; confidence: number } | null> {
  const result = await findBestCategoryForMerchant(merchant);

  if (result) {
    return {
      categoryId: result.categoryId,
      confidence: result.confidence,
    };
  }

  return null;
}

/**
 * Fallback keyword-based categorization for unknown merchants
 */
export function suggestCategoryByKeywords(merchant: string, categories: any[]): number | undefined {
  const merchantLower = merchant.toLowerCase();
  
  const categoryMap: { [key: string]: string[] } = {
    'groceries': ['walmart', 'costco', 'aldi', 'food lion', 'harris teeter', 'publix', 'target', 'kroger', 'safeway', 'whole foods', 'trader joe'],
    'restaurants': ['mcdonald', 'burger king', 'chick-fil-a', 'taco bell', 'wendy', 'arby', 'pizza', 'chipotle', 'zaxby', 'tropical grille', 'texas roadhouse', 'domino', 'jack in the box', 'firehouse', 'subway', 'panera', 'starbucks', 'dunkin'],
    'gas': ['qt ', 'murphy', 'shell', 'exxon', 'bp ', 'chevron', 'mobil', 'sunoco', 'citgo', 'valero', 'marathon', 'speedway', 'wawa', 'sheetz'],
    'entertainment': ['amazon', 'disney', 'netflix', 'hulu', 'spotify', 'apple music', 'youtube', 'hbo', 'paramount'],
    'auto': ['toyota', 'honda', 'ford', 'chevrolet', 'autozone', 'car wash', 'express wash', 'jiffy lube', 'valvoline', 'pep boys', 'napa'],
    'home': ['home depot', 'lowes', 'lowe\'s', 'ace hardware', 'menards'],
    'pharmacy': ['cvs', 'walgreens', 'rite aid', 'pharmacy'],
    'clothing': ['target', 'walmart', 'kohls', 'macy', 'nordstrom', 'gap', 'old navy', 'tj maxx', 'marshalls'],
  };
  
  for (const [categoryName, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(keyword => merchantLower.includes(keyword))) {
      const category = categories.find(c => c.name.toLowerCase().includes(categoryName));
      if (category) {
        return category.id;
      }
    }
  }
  
  return undefined;
}

/**
 * Learn a new merchant-to-category mapping
 * Now uses the new merchant_category_rules system
 */
export async function learnMerchantMapping(merchant: string, categoryId: number): Promise<void> {
  // Delegate to the new merchant category rules system
  const { learnFromTransaction } = await import('./merchant-category-rules');
  await learnFromTransaction(merchant, categoryId);
}

/**
 * Get smart category suggestion combining learned mappings and keyword matching
 * Only suggests categories that exist in the provided categories array
 */
export async function getSmartCategorySuggestion(
  merchant: string,
  categories: any[]
): Promise<{ categoryId: number; confidence: number; source: 'learned' | 'keyword' } | null> {
  // Create a set of valid category IDs for quick lookup
  const validCategoryIds = new Set(categories.map(c => c.id));

  // First, try learned mappings
  const learned = await findLearnedCategory(merchant);
  if (learned && validCategoryIds.has(learned.categoryId) && learned.confidence >= 0.5) {
    return {
      categoryId: learned.categoryId,
      confidence: learned.confidence,
      source: 'learned',
    };
  }

  // Fallback to keyword matching (already validates against categories array)
  const keywordMatch = suggestCategoryByKeywords(merchant, categories);
  if (keywordMatch) {
    return {
      categoryId: keywordMatch,
      confidence: 0.3, // Lower confidence for keyword matches
      source: 'keyword',
    };
  }

  // If learned match exists but low confidence, still return it (if valid)
  if (learned && validCategoryIds.has(learned.categoryId)) {
    return {
      categoryId: learned.categoryId,
      confidence: learned.confidence,
      source: 'learned',
    };
  }

  return null;
}

/**
 * Bulk learn from imported transactions
 * Now uses the new merchant_category_rules system
 */
export async function learnFromImportedTransactions(transactions: Array<{ merchant: string; categoryId: number }>): Promise<void> {
  // Delegate to the new merchant category rules system
  await learnFromTransactions(transactions);
}



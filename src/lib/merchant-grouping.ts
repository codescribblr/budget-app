/**
 * Merchant Grouping Utilities
 * 
 * This module provides functions for normalizing merchant names,
 * calculating similarity scores, and grouping merchants intelligently.
 */

/**
 * Normalize a merchant description by removing noise and standardizing format
 */
export function normalizeMerchantName(description: string): string {
  let normalized = description.toUpperCase().trim();

  // Remove common date patterns (YYMMDD, MMDDYY, etc.)
  normalized = normalized.replace(/\b\d{6}\b/g, '');
  
  // Remove common transaction ID patterns (long sequences of digits)
  normalized = normalized.replace(/\b\d{8,}\b/g, '');
  
  // Remove common noise words and patterns
  const noiseWords = [
    'ACH', 'PMT', 'PAYMENT', 'TXN', 'TRANSACTION',
    'DEBIT', 'CREDIT', 'PURCHASE', 'POS',
    'ONLINE', 'WEB', 'MOBILE', 'APP',
    'INC', 'LLC', 'LTD', 'CORP', 'CO',
  ];

  noiseWords.forEach(word => {
    // Escape special regex characters in the word
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'g');
    normalized = normalized.replace(regex, '');
  });

  // Remove special characters except spaces
  normalized = normalized.replace(/[^A-Z0-9\s]/g, ' ');
  
  // Normalize whitespace (multiple spaces to single space)
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Calculate Jaro-Winkler similarity between two strings
 * Returns a value between 0 (no similarity) and 1 (identical)
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  // Handle edge cases
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // Calculate Jaro similarity
  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (
    matches / s1.length +
    matches / s2.length +
    (matches - transpositions / 2) / matches
  ) / 3;

  // Calculate Jaro-Winkler (with prefix bonus)
  const prefixLength = Math.min(4, Math.min(s1.length, s2.length));
  let commonPrefix = 0;
  for (let i = 0; i < prefixLength; i++) {
    if (s1[i] === s2[i]) commonPrefix++;
    else break;
  }

  const jaroWinkler = jaro + commonPrefix * 0.1 * (1 - jaro);
  return jaroWinkler;
}

/**
 * Extract a suggested display name from a merchant description
 * This tries to find the most meaningful part of the description
 */
export function extractDisplayName(description: string): string {
  // Start with normalized version
  let displayName = normalizeMerchantName(description);
  
  // If empty after normalization, use original
  if (!displayName) {
    displayName = description.trim();
  }
  
  // Convert to title case for better readability
  displayName = displayName
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Limit length
  if (displayName.length > 50) {
    displayName = displayName.substring(0, 50).trim() + '...';
  }
  
  return displayName;
}

/**
 * Find the best matching merchant group for a given description
 */
export interface MatchResult {
  groupId: number;
  displayName: string;
  similarity: number;
  normalizedPattern: string;
}

export function findBestMatch(
  description: string,
  existingGroups: Array<{ id: number; display_name: string; normalized_pattern: string }>,
  threshold: number = 0.85
): MatchResult | null {
  const normalized = normalizeMerchantName(description);

  // If normalization resulted in empty string, can't match
  if (!normalized || normalized.trim().length === 0) {
    return null;
  }

  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const group of existingGroups) {
    // Skip groups with empty normalized patterns
    if (!group.normalized_pattern || group.normalized_pattern.trim().length === 0) {
      continue;
    }

    // Check for exact normalized match first
    if (normalized === group.normalized_pattern) {
      return {
        groupId: group.id,
        displayName: group.display_name,
        similarity: 1.0,
        normalizedPattern: group.normalized_pattern,
      };
    }

    // Calculate similarity
    const similarity = jaroWinklerSimilarity(normalized, group.normalized_pattern);

    if (similarity > bestScore && similarity >= threshold) {
      bestScore = similarity;
      bestMatch = {
        groupId: group.id,
        displayName: group.display_name,
        similarity,
        normalizedPattern: group.normalized_pattern,
      };
    }
  }

  return bestMatch;
}

/**
 * Group similar merchant descriptions together
 * Returns an array of groups, each containing similar descriptions
 */
export interface MerchantCluster {
  displayName: string;
  normalizedPattern: string;
  descriptions: string[];
  confidence: number;
}

export function clusterMerchants(
  descriptions: string[],
  threshold: number = 0.85
): MerchantCluster[] {
  const clusters: MerchantCluster[] = [];
  const processed = new Set<string>();

  // Sort by length (longer descriptions first, as they're often more complete)
  const sortedDescriptions = [...descriptions].sort((a, b) => b.length - a.length);

  for (const description of sortedDescriptions) {
    if (processed.has(description)) continue;

    const normalized = normalizeMerchantName(description);

    // Skip if normalization resulted in empty string
    if (!normalized || normalized.trim().length === 0) {
      processed.add(description);
      continue;
    }

    const cluster: MerchantCluster = {
      displayName: extractDisplayName(description),
      normalizedPattern: normalized,
      descriptions: [description],
      confidence: 1.0,
    };

    processed.add(description);

    // Find similar descriptions
    for (const otherDescription of sortedDescriptions) {
      if (processed.has(otherDescription)) continue;

      const otherNormalized = normalizeMerchantName(otherDescription);

      // Skip if normalization resulted in empty string
      if (!otherNormalized || otherNormalized.trim().length === 0) {
        continue;
      }

      const similarity = jaroWinklerSimilarity(normalized, otherNormalized);

      if (similarity >= threshold) {
        cluster.descriptions.push(otherDescription);
        cluster.confidence = Math.min(cluster.confidence, similarity);
        processed.add(otherDescription);
      }
    }

    clusters.push(cluster);
  }

  // Sort clusters by number of descriptions (most common first)
  clusters.sort((a, b) => b.descriptions.length - a.descriptions.length);

  return clusters;
}

/**
 * Calculate confidence score for a merchant grouping
 * Based on similarity score and other factors
 */
export function calculateConfidence(similarity: number, descriptionCount: number = 1): number {
  // Base confidence is the similarity score
  let confidence = similarity;

  // Boost confidence if multiple descriptions map to the same group
  if (descriptionCount > 1) {
    confidence = Math.min(1.0, confidence + (descriptionCount - 1) * 0.02);
  }

  // Round to 2 decimal places
  return Math.round(confidence * 100) / 100;
}



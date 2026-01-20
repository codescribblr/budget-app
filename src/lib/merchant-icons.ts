/**
 * Comprehensive merchant/brand icons from react-icons Simple Icons (Si prefix)
 * Dynamically loads all available Simple Icons for maximum coverage
 */

// Import all Simple Icons - we'll dynamically access them
import * as SiIcons from 'react-icons/si';

export interface MerchantIcon {
  name: string; // Component name (e.g., 'SiAmazon')
  displayName: string; // Human-readable name (e.g., 'Amazon')
  keywords: string[]; // Search keywords
}

/**
 * Convert component name to display name
 * Examples: SiAmazon -> Amazon, SiAmericanexpress -> American Express
 */
function componentNameToDisplayName(componentName: string): string {
  // Remove 'Si' prefix
  let name = componentName.replace(/^Si/, '');
  
  // Handle common patterns
  // Convert camelCase to Title Case with spaces
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // Handle special cases
  const specialCases: Record<string, string> = {
    'Americanexpress': 'American Express',
    'Applepay': 'Apple Pay',
    'Googlepay': 'Google Pay',
    'Amazonaws': 'Amazon Web Services',
    'Ubereats': 'Uber Eats',
    'Pizzahut': 'Pizza Hut',
    'HomeDepot': 'Home Depot',
    'Wholefoods': 'Whole Foods',
    'Atandt': 'AT&T',
    'Tmobile': 'T-Mobile',
    'Mastercard': 'Mastercard',
    'Paypal': 'PayPal',
    'Mcdonalds': 'McDonald\'s',
    'Dominos': 'Domino\'s',
  };
  
  if (specialCases[name]) {
    return specialCases[name];
  }
  
  // Capitalize first letter of each word
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate search keywords from component name and display name
 */
function generateKeywords(componentName: string, displayName: string): string[] {
  const keywords: string[] = [];
  
  // Add display name variations
  keywords.push(displayName.toLowerCase());
  
  // Add component name without 'Si' prefix
  const nameWithoutPrefix = componentName.replace(/^Si/, '').toLowerCase();
  keywords.push(nameWithoutPrefix);
  
  // Split camelCase and add parts
  const camelCaseParts = nameWithoutPrefix.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(' ');
  keywords.push(...camelCaseParts);
  
  // Add common variations
  if (nameWithoutPrefix.includes('pay')) {
    keywords.push('payment', 'pay');
  }
  if (nameWithoutPrefix.includes('card')) {
    keywords.push('credit', 'card', 'payment');
  }
  if (nameWithoutPrefix.includes('food') || nameWithoutPrefix.includes('restaurant') || nameWithoutPrefix.includes('cafe')) {
    keywords.push('food', 'restaurant', 'dining');
  }
  if (nameWithoutPrefix.includes('store') || nameWithoutPrefix.includes('shop') || nameWithoutPrefix.includes('retail')) {
    keywords.push('store', 'retail', 'shopping', 'ecommerce');
  }
  if (nameWithoutPrefix.includes('gas') || nameWithoutPrefix.includes('fuel') || nameWithoutPrefix.includes('station')) {
    keywords.push('gas', 'fuel', 'gas station');
  }
  if (nameWithoutPrefix.includes('hotel') || nameWithoutPrefix.includes('travel') || nameWithoutPrefix.includes('booking')) {
    keywords.push('travel', 'hotel', 'accommodation');
  }
  if (nameWithoutPrefix.includes('bank') || nameWithoutPrefix.includes('financial')) {
    keywords.push('bank', 'financial', 'banking');
  }
  if (nameWithoutPrefix.includes('phone') || nameWithoutPrefix.includes('mobile') || nameWithoutPrefix.includes('telecom')) {
    keywords.push('phone', 'mobile', 'telecom', 'cellular');
  }
  if (nameWithoutPrefix.includes('streaming') || nameWithoutPrefix.includes('video') || nameWithoutPrefix.includes('music')) {
    keywords.push('streaming', 'entertainment', 'media');
  }
  
  // Remove duplicates and empty strings
  return Array.from(new Set(keywords.filter(k => k.length > 0)));
}

/**
 * Get all available Simple Icons dynamically
 * This extracts all exported icons from react-icons/si
 */
function getAllSimpleIcons(): MerchantIcon[] {
  const icons: MerchantIcon[] = [];
  
  // Iterate through all exports from react-icons/si
  for (const [key, value] of Object.entries(SiIcons)) {
    // Only include components that start with 'Si' and are React components
    if (key.startsWith('Si') && typeof value === 'function') {
      const displayName = componentNameToDisplayName(key);
      const keywords = generateKeywords(key, displayName);
      
      icons.push({
        name: key,
        displayName,
        keywords,
      });
    }
  }
  
  // Sort alphabetically by display name
  return icons.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Cache all icons to avoid recomputing on every call
 */
let cachedIcons: MerchantIcon[] | null = null;

/**
 * Get all merchant icons (cached)
 */
export function getAllMerchantIcons(): MerchantIcon[] {
  if (!cachedIcons) {
    cachedIcons = getAllSimpleIcons();
  }
  return cachedIcons;
}

/**
 * Get the icon component by name
 */
export function getIconComponent(iconName: string) {
  if (!iconName || !iconName.startsWith('Si')) {
    return null;
  }
  
  // @ts-ignore - dynamic access to icon components
  return SiIcons[iconName] || null;
}

/**
 * Search icons by query string
 * Searches across display name, component name, and keywords
 */
export function searchIcons(query: string): MerchantIcon[] {
  const allIcons = getAllMerchantIcons();
  
  if (!query.trim()) {
    return allIcons;
  }
  
  const lowerQuery = query.toLowerCase().trim();
  const queryTerms = lowerQuery.split(/\s+/); // Split into multiple search terms
  
  return allIcons.filter(icon => {
    const searchableText = [
      icon.displayName.toLowerCase(),
      icon.name.toLowerCase(),
      ...icon.keywords,
    ].join(' ');
    
    // Check if all query terms match (AND logic)
    return queryTerms.every(term => searchableText.includes(term));
  });
}

/**
 * Get icon count for display purposes
 */
export function getIconCount(): number {
  return getAllMerchantIcons().length;
}

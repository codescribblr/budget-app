/**
 * Shared client-side cache for budget accounts API calls
 * Prevents duplicate calls from AccountSwitcher and AccountSelectionGuard
 */

interface BudgetAccountsData {
  accounts: Array<{
    accountId: number;
    accountName: string;
    role: 'owner' | 'editor' | 'viewer';
    isOwner: boolean;
  }>;
  activeAccountId: number | null;
  hasOwnAccount: boolean;
}

interface CacheEntry {
  data: BudgetAccountsData | null;
  timestamp: number;
  promise: Promise<BudgetAccountsData> | null;
}

let cache: CacheEntry = {
  data: null,
  timestamp: 0,
  promise: null,
};

const CACHE_TTL = 5000; // 5 seconds

/**
 * Fetch budget accounts with caching to prevent duplicate calls
 */
export async function fetchBudgetAccounts(): Promise<BudgetAccountsData> {
  const now = Date.now();

  // Check cache first
  if (cache.data && (now - cache.timestamp) < CACHE_TTL) {
    return cache.data;
  }

  // If there's an ongoing request, wait for it
  if (cache.promise) {
    try {
      const result = await cache.promise;
      // Check cache again after waiting (it might have been updated)
      if (cache.data && (now - cache.timestamp) < CACHE_TTL) {
        return cache.data;
      }
      return result;
    } catch (error) {
      // If cached promise failed, continue to make a new request
    }
  }

  // Make the fetch request
  const fetchPromise = fetch('/api/budget-accounts')
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch budget accounts');
      }
      const data = await response.json();
      const result: BudgetAccountsData = {
        accounts: data.accounts || [],
        activeAccountId: data.activeAccountId,
        hasOwnAccount: data.hasOwnAccount || false,
      };

      // Update cache
      cache = {
        data: result,
        timestamp: Date.now(),
        promise: null,
      };

      return result;
    })
    .catch((error) => {
      cache.promise = null;
      throw error;
    });

  cache.promise = fetchPromise;
  return fetchPromise;
}

/**
 * Clear the cache (useful after account switching)
 */
export function clearBudgetAccountsCache(): void {
  cache = {
    data: null,
    timestamp: 0,
    promise: null,
  };
}





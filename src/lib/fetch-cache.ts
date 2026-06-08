/**
 * Simple client-side fetch cache to prevent duplicate API calls
 * Caches responses for a short duration (default 5 seconds)
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  promise?: Promise<any>;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 5000; // 5 seconds

/**
 * Cached fetch that prevents duplicate calls to the same URL within TTL window
 */
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  ttl: number = DEFAULT_TTL
): Promise<Response> {
  const cacheKey = `${url}:${JSON.stringify(options || {})}`;
  const now = Date.now();
  const entry = cache.get(cacheKey);

  // If we have a valid cached entry, return it
  if (entry && (now - entry.timestamp) < ttl) {
    // If there's an ongoing request, wait for it
    if (entry.promise) {
      await entry.promise;
    }
    // Return a new Response-like object with cached data
    return new Response(JSON.stringify(entry.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // If there's an ongoing request, wait for it instead of making a new one
  if (entry?.promise) {
    await entry.promise;
    const updatedEntry = cache.get(cacheKey);
    if (updatedEntry && (now - updatedEntry.timestamp) < ttl) {
      return new Response(JSON.stringify(updatedEntry.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Make the actual fetch request
  const fetchPromise = fetch(url, options)
    .then(async (response) => {
      const data = await response.json();
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      return response;
    })
    .catch((error) => {
      // Remove failed request from cache
      cache.delete(cacheKey);
      throw error;
    });

  // Store the promise so other calls can wait for it
  cache.set(cacheKey, {
    data: entry?.data,
    timestamp: entry?.timestamp || 0,
    promise: fetchPromise,
  });

  return fetchPromise;
}

/**
 * Clear cache for a specific URL pattern
 */
export function clearCache(urlPattern?: string): void {
  if (urlPattern) {
    const keysToDelete = Array.from(cache.keys()).filter((key) =>
      key.startsWith(urlPattern)
    );
    keysToDelete.forEach((key) => cache.delete(key));
  } else {
    cache.clear();
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredEntries(ttl: number = DEFAULT_TTL): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  cache.forEach((entry, key) => {
    if (now - entry.timestamp >= ttl) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => cache.delete(key));
}

// Clean up expired entries every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    clearExpiredEntries();
  }, 30000);
}










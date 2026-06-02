import { MAX_SEARCH_QUERY_LENGTH } from './constants';

/** Escape SQL LIKE wildcards and strip PostgREST filter-breaking characters. */
export function sanitizeSearchQuery(query: string, maxLength = MAX_SEARCH_QUERY_LENGTH): string {
  return query
    .trim()
    .slice(0, maxLength)
    .replace(/[%_\\]/g, (match) => `\\${match}`)
    .replace(/[,()"']/g, '');
}

export function buildIlikePattern(query: string, maxLength = MAX_SEARCH_QUERY_LENGTH): string {
  const sanitized = sanitizeSearchQuery(query, maxLength);
  return sanitized ? `%${sanitized}%` : '%';
}

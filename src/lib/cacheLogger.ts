/**
 * Cache Logger - Development mode logging utilities for cache operations
 * 
 * Provides detailed console output for cache operations in development mode:
 * - Cache hits/misses with latency information
 * - Cache writes with entry size
 * - Evictions with reason (LRU, size limit, etc.)
 * - Request deduplication events
 * - Polling interval changes
 * 
 * All logging is conditional on development mode (import.meta.env.DEV)
 * 
 * **Requirements Validated:**
 * - Requirement 15.6: Log performance metrics to console in development mode
 */

/**
 * Check if running in development mode
 */
function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

/**
 * Format timestamp for log messages
 */
function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString().split('T')[1].split('.')[0];
}

/**
 * Format size in bytes to human-readable format
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * Format latency in milliseconds
 */
function formatLatency(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Log cache hit event
 * 
 * @param key - Cache key that was hit
 * @param latency - Read latency in milliseconds
 * @param source - Source of the cache hit ('memory' or 'indexeddb')
 */
export function logCacheHit(key: string, latency: number, source: 'memory' | 'indexeddb' = 'memory'): void {
  if (!isDevelopment()) return;

  console.log(
    `%c[Cache] %c✓ HIT %c${key}`,
    'color: #888; font-weight: bold',
    'color: #0a0; font-weight: bold',
    'color: #06c',
    {
      latency: formatLatency(latency),
      source,
      timestamp: formatTimestamp(),
    }
  );
}

/**
 * Log cache miss event
 * 
 * @param key - Cache key that was missed
 * @param latency - Read latency in milliseconds
 */
export function logCacheMiss(key: string, latency: number): void {
  if (!isDevelopment()) return;

  console.log(
    `%c[Cache] %c✗ MISS %c${key}`,
    'color: #888; font-weight: bold',
    'color: #f80; font-weight: bold',
    'color: #06c',
    {
      latency: formatLatency(latency),
      timestamp: formatTimestamp(),
    }
  );
}

/**
 * Log cache write event
 * 
 * @param key - Cache key being written
 * @param size - Size of the cached entry in bytes
 * @param ttl - Time-to-live in milliseconds
 */
export function logCacheWrite(key: string, size: number, ttl: number): void {
  if (!isDevelopment()) return;

  console.log(
    `%c[Cache] %c← WRITE %c${key}`,
    'color: #888; font-weight: bold',
    'color: #08c; font-weight: bold',
    'color: #06c',
    {
      size: formatSize(size),
      ttl: `${(ttl / 1000).toFixed(0)}s`,
      timestamp: formatTimestamp(),
    }
  );
}

/**
 * Log cache eviction event
 * 
 * @param key - Cache key being evicted
 * @param reason - Reason for eviction
 * @param size - Size of the evicted entry in bytes
 */
export function logCacheEviction(
  key: string,
  reason: 'lru' | 'size-limit' | 'ttl-expired' | 'manual',
  size: number
): void {
  if (!isDevelopment()) return;

  const reasonLabels = {
    'lru': 'LRU',
    'size-limit': 'SIZE LIMIT',
    'ttl-expired': 'TTL EXPIRED',
    'manual': 'MANUAL',
  };

  console.warn(
    `%c[Cache] %c⚠ EVICT %c${key}`,
    'color: #888; font-weight: bold',
    'color: #f60; font-weight: bold',
    'color: #06c',
    {
      reason: reasonLabels[reason],
      size: formatSize(size),
      timestamp: formatTimestamp(),
    }
  );
}

/**
 * Log request deduplication event
 * 
 * @param key - Cache key for the deduplicated request
 * @param subscribers - Number of subscribers waiting for this request
 * @param action - Whether this is a new request or joining an existing one
 */
export function logRequestDeduplication(
  key: string,
  subscribers: number,
  action: 'new' | 'joined' | 'completed'
): void {
  if (!isDevelopment()) return;

  const actionLabels = {
    'new': '→ NEW',
    'joined': '⇉ JOINED',
    'completed': '✓ COMPLETED',
  };

  const actionColors = {
    'new': '#08c',
    'joined': '#f80',
    'completed': '#0a0',
  };

  console.log(
    `%c[Dedupe] %c${actionLabels[action]} %c${key}`,
    'color: #888; font-weight: bold',
    `color: ${actionColors[action]}; font-weight: bold`,
    'color: #06c',
    {
      subscribers,
      timestamp: formatTimestamp(),
    }
  );
}

/**
 * Log polling interval change event
 * 
 * @param previousInterval - Previous polling interval in milliseconds
 * @param newInterval - New polling interval in milliseconds
 * @param unchangedCount - Number of consecutive polls with unchanged data
 * @param reason - Reason for the interval change
 */
export function logPollingIntervalChange(
  previousInterval: number,
  newInterval: number,
  unchangedCount: number,
  reason: 'data-changed' | 'backoff' | 'error' | 'reset'
): void {
  if (!isDevelopment()) return;

  const reasonLabels = {
    'data-changed': 'DATA CHANGED',
    'backoff': 'BACKOFF',
    'error': 'ERROR',
    'reset': 'RESET',
  };

  const reasonColors = {
    'data-changed': '#0a0',
    'backoff': '#f80',
    'error': '#f00',
    'reset': '#08c',
  };

  console.log(
    `%c[Polling] %c${reasonLabels[reason]}`,
    'color: #888; font-weight: bold',
    `color: ${reasonColors[reason]}; font-weight: bold`,
    {
      previousInterval: `${(previousInterval / 1000).toFixed(1)}s`,
      newInterval: `${(newInterval / 1000).toFixed(1)}s`,
      unchangedCount,
      timestamp: formatTimestamp(),
    }
  );
}

/**
 * Log cache statistics summary
 * 
 * @param stats - Cache statistics object
 */
export function logCacheStats(stats: {
  size: number;
  entryCount: number;
  hitRate: number;
  cacheHits: number;
  cacheMisses: number;
  evictions: number;
  avgReadLatency: number;
  avgWriteLatency: number;
}): void {
  if (!isDevelopment()) return;

  console.group('%c[Cache] 📊 Statistics', 'color: #888; font-weight: bold');
  console.table({
    'Cache Size': formatSize(stats.size),
    'Entry Count': stats.entryCount,
    'Hit Rate': `${(stats.hitRate * 100).toFixed(1)}%`,
    'Cache Hits': stats.cacheHits,
    'Cache Misses': stats.cacheMisses,
    'Evictions': stats.evictions,
    'Avg Read Latency': formatLatency(stats.avgReadLatency),
    'Avg Write Latency': formatLatency(stats.avgWriteLatency),
  });
  console.groupEnd();
}

/**
 * Log cache initialization event
 * 
 * @param mode - Initialization mode ('indexeddb' or 'memory-only')
 * @param preloadedEntries - Number of entries preloaded from IndexedDB
 */
export function logCacheInit(mode: 'indexeddb' | 'memory-only', preloadedEntries?: number): void {
  if (!isDevelopment()) return;

  console.log(
    `%c[Cache] %c⚡ INIT`,
    'color: #888; font-weight: bold',
    'color: #0a0; font-weight: bold',
    {
      mode,
      preloadedEntries: preloadedEntries ?? 0,
      timestamp: formatTimestamp(),
    }
  );
}

/**
 * Log cache error event
 * 
 * @param operation - Operation that failed
 * @param key - Cache key involved (if applicable)
 * @param error - Error object or message
 */
export function logCacheError(
  operation: 'read' | 'write' | 'delete' | 'init' | 'persist',
  key: string | null,
  error: unknown
): void {
  if (!isDevelopment()) return;

  const errorMessage = error instanceof Error ? error.message : String(error);

  console.error(
    `%c[Cache] %c✗ ERROR %c${operation.toUpperCase()}`,
    'color: #888; font-weight: bold',
    'color: #f00; font-weight: bold',
    'color: #f60',
    {
      key: key ?? 'N/A',
      error: errorMessage,
      timestamp: formatTimestamp(),
    }
  );
}

/**
 * Log prefetch event
 * 
 * @param key - Cache key being prefetched
 * @param trigger - What triggered the prefetch
 */
export function logPrefetch(key: string, trigger: 'hover' | 'navigation' | 'manual'): void {
  if (!isDevelopment()) return;

  console.log(
    `%c[Prefetch] %c⇢ ${trigger.toUpperCase()} %c${key}`,
    'color: #888; font-weight: bold',
    'color: #a0a; font-weight: bold',
    'color: #06c',
    {
      timestamp: formatTimestamp(),
    }
  );
}

/**
 * Log background revalidation event
 * 
 * @param key - Cache key being revalidated
 * @param isStale - Whether the cached data is stale
 */
export function logRevalidation(key: string, isStale: boolean): void {
  if (!isDevelopment()) return;

  console.log(
    `%c[SWR] %c↻ REVALIDATE %c${key}`,
    'color: #888; font-weight: bold',
    'color: #08c; font-weight: bold',
    'color: #06c',
    {
      stale: isStale,
      timestamp: formatTimestamp(),
    }
  );
}

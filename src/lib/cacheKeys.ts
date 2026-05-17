/**
 * Cache Keys - Centralized cache key management
 * 
 * Provides a hierarchical structure for generating cache keys used by React Query
 * and the CacheManager. Keys follow the pattern: domain:subdomain:id
 * 
 * **Requirements Validated:**
 * - Requirement 14.1: Define cache keys in centralized module
 * - Requirement 14.2: Use factory functions to generate keys with parameters
 * - Requirement 14.3: Support hierarchical cache key patterns
 * - Requirement 14.4: Validate cache key format
 * - Requirement 14.5: Document cache key naming conventions
 * 
 * **Key Structure:**
 * ```
 * specialists
 * ├── specialists:list
 * ├── specialists:detail:{id}
 * └── specialists:runs:{id}
 * 
 * metrics
 * ├── metrics:list
 * ├── metrics:detail:{id}
 * └── metrics:display:{period}:{segment}
 * 
 * home
 * ├── home:data
 * └── home:insights
 * 
 * static
 * ├── static:templates
 * └── static:config
 * ```
 * 
 * @example
 * ```typescript
 * // Generate cache keys
 * const listKey = cacheKeys.specialists.list(); // ['specialists', 'list']
 * const detailKey = cacheKeys.specialists.detail('123'); // ['specialists', 'detail', '123']
 * 
 * // Use with React Query
 * const { data } = useQuery({
 *   queryKey: cacheKeys.specialists.list(),
 *   queryFn: fetchSpecialists,
 * });
 * 
 * // Invalidate all specialist caches
 * queryClient.invalidateQueries({ queryKey: cacheKeys.specialists.all });
 * ```
 */
export const cacheKeys = {
  /**
   * Specialist cache keys
   */
  specialists: {
    /** Base key for all specialist caches */
    all: ['specialists'] as const,
    /** Key for specialist list */
    list: () => [...cacheKeys.specialists.all, 'list'] as const,
    /** Key for specialist detail by ID */
    detail: (id: string) => [...cacheKeys.specialists.all, 'detail', id] as const,
    /** Key for specialist runs by ID */
    runs: (id: string) => [...cacheKeys.specialists.all, 'runs', id] as const,
  },
  /**
   * Metrics cache keys
   */
  metrics: {
    /** Base key for all metrics caches */
    all: ['metrics'] as const,
    /** Key for metrics list */
    list: () => [...cacheKeys.metrics.all, 'list'] as const,
    /** Key for metric detail by ID */
    detail: (id: string) => [...cacheKeys.metrics.all, 'detail', id] as const,
    /** Key for metrics display by period and segment */
    display: (period: string, segment: string) => 
      [...cacheKeys.metrics.all, 'display', period, segment] as const,
  },
  /**
   * Home page cache keys
   */
  home: {
    /** Base key for all home caches */
    all: ['home'] as const,
    /** Key for home page data */
    data: () => [...cacheKeys.home.all, 'data'] as const,
    /** Key for home page insights */
    insights: () => [...cacheKeys.home.all, 'insights'] as const,
  },
  /**
   * Static data cache keys
   */
  static: {
    /** Base key for all static caches */
    all: ['static'] as const,
    /** Key for templates */
    templates: () => [...cacheKeys.static.all, 'templates'] as const,
    /** Key for configuration */
    config: () => [...cacheKeys.static.all, 'config'] as const,
  },
  /**
   * Web search cache keys (Riset live evidence panel)
   */
  webSearch: {
    /** Base key for all web search caches */
    all: ['web-search'] as const,
    /** Key for a specific query+focus pair */
    query: (q: string, focus?: string) =>
      [...cacheKeys.webSearch.all, q, focus ?? 'all'] as const,
  },
};

/**
 * Convert a query key array to a string for IndexedDB storage
 * 
 * Joins array elements with ':' separator to create a unique string key.
 * 
 * **Requirement: 14.2**
 * 
 * @param key - Query key array
 * @returns String representation of the key
 * 
 * @example
 * ```typescript
 * const key = cacheKeys.specialists.detail('123');
 * const stringKey = serializeKey(key); // 'specialists:detail:123'
 * ```
 */
export function serializeKey(key: readonly unknown[]): string {
  return key.join(':');
}

/**
 * Validate that a cache key follows the correct format
 * 
 * Ensures the key:
 * - Is not empty
 * - Contains only strings or numbers
 * 
 * **Requirement: 14.4**
 * 
 * @param key - Query key array to validate
 * @returns True if key is valid, false otherwise
 * 
 * @example
 * ```typescript
 * const validKey = ['specialists', 'detail', '123'];
 * console.log(validateKey(validKey)); // true
 * 
 * const invalidKey = ['specialists', { id: 123 }];
 * console.log(validateKey(invalidKey)); // false
 * ```
 */
export function validateKey(key: readonly unknown[]): boolean {
  return key.length > 0 && key.every(part => 
    typeof part === 'string' || typeof part === 'number'
  );
}


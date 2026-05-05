import { QueryClient } from '@tanstack/react-query';

/**
 * Centralized React Query client with optimized caching strategies
 * 
 * This QueryClient instance is configured with default options that balance
 * performance, freshness, and network efficiency. It serves as the foundation
 * for all data fetching and caching in the application.
 * 
 * **Default Configuration:**
 * - `staleTime: 5 minutes` - Data is considered fresh for 5 minutes after fetching
 * - `gcTime: 30 minutes` - Unused data is garbage collected after 30 minutes
 * - `retry: 3` - Failed requests are retried up to 3 times
 * - `retryDelay: exponential backoff` - Delays between retries: 1s, 2s, 4s (capped at 30s)
 * - `refetchOnWindowFocus: true` - Refetch stale data when window regains focus
 * - `networkMode: 'online'` - Only fetch when online
 * 
 * **Requirements Validated:**
 * - Requirement 1.1: Configure default staleTime of 5 minutes
 * - Requirement 1.2: Configure default cacheTime (gcTime) of 30 minutes
 * - Requirement 1.3: Implement retry logic with exponential backoff
 * - Requirement 1.4: Configure refetchOnWindowFocus for critical data
 * - Requirement 1.5: Configure refetchOnWindowFocus to false for static data
 * - Requirement 1.6: Support custom staleTime per query
 * 
 * @example
 * ```typescript
 * // Use with default configuration
 * const { data } = useQuery({
 *   queryKey: ['users'],
 *   queryFn: fetchUsers,
 * });
 * 
 * // Override with custom configuration
 * const { data } = useQuery({
 *   queryKey: ['users'],
 *   queryFn: fetchUsers,
 *   staleTime: 10 * 60 * 1000, // 10 minutes
 *   refetchOnWindowFocus: false,
 * });
 * ```
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default staleTime: 5 minutes
      staleTime: 5 * 60 * 1000,
      // Default gcTime (garbage collection time): 30 minutes
      gcTime: 30 * 60 * 1000,
      // Retry with exponential backoff: 1s, 2s, 4s (capped at 30s)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for critical data (can be overridden per query)
      refetchOnWindowFocus: true,
      // Network mode
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

/**
 * Query-specific configurations for different data types
 * 
 * These configurations override the default QueryClient settings based on
 * data characteristics and update frequency. Use these configurations with
 * the spread operator when defining queries.
 * 
 * **Configuration Strategy:**
 * - **Specialists**: Medium-term caching (5-10 minutes) - data changes occasionally
 * - **Metrics**: Short-term caching (1-2 minutes) - near real-time data
 * - **Static**: Long-term caching (30 minutes) - rarely changes
 * 
 * **Requirements Validated:**
 * - Requirement 8.1: Specialist list TTL of 10 minutes
 * - Requirement 8.2: Specialist detail TTL of 5 minutes
 * - Requirement 8.3: Metrics TTL of 2 minutes
 * - Requirement 8.4: Specialist run TTL of 1 minute
 * - Requirement 8.5: Static configuration TTL of 30 minutes
 * - Requirement 8.6: Support custom TTL per cache entry
 * 
 * @example
 * ```typescript
 * // Use specialist list configuration
 * const { data } = useQuery({
 *   queryKey: cacheKeys.specialists.list(),
 *   queryFn: fetchSpecialists,
 *   ...QUERY_CONFIGS.specialists.list,
 * });
 * 
 * // Use metrics configuration
 * const { data } = useQuery({
 *   queryKey: cacheKeys.metrics.list(),
 *   queryFn: fetchMetrics,
 *   ...QUERY_CONFIGS.metrics.list,
 * });
 * 
 * // Use static configuration (no refetch on focus)
 * const { data } = useQuery({
 *   queryKey: cacheKeys.static.templates(),
 *   queryFn: fetchTemplates,
 *   ...QUERY_CONFIGS.static.templates,
 * });
 * ```
 */
export const QUERY_CONFIGS = {
  specialists: {
    // Specialist list: 10 minute cache, refetch on focus
    list: { 
      staleTime: 10 * 60 * 1000, 
      refetchOnWindowFocus: true 
    },
    // Specialist detail: 5 minute cache, refetch on focus
    detail: { 
      staleTime: 5 * 60 * 1000, 
      refetchOnWindowFocus: true 
    },
    // Specialist runs: 1 minute cache for near real-time updates
    runs: { 
      staleTime: 1 * 60 * 1000, 
      refetchOnWindowFocus: true 
    },
  },
  metrics: {
    // Metrics list: 2 minute cache for dashboard data
    list: { 
      staleTime: 2 * 60 * 1000, 
      refetchOnWindowFocus: true 
    },
    // Metrics display: 2 minute cache for chart data
    display: { 
      staleTime: 2 * 60 * 1000, 
      refetchOnWindowFocus: true 
    },
  },
  static: {
    // Templates: 30 minute cache, no refetch on focus (rarely changes)
    templates: { 
      staleTime: 30 * 60 * 1000, 
      refetchOnWindowFocus: false 
    },
    // Config: 30 minute cache, no refetch on focus (rarely changes)
    config: { 
      staleTime: 30 * 60 * 1000, 
      refetchOnWindowFocus: false 
    },
  },
} as const;

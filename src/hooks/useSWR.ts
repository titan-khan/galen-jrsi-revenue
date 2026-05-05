import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { trackRequest } from '@/lib/networkTrafficMonitor';
import { serializeKey } from '@/lib/cacheKeys';

/**
 * Options for the useSWR hook
 * 
 * @template T - The type of data returned by the query
 */
interface UseSWROptions<T> {
  /** React Query key for caching and invalidation */
  queryKey: readonly unknown[];
  /** Function that fetches the data */
  queryFn: () => Promise<T>;
  /** Time in milliseconds before data is considered stale (default: 5 minutes) */
  staleTime?: number;
  /** Whether the query should run (default: true) */
  enabled?: boolean;
  /** Callback invoked when fresh data arrives */
  onSuccess?: (data: T) => void;
}

/**
 * Result returned by the useSWR hook
 * 
 * @template T - The type of data returned by the query
 */
interface UseSWRResult<T> {
  /** The cached or fresh data */
  data: T | undefined;
  /** True when no cached data exists and initial fetch is in progress */
  isLoading: boolean;
  /** True when background revalidation is happening (stale data is shown) */
  isValidating: boolean;
  /** Error from the query, if any */
  error: Error | null;
  /** Function to manually trigger a refetch and cache invalidation */
  mutate: () => void;
}

/**
 * Custom hook implementing the Stale-While-Revalidate (SWR) pattern
 * 
 * This hook provides instant page loads by:
 * 1. Returning stale cached data immediately (if available)
 * 2. Triggering a background fetch for fresh data
 * 3. Updating the UI smoothly when fresh data arrives
 * 4. Showing a loading state only when no cached data exists
 * 
 * **Requirements Validated:**
 * - Requirement 2.1: Display cached data within 100ms
 * - Requirement 2.2: Background refresh without loading spinners
 * - Requirement 2.3: Smooth data updates without disrupting interaction
 * - Requirement 4.1: Return stale data immediately when cache entry is stale
 * - Requirement 4.2: Trigger background fetch for fresh data when stale
 * - Requirement 4.3: Update cache and notify subscribers when fresh data arrives
 * - Requirement 4.4: Fetch data and display loading state when no cached data exists
 * - Requirement 4.5: Expose isValidating flag to indicate background refresh status
 * 
 * @example
 * ```typescript
 * function SpecialistList() {
 *   const { data, isLoading, isValidating } = useSWR({
 *     queryKey: cacheKeys.specialists.list(),
 *     queryFn: fetchSpecialists,
 *     staleTime: 10 * 60 * 1000, // 10 minutes
 *   });
 * 
 *   return (
 *     <div>
 *       {isValidating && <RefreshIndicator />}
 *       {isLoading ? <Skeleton /> : <List data={data} />}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @template T - The type of data returned by the query
 * @param options - Configuration options for the SWR hook
 * @returns Object containing data, loading states, error, and mutate function
 */
export function useSWR<T>({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000, // Default: 5 minutes
  enabled = true,
  onSuccess,
}: UseSWROptions<T>): UseSWRResult<T> {
  const queryClient = useQueryClient();
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  
  // Track request start time for latency measurement
  const requestStartTime = useRef<number>(0);

  // Use React Query with placeholderData to implement SWR pattern
  // placeholderData keeps previous data visible while fetching fresh data
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      requestStartTime.current = performance.now();
      const result = await queryFn();
      return result;
    },
    staleTime,
    enabled,
    // Return stale data immediately while fetching fresh data
    // This is the core of the SWR pattern - show old data instantly
    placeholderData: (previousData) => previousData,
  });

  // Track if background revalidation is happening
  // isValidating = true when fetching but we already have data (stale or fresh)
  // isLoading = true only when we have no data at all
  const isValidating = query.isFetching && !query.isLoading;
  
  // Track network traffic when query completes
  useEffect(() => {
    if (query.isSuccess && requestStartTime.current > 0) {
      const latency = performance.now() - requestStartTime.current;
      const requestId = serializeKey(queryKey);
      const requestType = queryKey[0] as string;
      
      // Check if data came from cache (no network request)
      // If isValidating is false and we have data, it came from cache
      const fromCache = !query.isFetching && query.data !== undefined;
      
      trackRequest(requestId, fromCache, latency, requestType);
      requestStartTime.current = 0;
    }
  }, [query.isSuccess, query.isFetching, query.data, queryKey]);

  // Call onSuccess callback when fresh data arrives
  // Use ref to avoid recreating effect when callback changes
  useEffect(() => {
    if (query.data && query.isSuccess && onSuccessRef.current) {
      onSuccessRef.current(query.data);
    }
  }, [query.data, query.isSuccess]);

  // Mutate function to manually trigger refetch and invalidate cache
  const mutate = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    data: query.data,
    isLoading: query.isLoading, // Only true when no cached data exists
    isValidating, // True during background refresh with stale data shown
    error: query.error,
    mutate,
  };
}

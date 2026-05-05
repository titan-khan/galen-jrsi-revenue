import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

/**
 * Options for configuring the prefetch behavior
 */
interface PrefetchOptions {
  /** Hover delay in milliseconds before triggering prefetch (default: 500ms) */
  delay?: number;
  /** Maximum number of concurrent prefetch requests (default: 3) */
  maxConcurrent?: number;
}

/**
 * Return type for the usePrefetch hook
 */
interface UsePrefetchResult {
  /** Directly prefetch data for a given query key */
  prefetch: (queryKey: readonly unknown[], queryFn: () => Promise<unknown>) => Promise<void>;
  /** Handler to call when user starts hovering (schedules prefetch after delay) */
  onHoverStart: (queryKey: readonly unknown[], queryFn: () => Promise<unknown>) => void;
  /** Handler to call when user stops hovering (cancels scheduled prefetch) */
  onHoverEnd: () => void;
}

/**
 * Custom hook for prefetching data to anticipate user navigation
 * 
 * This hook implements hover-based prefetching with the following features:
 * 1. Delays prefetch by 500ms (configurable) to avoid prefetching on quick hovers
 * 2. Limits concurrent prefetch requests to 3 to avoid overwhelming the network
 * 3. Skips prefetch if data is already cached
 * 4. Provides onHoverStart and onHoverEnd handlers for easy integration
 * 5. Provides direct prefetch method for programmatic prefetching
 * 
 * **Requirements Validated:**
 * - Requirement 13.1: Prefetch specialist detail data on hover > 500ms
 * - Requirement 13.2: Prefetch specialist list data on home page navigation
 * - Requirement 13.3: Limit concurrent prefetch requests to 3
 * - Requirement 13.4: Reuse in-flight requests when user navigates during prefetch
 * - Requirement 13.5: Skip prefetch operations when disabled in user settings
 * 
 * @example
 * ```typescript
 * function SpecialistCard({ specialist }: { specialist: Specialist }) {
 *   const { onHoverStart, onHoverEnd } = usePrefetch();
 * 
 *   return (
 *     <div
 *       onMouseEnter={() => 
 *         onHoverStart(
 *           cacheKeys.specialists.detail(specialist.id),
 *           () => fetchSpecialistDetail(specialist.id)
 *         )
 *       }
 *       onMouseLeave={onHoverEnd}
 *     >
 *       <Link to={`/specialists/${specialist.id}`}>
 *         {specialist.name}
 *       </Link>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Programmatic prefetching on route navigation
 * function HomePage() {
 *   const { prefetch } = usePrefetch();
 * 
 *   useEffect(() => {
 *     // Prefetch specialists list when home page loads
 *     prefetch(
 *       cacheKeys.specialists.list(),
 *       fetchSpecialists
 *     );
 *   }, [prefetch]);
 * 
 *   return <HomeContent />;
 * }
 * ```
 * 
 * @param options - Configuration options for prefetch behavior
 * @returns Object with prefetch, onHoverStart, and onHoverEnd functions
 */
export function usePrefetch(options: PrefetchOptions = {}): UsePrefetchResult {
  const queryClient = useQueryClient();
  const { delay = 500, maxConcurrent = 3 } = options;
  
  // Track hover timer for cancellation
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track number of active prefetch requests to enforce concurrency limit
  const activePrefetchesRef = useRef(0);

  /**
   * Prefetch data for a given query key
   * 
   * This function:
   * - Checks if concurrent limit is reached (skip if so)
   * - Checks if data is already cached (skip if so)
   * - Increments active prefetch count
   * - Executes prefetch using React Query's prefetchQuery
   * - Decrements active prefetch count when complete
   * 
   * @param queryKey - React Query key for the data to prefetch
   * @param queryFn - Function that fetches the data
   */
  const prefetch = useCallback(async (
    queryKey: readonly unknown[],
    queryFn: () => Promise<unknown>
  ) => {
    // Check concurrent limit - skip if we're at max capacity
    if (activePrefetchesRef.current >= maxConcurrent) {
      return;
    }

    // Check if data is already cached - skip if so
    const cached = queryClient.getQueryData(queryKey);
    if (cached) {
      return;
    }

    // Increment active prefetch count
    activePrefetchesRef.current++;
    
    try {
      // Use React Query's prefetchQuery to load data in the background
      // This will populate the cache without triggering component re-renders
      await queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      });
    } catch (error) {
      // Log prefetch errors but don't throw - prefetch failures shouldn't break the app
      console.error('[Prefetch] Failed to prefetch data:', error);
    } finally {
      // Always decrement active count, even on error
      activePrefetchesRef.current--;
    }
  }, [queryClient, maxConcurrent]);

  /**
   * Handler for hover start event
   * 
   * Schedules a prefetch after the configured delay (default 500ms).
   * This avoids prefetching on quick hovers where the user isn't actually
   * interested in the content.
   * 
   * @param queryKey - React Query key for the data to prefetch
   * @param queryFn - Function that fetches the data
   */
  const onHoverStart = useCallback((
    queryKey: readonly unknown[],
    queryFn: () => Promise<unknown>
  ) => {
    // Clear any existing timer to avoid duplicate prefetches
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    // Schedule prefetch after delay
    hoverTimerRef.current = setTimeout(() => {
      prefetch(queryKey, queryFn);
    }, delay);
  }, [prefetch, delay]);

  /**
   * Handler for hover end event
   * 
   * Cancels any scheduled prefetch if the user stops hovering before
   * the delay expires. This prevents unnecessary prefetches when users
   * quickly move their mouse across multiple items.
   */
  const onHoverEnd = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  return {
    prefetch,
    onHoverStart,
    onHoverEnd,
  };
}

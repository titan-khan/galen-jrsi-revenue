import { useEffect, useRef } from 'react';
import { startPageLoad } from '@/lib/performanceMonitor';

/**
 * Hook to automatically track page load performance
 * 
 * Measures the time from when the component mounts until data is available,
 * and logs the metrics to the performance monitor.
 * 
 * **Requirements Validated:**
 * - Requirement 2.4: Measure and log page load times
 * - Requirement 15.6: Log performance metrics to console in development mode
 * 
 * @param pageName - Identifier for the page (e.g., 'home', 'specialists', 'metrics')
 * @param isLoading - Whether the page is still loading data
 * @param fromCache - Whether the data was loaded from cache
 * 
 * @example
 * ```typescript
 * function HomePage() {
 *   const { data, isLoading } = useSWR({
 *     queryKey: cacheKeys.home.data(),
 *     queryFn: fetchHomeData,
 *   });
 * 
 *   // Automatically track page load time
 *   usePageLoadMonitoring('home', isLoading, !!data);
 * 
 *   return <div>...</div>;
 * }
 * ```
 */
export function usePageLoadMonitoring(
  pageName: string,
  isLoading: boolean,
  fromCache: boolean
): void {
  const endPageLoadRef = useRef<(() => void) | null>(null);
  const hasRecordedRef = useRef(false);

  // Start timing when component mounts
  useEffect(() => {
    if (!endPageLoadRef.current) {
      endPageLoadRef.current = startPageLoad(pageName, fromCache);
    }
  }, [pageName, fromCache]);

  // Record when loading completes
  useEffect(() => {
    if (!isLoading && endPageLoadRef.current && !hasRecordedRef.current) {
      endPageLoadRef.current();
      hasRecordedRef.current = true;
      endPageLoadRef.current = null;
    }
  }, [isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endPageLoadRef.current = null;
      hasRecordedRef.current = false;
    };
  }, []);
}

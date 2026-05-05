/**
 * Performance Monitoring Usage Examples
 * 
 * This file demonstrates how to use the performance monitoring utilities
 * in your components and services.
 */

import { 
  performanceMonitor, 
  startPageLoad, 
  startCacheRead, 
  startNetworkRequest 
} from './performanceMonitor';
import { usePageLoadMonitoring } from '@/hooks/usePageLoadMonitoring';

// ============================================================================
// Example 1: Automatic Page Load Monitoring with Hook
// ============================================================================

/**
 * The easiest way to monitor page load performance is using the hook.
 * It automatically tracks the time from component mount to data load completion.
 */
function MyPage() {
  const { data, isLoading } = useSomeDataHook();
  
  // Automatically track page load time
  // - pageName: identifier for the page
  // - isLoading: whether data is still loading
  // - fromCache: whether data came from cache (true if data exists)
  usePageLoadMonitoring('my-page', isLoading, !!data);
  
  return <div>{/* page content */}</div>;
}

// ============================================================================
// Example 2: Manual Page Load Monitoring
// ============================================================================

/**
 * For more control, you can manually track page load times.
 */
async function loadPageData() {
  // Start timing
  const endPageLoad = startPageLoad('my-page', false);
  
  try {
    // Load your data
    const data = await fetchData();
    
    // End timing (automatically records to performance monitor)
    endPageLoad();
    
    return data;
  } catch (error) {
    // Still record the time even on error
    endPageLoad();
    throw error;
  }
}

// ============================================================================
// Example 3: Cache Read Monitoring
// ============================================================================

/**
 * Track cache read latency to monitor cache performance.
 */
async function getCachedData(key: string) {
  // Start timing
  const endCacheRead = startCacheRead();
  
  // Read from cache
  const data = await cache.get(key);
  
  // End timing (automatically records to performance monitor)
  endCacheRead();
  
  if (data) {
    performanceMonitor.recordCacheHit();
  } else {
    performanceMonitor.recordCacheMiss();
  }
  
  return data;
}

// ============================================================================
// Example 4: Network Request Monitoring
// ============================================================================

/**
 * Track network request latency to compare with cache performance.
 */
async function fetchFromNetwork(url: string) {
  // Start timing
  const endNetworkRequest = startNetworkRequest();
  
  try {
    // Make network request
    const response = await fetch(url);
    const data = await response.json();
    
    // End timing (automatically records to performance monitor)
    endNetworkRequest();
    
    return data;
  } catch (error) {
    // Still record the time even on error
    endNetworkRequest();
    throw error;
  }
}

// ============================================================================
// Example 5: Viewing Performance Metrics
// ============================================================================

/**
 * Get current performance metrics for display or analysis.
 */
function displayPerformanceMetrics() {
  const metrics = performanceMonitor.getMetrics();
  
  console.log('Performance Metrics:', {
    hitRate: `${metrics.hitRate.toFixed(1)}%`,
    totalRequests: metrics.totalRequests,
    avgCacheRead: `${metrics.avgCacheReadLatency.toFixed(2)}ms`,
    avgNetwork: `${metrics.avgNetworkLatency.toFixed(2)}ms`,
  });
  
  // Get page load history
  const pageLoads = performanceMonitor.getPageLoads();
  console.log('Recent Page Loads:', pageLoads);
  
  // Get average page load times
  const avgCached = performanceMonitor.getAvgCachedPageLoadTime();
  const avgNetwork = performanceMonitor.getAvgNetworkPageLoadTime();
  
  console.log('Average Page Load Times:', {
    cached: `${avgCached.toFixed(2)}ms`,
    network: `${avgNetwork.toFixed(2)}ms`,
  });
}

// ============================================================================
// Example 6: Logging Performance Summary
// ============================================================================

/**
 * Log a comprehensive performance summary (development mode only).
 */
function logPerformanceSummary() {
  // This will log a formatted table in development mode
  performanceMonitor.logSummary();
}

// ============================================================================
// Example 7: Resetting Metrics
// ============================================================================

/**
 * Reset all metrics (useful for testing or after major changes).
 */
function resetPerformanceMetrics() {
  performanceMonitor.reset();
  console.log('Performance metrics reset');
}

// ============================================================================
// Example 8: Integration with Data Fetching Hook
// ============================================================================

/**
 * Complete example showing how to integrate performance monitoring
 * into a custom data fetching hook.
 */
function useDataWithMonitoring(key: string) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function loadData() {
      // Check cache first
      const endCacheRead = startCacheRead();
      const cached = await cache.get(key);
      endCacheRead();
      
      if (cached) {
        performanceMonitor.recordCacheHit();
        setData(cached);
        setIsLoading(false);
        
        // Still fetch fresh data in background
        const endNetworkRequest = startNetworkRequest();
        const fresh = await fetchData(key);
        endNetworkRequest();
        
        if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
          setData(fresh);
          await cache.set(key, fresh);
        }
      } else {
        performanceMonitor.recordCacheMiss();
        
        // Fetch from network
        const endNetworkRequest = startNetworkRequest();
        const fresh = await fetchData(key);
        endNetworkRequest();
        
        setData(fresh);
        setIsLoading(false);
        await cache.set(key, fresh);
      }
    }
    
    loadData();
  }, [key]);
  
  // Track page load time
  usePageLoadMonitoring('data-page', isLoading, !!data);
  
  return { data, isLoading };
}

export {
  MyPage,
  loadPageData,
  getCachedData,
  fetchFromNetwork,
  displayPerformanceMetrics,
  logPerformanceSummary,
  resetPerformanceMetrics,
  useDataWithMonitoring,
};

/**
 * Performance Monitoring Utilities
 * 
 * Provides utilities for tracking and logging performance metrics including:
 * - Page load times
 * - Cache hit rates
 * - Cache read/write latency
 * - Network request latency
 * 
 * **Requirements Validated:**
 * - Requirement 2.4: Measure and log page load times
 * - Requirement 15.1: Track cache hit rate as a percentage of total requests
 * - Requirement 15.2: Track average cache read latency
 * - Requirement 15.3: Track average network request latency
 * - Requirement 15.6: Log performance metrics to console in development mode
 */

export interface PerformanceMetrics {
  /** Total number of cache hits */
  cacheHits: number;
  /** Total number of cache misses */
  cacheMisses: number;
  /** Cache hit rate as a percentage (0-100) */
  hitRate: number;
  /** Average cache read latency in milliseconds */
  avgCacheReadLatency: number;
  /** Average network request latency in milliseconds */
  avgNetworkLatency: number;
  /** Total number of requests */
  totalRequests: number;
  /** Array of cache read latencies */
  cacheReadLatencies: number[];
  /** Array of network request latencies */
  networkLatencies: number[];
}

export interface PageLoadMetrics {
  /** Page identifier */
  page: string;
  /** Load time in milliseconds */
  loadTime: number;
  /** Whether data was loaded from cache */
  fromCache: boolean;
  /** Timestamp when load started */
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    avgCacheReadLatency: 0,
    avgNetworkLatency: 0,
    totalRequests: 0,
    cacheReadLatencies: [],
    networkLatencies: [],
  };

  private pageLoads: PageLoadMetrics[] = [];
  private readonly MAX_LATENCY_SAMPLES = 100; // Keep last 100 samples for rolling average

  /**
   * Record a cache hit
   * Requirement 15.1: Track cache hit rate
   */
  recordCacheHit(): void {
    this.metrics.cacheHits++;
    this.metrics.totalRequests++;
    this.updateHitRate();
    
    if (this.isDevelopment()) {
      console.log('[PerformanceMonitor] Cache hit', {
        hitRate: `${this.metrics.hitRate.toFixed(1)}%`,
        totalRequests: this.metrics.totalRequests,
      });
    }
  }

  /**
   * Record a cache miss
   * Requirement 15.1: Track cache hit rate
   */
  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
    this.metrics.totalRequests++;
    this.updateHitRate();
    
    if (this.isDevelopment()) {
      console.log('[PerformanceMonitor] Cache miss', {
        hitRate: `${this.metrics.hitRate.toFixed(1)}%`,
        totalRequests: this.metrics.totalRequests,
      });
    }
  }

  /**
   * Record cache read latency
   * Requirement 15.2: Track average cache read latency
   * 
   * @param latency - Read latency in milliseconds
   */
  recordCacheReadLatency(latency: number): void {
    this.metrics.cacheReadLatencies.push(latency);
    
    // Keep only last N samples for rolling average
    if (this.metrics.cacheReadLatencies.length > this.MAX_LATENCY_SAMPLES) {
      this.metrics.cacheReadLatencies.shift();
    }
    
    this.updateAvgCacheReadLatency();
    
    if (this.isDevelopment()) {
      console.log('[PerformanceMonitor] Cache read', {
        latency: `${latency.toFixed(2)}ms`,
        avgLatency: `${this.metrics.avgCacheReadLatency.toFixed(2)}ms`,
      });
    }
  }

  /**
   * Record network request latency
   * Requirement 15.3: Track average network request latency
   * 
   * @param latency - Request latency in milliseconds
   */
  recordNetworkLatency(latency: number): void {
    this.metrics.networkLatencies.push(latency);
    
    // Keep only last N samples for rolling average
    if (this.metrics.networkLatencies.length > this.MAX_LATENCY_SAMPLES) {
      this.metrics.networkLatencies.shift();
    }
    
    this.updateAvgNetworkLatency();
    
    if (this.isDevelopment()) {
      console.log('[PerformanceMonitor] Network request', {
        latency: `${latency.toFixed(2)}ms`,
        avgLatency: `${this.metrics.avgNetworkLatency.toFixed(2)}ms`,
      });
    }
  }

  /**
   * Record page load time
   * Requirement 2.4: Measure and log page load times
   * 
   * @param page - Page identifier
   * @param loadTime - Load time in milliseconds
   * @param fromCache - Whether data was loaded from cache
   */
  recordPageLoad(page: string, loadTime: number, fromCache: boolean): void {
    const metric: PageLoadMetrics = {
      page,
      loadTime,
      fromCache,
      timestamp: Date.now(),
    };
    
    this.pageLoads.push(metric);
    
    // Keep only last 50 page loads
    if (this.pageLoads.length > 50) {
      this.pageLoads.shift();
    }
    
    if (this.isDevelopment()) {
      console.log(`[PerformanceMonitor] Page load: ${page}`, {
        loadTime: `${loadTime.toFixed(2)}ms`,
        fromCache,
        target: fromCache ? '<100ms' : '<500ms',
        status: fromCache && loadTime < 100 ? '✓ PASS' : !fromCache && loadTime < 500 ? '✓ PASS' : '✗ SLOW',
      });
    }
  }

  /**
   * Get current performance metrics
   * Requirement 15.1, 15.2, 15.3: Expose performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get page load history
   * Requirement 2.4: Track page load times
   */
  getPageLoads(): PageLoadMetrics[] {
    return [...this.pageLoads];
  }

  /**
   * Get average page load time for cached pages
   * Requirement 2.4: Measure page load times
   */
  getAvgCachedPageLoadTime(): number {
    const cachedLoads = this.pageLoads.filter(p => p.fromCache);
    if (cachedLoads.length === 0) return 0;
    
    const total = cachedLoads.reduce((sum, p) => sum + p.loadTime, 0);
    return total / cachedLoads.length;
  }

  /**
   * Get average page load time for non-cached pages
   * Requirement 2.4: Measure page load times
   */
  getAvgNetworkPageLoadTime(): number {
    const networkLoads = this.pageLoads.filter(p => !p.fromCache);
    if (networkLoads.length === 0) return 0;
    
    const total = networkLoads.reduce((sum, p) => sum + p.loadTime, 0);
    return total / networkLoads.length;
  }

  /**
   * Log comprehensive performance summary
   * Requirement 15.6: Log performance metrics to console in development mode
   */
  logSummary(): void {
    if (!this.isDevelopment()) return;

    console.group('[PerformanceMonitor] Summary');
    console.table({
      'Cache Hit Rate': `${this.metrics.hitRate.toFixed(1)}%`,
      'Total Requests': this.metrics.totalRequests,
      'Cache Hits': this.metrics.cacheHits,
      'Cache Misses': this.metrics.cacheMisses,
      'Avg Cache Read': `${this.metrics.avgCacheReadLatency.toFixed(2)}ms`,
      'Avg Network': `${this.metrics.avgNetworkLatency.toFixed(2)}ms`,
      'Avg Cached Page Load': `${this.getAvgCachedPageLoadTime().toFixed(2)}ms`,
      'Avg Network Page Load': `${this.getAvgNetworkPageLoadTime().toFixed(2)}ms`,
    });
    console.groupEnd();
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      avgCacheReadLatency: 0,
      avgNetworkLatency: 0,
      totalRequests: 0,
      cacheReadLatencies: [],
      networkLatencies: [],
    };
    this.pageLoads = [];
    
    if (this.isDevelopment()) {
      console.log('[PerformanceMonitor] Metrics reset');
    }
  }

  private updateHitRate(): void {
    if (this.metrics.totalRequests === 0) {
      this.metrics.hitRate = 0;
    } else {
      this.metrics.hitRate = (this.metrics.cacheHits / this.metrics.totalRequests) * 100;
    }
  }

  private updateAvgCacheReadLatency(): void {
    if (this.metrics.cacheReadLatencies.length === 0) {
      this.metrics.avgCacheReadLatency = 0;
    } else {
      const total = this.metrics.cacheReadLatencies.reduce((sum, l) => sum + l, 0);
      this.metrics.avgCacheReadLatency = total / this.metrics.cacheReadLatencies.length;
    }
  }

  private updateAvgNetworkLatency(): void {
    if (this.metrics.networkLatencies.length === 0) {
      this.metrics.avgNetworkLatency = 0;
    } else {
      const total = this.metrics.networkLatencies.reduce((sum, l) => sum + l, 0);
      this.metrics.avgNetworkLatency = total / this.metrics.networkLatencies.length;
    }
  }

  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Utility function to measure and record page load time
 * Requirement 2.4: Measure and log page load times
 * 
 * @param page - Page identifier
 * @param fromCache - Whether data was loaded from cache
 * @returns Function to call when page load completes
 * 
 * @example
 * ```typescript
 * const endPageLoad = startPageLoad('home', true);
 * // ... load page data ...
 * endPageLoad();
 * ```
 */
export function startPageLoad(page: string, fromCache: boolean): () => void {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    performanceMonitor.recordPageLoad(page, loadTime, fromCache);
  };
}

/**
 * Utility function to measure and record cache read latency
 * Requirement 15.2: Track average cache read latency
 * 
 * @returns Function to call when cache read completes
 * 
 * @example
 * ```typescript
 * const endCacheRead = startCacheRead();
 * const data = await cache.get(key);
 * endCacheRead();
 * ```
 */
export function startCacheRead(): () => void {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const latency = endTime - startTime;
    performanceMonitor.recordCacheReadLatency(latency);
  };
}

/**
 * Utility function to measure and record network request latency
 * Requirement 15.3: Track average network request latency
 * 
 * @returns Function to call when network request completes
 * 
 * @example
 * ```typescript
 * const endNetworkRequest = startNetworkRequest();
 * const data = await fetch(url);
 * endNetworkRequest();
 * ```
 */
export function startNetworkRequest(): () => void {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const latency = endTime - startTime;
    performanceMonitor.recordNetworkLatency(latency);
  };
}

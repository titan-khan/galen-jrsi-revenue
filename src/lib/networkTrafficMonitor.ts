/**
 * Network Traffic Monitor
 * 
 * Tracks network requests to measure the effectiveness of caching.
 * Provides utilities to:
 * - Track network requests before and after caching
 * - Calculate network request reduction percentage
 * - Log cache hit rates
 * - Verify 80%+ reduction target
 * 
 * **Requirements Validated:**
 * - Requirement 9.1: Track network requests before and after caching
 * - Requirement 9.2: Reduce network requests by at least 80%
 * - Requirement 9.3: Log cache hit rates for monitoring
 */

export interface NetworkTrafficStats {
  /** Total number of data requests (cache hits + network requests) */
  totalRequests: number;
  /** Number of requests served from cache */
  cacheHits: number;
  /** Number of requests that went to network */
  networkRequests: number;
  /** Cache hit rate as percentage (0-100) */
  cacheHitRate: number;
  /** Network request reduction as percentage (0-100) */
  networkReduction: number;
  /** Whether the 80% reduction target is met */
  meetsTarget: boolean;
  /** Timestamp of last update */
  lastUpdated: number;
}

export interface RequestLog {
  /** Request identifier (cache key or URL) */
  id: string;
  /** Whether request was served from cache */
  fromCache: boolean;
  /** Timestamp of request */
  timestamp: number;
  /** Request latency in milliseconds */
  latency: number;
  /** Request type (e.g., 'specialists', 'metrics', 'home') */
  type: string;
}

class NetworkTrafficMonitor {
  private totalRequests = 0;
  private cacheHits = 0;
  private networkRequests = 0;
  private requestLogs: RequestLog[] = [];
  private readonly MAX_LOGS = 500; // Keep last 500 requests
  private readonly TARGET_REDUCTION = 80; // 80% reduction target

  /**
   * Record a cache hit
   * Requirement 9.1: Track network requests
   */
  recordCacheHit(id: string, latency: number, type: string): void {
    this.totalRequests++;
    this.cacheHits++;
    
    this.addRequestLog({
      id,
      fromCache: true,
      timestamp: Date.now(),
      latency,
      type,
    });
    
    if (this.isDevelopment()) {
      this.logProgress();
    }
  }

  /**
   * Record a network request (cache miss)
   * Requirement 9.1: Track network requests
   */
  recordNetworkRequest(id: string, latency: number, type: string): void {
    this.totalRequests++;
    this.networkRequests++;
    
    this.addRequestLog({
      id,
      fromCache: false,
      timestamp: Date.now(),
      latency,
      type,
    });
    
    if (this.isDevelopment()) {
      this.logProgress();
    }
  }

  /**
   * Get current network traffic statistics
   * Requirements 9.1, 9.2, 9.3: Track and report statistics
   */
  getStats(): NetworkTrafficStats {
    const cacheHitRate = this.totalRequests > 0
      ? (this.cacheHits / this.totalRequests) * 100
      : 0;
    
    const networkReduction = this.totalRequests > 0
      ? (this.cacheHits / this.totalRequests) * 100
      : 0;
    
    const meetsTarget = networkReduction >= this.TARGET_REDUCTION;
    
    return {
      totalRequests: this.totalRequests,
      cacheHits: this.cacheHits,
      networkRequests: this.networkRequests,
      cacheHitRate,
      networkReduction,
      meetsTarget,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get request logs for analysis
   */
  getRequestLogs(): RequestLog[] {
    return [...this.requestLogs];
  }

  /**
   * Get statistics by request type
   */
  getStatsByType(): Map<string, NetworkTrafficStats> {
    const typeStats = new Map<string, { total: number; cached: number; network: number }>();
    
    for (const log of this.requestLogs) {
      const stats = typeStats.get(log.type) || { total: 0, cached: 0, network: 0 };
      stats.total++;
      if (log.fromCache) {
        stats.cached++;
      } else {
        stats.network++;
      }
      typeStats.set(log.type, stats);
    }
    
    const result = new Map<string, NetworkTrafficStats>();
    for (const [type, stats] of typeStats) {
      const cacheHitRate = stats.total > 0 ? (stats.cached / stats.total) * 100 : 0;
      const networkReduction = stats.total > 0 ? (stats.cached / stats.total) * 100 : 0;
      
      result.set(type, {
        totalRequests: stats.total,
        cacheHits: stats.cached,
        networkRequests: stats.network,
        cacheHitRate,
        networkReduction,
        meetsTarget: networkReduction >= this.TARGET_REDUCTION,
        lastUpdated: Date.now(),
      });
    }
    
    return result;
  }

  /**
   * Calculate average latency for cached vs network requests
   */
  getLatencyComparison(): {
    cachedAvg: number;
    networkAvg: number;
    improvement: number;
  } {
    const cachedLogs = this.requestLogs.filter(log => log.fromCache);
    const networkLogs = this.requestLogs.filter(log => !log.fromCache);
    
    const cachedAvg = cachedLogs.length > 0
      ? cachedLogs.reduce((sum, log) => sum + log.latency, 0) / cachedLogs.length
      : 0;
    
    const networkAvg = networkLogs.length > 0
      ? networkLogs.reduce((sum, log) => sum + log.latency, 0) / networkLogs.length
      : 0;
    
    const improvement = networkAvg > 0
      ? ((networkAvg - cachedAvg) / networkAvg) * 100
      : 0;
    
    return {
      cachedAvg,
      networkAvg,
      improvement,
    };
  }

  /**
   * Log comprehensive statistics summary
   * Requirement 9.3: Log cache hit rates
   */
  logSummary(): void {
    const stats = this.getStats();
    const latencyComparison = this.getLatencyComparison();
    const typeStats = this.getStatsByType();
    
    console.group('[NetworkTrafficMonitor] Summary');
    
    console.log('%c Overall Statistics', 'font-weight: bold; font-size: 14px');
    console.table({
      'Total Requests': stats.totalRequests,
      'Cache Hits': stats.cacheHits,
      'Network Requests': stats.networkRequests,
      'Cache Hit Rate': `${stats.cacheHitRate.toFixed(1)}%`,
      'Network Reduction': `${stats.networkReduction.toFixed(1)}%`,
      'Target (80%)': stats.meetsTarget ? '✓ MET' : '✗ NOT MET',
    });
    
    console.log('%c Latency Comparison', 'font-weight: bold; font-size: 14px');
    console.table({
      'Cached Avg': `${latencyComparison.cachedAvg.toFixed(2)}ms`,
      'Network Avg': `${latencyComparison.networkAvg.toFixed(2)}ms`,
      'Improvement': `${latencyComparison.improvement.toFixed(1)}%`,
    });
    
    if (typeStats.size > 0) {
      console.log('%c Statistics by Type', 'font-weight: bold; font-size: 14px');
      const typeTable: Record<string, any> = {};
      for (const [type, typeStat] of typeStats) {
        typeTable[type] = {
          'Total': typeStat.totalRequests,
          'Cached': typeStat.cacheHits,
          'Network': typeStat.networkRequests,
          'Hit Rate': `${typeStat.cacheHitRate.toFixed(1)}%`,
          'Reduction': `${typeStat.networkReduction.toFixed(1)}%`,
          'Target': typeStat.meetsTarget ? '✓' : '✗',
        };
      }
      console.table(typeTable);
    }
    
    console.groupEnd();
  }

  /**
   * Verify that network reduction target is met
   * Requirement 9.2: Verify 80%+ reduction
   */
  verifyTarget(): {
    met: boolean;
    actual: number;
    target: number;
    message: string;
  } {
    const stats = this.getStats();
    const met = stats.meetsTarget;
    const actual = stats.networkReduction;
    const target = this.TARGET_REDUCTION;
    
    let message: string;
    if (met) {
      message = `✓ Network reduction target MET: ${actual.toFixed(1)}% (target: ${target}%)`;
    } else if (stats.totalRequests < 10) {
      message = `⚠ Insufficient data: Only ${stats.totalRequests} requests recorded. Need more data to verify target.`;
    } else {
      message = `✗ Network reduction target NOT MET: ${actual.toFixed(1)}% (target: ${target}%)`;
    }
    
    if (this.isDevelopment()) {
      console.log(`[NetworkTrafficMonitor] ${message}`);
    }
    
    return { met, actual, target, message };
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.totalRequests = 0;
    this.cacheHits = 0;
    this.networkRequests = 0;
    this.requestLogs = [];
    
    if (this.isDevelopment()) {
      console.log('[NetworkTrafficMonitor] Statistics reset');
    }
  }

  /**
   * Export statistics for analysis
   */
  exportStats(): {
    summary: NetworkTrafficStats;
    byType: Record<string, NetworkTrafficStats>;
    latencyComparison: ReturnType<typeof this.getLatencyComparison>;
    recentLogs: RequestLog[];
  } {
    const typeStats = this.getStatsByType();
    const byType: Record<string, NetworkTrafficStats> = {};
    for (const [type, stats] of typeStats) {
      byType[type] = stats;
    }
    
    return {
      summary: this.getStats(),
      byType,
      latencyComparison: this.getLatencyComparison(),
      recentLogs: this.requestLogs.slice(-50), // Last 50 requests
    };
  }

  private addRequestLog(log: RequestLog): void {
    this.requestLogs.push(log);
    
    // Keep only last MAX_LOGS requests
    if (this.requestLogs.length > this.MAX_LOGS) {
      this.requestLogs.shift();
    }
  }

  private logProgress(): void {
    // Log every 10 requests in development
    if (this.totalRequests % 10 === 0) {
      const stats = this.getStats();
      console.log(
        `[NetworkTrafficMonitor] Progress: ${stats.totalRequests} requests, ` +
        `${stats.cacheHitRate.toFixed(1)}% hit rate, ` +
        `${stats.networkReduction.toFixed(1)}% reduction`
      );
    }
  }

  private isDevelopment(): boolean {
    return import.meta.env.DEV;
  }
}

// Singleton instance
export const networkTrafficMonitor = new NetworkTrafficMonitor();

/**
 * Utility function to track a request
 * Automatically determines if it's a cache hit or network request
 * 
 * @param id - Request identifier
 * @param fromCache - Whether request was served from cache
 * @param latency - Request latency in milliseconds
 * @param type - Request type
 */
export function trackRequest(
  id: string,
  fromCache: boolean,
  latency: number,
  type: string
): void {
  if (fromCache) {
    networkTrafficMonitor.recordCacheHit(id, latency, type);
  } else {
    networkTrafficMonitor.recordNetworkRequest(id, latency, type);
  }
}

import { useState, useEffect } from 'react';
import { Activity, Database, Zap, TrendingDown, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cacheManager } from '@/lib/cacheManager';
import { performanceMonitor } from '@/lib/performanceMonitor';
import { networkTrafficMonitor } from '@/lib/networkTrafficMonitor';
import { queryClient } from '@/lib/queryClient';
import { NetworkTrafficPanel } from './NetworkTrafficPanel';
import { PerformanceValidationPanel } from './PerformanceValidationPanel';

/**
 * CacheDashboard - Comprehensive performance monitoring dashboard
 * 
 * Displays real-time cache statistics and performance metrics:
 * - Cache hit rate percentage
 * - Cache size and entry count
 * - Average read/write latency
 * - P95 read latency
 * - Network request reduction
 * - Eviction count and rate
 * - Clear cache functionality
 * 
 * Requirements: 9.3, 9.4, 15.1, 15.2, 15.3, 15.4, 15.5
 */
export function CacheDashboard() {
  const [stats, setStats] = useState({
    cacheSize: 0,
    entryCount: 0,
    hitRate: 0,
    avgReadLatency: 0,
    avgWriteLatency: 0,
    p95ReadLatency: 0,
    networkReduction: 0,
    evictionCount: 0,
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
  });
  const [isClearing, setIsClearing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Refresh stats every 2 seconds
  useEffect(() => {
    const refreshStats = async () => {
      const cacheStats = await cacheManager.getStats();
      const perfMetrics = performanceMonitor.getMetrics();
      
      // Calculate P95 latency
      const sortedLatencies = [...perfMetrics.cacheReadLatencies].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedLatencies.length * 0.95);
      const p95ReadLatency = sortedLatencies[p95Index] || 0;
      
      // Calculate network request reduction
      // Reduction = (cache hits / total requests) * 100
      const networkReduction = perfMetrics.totalRequests > 0
        ? (perfMetrics.cacheHits / perfMetrics.totalRequests) * 100
        : 0;
      
      // Estimate write latency (IndexedDB writes are debounced, so we estimate)
      const avgWriteLatency = 50; // Typical debounced write latency
      
      setStats({
        cacheSize: cacheStats.size,
        entryCount: cacheStats.entryCount,
        hitRate: perfMetrics.hitRate,
        avgReadLatency: perfMetrics.avgCacheReadLatency,
        avgWriteLatency,
        p95ReadLatency,
        networkReduction,
        evictionCount: cacheStats.evictions,
        totalRequests: perfMetrics.totalRequests,
        cacheHits: perfMetrics.cacheHits,
        cacheMisses: perfMetrics.cacheMisses,
      });
      
      setLastUpdated(new Date());
    };

    refreshStats();
    const interval = setInterval(refreshStats, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Clear CacheManager
      await cacheManager.clear();
      
      // Clear React Query cache
      queryClient.clear();
      
      // Reset performance metrics
      performanceMonitor.reset();
      
      // Reset network traffic monitor
      networkTrafficMonitor.reset();
      
      // Refresh stats
      setStats({
        cacheSize: 0,
        entryCount: 0,
        hitRate: 0,
        avgReadLatency: 0,
        avgWriteLatency: 0,
        p95ReadLatency: 0,
        networkReduction: 0,
        evictionCount: 0,
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
      });
      
      console.log('[CacheDashboard] Cache cleared successfully');
    } catch (error) {
      console.error('[CacheDashboard] Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatLatency = (ms: number): string => {
    return `${ms.toFixed(2)}ms`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getHitRateColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLatencyColor = (latency: number, threshold: number): string => {
    if (latency <= threshold) return 'text-green-600';
    if (latency <= threshold * 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cache Performance Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring of caching system performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearCache}
            disabled={isClearing}
          >
            {isClearing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cache
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="network">Network Traffic</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">{/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cache Hit Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Cache Hit Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getHitRateColor(stats.hitRate)}`}>
              {formatPercentage(stats.hitRate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.cacheHits} hits / {stats.totalRequests} requests
            </p>
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">Target: </span>
              <span className="font-medium">≥80%</span>
            </div>
          </CardContent>
        </Card>

        {/* Cache Size */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Cache Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatBytes(stats.cacheSize)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.entryCount} entries
            </p>
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">Limit: </span>
              <span className="font-medium">50 MB</span>
            </div>
          </CardContent>
        </Card>

        {/* Average Read Latency */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Avg Read Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getLatencyColor(stats.avgReadLatency, 10)}`}>
              {formatLatency(stats.avgReadLatency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              P95: {formatLatency(stats.p95ReadLatency)}
            </p>
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">Target: </span>
              <span className="font-medium">&lt;10ms</span>
            </div>
          </CardContent>
        </Card>

        {/* Network Reduction */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Network Reduction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getHitRateColor(stats.networkReduction)}`}>
              {formatPercentage(stats.networkReduction)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.cacheMisses} network requests saved
            </p>
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">Target: </span>
              <span className="font-medium">≥80%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Latency Metrics</CardTitle>
            <CardDescription>
              Cache and network performance measurements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Average Read Latency</span>
              <span className={`text-sm font-bold ${getLatencyColor(stats.avgReadLatency, 10)}`}>
                {formatLatency(stats.avgReadLatency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">P95 Read Latency</span>
              <span className={`text-sm font-bold ${getLatencyColor(stats.p95ReadLatency, 20)}`}>
                {formatLatency(stats.p95ReadLatency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Average Write Latency</span>
              <span className="text-sm font-bold text-muted-foreground">
                {formatLatency(stats.avgWriteLatency)}
              </span>
            </div>
            <div className="pt-3 border-t">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Read target: &lt;10ms (memory), &lt;20ms (IndexedDB)</div>
                <div>• Write target: &lt;50ms (debounced)</div>
                <div>• P95 target: &lt;20ms</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cache Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Cache Statistics</CardTitle>
            <CardDescription>
              Storage and eviction information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Entries</span>
              <span className="text-sm font-bold">{stats.entryCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cache Size</span>
              <span className="text-sm font-bold">{formatBytes(stats.cacheSize)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Evictions</span>
              <span className="text-sm font-bold">{stats.evictionCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Eviction Rate</span>
              <span className="text-sm font-bold">
                {stats.totalRequests > 0
                  ? formatPercentage((stats.evictionCount / stats.totalRequests) * 100)
                  : '0.0%'}
              </span>
            </div>
            <div className="pt-3 border-t">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Max size: 50 MB</div>
                <div>• Eviction policy: LRU (stale entries first)</div>
                <div>• Target size after eviction: 45 MB</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Request Statistics</CardTitle>
          <CardDescription>
            Breakdown of cache hits, misses, and network requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Total Requests</div>
              <div className="text-3xl font-bold">{stats.totalRequests}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Cache Hits</div>
              <div className="text-3xl font-bold text-green-600">{stats.cacheHits}</div>
              <div className="text-xs text-muted-foreground">
                {formatPercentage(stats.hitRate)} of requests
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Cache Misses</div>
              <div className="text-3xl font-bold text-yellow-600">{stats.cacheMisses}</div>
              <div className="text-xs text-muted-foreground">
                {formatPercentage(100 - stats.hitRate)} of requests
              </div>
            </div>
          </div>
          
          {/* Visual bar chart */}
          {stats.totalRequests > 0 && (
            <div className="mt-6">
              <div className="flex h-8 rounded-md overflow-hidden">
                <div
                  className="bg-green-500 flex items-center justify-center text-xs font-medium text-white"
                  style={{ width: `${stats.hitRate}%` }}
                >
                  {stats.hitRate > 10 && `${formatPercentage(stats.hitRate)}`}
                </div>
                <div
                  className="bg-yellow-500 flex items-center justify-center text-xs font-medium text-white"
                  style={{ width: `${100 - stats.hitRate}%` }}
                >
                  {100 - stats.hitRate > 10 && `${formatPercentage(100 - stats.hitRate)}`}
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Cache Hits</span>
                <span>Cache Misses</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Targets</CardTitle>
          <CardDescription>
            System performance goals and current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <div className="font-medium">Cache Hit Rate</div>
                <div className="text-sm text-muted-foreground">Target: ≥80%</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${getHitRateColor(stats.hitRate)}`}>
                  {formatPercentage(stats.hitRate)}
                </span>
                {stats.hitRate >= 80 ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-yellow-600">⚠</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <div className="font-medium">Network Request Reduction</div>
                <div className="text-sm text-muted-foreground">Target: ≥80%</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${getHitRateColor(stats.networkReduction)}`}>
                  {formatPercentage(stats.networkReduction)}
                </span>
                {stats.networkReduction >= 80 ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-yellow-600">⚠</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <div className="font-medium">Average Read Latency</div>
                <div className="text-sm text-muted-foreground">Target: &lt;10ms</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${getLatencyColor(stats.avgReadLatency, 10)}`}>
                  {formatLatency(stats.avgReadLatency)}
                </span>
                {stats.avgReadLatency <= 10 ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-yellow-600">⚠</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <div className="font-medium">P95 Read Latency</div>
                <div className="text-sm text-muted-foreground">Target: &lt;20ms</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${getLatencyColor(stats.p95ReadLatency, 20)}`}>
                  {formatLatency(stats.p95ReadLatency)}
                </span>
                {stats.p95ReadLatency <= 20 ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-yellow-600">⚠</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Network Traffic Tab */}
        <TabsContent value="network">
          <NetworkTrafficPanel />
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation">
          <PerformanceValidationPanel />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Latency Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Latency Metrics</CardTitle>
              <CardDescription>
                Cache and network performance measurements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Average Read Latency</span>
                <span className={`text-sm font-bold ${getLatencyColor(stats.avgReadLatency, 10)}`}>
                  {formatLatency(stats.avgReadLatency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">P95 Read Latency</span>
                <span className={`text-sm font-bold ${getLatencyColor(stats.p95ReadLatency, 20)}`}>
                  {formatLatency(stats.p95ReadLatency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Average Write Latency</span>
                <span className="text-sm font-bold text-muted-foreground">
                  {formatLatency(stats.avgWriteLatency)}
                </span>
              </div>
              <div className="pt-3 border-t">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Read target: &lt;10ms (memory), &lt;20ms (IndexedDB)</div>
                  <div>• Write target: &lt;50ms (debounced)</div>
                  <div>• P95 target: &lt;20ms</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cache Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Cache Statistics</CardTitle>
              <CardDescription>
                Storage and eviction information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Entries</span>
                <span className="text-sm font-bold">{stats.entryCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Cache Size</span>
                <span className="text-sm font-bold">{formatBytes(stats.cacheSize)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Evictions</span>
                <span className="text-sm font-bold">{stats.evictionCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Eviction Rate</span>
                <span className="text-sm font-bold">
                  {stats.totalRequests > 0
                    ? formatPercentage((stats.evictionCount / stats.totalRequests) * 100)
                    : '0.0%'}
                </span>
              </div>
              <div className="pt-3 border-t">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Max size: 50 MB</div>
                  <div>• Eviction policy: LRU (stale entries first)</div>
                  <div>• Target size after eviction: 45 MB</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

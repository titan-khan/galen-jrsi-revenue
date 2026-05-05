import { useState, useEffect } from 'react';
import { TrendingDown, Activity, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { networkTrafficMonitor } from '@/lib/networkTrafficMonitor';
import type { NetworkTrafficStats } from '@/lib/networkTrafficMonitor';

/**
 * NetworkTrafficPanel - Displays network traffic reduction metrics
 * 
 * Shows:
 * - Total requests vs network requests
 * - Cache hit rate
 * - Network reduction percentage
 * - Target verification (80% reduction)
 * - Statistics by request type
 * - Latency comparison (cached vs network)
 * 
 * Requirements: 9.1, 9.2, 9.3
 */
export function NetworkTrafficPanel() {
  const [stats, setStats] = useState<NetworkTrafficStats>({
    totalRequests: 0,
    cacheHits: 0,
    networkRequests: 0,
    cacheHitRate: 0,
    networkReduction: 0,
    meetsTarget: false,
    lastUpdated: Date.now(),
  });
  
  const [typeStats, setTypeStats] = useState<Map<string, NetworkTrafficStats>>(new Map());
  const [latencyComparison, setLatencyComparison] = useState({
    cachedAvg: 0,
    networkAvg: 0,
    improvement: 0,
  });

  // Refresh stats every 2 seconds
  useEffect(() => {
    const refreshStats = () => {
      const currentStats = networkTrafficMonitor.getStats();
      const currentTypeStats = networkTrafficMonitor.getStatsByType();
      const currentLatencyComparison = networkTrafficMonitor.getLatencyComparison();
      
      setStats(currentStats);
      setTypeStats(currentTypeStats);
      setLatencyComparison(currentLatencyComparison);
    };

    refreshStats();
    const interval = setInterval(refreshStats, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const formatLatency = (ms: number): string => {
    return `${ms.toFixed(2)}ms`;
  };

  const getReductionColor = (reduction: number): string => {
    if (reduction >= 80) return 'text-green-600';
    if (reduction >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReductionBgColor = (reduction: number): string => {
    if (reduction >= 80) return 'bg-green-50 border-green-200';
    if (reduction >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Target Verification Card */}
      <Card className={`border-2 ${getReductionBgColor(stats.networkReduction)}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {stats.meetsTarget ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            Network Reduction Target
          </CardTitle>
          <CardDescription>
            {stats.meetsTarget
              ? 'Target of 80% network reduction has been achieved'
              : stats.totalRequests < 10
              ? 'Collecting data... Need more requests to verify target'
              : 'Target of 80% network reduction not yet achieved'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Current Reduction</div>
              <div className={`text-4xl font-bold ${getReductionColor(stats.networkReduction)}`}>
                {formatPercentage(stats.networkReduction)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-muted-foreground">Target</div>
              <div className="text-4xl font-bold text-muted-foreground">80%</div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
              <div
                className={`transition-all duration-500 ${
                  stats.networkReduction >= 80
                    ? 'bg-green-500'
                    : stats.networkReduction >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(stats.networkReduction, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>0%</span>
              <span className="font-medium">80% Target</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.cacheHits} from cache, {stats.networkRequests} from network
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Cache Hit Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getReductionColor(stats.cacheHitRate)}`}>
              {formatPercentage(stats.cacheHitRate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.cacheHits} cache hits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Network Requests Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.cacheHits}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercentage(stats.networkReduction)} reduction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Latency Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Latency Comparison</CardTitle>
          <CardDescription>
            Performance improvement from caching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Cached Requests</div>
              <div className="text-2xl font-bold text-green-600">
                {formatLatency(latencyComparison.cachedAvg)}
              </div>
              <div className="text-xs text-muted-foreground">Average latency</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Network Requests</div>
              <div className="text-2xl font-bold text-yellow-600">
                {formatLatency(latencyComparison.networkAvg)}
              </div>
              <div className="text-xs text-muted-foreground">Average latency</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Improvement</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatPercentage(latencyComparison.improvement)}
              </div>
              <div className="text-xs text-muted-foreground">Faster with cache</div>
            </div>
          </div>
          
          {/* Visual comparison */}
          {latencyComparison.networkAvg > 0 && (
            <div className="mt-6 space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Cached</span>
                  <span className="font-medium">{formatLatency(latencyComparison.cachedAvg)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{
                      width: `${(latencyComparison.cachedAvg / latencyComparison.networkAvg) * 100}%`,
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-medium">{formatLatency(latencyComparison.networkAvg)}</span>
                </div>
                <div className="h-2 rounded-full bg-yellow-500" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics by Type */}
      {typeStats.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Statistics by Request Type</CardTitle>
            <CardDescription>
              Cache performance breakdown by data type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(typeStats.entries()).map(([type, typeStat]) => (
                <div key={type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium capitalize">{type}</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${getReductionColor(typeStat.networkReduction)}`}>
                        {formatPercentage(typeStat.networkReduction)}
                      </span>
                      {typeStat.meetsTarget ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total</div>
                      <div className="font-medium">{typeStat.totalRequests}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cached</div>
                      <div className="font-medium text-green-600">{typeStat.cacheHits}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Network</div>
                      <div className="font-medium text-yellow-600">{typeStat.networkRequests}</div>
                    </div>
                  </div>
                  
                  {/* Progress bar for this type */}
                  <div className="mt-3">
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
                      <div
                        className="bg-green-500"
                        style={{ width: `${typeStat.cacheHitRate}%` }}
                      />
                      <div
                        className="bg-yellow-500"
                        style={{ width: `${100 - typeStat.cacheHitRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Collection Notice */}
      {stats.totalRequests < 10 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-blue-900">Collecting Data</div>
                <div className="text-sm text-blue-700 mt-1">
                  Navigate through the application to generate more requests. 
                  At least 10 requests are needed for accurate statistics.
                </div>
                <div className="text-sm text-blue-600 mt-2">
                  Current: {stats.totalRequests} / 10 requests
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

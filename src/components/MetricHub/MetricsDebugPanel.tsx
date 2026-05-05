import { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMetrics } from '@/contexts/MetricsContext';
import { toast } from '@/hooks/use-toast';

/**
 * MetricsDebugPanel - Panel debugging untuk troubleshoot Metrics Summary
 * 
 * Hanya tampilkan di development mode atau dengan query param ?debug=true
 */
export function MetricsDebugPanel() {
  const { 
    metrics, 
    getFollowingMetrics, 
    aiSummary, 
    aiSuggestions, 
    isAiLoading,
    isLoading,
    refreshData,
    pollingInterval,
    pollingUnchangedCount,
  } = useMetrics();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const followingMetrics = getFollowingMetrics();

  // Cek AI cache
  const aiCacheKeys = Object.keys(localStorage).filter(k => k.startsWith('metrics-ai-'));
  const hasCache = aiCacheKeys.length > 0;
  
  // Cek cache freshness
  let cacheStatus = 'none';
  if (hasCache) {
    try {
      const latestCache = localStorage.getItem(aiCacheKeys[0]);
      if (latestCache) {
        const cache = JSON.parse(latestCache);
        const age = Date.now() - cache.timestamp;
        cacheStatus = age > 3600000 ? 'stale' : 'fresh';
      }
    } catch {
      cacheStatus = 'error';
    }
  }

  const handleClearCache = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('metrics-ai-'))
      .forEach(k => localStorage.removeItem(k));
    
    toast({
      title: 'Cache Cleared',
      description: 'AI cache has been cleared. Refreshing data...',
    });
    
    setTimeout(() => {
      refreshData();
    }, 500);
  };

  const handleForceRefresh = () => {
    toast({
      title: 'Refreshing Data',
      description: 'Fetching latest metrics data...',
    });
    refreshData();
  };

  // Status checks
  const checks = [
    {
      label: 'Followed Metrics',
      status: followingMetrics.length >= 3 ? 'success' : 'warning',
      message: `${followingMetrics.length} metrics followed (need ≥3 for AI summary)`,
    },
    {
      label: 'Metrics Data',
      status: metrics.length > 0 ? 'success' : 'error',
      message: `${metrics.length} metrics loaded`,
    },
    {
      label: 'AI Summary',
      status: aiSummary ? 'success' : isAiLoading ? 'loading' : 'warning',
      message: aiSummary 
        ? 'AI summary loaded' 
        : isAiLoading 
        ? 'Loading AI summary...' 
        : 'No AI summary (check Edge Function)',
    },
    {
      label: 'AI Suggestions',
      status: aiSuggestions.length > 0 ? 'success' : 'warning',
      message: `${aiSuggestions.length} suggestions available`,
    },
    {
      label: 'Cache Status',
      status: cacheStatus === 'fresh' ? 'success' : cacheStatus === 'stale' ? 'warning' : 'error',
      message: cacheStatus === 'none' 
        ? 'No cache (first load)' 
        : cacheStatus === 'fresh'
        ? 'Cache is fresh'
        : cacheStatus === 'stale'
        ? 'Cache is stale (>1h old)'
        : 'Cache error',
    },
    {
      label: 'Data Loading',
      status: isLoading ? 'loading' : 'success',
      message: isLoading ? 'Loading metrics data...' : 'Data loaded',
    },
    {
      label: 'Smart Polling',
      status: 'success',
      message: `Polling every ${pollingInterval}ms (${pollingUnchangedCount} unchanged polls)`,
    },
  ];

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'loading':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="shadow-lg"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Debug Metrics
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Metrics Debug Panel</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
          className="h-6 w-6 p-0"
        >
          ×
        </Button>
      </div>

      <div className="space-y-2 mb-4">
        {checks.map((check) => (
          <div key={check.label} className="flex items-start gap-2 text-xs">
            <StatusIcon status={check.status} />
            <div className="flex-1">
              <div className="font-medium">{check.label}</div>
              <div className="text-muted-foreground">{check.message}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleForceRefresh}
          disabled={isLoading}
          className="flex-1"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCache}
          className="flex-1"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear Cache
        </Button>
      </div>

      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        <div>Environment: {import.meta.env.MODE}</div>
        <div>Supabase: {import.meta.env.VITE_SUPABASE_URL?.substring(0, 30)}...</div>
      </div>
    </Card>
  );
}

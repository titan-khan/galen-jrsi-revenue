import { useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMetrics } from '@/contexts/MetricsContext';
import { requestDeduplicator } from '@/lib/requestDeduplicator';

/**
 * CachingDebugPanel - Debug UI for monitoring caching system
 * 
 * Displays real-time monitoring information for:
 * - Current polling interval and unchanged count
 * - Number of active polls
 * - Number of pending deduplicated requests
 * 
 * Only shown in development mode or with ?debug=true query parameter
 * 
 * Requirements: 9.4, 15.5
 */
export function CachingDebugPanel() {
  const { 
    pollingInterval,
    pollingUnchangedCount,
    isValidating,
  } = useMetrics();
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get request deduplication stats
  const pendingRequestCount = requestDeduplicator.getPendingCount();
  
  // Calculate polling status
  const pollingStatus = isValidating ? 'active' : 'idle';
  const activePolls = isValidating ? 1 : 0;
  
  // Determine polling interval status
  const getIntervalStatus = () => {
    if (pollingInterval <= 3000) return 'fast';
    if (pollingInterval <= 5000) return 'normal';
    if (pollingInterval <= 10000) return 'slow';
    return 'very-slow';
  };
  
  const intervalStatus = getIntervalStatus();
  
  const checks = [
    {
      label: 'Polling Interval',
      status: intervalStatus === 'fast' ? 'success' : intervalStatus === 'normal' ? 'info' : 'warning',
      message: `${pollingInterval}ms (${intervalStatus})`,
      detail: `Unchanged for ${pollingUnchangedCount} consecutive polls`,
    },
    {
      label: 'Active Polls',
      status: activePolls > 0 ? 'active' : 'idle',
      message: `${activePolls} active poll${activePolls !== 1 ? 's' : ''}`,
      detail: pollingStatus === 'active' ? 'Background refresh in progress' : 'No active polling',
    },
    {
      label: 'Pending Requests',
      status: pendingRequestCount > 0 ? 'active' : 'idle',
      message: `${pendingRequestCount} pending request${pendingRequestCount !== 1 ? 's' : ''}`,
      detail: pendingRequestCount > 0 
        ? 'Requests are being deduplicated' 
        : 'No concurrent duplicate requests',
    },
    {
      label: 'Background Refresh',
      status: isValidating ? 'active' : 'idle',
      message: isValidating ? 'Refreshing data' : 'Up to date',
      detail: isValidating 
        ? 'Fetching fresh data in background (SWR pattern)' 
        : 'Displaying cached data',
    },
  ];

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'success':
      case 'fast':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'info':
      case 'normal':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'warning':
      case 'slow':
      case 'very-slow':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'active':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'idle':
        return <CheckCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="shadow-lg"
        >
          <Activity className="h-4 w-4 mr-2" />
          Cache Monitor
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-20 right-4 z-50 w-96 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Caching Debug Panel</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
          className="h-6 w-6 p-0"
        >
          ×
        </Button>
      </div>

      <div className="space-y-3 mb-4">
        {checks.map((check) => (
          <div key={check.label} className="flex items-start gap-2 text-xs">
            <StatusIcon status={check.status} />
            <div className="flex-1">
              <div className="font-medium">{check.label}</div>
              <div className="text-muted-foreground">{check.message}</div>
              {check.detail && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {check.detail}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t">
        <div className="text-xs font-medium mb-2">Smart Polling Behavior</div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>• 3s interval: Data is changing</div>
          <div>• 5s interval: 2+ unchanged polls</div>
          <div>• 10s interval: 4+ unchanged polls</div>
          <div>• 15s interval: 6+ unchanged polls</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        <div>Environment: {import.meta.env.MODE}</div>
        <div>Caching: Enabled</div>
      </div>
    </Card>
  );
}

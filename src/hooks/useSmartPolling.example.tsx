import { useSmartPolling } from './useSmartPolling';

/**
 * Example: Smart Polling for Metrics Display
 * 
 * This example demonstrates how to use the useSmartPolling hook
 * to implement intelligent polling that reduces server load.
 */

interface Metrics {
  activeUsers: number;
  requestsPerSecond: number;
  errorRate: number;
  timestamp: number;
}

async function fetchMetrics(): Promise<Metrics> {
  const response = await fetch('/api/metrics');
  if (!response.ok) throw new Error('Failed to fetch metrics');
  return response.json();
}

export function MetricsDisplay() {
  const { currentInterval, unchangedCount, start, stop, reset } = useSmartPolling({
    queryFn: fetchMetrics,
    config: {
      initialInterval: 3000, // Start at 3 seconds
      intervals: [3000, 5000, 10000, 15000], // Exponential backoff progression
      maxInterval: 15000, // Cap at 15 seconds
      enabled: true, // Start polling immediately
    },
    onData: (data) => {
      console.log('New metrics received:', data);
      // Update UI with new metrics
    },
  });

  return (
    <div className="metrics-display">
      <h2>Real-time Metrics</h2>
      
      <div className="polling-status">
        <p>Polling every {currentInterval / 1000} seconds</p>
        <p>Data unchanged for {unchangedCount} consecutive polls</p>
      </div>

      <div className="controls">
        <button onClick={start}>Start Polling</button>
        <button onClick={stop}>Stop Polling</button>
        <button onClick={reset}>Reset to Fast Polling</button>
      </div>

      <div className="metrics">
        {/* Metrics display here */}
      </div>
    </div>
  );
}

/**
 * Example: Custom Equality Function
 * 
 * This example shows how to use a custom equality function
 * to determine when data has changed.
 */

interface SpecialistRun {
  id: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  lastUpdated: string;
}

async function fetchSpecialistRun(id: string): Promise<SpecialistRun> {
  const response = await fetch(`/api/specialists/${id}/run`);
  if (!response.ok) throw new Error('Failed to fetch run');
  return response.json();
}

export function SpecialistRunMonitor({ specialistId }: { specialistId: string }) {
  const { currentInterval, unchangedCount } = useSmartPolling({
    queryFn: () => fetchSpecialistRun(specialistId),
    config: {
      initialInterval: 3000,
      intervals: [3000, 5000, 10000, 15000],
      enabled: true,
    },
    // Custom equality: only consider status and progress, ignore lastUpdated
    isEqual: (a, b) => a.status === b.status && a.progress === b.progress,
    onData: (run) => {
      console.log('Run status changed:', run);
      
      // Stop polling when run completes
      if (run.status === 'completed' || run.status === 'failed') {
        // Polling will continue but can be stopped manually
      }
    },
  });

  return (
    <div className="run-monitor">
      <p>Checking status every {currentInterval / 1000}s</p>
      <p>Status stable for {unchangedCount} checks</p>
    </div>
  );
}

/**
 * Example: Integration with React Query
 * 
 * This example shows how to integrate smart polling with React Query
 * for a complete caching + polling solution.
 */

import { useQueryClient } from '@tanstack/react-query';
import { cacheKeys } from '@/lib/cacheKeys';

export function MetricsWithCaching() {
  const queryClient = useQueryClient();

  const { currentInterval } = useSmartPolling({
    queryFn: fetchMetrics,
    config: {
      initialInterval: 3000,
      intervals: [3000, 5000, 10000, 15000],
      enabled: true,
    },
    onData: (data) => {
      // Update React Query cache with fresh data
      queryClient.setQueryData(cacheKeys.metrics.list(), data);
    },
  });

  return (
    <div>
      <p>Smart polling active: {currentInterval}ms interval</p>
      {/* Use React Query to read cached data */}
    </div>
  );
}

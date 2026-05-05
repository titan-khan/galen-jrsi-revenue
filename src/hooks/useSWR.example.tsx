/**
 * Example usage of the useSWR hook
 * 
 * This file demonstrates how to use the useSWR hook for implementing
 * the Stale-While-Revalidate pattern in your components.
 * 
 * Delete this file once you're familiar with the pattern.
 */

import { useSWR } from './useSWR';
import { cacheKeys } from '@/lib/cacheKeys';

// Example 1: Basic usage with specialists list
export function SpecialistListExample() {
  const { data, isLoading, isValidating, error } = useSWR({
    queryKey: cacheKeys.specialists.list(),
    queryFn: async () => {
      const response = await fetch('/api/specialists');
      if (!response.ok) throw new Error('Failed to fetch specialists');
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Show a subtle indicator when refreshing in background */}
      {isValidating && (
        <div className="text-sm text-muted-foreground">
          Refreshing...
        </div>
      )}
      
      {/* Display the data (stale or fresh) */}
      <ul>
        {data?.map((specialist: any) => (
          <li key={specialist.id}>{specialist.name}</li>
        ))}
      </ul>
    </div>
  );
}

// Example 2: With onSuccess callback
export function SpecialistDetailExample({ id }: { id: string }) {
  const { data, isLoading, mutate } = useSWR({
    queryKey: cacheKeys.specialists.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/specialists/${id}`);
      if (!response.ok) throw new Error('Failed to fetch specialist');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    onSuccess: (data) => {
      console.log('Fresh data arrived:', data);
      // You can trigger side effects here, like updating other state
    },
  });

  const handleRefresh = () => {
    // Manually trigger a refetch
    mutate();
  };

  if (isLoading) {
    return <div>Loading specialist details...</div>;
  }

  return (
    <div>
      <h1>{data?.name}</h1>
      <p>{data?.description}</p>
      <button onClick={handleRefresh}>Refresh</button>
    </div>
  );
}

// Example 3: Conditional fetching with enabled flag
export function ConditionalFetchExample({ shouldFetch }: { shouldFetch: boolean }) {
  const { data, isLoading } = useSWR({
    queryKey: cacheKeys.metrics.list(),
    queryFn: async () => {
      const response = await fetch('/api/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    enabled: shouldFetch, // Only fetch when this is true
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (!shouldFetch) {
    return <div>Fetching is disabled</div>;
  }

  if (isLoading) {
    return <div>Loading metrics...</div>;
  }

  return (
    <div>
      <h2>Metrics</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

// Example 4: Handling errors with stale data
export function ErrorHandlingExample() {
  const { data, error, isLoading, isValidating } = useSWR({
    queryKey: ['api', 'unstable-endpoint'],
    queryFn: async () => {
      const response = await fetch('/api/unstable');
      if (!response.ok) throw new Error('API error');
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Show error banner but keep displaying stale data
  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Warning:</strong> Failed to refresh data. Showing cached version.
        </div>
      )}
      
      {isLoading && !data ? (
        <div>Loading...</div>
      ) : (
        <div>
          {isValidating && <span className="text-sm">Updating...</span>}
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// Example 5: Integration with existing hooks pattern
export function useSpecialistsWithSWR() {
  const { data: specialists = [], isLoading, error, mutate } = useSWR({
    queryKey: cacheKeys.specialists.list(),
    queryFn: async () => {
      const response = await fetch('/api/specialists');
      if (!response.ok) throw new Error('Failed to fetch specialists');
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  return {
    specialists,
    isLoading,
    error: error?.message || null,
    refetch: mutate,
  };
}

// Usage in a component:
export function SpecialistListWithCustomHook() {
  const { specialists, isLoading, error, refetch } = useSpecialistsWithSWR();

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {specialists.map((specialist: any) => (
          <li key={specialist.id}>{specialist.name}</li>
        ))}
      </ul>
    </div>
  );
}

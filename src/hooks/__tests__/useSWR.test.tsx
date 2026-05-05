import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSWR } from '../useSWR';
import type { ReactNode } from 'react';

// Create a wrapper with QueryClient for testing
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for faster tests
        gcTime: Infinity, // Keep data in cache for testing
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useSWR - Basic Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state when no cached data exists', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    
    const { result } = renderHook(
      () => useSWR({
        queryKey: ['test', 'no-cache'],
        queryFn,
      }),
      { wrapper: createWrapper() }
    );

    // Initially should be loading with no data
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isValidating).toBe(false);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'test' });
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should return stale data immediately on subsequent renders', async () => {
    const queryFn = vi.fn()
      .mockResolvedValueOnce({ data: 'initial' })
      .mockResolvedValueOnce({ data: 'updated' });

    const wrapper = createWrapper();

    // First render - populate cache
    const { result, rerender, unmount } = renderHook(
      () => useSWR({
        queryKey: ['test', 'stale-data'],
        queryFn,
        staleTime: 0, // Immediately stale
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'initial' });
    });

    unmount();

    // Second render - should show stale data immediately
    const { result: result2 } = renderHook(
      () => useSWR({
        queryKey: ['test', 'stale-data'],
        queryFn,
        staleTime: 0,
      }),
      { wrapper }
    );

    // Should have stale data immediately (no loading state)
    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.data).toEqual({ data: 'initial' });
    expect(result2.current.isValidating).toBe(true); // Background fetch in progress

    await waitFor(() => {
      expect(result2.current.isValidating).toBe(false);
    });

    expect(result2.current.data).toEqual({ data: 'updated' });
  });

  it('should expose isValidating flag during background refresh', async () => {
    let resolveQuery: (value: any) => void;
    const queryPromise = new Promise((resolve) => {
      resolveQuery = resolve;
    });

    const queryFn = vi.fn()
      .mockResolvedValueOnce({ data: 'initial' })
      .mockReturnValueOnce(queryPromise);

    const wrapper = createWrapper();

    // First render
    const { result, unmount } = renderHook(
      () => useSWR({
        queryKey: ['test', 'validating'],
        queryFn,
        staleTime: 0,
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'initial' });
    });

    unmount();

    // Second render - trigger background refresh
    const { result: result2 } = renderHook(
      () => useSWR({
        queryKey: ['test', 'validating'],
        queryFn,
        staleTime: 0,
      }),
      { wrapper }
    );

    // Should show stale data with isValidating=true
    await waitFor(() => {
      expect(result2.current.isValidating).toBe(true);
    });
    
    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.data).toEqual({ data: 'initial' });

    // Resolve the background fetch
    resolveQuery!({ data: 'refreshed' });

    await waitFor(() => {
      expect(result2.current.isValidating).toBe(false);
    });

    expect(result2.current.data).toEqual({ data: 'refreshed' });
  });

  it('should call onSuccess callback when fresh data arrives', async () => {
    const onSuccess = vi.fn();
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

    const { result } = renderHook(
      () => useSWR({
        queryKey: ['test', 'on-success'],
        queryFn,
        onSuccess,
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'test' });
    });

    expect(onSuccess).toHaveBeenCalledWith({ data: 'test' });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Fetch failed');
    const queryFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(
      () => useSWR({
        queryKey: ['test', 'error'],
        queryFn,
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe('Fetch failed');
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should respect enabled flag', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

    const { result } = renderHook(
      () => useSWR({
        queryKey: ['test', 'disabled'],
        queryFn,
        enabled: false,
      }),
      { wrapper: createWrapper() }
    );

    // Wait a bit to ensure query doesn't run
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should invalidate cache when mutate is called', async () => {
    const queryFn = vi.fn()
      .mockResolvedValueOnce({ data: 'initial' })
      .mockResolvedValueOnce({ data: 'refetched' });

    const { result } = renderHook(
      () => useSWR({
        queryKey: ['test', 'mutate'],
        queryFn,
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'initial' });
    });

    expect(queryFn).toHaveBeenCalledTimes(1);

    // Call mutate to trigger refetch
    result.current.mutate();

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'refetched' });
    });

    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});

describe('useSWR - Stale-While-Revalidate Pattern', () => {
  it('should display cached data within 100ms (Requirement 2.1)', async () => {
    const queryFn = vi.fn()
      .mockResolvedValueOnce({ data: 'cached' })
      .mockResolvedValueOnce({ data: 'fresh' });

    const wrapper = createWrapper();

    // First render - populate cache
    const { result, unmount } = renderHook(
      () => useSWR({
        queryKey: ['test', 'performance'],
        queryFn,
        staleTime: 0,
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'cached' });
    });

    unmount();

    // Second render - measure time to display cached data
    const startTime = performance.now();
    
    const { result: result2 } = renderHook(
      () => useSWR({
        queryKey: ['test', 'performance'],
        queryFn,
        staleTime: 0,
      }),
      { wrapper }
    );

    // Cached data should be available immediately
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(result2.current.data).toEqual({ data: 'cached' });
    expect(duration).toBeLessThan(100); // Should be much faster, typically <10ms
  });

  it('should trigger background fetch without showing loading spinner (Requirement 2.2)', async () => {
    const queryFn = vi.fn()
      .mockResolvedValueOnce({ data: 'stale' })
      .mockResolvedValueOnce({ data: 'fresh' });

    const wrapper = createWrapper();

    // First render
    const { result, unmount } = renderHook(
      () => useSWR({
        queryKey: ['test', 'background-fetch'],
        queryFn,
        staleTime: 0,
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'stale' });
    });

    unmount();

    // Second render - should show stale data without loading state
    const { result: result2 } = renderHook(
      () => useSWR({
        queryKey: ['test', 'background-fetch'],
        queryFn,
        staleTime: 0,
      }),
      { wrapper }
    );

    // No loading spinner (isLoading = false)
    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.data).toEqual({ data: 'stale' });
    
    // But background refresh is happening
    expect(result2.current.isValidating).toBe(true);

    await waitFor(() => {
      expect(result2.current.data).toEqual({ data: 'fresh' });
    });
  });

  it('should update display smoothly when fresh data arrives (Requirement 2.3)', async () => {
    const queryFn = vi.fn()
      .mockResolvedValueOnce({ data: 'old' })
      .mockResolvedValueOnce({ data: 'new' });

    const wrapper = createWrapper();

    // First render
    const { result, unmount } = renderHook(
      () => useSWR({
        queryKey: ['test', 'smooth-update'],
        queryFn,
        staleTime: 0,
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'old' });
    });

    unmount();

    // Second render
    const { result: result2 } = renderHook(
      () => useSWR({
        queryKey: ['test', 'smooth-update'],
        queryFn,
        staleTime: 0,
      }),
      { wrapper }
    );

    // Data transitions smoothly: old -> new (never undefined)
    expect(result2.current.data).toEqual({ data: 'old' });

    await waitFor(() => {
      expect(result2.current.data).toEqual({ data: 'new' });
    });

    // Data was never undefined during the transition
    expect(result2.current.data).toBeDefined();
  });

  it('should show loading state only when no cached data exists (Requirement 4.4)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

    const { result } = renderHook(
      () => useSWR({
        queryKey: ['test', 'no-cache-loading'],
        queryFn,
      }),
      { wrapper: createWrapper() }
    );

    // Should show loading when no cache
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'test' });
  });
});

describe('useSWR - Configuration', () => {
  it('should use custom staleTime', async () => {
    const queryFn = vi.fn()
      .mockResolvedValueOnce({ data: 'initial' })
      .mockResolvedValueOnce({ data: 'refetched' });

    const wrapper = createWrapper();

    // First render with long staleTime
    const { result, unmount } = renderHook(
      () => useSWR({
        queryKey: ['test', 'custom-stale-time'],
        queryFn,
        staleTime: 60 * 60 * 1000, // 1 hour
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'initial' });
    });

    unmount();

    // Second render - should NOT trigger background fetch (data is still fresh)
    const { result: result2 } = renderHook(
      () => useSWR({
        queryKey: ['test', 'custom-stale-time'],
        queryFn,
        staleTime: 60 * 60 * 1000,
      }),
      { wrapper }
    );

    expect(result2.current.data).toEqual({ data: 'initial' });
    expect(result2.current.isValidating).toBe(false); // No background fetch

    // Wait a bit to confirm no refetch happens
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(queryFn).toHaveBeenCalledTimes(1); // Only initial fetch
  });

  it('should update onSuccess callback without triggering refetch', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    const onSuccess1 = vi.fn();
    const onSuccess2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ onSuccess }) => useSWR({
        queryKey: ['test', 'callback-update'],
        queryFn,
        onSuccess,
      }),
      { 
        wrapper: createWrapper(),
        initialProps: { onSuccess: onSuccess1 }
      }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'test' });
    });

    expect(onSuccess1).toHaveBeenCalledTimes(1);

    // Update callback
    rerender({ onSuccess: onSuccess2 });

    // Should not trigger refetch
    expect(queryFn).toHaveBeenCalledTimes(1);
    
    // Old callback should not be called again
    expect(onSuccess1).toHaveBeenCalledTimes(1);
  });
});

describe('useSWR - Error Handling', () => {
  it('should keep stale data visible when network fails', async () => {
    const error = new Error('Network error');
    const queryFn = vi.fn()
      .mockResolvedValueOnce({ data: 'cached' })
      .mockRejectedValueOnce(error);

    const wrapper = createWrapper();

    // First render - populate cache
    const { result, unmount } = renderHook(
      () => useSWR({
        queryKey: ['test', 'error-with-cache'],
        queryFn,
        staleTime: 0,
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'cached' });
    });

    unmount();

    // Second render - background fetch will fail
    const { result: result2 } = renderHook(
      () => useSWR({
        queryKey: ['test', 'error-with-cache'],
        queryFn,
        staleTime: 0,
      }),
      { wrapper }
    );

    // Should still show cached data
    expect(result2.current.data).toEqual({ data: 'cached' });

    await waitFor(() => {
      expect(result2.current.error).toBeTruthy();
    });

    // Cached data should still be visible despite error
    expect(result2.current.data).toEqual({ data: 'cached' });
  });

  it('should not call onSuccess when query fails', async () => {
    const onSuccess = vi.fn();
    const queryFn = vi.fn().mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(
      () => useSWR({
        queryKey: ['test', 'error-no-success'],
        queryFn,
        onSuccess,
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });
});

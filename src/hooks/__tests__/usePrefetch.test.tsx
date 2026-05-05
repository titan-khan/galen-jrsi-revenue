import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePrefetch } from '../usePrefetch';
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

describe('usePrefetch - Basic Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide prefetch, onHoverStart, and onHoverEnd functions', () => {
    const { result } = renderHook(() => usePrefetch(), {
      wrapper: createWrapper(),
    });

    expect(result.current.prefetch).toBeInstanceOf(Function);
    expect(result.current.onHoverStart).toBeInstanceOf(Function);
    expect(result.current.onHoverEnd).toBeInstanceOf(Function);
  });

  it('should prefetch data when prefetch is called directly', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    const queryKey = ['test', 'direct-prefetch'];

    const { result } = renderHook(() => usePrefetch(), {
      wrapper: createWrapper(),
    });

    // Call prefetch directly
    await act(async () => {
      await result.current.prefetch(queryKey, queryFn);
    });

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should skip prefetch if data is already cached (Requirement 13.4)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'cached' });
    const queryKey = ['test', 'already-cached'];

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePrefetch(), { wrapper });

    // First prefetch - should execute
    await act(async () => {
      await result.current.prefetch(queryKey, queryFn);
    });

    expect(queryFn).toHaveBeenCalledTimes(1);

    // Second prefetch - should skip (data already cached)
    await act(async () => {
      await result.current.prefetch(queryKey, queryFn);
    });

    expect(queryFn).toHaveBeenCalledTimes(1); // Still only 1 call
  });

  it('should handle prefetch errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Prefetch failed');
    const queryFn = vi.fn().mockRejectedValue(error);
    const queryKey = ['test', 'error'];

    const { result } = renderHook(() => usePrefetch(), {
      wrapper: createWrapper(),
    });

    // Should not throw
    await act(async () => {
      await result.current.prefetch(queryKey, queryFn);
    });

    // Error should be logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Prefetch] Failed to prefetch data:',
      error
    );

    consoleErrorSpy.mockRestore();
  });
});

describe('usePrefetch - Hover-Based Prefetching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should delay prefetch by 500ms on hover (Requirement 13.1)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    const queryKey = ['test', 'hover-delay'];

    const { result } = renderHook(() => usePrefetch(), {
      wrapper: createWrapper(),
    });

    // Start hover
    act(() => {
      result.current.onHoverStart(queryKey, queryFn);
    });

    // Should not prefetch immediately
    expect(queryFn).not.toHaveBeenCalled();

    // Advance time by 400ms - still should not prefetch
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(queryFn).not.toHaveBeenCalled();

    // Advance time by another 100ms (total 500ms) - should prefetch
    await act(async () => {
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
    });

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should use custom delay when provided', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    const queryKey = ['test', 'custom-delay'];

    const { result } = renderHook(() => usePrefetch({ delay: 1000 }), {
      wrapper: createWrapper(),
    });

    // Start hover
    act(() => {
      result.current.onHoverStart(queryKey, queryFn);
    });

    // Advance time by 500ms - should not prefetch yet
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(queryFn).not.toHaveBeenCalled();

    // Advance time by another 500ms (total 1000ms) - should prefetch
    await act(async () => {
      vi.advanceTimersByTime(500);
      await vi.runAllTimersAsync();
    });

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should cancel prefetch when hover ends before delay expires', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    const queryKey = ['test', 'hover-cancel'];

    const { result } = renderHook(() => usePrefetch(), {
      wrapper: createWrapper(),
    });

    // Start hover
    act(() => {
      result.current.onHoverStart(queryKey, queryFn);
    });

    // Advance time by 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // End hover before delay expires
    act(() => {
      result.current.onHoverEnd();
    });

    // Advance time past the original delay
    await act(async () => {
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();
    });

    // Should not have prefetched
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('should cancel previous hover when starting new hover', async () => {
    const queryFn1 = vi.fn().mockResolvedValue({ data: 'test1' });
    const queryFn2 = vi.fn().mockResolvedValue({ data: 'test2' });
    const queryKey1 = ['test', 'hover-1'];
    const queryKey2 = ['test', 'hover-2'];

    const { result } = renderHook(() => usePrefetch(), {
      wrapper: createWrapper(),
    });

    // Start first hover
    act(() => {
      result.current.onHoverStart(queryKey1, queryFn1);
    });

    // Advance time by 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Start second hover (should cancel first)
    act(() => {
      result.current.onHoverStart(queryKey2, queryFn2);
    });

    // Advance time by 500ms (past first hover's delay)
    await act(async () => {
      vi.advanceTimersByTime(500);
      await vi.runAllTimersAsync();
    });

    // First should not have been called, second should have been called
    expect(queryFn1).not.toHaveBeenCalled();
    expect(queryFn2).toHaveBeenCalledTimes(1);
  });
});

describe('usePrefetch - Concurrency Limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should limit concurrent prefetch requests to 3 by default (Requirement 13.3)', async () => {
    // Create slow-resolving promises to keep requests in-flight
    const resolvers: Array<(value: any) => void> = [];
    const createSlowQuery = () => {
      return vi.fn(() => {
        return new Promise((resolve) => {
          resolvers.push(resolve);
        });
      });
    };

    const queryFn1 = createSlowQuery();
    const queryFn2 = createSlowQuery();
    const queryFn3 = createSlowQuery();
    const queryFn4 = createSlowQuery();

    const { result } = renderHook(() => usePrefetch(), {
      wrapper: createWrapper(),
    });

    // Start 4 prefetch requests (don't await - keep them in-flight)
    result.current.prefetch(['test', '1'], queryFn1);
    result.current.prefetch(['test', '2'], queryFn2);
    result.current.prefetch(['test', '3'], queryFn3);
    result.current.prefetch(['test', '4'], queryFn4);

    // Wait a bit for promises to start
    await new Promise(resolve => setTimeout(resolve, 10));

    // First 3 should have been called
    expect(queryFn1).toHaveBeenCalledTimes(1);
    expect(queryFn2).toHaveBeenCalledTimes(1);
    expect(queryFn3).toHaveBeenCalledTimes(1);

    // Fourth should have been skipped (concurrent limit reached)
    expect(queryFn4).not.toHaveBeenCalled();

    // Resolve first request
    await act(async () => {
      resolvers[0]({ data: 'test1' });
    });

    // Now fourth request can be made
    await act(async () => {
      await result.current.prefetch(['test', '4'], queryFn4);
    });

    expect(queryFn4).toHaveBeenCalledTimes(1);
  });

  it('should use custom maxConcurrent when provided', async () => {
    const resolvers: Array<(value: any) => void> = [];
    const createSlowQuery = () => {
      return vi.fn(() => {
        return new Promise((resolve) => {
          resolvers.push(resolve);
        });
      });
    };

    const queryFn1 = createSlowQuery();
    const queryFn2 = createSlowQuery();
    const queryFn3 = createSlowQuery();

    const { result } = renderHook(() => usePrefetch({ maxConcurrent: 1 }), {
      wrapper: createWrapper(),
    });

    // Start 3 prefetch requests
    result.current.prefetch(['test', '1'], queryFn1);
    result.current.prefetch(['test', '2'], queryFn2);
    result.current.prefetch(['test', '3'], queryFn3);

    // Wait a bit for promises to start
    await new Promise(resolve => setTimeout(resolve, 10));

    // Only first should have been called (maxConcurrent: 1)
    expect(queryFn1).toHaveBeenCalledTimes(1);
    expect(queryFn2).not.toHaveBeenCalled();
    expect(queryFn3).not.toHaveBeenCalled();
  });

  it('should decrement active count even when prefetch fails', async () => {
    const error = new Error('Prefetch failed');
    const queryFn1 = vi.fn().mockRejectedValue(error);
    const queryFn2 = vi.fn().mockResolvedValue({ data: 'test2' });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result} = renderHook(() => usePrefetch({ maxConcurrent: 1 }), {
      wrapper: createWrapper(),
    });

    // First prefetch fails
    await act(async () => {
      await result.current.prefetch(['test', '1'], queryFn1);
    });

    expect(queryFn1).toHaveBeenCalledTimes(1);

    // Second prefetch should work (active count was decremented)
    await act(async () => {
      await result.current.prefetch(['test', '2'], queryFn2);
    });

    expect(queryFn2).toHaveBeenCalledTimes(1);

    consoleErrorSpy.mockRestore();
  });

  it('should handle concurrent limit of zero', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    const queryKey = ['test', 'zero-concurrent'];

    const { result } = renderHook(() => usePrefetch({ maxConcurrent: 0 }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.prefetch(queryKey, queryFn);
    });

    // Should not prefetch (concurrent limit is 0)
    expect(queryFn).not.toHaveBeenCalled();
  });
});

describe('usePrefetch - Integration with React Query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should work with React Query cache integration', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'prefetched' });
    const queryKey = ['test', 'cache-integration'];

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePrefetch(), { wrapper });

    // Prefetch data
    await act(async () => {
      await result.current.prefetch(queryKey, queryFn);
    });

    expect(queryFn).toHaveBeenCalledTimes(1);

    // Verify data is in React Query cache
    const { result: queryResult } = renderHook(
      () => {
        const { useQueryClient } = require('@tanstack/react-query');
        const client = useQueryClient();
        return client.getQueryData(queryKey);
      },
      { wrapper }
    );

    expect(queryResult.current).toEqual({ data: 'prefetched' });
  });

  it('should handle prefetch with empty query key', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    const queryKey: readonly unknown[] = [];

    const { result } = renderHook(() => usePrefetch(), {
      wrapper: createWrapper(),
    });

    // Should not throw
    await act(async () => {
      await result.current.prefetch(queryKey, queryFn);
    });

    // Should still attempt to prefetch
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});

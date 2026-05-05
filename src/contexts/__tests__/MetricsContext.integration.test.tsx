import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MetricsProvider, useMetrics } from '../MetricsContext';
import type { ReactNode } from 'react';

// Mock the services
vi.mock('@/services/metricService', () => ({
  fetchAllMetricDisplayData: vi.fn(() => Promise.resolve(new Map())),
}));

vi.mock('@/services/metricsAiService', () => ({
  fetchMetricsAI: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('MetricsContext Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MetricsProvider>{children}</MetricsProvider>
    </QueryClientProvider>
  );

  it('should provide metrics context', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBeDefined();
      expect(result.current.metrics).toBeDefined();
      expect(Array.isArray(result.current.metrics)).toBe(true);
    });
  });

  it('should toggle follow status for a metric', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.metrics.length).toBeGreaterThan(0);
    });

    const firstMetric = result.current.metrics[0];
    const initialFollowStatus = firstMetric.isFollowing;

    // Toggle follow
    result.current.toggleFollow(firstMetric.id);

    await waitFor(() => {
      const updatedMetric = result.current.getMetricById(firstMetric.id);
      expect(updatedMetric?.isFollowing).toBe(!initialFollowStatus);
    });
  });

  it('should return following metrics', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.metrics.length).toBeGreaterThan(0);
    });

    // Toggle follow on first metric
    const firstMetric = result.current.metrics[0];
    if (!firstMetric.isFollowing) {
      result.current.toggleFollow(firstMetric.id);
    }

    await waitFor(() => {
      const followingMetrics = result.current.getFollowingMetrics();
      expect(followingMetrics.length).toBeGreaterThan(0);
      expect(followingMetrics.some(m => m.id === firstMetric.id)).toBe(true);
    });
  });

  it('should update metric properties', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.metrics.length).toBeGreaterThan(0);
    });

    const firstMetric = result.current.metrics[0];
    const newName = 'Updated Metric Name';

    result.current.updateMetric(firstMetric.id, { name: newName });

    await waitFor(() => {
      const updatedMetric = result.current.getMetricById(firstMetric.id);
      expect(updatedMetric?.name).toBe(newName);
    });
  });

  it('should filter metrics by domain', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.metrics.length).toBeGreaterThan(0);
    });

    const domains = result.current.getDomainCategories();
    expect(domains.length).toBeGreaterThan(0);

    const firstDomain = domains[0];
    const domainMetrics = result.current.getMetricsByDomain(firstDomain);

    expect(domainMetrics.every(m => m.domain === firstDomain)).toBe(true);
  });

  it('should search metrics by query', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.metrics.length).toBeGreaterThan(0);
    });

    const firstMetric = result.current.metrics[0];
    const searchQuery = firstMetric.name.substring(0, 5).toLowerCase();

    const searchResults = result.current.searchMetrics(searchQuery);

    expect(searchResults.length).toBeGreaterThan(0);
    expect(
      searchResults.some(m => 
        m.name.toLowerCase().includes(searchQuery) ||
        m.description.toLowerCase().includes(searchQuery)
      )
    ).toBe(true);
  });

  it('should handle period filter changes', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.periodFilters).toBeDefined();
    });

    const newFilters = {
      period: 'feb-2026' as const,
      segment: 'enterprise' as const,
      comparison: 'previous' as const,
    };

    result.current.setPeriodFilters(newFilters);

    await waitFor(() => {
      expect(result.current.periodFilters).toEqual(newFilters);
    });
  });

  it('should dismiss suggestions', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    const suggestionId = 'test-suggestion-1';

    result.current.dismissSuggestion(suggestionId);

    await waitFor(() => {
      expect(result.current.dismissedSuggestions.has(suggestionId)).toBe(true);
    });
  });

  it('should provide loading state', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    // Initially might be loading
    expect(typeof result.current.isLoading).toBe('boolean');

    // Should eventually finish loading
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should provide AI loading state', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    expect(typeof result.current.isAiLoading).toBe('boolean');
  });

  it('should allow refreshing data', async () => {
    const { result } = renderHook(() => useMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.refreshData).toBeDefined();
    });

    // Should not throw
    await expect(result.current.refreshData()).resolves.not.toThrow();
  });
});

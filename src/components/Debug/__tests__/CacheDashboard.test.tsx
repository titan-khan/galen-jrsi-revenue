import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CacheDashboard } from '../CacheDashboard';
import { cacheManager } from '@/lib/cacheManager';
import { performanceMonitor } from '@/lib/performanceMonitor';
import { queryClient } from '@/lib/queryClient';

// Mock the dependencies
vi.mock('@/lib/cacheManager', () => ({
  cacheManager: {
    getStats: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock('@/lib/performanceMonitor', () => ({
  performanceMonitor: {
    getMetrics: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    clear: vi.fn(),
  },
}));

describe('CacheDashboard', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup default mock return values
    vi.mocked(cacheManager.getStats).mockResolvedValue({
      size: 1024 * 1024, // 1 MB
      entryCount: 10,
      hitRate: 0,
      evictions: 2,
    });
    
    vi.mocked(performanceMonitor.getMetrics).mockReturnValue({
      cacheHits: 80,
      cacheMisses: 20,
      hitRate: 80,
      avgCacheReadLatency: 5.5,
      avgNetworkLatency: 150,
      totalRequests: 100,
      cacheReadLatencies: [3, 4, 5, 6, 7, 8, 9, 10],
      networkLatencies: [100, 150, 200],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Display Requirements', () => {
    it('should display cache hit rate percentage', async () => {
      render(<CacheDashboard />);
      
      await waitFor(() => {
        const hitRateElements = screen.getAllByText('Cache Hit Rate');
        expect(hitRateElements.length).toBeGreaterThan(0);
        const percentageElements = screen.getAllByText('80.0%');
        expect(percentageElements.length).toBeGreaterThan(0);
      });
    });

    it('should display cache size and entry count', async () => {
      render(<CacheDashboard />);
      
      await waitFor(() => {
        const sizeElements = screen.getAllByText('Cache Size');
        expect(sizeElements.length).toBeGreaterThan(0);
        const mbElements = screen.getAllByText('1.00 MB');
        expect(mbElements.length).toBeGreaterThan(0);
        expect(screen.getByText('10 entries')).toBeInTheDocument();
      });
    });

    it('should display average read latency', async () => {
      render(<CacheDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Avg Read Latency')).toBeInTheDocument();
        const latencyElements = screen.getAllByText('5.50ms');
        expect(latencyElements.length).toBeGreaterThan(0);
      });
    });

    it('should display P95 read latency', async () => {
      render(<CacheDashboard />);
      
      await waitFor(() => {
        // P95 of [3, 4, 5, 6, 7, 8, 9, 10] is 10
        expect(screen.getByText(/P95:/)).toBeInTheDocument();
        const p95Elements = screen.getAllByText(/10\.00ms/);
        expect(p95Elements.length).toBeGreaterThan(0);
      });
    });

    it('should display network request reduction', async () => {
      render(<CacheDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Network Reduction')).toBeInTheDocument();
        // Network reduction = (cache hits / total requests) * 100 = (80/100) * 100 = 80%
        const reductionElements = screen.getAllByText('80.0%');
        expect(reductionElements.length).toBeGreaterThan(0);
      });
    });

    it('should display eviction count', async () => {
      render(<CacheDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Evictions')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should display eviction rate', async () => {
      render(<CacheDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Eviction Rate')).toBeInTheDocument();
        // Eviction rate = (2 / 100) * 100 = 2%
        expect(screen.getByText('2.0%')).toBeInTheDocument();
      });
    });
  });

  describe('Clear Cache Button', () => {
    it('should render clear cache button', async () => {
      render(<CacheDashboard />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Clear Cache/i })).toBeInTheDocument();
      });
    });

    it('should clear cache when button is clicked', async () => {
      render(<CacheDashboard />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Clear Cache/i })).toBeInTheDocument();
      });
      
      const clearButton = screen.getByRole('button', { name: /Clear Cache/i });
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(cacheManager.clear).toHaveBeenCalledTimes(1);
        expect(queryClient.clear).toHaveBeenCalledTimes(1);
        expect(performanceMonitor.reset).toHaveBeenCalledTimes(1);
      });
    });

    it('should show loading state while clearing cache', async () => {
      // Make clear async to test loading state
      vi.mocked(cacheManager.clear).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<CacheDashboard />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Clear Cache/i })).toBeInTheDocument();
      });
      
      const clearButton = screen.getByRole('button', { name: /Clear Cache/i });
      fireEvent.click(clearButton);
      
      // Should show "Clearing..." text
      expect(screen.getByText(/Clearing\.\.\./i)).toBeInTheDocument();
      
      // Wait for clear to complete
      await waitFor(() => {
        expect(screen.getByText(/Clear Cache/i)).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Performance Targets', () => {
    it('should show green indicator when cache hit rate meets target (≥80%)', async () => {
      vi.mocked(performanceMonitor.getMetrics).mockReturnValue({
        cacheHits: 85,
        cacheMisses: 15,
        hitRate: 85,
        avgCacheReadLatency: 5,
        avgNetworkLatency: 150,
        totalRequests: 100,
        cacheReadLatencies: [5],
        networkLatencies: [150],
      });
      
      render(<CacheDashboard />);
      
      await waitFor(() => {
        const hitRateElements = screen.getAllByText('85.0%');
        expect(hitRateElements.length).toBeGreaterThan(0);
        // Check for green color class
        const element = hitRateElements[0];
        expect(element.className).toContain('text-green-600');
      });
    });

    it('should show yellow indicator when cache hit rate is below target', async () => {
      vi.mocked(performanceMonitor.getMetrics).mockReturnValue({
        cacheHits: 65,
        cacheMisses: 35,
        hitRate: 65,
        avgCacheReadLatency: 5,
        avgNetworkLatency: 150,
        totalRequests: 100,
        cacheReadLatencies: [5],
        networkLatencies: [150],
      });
      
      render(<CacheDashboard />);
      
      await waitFor(() => {
        const hitRateElements = screen.getAllByText('65.0%');
        expect(hitRateElements.length).toBeGreaterThan(0);
        // Check for yellow color class
        const element = hitRateElements[0];
        expect(element.className).toContain('text-yellow-600');
      });
    });

    it('should show green indicator when read latency meets target (<10ms)', async () => {
      vi.mocked(performanceMonitor.getMetrics).mockReturnValue({
        cacheHits: 80,
        cacheMisses: 20,
        hitRate: 80,
        avgCacheReadLatency: 8,
        avgNetworkLatency: 150,
        totalRequests: 100,
        cacheReadLatencies: [8],
        networkLatencies: [150],
      });
      
      render(<CacheDashboard />);
      
      await waitFor(() => {
        const latencyElements = screen.getAllByText('8.00ms');
        expect(latencyElements.length).toBeGreaterThan(0);
        // Check for green color class
        const element = latencyElements[0];
        expect(element.className).toContain('text-green-600');
      });
    });
  });

  describe('Data Formatting', () => {
    it('should format bytes correctly', async () => {
      vi.mocked(cacheManager.getStats).mockResolvedValue({
        size: 50 * 1024 * 1024, // 50 MB
        entryCount: 100,
        hitRate: 0,
        evictions: 0,
      });
      
      render(<CacheDashboard />);
      
      await waitFor(() => {
        const sizeElements = screen.getAllByText('50.00 MB');
        expect(sizeElements.length).toBeGreaterThan(0);
      });
    });

    it('should format small byte values correctly', async () => {
      vi.mocked(cacheManager.getStats).mockResolvedValue({
        size: 512, // 512 bytes
        entryCount: 1,
        hitRate: 0,
        evictions: 0,
      });
      
      render(<CacheDashboard />);
      
      await waitFor(() => {
        const sizeElements = screen.getAllByText('512.00 B');
        expect(sizeElements.length).toBeGreaterThan(0);
      });
    });

    it('should handle zero values gracefully', async () => {
      vi.mocked(cacheManager.getStats).mockResolvedValue({
        size: 0,
        entryCount: 0,
        hitRate: 0,
        evictions: 0,
      });
      
      vi.mocked(performanceMonitor.getMetrics).mockReturnValue({
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        avgCacheReadLatency: 0,
        avgNetworkLatency: 0,
        totalRequests: 0,
        cacheReadLatencies: [],
        networkLatencies: [],
      });
      
      render(<CacheDashboard />);
      
      await waitFor(() => {
        const zeroByteElements = screen.getAllByText('0 B');
        expect(zeroByteElements.length).toBeGreaterThan(0);
        const zeroPercentElements = screen.getAllByText('0.0%');
        expect(zeroPercentElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Auto-refresh', () => {
    it('should refresh stats periodically', async () => {
      vi.useFakeTimers();
      
      const { unmount } = render(<CacheDashboard />);
      
      // Wait for initial render
      await vi.waitFor(() => {
        expect(cacheManager.getStats).toHaveBeenCalled();
      });
      
      const initialCalls = vi.mocked(cacheManager.getStats).mock.calls.length;
      
      // Advance time by 2 seconds
      await vi.advanceTimersByTimeAsync(2000);
      
      // Should have been called again
      await vi.waitFor(() => {
        expect(cacheManager.getStats).toHaveBeenCalledTimes(initialCalls + 1);
      });
      
      unmount();
      vi.useRealTimers();
    });
  });
});

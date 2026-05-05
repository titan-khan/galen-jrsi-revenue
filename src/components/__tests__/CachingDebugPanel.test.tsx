import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CachingDebugPanel } from '../CachingDebugPanel';
import { useMetrics } from '@/contexts/MetricsContext';

// Mock the useMetrics hook
vi.mock('@/contexts/MetricsContext', () => ({
  useMetrics: vi.fn(),
}));

// Mock the requestDeduplicator
vi.mock('@/lib/requestDeduplicator', () => ({
  requestDeduplicator: {
    getPendingCount: vi.fn(() => 0),
  },
}));

describe('CachingDebugPanel', () => {
  const mockUseMetrics = useMetrics as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUseMetrics.mockReturnValue({
      pollingInterval: 3000,
      pollingUnchangedCount: 0,
      isValidating: false,
      metrics: [],
      toggleFollow: vi.fn(),
      getFollowingMetrics: vi.fn(() => []),
      updateMetric: vi.fn(),
      addMetric: vi.fn(),
      addBulkMetrics: vi.fn(),
      setFollowingBulk: vi.fn(),
      getMetricById: vi.fn(),
      getMetricsByDomain: vi.fn(() => []),
      getDomainCategories: vi.fn(() => []),
      searchMetrics: vi.fn(() => []),
      dismissedSuggestions: new Set(),
      dismissSuggestion: vi.fn(),
      isLoading: false,
      refreshData: vi.fn(),
      periodFilters: { period: 'week', segment: 'all', comparison: 'none' },
      setPeriodFilters: vi.fn(),
      aiSummary: null,
      aiSuggestions: [],
      isAiLoading: false,
    });
  });

  it('renders collapsed button initially', () => {
    render(<CachingDebugPanel />);
    
    const button = screen.getByRole('button', { name: /cache monitor/i });
    expect(button).toBeInTheDocument();
  });

  it('expands when button is clicked', () => {
    render(<CachingDebugPanel />);
    
    const button = screen.getByRole('button', { name: /cache monitor/i });
    fireEvent.click(button);
    
    expect(screen.getByText('Caching Debug Panel')).toBeInTheDocument();
  });

  it('displays polling interval correctly', () => {
    mockUseMetrics.mockReturnValue({
      ...mockUseMetrics(),
      pollingInterval: 5000,
      pollingUnchangedCount: 2,
    });

    render(<CachingDebugPanel />);
    
    const button = screen.getByRole('button', { name: /cache monitor/i });
    fireEvent.click(button);
    
    expect(screen.getByText('Polling Interval')).toBeInTheDocument();
    expect(screen.getByText('5000ms (normal)')).toBeInTheDocument();
    expect(screen.getByText('Unchanged for 2 consecutive polls')).toBeInTheDocument();
  });

  it('displays active polls when validating', () => {
    mockUseMetrics.mockReturnValue({
      ...mockUseMetrics(),
      isValidating: true,
    });

    render(<CachingDebugPanel />);
    
    const button = screen.getByRole('button', { name: /cache monitor/i });
    fireEvent.click(button);
    
    expect(screen.getByText('Active Polls')).toBeInTheDocument();
    expect(screen.getByText('1 active poll')).toBeInTheDocument();
    expect(screen.getByText('Background refresh in progress')).toBeInTheDocument();
  });

  it('displays pending request count', () => {
    // The mock is already set up at the top to return 0
    // We'll just verify it displays correctly with 0 pending requests
    render(<CachingDebugPanel />);
    
    const button = screen.getByRole('button', { name: /cache monitor/i });
    fireEvent.click(button);
    
    expect(screen.getByText('Pending Requests')).toBeInTheDocument();
    expect(screen.getByText('0 pending requests')).toBeInTheDocument();
    expect(screen.getByText('No concurrent duplicate requests')).toBeInTheDocument();
  });

  it('displays background refresh status', () => {
    mockUseMetrics.mockReturnValue({
      ...mockUseMetrics(),
      isValidating: true,
    });

    render(<CachingDebugPanel />);
    
    const button = screen.getByRole('button', { name: /cache monitor/i });
    fireEvent.click(button);
    
    expect(screen.getByText('Background Refresh')).toBeInTheDocument();
    expect(screen.getByText('Refreshing data')).toBeInTheDocument();
    expect(screen.getByText('Fetching fresh data in background (SWR pattern)')).toBeInTheDocument();
  });

  it('shows smart polling behavior explanation', () => {
    render(<CachingDebugPanel />);
    
    const button = screen.getByRole('button', { name: /cache monitor/i });
    fireEvent.click(button);
    
    expect(screen.getByText('Smart Polling Behavior')).toBeInTheDocument();
    expect(screen.getByText('• 3s interval: Data is changing')).toBeInTheDocument();
    expect(screen.getByText('• 5s interval: 2+ unchanged polls')).toBeInTheDocument();
    expect(screen.getByText('• 10s interval: 4+ unchanged polls')).toBeInTheDocument();
    expect(screen.getByText('• 15s interval: 6+ unchanged polls')).toBeInTheDocument();
  });

  it('collapses when close button is clicked', () => {
    render(<CachingDebugPanel />);
    
    // Expand
    const expandButton = screen.getByRole('button', { name: /cache monitor/i });
    fireEvent.click(expandButton);
    
    expect(screen.getByText('Caching Debug Panel')).toBeInTheDocument();
    
    // Collapse
    const closeButton = screen.getByRole('button', { name: '×' });
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Caching Debug Panel')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cache monitor/i })).toBeInTheDocument();
  });

  it('categorizes polling intervals correctly', () => {
    const testCases = [
      { interval: 3000, expected: 'fast' },
      { interval: 5000, expected: 'normal' },
      { interval: 10000, expected: 'slow' },
      { interval: 15000, expected: 'very-slow' },
    ];

    testCases.forEach(({ interval, expected }) => {
      mockUseMetrics.mockReturnValue({
        ...mockUseMetrics(),
        pollingInterval: interval,
      });

      const { unmount } = render(<CachingDebugPanel />);
      
      const button = screen.getByRole('button', { name: /cache monitor/i });
      fireEvent.click(button);
      
      expect(screen.getByText(`${interval}ms (${expected})`)).toBeInTheDocument();
      
      unmount();
    });
  });
});

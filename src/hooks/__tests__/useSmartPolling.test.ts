import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSmartPolling } from '../useSmartPolling';

describe('useSmartPolling - Basic Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start with initial interval (Requirement 5.1)', () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    
    const { result } = renderHook(() =>
      useSmartPolling({
        queryFn,
        config: {
          initialInterval: 3000,
          intervals: [3000, 5000, 10000, 15000],
          enabled: false, // Don't auto-start
        },
      })
    );

    expect(result.current.currentInterval).toBe(3000);
    expect(result.current.unchangedCount).toBe(0);
  });

  it('should start polling when enabled is true', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    
    renderHook(() =>
      useSmartPolling({
        queryFn,
        config: {
          initialInterval: 100, // Short interval for testing
          intervals: [100, 200, 300, 400],
          enabled: true,
        },
      })
    );

    // Wait for initial poll
    await waitFor(() => {
      expect(queryFn).toHaveBeenCalled();
    }, { timeout: 500 });

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should start polling when start() is called', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    
    const { result } = renderHook(() =>
      useSmartPolling({
        queryFn,
        config: {
          initialInterval: 100,
          intervals: [100, 200, 300, 400],
          enabled: false,
        },
      })
    );

    expect(queryFn).not.toHaveBeenCalled();

    // Start polling
    result.current.start();

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('should stop polling when stop() is called', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    
    const { result } = renderHook(() =>
      useSmartPolling({
        queryFn,
        config: {
          initialInterval: 100,
          intervals: [100, 200, 300, 400],
          enabled: true,
        },
      })
    );

    // Wait for initial poll
    await waitFor(() => {
      expect(queryFn).toHaveBeenCalled();
    }, { timeout: 500 });

    const callCount = queryFn.mock.calls.length;

    // Stop polling
    result.current.stop();

    // Wait a bit - should not poll again
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(queryFn).toHaveBeenCalledTimes(callCount); // No additional calls
  });

  it('should reset polling state when reset() is called', async () => {
    const queryFn = vi.fn()
      .mockResolvedValue({ data: 'same' });
    
    const { result, unmount } = renderHook(() =>
      useSmartPolling({
        queryFn,
        config: {
          initialInterval: 100,
          intervals: [100, 200, 300, 400],
          enabled: false, // Start disabled
        },
      })
    );

    // Verify initial state
    expect(result.current.unchangedCount).toBe(0);
    expect(result.current.currentInterval).toBe(100);

    // Start polling
    result.current.start();

    // Wait for a few polls to increase interval
    await waitFor(() => {
      expect(result.current.unchangedCount).toBeGreaterThan(0);
    }, { timeout: 1000 });

    // Stop polling to stabilize state
    result.current.stop();
    
    // Wait for any pending updates
    await new Promise(resolve => setTimeout(resolve, 100));

    // Reset should restore initial values
    result.current.reset();

    // Verify reset worked
    expect(result.current.unchangedCount).toBe(0);
    expect(result.current.currentInterval).toBe(100);
    
    unmount();
  });

  it('should call onData callback when data changes', async () => {
    const onData = vi.fn();
    const queryFn = vi.fn()
      .mockResolvedValueOnce({ data: 'first' })
      .mockResolvedValueOnce({ data: 'second' });
    
    renderHook(() =>
      useSmartPolling({
        queryFn,
        onData,
        config: {
          initialInterval: 100,
          intervals: [100, 200, 300, 400],
          enabled: true,
        },
      })
    );

    // Wait for first poll
    await waitFor(() => {
      expect(onData).toHaveBeenCalledWith({ data: 'first' });
    }, { timeout: 500 });

    // Wait for second poll with different data
    await waitFor(() => {
      expect(onData).toHaveBeenCalledWith({ data: 'second' });
    }, { timeout: 500 });

    expect(onData).toHaveBeenCalledTimes(2);
  });

  it('should use custom isEqual function', async () => {
    const customIsEqual = vi.fn((a, b) => {
      // Handle null/undefined cases
      if (!a || !b) return false;
      return a.id === b.id;
    });
    
    let callCount = 0;
    const queryFn = vi.fn(() => {
      callCount++;
      // Always return same id, different timestamp
      return Promise.resolve({ id: 1, timestamp: callCount * 100 });
    });
    
    const { result, unmount } = renderHook(() =>
      useSmartPolling({
        queryFn,
        isEqual: customIsEqual,
        config: {
          initialInterval: 100,
          intervals: [100, 200, 300, 400],
          enabled: false, // Start disabled
        },
      })
    );

    // Start polling
    result.current.start();

    // Wait for at least 2 polls
    await waitFor(() => {
      expect(queryFn.mock.calls.length).toBeGreaterThanOrEqual(2);
    }, { timeout: 1000 });

    // Stop to stabilize
    result.current.stop();
    
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should have been called to compare
    expect(customIsEqual).toHaveBeenCalled();
    
    // Data should be considered unchanged (same id)
    expect(result.current.unchangedCount).toBeGreaterThan(0);
    
    unmount();
  });
});

describe('useSmartPolling - Exponential Backoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should increase to 5s after 2 consecutive unchanged polls (Requirement 5.2)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'same' });
    
    const { result } = renderHook(() =>
      useSmartPolling({
        queryFn,
        config: {
          initialInterval: 100,
          intervals: [100, 200, 300, 400],
          enabled: false,
        },
      })
    );

    // Start polling
    result.current.start();

    // Wait for 2 unchanged polls
    await waitFor(() => {
      expect(result.current.unchangedCount).toBeGreaterThanOrEqual(2);
    }, { timeout: 2000 });

    // Stop to check stable state
    result.current.stop();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should have moved to at least second interval (200ms in test, 5s in production)
    expect(result.current.currentInterval).toBeGreaterThanOrEqual(200);
  });

  it('should increase to 10s after 4 consecutive unchanged polls (Requirement 5.3)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'same' });
    
    const { result } = renderHook(() =>
      useSmartPolling({
        queryFn,
        config: {
          initialInterval: 100,
          intervals: [100, 200, 300, 400],
          enabled: false,
        },
      })
    );

    // Start polling
    result.current.start();

    // Wait for 4 unchanged polls
    await waitFor(() => {
      expect(result.current.unchangedCount).toBeGreaterThanOrEqual(4);
    }, { timeout: 3000 });

    // Stop to check stable state
    result.current.stop();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should have moved to at least third interval (300ms in test, 10s in production)
    expect(result.current.currentInterval).toBeGreaterThanOrEqual(300);
  });

  it('should increase to 15s after 6 consecutive unchanged polls (Requirement 5.4)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'same' });
    
    const { result } = renderHook(() =>
      useSmartPolling({
        queryFn,
        config: {
          initialInterval: 100,
          intervals: [100, 200, 300, 400],
          enabled: true,
        },
      })
    );

    // Wait for 6 unchanged polls
    await waitFor(() => {
      expect(result.current.unchangedCount).toBeGreaterThanOrEqual(6);
    }, { timeout: 3000 });

    // Should have moved to fourth interval (400ms in test, 15s in production)
    expect(result.current.currentInterval).toBe(400);
  });

  it('should reset to initial interval when data changes (Requirement 5.5)', async () => {
    let callCount = 0;
    const queryFn = vi.fn(() => {
      callCount++;
      // Return same data for first 4 calls, then different data
      return Promise.resolve({ data: callCount <= 4 ? 'same' : 'changed' });
    });
    
    const { result, unmount } = renderHook(() =>
      useSmartPolling({
        queryFn,
        config: {
          initialInterval: 50, // Faster for testing
          intervals: [50, 100, 150, 200],
          enabled: false,
        },
      })
    );

    // Start polling
    result.current.start();

    // Wait for interval to increase
    await waitFor(() => {
      expect(result.current.unchangedCount).toBeGreaterThanOrEqual(2);
    }, { timeout: 2000 });

    const increasedInterval = result.current.currentInterval;
    expect(increasedInterval).toBeGreaterThan(50);

    // Wait for data to change (should reset)
    await waitFor(() => {
      return result.current.unchangedCount === 0;
    }, { timeout: 3000 });

    // Verify reset happened
    expect(result.current.unchangedCount).toBe(0);
    expect(result.current.currentInterval).toBe(50);
    
    unmount();
  });

  it('should enforce maximum interval limit (Requirement 5.7)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'same' });
    
    const { result } = renderHook(() =>
      useSmartPolling({
        queryFn,
        config: {
          initialInterval: 100,
          intervals: [100, 200, 300, 400, 500, 600], // More intervals
          maxInterval: 250, // Max limit lower than later intervals
          enabled: true,
        },
      })
    );

    // Wait for many unchanged polls
    await waitFor(() => {
      expect(result.current.unchangedCount).toBeGreaterThanOrEqual(6);
    }, { timeout: 3000 });

    // Should never exceed maxInterval
    expect(result.current.currentInterval).toBeLessThanOrEqual(250);
  });
});

describe('useSmartPolling - Component Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should stop polling on component unmount (Requirement 5.6)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
    
    const { unmount } = renderHook(() =>
      useSmartPolling({
        queryFn,
        config: {
          initialInterval: 100,
          intervals: [100, 200, 300, 400],
          enabled: true,
        },
      })
    );

    // Wait for initial poll
    await waitFor(() => {
      expect(queryFn).toHaveBeenCalled();
    }, { timeout: 500 });

    const callCountBeforeUnmount = queryFn.mock.calls.length;

    // Unmount component
    unmount();

    // Wait a bit - should not poll again after unmount
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(queryFn).toHaveBeenCalledTimes(callCountBeforeUnmount);
  });

  it('should handle errors gracefully and back off to max interval', async () => {
    const queryFn = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({ data: 'recovered' });
    
    const { result } = renderHook(() =>
      useSmartPolling({
        queryFn,
        config: {
          initialInterval: 100,
          intervals: [100, 200, 300, 400],
          enabled: true,
        },
      })
    );

    // Wait for error to occur
    await waitFor(() => {
      expect(queryFn).toHaveBeenCalled();
    }, { timeout: 500 });

    // Should back off to max interval on error
    await waitFor(() => {
      expect(result.current.currentInterval).toBe(400);
    }, { timeout: 500 });
  });
});
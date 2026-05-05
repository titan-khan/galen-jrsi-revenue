import { useEffect, useRef, useState, useCallback } from 'react';
import { logPollingIntervalChange } from '../lib/cacheLogger';

/**
 * Configuration for smart polling behavior
 */
interface PollingConfig {
  /** Starting polling interval in milliseconds (default: 3000ms) */
  initialInterval: number;
  /** Array of intervals for exponential backoff progression (e.g., [3000, 5000, 10000, 15000]) */
  intervals: number[];
  /** Maximum polling interval in milliseconds (optional) */
  maxInterval?: number;
  /** Whether polling is enabled (default: false) */
  enabled?: boolean;
}

/**
 * Options for the useSmartPolling hook
 * 
 * @template T - The type of data returned by the query function
 */
interface UseSmartPollingOptions<T> {
  /** Function that fetches the data */
  queryFn: () => Promise<T>;
  /** Polling configuration */
  config: PollingConfig;
  /** Callback invoked when new data arrives */
  onData?: (data: T) => void;
  /** Function to compare data equality (default: JSON.stringify comparison) */
  isEqual?: (a: T, b: T) => boolean;
}

/**
 * Result returned by the useSmartPolling hook
 */
interface UseSmartPollingResult {
  /** Start polling */
  start: () => void;
  /** Stop polling */
  stop: () => void;
  /** Reset polling state to initial interval */
  reset: () => void;
  /** Current polling interval in milliseconds */
  currentInterval: number;
  /** Number of consecutive polls with unchanged data */
  unchangedCount: number;
}

/**
 * Custom hook implementing smart polling with exponential backoff
 * 
 * This hook reduces server load by implementing intelligent polling that backs off
 * when data is stable and resets to fast polling when data changes.
 * 
 * **Polling Strategy:**
 * - Starts with initial interval (3 seconds)
 * - After 2 consecutive unchanged polls → increases to 5 seconds
 * - After 4 consecutive unchanged polls → increases to 10 seconds
 * - After 6 consecutive unchanged polls → increases to 15 seconds
 * - When data changes → resets to 3 seconds
 * - Stops polling on component unmount
 * 
 * **Requirements Validated:**
 * - Requirement 5.1: Start with 3 second initial polling interval
 * - Requirement 5.2: Increase interval to 5s after 2 consecutive unchanged polls
 * - Requirement 5.3: Increase interval to 10s after 4 consecutive unchanged polls
 * - Requirement 5.4: Increase interval to 15s after 6 consecutive unchanged polls
 * - Requirement 5.5: Reset interval to 3s when data changes
 * - Requirement 5.6: Stop polling when component unmounts
 * - Requirement 5.7: Enforce maximum interval limit
 * 
 * @example
 * ```typescript
 * function MetricsDisplay() {
 *   const { currentInterval, unchangedCount } = useSmartPolling({
 *     queryFn: fetchMetrics,
 *     config: {
 *       initialInterval: 3000,
 *       intervals: [3000, 5000, 10000, 15000],
 *       maxInterval: 15000,
 *       enabled: true,
 *     },
 *     onData: (data) => {
 *       updateMetrics(data);
 *     },
 *   });
 * 
 *   return (
 *     <div>
 *       <p>Polling every {currentInterval}ms</p>
 *       <p>Unchanged for {unchangedCount} polls</p>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @template T - The type of data returned by the query function
 * @param options - Configuration options for the smart polling hook
 * @returns Object containing control functions and current polling state
 */
export function useSmartPolling<T>({
  queryFn,
  config,
  onData,
  isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b),
}: UseSmartPollingOptions<T>): UseSmartPollingResult {
  // Current polling interval
  const [currentInterval, setCurrentInterval] = useState(config.initialInterval);
  
  // Number of consecutive polls with unchanged data
  const [unchangedCount, setUnchangedCount] = useState(0);
  
  // Whether polling is currently active
  const [isPolling, setIsPolling] = useState(config.enabled ?? false);
  
  // Timer reference for scheduling next poll
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Previous data for comparison
  const previousDataRef = useRef<T | null>(null);
  
  // Stable reference to onData callback
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  /**
   * Determines the next polling interval based on unchanged count
   * 
   * Mapping:
   * - 0-1 unchanged: intervals[0] (3s)
   * - 2-3 unchanged: intervals[1] (5s)
   * - 4-5 unchanged: intervals[2] (10s)
   * - 6+ unchanged: intervals[3] (15s)
   */
  const determineNextInterval = useCallback((unchanged: number): number => {
    const { intervals, maxInterval } = config;
    
    // Map unchanged count to interval index
    // Each interval threshold is at even numbers: 0, 2, 4, 6
    const index = Math.min(Math.floor(unchanged / 2), intervals.length - 1);
    const nextInterval = intervals[index];
    
    // Enforce maximum interval limit if specified
    return maxInterval ? Math.min(nextInterval, maxInterval) : nextInterval;
  }, [config]);

  /**
   * Executes a single poll operation
   * - Fetches data using queryFn
   * - Compares with previous data
   * - Updates interval based on whether data changed
   * - Invokes onData callback if data changed
   */
  const poll = useCallback(async () => {
    try {
      const data = await queryFn();
      
      // Check if data changed compared to previous poll
      const hasChanged = previousDataRef.current === null || 
        !isEqual(previousDataRef.current, data);
      
      if (hasChanged) {
        // Data changed - reset to initial interval
        const prevInterval = currentInterval;
        setUnchangedCount(0);
        setCurrentInterval(config.initialInterval);
        previousDataRef.current = data;
        
        // Log interval change if it actually changed
        if (prevInterval !== config.initialInterval) {
          logPollingIntervalChange(prevInterval, config.initialInterval, 0, 'data-changed');
        }
        
        // Notify callback with new data
        onDataRef.current?.(data);
      } else {
        // Data unchanged - increase interval using exponential backoff
        setUnchangedCount(prev => {
          const next = prev + 1;
          const nextInterval = determineNextInterval(next);
          
          // Log interval change if it actually changed
          if (nextInterval !== currentInterval) {
            logPollingIntervalChange(currentInterval, nextInterval, next, 'backoff');
          }
          
          setCurrentInterval(nextInterval);
          return next;
        });
      }
    } catch (error) {
      console.error('[SmartPolling] Poll failed:', error);
      
      // On error, back off to maximum interval to reduce server load
      const maxInterval = config.intervals[config.intervals.length - 1];
      if (maxInterval !== currentInterval) {
        logPollingIntervalChange(currentInterval, maxInterval, unchangedCount, 'error');
      }
      setCurrentInterval(maxInterval);
    }
  }, [queryFn, isEqual, config, determineNextInterval, currentInterval, unchangedCount]);

  /**
   * Starts polling
   */
  const start = useCallback(() => {
    setIsPolling(true);
  }, []);

  /**
   * Stops polling and clears any pending timers
   */
  const stop = useCallback(() => {
    setIsPolling(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Resets polling state to initial values
   * - Resets unchanged count to 0
   * - Resets interval to initial interval
   * - Clears previous data reference
   */
  const reset = useCallback(() => {
    const prevInterval = currentInterval;
    setUnchangedCount(0);
    setCurrentInterval(config.initialInterval);
    previousDataRef.current = null;
    
    // Log interval change if it actually changed
    if (prevInterval !== config.initialInterval) {
      logPollingIntervalChange(prevInterval, config.initialInterval, 0, 'reset');
    }
  }, [config.initialInterval, currentInterval]);

  /**
   * Polling effect - manages the polling loop
   * 
   * When polling is active:
   * 1. Executes initial poll immediately
   * 2. Schedules next poll after currentInterval
   * 3. Repeats until polling is stopped
   * 
   * Cleanup: Clears timer when polling stops or component unmounts
   */
  useEffect(() => {
    if (!isPolling) return;

    let isMounted = true;

    const scheduleNext = () => {
      if (!isMounted) return;
      
      timerRef.current = setTimeout(async () => {
        if (!isMounted) return;
        await poll();
        // Only schedule next poll if still mounted and polling
        if (isMounted && isPolling) {
          scheduleNext();
        }
      }, currentInterval);
    };

    // Execute initial poll immediately
    poll().then(() => {
      // Schedule next poll only if still mounted and polling after initial poll
      if (isMounted && isPolling) {
        scheduleNext();
      }
    });

    // Cleanup: Clear timer when polling stops or interval changes
    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPolling, currentInterval, poll]);

  /**
   * Cleanup effect - ensures timer is cleared on unmount
   * This satisfies Requirement 5.6: Stop polling when component unmounts
   */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    start,
    stop,
    reset,
    currentInterval,
    unchangedCount,
  };
}

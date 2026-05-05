/**
 * Hook to detect and handle query error states
 * Helps components show stale data warnings when network fails
 * 
 * Requirements: 10.1, 10.2, 10.5
 */

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

interface QueryErrorState {
  hasError: boolean;
  isShowingStaleData: boolean;
  error: Error | null;
  retry: () => void;
}

/**
 * Detects if a query has an error but is showing stale data
 * This happens when network fails but cached data is available
 * 
 * @param queryKey - The React Query key to monitor
 * @returns Error state information
 */
export function useQueryErrorState(queryKey: readonly unknown[]): QueryErrorState {
  const queryClient = useQueryClient();
  const [errorState, setErrorState] = useState<QueryErrorState>({
    hasError: false,
    isShowingStaleData: false,
    error: null,
    retry: () => {},
  });

  useEffect(() => {
    const query = queryClient.getQueryState(queryKey);
    
    if (!query) {
      setErrorState({
        hasError: false,
        isShowingStaleData: false,
        error: null,
        retry: () => {},
      });
      return;
    }

    const hasError = query.status === 'error';
    const hasData = query.data !== undefined;
    const isShowingStaleData = hasError && hasData;
    const error = query.error instanceof Error ? query.error : null;

    const retry = () => {
      queryClient.invalidateQueries({ queryKey });
    };

    setErrorState({
      hasError,
      isShowingStaleData,
      error,
      retry,
    });
  }, [queryClient, queryKey]);

  return errorState;
}

/**
 * Hook to check if any queries matching a pattern have errors
 * Useful for checking if an entire context has network issues
 * 
 * @param queryKeyPrefix - The prefix to match queries (e.g., ['specialists'])
 * @returns Whether any matching queries have errors
 */
export function useHasQueryErrors(queryKeyPrefix: readonly unknown[]): boolean {
  const queryClient = useQueryClient();
  const [hasErrors, setHasErrors] = useState(false);

  useEffect(() => {
    const queries = queryClient.getQueriesData({ queryKey: queryKeyPrefix });
    const anyErrors = queries.some(([_key, data]) => {
      const query = queryClient.getQueryState(_key as readonly unknown[]);
      return query?.status === 'error';
    });

    setHasErrors(anyErrors);
  }, [queryClient, queryKeyPrefix]);

  return hasErrors;
}

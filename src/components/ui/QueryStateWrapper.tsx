/**
 * Query State Wrapper Component
 * Wraps content and shows stale data warnings when network fails
 * Displays cached data with a subtle indicator
 * 
 * Requirements: 10.5 - Display cached data even when network requests fail
 */

import { ReactNode } from 'react';
import { useQueryErrorState } from '@/hooks/useQueryErrorState';
import { StaleDataWarning } from './QueryErrorBoundary';
import { cn } from '@/lib/utils';

interface QueryStateWrapperProps {
  children: ReactNode;
  queryKey: readonly unknown[];
  className?: string;
  showWarningOnError?: boolean;
}

/**
 * Wraps content and shows a stale data warning when the query has an error
 * but cached data is available. This provides graceful degradation during
 * network failures.
 */
export function QueryStateWrapper({
  children,
  queryKey,
  className,
  showWarningOnError = true,
}: QueryStateWrapperProps) {
  const { isShowingStaleData, retry } = useQueryErrorState(queryKey);

  return (
    <div className={cn('space-y-3', className)}>
      {showWarningOnError && isShowingStaleData && (
        <StaleDataWarning onRetry={retry} />
      )}
      {children}
    </div>
  );
}

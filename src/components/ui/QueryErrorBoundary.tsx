// =============================================================================
// QUERY ERROR BOUNDARY — Catches errors from React Query operations
// Prevents query failures from crashing the parent component tree.
// Displays stale data when available, with a graceful error indicator.
// =============================================================================

import { Component, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QueryErrorBoundaryProps {
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
  onReset?: () => void;
  showStaleDataWarning?: boolean;
}

interface QueryErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class QueryErrorBoundary extends Component<QueryErrorBoundaryProps, QueryErrorBoundaryState> {
  state: QueryErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): QueryErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[QueryErrorBoundary] Query error caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <div
          className={cn(
            'flex flex-col gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4',
            this.props.className,
          )}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-foreground">
                Failed to load data
              </p>
              <p className="text-xs text-muted-foreground">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
          </div>
          
          {this.props.onReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="w-fit"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Try again
            </Button>
          )}
        </div>
      );
    }
    
    return this.props.children;
  }
}

/**
 * Stale Data Warning Component
 * Shows a subtle warning when displaying cached data during network failures
 */
interface StaleDataWarningProps {
  className?: string;
  onRetry?: () => void;
}

export function StaleDataWarning({ className, onRetry }: StaleDataWarningProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs',
        'dark:border-amber-900/50 dark:bg-amber-950/20',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
        <span className="text-amber-900 dark:text-amber-200">
          Showing cached data - network unavailable
        </span>
      </div>
      
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="h-6 px-2 text-xs text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}

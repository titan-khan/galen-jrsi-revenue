// =============================================================================
// CONTEXT ERROR BOUNDARY — Wraps context providers with error handling
// Provides graceful degradation when context queries fail
// Displays stale data when available and shows error state with retry option
// =============================================================================

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContextErrorBoundaryProps {
  children: ReactNode;
  contextName: string;
  onReset?: () => void;
  fallbackRoute?: string;
}

interface ContextErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically designed for context providers
 * Handles errors from React Query operations in contexts
 * Provides user-friendly error messages and recovery options
 */
export class ContextErrorBoundary extends Component<
  ContextErrorBoundaryProps,
  ContextErrorBoundaryState
> {
  state: ContextErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ContextErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[ContextErrorBoundary] Error in ${this.props.contextName}:`,
      error,
      info.componentStack
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleGoHome = () => {
    window.location.href = this.props.fallbackRoute || '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Something went wrong
                </h1>
                <p className="text-sm text-muted-foreground">
                  Failed to load {this.props.contextName} data
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-xs font-mono text-muted-foreground break-words">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {this.props.onReset && (
                <Button
                  onClick={this.handleReset}
                  className="w-full"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try again
                </Button>
              )}
              
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to home
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              If this problem persists, please contact support
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight error boundary for inline query errors
 * Shows a compact error message without taking over the entire page
 */
interface InlineQueryErrorBoundaryProps {
  children: ReactNode;
  className?: string;
  onReset?: () => void;
}

interface InlineQueryErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class InlineQueryErrorBoundary extends Component<
  InlineQueryErrorBoundaryProps,
  InlineQueryErrorBoundaryState
> {
  state: InlineQueryErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): InlineQueryErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[InlineQueryErrorBoundary] Query error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3',
            this.props.className
          )}
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Failed to load</p>
            <p className="text-xs text-muted-foreground truncate">
              {this.state.error?.message || 'An error occurred'}
            </p>
          </div>
          {this.props.onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={this.handleReset}
              className="shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// CHART ERROR BOUNDARY — Catches render errors from Vega-Lite charts
// Prevents chart failures from crashing the parent component tree.
// Displays a graceful fallback matching VegaLiteChart's built-in error UI.
// =============================================================================

import { Component, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChartErrorBoundaryProps {
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ChartErrorBoundary extends Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  state: ChartErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Chart render error caught by boundary:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          className={cn(
            'flex items-center gap-2 text-xs text-muted-foreground rounded-md border border-border/50 bg-muted/50 px-3 py-2',
            this.props.className,
          )}
        >
          <svg
            className="h-4 w-4 shrink-0 text-destructive-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Chart failed to render</span>
        </div>
      );
    }
    return this.props.children;
  }
}

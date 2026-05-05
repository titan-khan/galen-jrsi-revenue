// =============================================================================
// CHART PLACEHOLDER — Pulsing skeleton shown while a Vega-Lite spec streams in
// =============================================================================

import { BarChart3 } from 'lucide-react';

interface ChartPlaceholderProps {
  className?: string;
}

export default function ChartPlaceholder({ className }: ChartPlaceholderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-8 ${className ?? ''}`}
    >
      <BarChart3 className="h-8 w-8 text-muted-foreground/50 animate-pulse" />
      <span className="text-xs text-muted-foreground/60 animate-pulse">
        Generating chart...
      </span>
    </div>
  );
}

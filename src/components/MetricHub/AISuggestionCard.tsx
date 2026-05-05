import { TrendingUp, TrendingDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AISuggestionItem, MetricDomain } from '@/types/metric';

interface AISuggestionCardProps {
  suggestion: AISuggestionItem;
  comparisonLabel?: string;
  direction?: 'up_is_good' | 'down_is_good' | 'neutral';
  onFollow: (metricId: string) => void;
  onDismiss: (suggestionId: string) => void;
  onViewDetails?: (metricId: string) => void;
}

const DOMAIN_COLORS: Record<string, string> = {
  Revenue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  Cost: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  Fee: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  Margin: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  Operational: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800',
  Performance: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
};

export function AISuggestionCard({
  suggestion,
  comparisonLabel,
  direction = 'up_is_good',
  onFollow,
  onDismiss,
  onViewDetails,
}: AISuggestionCardProps) {
  const isPositive = suggestion.changePercent >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const domainColor = DOMAIN_COLORS[suggestion.domain || ''] || 'bg-muted text-muted-foreground';

  // Direction-aware color: "good" depends on metric direction
  const isGood =
    direction === 'down_is_good'
      ? suggestion.changePercent <= 0
      : suggestion.changePercent >= 0;

  return (
    <div
      className="relative bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={() => onViewDetails?.(suggestion.metricId)}
    >
      {/* Domain badge */}
      {suggestion.domain && (
        <Badge
          variant="outline"
          className={cn('text-[10px] h-5 px-1.5 font-medium mb-2', domainColor)}
        >
          {suggestion.domain}
        </Badge>
      )}

      {/* Metric name */}
      <h3 className="text-[14px] font-medium text-foreground mb-2 pr-6 leading-tight">
        {suggestion.metricName}
      </h3>

      {/* Value + change */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xl font-bold text-foreground font-mono tracking-tight">
          {suggestion.value}
        </span>
        {suggestion.changePercent !== 0 && (
          <div
            className={cn(
              'inline-flex items-center gap-0.5 text-[11px] font-medium',
              isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>
              {isPositive ? '+' : ''}
              {suggestion.changePercent}%
            </span>
          </div>
        )}
      </div>

      {/* Comparison label */}
      {comparisonLabel && (
        <p className="text-[10px] text-muted-foreground/60 mb-2">{comparisonLabel}</p>
      )}

      {/* WHY — compact */}
      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-3">
        {suggestion.why}
      </p>

      {/* Action buttons + detail hint */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-7 text-[11px] gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onFollow(suggestion.metricId);
          }}
        >
          <Plus className="h-3 w-3" />
          Follow
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] gap-0.5 text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(suggestion.id);
          }}
        >
          <X className="h-3 w-3" />
          Dismiss
        </Button>
        <span className="ml-auto text-[11px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          View details →
        </span>
      </div>
    </div>
  );
}

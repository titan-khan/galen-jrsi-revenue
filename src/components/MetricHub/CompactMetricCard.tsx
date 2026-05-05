import { useState } from 'react';
import { TrendingUp, TrendingDown, Plus, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MetricDefinition } from '@/types/metric';

interface CompactMetricCardProps {
  metric: MetricDefinition;
  onToggleFollow: (id: string) => void;
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

export function CompactMetricCard({ metric, onToggleFollow, onViewDetails }: CompactMetricCardProps) {
  const [isHoveringFollow, setIsHoveringFollow] = useState(false);
  const { displayData } = metric;
  const isPositive = displayData.changePercent >= 0;
  const isGood =
    metric.direction === 'down_is_good'
      ? displayData.changePercent <= 0
      : displayData.changePercent >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const domainColor = DOMAIN_COLORS[metric.domain || ''] || 'bg-muted text-muted-foreground';

  return (
    <div
      className="relative bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={() => onViewDetails?.(metric.id)}
    >
      {/* Follow / Following button (top-right) */}
      <div className="absolute top-3 right-3">
        {metric.isFollowing ? (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 text-[10px] px-2 gap-1 font-medium transition-colors',
              isHoveringFollow
                ? 'text-red-600 hover:text-red-600 hover:bg-red-500/10'
                : 'text-emerald-600 hover:text-emerald-600 hover:bg-emerald-500/10'
            )}
            onMouseEnter={() => setIsHoveringFollow(true)}
            onMouseLeave={() => setIsHoveringFollow(false)}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFollow(metric.id);
            }}
          >
            {isHoveringFollow ? (
              <>
                <X className="h-3 w-3" />
                Unfollow
              </>
            ) : (
              <>
                <Check className="h-3 w-3" />
                Following
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2 gap-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFollow(metric.id);
            }}
          >
            <Plus className="h-3 w-3" />
            Follow
          </Button>
        )}
      </div>

      {/* Domain badge */}
      {metric.domain && (
        <Badge
          variant="outline"
          className={cn('text-[10px] h-5 px-1.5 font-medium mb-2', domainColor)}
        >
          {metric.domain}
        </Badge>
      )}

      {/* Metric name */}
      <h3 className="text-[14px] font-medium text-foreground mb-2 pr-16 leading-tight">
        {metric.name}
      </h3>

      {/* Value + change */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xl font-bold text-foreground font-mono tracking-tight">
          {displayData.currentValue}
        </span>
        {displayData.changeAbsolute !== 'N/A' && (
          <div
            className={cn(
              'inline-flex items-center gap-0.5 text-[11px] font-medium',
              isGood
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>
              {isPositive ? '+' : ''}
              {displayData.changePercent}%
            </span>
          </div>
        )}
      </div>

      {/* Comparison period label or filter context */}
      <p className="text-[10px] text-muted-foreground/60 mb-1">
        {displayData.comparisonLabel || displayData.filterContext}
      </p>

      {/* View details hint — appears on hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2">
        <span className="text-[11px] text-primary font-medium">
          View details →
        </span>
      </div>
    </div>
  );
}

import { memo } from 'react';
import { AlertTriangle, TrendingUp, Lightbulb, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SpecialistInsight } from '@/types/specialist';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  insight: SpecialistInsight;
  onDeepDive?: (insight: SpecialistInsight) => void;
  compact?: boolean;
  /** When false, hides the root cause block (useful when the parent group already shows root cause) */
  showRootCause?: boolean;
}

const INSIGHT_TYPE_CONFIG = {
  anomaly: { icon: AlertCircle, label: 'Anomaly', className: 'text-red-500' },
  trend: { icon: TrendingUp, label: 'Trend', className: 'text-blue-500' },
  pattern: { icon: Lightbulb, label: 'Pattern', className: 'text-amber-500' },
  risk: { icon: AlertTriangle, label: 'Risk', className: 'text-orange-500' },
};

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', dotColor: 'bg-red-500', badgeClass: 'text-red-600 bg-red-500/8 border-transparent', borderAccent: 'border-l-red-500' },
  high: { label: 'High', dotColor: 'bg-amber-500', badgeClass: 'text-amber-600 bg-amber-500/8 border-transparent', borderAccent: 'border-l-amber-500' },
  medium: { label: 'Medium', dotColor: 'bg-blue-500', badgeClass: 'text-blue-600 bg-blue-500/8 border-transparent', borderAccent: 'border-l-blue-500' },
  low: { label: 'Low', dotColor: 'bg-muted-foreground/40', badgeClass: 'text-muted-foreground bg-muted border-transparent', borderAccent: 'border-l-muted-foreground/40' },
};

export const InsightCard = memo(function InsightCard({ insight, onDeepDive, compact = false, showRootCause = true }: InsightCardProps) {
  const typeConfig = INSIGHT_TYPE_CONFIG[insight.type];
  const severityConfig = SEVERITY_CONFIG[insight.severity];
  const TypeIcon = typeConfig.icon;

  return (
    <div className={cn(
      'group rounded-lg border border-border bg-card',
      'transition-all duration-150',
      'hover:shadow-sm',
      compact ? 'p-3 border-l-2' : 'p-4',
      compact && severityConfig.borderAccent,
    )}>
      {/* Header row */}
      <div className={cn('flex items-center gap-2', compact ? 'mb-1.5' : 'mb-2.5')}>
        <TypeIcon className={cn('h-3.5 w-3.5', typeConfig.className)} />
        <Badge variant="outline" className={cn('text-xs font-medium h-5 px-1.5', severityConfig.badgeClass)}>
          {severityConfig.label}
        </Badge>
        <span className="text-xs text-muted-foreground/60">·</span>
        <span className="text-xs text-muted-foreground/60">
          {formatDistanceToNow(new Date(insight.detectedAt), { addSuffix: true })}
        </span>
      </div>

      {/* Headline */}
      <h4 className="text-sm font-medium text-foreground leading-snug mb-1.5">
        {insight.headline}
      </h4>

      {/* Description */}
      {insight.description && (
        <p className={cn(
          'text-xs text-muted-foreground/80 leading-relaxed mb-2',
          compact ? 'line-clamp-1' : 'line-clamp-2',
        )}>
          {insight.description}
        </p>
      )}

      {/* Root Cause — hidden in compact mode or when showRootCause is false */}
      {showRootCause && !compact && insight.rootCause && (
        <div className="flex items-start gap-2 mt-2.5 p-2.5 rounded-md bg-muted/30">
          <Lightbulb className="h-3 w-3 text-amber-500/70 mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground/80">Root cause:</span> {insight.rootCause}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className={cn(
        'flex items-center justify-between border-t border-border/40',
        compact ? 'mt-2 pt-2' : 'mt-3 pt-2.5',
      )}>
        <span className="text-sm text-muted-foreground/60">
          Confidence {insight.confidence}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 text-sm text-muted-foreground hover:text-foreground px-2"
          onClick={() => onDeepDive?.(insight)}
        >
          Deep Dive
          <ArrowUpRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
});

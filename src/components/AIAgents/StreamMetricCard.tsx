import { TrendingUp, TrendingDown, AlertTriangle, AlertCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MetricStatus } from '@/types/metric';

interface StreamMetricCardProps {
  name: string;
  value: string;
  changePercent: number;
  status: MetricStatus;
  compact?: boolean;
  comparisonLabel?: string;
}

const statusConfig: Record<MetricStatus, { icon: typeof BarChart3; color: string; bgColor: string }> = {
  healthy: { icon: BarChart3, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  critical: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-500/10' },
};

export function StreamMetricCard({
  name,
  value,
  changePercent,
  status,
  compact = false,
  comparisonLabel,
}: StreamMetricCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const isPositive = changePercent >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card">
        <StatusIcon className={cn('h-3.5 w-3.5', config.color)} />
        <span className="text-sm font-medium text-foreground">{name}</span>
        <span className="text-sm font-semibold text-foreground">{value}</span>
        <span className={cn('text-xs', isPositive ? 'text-emerald-600' : 'text-red-600')}>
          {isPositive ? '+' : ''}{changePercent}%
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
      <div className={cn('p-2.5 rounded-lg', config.bgColor)}>
        <StatusIcon className={cn('h-5 w-5', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground truncate">{name}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
      <div className="text-right">
        <div className={cn('flex items-center gap-1', isPositive ? 'text-emerald-600' : 'text-red-600')}>
          <TrendIcon className="h-4 w-4" />
          <span className="font-medium">{isPositive ? '+' : ''}{changePercent}%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {comparisonLabel || <span className="capitalize">{status}</span>}
        </p>
      </div>
    </div>
  );
}

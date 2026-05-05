import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getPositiveContributors, getNegativeContributors } from '@/data/metricsTreeData';
import { useMetrics } from '@/contexts/MetricsContext';
import { cn } from '@/lib/utils';

interface ContributorsPanelProps {
  rootMetricId: string;
  onViewDetails?: (metricId: string) => void;
}

export function ContributorsPanel({ rootMetricId, onViewDetails }: ContributorsPanelProps) {
  const { metrics } = useMetrics();
  const positive = useMemo(() => getPositiveContributors(rootMetricId, metrics), [rootMetricId, metrics]);
  const negative = useMemo(() => getNegativeContributors(rootMetricId, metrics), [rootMetricId, metrics]);

  if (positive.length === 0 && negative.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Positive contributors */}
      {positive.length > 0 && (
        <div className="rounded-lg border border-border bg-emerald-50/30 dark:bg-emerald-950/10 p-4 space-y-3">
          <h4 className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Positive Contributors
          </h4>
          <div className="space-y-2">
            {positive.map((c) => (
              <div
                key={c.metricId}
                className="flex items-center justify-between text-[12px] py-1 cursor-pointer hover:bg-emerald-100/40 dark:hover:bg-emerald-900/20 rounded px-1.5 -mx-1.5 transition-colors"
                onClick={() => onViewDetails?.(c.metricId)}
              >
                <span className="text-foreground/80">{c.name}</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {c.changePercent > 0 ? '+' : ''}
                  {c.changePercent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Negative contributors */}
      {negative.length > 0 && (
        <div className="rounded-lg border border-border bg-red-50/30 dark:bg-red-950/10 p-4 space-y-3">
          <h4 className="text-[13px] font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" />
            Negative Contributors
          </h4>
          <div className="space-y-2">
            {negative.map((c) => (
              <div
                key={c.metricId}
                className="flex items-center justify-between text-[12px] py-1 cursor-pointer hover:bg-red-100/40 dark:hover:bg-red-900/20 rounded px-1.5 -mx-1.5 transition-colors"
                onClick={() => onViewDetails?.(c.metricId)}
              >
                <span className="text-foreground/80">{c.name}</span>
                <span className="font-mono font-medium text-red-600 dark:text-red-400">
                  {c.changePercent > 0 ? '+' : ''}
                  {c.changePercent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { MetricDefinition } from '@/types/metric';
import { useMetrics } from '@/contexts/MetricsContext';
import { MetricCertBadge } from '@/components/MetricCertBadge';

const SHOW_CERT_BADGES = import.meta.env.VITE_SHOW_CERT_BADGES === "true";

interface MetricCardProps {
  metric: MetricDefinition;
}

export function MetricCard({ metric }: MetricCardProps) {
  const { displayData } = metric;
  const { getCertForMetric } = useMetrics();
  const cert = getCertForMetric(metric.id);
  const isPositive = displayData.changePercent > 0;
  const isNegative = displayData.changePercent < 0;

  // Determine if change is good or bad based on sentiment
  const isGoodChange = 
    (metric.valueSentiment === 'up-good' && isPositive) ||
    (metric.valueSentiment === 'up-bad' && isNegative);

  return (
    <div
      // to={`/metrics/${metric.id}`}
      className="block p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-xs font-medium text-foreground line-clamp-1">
          {metric.name}
        </h4>
        {displayData.changePercent !== 0 && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium shrink-0',
              isGoodChange
                ? 'text-emerald-600'
                : 'text-red-600'
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{Math.abs(displayData.changePercent)}%</span>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-md font-semibold text-foreground">
          {displayData.currentValue}
        </span>
        <span className="text-xs text-muted-foreground">
          {displayData.comparisonLabel}
        </span>
      </div>

      {SHOW_CERT_BADGES && cert && (
        <div className="mt-1.5">
          <MetricCertBadge cert={cert} size="sm" />
        </div>
      )}

      {displayData.insight?.text && (
        <p className="text-xs text-muted-foreground/70 line-clamp-2 mt-1.5">
          {displayData.insight.text}
        </p>
      )}
    </div>
  );
}

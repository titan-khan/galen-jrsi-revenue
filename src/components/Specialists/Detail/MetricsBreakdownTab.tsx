import { useMemo, useState } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MetricsMovementChart } from './MetricsMovementChart';
import { MetricsHealthSection } from './MetricsHealthSection';
import { getNorthStarMetrics, generateMetricsTrend } from '@/data/transportXSpecialists';
import { cn } from '@/lib/utils';

type DateRange = '7d' | '30d' | '90d';

const DIM_STATUS = {
  critical: { className: 'text-red-600 bg-red-500/8 border-transparent' },
  warning: { className: 'text-amber-600 bg-amber-500/8 border-transparent' },
  healthy: { className: 'text-emerald-600 bg-emerald-500/8 border-transparent' },
};

/** Lightweight SVG sparkline — no Vega dependency */
function Sparkline({ data, direction = 'up_is_good', className }: { data: number[]; direction?: 'up_is_good' | 'down_is_good' | 'neutral'; className?: string }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (w - padding * 2);
      const y = padding + (1 - (v - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  // Direction-aware color: for "down_is_good" metrics, trending up = bad (red)
  const trending = data[data.length - 1] >= data[0];
  const isGood = direction === 'neutral'
    ? null
    : direction === 'down_is_good'
      ? !trending
      : trending;
  const strokeColor = isGood === null ? 'rgb(156, 163, 175)' : isGood ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)';
  const fillColor = isGood === null ? 'rgba(156, 163, 175, 0.1)' : isGood ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  // Build area polygon (sparkline fill)
  const areaPoints = `${padding},${h - padding} ${points} ${w - padding},${h - padding}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className}>
      <polygon points={areaPoints} fill={fillColor} />
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface MetricsBreakdownTabProps {
  specialistId: string;
}

export function MetricsBreakdownTab({ specialistId }: MetricsBreakdownTabProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const data = useMemo(() => getNorthStarMetrics(specialistId), [specialistId]);
  const trendData = useMemo(() => generateMetricsTrend(specialistId, dateRange), [specialistId, dateRange]);
  const sparklineValues = useMemo(() => trendData.map(d => d.value), [trendData]);

  return (
    <div className="space-y-8">
      {/* Tab header with date range filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Metrics Breakdown</h3>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="h-7 w-[120px] text-sm border-border bg-background px-2.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d" className="text-xs">Last 7 Days</SelectItem>
            <SelectItem value="30d" className="text-xs">Last 30 Days</SelectItem>
            <SelectItem value="90d" className="text-xs">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Health Timeline */}
      <MetricsHealthSection specialistId={specialistId} dateRange={dateRange} />

      {/* KPI Cards with Sparklines */}
      {data.northStar.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Key Metrics</h3>
          <div className="grid grid-cols-2 gap-3">
            {data.northStar.map((metric, idx) => {
              const metricDirection = ((metric as { direction?: string }).direction || 'up_is_good') as 'up_is_good' | 'down_is_good' | 'neutral';
              const TrendIcon = metric.trend < 0 ? TrendingDown : metric.trend > 0 ? TrendingUp : Minus;

              // Direction-aware: for "down_is_good" (e.g. Return Rate), up = bad
              const isGood = metricDirection === 'neutral'
                ? false
                : metricDirection === 'down_is_good'
                  ? metric.trend < 0
                  : metric.trend > 0;
              const isBad = metricDirection === 'neutral'
                ? false
                : metricDirection === 'down_is_good'
                  ? metric.trend > 0
                  : metric.trend < 0;

              return (
                <div key={idx} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground/70 mb-1.5">{metric.label}</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-foreground tracking-tight">
                          {metric.value}
                        </span>
                        {metric.unit && (
                          <span className="text-xs text-muted-foreground/60">{metric.unit}</span>
                        )}
                      </div>
                      {metric.trend !== 0 && (
                        <div className={cn(
                          'flex items-center gap-1 mt-1.5 text-sm',
                          isGood ? 'text-emerald-600' : isBad ? 'text-red-600' : 'text-muted-foreground',
                        )}>
                          <TrendIcon className="h-3 w-3" />
                          <span className="font-medium">
                            {metric.trend > 0 ? '+' : ''}{metric.trend}%
                          </span>
                          {metric.trendLabel && (
                            <span className="text-muted-foreground/50 ml-0.5">{metric.trendLabel}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Mini sparkline */}
                    <Sparkline data={sparklineValues} direction={metricDirection} className="shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Trend Chart */}
      <MetricsMovementChart specialistId={specialistId} dateRange={dateRange} />

      {/* Key Drivers */}
      {data.drivers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Key Drivers</h3>
          <div className="flex flex-wrap gap-2">
            {data.drivers.map((driver, idx) => (
              <Badge key={idx} variant="outline" className="text-xs font-normal capitalize border-border text-muted-foreground/80 px-2.5 py-1">
                {driver}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown by Dimension */}
      {data.breakdown.map((dim, dimIdx) => (
        <div key={dimIdx} className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">{dim.dimension}</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="divide-y divide-border/40">
              {dim.items.map((item, itemIdx) => {
                const statusStyle = DIM_STATUS[item.status];
                return (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <span className="text-xs text-foreground/80">{item.label}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-medium text-foreground">{item.value}</span>
                      <Badge variant="outline" className={cn('text-xs font-medium h-5 px-1.5', statusStyle.className)}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Empty state */}
      {data.northStar.length === 0 && data.breakdown.length === 0 && (
        <div className="text-center py-16 text-sm text-muted-foreground/60">
          No metrics data available for this specialist
        </div>
      )}
    </div>
  );
}

import { useMemo, useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateMetricsHealthTimeline, calculateHealthyPercentage } from '@/data/transportXSpecialists';
import { cn } from '@/lib/utils';
import type { MetricsHealthSegment } from '@/types/specialist';

type DateRange = '7d' | '30d' | '90d';
type Granularity = 'hourly' | 'daily';

const STATUS_COLORS: Record<string, string> = {
  healthy: '#10b981',     // emerald-500
  warning: '#f59e0b',     // amber-500
  critical: '#ef4444',    // red-500
  no_data: '#d4d4d8',     // zinc-300
};

const STATUS_LABELS: Record<string, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
  no_data: 'No Data',
};

// Max visible blocks before pagination kicks in
const VISIBLE_BLOCKS: Record<Granularity, number> = {
  daily: 30,
  hourly: 48,
};

interface MetricsHealthSectionProps {
  specialistId: string;
  dateRange: DateRange;
}

export function MetricsHealthSection({ specialistId, dateRange }: MetricsHealthSectionProps) {
  const [granularity, setGranularity] = useState<Granularity>('hourly');
  const [offset, setOffset] = useState(0);

  const effectiveGranularity = dateRange === '90d' ? 'daily' : granularity;

  const segments = useMemo(
    () => generateMetricsHealthTimeline(specialistId, dateRange, granularity),
    [specialistId, dateRange, granularity],
  );

  const healthyPercent = useMemo(
    () => calculateHealthyPercentage(segments),
    [segments],
  );

  // Reset offset when filters change
  const filterKey = `${dateRange}-${granularity}`;
  const prevFilterKey = useRef(filterKey);
  if (filterKey !== prevFilterKey.current) {
    prevFilterKey.current = filterKey;
    if (offset !== 0) setOffset(0);
  }

  // Pagination
  const maxVisible = VISIBLE_BLOCKS[effectiveGranularity];
  const needsPagination = segments.length > maxVisible;

  const visibleSegments = useMemo(() => {
    if (!needsPagination) return segments;
    const start = Math.max(0, segments.length - maxVisible - offset);
    return segments.slice(start, start + maxVisible);
  }, [segments, needsPagination, maxVisible, offset]);

  const canGoLeft = needsPagination && offset < segments.length - maxVisible;
  const canGoRight = needsPagination && offset > 0;

  const handleLeft = useCallback(() => {
    setOffset((o) => Math.min(o + Math.floor(maxVisible / 2), segments.length - maxVisible));
  }, [maxVisible, segments.length]);

  const handleRight = useCallback(() => {
    setOffset((o) => Math.max(o - Math.floor(maxVisible / 2), 0));
  }, [maxVisible]);

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h3 className="text-sm font-medium text-foreground">Metrics Health</h3>
        <div className="flex items-center gap-2">
          <Select
            value={effectiveGranularity}
            onValueChange={(v) => setGranularity(v as Granularity)}
            disabled={dateRange === '90d'}
          >
            <SelectTrigger className={cn(
              "h-7 w-[100px] text-sm border-border bg-background px-2.5",
              dateRange === '90d' && 'opacity-50',
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly" className="text-xs">Hourly</SelectItem>
              <SelectItem value="daily" className="text-xs">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Legend + healthy % row */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-4">
          {(['healthy', 'warning', 'critical'] as const).map((status) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              <span className="text-sm text-muted-foreground/60">
                {STATUS_LABELS[status]}
              </span>
            </div>
          ))}
        </div>
        <span className="text-sm font-medium text-foreground">
          {healthyPercent}% Healthy
        </span>
      </div>

      {/* Timeline bar with chevron navigation */}
      <div className="flex items-center gap-1 px-2.5 pb-4">
        {/* Left chevron */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 shrink-0 text-muted-foreground/40 hover:text-foreground",
            !canGoLeft && 'opacity-0 pointer-events-none',
          )}
          onClick={handleLeft}
          disabled={!canGoLeft}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Timeline */}
        <div className="flex-1 min-w-0">
          <HealthTimelineBar segments={visibleSegments} granularity={effectiveGranularity} />
        </div>

        {/* Right chevron */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 shrink-0 text-muted-foreground/40 hover:text-foreground",
            !canGoRight && 'opacity-0 pointer-events-none',
          )}
          onClick={handleRight}
          disabled={!canGoRight}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* --- Health Timeline Bar --- */

interface HealthTimelineBarProps {
  segments: MetricsHealthSegment[];
  granularity: Granularity;
}

function HealthTimelineBar({ segments, granularity }: HealthTimelineBarProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    segment: MetricsHealthSegment;
  } | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = e.currentTarget;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const fraction = x / rect.width;
      const idx = Math.min(
        Math.floor(fraction * segments.length),
        segments.length - 1,
      );
      if (idx >= 0 && idx < segments.length) {
        setTooltip({ x, segment: segments[idx] });
      }
    },
    [segments],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (segments.length === 0) return null;

  const gapPx = granularity === 'daily' ? 3 : 2;

  return (
    <div
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Block row */}
      <div
        className="flex items-stretch rounded-md overflow-hidden"
        style={{ gap: `${gapPx}px`, height: 28 }}
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            className="flex-1 rounded-[3px] min-w-0 transition-opacity"
            style={{ backgroundColor: STATUS_COLORS[seg.status] }}
          />
        ))}
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="absolute bottom-full mb-2 pointer-events-none z-50"
          style={{
            left: `${tooltip.x}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 shadow-md whitespace-nowrap">
            <p className="text-sm font-medium text-foreground">
              {granularity === 'daily'
                ? format(new Date(tooltip.segment.timestamp), 'MMM d, yyyy')
                : format(new Date(tooltip.segment.timestamp), 'MMM d, yyyy HH:mm')
              }
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="h-1.5 w-1.5 rounded-sm"
                style={{ backgroundColor: STATUS_COLORS[tooltip.segment.status] }}
              />
              <span className="text-xs text-muted-foreground">
                {STATUS_LABELS[tooltip.segment.status]}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

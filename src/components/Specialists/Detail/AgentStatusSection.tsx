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
import { generateTimelineData, calculateUptimePercentage } from '@/data/transportXSpecialists';
import { cn } from '@/lib/utils';
import type { TimelineSegment } from '@/types/specialist';

type DateRange = '7d' | '30d' | '90d';
type Granularity = 'hourly' | 'daily';

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',      // emerald-500
  paused: '#f59e0b',      // amber-500
  not_working: '#ef4444',  // red-500
  no_data: '#d4d4d8',     // zinc-300 — gray for no activity
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  not_working: 'Not Working',
  no_data: 'No Data',
};

// Max visible blocks before pagination kicks in
const VISIBLE_BLOCKS: Record<Granularity, number> = {
  daily: 30,
  hourly: 48,
};

interface AgentStatusSectionProps {
  specialistId: string;
}

export function AgentStatusSection({ specialistId }: AgentStatusSectionProps) {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [granularity, setGranularity] = useState<Granularity>('hourly');
  const [offset, setOffset] = useState(0);

  const effectiveGranularity = dateRange === '90d' ? 'daily' : granularity;

  const segments = useMemo(
    () => generateTimelineData(specialistId, dateRange, granularity),
    [specialistId, dateRange, granularity],
  );

  const uptimePercent = useMemo(
    () => calculateUptimePercentage(segments),
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
        <h3 className="text-sm font-medium text-foreground">Specialist Status</h3>
        <div className="flex items-center gap-2">
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

      {/* Legend + uptime row */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-4">
          {(['active', 'paused', 'not_working'] as const).map((status) => (
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
          {uptimePercent}% Running
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
          <TimelineBar segments={visibleSegments} granularity={effectiveGranularity} />
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

/* ─── Timeline Bar ─── */

interface TimelineBarProps {
  segments: TimelineSegment[];
  granularity: Granularity;
}

function TimelineBar({ segments, granularity }: TimelineBarProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    segment: TimelineSegment;
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

  // Gap: 3px for daily (fewer blocks, wider), 2px for hourly
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

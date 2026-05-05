import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SparklineDataPoint {
  label?: string;
  month?: string;
  value: number;
}

interface SVGSparklineProps {
  data: SparklineDataPoint[];
  width?: number;
  height?: number;
  color?: string;
  showLabels?: boolean;
  className?: string;
}

export function SVGSparkline({
  data,
  width = 200,
  height = 48,
  color,
  showLabels = true,
  className,
}: SVGSparklineProps) {
  const { path, areaPath, endDot, minLabel, maxLabel, lastLabel, strokeColor, fillColor } =
    useMemo(() => {
      if (data.length < 2) {
        return {
          path: '',
          areaPath: '',
          endDot: { cx: 0, cy: 0 },
          minLabel: '',
          maxLabel: '',
          lastLabel: '',
          strokeColor: 'rgb(99, 102, 241)',
          fillColor: 'rgba(99, 102, 241, 0.08)',
        };
      }

      const values = data.map((d) => d.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      const padX = 4;
      const padY = showLabels ? 14 : 4;
      const drawW = width - padX * 2;
      const drawH = height - padY * 2;

      // Build monotone cubic-interpolated path
      const points = data.map((d, i) => ({
        x: padX + (i / (data.length - 1)) * drawW,
        y: padY + (1 - (d.value - min) / range) * drawH,
      }));

      // Smooth path using catmull-rom → cubic bezier
      let d = `M ${points[0].x},${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
      }

      // Build area path (close to bottom)
      const bottomY = height - (showLabels ? 4 : padY);
      const areaD = `${d} L ${points[points.length - 1].x},${bottomY} L ${points[0].x},${bottomY} Z`;

      // Determine color from trend
      const trending = values[values.length - 1] >= values[0];
      const sc = color || (trending ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)');
      const fc = color
        ? color.replace('rgb', 'rgba').replace(')', ', 0.08)')
        : trending
          ? 'rgba(16, 185, 129, 0.08)'
          : 'rgba(239, 68, 68, 0.08)';

      const last = points[points.length - 1];
      const lastItem = data[data.length - 1];

      return {
        path: d,
        areaPath: areaD,
        endDot: { cx: last.x, cy: last.y },
        minLabel: formatCompact(min),
        maxLabel: formatCompact(max),
        lastLabel: lastItem.label || lastItem.month || '',
        strokeColor: sc,
        fillColor: fc,
      };
    }, [data, width, height, color, showLabels]);

  if (data.length < 2) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0', className)}
    >
      {/* Gradient fill */}
      <path d={areaPath} fill={fillColor} />
      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle cx={endDot.cx} cy={endDot.cy} r={3} fill={strokeColor} />

      {/* Labels */}
      {showLabels && (
        <>
          <text
            x={4}
            y={10}
            fontSize={9}
            fontFamily="ui-monospace, monospace"
            fill="currentColor"
            className="text-muted-foreground/50"
          >
            {maxLabel}
          </text>
          <text
            x={4}
            y={height - 1}
            fontSize={9}
            fontFamily="ui-monospace, monospace"
            fill="currentColor"
            className="text-muted-foreground/50"
          >
            {minLabel}
          </text>
          {lastLabel && (
            <text
              x={width - 4}
              y={height - 1}
              fontSize={9}
              textAnchor="end"
              fill="currentColor"
              className="text-muted-foreground/40"
            >
              {lastLabel}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

function formatCompact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  if (v % 1 !== 0) return v.toFixed(1);
  return String(v);
}

import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { VolumeTimeline } from '@/data/risetData';

interface VolumeTimelineCardProps {
  timeline: VolumeTimeline;
  /** Override the default "Volume percakapan minggu ini" heading — used by Live mode. */
  titleOverride?: string;
  /** Override the default Newstensity/Determ methodology note — used by Live mode. */
  methodologyOverride?: string;
}

const CHART_W = 640;
const CHART_H = 200;
const PAD_L = 60;
const PAD_R = 20;
const PAD_T = 20;
const PAD_B = 40;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

export function VolumeTimelineCard({
  timeline,
  titleOverride,
  methodologyOverride,
}: VolumeTimelineCardProps) {
  const { days, annotations, context, totalConversations, rangeLabel } = timeline;

  const totals = days.map((d) => d.negative + d.neutral + d.positive);
  const maxTotal = Math.max(...totals, 1);
  // Smart y-axis rounding: scale increments to the magnitude of the data so small
  // counts (Live mode, N≈2-15) don't get drowned in a 0-100 scale.
  const yMax =
    maxTotal <= 5
      ? 5
      : maxTotal <= 10
      ? 10
      : maxTotal <= 25
      ? 25
      : maxTotal <= 50
      ? 50
      : maxTotal <= 100
      ? 100
      : Math.ceil(maxTotal / 100) * 100;

  const yToPx = (v: number) => PAD_T + (1 - v / yMax) * PLOT_H;
  const xToPx = (i: number) => PAD_L + (i / (days.length - 1)) * PLOT_W;

  // Build cumulative areas (bottom-up: negative, neutral, positive)
  // Each area path: line forward across top, line backward across bottom
  const buildArea = (
    bottomFn: (d: (typeof days)[number]) => number,
    topFn: (d: (typeof days)[number]) => number,
  ) => {
    const top = days.map((d, i) => `${xToPx(i)},${yToPx(topFn(d))}`).join(' L ');
    const bottom = [...days]
      .reverse()
      .map((d, idx) => {
        const i = days.length - 1 - idx;
        return `${xToPx(i)},${yToPx(bottomFn(d))}`;
      })
      .join(' L ');
    return `M ${top} L ${bottom} Z`;
  };

  const negPath = buildArea(
    () => 0,
    (d) => d.negative,
  );
  const neuPath = buildArea(
    (d) => d.negative,
    (d) => d.negative + d.neutral,
  );
  const posPath = buildArea(
    (d) => d.negative + d.neutral,
    (d) => d.negative + d.neutral + d.positive,
  );

  // Gridlines: 4 horizontal at y=0, yMax/4, yMax/2, 3yMax/4, yMax
  const gridYValues = [0, yMax / 4, yMax / 2, (3 * yMax) / 4, yMax];

  // Render context with **bold** markers
  const renderContext = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**') ? (
        <strong key={i} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-baseline justify-between border-b border-border pb-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {titleOverride ?? "Volume percakapan minggu ini"}
          </h3>
        </div>

        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-[22px] font-semibold tracking-tight text-foreground">
            {totalConversations.toLocaleString('id-ID')}
          </span>
          <span className="text-[13px] text-muted-foreground">
            percakapan terdeteksi · {rangeLabel}
          </span>
        </div>

        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          {renderContext(context)}
        </p>

        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
          <span>
            {methodologyOverride ?? (
              <>
                Data percakapan dari layanan media intelligence terintegrasi (Newstensity, Determ).
                Analisis coupling dengan data klaim internal oleh Galen.
              </>
            )}
          </span>
        </div>

        {/* Chart */}
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="block h-[200px] w-full"
          preserveAspectRatio="none"
        >
          {/* Gridlines + y labels */}
          {gridYValues.map((v) => (
            <g key={v}>
              <line
                x1={PAD_L}
                y1={yToPx(v)}
                x2={CHART_W - PAD_R}
                y2={yToPx(v)}
                className="stroke-border"
                strokeWidth={0.5}
                strokeDasharray="2 3"
              />
              <text
                x={PAD_L - 5}
                y={yToPx(v) + 3}
                textAnchor="end"
                className="fill-muted-foreground/70"
                style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10 }}
              >
                {v}
              </text>
            </g>
          ))}

          {/* Stacked areas */}
          <path d={negPath} className="fill-red-700/85" />
          <path d={neuPath} className="fill-slate-400/85" />
          <path d={posPath} className="fill-emerald-700/85" />

          {/* X labels */}
          {days.map((d, i) => (
            <text
              key={d.date}
              x={xToPx(i)}
              y={CHART_H - PAD_B + 18}
              textAnchor="middle"
              className="fill-muted-foreground/70"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10 }}
            >
              {d.label}
            </text>
          ))}

          {/* Annotations */}
          {annotations.map((a) => {
            const idx = days.findIndex((d) => d.date === a.date);
            if (idx === -1) return null;
            const total = days[idx].negative + days[idx].neutral + days[idx].positive;
            const cx = xToPx(idx);
            const cy = yToPx(total);
            return (
              <g key={a.date}>
                <circle cx={cx} cy={cy} r={3} className="fill-foreground" />
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx - 30}
                  y2={cy - 26}
                  className="stroke-foreground"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  fill="none"
                />
                <text
                  x={cx - 33}
                  y={cy - 30}
                  textAnchor="end"
                  className="fill-foreground"
                  style={{ fontSize: 10.5, fontWeight: 500 }}
                >
                  {a.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex gap-4 border-t border-dashed border-border pt-2.5 text-[11.5px] text-muted-foreground">
          <LegendItem swatch="bg-red-700/85" label="Negatif" />
          <LegendItem swatch="bg-slate-400/85" label="Netral" />
          <LegendItem swatch="bg-emerald-700/85" label="Positif" />
        </div>
      </CardContent>
    </Card>
  );
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      <span className={cn('h-2 w-2 rounded-sm', swatch)} />
      {label}
    </span>
  );
}

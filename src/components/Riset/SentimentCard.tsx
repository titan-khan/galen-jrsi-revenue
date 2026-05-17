import { ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SesiAnalytics } from '@/data/risetData';

interface SentimentCardProps {
  analytics: SesiAnalytics;
  /** Override "minggu ini" copy — Live mode uses the user-selected period. */
  periodLabel?: string;
  /** Override unit "percakapan" — Live mode uses "citation" since N is small. */
  unitLabel?: string;
}

export function SentimentCard({ analytics: a, periodLabel, unitLabel }: SentimentCardProps) {
  const trendUp = a.trendChangePoints > 0;
  const trendFlat = Math.abs(a.trendChangePoints) < 0.3;
  const trendIsWorse = trendUp; // negative sentiment going up = worse

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header */}
        <div className="mb-4 flex items-baseline justify-between border-b border-border pb-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sentimen di media sosial &amp; berita
          </h3>
          <span className="font-mono text-[11.5px] text-muted-foreground">
            {a.totalConversations.toLocaleString('id-ID')} {unitLabel ?? 'percakapan'} dianalisis
          </span>
        </div>

        {/* Headline */}
        <div className="mb-3 flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-[28px] font-semibold tracking-tight text-red-700">
            {a.sentimentNegativePct}%
          </span>
          <span className="text-[13px] text-muted-foreground">
            {unitLabel ?? 'percakapan'} bernada negatif {periodLabel ?? 'minggu ini'}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[12px] font-medium',
              trendFlat && 'bg-slate-100 text-slate-700',
              !trendFlat && trendIsWorse && 'bg-red-50 text-red-700',
              !trendFlat && !trendIsWorse && 'bg-emerald-50 text-emerald-700',
            )}
          >
            {trendFlat ? null : trendUp ? (
              <ArrowUp className="h-2.5 w-2.5" />
            ) : (
              <ArrowDown className="h-2.5 w-2.5" />
            )}
            {a.trendChangePoints > 0 ? '+' : ''}
            {a.trendChangePoints.toFixed(1)} poin
          </span>
        </div>

        {/* Sentiment bar */}
        <div className="mb-2 flex h-2 overflow-hidden rounded">
          <span
            className="bg-red-700"
            style={{ width: `${a.sentimentNegativePct}%` }}
          />
          <span
            className="bg-slate-400"
            style={{ width: `${a.sentimentNeutralPct}%` }}
          />
          <span
            className="bg-emerald-700"
            style={{ width: `${a.sentimentPositivePct}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-4 text-[11.5px] text-muted-foreground">
          <LegendItem swatch="bg-red-700" label="Negatif" value={`${a.sentimentNegativePct}%`} />
          <LegendItem
            swatch="bg-slate-400"
            label="Netral"
            value={`${a.sentimentNeutralPct}%`}
          />
          <LegendItem
            swatch="bg-emerald-700"
            label="Positif"
            value={`${a.sentimentPositivePct}%`}
          />
        </div>

        {/* Regions */}
        <div className="mt-4 border-t border-dashed border-border pt-3.5">
          <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Wilayah dengan sentimen negatif tertinggi
          </h4>
          <ul className="space-y-1.5">
            {a.topRegions.map((r) => (
              <li
                key={r.region}
                className="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-[12px]"
              >
                <span className="font-medium text-foreground/85">{r.region}</span>
                <span className="h-1.5 overflow-hidden rounded-sm bg-slate-200">
                  <span
                    className="block h-full bg-red-700"
                    style={{ width: `${r.negativePct}%` }}
                  />
                </span>
                <span className="text-right font-mono text-[11.5px] font-medium text-foreground">
                  {r.negativePct}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function LegendItem({
  swatch,
  label,
  value,
}: {
  swatch: string;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      <span className={cn('h-2 w-2 rounded-sm', swatch)} />
      {label} <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

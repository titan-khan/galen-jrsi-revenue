import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExperimentalBadge } from './ExperimentalBadge';
import {
  type Sesi,
  getEffectivePolaStatus,
  subscribePolaStatus,
} from '@/data/risetData';

interface BriefingCardProps {
  sesi: Sesi;
}

export function BriefingCard({ sesi }: BriefingCardProps) {
  const [unreviewed, setUnreviewed] = useState(() =>
    sesi.pola.filter((p) => getEffectivePolaStatus(p) === 'baru').length,
  );

  useEffect(() => {
    return subscribePolaStatus(() => {
      setUnreviewed(sesi.pola.filter((p) => getEffectivePolaStatus(p) === 'baru').length);
    });
  }, [sesi]);

  const { summary } = sesi;
  const filledArray: ('tinggi' | 'sedang' | 'rendah')[] = [
    ...Array(summary.highConfidenceCount).fill('tinggi'),
    ...Array(summary.mediumConfidenceCount).fill('sedang'),
    ...Array(summary.lowConfidenceCount).fill('rendah'),
  ];
  const totalSegments = 5;
  const emptyCount = Math.max(0, totalSegments - filledArray.length);
  const distributionLabel = [
    summary.highConfidenceCount && `${summary.highConfidenceCount} T`,
    summary.mediumConfidenceCount && `${summary.mediumConfidenceCount} S`,
    summary.lowConfidenceCount && `${summary.lowConfidenceCount} R`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      to={`/research/sesi/${sesi.id}`}
      className={cn(
        'group relative flex flex-col rounded-xl border border-border bg-card p-5',
        'transition-all duration-200 cursor-pointer',
        'hover:shadow-sm hover:bg-accent/30',
      )}
    >
      {/* Top row: Sesi label + chevron */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Sesi
          </span>
          <span className="font-mono text-[11px] font-medium text-foreground">
            {sesi.date}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="font-mono text-[11px] text-muted-foreground">{sesi.time}</span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
      </div>

      {/* Riset name — fixed single line */}
      <h3 className="mb-1 truncate text-[13px] font-semibold leading-tight text-foreground">
        {sesi.risetName}
      </h3>

      {/* Narrative — fixed 2-line height */}
      <p className="mb-3 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground/80">
        {summary.narrative.replace(/\*\*/g, '')}
      </p>

      {/* Confidence distribution — chips row equivalent */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-1 flex-1 gap-[1.5px] overflow-hidden rounded-sm">
          {filledArray.map((tone, i) => (
            <span
              key={`f-${i}`}
              className={cn(
                'flex-1',
                tone === 'tinggi' && 'bg-slate-900',
                tone === 'sedang' && 'bg-slate-500',
                tone === 'rendah' && 'bg-slate-400',
              )}
            />
          ))}
          {Array.from({ length: emptyCount }).map((_, i) => (
            <span key={`e-${i}`} className="flex-1 bg-muted" />
          ))}
        </div>
        <span className="shrink-0 whitespace-nowrap font-mono text-[10px] text-muted-foreground/70">
          {distributionLabel}
        </span>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 text-[11px]">
        {unreviewed > 0 ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-blue-600">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            {unreviewed} Pola belum direview
          </span>
        ) : (
          <span className="text-muted-foreground/60">Semua Pola sudah direview</span>
        )}
        <ExperimentalBadge />
      </div>
    </Link>
  );
}

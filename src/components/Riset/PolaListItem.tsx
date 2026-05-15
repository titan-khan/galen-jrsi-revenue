import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfidenceSegments } from './ConfidenceSegments';
import {
  type Pola,
  getEffectivePolaStatus,
  getSpawnedHandle,
  subscribePolaStatus,
} from '@/data/risetData';

interface PolaListItemProps {
  pola: Pola;
  sesiId: string;
}

export function PolaListItem({ pola, sesiId }: PolaListItemProps) {
  const [, force] = useState(0);
  useEffect(() => subscribePolaStatus(() => force((n) => n + 1)), []);

  const status = getEffectivePolaStatus(pola);
  const handle = getSpawnedHandle(pola);

  return (
    <Link
      to={`/research/sesi/${sesiId}/pola/${pola.id}`}
      className={cn(
        'group grid grid-cols-[28px_1fr_auto] items-start gap-4 rounded-xl border border-border bg-card p-5',
        'transition-all duration-200 cursor-pointer',
        'hover:shadow-sm hover:bg-accent/30',
        status === 'baru' && 'border-l-2 border-l-blue-500',
        status === 'spawned' && 'bg-muted/30',
        status === 'diabaikan' && 'opacity-60',
      )}
    >
      {/* Number badge */}
      <div className="grid h-7 w-7 place-items-center self-start rounded-md border border-border bg-background font-mono text-[12px] font-medium text-muted-foreground">
        {pola.number}
      </div>

      {/* Main column */}
      <div className="min-w-0">
        <div className="mb-1 flex items-baseline gap-2">
          <h3 className="truncate text-[13px] font-semibold leading-tight text-foreground">
            {pola.title}
          </h3>
        </div>
        <span className="mb-2 inline-block rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {pola.eventType}
        </span>
        <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
          {pola.preview}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/70">
          <span className="font-mono">{pola.evidenceCount} bukti</span>
          {pola.recurrence && (
            <>
              <span className="text-border">·</span>
              <span>{pola.recurrence}</span>
            </>
          )}
        </div>
      </div>

      {/* Right rail */}
      <div className="flex flex-col items-end gap-2">
        <ConfidenceSegments level={pola.confidence} />
        {status === 'direview' && (
          <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Sudah ditinjau
          </span>
        )}
        {status === 'spawned' && (
          <>
            <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
              Sudah jadi Spesialis
            </span>
            {handle && (
              <span className="font-mono text-[10.5px] text-blue-600">→ {handle}</span>
            )}
          </>
        )}
        {status === 'diabaikan' && (
          <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70">
            Diabaikan
          </span>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
      </div>
    </Link>
  );
}

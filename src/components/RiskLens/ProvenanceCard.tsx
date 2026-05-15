import { useState } from 'react';
import { ExternalLink, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ProvenanceItem } from '@/data/riskLensData';

interface ProvenanceCardProps {
  item: ProvenanceItem;
}

export function ProvenanceCard({ item }: ProvenanceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasReprints = (item.reprintCount ?? 0) > 0;

  return (
    <Card className="p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center rounded border border-primary/40 px-1.5 py-0.5 font-medium text-primary">
          {item.source}
        </span>
        <span>{item.when}</span>
        <span aria-hidden>·</span>
        <span>credibility {item.credibility.toFixed(2)}</span>
        {hasReprints && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center gap-0.5 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-500/20"
          >
            +{item.reprintCount} republikasi
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform',
                expanded && 'rotate-180',
              )}
            />
          </button>
        )}
        <span className="ml-auto">
          <ExternalLink className="h-3 w-3" />
        </span>
      </div>
      <div className="mt-1.5 text-sm leading-snug text-foreground">{item.headline}</div>
      {hasReprints && expanded && item.reprintSources && (
        <div className="mt-2 rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            artikel asal sama · sumber lain
          </div>
          <ul className="mt-1 space-y-0.5 text-xs text-foreground/85">
            {item.reprintSources.map((s) => (
              <li key={s} className="font-mono">
                · {s}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Di-cluster oleh fingerprint{' '}
            <span className="font-mono text-foreground/80">{item.articleFingerprint}</span> ·
            dihitung sebagai 1 sinyal.
          </p>
        </div>
      )}
    </Card>
  );
}

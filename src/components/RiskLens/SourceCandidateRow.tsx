import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { SourceCandidate } from '@/data/briefData';

interface SourceCandidateRowProps {
  source: SourceCandidate;
}

const STATUS_TONE: Record<SourceCandidate['status'], string> = {
  recommended: 'border-emerald-500/60 text-emerald-700 bg-emerald-500/5',
  optional: 'border-border text-muted-foreground',
  limited: 'border-amber-500/60 text-amber-700 bg-amber-500/5',
};

const TIER_TONE = (tier: SourceCandidate['tier']) =>
  tier === 0
    ? 'text-emerald-700'
    : tier >= 3
    ? 'text-destructive'
    : tier === 2
    ? 'text-amber-700'
    : 'text-foreground';

const TIER_LABEL = (tier: SourceCandidate['tier']) =>
  tier === 0 ? 'free' : '$'.repeat(tier);

const RESIDENCY_TONE: Record<SourceCandidate['residency'], string> = {
  ID: 'border-emerald-500/50 text-emerald-700 bg-emerald-500/5',
  SG: 'border-amber-500/50 text-amber-700 bg-amber-500/5',
  US: 'border-destructive/50 text-destructive bg-destructive/5',
};

export function SourceCandidateRow({ source }: SourceCandidateRowProps) {
  const [on, setOn] = useState(source.on);
  const disabled = source.comingSoon === true;
  return (
    <Card className={cn('p-3', (!on || disabled) && 'opacity-60')}>
      <div className="flex items-center gap-4">
        <Switch
          checked={on}
          onCheckedChange={setOn}
          aria-label={`toggle ${source.name}`}
          disabled={disabled}
        />

        <div className="min-w-[180px]">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <h3 className="text-sm font-semibold">{source.name}</h3>
            <Badge variant="outline" className="text-[10px]">
              {source.language}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-[10px] font-mono', RESIDENCY_TONE[source.residency])}
              title={`Data residency: ${source.residency}`}
            >
              {source.residency}
            </Badge>
            {disabled && (
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                coming Q3
              </Badge>
            )}
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">{source.adapter}</p>
        </div>

        <Stat label="tier" value={TIER_LABEL(source.tier)} valueClass={TIER_TONE(source.tier)} />
        <Stat label="credibility" value={source.credibility.toFixed(2)} />

        <div className="flex-1 min-w-[140px]">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              brief coverage
            </span>
            <span className="text-sm font-bold tabular-nums">{source.coverage}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full border border-border bg-background">
            <div
              className="h-full bg-primary/70"
              style={{ width: `${source.coverage}%` }}
            />
          </div>
        </div>

        <Stat label="est. / month" value={source.costLabel} align="right" />

        <Badge variant="outline" className={cn('shrink-0', STATUS_TONE[source.status])}>
          {source.status}
        </Badge>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  valueClass,
  align = 'center',
}: {
  label: string;
  value: string;
  valueClass?: string;
  align?: 'center' | 'right';
}) {
  return (
    <div className={cn('min-w-[64px]', align === 'right' && 'text-right')}>
      <div className={cn('text-base font-bold tabular-nums leading-none', valueClass)}>{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

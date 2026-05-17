import { GitBranch, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskEvent } from '@/data/riskLensData';

interface CouplingTraceCardProps {
  event: RiskEvent;
  className?: string;
}

function TypeBadge({ kind }: { kind: 'EXT' | 'INT' | 'OUT' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider',
        kind === 'EXT' && 'border-sky-600/40 bg-sky-600/10 text-sky-700',
        kind === 'INT' && 'border-violet-600/40 bg-violet-600/10 text-violet-700',
        kind === 'OUT' && 'border-emerald-600/40 bg-emerald-600/10 text-emerald-700',
      )}
    >
      {kind === 'EXT' ? 'EXT.SIGNAL' : kind === 'INT' ? 'INT.SIGNAL' : 'MATCH'}
    </span>
  );
}

function InputBlock({
  kind,
  predicate,
  bullets,
}: {
  kind: 'EXT' | 'INT';
  predicate: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-md border border-border bg-background/60">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-1.5">
        <TypeBadge kind={kind} />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          predicate
        </span>
        <span className="text-muted-foreground/50">›</span>
        <code className="font-mono text-[11px] text-foreground">{predicate}</code>
      </div>
      <ul className="space-y-0.5 px-3 py-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
            <span className="select-none text-foreground/30">+</span>
            <span className="text-foreground/80">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Connector({ label }: { label?: string }) {
  return (
    <div className="relative ml-6 flex h-6 items-center">
      <div className="absolute inset-y-0 left-0 w-px bg-border" aria-hidden />
      {label && (
        <span className="ml-[-13px] rounded-sm border border-foreground/30 bg-background px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.12em] text-foreground shadow-sm">
          {label}
        </span>
      )}
    </div>
  );
}

function OutputBlock({
  signature,
  matchedAt,
}: {
  signature: string;
  matchedAt: string;
}) {
  return (
    <div className="rounded-md border border-emerald-600/30 bg-emerald-600/[0.04]">
      <div className="flex items-center gap-2 border-b border-emerald-600/20 px-3 py-1.5">
        <TypeBadge kind="OUT" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          emitted
        </span>
      </div>
      <dl className="space-y-1 px-3 py-2 font-mono text-[11px] leading-relaxed">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          <dt className="w-24 shrink-0 text-muted-foreground">match_emitted</dt>
          <dd className="min-w-0 flex-1 break-words text-foreground">{matchedAt}</dd>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          <dt className="w-24 shrink-0 text-muted-foreground">signature</dt>
          <dd className="min-w-0 flex-1 break-all font-semibold text-emerald-700">
            {signature}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function CouplingTraceCard({ event, className }: CouplingTraceCardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card',
        className,
      )}
    >
      {/* Diagram ribbon */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3.5 py-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5" />
          Coupling logic
        </div>
        <code className="font-mono text-[11px] text-foreground">
          {event.couplingSignature}
        </code>
      </div>

      {/* Diagram body */}
      <div className="p-4">
        <InputBlock
          kind="EXT"
          predicate={event.couplingExternal.pattern}
          bullets={event.couplingExternal.bullets}
        />
        <Connector label="AND" />
        <InputBlock
          kind="INT"
          predicate={event.couplingInternal.pattern}
          bullets={event.couplingInternal.bullets}
        />
        <div className="relative ml-6 flex h-7 items-center">
          <div className="absolute inset-y-0 left-0 w-px bg-border" aria-hidden />
          <span className="ml-[-9px] flex h-[18px] w-[18px] items-center justify-center rounded-full border border-foreground/30 bg-background shadow-sm">
            <ArrowDown className="h-3 w-3 text-foreground" />
          </span>
        </div>
        <OutputBlock
          signature={event.couplingSignature}
          matchedAt={event.couplingMatchedAt}
        />
      </div>
    </div>
  );
}

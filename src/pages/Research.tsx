import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ShieldAlert,
  ArrowRight,
  MoreHorizontal,
  Plus,
  MessageCircle,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SeverityBadge } from '@/components/RiskLens/SeverityBadge';
import { RISK_EVENTS, WORKLIST_STATS } from '@/data/riskLensData';
import { cn } from '@/lib/utils';

const Research = () => {
  const topEvent = RISK_EVENTS[0];

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header */}
        <header className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Research
          </span>
          <h1 className="text-2xl font-semibold text-foreground">Research</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Active monitor for Jasa Raharja. Open the worklist to triage events, or ask the
            Assistant for an ad-hoc question.
          </p>
        </header>

        {/* Active monitor — dominant surface */}
        <section className="rounded-xl border border-border bg-card">
          {/* Header row */}
          <div className="flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Active monitor</span>
                <span className="text-muted-foreground/40">·</span>
                <span>Tier 2 · partial</span>
              </div>
              <h2 className="mt-1.5 text-lg font-semibold leading-tight text-foreground">
                Risk Lens · Jasa Raharja
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Coupling-event worklist for external signals × internal cases
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link to="/research/risk-lens">
                  Open worklist
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Monitor options">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/research/risk-lens/pipeline">
                      <Activity className="mr-2 h-4 w-4" />
                      Pipeline state
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      toast.success('Monitor paused', {
                        description: 'Worklist will stop receiving new events.',
                      })
                    }
                  >
                    Pause monitor
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      toast.message('Edit brief — coming soon', {
                        description: 'Update entities, sources, or routing rules.',
                      })
                    }
                  >
                    Edit brief
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Separator />

          {/* Stats */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 md:grid-cols-4">
            <Stat label="Open events" value={String(WORKLIST_STATS.open)} />
            <Stat label="HIGH" value={String(WORKLIST_STATS.high)} tone="destructive" />
            <Stat label="Medium" value={String(WORKLIST_STATS.medium)} tone="amber" />
            <Stat label="Last refresh" value={WORKLIST_STATS.lastRefresh} tone="muted" />
          </dl>

          <Separator />

          {/* Top event — primary inbound */}
          <Link
            to={`/research/risk-lens/${topEvent.id}`}
            className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/40"
          >
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Top event
            </span>
            <span className="font-mono text-base font-bold text-destructive tabular-nums">
              {topEvent.priorityScore.toFixed(2)}
            </span>
            <SeverityBadge level={topEvent.severity} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {topEvent.title}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{topEvent.detectedAgo}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
          </Link>
        </section>

        {/* Assistant handoff */}
        <section className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <MessageCircle className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">One-off question?</p>
              <p className="text-xs text-muted-foreground">
                Ad-hoc investigation with the Galen Assistant — iterates in chat, pulls from your
                live sources.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <Link to="/assistant">
              Ask Assistant
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </section>

        {/* Admin / discovery footer */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground">
          <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs">
            <Link to="/research/monitor/new">
              <Plus className="mr-1 h-3.5 w-3.5" />
              New monitor
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'destructive' | 'amber' | 'muted';
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 text-xl font-semibold tabular-nums leading-tight',
          tone === 'destructive' && 'text-destructive',
          tone === 'amber' && 'text-amber-700',
          tone === 'muted' && 'text-muted-foreground text-base',
          tone === 'default' && 'text-foreground',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export default Research;

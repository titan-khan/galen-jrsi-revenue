import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Dot,
  Search,
  AlertCircle,
  Clock,
  MoreHorizontal,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { SeverityBadge } from '@/components/RiskLens/SeverityBadge';
import { StatusBadge } from '@/components/RiskLens/StatusBadge';
import { MAMResponseBadge } from '@/components/RiskLens/MAMResponseBadge';
import { ProvenanceCard } from '@/components/RiskLens/ProvenanceCard';
import { InternalCaseCard } from '@/components/RiskLens/InternalCaseCard';
import { CouplingTraceCard } from '@/components/RiskLens/CouplingTraceCard';
import { EvidenceContent } from '@/components/RiskLens/EvidenceContent';
import { ExecuteActionModal } from '@/components/RiskLens/ExecuteActionModal';
import { DismissEventModal } from '@/components/RiskLens/DismissEventModal';
import { EscalateEventModal } from '@/components/RiskLens/EscalateEventModal';
import { getRiskEvent } from '@/data/riskLensData';

const AMPLIFIER_DOT: Record<'high' | 'med' | 'low', string> = {
  high: 'text-destructive',
  med: 'text-amber-600',
  low: 'text-muted-foreground',
};

const RiskLensDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const event = getRiskEvent(eventId);

  const [executeOpen, setExecuteOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  if (!event) {
    return <Navigate to="/research/risk-lens" replace />;
  }

  const priorityTone =
    event.priorityScore >= 0.7 ? 'destructive' : event.priorityScore >= 0.4 ? 'amber' : 'muted';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top breadcrumb */}
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-1 -ml-2">
            <Link to="/research/risk-lens">
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Worklist
            </Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{event.severity} severity</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-muted-foreground">{event.eventType}</span>
          <div className="ml-auto flex items-center gap-2">
            <SeverityBadge level={event.severity} />
            <StatusBadge status={event.status} />
          </div>
        </div>
      </div>

      {/* Body: evidence (left) + MAM spine (right) */}
      <div className="grid flex-1 grid-cols-1 gap-0 min-h-0 lg:grid-cols-[1fr_340px]">
        {/* Main content */}
        <main className="overflow-auto px-6 py-5">
          {/* Event header */}
          <header className="mb-6 space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold text-foreground leading-tight">
                  {event.title}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>detected {event.detectedAgo}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>
                    region{' '}
                    <span className="font-medium text-foreground">
                      {event.region} ({event.regionCode})
                    </span>
                  </span>
                  {event.amplifierActive && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="font-medium text-destructive">amplifier active</span>
                    </>
                  )}
                </div>
              </div>

              {/* Composite priority + Confidence (only two numbers that matter) */}
              <div className="flex items-baseline gap-6">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Composite priority
                  </div>
                  <div
                    className={cn(
                      'mt-0.5 font-mono text-4xl font-bold leading-none tabular-nums',
                      priorityTone === 'destructive' && 'text-destructive',
                      priorityTone === 'amber' && 'text-amber-700',
                      priorityTone === 'muted' && 'text-foreground',
                    )}
                  >
                    {event.priorityScore.toFixed(2)}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    severity {event.severityScore.toFixed(2)} · momentum ↑ {event.momentumPct}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Confidence
                  </div>
                  <div className="mt-0.5 font-mono text-lg font-semibold leading-none tabular-nums text-foreground">
                    {event.confidenceScore.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <Separator className="mb-5" />

          {/* Two-column evidence body */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* External column */}
            <section className="space-y-3">
              <header className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  External evidence
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  {event.externalMentionCount} mentions · 24h
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  since {event.externalSince}
                </span>
              </header>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Amplifiers engaging</h3>
                <ul className="space-y-1 text-sm">
                  {event.amplifiers.map((a) => (
                    <li key={a.handle} className="flex items-start gap-1.5">
                      <Dot className={cn('h-4 w-4 shrink-0', AMPLIFIER_DOT[a.tone])} />
                      <span>
                        <span className="font-semibold text-foreground">{a.handle}</span>
                        <span className="text-muted-foreground">
                          {' '}· {a.kind} · cred {a.credibility.toFixed(2)} · {a.detail}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Top mentions
                </h3>
                <div className="space-y-2">
                  {event.provenance.map((p, i) => (
                    <ProvenanceCard key={i} item={p} />
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-sm font-semibold">Mention velocity (24h)</h3>
                <div className="flex h-16 items-end gap-1 rounded-md border border-dashed border-border bg-muted/30 p-2">
                  {[2, 3, 4, 4, 6, 8, 9, 11, 10, 9, 8, 7].map((v, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-primary/70"
                      style={{ height: `${(v / 11) * 100}%` }}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">{event.velocityNote}</p>
              </div>
            </section>

            {/* Internal column */}
            <section className="space-y-3">
              <header className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Internal evidence
                </h2>
                <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px]">
                  1 case matched
                </Badge>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {event.internalBindingNote}
                </span>
              </header>

              <InternalCaseCard record={event.internalCase} highlight />
              <CouplingTraceCard event={event} />

              <div className="space-y-2 pt-2">
                <h3 className="text-sm font-semibold">Similar past cases</h3>
                <ul className="space-y-1 text-sm">
                  {event.similarCases.length === 0 && (
                    <li className="text-muted-foreground italic">No similar cases on file</li>
                  )}
                  {event.similarCases.map((c) => (
                    <li key={c.id} className="flex items-start gap-1.5">
                      <Dot
                        className={cn(
                          'h-4 w-4 shrink-0',
                          c.isGolden ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      />
                      <span>
                        <span
                          className={cn(
                            'font-mono font-medium underline-offset-2 hover:underline',
                            c.isGolden ? 'text-destructive' : 'text-primary',
                          )}
                        >
                          {c.id}
                        </span>
                        <span className="text-muted-foreground">
                          {' '}· {c.region} · {c.ageDays}d · {c.outcome}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </main>

        {/* Right-rail MAM spine */}
        <aside className="border-t border-border bg-muted/30 lg:border-l lg:border-t-0">
          <div className="sticky top-0 space-y-4 p-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recommended action
              </div>
              <div className="mt-3 flex items-start gap-3">
                <MAMResponseBadge kind={event.mam.response} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm font-semibold text-foreground leading-tight">
                    {event.mam.action}
                  </div>
                  {event.mam.requiresApproval && (
                    <Badge
                      variant="outline"
                      className="mt-1.5 gap-1 border-amber-500/60 text-amber-700 text-[10px]"
                    >
                      <AlertCircle className="h-3 w-3" />
                      requires approval
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Executor</dt>
                <dd className="text-right font-medium text-foreground">{event.mam.executor}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">SLA</dt>
                <dd className="text-right font-medium text-foreground">{event.mam.slaWindow}</dd>
              </div>
            </dl>

            <div className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">
                Why {event.mam.response.toLowerCase()}:
              </span>{' '}
              {event.mam.rationale}
            </div>

            {/* Primary CTA */}
            <Button size="lg" className="w-full" onClick={() => setExecuteOpen(true)}>
              Execute action
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>

            {/* Secondary CTA — opens drawer */}
            <Button variant="outline" className="w-full" onClick={() => setEvidenceOpen(true)}>
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Investigate
            </Button>

            {/* More actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                  <MoreHorizontal className="mr-1 h-4 w-4" />
                  More actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() =>
                    toast.message('Change response — coming soon', {
                      description: 'Override AVOID with REDUCE / TRANSFER / ACCEPT.',
                    })
                  }
                >
                  Change response class
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    toast.success('Snoozed for 4 hours', {
                      description: 'Event will resurface unless amplifier activity changes.',
                    })
                  }
                >
                  Snooze 4 hours
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEscalateOpen(true)}>
                  Escalate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDismissOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  Dismiss event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>
      </div>

      <ExecuteActionModal open={executeOpen} onOpenChange={setExecuteOpen} event={event} />
      <DismissEventModal open={dismissOpen} onOpenChange={setDismissOpen} event={event} />
      <EscalateEventModal open={escalateOpen} onOpenChange={setEscalateOpen} />

      {/* Evidence drawer */}
      <Sheet open={evidenceOpen} onOpenChange={setEvidenceOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="pr-8">
            <SheetTitle>Why the system flagged this event</SheetTitle>
            <SheetDescription>
              Trust panel — every claim above maps back to a signal here. If you disagree, this is
              where to point.
            </SheetDescription>
            <div className="pt-1">
              <Button asChild variant="link" size="sm" className="h-auto px-0 text-xs">
                <Link to={`/research/risk-lens/${event.id}/evidence`}>
                  Open full page
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </SheetHeader>
          <div className="pt-5">
            <EvidenceContent event={event} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default RiskLensDetail;

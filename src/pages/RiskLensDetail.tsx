import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Dot,
  AlertCircle,
  Clock,
  MoreHorizontal,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SeverityBadge } from '@/components/RiskLens/SeverityBadge';
import { StatusBadge } from '@/components/RiskLens/StatusBadge';
import { MAMResponseBadge } from '@/components/RiskLens/MAMResponseBadge';
import { ProvenanceCard } from '@/components/RiskLens/ProvenanceCard';
import { InternalCaseCard } from '@/components/RiskLens/InternalCaseCard';
import { CouplingTraceCard } from '@/components/RiskLens/CouplingTraceCard';
import { ExecuteActionModal } from '@/components/RiskLens/ExecuteActionModal';
import { DismissEventModal } from '@/components/RiskLens/DismissEventModal';
import { EscalateEventModal } from '@/components/RiskLens/EscalateEventModal';
import { getRiskEvent } from '@/data/riskLensData';

const AMPLIFIER_DOT: Record<'high' | 'med' | 'low', string> = {
  high: 'text-red-500',
  med: 'text-amber-600',
  low: 'text-muted-foreground',
};

const ACTION_TINT: Record<string, { ring: string; bg: string }> = {
  AVOID: { ring: 'border-red-500/40', bg: 'bg-red-500/[0.04]' },
  REDUCE: { ring: 'border-amber-500/40', bg: 'bg-amber-500/[0.04]' },
  TRANSFER: { ring: 'border-primary/40', bg: 'bg-primary/[0.04]' },
  ACCEPT: { ring: 'border-border', bg: 'bg-muted/30' },
};

const RiskLensDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const event = getRiskEvent(eventId);

  const [executeOpen, setExecuteOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);

  if (!event) {
    return <Navigate to="/research/risk-lens/worklist" replace />;
  }

  const priorityTone =
    event.priorityScore >= 0.7 ? 'destructive' : event.priorityScore >= 0.4 ? 'amber' : 'muted';
  const priorityBand =
    event.priorityScore >= 0.7 ? 'TINGGI' : event.priorityScore >= 0.4 ? 'MENENGAH' : 'RENDAH';

  const tint = ACTION_TINT[event.mam.response] ?? ACTION_TINT.ACCEPT;
  const topMentions = event.provenance.slice(0, 2);
  const topVoices = event.amplifiers.slice(0, 3);
  const topSimilar = event.similarCases.slice(0, 3);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-1 -ml-2">
            <Link to="/research/risk-lens/worklist">
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Worklist
            </Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{event.severity} severity</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-muted-foreground">{event.eventType}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-5xl space-y-5 p-6">
          {/* ============ TITLE STRIP ============ */}
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold leading-tight text-foreground">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
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
                  <span className="font-medium text-red-600">voices of reach · aktif</span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <SeverityBadge level={event.severity} />
              <StatusBadge status={event.status} />
              {/* Priority chip with tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      priorityTone === 'destructive' && 'border-red-500/60 bg-red-500/10 text-red-700',
                      priorityTone === 'amber' && 'border-amber-500/60 bg-amber-500/10 text-amber-700',
                      priorityTone === 'muted' && 'border-border text-foreground',
                    )}
                  >
                    <span className="font-mono tabular-nums">
                      {event.priorityScore.toFixed(2)}
                    </span>
                    <span>· {priorityBand}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-left text-xs">
                  <p className="font-semibold">Composite priority · skor 0–1</p>
                  <p className="mt-1 text-muted-foreground">
                    severity {event.severityScore.toFixed(2)} · momentum ↑ {event.momentumPct}% ·
                    confidence {event.confidenceScore.toFixed(2)}
                  </p>
                  <Link
                    to="/research/methodology#composite-priority"
                    className="mt-2 inline-block text-primary hover:underline"
                  >
                    buka metodologi →
                  </Link>
                </TooltipContent>
              </Tooltip>
            </div>
          </header>

          {/* ============ DECISION CARD ============ */}
          <Card className={cn('border-2', tint.ring, tint.bg)}>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-start gap-4">
                <MAMResponseBadge kind={event.mam.response} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tindakan yang direkomendasikan
                  </div>
                  <div className="mt-1 text-lg font-semibold leading-tight text-foreground">
                    {event.mam.actionLabel}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {event.mam.action}
                  </div>
                  {event.mam.requiresApproval && (
                    <Badge
                      variant="outline"
                      className="mt-2 gap-1 border-amber-500/60 bg-amber-500/10 text-amber-700 text-[10px]"
                    >
                      <AlertCircle className="h-3 w-3" />
                      perlu persetujuan
                    </Badge>
                  )}
                </div>

                {/* Executor / SLA — compact, right-aligned */}
                <dl className="space-y-1 text-right text-xs">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Executor
                    </dt>
                    <dd className="font-medium text-foreground">{event.mam.executor}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      SLA
                    </dt>
                    <dd className="font-medium text-foreground">{event.mam.slaWindow}</dd>
                  </div>
                </dl>
              </div>

              {/* Rationale — prominent, not muted */}
              <div className="rounded-md border border-border bg-background p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Why {event.mam.response.toLowerCase()}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {event.mam.rationale}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button size="lg" onClick={() => setExecuteOpen(true)}>
                  Execute action
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="lg">
                      <MoreHorizontal className="mr-1.5 h-4 w-4" />
                      More actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link to={`/research/risk-lens/${event.id}/evidence`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View full evidence
                      </Link>
                    </DropdownMenuItem>
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
                          description:
                            'Event will resurface unless voice-of-reach activity changes.',
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
                      className="text-red-600 focus:text-red-600"
                    >
                      Dismiss event
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* ============ COUPLING LOGIC ============ */}
          <section className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mengapa event ini di-emit
              </h2>
              <Link
                to={`/research/risk-lens/${event.id}/evidence`}
                className="text-[11px] text-primary hover:underline"
              >
                buka bukti lengkap →
              </Link>
            </div>
            <CouplingTraceCard event={event} />
          </section>

          {/* ============ EVIDENCE — 2 cols, compact ============ */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* External */}
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Bukti eksternal
                  </h2>
                  <span className="text-[11px] text-muted-foreground">
                    {event.externalMentionCount} mentions · 24h
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Voices of reach
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {topVoices.map((a) => (
                      <li key={a.handle} className="flex items-start gap-1.5">
                        <Dot className={cn('h-4 w-4 shrink-0', AMPLIFIER_DOT[a.tone])} />
                        <span className="min-w-0">
                          <span className="font-semibold text-foreground">{a.handle}</span>
                          <span className="text-muted-foreground">
                            {' '}· cred {a.credibility.toFixed(2)} · {a.detail}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-1">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Top mentions
                  </h3>
                  <div className="space-y-2">
                    {topMentions.map((p, i) => (
                      <ProvenanceCard key={i} item={p} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Internal */}
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Bukti internal
                  </h2>
                  <Badge
                    variant="outline"
                    className="border-red-500/40 bg-red-500/5 text-red-700 text-[10px]"
                  >
                    1 case matched
                  </Badge>
                </div>

                <InternalCaseCard record={event.internalCase} highlight />

                <div className="space-y-1.5 pt-1">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Similar past cases
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {topSimilar.length === 0 && (
                      <li className="text-muted-foreground italic">No similar cases on file</li>
                    )}
                    {topSimilar.map((c) => (
                      <li key={c.id} className="flex items-start gap-1.5">
                        <Dot
                          className={cn(
                            'h-4 w-4 shrink-0',
                            c.isGolden ? 'text-red-500' : 'text-muted-foreground',
                          )}
                        />
                        <span>
                          <span
                            className={cn(
                              'font-mono font-medium underline-offset-2 hover:underline',
                              c.isGolden ? 'text-red-600' : 'text-primary',
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ExecuteActionModal open={executeOpen} onOpenChange={setExecuteOpen} event={event} />
      <DismissEventModal open={dismissOpen} onOpenChange={setDismissOpen} event={event} />
      <EscalateEventModal open={escalateOpen} onOpenChange={setEscalateOpen} />
    </div>
  );
};

export default RiskLensDetail;

import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, Pause, Eye, Check, Globe, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { WizardStepper } from '@/components/Riset/WizardStepper';
import { DemoModeToggle } from '@/components/Riset/DemoModeToggle';
import { useDemoMode } from '@/hooks/useDemoMode';
import { fetchWebSearch } from '@/services/webSearchService';
import { usePeriod } from '@/hooks/usePeriod';
import type { WebSearchResult } from '@/types/webSearch';
import { getSesi, type ActivityLogLine, type PlanStep } from '@/data/risetData';

const STEPS = [
  { label: 'Konfigurasi' },
  { label: 'Tinjau rencana' },
  { label: 'Berjalan' },
];

type LiveSearchState =
  | { kind: 'idle' }
  | { kind: 'searching'; startedAt: number }
  | { kind: 'done'; result: WebSearchResult; finishedAt: number }
  | { kind: 'error'; message: string };

const SesiRunning = () => {
  const { sesiId } = useParams<{ sesiId: string }>();
  const navigate = useNavigate();
  const sesi = getSesi(sesiId);
  const { isDemoMode } = useDemoMode();
  const { period } = usePeriod();

  const [liveState, setLiveState] = useState<LiveSearchState>({ kind: 'idle' });

  // Fire the live web search exactly once when the user lands here in Live mode.
  // Cancellation flag prevents state updates after unmount.
  useEffect(() => {
    if (isDemoMode || !sesi) return;
    let cancelled = false;
    setLiveState({ kind: 'searching', startedAt: Date.now() });
    const query = `Klaim Jasa Raharja Indonesia: ${sesi.risetName}`.slice(0, 240);
    fetchWebSearch(query, { focus: 'all', maxResults: 12, periodDays: period.days })
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setLiveState({ kind: 'done', result, finishedAt: Date.now() });
          toast.success('Pencarian web selesai', {
            description: `${result.citations.length} sumber ditemukan. Lihat di Briefing.`,
          });
        } else {
          setLiveState({ kind: 'error', message: 'Tidak ada hasil dari pencarian web.' });
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setLiveState({ kind: 'error', message: err.message || 'Pencarian gagal.' });
      });
    return () => {
      cancelled = true;
    };
  }, [isDemoMode, sesi, period.days]);

  if (!sesi || !sesi.runProgress) {
    return <Navigate to="/research" replace />;
  }

  const { runProgress } = sesi;

  return (
    <div className="flex h-[calc(100vh-48px)] flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 pb-5 pt-6">
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-[12px] text-muted-foreground/70">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-auto px-2 py-0.5 text-[12px]">
            <Link to="/research">
              <ChevronLeft className="mr-1 h-3 w-3" />
              Riset
            </Link>
          </Button>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-medium text-foreground">Sesi sedang berjalan</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{sesi.risetName}</h1>
          <span className="font-mono text-[12.5px] text-muted-foreground">
            dimulai {runProgress.startedAt} · {runProgress.elapsedLabel}
          </span>
          <DemoModeToggle size="sm" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-6">
          <WizardStepper steps={STEPS} current={3} />

          {/* Overall progress card */}
          <Card className="mt-7">
            <CardContent className="p-5">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="font-mono text-[30px] font-semibold leading-none tracking-tight text-foreground">
                  {runProgress.overallPct}%
                </span>
                <span className="font-mono text-[13px] text-muted-foreground">
                  step {runProgress.currentStep} dari {runProgress.totalSteps}
                </span>
              </div>
              <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${runProgress.overallPct}%` }}
                />
              </div>
              <p className="font-mono text-[12px] text-muted-foreground">
                Estimasi sisa waktu: {runProgress.etaLabel}
              </p>
            </CardContent>
          </Card>

          {/* Live web-search card — only shown when Demo Mode is OFF */}
          {!isDemoMode && (
            <Card className="mt-4 border-emerald-200/70 bg-emerald-50/30">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-emerald-800">
                    <Globe className="h-3.5 w-3.5" />
                    Pencarian web live · OpenRouter
                  </div>
                  {liveState.kind === 'done' && (
                    <span className="font-mono text-[11px] text-emerald-700">
                      {liveState.result.citations.length} sumber ·{' '}
                      {((liveState.finishedAt - (liveState.result.latencyMs ? Date.now() - liveState.result.latencyMs : liveState.finishedAt)) / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>

                {liveState.kind === 'searching' && (
                  <div className="flex items-center gap-2 text-[12.5px] text-emerald-900/80">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Memanggil <span className="font-mono">openai/gpt-4o-mini-search-preview</span>…
                  </div>
                )}

                {liveState.kind === 'done' && (
                  <div className="space-y-1.5">
                    {liveState.result.citations.slice(0, 5).map((c, i) => (
                      <a
                        key={`${c.url}-${i}`}
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 rounded-md border border-emerald-100 bg-white/80 px-2.5 py-1.5 text-[12px] transition-colors hover:bg-white"
                      >
                        <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-100 font-mono text-[9px] font-semibold text-emerald-800">
                          {i + 1}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate font-medium text-foreground" title={c.title}>
                            {c.title}
                          </span>
                          <span className="block truncate font-mono text-[10.5px] text-muted-foreground">
                            {c.sourceDomain}
                            {c.date ? ` · ${c.date}` : ''}
                          </span>
                        </span>
                        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                      </a>
                    ))}
                    {liveState.result.citations.length > 5 && (
                      <p className="pl-7 text-[11px] text-muted-foreground">
                        +{liveState.result.citations.length - 5} sumber lain akan dimasukkan ke
                        Briefing.
                      </p>
                    )}
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        className="h-7 gap-1.5 text-[12px]"
                        onClick={() =>
                          navigate(`/research/sesi/sesi-2026-05-13-jrsi-claim-health`)
                        }
                      >
                        Lihat Briefing dengan citation live
                      </Button>
                    </div>
                  </div>
                )}

                {liveState.kind === 'error' && (
                  <p className="text-[12px] text-red-700">{liveState.message}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step list */}
          <ul className="mt-4 flex flex-col gap-2.5">
            {runProgress.steps.map((s) => (
              <li key={s.number}>
                <StepRow step={s} />
              </li>
            ))}
          </ul>

          {/* Activity log */}
          <div className="mt-6 rounded-xl bg-[#0F1419] px-5 py-4 font-mono text-[11.5px] leading-relaxed text-slate-200">
            <div className="mb-2.5 border-b border-slate-700/60 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Aktivitas terkini
            </div>
            {runProgress.activityLog.map((line, i) => (
              <ActivityLine key={i} line={line} />
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-2.5 border-t border-border pt-5">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.message('Sesi diinterupsi', {
                  description: 'Sesi dihentikan. Hasil sementara tersimpan.',
                })
              }
            >
              <Pause className="mr-1.5 h-3.5 w-3.5" />
              Interupsi Sesi
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.message('Hasil sementara', {
                  description: '2 step selesai · belum cukup untuk Briefing penuh.',
                })
              }
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Lihat hasil sementara
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

function StepRow({ step }: { step: PlanStep }) {
  return (
    <Card
      className={cn(
        step.state === 'active' && 'border-blue-200 bg-blue-50/40',
        step.state === 'done' && 'opacity-70',
      )}
    >
      <CardContent className="grid grid-cols-[28px_1fr] gap-3.5 p-4">
        <div className="mt-0.5">
          {step.state === 'done' && (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-3 w-3" strokeWidth={2.5} />
            </span>
          )}
          {step.state === 'active' && (
            <span className="block h-[14px] w-[14px] animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          )}
          {step.state === 'pending' && (
            <span className="block h-5 w-5 rounded-full border-[1.5px] border-border bg-card" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[13.5px] font-medium text-foreground">{step.title}</div>
          {step.liveDetail && (
            <div className="mt-1 font-mono text-[12px] leading-relaxed text-muted-foreground">
              {step.liveDetail}
            </div>
          )}
          {step.state === 'active' && step.progressPct !== undefined && (
            <div className="mt-2 h-1 max-w-[220px] overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${step.progressPct}%` }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityLine({ line }: { line: ActivityLogLine }) {
  return (
    <div className="flex gap-3 py-0.5">
      <span className="shrink-0 text-slate-500">{line.time}</span>
      <span>
        {line.parts.map((p, i) => {
          if (p.kind === 'accent')
            return (
              <span key={i} className="text-sky-300">
                {p.text}
              </span>
            );
          if (p.kind === 'good')
            return (
              <span key={i} className="text-emerald-400">
                {p.text}
              </span>
            );
          return <span key={i}>{p.text}</span>;
        })}
      </span>
    </div>
  );
}

export default SesiRunning;

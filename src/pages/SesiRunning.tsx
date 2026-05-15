import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, Pause, Eye, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { WizardStepper } from '@/components/Riset/WizardStepper';
import { getSesi, type ActivityLogLine, type PlanStep } from '@/data/risetData';

const STEPS = [
  { label: 'Konfigurasi' },
  { label: 'Tinjau rencana' },
  { label: 'Berjalan' },
];

const SesiRunning = () => {
  const { sesiId } = useParams<{ sesiId: string }>();
  const sesi = getSesi(sesiId);

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
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-xl font-semibold text-foreground">{sesi.risetName}</h1>
          <span className="font-mono text-[12.5px] text-muted-foreground">
            dimulai {runProgress.startedAt} · {runProgress.elapsedLabel}
          </span>
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

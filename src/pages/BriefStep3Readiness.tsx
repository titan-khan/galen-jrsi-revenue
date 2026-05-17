import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { WizardStepHeader } from '@/components/RiskLens/WizardStepHeader';
import { ReadyRow } from '@/components/RiskLens/ReadyRow';
import {
  READINESS_CHECKS,
  COUPLING_SIGNATURES,
  FORECAST_30D,
  ROUTING_DAY1,
} from '@/data/briefData';

const SIG_TONE: Record<string, string> = {
  destructive: 'border-destructive/60 text-destructive',
  amber: 'border-amber-500/60 text-amber-700',
  default: 'border-border text-muted-foreground',
};

const BriefStep3Readiness = () => {
  const navigate = useNavigate();
  const [startMode, setStartMode] = useState<'shadow' | 'live'>('shadow');
  const [backfill, setBackfill] = useState<'no' | '7d' | '14d'>('7d');

  const handleGoLive = () => {
    toast.success(
      startMode === 'shadow'
        ? 'Monitor mulai shadow run · 48 jam'
        : 'Monitor aktif · routing menyala',
      {
        description: 'Worklist akan mulai terisi begitu sinyal masuk.',
      },
    );
    setTimeout(() => navigate('/research/risk-lens'), 600);
  };

  const primaryLabel =
    startMode === 'shadow' ? 'Mulai shadow run · 48 jam' : 'Aktifkan monitor →';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <WizardStepHeader
        step={3}
        title="Tinjau & aktifkan"
        backHref="/research/monitor/new/sources"
        backLabel="Sumber"
        primaryAction={{ label: primaryLabel, onClick: handleGoLive }}
      />

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1.4fr_360px] gap-0 min-h-0">
        <section className="space-y-5 overflow-auto px-6 py-5">
          <div>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Kesiapan pipeline
            </h2>
            <Card>
              <CardContent className="divide-y divide-border p-4">
                {READINESS_CHECKS.map((c) => (
                  <ReadyRow key={c.label} check={c} />
                ))}
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Coupling signatures aktif
            </h2>
            <Card>
              <CardContent className="space-y-2 p-3">
                {COUPLING_SIGNATURES.map((s) => (
                  <Card key={s.signature} className={cn('p-2.5', SIG_TONE[s.tone])}>
                    <div className="font-mono text-xs font-semibold">{s.signature}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {s.binding}
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Backfill */}
          <Card className="bg-muted/40">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-sm font-semibold">Backfill 7 hari terakhir?</h2>
                <Badge variant="outline">dry run · tanpa tindakan eksekusi</Badge>
                <div className="ml-auto flex gap-1.5">
                  {(['no', '7d', '14d'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBackfill(v)}
                      className={cn(
                        'rounded-full border px-2.5 py-0.5 text-xs',
                        v === backfill
                          ? 'border-foreground bg-background text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {v === 'no' ? 'tidak' : `${v.replace('d', ' hari')}`}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Replay 7 hari terakhir sinyal melalui pipeline supaya worklist tidak kosong hari 1.
                Biaya: <span className="font-semibold text-foreground">≈ $48</span> · waktu jalan{' '}
                <span className="font-semibold text-foreground">≈ 12 menit</span>.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* RIGHT */}
        <aside className="space-y-4 overflow-auto border-t lg:border-t-0 lg:border-l border-dashed border-border bg-muted/30 px-5 py-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Forecast · 30 hari pertama
          </h2>
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <Kpi label="coupling events" value={`~ ${FORECAST_30D.couplingEvents}`} />
              <Kpi
                label="HIGH-priority"
                value={`~ ${FORECAST_30D.highPriority}`}
                tone="amber"
              />
              <Kpi label="est. spend" value={FORECAST_30D.estSpend} tone="emerald" />
            </div>
            <Separator className="my-3" />
            <p className="text-[11px] text-muted-foreground">{FORECAST_30D.note}</p>
          </Card>

          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mode mulai
          </h2>
          <div className="space-y-2">
            {(['shadow', 'live'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setStartMode(m)}
                className={cn(
                  'w-full rounded-md border p-3 text-left transition-shadow hover:shadow-sm',
                  startMode === m ? 'border-foreground bg-background' : 'border-border bg-background',
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2',
                      startMode === m ? 'border-primary' : 'border-border',
                    )}
                  >
                    {startMode === m && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold">
                      {m === 'shadow' ? 'Shadow mode · 48 jam' : 'Live mode'}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {m === 'shadow'
                        ? 'Pipeline berjalan · worklist terisi · TIDAK ada Slack/email keluar. Window evaluasi 48 jam sebelum membuka ke tim.'
                        : 'Routing & notifikasi langsung aktif.'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            <p className="px-1 pt-1 text-[11px] leading-relaxed text-muted-foreground">
              Routing hari pertama:{' '}
              {ROUTING_DAY1.map((r, i) => (
                <span key={r.severity}>
                  <span className="font-semibold text-foreground">{r.severity}</span> → {r.destination}
                  {i < ROUTING_DAY1.length - 1 && ' · '}
                </span>
              ))}
              <span className="mt-1 flex items-start gap-1 text-amber-700">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                auto-execute OFF · semua tindakan MAM perlu persetujuan analis
              </span>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'emerald' | 'amber';
}) {
  return (
    <div>
      <div
        className={cn(
          'text-2xl font-bold tabular-nums leading-none',
          tone === 'amber' && 'text-amber-700',
          tone === 'emerald' && 'text-emerald-700',
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

export default BriefStep3Readiness;

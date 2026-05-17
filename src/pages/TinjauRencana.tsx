import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, Play, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WizardStepper } from '@/components/Riset/WizardStepper';
import { DemoModeToggle } from '@/components/Riset/DemoModeToggle';
import { useDemoMode } from '@/hooks/useDemoMode';
import { CANONICAL_PLAN, type PlanStep } from '@/data/risetData';

const STEPS = [
  { label: 'Konfigurasi' },
  { label: 'Tinjau rencana' },
  { label: 'Jalankan' },
];

const TinjauRencana = () => {
  const navigate = useNavigate();
  const { isDemoMode } = useDemoMode();

  // When Live mode is on, replace the legacy "Newstensity + Determ" step 1 with the
  // actual OpenRouter web-search step that will run during the Sesi.
  const planSteps: PlanStep[] = isDemoMode
    ? CANONICAL_PLAN
    : [
        {
          ...CANONICAL_PLAN[0],
          title: 'Pencarian web live via OpenRouter',
          detailLines: [
            { label: 'sumber:', value: 'OpenAI gpt-4o-mini-search-preview (web search built-in)' },
            { label: 'fokus:', value: 'media berita ID + sosial publik (Twitter/X, Reddit, forum)' },
            { label: 'est. output:', value: '5–15 sumber dengan judul, URL, snippet, tanggal' },
          ],
          estTimeLabel: '~6–10 detik',
        },
        ...CANONICAL_PLAN.slice(1),
      ];

  const handleRun = () => {
    toast.success('Sesi Riset dimulai', {
      description: isDemoMode
        ? 'Anda akan diarahkan ke halaman progress.'
        : 'Memicu pencarian web live — citation akan muncul setelah Sesi selesai.',
    });
    navigate('/research/sesi/sesi-2026-05-13-jrsi-claim-health-adhoc/running');
  };

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
          <Link to="/research/new" className="hover:text-foreground">
            Sesi Riset baru
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-medium text-foreground">Rencana</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Tinjau rencana riset</h1>
          <DemoModeToggle size="sm" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-6">
          <WizardStepper steps={STEPS} current={2} />

          {/* AI intro */}
          <div className="mb-5 mt-7 rounded-xl border border-blue-200/70 bg-blue-50/40 px-5 py-4 text-[13.5px] leading-relaxed text-foreground">
            Berdasarkan fokus{' '}
            <strong className="font-semibold">
              "Periksa eskalasi di Karawang pasca-LBH engagement dan dampak Cipali"
            </strong>
            , Galen akan menjalankan <strong className="font-semibold">5 langkah</strong> di bawah
            ini. Estimasi total ~5 menit. Anda dapat edit setiap langkah atau lanjutkan langsung.
          </div>

          {/* Live mode banner */}
          {!isDemoMode && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/40 px-4 py-3 text-[12.5px] text-emerald-900">
              <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
              <div>
                <div className="font-semibold">Live Mode aktif</div>
                <p className="text-emerald-900/80">
                  Step 1 akan memakai <span className="font-mono">openai/gpt-4o-mini-search-preview</span>{' '}
                  via OpenRouter untuk menarik sumber publik (media + sosial). Citation real akan
                  ditampilkan di Briefing detail begitu Sesi selesai.
                </p>
              </div>
            </div>
          )}

          {/* Plan steps */}
          <ul className="flex flex-col gap-3">
            {planSteps.map((step) => (
              <li key={step.number}>
                <Card>
                  <CardContent className="grid grid-cols-[28px_1fr_auto] gap-4 p-5">
                    <span className="grid h-[26px] w-[26px] place-items-center self-start rounded-full border-[1.5px] border-border bg-card font-mono text-[12px] font-medium text-muted-foreground">
                      {step.number}
                    </span>
                    <div className="min-w-0">
                      <div className="mb-2 text-[14px] font-semibold text-foreground">
                        {step.title}
                      </div>
                      <dl className="space-y-0.5 font-mono text-[12px] leading-relaxed text-muted-foreground">
                        {step.detailLines.map((d) => (
                          <div key={d.label} className="flex gap-1.5">
                            <dt className="text-muted-foreground/70">{d.label}</dt>
                            <dd>{d.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {step.estTimeLabel}
                      </span>
                      <button
                        type="button"
                        className="font-mono text-[11px] text-blue-600 hover:underline"
                        onClick={() =>
                          toast.message('Edit step', {
                            description: 'Step editor — coming soon.',
                          })
                        }
                      >
                        edit
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {/* Summary */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-muted/30 px-5 py-3.5 text-[13px]">
            <span className="text-muted-foreground">Total estimasi waktu:</span>
            <span className="font-mono font-medium text-foreground">~5 menit</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-muted-foreground">Estimasi biaya:</span>
            <span className="font-mono font-medium text-foreground">
              ~$8 LLM compute + provider quota standar
            </span>
          </div>

          {/* Footer */}
          <div className="mt-7 flex items-center justify-between border-t border-border pt-6">
            <Button asChild variant="ghost" size="sm">
              <Link to="/research/new">
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Edit konfigurasi
              </Link>
            </Button>
            <Button onClick={handleRun}>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Jalankan Riset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TinjauRencana;

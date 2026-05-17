import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MentionFeedPanel } from '@/components/Riset/MentionFeedPanel';
import { WebSearchEvidencePanel } from '@/components/Riset/WebSearchEvidencePanel';
import { DemoModeToggle } from '@/components/Riset/DemoModeToggle';
import { BriefingCard } from '@/components/Riset/BriefingCard';
import { useDemoMode } from '@/hooks/useDemoMode';
import { SESIONS, RISET_INFO, subscribePolaStatus } from '@/data/risetData';

const RisetLanding = () => {
  const navigate = useNavigate();
  const { isDemoMode } = useDemoMode();
  const runningSesi = useMemo(() => SESIONS.find((s) => s.status === 'running'), []);
  const completedSesi = useMemo(() => SESIONS.filter((s) => s.status === 'completed'), []);

  const [, force] = useState(0);
  useEffect(() => subscribePolaStatus(() => force((n) => n + 1)), []);

  return (
    <div className="flex h-[calc(100vh-48px)] flex-col">
      {/* Hero header — keeps Spesialis-aligned border-b chrome */}
      <div className="border-b border-border bg-background px-6 pb-5 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">Riset</h1>
              <DemoModeToggle size="sm" />
            </div>
            <p className="mt-1 max-w-[560px] text-[13px] text-muted-foreground/70">
              Investigasi otomatis untuk pola operasional yang penting. Sesi berjalan terjadwal,
              atau mulai investigasi langsung.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-[13px]"
            >
              <Calendar className="h-3.5 w-3.5" />
              Jadwal Riset
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 text-[13px]"
              onClick={() => navigate('/research/new')}
            >
              <Plus className="h-3.5 w-3.5" />
              Mulai Sesi Riset baru
            </Button>
          </div>
        </div>
      </div>

      {/* Body + right panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            {/* Active-Sesi strip */}
            {runningSesi && (
              <Link
                to={`/research/sesi/${runningSesi.id}/running`}
                className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200/70 bg-blue-50/50 px-4 py-3 transition-colors hover:bg-blue-50"
              >
                <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                <div className="min-w-0 flex-1 text-[13px] text-foreground">
                  <span className="font-semibold">{runningSesi.risetName}</span>
                  <span className="text-muted-foreground"> sedang berjalan</span>
                  {runningSesi.runProgress && (
                    <span className="ml-1 font-mono text-[12px] text-muted-foreground">
                      · step {runningSesi.runProgress.currentStep} dari{' '}
                      {runningSesi.runProgress.totalSteps} · {runningSesi.runProgress.etaLabel}{' '}
                      tersisa
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] font-medium text-blue-600">
                  Lihat progress
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            )}

            {/* Briefing card grid (aligned with Spesialis layout) */}
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Briefing terbaru
              </h2>
              <span className="font-mono text-[11.5px] text-muted-foreground/70">
                {completedSesi.length} Briefing · diurutkan dari terbaru
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {completedSesi.map((sesi) => (
                <BriefingCard key={sesi.id} sesi={sesi} />
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="hidden lg:block">
          {isDemoMode ? (
            <MentionFeedPanel />
          ) : (
            <WebSearchEvidencePanel
              query={RISET_INFO.name}
              focus="all"
              scopeLabel="Pencarian live — media + sosial publik"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RisetLanding;

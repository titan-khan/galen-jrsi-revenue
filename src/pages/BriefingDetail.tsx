import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExperimentalBadge } from '@/components/Riset/ExperimentalBadge';
import { SentimentCard } from '@/components/Riset/SentimentCard';
import { TopicsCard } from '@/components/Riset/TopicsCard';
import { PolaListItem } from '@/components/Riset/PolaListItem';
import { LivePolaListItem } from '@/components/Riset/LivePolaListItem';
import { VolumeTimelineCard } from '@/components/Riset/VolumeTimelineCard';
import { MentionFeedPanel } from '@/components/Riset/MentionFeedPanel';
import { WebSearchEvidencePanel } from '@/components/Riset/WebSearchEvidencePanel';
import { DemoModeToggle } from '@/components/Riset/DemoModeToggle';
import { LiveBriefingPanels } from '@/components/Riset/LiveBriefingPanels';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useLiveBriefing } from '@/hooks/useLiveBriefing';
import { usePeriod } from '@/hooks/usePeriod';
import { getSesi, RISET_INFO } from '@/data/risetData';

const BriefingDetail = () => {
  const { sesiId } = useParams<{ sesiId: string }>();
  const sesi = getSesi(sesiId);
  const { isDemoMode } = useDemoMode();
  const { period } = usePeriod();

  // Hooks must run before any early return — derive the live-search query unconditionally.
  // Keep the query SHORT (max ~80 chars) so the search-preview model stays focused on
  // the structured-section task. Long queries with em-dashes/colons consume the model's
  // attention budget and it drops Pola/Rekomendasi from the output.
  // We extract 2-3 key TOKENS (locations / event types) from the first Pola title.
  const liveQuery = useMemo(() => {
    if (!sesi) return '';
    const firstPolaTitle = sesi.pola[0]?.title ?? '';
    // Extract proper-noun keywords (capitalized phrases) from the first Pola title.
    const keywords = (firstPolaTitle.match(/\b[A-Z][\p{L}]+(?:\s+[A-Z][\p{L}]+)?\b/gu) ?? [])
      .filter((k) => k.length >= 4)
      .slice(0, 3);
    const base = 'Klaim Jasa Raharja Indonesia';
    return keywords.length > 0 ? `${base} ${keywords.join(' ')}`.slice(0, 80) : base;
  }, [sesi]);

  // Live web search — single shared call across summary / themes / mix / timeline panels.
  // The WebSearchEvidencePanel on the right rail uses the same query so the cache + dedup
  // collapses both into one network request.
  const live = useLiveBriefing(liveQuery, !isDemoMode, period.days);

  if (!sesi) {
    return <Navigate to="/research" replace />;
  }

  const { summary } = sesi;

  const renderNarrative = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex h-[calc(100vh-48px)] flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 pb-4 pt-5">
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-[12px] text-muted-foreground/70">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-auto px-2 py-0.5 text-[12px]">
            <Link to="/research">
              <ChevronLeft className="mr-1 h-3 w-3" />
              Riset
            </Link>
          </Button>
          <span className="text-muted-foreground/40">/</span>
          <span>{RISET_INFO.name}</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold leading-tight text-foreground">
              Sesi {sesi.date}
              <span className="ml-2 font-mono text-[13px] font-normal text-muted-foreground">
                {sesi.time}
              </span>
            </h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground/70">{sesi.risetName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DemoModeToggle size="sm" />
            <ExperimentalBadge size="md" />
          </div>
        </div>
      </div>

      {/* Content + right-panel mention feed */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-6">
          {isDemoMode ? (
            <>
              {/* Summary block (Demo) */}
              <section className="mb-5 rounded-xl border border-blue-200/70 bg-blue-50/40 px-5 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                  Ringkasan
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/90">
                  {renderNarrative(summary.narrative)}
                </p>
                <div className="mt-3 flex flex-wrap gap-6 border-t border-blue-200/60 pt-3 text-[12px]">
                  <ComparisonStat value={summary.newPolaCount} label="Pola baru minggu ini" />
                  <ComparisonStat
                    value={summary.recurringFromPrevious}
                    label="Sudah muncul Sesi lalu"
                  />
                  <ComparisonStat value={summary.resolvedCount} label="Sudah selesai ditangani" />
                </div>
              </section>

              {/* Methodology toggle */}
              <details className="group mb-6 rounded-xl border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-2.5 text-[12.5px] text-muted-foreground">
                  <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                  <span>Lihat sumber data, versi sistem, dan cakupan investigasi Sesi ini</span>
                </summary>
                <div className="border-t border-border px-5 py-3 text-[12.5px] text-foreground/85">
                  {sesi.methodologyNote}{' '}
                  <Link
                    to="/research/methodology"
                    className="ml-1 text-blue-600 hover:underline"
                  >
                    buka metodologi penuh →
                  </Link>
                </div>
              </details>

              {/* Volume timeline */}
              {sesi.analytics.volumeTimeline && (
                <div className="mb-6">
                  <VolumeTimelineCard timeline={sesi.analytics.volumeTimeline} />
                </div>
              )}

              {/* Analytics */}
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <SentimentCard analytics={sesi.analytics} />
                <TopicsCard analytics={sesi.analytics} sesiId={sesi.id} />
              </div>
            </>
          ) : (
            <>
              {/* Live mode methodology card — clarifies what we DO have */}
              <details className="group mb-5 rounded-xl border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-2.5 text-[12.5px] text-muted-foreground">
                  <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                  <span>
                    Metodologi Live · periode <span className="font-mono text-foreground/80">{period.label}</span>{' '}
                    · query: <span className="font-mono text-foreground/80">"{liveQuery}"</span>
                  </span>
                </summary>
                <div className="border-t border-border px-5 py-3 text-[12.5px] leading-relaxed text-foreground/85">
                  Panel di bawah diisi dari pencarian web live via{' '}
                  <span className="font-mono">openai/gpt-4o-mini-search-preview</span> di OpenRouter,
                  dibatasi {period.label.toLowerCase()}. Setiap citation adalah URL publik yang
                  dikembalikan model — tidak ada konten yang di-hardcode. Sentimen, wilayah, topik,
                  dan pola diturunkan oleh model dari isi citation; timeline dihitung client-side
                  dengan bucket {period.bucket === 'daily' ? 'harian' : period.bucket === 'weekly' ? 'mingguan' : 'bulanan'}.
                  Periode bisa diubah di halaman "Mulai Sesi Riset baru".
                </div>
              </details>

              {/* Live analytics — replaces summary + volume + sentiment + topics */}
              <div className="mb-6">
                <LiveBriefingPanels
                  loading={live.loading}
                  error={live.error}
                  result={live.result}
                  sesiId={sesi.id}
                />
              </div>
            </>
          )}

          {/* Pola list — DEMO uses fixture; LIVE uses Pola derived from web search */}
          {isDemoMode ? (
            <>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pola yang terdeteksi minggu ini
                </h2>
                <span className="text-[11px] text-muted-foreground/60">
                  {sesi.pola.length} pola
                </span>
              </div>

              {sesi.pola.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-[13px] text-muted-foreground">
                  Sesi ini tidak menyimpan rincian Pola (older session · summary only).
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {sesi.pola.map((p) => (
                    <PolaListItem key={p.id} pola={p} sesiId={sesi.id} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pola yang terdeteksi (live · diturunkan dari citation)
                </h2>
                <span className="text-[11px] text-muted-foreground/60">
                  {live.result?.pola?.length ?? 0} pola
                </span>
              </div>

              {live.loading && !live.result ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-[13px] text-muted-foreground">
                  Memuat pola dari pencarian web…
                </div>
              ) : !live.result || live.result.pola.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-[13px] text-muted-foreground">
                  Model tidak mengembalikan klaster Pola untuk query ini. Coba ubah fokus Sesi atau
                  jalankan ulang.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {live.result.pola.map((p) => (
                    <LivePolaListItem
                      key={`live-pola-${p.number}`}
                      pola={p}
                      sesiId={sesi.id}
                      evidenceCount={
                        // Heuristic: model returns N citations + M pola total. Average each
                        // pola is backed by ⌈N/M⌉ citations. Better than showing "0 bukti".
                        Math.max(
                          1,
                          Math.ceil(
                            (live.result?.citations.length ?? 0) /
                              Math.max(1, live.result?.pola.length ?? 1),
                          ),
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        </div>
        <div className="hidden lg:block">
          {isDemoMode ? (
            <MentionFeedPanel
              scopeSesiId={sesi.id}
              scopeLabel={`Hanya menampilkan mention dari Sesi ${sesi.date}`}
            />
          ) : (
            <WebSearchEvidencePanel
              query={liveQuery}
              focus="all"
              scopeLabel={`Pencarian live untuk Sesi ${sesi.date}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

function ComparisonStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[14px] font-semibold text-foreground">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

export default BriefingDetail;

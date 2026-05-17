import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronDown,
  ExternalLink,
  Globe,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfidenceSegments } from '@/components/Riset/ConfidenceSegments';
import { ExperimentalBadge } from '@/components/Riset/ExperimentalBadge';
import { cn } from '@/lib/utils';
import { useLiveBriefing } from '@/hooks/useLiveBriefing';
import { usePeriod } from '@/hooks/usePeriod';
import { useDemoMode } from '@/hooks/useDemoMode';
import { getSesi } from '@/data/risetData';
import type { WebSearchCitation, WebSearchPola } from '@/types/webSearch';

/**
 * Live counterpart to PolaDetail.
 *
 * Layout mirrors the Demo PolaDetail: main column with description / rationale /
 * categorized evidence, plus a right rail with action CTA, Spesialis monitoring
 * config preview, and recommendations.
 */
const LivePolaDetail = () => {
  const { sesiId, polaNumber: polaNumberParam } = useParams<{
    sesiId: string;
    polaNumber: string;
  }>();
  const polaNumber = polaNumberParam ? parseInt(polaNumberParam, 10) : NaN;
  const sesi = getSesi(sesiId);
  const { isDemoMode } = useDemoMode();
  const { period } = usePeriod();

  // MUST match BriefingDetail's query construction so we hit the same cache entry.
  const liveQuery = useMemo(() => {
    if (!sesi) return '';
    const firstPolaTitle = sesi.pola[0]?.title ?? '';
    const keywords = (firstPolaTitle.match(/\b[A-Z][\p{L}]+(?:\s+[A-Z][\p{L}]+)?\b/gu) ?? [])
      .filter((k) => k.length >= 4)
      .slice(0, 3);
    const base = 'Klaim Jasa Raharja Indonesia';
    return keywords.length > 0 ? `${base} ${keywords.join(' ')}`.slice(0, 80) : base;
  }, [sesi]);

  const live = useLiveBriefing(liveQuery, !isDemoMode && Boolean(sesi), period.days);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const pola = live.result?.pola.find((p) => p.number === polaNumber) ?? null;
  const supportingCitations = useMemo(() => {
    if (!pola || !live.result) return [];
    return rankCitationsForPola(pola, live.result.citations);
  }, [pola, live.result]);

  const rationaleFactors = useMemo(() => {
    if (!pola || !live.result || supportingCitations.length === 0) return [];
    return deriveRationale(pola, supportingCitations, live.result);
  }, [pola, live.result, supportingCitations]);

  const spesialisConfig = useMemo(() => {
    if (!pola || !live.result) return null;
    return deriveSpesialisConfig(pola, live.result.regions.map((r) => r.region));
  }, [pola, live.result]);

  const [rationaleOpen, setRationaleOpen] = useState(false);
  const [reviewedState, setReviewedState] = useState<'idle' | 'reviewed' | 'dismissed'>('idle');

  if (!sesi || Number.isNaN(polaNumber)) {
    return <Navigate to="/research" replace />;
  }

  if (isDemoMode) {
    return <Navigate to={`/research/sesi/${sesi.id}`} replace />;
  }

  // Categorize evidence by domain class
  const mediaEvidence = supportingCitations.filter(
    (c) => classifyDomain(c.sourceDomain) === 'media',
  );
  const socialEvidence = supportingCitations.filter(
    (c) => classifyDomain(c.sourceDomain) === 'social',
  );
  const otherEvidence = supportingCitations.filter(
    (c) => classifyDomain(c.sourceDomain) === 'other',
  );

  const handleSpawn = () => {
    if (!pola) return;
    toast.success('Spesialis dibuat (mock)', {
      description: `${pola.title} · konfigurasi disiapkan otomatis dari data Pola Live. Aktifkan di halaman Spesialis.`,
    });
  };

  return (
    <div className="flex h-[calc(100vh-48px)] flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 pb-4 pt-5">
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-[12px] text-muted-foreground/70">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-auto px-2 py-0.5 text-[12px]">
            <Link to={`/research/sesi/${sesi.id}`}>
              <ChevronLeft className="mr-1 h-3 w-3" />
              Sesi {sesi.date}
            </Link>
          </Button>
          <span className="text-muted-foreground/40">/</span>
          <span>Pola Live #{polaNumber}</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Pill>Pola #{polaNumber}</Pill>
              {pola && <Pill>{pola.eventType}</Pill>}
              <Pill tone="emerald">
                <Globe className="mr-1 inline h-3 w-3" />
                Live · {period.label}
              </Pill>
              <ExperimentalBadge />
            </div>
            <h1 className="text-lg font-semibold leading-tight text-foreground">
              {pola?.title ?? (live.loading ? 'Memuat Pola…' : 'Pola tidak ditemukan')}
            </h1>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-6">
          {live.loading && !live.result ? (
            <LoadingState />
          ) : live.error ? (
            <ErrorState message={live.error} />
          ) : !pola ? (
            <NotFoundState polaNumber={polaNumber} />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
              {/* Main column */}
              <main className="min-w-0">
                {/* Meta row */}
                <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-border py-3.5 md:grid-cols-3">
                  <MetaBlock label="Keyakinan">
                    <ConfidenceSegments level={pola.confidence} />
                  </MetaBlock>
                  <MetaBlock label="Jumlah bukti">
                    <span className="text-[12.5px] font-medium text-foreground">
                      {supportingCitations.length} citation pendukung
                    </span>
                  </MetaBlock>
                  <MetaBlock label="Status">
                    <span className="text-[12.5px] font-medium text-foreground">
                      {reviewedState === 'reviewed'
                        ? 'Sudah ditinjau'
                        : reviewedState === 'dismissed'
                        ? 'Diabaikan'
                        : 'Belum ditinjau'}
                    </span>
                  </MetaBlock>
                </div>

                {/* Description */}
                <section className="mb-5">
                  <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Deskripsi
                  </h2>
                  <p className="text-[13.5px] leading-relaxed text-foreground/90">
                    {pola.description}
                  </p>
                </section>

                {/* "Mengapa kami yakin" rationale — collapsible like Demo */}
                {rationaleFactors.length > 0 && (
                  <section className="mb-6">
                    <button
                      type="button"
                      onClick={() => setRationaleOpen((v) => !v)}
                      className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2.5 text-left text-[12.5px] text-muted-foreground transition-colors hover:bg-muted/30"
                    >
                      <ChevronDown
                        className={cn('h-3 w-3 transition-transform', rationaleOpen && 'rotate-180')}
                      />
                      <span>
                        Mengapa kami yakin{' '}
                        <span className="font-semibold capitalize text-foreground">
                          "{pola.confidence}"
                        </span>{' '}
                        — {rationaleFactors.length} faktor pendukung
                      </span>
                    </button>
                    {rationaleOpen && (
                      <div className="mt-2 rounded-md border border-border bg-card px-4 py-3">
                        <ul className="space-y-2">
                          {rationaleFactors.map((f, i) => (
                            <li key={i} className="text-[12.5px] leading-relaxed text-foreground/85">
                              <strong className="font-semibold text-foreground">{f.label}</strong>{' '}
                              — {f.detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}

                {/* Bukti pendukung — categorized */}
                <section className="mb-6">
                  <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Bukti pendukung
                  </h2>

                  <EvidenceGroup
                    label="Dari media berita"
                    citations={mediaEvidence}
                    accent="sky"
                  />
                  <EvidenceGroup
                    label="Dari media sosial publik"
                    citations={socialEvidence}
                    accent="violet"
                  />
                  <EvidenceGroup
                    label="Sumber lainnya"
                    citations={otherEvidence}
                    accent="slate"
                  />

                  {supportingCitations.length === 0 && (
                    <Card>
                      <CardContent className="p-5 text-[13px] text-muted-foreground">
                        Tidak ada citation pendukung yang teridentifikasi untuk Pola ini.
                      </CardContent>
                    </Card>
                  )}
                </section>

                {/* Methodology */}
                <section>
                  <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 text-[12px] leading-relaxed text-amber-900">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-950">
                      <Sparkles className="h-3 w-3" />
                      Metodologi
                    </div>
                    <p>
                      Pola di-cluster oleh{' '}
                      <span className="font-mono">openai/gpt-4o-mini-search-preview</span> dari{' '}
                      {live.result?.citations.length ?? 0} citation publik (periode{' '}
                      {period.label.toLowerCase()}). Tipe event di-pilih dari taxonomy terkontrol;
                      MECE diberlakukan (1 Pola = 1 tipe unik). Bukti pendukung di atas di-rank
                      client-side dgn token overlap antara deskripsi Pola vs judul + snippet
                      citation.
                    </p>
                  </div>
                </section>
              </main>

              {/* Right rail */}
              <aside className="flex flex-col gap-4">
                {/* TINDAKAN block — dark, prominent */}
                <Card className="border-slate-800 bg-slate-900 text-slate-100">
                  <CardContent className="p-5">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Tindakan
                    </div>
                    <p className="mb-3 text-[12.5px] leading-relaxed text-slate-200">
                      Buat Spesialis untuk memantau pola ini secara terus-menerus. Konfigurasinya
                      sudah disiapkan otomatis dari data Pola ini.
                    </p>
                    <Button
                      onClick={handleSpawn}
                      className="mb-2 w-full justify-center bg-white text-slate-900 hover:bg-slate-100"
                    >
                      Buat Spesialis dari pola ini
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewedState('reviewed')}
                        className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-slate-100"
                      >
                        Tandai ditinjau
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewedState('dismissed')}
                        className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-slate-100"
                      >
                        Abaikan
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* YANG AKAN DIPANTAU SPESIALIS */}
                {spesialisConfig && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Yang akan dipantau Spesialis
                      </div>
                      <dl className="space-y-3 text-[12.5px]">
                        <ConfigField label="Entitas">
                          <ul className="list-inside list-disc space-y-0.5 text-foreground">
                            {spesialisConfig.entitas.map((e, i) => (
                              <li key={i}>{e}</li>
                            ))}
                          </ul>
                        </ConfigField>
                        <ConfigField label="Wilayah">
                          <span className="font-mono text-foreground">
                            {spesialisConfig.wilayah}
                          </span>
                        </ConfigField>
                        <ConfigField label="Jenis risiko">
                          <span className="font-mono text-foreground">
                            {spesialisConfig.jenisRisiko}
                          </span>
                        </ConfigField>
                        <ConfigField label="Kapan beri peringatan">
                          <span className="font-mono text-foreground">{spesialisConfig.trigger}</span>
                        </ConfigField>
                      </dl>
                    </CardContent>
                  </Card>
                )}

                {/* REKOMENDASI TINDAKAN */}
                {pola.recommendations && pola.recommendations.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Rekomendasi tindakan
                      </div>
                      <ul className="space-y-3">
                        {pola.recommendations.map((r, i) => (
                          <li key={i} className="text-[12.5px]">
                            <div className="font-semibold text-blue-700">{r.title}</div>
                            <p className="mt-0.5 leading-snug text-muted-foreground">
                              {r.description}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Helpers
// =============================================================================

const MEDIA_DOMAINS = new Set([
  'kompas.com', 'money.kompas.com', 'nasional.kompas.com', 'regional.kompas.com',
  'otomotif.kompas.com', 'kilasbumn.kompas.com', 'detik.com', 'news.detik.com',
  'tempo.co', 'cnnindonesia.com', 'cnbcindonesia.com', 'bisnis.com', 'kontan.co.id',
  'antaranews.com', 'megapolitan.antaranews.com', 'jatim.antaranews.com',
  'tribunnews.com', 'mediaindonesia.com', 'liputan6.com', 'republika.co.id',
  'merdeka.com', 'okezone.com', 'viva.co.id', 'radarkarawang.id', 'beritasampit.com',
  'news.ddtc.co.id', 'jakartaterkini.id', 'balanganews.com', 'jabar.idntimes.com',
  'idntimes.com', 'suara.com', 'rctiplus.com',
]);

const SOCIAL_DOMAINS = new Set([
  'twitter.com', 'x.com', 'reddit.com', 'youtube.com', 'facebook.com',
  'tiktok.com', 'instagram.com', 'threads.net', 'kaskus.co.id',
]);

function classifyDomain(domain: string): 'media' | 'social' | 'other' {
  if (MEDIA_DOMAINS.has(domain)) return 'media';
  if (SOCIAL_DOMAINS.has(domain)) return 'social';
  if (/news|berita|media|tribun|detik|kompas|antara|republika|tempo/i.test(domain)) return 'media';
  if (/twitter|x\.com|reddit|youtube|facebook|tiktok|instagram/i.test(domain)) return 'social';
  return 'other';
}

function rankCitationsForPola(
  pola: WebSearchPola,
  citations: WebSearchCitation[],
): WebSearchCitation[] {
  const polaTokens = tokenize(`${pola.title} ${pola.description} ${pola.eventType}`);
  if (polaTokens.size === 0) return citations.slice(0, 3); // fallback: first 3

  const scored = citations.map((c) => {
    const cTokens = tokenize(`${c.title} ${c.snippet} ${c.sourceDomain}`);
    let overlap = 0;
    for (const t of cTokens) if (polaTokens.has(t)) overlap++;
    return { citation: c, overlap };
  });

  const matched = scored.filter((s) => s.overlap >= 1).sort((a, b) => b.overlap - a.overlap);
  return matched.length > 0 ? matched.map((s) => s.citation) : citations.slice(0, 2);
}

const STOP_WORDS = new Set([
  'yang', 'dan', 'di', 'dari', 'untuk', 'pada', 'ke', 'oleh', 'dengan', 'akan',
  'ada', 'itu', 'ini', 'adalah', 'atau', 'juga', 'dapat', 'sebagai', 'tidak',
  'jasa', 'raharja', 'klaim', 'santunan', 'kecelakaan',
  'the', 'and', 'of', 'to', 'a', 'in', 'is', 'for', 'on', 'with',
]);

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

interface RationaleFactor {
  label: string;
  detail: string;
}

function deriveRationale(
  pola: WebSearchPola,
  citations: WebSearchCitation[],
  result: { citations: WebSearchCitation[] },
): RationaleFactor[] {
  const factors: RationaleFactor[] = [];

  // Factor 1: citation count vs total
  const ratio = result.citations.length > 0 ? citations.length / result.citations.length : 0;
  factors.push({
    label: 'Cakupan citation',
    detail: `${citations.length} dari ${result.citations.length} citation di Sesi ini cocok dengan Pola — ${
      ratio >= 0.5 ? 'dominan' : ratio >= 0.25 ? 'signifikan' : 'sebagian kecil'
    }.`,
  });

  // Factor 2: source diversity
  const uniqueDomains = new Set(citations.map((c) => c.sourceDomain));
  if (uniqueDomains.size >= 2) {
    factors.push({
      label: 'Diversifikasi sumber',
      detail: `Pola didukung oleh ${uniqueDomains.size} domain berbeda — bukan satu outlet tunggal.`,
    });
  }

  // Factor 3: recency
  const dates = citations.map((c) => c.date).filter((d): d is string => Boolean(d));
  if (dates.length > 0) {
    const latest = dates.sort().reverse()[0];
    factors.push({
      label: 'Aktualitas',
      detail: `Citation terbaru bertanggal ${latest} — pola masih relevan/aktual.`,
    });
  }

  return factors;
}

interface SpesialisConfig {
  entitas: string[];
  wilayah: string;
  jenisRisiko: string;
  trigger: string;
}

const EVENT_TYPE_TO_RISK: Record<string, string> = {
  'insiden korban massal': 'Lonjakan klaim insiden massal',
  'keterlambatan proses klaim': 'Eskalasi keterlambatan klaim',
  'kritik publik': 'Risiko reputasi & viral negatif',
  'kebijakan/regulasi': 'Perubahan kebijakan regulator',
  'edukasi publik': 'Gap pemahaman publik prosedur klaim',
  'anomali wilayah': 'Lonjakan tidak biasa per-wilayah',
  'inovasi layanan': 'Inovasi layanan / program baru',
};

const EVENT_TYPE_TO_TRIGGER: Record<string, string> = {
  'insiden korban massal': 'Volume klaim koridor naik > 30%\nWindow 30 hari sejak insiden',
  'keterlambatan proses klaim': 'Rata-rata umur klaim > 90 hari\n3+ klaim viral di sosial',
  'kritik publik': 'Mention negatif > 100/hari\nLBH/jurnalis amplifier terlibat',
  'kebijakan/regulasi': 'Regulator publish update\nWindow 7 hari respon',
  'edukasi publik': 'Spike pertanyaan publik di kanal resmi\nWindow 14 hari',
  'anomali wilayah': 'Klaim wilayah X naik > 50% vs baseline\nWindow 30 hari',
  'inovasi layanan': 'Uptake program < target\nWindow 60 hari sejak launch',
};

function deriveSpesialisConfig(pola: WebSearchPola, regionsFromResult: string[]): SpesialisConfig {
  const typeLower = pola.eventType.toLowerCase();

  // Entitas: derive from title keywords (capitalized words, "Cabang X", "POLRI", etc.)
  const titleEntities = extractCapitalizedPhrases(pola.title + ' ' + pola.description);
  const entitas = titleEntities.length > 0 ? titleEntities.slice(0, 3) : ['Jasa Raharja Pusat'];

  // Wilayah: prefer regions from result, else extract from description
  const wilayah =
    regionsFromResult.length > 0
      ? regionsFromResult.slice(0, 2).join(', ')
      : extractCapitalizedPhrases(pola.description).slice(0, 2).join(', ') || 'Nasional';

  return {
    entitas,
    wilayah,
    jenisRisiko: EVENT_TYPE_TO_RISK[typeLower] ?? pola.eventType,
    trigger: EVENT_TYPE_TO_TRIGGER[typeLower] ?? 'Volume klaim naik > 30%\nWindow 30 hari',
  };
}

function extractCapitalizedPhrases(text: string): string[] {
  // Find sequences of capitalized words (proper nouns + entities), e.g. "Cabang JR Subang",
  // "Tol Cipali", "Korlantas POLRI". Skip single-word matches that are common words.
  const pattern = /\b[A-Z][\p{L}]+(?:\s+[A-Z][\p{L}]+){0,3}\b/gu;
  const matches = text.match(pattern) ?? [];
  // Dedup + skip single-word + skip common starts
  const seen = new Set<string>();
  const result: string[] = [];
  const SKIP_SINGLE = new Set(['Pola', 'Sesi', 'Live', 'Pada', 'Untuk', 'Setiap', 'Dari', 'Dalam']);
  for (const m of matches) {
    if (m.split(/\s+/).length === 1 && (SKIP_SINGLE.has(m) || m.length < 5)) continue;
    const key = m.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(m);
  }
  return result;
}

// =============================================================================
// Sub-components
// =============================================================================

function EvidenceGroup({
  label,
  citations,
  accent,
}: {
  label: string;
  citations: WebSearchCitation[];
  accent: 'sky' | 'violet' | 'slate';
}) {
  if (citations.length === 0) return null;
  const accentColors = {
    sky: 'border-l-sky-500',
    violet: 'border-l-violet-500',
    slate: 'border-l-slate-400',
  } as const;
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-baseline gap-2 text-[12px]">
        <span className="font-medium text-foreground/90">{label}</span>
        <span className="font-mono text-[11px] text-muted-foreground">{citations.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {citations.map((c, i) => (
          <a
            key={`${c.url}-${i}`}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'block rounded-md border border-l-[3px] border-border bg-card p-3 transition-colors hover:bg-accent/30',
              accentColors[accent],
            )}
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-foreground" title={c.title}>
                  {c.title}
                </div>
                <div className="truncate font-mono text-[10.5px] text-muted-foreground">
                  {c.sourceDomain}
                  {c.date ? ` · ${c.date}` : ''}
                </div>
              </div>
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
            </div>
            <p className="line-clamp-2 text-[11.5px] leading-snug text-muted-foreground/85">
              {c.snippet}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

function MetaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ConfigField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="mb-1 text-[10.5px] font-medium text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-line text-[12px] text-foreground/90">{children}</dd>
    </div>
  );
}

function Pill({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'emerald' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10.5px] font-medium',
        tone === 'emerald'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-border bg-muted/40 text-muted-foreground',
      )}
    >
      {children}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-1/2" />
      <div className="grid grid-cols-3 gap-3 border-y border-border py-3.5">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-red-200 bg-red-50/40">
      <CardContent className="flex items-start gap-2 p-4 text-[12.5px] text-red-700">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div>
          <div className="font-semibold">Pola tidak dapat dimuat</div>
          <p className="mt-0.5 text-red-600/80">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function NotFoundState({ polaNumber }: { polaNumber: number }) {
  return (
    <Card className="border-amber-200/70 bg-amber-50/40">
      <CardContent className="p-5">
        <div className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber-950">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Pola #{polaNumber} tidak ditemukan di hasil live
        </div>
        <p className="text-[12.5px] leading-relaxed text-amber-900/85">
          Live web search untuk Sesi ini tidak (atau belum) mengembalikan Pola dengan nomor
          tersebut. Coba kembali ke halaman Briefing Sesi — Pola akan ter-render ulang dari hasil
          terkini, mungkin dengan numbering yang berbeda.
        </p>
      </CardContent>
    </Card>
  );
}

export default LivePolaDetail;

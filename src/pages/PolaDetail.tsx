import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, ArrowRight, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfidenceSegments } from '@/components/Riset/ConfidenceSegments';
import { ExperimentalBadge } from '@/components/Riset/ExperimentalBadge';
import { SpawnModal } from '@/components/Riset/SpawnModal';
import { cn } from '@/lib/utils';
import {
  getPola,
  getSesi,
  getEffectivePolaStatus,
  getSpawnedHandle,
  setPolaStatus,
  subscribePolaStatus,
  type PolaEvidence,
} from '@/data/risetData';

const PolaDetail = () => {
  const { sesiId, polaId } = useParams<{ sesiId: string; polaId: string }>();
  const sesi = getSesi(sesiId);
  const pola = sesiId && polaId ? getPola(sesiId, polaId) : undefined;

  const [, force] = useState(0);
  useEffect(() => subscribePolaStatus(() => force((n) => n + 1)), []);

  const [spawnOpen, setSpawnOpen] = useState(false);
  const [rationaleOpen, setRationaleOpen] = useState(false);

  if (!sesi || !pola) {
    return <Navigate to="/research" replace />;
  }

  const effectiveStatus = getEffectivePolaStatus(pola);
  const spawned = effectiveStatus === 'spawned';
  const handle = getSpawnedHandle(pola);

  const renderDescription = (text: string) => {
    return text.split('\n\n').map((para, i) => {
      const parts = para.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p
          key={i}
          className={cn('text-[13.5px] leading-relaxed text-foreground/90', i > 0 && 'mt-2.5')}
        >
          {parts.map((p, j) =>
            p.startsWith('**') && p.endsWith('**') ? (
              <strong key={j} className="font-semibold text-foreground">
                {p.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{p}</span>
            ),
          )}
        </p>
      );
    });
  };

  const evidenceByType = {
    coupling: pola.evidence.filter((e) => e.type === 'coupling'),
    external: pola.evidence.filter((e) => e.type === 'external'),
    internal: pola.evidence.filter((e) => e.type === 'internal'),
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
          <span>Pola #{pola.number}</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Pill>Pola #{pola.number}</Pill>
              <Pill>{pola.eventType}</Pill>
              <ExperimentalBadge />
            </div>
            <h1 className="text-lg font-semibold leading-tight text-foreground">{pola.title}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            {/* MAIN */}
            <main className="min-w-0">
              {/* Meta row */}
              <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-border py-3.5 md:grid-cols-4">
                <MetaBlock label="Keyakinan">
                  <ConfidenceSegments level={pola.confidence} />
                </MetaBlock>
                {pola.couplingStrength !== undefined && (
                  <MetaBlock label="Kekuatan kaitan">
                    <span className="text-[12.5px] font-medium text-foreground">
                      {pola.couplingStrength.toFixed(2)} (
                      {pola.couplingStrength >= 0.7
                        ? 'kuat'
                        : pola.couplingStrength >= 0.4
                        ? 'sedang'
                        : 'lemah'}
                      )
                    </span>
                  </MetaBlock>
                )}
                <MetaBlock label="Status">
                  <span className="text-[12.5px] font-medium text-foreground">
                    {effectiveStatus === 'baru' && 'Belum ditinjau'}
                    {effectiveStatus === 'direview' && 'Sudah ditinjau'}
                    {effectiveStatus === 'spawned' && (
                      <>
                        Sudah jadi Spesialis
                        {handle && (
                          <span className="ml-1 font-mono text-[11.5px] text-blue-600">
                            · {handle}
                          </span>
                        )}
                      </>
                    )}
                    {effectiveStatus === 'diabaikan' && 'Diabaikan'}
                  </span>
                </MetaBlock>
                {pola.previousSesi && (
                  <MetaBlock label="Sebelumnya muncul">
                    <span className="text-[12.5px] font-medium text-foreground">
                      {pola.previousSesi}
                    </span>
                  </MetaBlock>
                )}
              </div>

              {/* Description */}
              <SectionHeader>Deskripsi</SectionHeader>
              <div>{renderDescription(pola.description)}</div>

              {/* Rationale */}
              {pola.rationaleFactors && pola.rationaleFactors.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setRationaleOpen((o) => !o)}
                    className="mt-3 flex w-full items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5 text-left text-[12.5px] text-muted-foreground hover:bg-muted/50"
                  >
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 transition-transform',
                        rationaleOpen && 'rotate-180',
                      )}
                    />
                    Mengapa kami yakin "
                    {pola.confidence === 'tinggi'
                      ? 'Tinggi'
                      : pola.confidence === 'sedang'
                      ? 'Sedang'
                      : 'Rendah'}
                    " — {pola.rationaleFactors.length} faktor pendukung
                  </button>
                  {rationaleOpen && (
                    <ul className="mt-2 space-y-1.5 rounded-md border border-border bg-card px-4 py-3">
                      {pola.rationaleFactors.map((f) => (
                        <li key={f.label} className="text-[12.5px]">
                          <span className="font-medium text-foreground">{f.label}</span>
                          <span className="text-muted-foreground"> · {f.detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {/* Evidence */}
              <SectionHeader>Bukti pendukung</SectionHeader>

              {evidenceByType.coupling.length > 0 && (
                <EvidenceGroup
                  label="Kaitan internal & eksternal"
                  count={evidenceByType.coupling.length}
                >
                  {evidenceByType.coupling.map((e) => (
                    <CouplingEvidence key={e.id} evidence={e} />
                  ))}
                </EvidenceGroup>
              )}

              {evidenceByType.external.length > 0 && (
                <EvidenceGroup
                  label="Dari media sosial & berita"
                  count={evidenceByType.external.length}
                >
                  {evidenceByType.external.map((e) => (
                    <ExternalEvidence key={e.id} evidence={e} />
                  ))}
                </EvidenceGroup>
              )}

              {evidenceByType.internal.length > 0 && (
                <EvidenceGroup
                  label="Dari data klaim internal"
                  count={evidenceByType.internal.length}
                >
                  {evidenceByType.internal.map((e) => (
                    <InternalEvidence key={e.id} evidence={e} />
                  ))}
                </EvidenceGroup>
              )}

              {pola.evidence.length === 0 && (
                <p className="rounded-md border border-dashed border-border bg-card p-4 text-[12.5px] text-muted-foreground">
                  Bukti detail tidak disimpan untuk pola ini.
                </p>
              )}
            </main>

            {/* SIDEBAR */}
            <aside className="lg:sticky lg:top-6 lg:self-start">
              {/* CTA card */}
              <Card className="mb-3 border-foreground bg-foreground text-background">
                <CardContent className="space-y-3 p-5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-background/60">
                    Tindakan
                  </div>
                  {spawned ? (
                    <>
                      <p className="text-[12.5px] leading-snug text-background/80">
                        Pola ini sudah menjadi Spesialis. Buka untuk meninjau konfigurasi atau
                        aktifkan dari halaman Spesialis.
                      </p>
                      <Button
                        asChild
                        size="sm"
                        className="w-full bg-background text-foreground hover:bg-background/90"
                      >
                        <Link to="/specialists">
                          Buka Spesialis
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-[12.5px] leading-snug text-background/80">
                        Buat Spesialis untuk memantau pola ini secara terus-menerus. Konfigurasinya
                        sudah disiapkan otomatis dari data Pola ini.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setSpawnOpen(true)}
                        className="w-full bg-background text-foreground hover:bg-background/90"
                      >
                        Buat Spesialis dari pola ini
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-background/20 bg-transparent text-[11px] text-background/80 hover:bg-background/10 hover:text-background"
                          onClick={() => {
                            setPolaStatus(pola.id, 'direview');
                            toast.success('Ditandai sudah ditinjau');
                          }}
                        >
                          Tandai ditinjau
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-background/20 bg-transparent text-[11px] text-background/80 hover:bg-background/10 hover:text-background"
                          onClick={() => {
                            setPolaStatus(pola.id, 'diabaikan');
                            toast.message('Pola diabaikan');
                          }}
                        >
                          Abaikan
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Scope */}
              <Card className="mb-3">
                <CardContent className="space-y-2.5 p-5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Yang akan dipantau Spesialis
                  </div>
                  <ScopeItem label="Entitas">
                    <div className="flex flex-col gap-0.5">
                      {pola.scope.entitas.map((e) => (
                        <span key={e}>• {e}</span>
                      ))}
                    </div>
                  </ScopeItem>
                  <ScopeItem label="Wilayah">{pola.scope.wilayah}</ScopeItem>
                  <ScopeItem label="Jenis risiko">{pola.scope.jenisRisiko}</ScopeItem>
                  <ScopeItem label="Kapan beri peringatan">
                    {pola.scope.triggers.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {pola.scope.triggers.map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                      </div>
                    )}
                  </ScopeItem>
                </CardContent>
              </Card>

              {/* Response classes */}
              {pola.responseClasses.length > 0 && (
                <Card>
                  <CardContent className="space-y-2 p-5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Rekomendasi tindakan
                    </div>
                    <ul className="space-y-1.5">
                      {pola.responseClasses.map((r) => (
                        <li
                          key={r.name}
                          className="rounded-md border border-border bg-muted/30 px-3 py-2"
                        >
                          <div className="text-[11.5px] font-medium text-blue-700">
                            {r.name}
                          </div>
                          <div className="mt-0.5 text-[10.5px] text-muted-foreground">
                            {r.description}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </div>

      <SpawnModal open={spawnOpen} onOpenChange={setSpawnOpen} pola={pola} />
    </div>
  );
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 font-mono text-[10.5px] text-muted-foreground">
      {children}
    </span>
  );
}

function MetaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <span>{children}</span>
    </div>
  );
}

function ScopeItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-[12px] leading-snug">
      <div className="text-[10.5px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-[11.5px] text-foreground">{children}</div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
      {children}
    </h2>
  );
}

function EvidenceGroup({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-muted-foreground/80">
        <span>{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground/60">{count}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CouplingEvidence({ evidence }: { evidence: PolaEvidence }) {
  return (
    <div className="rounded-md border border-blue-200/70 bg-blue-50/40 px-3.5 py-2.5">
      <div className="text-[12.5px] leading-relaxed text-foreground/90">{evidence.excerpt}</div>
      <div className="mt-2 flex items-center justify-between font-mono text-[10.5px]">
        <span className="text-muted-foreground/70">{evidence.couplingStrengthLabel}</span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground/70">
          <span className="block h-0.5 w-[28px] overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full bg-slate-900"
              style={{ width: `${(evidence.credibility ?? 0) * 100}%` }}
            />
          </span>
          <span className="text-foreground">{evidence.credibilityLabel}</span>
        </span>
      </div>
    </div>
  );
}

function ExternalEvidence({ evidence }: { evidence: PolaEvidence }) {
  const hasMetrics =
    evidence.reach !== undefined ||
    evidence.interactions !== undefined ||
    evidence.influence !== undefined;
  return (
    <div className="rounded-md border border-border bg-card px-3.5 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-medium text-foreground">{evidence.source}</span>
        <span className="font-mono text-[10.5px] text-muted-foreground/70">
          {evidence.timestamp}
        </span>
      </div>
      {evidence.excerpt && (
        <p className="mt-1.5 text-[12.5px] italic leading-snug text-muted-foreground">
          "{evidence.excerpt}"
        </p>
      )}
      {hasMetrics && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-dashed border-border py-1.5 font-mono text-[10.5px] text-muted-foreground/70">
          {evidence.reach !== undefined && (
            <span>
              Jangkauan{' '}
              <span className="font-medium text-foreground">
                {evidence.reach.toLocaleString('id-ID')}
              </span>
            </span>
          )}
          {evidence.interactions !== undefined && (
            <span>
              Interaksi{' '}
              <span className="font-medium text-foreground">
                {evidence.interactions.toLocaleString('id-ID')}
              </span>
            </span>
          )}
          {evidence.influence !== undefined && (
            <span>
              Pengaruh{' '}
              <span className="font-medium text-foreground">{evidence.influence}/10</span>
            </span>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between font-mono text-[10.5px] text-muted-foreground/70">
        <span className="inline-flex items-center gap-1.5">
          Kredibilitas
          <span className="block h-0.5 w-[28px] overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full bg-slate-900"
              style={{ width: `${(evidence.credibility ?? 0) * 100}%` }}
            />
          </span>
          <span className="text-foreground">{evidence.credibilityLabel}</span>
        </span>
        {evidence.link && (
          <a
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
            href={evidence.link}
          >
            <ExternalLink className="h-2.5 w-2.5" /> Lihat sumber
          </a>
        )}
      </div>
    </div>
  );
}

function InternalEvidence({ evidence }: { evidence: PolaEvidence }) {
  return (
    <div className="rounded-md border border-border bg-card px-3.5 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-medium text-foreground">{evidence.source}</span>
        <span className="font-mono text-[10.5px] text-muted-foreground/70">
          {evidence.timestamp}
        </span>
      </div>
      {evidence.internalRows && (
        <div className="mt-1.5 space-y-0.5 font-mono text-[11.5px] text-muted-foreground/80">
          {evidence.internalRows.map((r) => (
            <div key={r.key}>
              {r.key}: <span className="font-medium text-foreground">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PolaDetail;

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Check,
  AlertTriangle,
  X as XIcon,
  Sparkles,
  GitCompare,
  ChevronLeft,
  Loader2,
  Pencil,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { WizardStepHeader } from '@/components/RiskLens/WizardStepHeader';
import { FieldGroup } from '@/components/RiskLens/FieldGroup';
import {
  BRIEF_DEFAULT_TEXT,
  BRIEF_TEMPLATES,
  BRIEF_EXTRACTED,
  BRIEF_TENANT,
  INTERNAL_SYSTEMS,
  BRIEF_SAMPLE_MATCHES,
  BRIEF_PREVIEW,
  PROMOTED_BRIEFS,
} from '@/data/briefData';

const SYSTEM_ICON = {
  ok: { icon: Check, color: 'text-emerald-600' },
  partial: { icon: AlertTriangle, color: 'text-amber-600' },
  missing: { icon: XIcon, color: 'text-muted-foreground' },
} as const;

const SAMPLE_TONE = {
  destructive: 'border-destructive/60',
  amber: 'border-amber-500/60',
  primary: 'border-primary/60',
  emerald: 'border-emerald-500/60',
  default: 'border-border',
} as const;

const BriefStep1Intent = () => {
  const [params] = useSearchParams();
  const fromThread = params.get('from');
  const promoted = fromThread ? PROMOTED_BRIEFS[fromThread] : undefined;
  const [text, setText] = useState(promoted?.text ?? BRIEF_DEFAULT_TEXT);
  const [researched, setResearched] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  // After "Mulai riset", run a short "scanning" phase before revealing context.
  useEffect(() => {
    if (researched && scanning) {
      const t = setTimeout(() => setScanning(false), 1400);
      return () => clearTimeout(t);
    }
  }, [researched, scanning]);

  const handleStart = () => {
    if (text.trim().length < 20) {
      toast.message('Brief terlalu pendek', {
        description: 'Tulis minimal 1 paragraf agar Galen bisa ekstraksi entitas.',
      });
      return;
    }
    setResearched(true);
    setScanning(true);
    setEditing(false);
  };

  // ============================================================
  // STAGE 1 — Brief composer (initial)
  // ============================================================
  if (!researched) {
    return (
      <div className="flex flex-1 flex-col overflow-auto">
        <div className="px-6 py-3 text-xs">
          <Button asChild variant="ghost" size="sm" className="h-auto -ml-2 px-2 py-1">
            <Link to="/research">
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Research
            </Link>
          </Button>
        </div>

        <div className="mx-auto w-full max-w-3xl flex-1 px-6 pb-10 pt-4">
          <header className="mb-6 space-y-1.5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Brief monitor baru
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-foreground">
              Apa yang ingin Anda pantau?
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Tulis dalam bahasa bebas — Bahasa Indonesia atau English. Galen akan parse intent,
              cari internal systems yang relevan, dan tampilkan preview sinyal sebelum monitor
              berjalan.
            </p>
          </header>

          {promoted && (
            <Alert className="mb-4 border-primary/40 bg-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs">
                Pre-fill dari investigation{' '}
                <span className="font-semibold text-foreground">{promoted.sourceTitle}</span>.
                Edit sebelum mulai riset jika perlu.
              </AlertDescription>
            </Alert>
          )}

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[180px] bg-background text-base leading-relaxed"
            placeholder="Contoh: Pantau keluhan publik soal santunan Jasa Raharja yang lambat atau ditolak — terutama di X, TikTok, dan media regional. Fokus ke kasus dengan nomor klaim atau lokasi spesifik..."
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
              Bahasa Indonesia
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {text.length} / 500 char
            </Badge>
          </div>

          <div className="mt-5 border-t border-dashed border-border pt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Template
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BRIEF_TEMPLATES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-end gap-2">
            <span className="mr-auto text-[11px] text-muted-foreground">
              Galen akan ekstraksi entitas + cari internal systems. Belum ada monitor yang dibuat.
            </span>
            <Button size="lg" onClick={handleStart} className="gap-2">
              Mulai riset
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STAGE 2 — Researched (extraction + Galen-discovered context)
  // ============================================================
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <WizardStepHeader
        step={1}
        title="Brief · hasil riset"
        backHref="/research"
        backLabel="Research"
        nextHref="/research/monitor/new/sources"
      />

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1.4fr_360px] gap-0 min-h-0">
        {/* LEFT — collapsed brief + extracted fields */}
        <section className="space-y-4 overflow-auto px-6 py-5">
          {/* Collapsed brief summary */}
          <Card className="bg-muted/40">
            <CardContent className="p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Brief Anda
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setEditing((e) => !e)}
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  {editing ? 'Tutup edit' : 'Edit brief'}
                </Button>
              </div>
              {editing ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="min-h-[120px] bg-background text-sm leading-relaxed"
                  />
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {text.length} / 500 char
                    </Badge>
                    <Button
                      variant="link"
                      size="sm"
                      className="ml-auto h-auto p-0 text-xs"
                      onClick={() => setShowDiff(true)}
                    >
                      re-parse
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-foreground/90">
                  {text}
                </p>
              )}
              {showDiff && (
                <div className="mt-3 rounded-md border border-primary/40 bg-primary/5 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    <GitCompare className="h-3.5 w-3.5" />
                    Diff terdeteksi
                  </div>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li className="flex items-start gap-1.5">
                      <span className="font-mono text-emerald-600">+</span>
                      <span className="text-foreground/90">
                        2 entitas baru:{' '}
                        <code className="font-mono text-foreground">@OJK_RI</code>,{' '}
                        <code className="font-mono text-foreground">kecamatan Bekasi Timur</code>
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-mono text-destructive">−</span>
                      <span className="text-foreground/90">
                        1 keyword dihapus:{' '}
                        <code className="font-mono text-foreground">tunda</code>
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-mono text-amber-600">↻</span>
                      <span className="text-foreground/90">
                        1 entitas dikoreksi:{' '}
                        <code className="font-mono text-muted-foreground line-through">
                          Kalteng
                        </code>{' '}
                        →{' '}
                        <code className="font-mono text-foreground">Kalbar</code>
                      </span>
                    </li>
                  </ul>
                  <div className="mt-2 flex justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowDiff(false)}
                    >
                      Tolak
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setShowDiff(false);
                        toast.success('Perubahan diterima', {
                          description: '3 perubahan diterapkan pada extracted chips.',
                        });
                      }}
                    >
                      Terima perubahan
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-baseline justify-between pt-1">
            <h2 className="text-sm font-semibold">Hasil ekstraksi</h2>
            <span className="text-[11px] text-muted-foreground">
              edit chip · re-parse untuk refresh
            </span>
          </div>

          {BRIEF_EXTRACTED.slice(0, 2).map((f) => (
            <FieldGroup key={f.key} field={f} />
          ))}

          <div className="grid gap-3 md:grid-cols-2">
            {BRIEF_EXTRACTED.slice(2).map((f) => (
              <FieldGroup key={f.key} field={f} />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Severity threshold
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <Pill>LOW</Pill>
                <Pill active tone="amber">
                  ≥ MED
                </Pill>
                <Pill>HIGH only</Pill>
              </div>
            </div>
            <div>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Time horizon
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <Pill>1h</Pill>
                <Pill active>rolling 24h</Pill>
                <Pill>7d</Pill>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT — Galen-discovered context + preview */}
        <aside className="space-y-4 overflow-auto border-t lg:border-t-0 lg:border-l border-dashed border-border bg-muted/30 px-5 py-5">
          <H>Context · disusun Galen</H>
          <Card className="p-3">
            <div className="mb-1 flex items-baseline gap-1.5">
              <h3 className="text-base font-semibold">{BRIEF_TENANT.name}</h3>
              <Badge variant="outline" className="text-[10px]">
                {BRIEF_TENANT.kind}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{BRIEF_TENANT.detail}</p>

            <div className="mt-3 border-t border-dashed border-border pt-2.5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Internal systems
                </p>
                {scanning ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Galen sedang mencari…
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-700">
                    · {INTERNAL_SYSTEMS.filter((s) => s.status === 'ok').length} ter-sync
                  </span>
                )}
              </div>
              {scanning ? (
                <ul className="space-y-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <li
                      key={i}
                      className="h-3 animate-pulse rounded bg-muted-foreground/15"
                      style={{ width: `${60 + (i % 3) * 12}%` }}
                    />
                  ))}
                </ul>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {INTERNAL_SYSTEMS.map((s) => {
                    const { icon: Icon, color } = SYSTEM_ICON[s.status];
                    return (
                      <li key={s.name} className="flex items-start gap-1.5">
                        <Icon className={cn('mt-0.5 h-3 w-3 shrink-0', color)} />
                        <span>
                          <span className="font-mono font-semibold">{s.name}</span>{' '}
                          <span className="text-muted-foreground">· {s.detail}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          <H>Preview · sinyal 7 hari terakhir</H>
          {scanning ? (
            <Card className="p-3">
              <div className="space-y-2">
                <div className="h-8 w-1/2 animate-pulse rounded bg-muted-foreground/15" />
                <div className="h-12 animate-pulse rounded bg-muted-foreground/10" />
              </div>
            </Card>
          ) : (
            <Card className="p-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tabular-nums">
                  ~ {BRIEF_PREVIEW.matchedPerWeek}
                </span>
                <span className="text-xs text-muted-foreground">sinyal cocok / minggu</span>
              </div>
              <div className="mt-2 flex h-12 items-end gap-0.5 rounded-md border border-dashed border-border bg-muted/30 p-1.5">
                {[2, 5, 8, 6, 10, 12, 9].map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-primary/60"
                    style={{ height: `${(v / 12) * 100}%` }}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                ≈ {BRIEF_PREVIEW.weeklyCouplingEstimate} dari itu akan menghasilkan coupling event.
              </p>
            </Card>
          )}

          {!scanning && (
            <>
              <H>Sample matches</H>
              <div className="space-y-1.5">
                {BRIEF_SAMPLE_MATCHES.map((m, i) => (
                  <Card key={i} className={cn('p-2.5', SAMPLE_TONE[m.tone])}>
                    <div className="mb-1 flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[9px]">
                        {m.source}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          'ml-auto text-[9px]',
                          m.tone === 'destructive' && 'border-destructive/40 text-destructive',
                          m.tone === 'amber' && 'border-amber-500/40 text-amber-700',
                        )}
                      >
                        {m.tag}
                      </Badge>
                    </div>
                    <p className="text-xs italic text-foreground">{m.body}</p>
                  </Card>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

function Pill({
  children,
  active = false,
  tone = 'default',
}: {
  children: React.ReactNode;
  active?: boolean;
  tone?: 'default' | 'amber';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs',
        active
          ? tone === 'amber'
            ? 'border-amber-500/60 bg-amber-500/10 text-amber-700'
            : 'border-foreground bg-muted text-foreground'
          : 'border-border text-muted-foreground',
      )}
    >
      {children}
    </span>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

export default BriefStep1Intent;

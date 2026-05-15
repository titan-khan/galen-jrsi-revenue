import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { WizardStepper } from '@/components/Riset/WizardStepper';
import { RISET_INFO } from '@/data/risetData';

type Mode = 'cepat' | 'standard' | 'mendalam';

const STEPS = [
  { label: 'Konfigurasi' },
  { label: 'Tinjau rencana' },
  { label: 'Jalankan' },
];

const MulaiSesi = () => {
  const navigate = useNavigate();
  const [focus, setFocus] = useState(
    'Periksa eskalasi di Karawang pasca-LBH engagement dan dampak Cipali incident terhadap klaim 30 hari ke depan',
  );
  const [mode, setMode] = useState<Mode>('standard');

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
          <span className="font-medium text-foreground">Sesi Riset baru</span>
        </nav>
        <h1 className="text-xl font-semibold text-foreground">Mulai Sesi Riset baru</h1>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-6">
          <WizardStepper steps={STEPS} current={1} />

          {/* Riset selection */}
          <Section label="Riset yang akan dijalankan">
            <Card>
              <CardContent className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 p-5 text-[13px]">
                <span className="text-muted-foreground">Riset</span>
                <span className="font-medium text-foreground">{RISET_INFO.name}</span>
                <span className="text-muted-foreground">Versi</span>
                <span className="font-medium text-foreground">
                  v0.4.2 · 6 event types · 4 coupling signatures
                </span>
                <span className="text-muted-foreground">Cakupan default</span>
                <span className="font-medium text-foreground">
                  Klaim JRSI nasional · signal eksternal + data internal · rolling 7 hari
                </span>
              </CardContent>
            </Card>
          </Section>

          {/* Focus */}
          <Section label="Fokus khusus untuk Sesi ini (opsional)">
            <Textarea
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Contoh: 'Periksa eskalasi di Karawang pasca-LBH engagement'"
              className="min-h-[90px] bg-background text-[13.5px] leading-relaxed"
            />
            <p className="mt-1.5 text-[12px] text-muted-foreground/80">
              Fokus akan diterjemahkan ke entity emphasis + query refinement. Sesi tetap
              menjalankan analisis menyeluruh — fokus menambah priority, tidak menggantikan
              cakupan default.
            </p>
          </Section>

          {/* Mode */}
          <Section label="Mode investigasi">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <ModeOption
                value="cepat"
                selected={mode === 'cepat'}
                onSelect={() => setMode('cepat')}
                name="Cepat"
                meta="~2 menit · ~$3"
                desc="Signal sample, single-pass coupling check. Untuk verifikasi cepat."
              />
              <ModeOption
                value="standard"
                selected={mode === 'standard'}
                onSelect={() => setMode('standard')}
                name="Standard"
                meta="~5 menit · ~$8"
                desc="Semua signal default, full coupling pass, sintesis Pola lengkap. Mode default."
              />
              <ModeOption
                value="mendalam"
                selected={mode === 'mendalam'}
                onSelect={() => setMode('mendalam')}
                name="Mendalam"
                meta="~15 menit · ~$25"
                desc="Extended signal window, cross-Sesi memory, deep entity expansion."
              />
            </div>
          </Section>

          {/* Advanced */}
          <Section label="Sumber data & cakupan">
            <details className="group rounded-md border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] text-muted-foreground">
                <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                <span>
                  Default: Newstensity, Determ, data klaim internal, OJK feed, BMKG webhook · klik
                  untuk override
                </span>
              </summary>
              <div className="border-t border-border px-4 py-3 text-[12.5px] text-muted-foreground">
                Override editor — coming soon. Default mencakup 4 connector eksternal + 3 internal.
              </div>
            </details>
          </Section>

          {/* Footer */}
          <div className="mt-9 flex items-center justify-between border-t border-border pt-6">
            <Button asChild variant="ghost" size="sm">
              <Link to="/research">
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Batal
              </Link>
            </Button>
            <Button onClick={() => navigate('/research/new/plan', { state: { focus, mode } })}>
              Buat rencana riset
              <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h2>
      {children}
    </section>
  );
}

function ModeOption({
  selected,
  onSelect,
  name,
  meta,
  desc,
}: {
  value: Mode;
  selected: boolean;
  onSelect: () => void;
  name: string;
  meta: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors',
        selected
          ? 'border-foreground bg-muted/30'
          : 'border-border hover:border-slate-300',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'grid h-3.5 w-3.5 place-items-center rounded-full border-[1.5px]',
            selected ? 'border-foreground' : 'border-border',
          )}
        >
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-foreground" />}
        </span>
        <span className="text-[13.5px] font-semibold text-foreground">{name}</span>
      </div>
      <span className="font-mono text-[11.5px] text-muted-foreground">{meta}</span>
      <p className="text-[12px] leading-snug text-muted-foreground/85">{desc}</p>
    </button>
  );
}

export default MulaiSesi;

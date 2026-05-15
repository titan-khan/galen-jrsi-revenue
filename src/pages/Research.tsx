import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ShieldAlert,
  ArrowRight,
  MoreHorizontal,
  Plus,
  MessageCircle,
  ChevronRight,
  Activity,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SeverityBadge } from '@/components/RiskLens/SeverityBadge';
import { RISK_EVENTS, WORKLIST_STATS } from '@/data/riskLensData';
import { cn } from '@/lib/utils';

const Research = () => {
  const topEvents = [...RISK_EVENTS]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5);

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Research
            </span>
            <h1 className="text-2xl font-semibold text-foreground">Research</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Pantau aktif Jasa Raharja. Buka worklist untuk triase kejadian, atau tanya Asisten
              untuk pertanyaan ad-hoc.{' '}
              <Link
                to="/research/methodology"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <BookOpen className="h-3 w-3" />
                metodologi
              </Link>
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/research/monitor/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Pantau baru
            </Link>
          </Button>
        </header>

        {/* Active monitor — dominant surface */}
        <section className="rounded-xl border border-border bg-card">
          {/* Header row */}
          <div className="flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Pantau aktif</span>
                <span className="text-muted-foreground/40">·</span>
                <span>Tier 2 · partial</span>
              </div>
              <h2 className="mt-1.5 text-lg font-semibold leading-tight text-foreground">
                Risk Lens · Jasa Raharja
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Worklist coupling event · sinyal eksternal × kasus internal
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link to="/research/risk-lens">
                  Buka ringkasan
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Opsi monitor">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/research/risk-lens/pipeline">
                      <Activity className="mr-2 h-4 w-4" />
                      Status pipeline
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      toast.success('Monitor dijeda', {
                        description: 'Worklist berhenti menerima event baru.',
                      })
                    }
                  >
                    Jeda monitor
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      toast.message('Edit brief — coming soon', {
                        description: 'Update entitas, sumber, atau aturan routing.',
                      })
                    }
                  >
                    Edit brief
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Separator />

          {/* Stats */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 md:grid-cols-4">
            <Stat label="Event terbuka" value={String(WORKLIST_STATS.open)} />
            <Stat label="Tinggi" value={String(WORKLIST_STATS.high)} tone="destructive" />
            <Stat label="Menengah" value={String(WORKLIST_STATS.medium)} tone="amber" />
            <Stat label="Refresh terakhir" value={WORKLIST_STATS.lastRefresh} tone="muted" />
          </dl>

          <Separator />

          {/* Top events */}
          <div className="px-1 py-1">
            <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Top {topEvents.length} event · urut prioritas
            </div>
            <ul className="divide-y divide-border">
              {topEvents.map((ev) => (
                <li key={ev.id}>
                  <Link
                    to={`/research/risk-lens/${ev.id}`}
                    className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40"
                  >
                    <span
                      className={cn(
                        'shrink-0 font-mono text-base font-bold tabular-nums',
                        ev.priorityScore >= 0.7
                          ? 'text-destructive'
                          : ev.priorityScore >= 0.4
                          ? 'text-amber-700'
                          : 'text-foreground',
                      )}
                    >
                      {ev.priorityScore.toFixed(2)}
                    </span>
                    <SeverityBadge level={ev.severity} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {ev.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {ev.detectedAgo}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Assistant handoff */}
        <section className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <MessageCircle className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Pertanyaan satu kali?</p>
              <p className="text-xs text-muted-foreground">
                Investigasi ad-hoc dengan Galen Assistant — chat iteratif, ambil dari sumber live
                Anda.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <Link to="/assistant">
              Tanya Asisten
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
};

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'destructive' | 'amber' | 'muted';
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 text-xl font-semibold tabular-nums leading-tight',
          tone === 'destructive' && 'text-destructive',
          tone === 'amber' && 'text-amber-700',
          tone === 'muted' && 'text-muted-foreground text-base',
          tone === 'default' && 'text-foreground',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export default Research;

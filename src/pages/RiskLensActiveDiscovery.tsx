import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, X as XIcon, Check, Undo2, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DiscoveryNode } from '@/components/RiskLens/DiscoveryNode';
import { RiskLensShell } from '@/components/RiskLens/RiskLensShell';
import { ACTIVE_DISCOVERY } from '@/data/pipelineData';

const TONE_PILL: Record<string, string> = {
  destructive: 'border-destructive/40 text-destructive',
  amber: 'border-amber-500/40 text-amber-700',
  emerald: 'border-emerald-500/40 text-emerald-700',
  primary: 'border-primary/40 text-primary',
  muted: 'border-border text-muted-foreground',
};

interface AuditEntry {
  id: string;
  timestamp: string;
  addedTerm: string;
  rule: string;
  costDelta: string;
  active: boolean;
}

const INITIAL_AUDIT: AuditEntry[] = [
  {
    id: 'aud-1',
    timestamp: '14 May 11:42',
    addedTerm: '@KomisiVDPR',
    rule: 'regulator_engagement_uplift',
    costDelta: '+$1.20 / 24h',
    active: true,
  },
  {
    id: 'aud-2',
    timestamp: '13 May 18:08',
    addedTerm: '"penjadwalan ulang santunan"',
    rule: 'phrase_drift_v3',
    costDelta: '+$0.80 / 24h',
    active: true,
  },
  {
    id: 'aud-3',
    timestamp: '12 May 09:21',
    addedTerm: '@LBHPalembang',
    rule: 'advocacy_actor_uplift',
    costDelta: '+$0.60 / 24h',
    active: true,
  },
  {
    id: 'aud-4',
    timestamp: '07 May 14:00',
    addedTerm: 'kecamatan Bekasi Timur',
    rule: 'incident_geo_widening',
    costDelta: '+$0.40 / 24h',
    active: true,
  },
];

const RiskLensActiveDiscovery = () => {
  const d = ACTIVE_DISCOVERY;
  const [discoveryOn, setDiscoveryOn] = useState(true);
  const [monthlyCap, setMonthlyCap] = useState(120);
  const [audit, setAudit] = useState(INITIAL_AUDIT);

  const handleRevert = (entry: AuditEntry) => {
    setAudit((rows) => rows.map((r) => (r.id === entry.id ? { ...r, active: false } : r)));
    toast.success('Reverted', {
      description: `Term "${entry.addedTerm}" removed from active query.`,
    });
  };

  const capWarning = monthlyCap < 50;

  return (
    <RiskLensShell>
      <div className="p-6 space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active discovery
            </h2>
            <Badge variant="outline">
              {d.activeCount} active expansions · {d.baselineFactor}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              decay window: {d.decayWindow} · min strength: {d.minStrength}
            </span>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Bagaimana entitas yang diekstrak memperluas query berikutnya. Mekanisme yang menangkap
            Jambi di bulan 6, bukan bulan 36. Setiap ekspansi tercatat di audit log dan dapat
            di-revert.
          </p>
        </div>

        {/* Governance bar */}
        <Card className={cn(!discoveryOn && 'opacity-70')}>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={discoveryOn}
                onCheckedChange={(v) => {
                  setDiscoveryOn(v);
                  toast.message(
                    v ? 'Active discovery: ON' : 'Active discovery: OFF · query freezes',
                  );
                }}
                aria-label="toggle active discovery"
              />
              <div>
                <div className="text-sm font-semibold">Active discovery</div>
                <div className="text-[11px] text-muted-foreground">
                  {discoveryOn
                    ? 'Sistem boleh memperluas query secara otomatis · setiap perluasan ter-audit.'
                    : 'Query beku · tidak ada ekspansi baru sampai dihidupkan kembali.'}
                </div>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-3 border-l border-dashed border-border pl-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Monthly expansion cap
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={monthlyCap}
                    onChange={(e) => setMonthlyCap(Number(e.target.value) || 0)}
                    className="h-7 w-20 bg-background text-sm tabular-nums"
                    disabled={!discoveryOn}
                  />
                  <span className="text-xs text-muted-foreground">/ bulan</span>
                </div>
              </div>
              {capWarning && (
                <Badge variant="outline" className="gap-1 border-amber-500/60 text-amber-700">
                  <ShieldAlert className="h-3 w-3" />
                  cap rendah — perluasan akan tertahan
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Flow diagram */}
        <Card className="bg-muted/30">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {d.flow.map((step, i) => (
                <div key={step.label} className="flex items-center gap-4">
                  <DiscoveryNode {...step} />
                  {i < d.flow.length - 1 && (
                    <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Audit log */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Expansion audit log
            </h2>
            <span className="text-[11px] text-muted-foreground">
              · last {audit.length} entries · klik Revert untuk hapus dari query aktif
            </span>
          </div>
          <Card>
            <div className="grid grid-cols-[120px_1fr_220px_120px_100px] items-center gap-3 border-b border-border bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>timestamp</span>
              <span>added_term</span>
              <span>rule</span>
              <span>cost_delta</span>
              <span className="text-right">action</span>
            </div>
            <ul className="divide-y divide-border">
              {audit.map((row) => (
                <li
                  key={row.id}
                  className={cn(
                    'grid grid-cols-[120px_1fr_220px_120px_100px] items-center gap-3 px-3 py-2 text-xs',
                    !row.active && 'opacity-50',
                  )}
                >
                  <span className="font-mono text-muted-foreground">{row.timestamp}</span>
                  <code className="font-mono text-foreground">{row.addedTerm}</code>
                  <code className="font-mono text-muted-foreground">{row.rule}</code>
                  <span className="font-mono text-muted-foreground">{row.costDelta}</span>
                  <div className="flex justify-end">
                    {row.active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleRevert(row)}
                      >
                        <Undo2 className="mr-1 h-3.5 w-3.5" />
                        Revert
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        reverted
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* Expansions + bounds */}
        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Active expansions · {d.activeCount}
            </h2>
            <div className="divide-y divide-border rounded-md border border-border">
              {d.expansions.map((e) => (
                <div key={e.id} className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="flex-1 text-sm font-medium text-foreground">{e.title}</h3>
                    <Badge variant="outline" className={TONE_PILL[e.tone]}>
                      {e.hits}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{e.note}</span>
                    <span className="ml-auto">{e.decay}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{d.remainingNote}</p>
          </div>

          <aside className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Expansion bounds
            </h2>
            <Card>
              <CardContent className="space-y-3 p-4 text-xs">
                {d.bounds.map((b) => (
                  <div
                    key={b.label}
                    className="grid grid-cols-[110px_1fr_auto] items-center gap-2"
                  >
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {b.label}
                    </span>
                    <span className="text-foreground">{b.value}</span>
                    {b.status ? (
                      <Badge
                        variant="outline"
                        className={cn('gap-1', TONE_PILL[b.status.tone])}
                      >
                        {b.status.tone === 'emerald' && <Check className="h-3 w-3" />}
                        {b.status.label}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent decays
            </h2>
            <Card>
              <CardContent className="space-y-2 p-4 text-xs">
                {d.recentDecays.map((r) => (
                  <div key={r.label} className="flex items-start gap-1.5">
                    <XIcon className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="font-medium text-foreground">{r.label}</span>
                      <span className="text-muted-foreground"> · {r.detail}</span>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </RiskLensShell>
  );
};

export default RiskLensActiveDiscovery;

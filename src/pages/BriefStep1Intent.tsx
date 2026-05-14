import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, AlertTriangle, X as XIcon, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <WizardStepHeader
        step={1}
        title="What do you want Galen to watch for?"
        backHref="/research"
        backLabel="Research"
        nextHref="/research/monitor/new/sources"
      />

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1.4fr_360px] gap-0 min-h-0">
        {/* LEFT — brief + extracted fields */}
        <section className="space-y-4 overflow-auto px-6 py-5">
          {promoted && (
            <Alert className="border-primary/40 bg-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs">
                Pre-filled from investigation{' '}
                <span className="font-semibold text-foreground">{promoted.sourceTitle}</span>. Review
                the brief + extracted chips before continuing.
              </AlertDescription>
            </Alert>
          )}
          <Card className="bg-muted/40">
            <CardHeader className="pb-2">
              <div className="flex items-baseline justify-between">
                <CardTitle className="text-[11px] uppercase tracking-wider text-foreground">
                  Your brief
                </CardTitle>
                <span className="text-[11px] text-muted-foreground">
                  plain language · we parse it for you
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[120px] bg-background text-sm leading-relaxed"
              />
              <div className="flex items-center gap-2 border-t border-dashed border-border pt-2">
                <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                  Bahasa Indonesia
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {text.length} / 500 char
                </Badge>
                <Button variant="link" size="sm" className="ml-auto h-auto p-0 text-xs">
                  re-parse
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-muted-foreground">templates:</span>
                {BRIEF_TEMPLATES.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">
                    {t}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">What we extracted</h2>
            <span className="text-[11px] text-muted-foreground">edit any chip · re-parse to refresh</span>
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
            <Card className="p-3.5">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider">
                Severity threshold
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <Pill>LOW</Pill>
                <Pill active tone="amber">≥ MED</Pill>
                <Pill>HIGH only</Pill>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                LOW signals indexed but not surfaced in Worklist.
              </p>
            </Card>
            <Card className="p-3.5">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider">Time horizon</h3>
              <div className="flex flex-wrap gap-1.5">
                <Pill>1h</Pill>
                <Pill active>rolling 24h</Pill>
                <Pill>7d</Pill>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                How fresh a signal must be to enter the pipeline.
              </p>
            </Card>
          </div>

          <p className="text-[11px] italic text-muted-foreground">
            ↑ all of this is editable later · "Brief" tab in settings
          </p>
        </section>

        {/* RIGHT — tenant context + preview */}
        <aside className="space-y-4 overflow-auto border-t lg:border-t-0 lg:border-l border-dashed border-border bg-muted/30 px-5 py-5">
          <H>Your tenant</H>
          <Card className="p-3">
            <div className="mb-1 flex items-baseline gap-1.5">
              <h3 className="text-base font-semibold">{BRIEF_TENANT.name}</h3>
              <Badge variant="outline" className="text-[10px]">
                {BRIEF_TENANT.kind}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{BRIEF_TENANT.detail}</p>
          </Card>

          <H>Internal systems available to couple</H>
          <Card className="p-3">
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
          </Card>

          <H>Preview · signals you'd have caught last 7d</H>
          <Card className="p-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums">~ {BRIEF_PREVIEW.matchedPerWeek}</span>
              <span className="text-xs text-muted-foreground">matched signals / week</span>
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
              ≈ {BRIEF_PREVIEW.weeklyCouplingEstimate} of those would have produced coupling events.
            </p>
          </Card>

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

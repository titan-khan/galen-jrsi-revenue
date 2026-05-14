import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search as SearchIcon,
  SlidersHorizontal,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { SeverityBadge } from '@/components/RiskLens/SeverityBadge';
import { WorklistRow } from '@/components/RiskLens/WorklistRow';
import { DegradedSourcesBanner } from '@/components/RiskLens/DegradedSourcesBanner';
import { RiskLensShell } from '@/components/RiskLens/RiskLensShell';
import { RISK_EVENTS, MED_STUB_EVENTS, WORKLIST_STATS } from '@/data/riskLensData';

interface SeverityGroupHeaderProps {
  level: 'HIGH' | 'MED' | 'LOW';
  label: string;
  count: number;
  open: boolean;
}

function SeverityGroupHeader({ level, label, count, open }: SeverityGroupHeaderProps) {
  return (
    <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50">
      {open ? (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
      <SeverityBadge level={level} />
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-sm text-muted-foreground">· {count}</span>
    </CollapsibleTrigger>
  );
}

const RiskLensWorklist = () => {
  const [search, setSearch] = useState('');
  const [highOpen, setHighOpen] = useState(true);
  const [medOpen, setMedOpen] = useState(false);
  const [lowOpen, setLowOpen] = useState(false);

  const highEvents = RISK_EVENTS.filter((e) => e.severity === 'HIGH').filter(
    (e) => !search || e.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <RiskLensShell>
      <div className="p-6 space-y-5">
        {/* Worklist controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events…"
              className="pl-8 h-9 bg-background"
            />
          </div>
          <Button variant="outline" size="sm">
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
            Sort: priority
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{WORKLIST_STATS.open}</span> open
            </span>
            <span aria-hidden>·</span>
            <span>
              <span className="font-semibold text-destructive">{WORKLIST_STATS.high}</span> high
            </span>
            <span>
              <span className="font-semibold text-amber-700">{WORKLIST_STATS.medium}</span> medium
            </span>
            <Badge
              variant="outline"
              className="ml-1 border-emerald-500/60 text-emerald-700 gap-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              live
            </Badge>
          </div>
        </div>

        <DegradedSourcesBanner />

        <section className="space-y-4">
          <Collapsible open={highOpen} onOpenChange={setHighOpen}>
            <SeverityGroupHeader
              level="HIGH"
              label="HIGH severity"
              count={highEvents.length}
              open={highOpen}
            />
            <CollapsibleContent className="pt-2">
              <div className="divide-y divide-border">
                {highEvents.map((event) => (
                  <WorklistRow
                    key={event.id}
                    to={`/research/risk-lens/${event.id}`}
                    priorityScore={event.priorityScore}
                    severity={event.severity}
                    title={event.title}
                    ageText={event.detectedAgo.replace(' ago', '')}
                    status={event.status}
                    line1={event.worklistLine1}
                    line2={event.worklistLine2}
                  />
                ))}
              </div>
              {highEvents.length === 0 && (
                <p className="text-sm text-muted-foreground italic px-2">No matches</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={medOpen} onOpenChange={setMedOpen}>
            <SeverityGroupHeader
              level="MED"
              label="MEDIUM severity"
              count={MED_STUB_EVENTS.length}
              open={medOpen}
            />
            <CollapsibleContent className="pt-2">
              {medOpen ? (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {MED_STUB_EVENTS.map((stub) => (
                    <li key={stub.id} className="flex items-start gap-3 p-3 opacity-90">
                      <div className="min-w-[56px] font-mono text-base font-bold leading-none text-amber-700 tabular-nums">
                        {stub.priorityScore.toFixed(2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex-1 truncate text-sm font-medium">
                            {stub.title}
                          </span>
                          <span className="text-xs text-muted-foreground">{stub.ageText}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{stub.summary}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 text-xs text-muted-foreground italic">
                  {MED_STUB_EVENTS.length} medium events collapsed — claim disputes, regional press
                  mentions, social activity below amplifier threshold
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={lowOpen} onOpenChange={setLowOpen}>
            <SeverityGroupHeader level="LOW" label="LOW severity" count={0} open={lowOpen} />
            <CollapsibleContent className="pt-2">
              <p className="px-2 text-xs text-muted-foreground italic">none</p>
            </CollapsibleContent>
          </Collapsible>
        </section>
      </div>
    </RiskLensShell>
  );
};

export default RiskLensWorklist;

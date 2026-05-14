import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, Check, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EvidenceContent } from '@/components/RiskLens/EvidenceContent';
import { getRiskEvent } from '@/data/riskLensData';

const RiskLensEvidence = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const event = getRiskEvent(eventId);

  if (!event) {
    return <Navigate to="/research/risk-lens" replace />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b border-border px-6 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-1 -ml-2">
            <Link to={`/research/risk-lens/${event.id}`}>
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Event detail
            </Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold">
            Investigation · {event.internalCase.caseId} · {event.region}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {event.evalGroundTruth.label === 'true positive' && (
              <Badge variant="outline" className="border-emerald-500/60 text-emerald-700 gap-1">
                <Check className="h-3 w-3" />
                golden case
              </Badge>
            )}
            <Button variant="outline" size="sm">
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-5">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">
              Why the system flagged this event
            </h1>
            <p className="text-sm text-muted-foreground">
              Trust panel — every claim above maps back to a signal here. If you disagree, this is
              where to point.
            </p>
          </header>
          <EvidenceContent event={event} />
        </div>
      </div>
    </div>
  );
};

export default RiskLensEvidence;

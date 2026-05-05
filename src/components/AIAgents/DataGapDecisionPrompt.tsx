import { DataGapProposal } from '@/types/agent';
import { AlertCircle, ArrowRight, Plus, Database, BarChart3, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DataGapDecisionPromptProps {
  dataGaps: DataGapProposal[];
  onContinue: () => void;
  onAddMetrics: () => void;
}

const gapTypeConfig = {
  metric: {
    icon: BarChart3,
    label: 'Metric',
  },
  'data-source': {
    icon: Database,
    label: 'Data Source',
  },
  dimension: {
    icon: Layers,
    label: 'Dimension',
  },
};

export function DataGapDecisionPrompt({ dataGaps, onContinue, onAddMetrics }: DataGapDecisionPromptProps) {
  const pendingGaps = dataGaps.filter((gap) => gap.status === 'proposed');

  if (pendingGaps.length === 0) return null;

  return (
    <div className="border rounded-xl bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-5 border-b bg-gradient-to-r from-amber-500/5 to-orange-500/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Additional Data Available</h3>
            <p className="text-sm text-muted-foreground">
              I've identified data that could improve analysis accuracy
            </p>
          </div>
          <Badge variant="secondary">{pendingGaps.length} suggested</Badge>
        </div>
      </div>

      {/* Gap Items - Read only list */}
      <div className="p-5 space-y-3">
        {pendingGaps.map((gap) => {
          const config = gapTypeConfig[gap.type];
          const Icon = config.icon;

          return (
            <div
              key={gap.id}
              className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30"
            >
              <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm">{gap.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{gap.reason}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision Prompt */}
      <div className="p-5 pt-0">
        <p className="text-sm text-muted-foreground mb-4">
          Would you like to add these metrics first, or continue with the current data?
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onContinue}
            className="flex-1 gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            Continue Analysis
          </Button>
          <Button
            onClick={onAddMetrics}
            className="flex-1 gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Metrics
          </Button>
        </div>
      </div>
    </div>
  );
}

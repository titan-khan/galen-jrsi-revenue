import { DataGapProposal as DataGapProposalType } from '@/types/agent';
import { AlertCircle, Plus, X, Database, BarChart3, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DataGapProposalCardProps {
  dataGaps: DataGapProposalType[];
  onAddMetric: (gapId: string) => void;
  onSkipMetric: (gapId: string) => void;
}

const gapTypeConfig = {
  metric: {
    icon: BarChart3,
    label: 'Metric',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  'data-source': {
    icon: Database,
    label: 'Data Source',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  dimension: {
    icon: Layers,
    label: 'Dimension',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
};

export function DataGapProposalCard({ dataGaps, onAddMetric, onSkipMetric }: DataGapProposalCardProps) {
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
            <h3 className="font-semibold text-foreground">Missing Data Detected</h3>
            <p className="text-sm text-muted-foreground">
              To complete a thorough analysis, I need additional data
            </p>
          </div>
          <Badge variant="secondary">{pendingGaps.length} items</Badge>
        </div>
      </div>

      {/* Gap Items */}
      <div className="p-5 space-y-3">
        {pendingGaps.map((gap) => {
          const config = gapTypeConfig[gap.type];
          const Icon = config.icon;

          return (
            <div
              key={gap.id}
              className="flex items-start gap-4 p-4 border rounded-lg bg-background"
            >
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                </div>
                <h4 className="font-medium text-foreground">{gap.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{gap.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-medium">Needed for:</span> {gap.reason}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSkipMetric(gap.id)}
                  className="gap-1"
                >
                  <X className="h-3 w-3" />
                  Skip
                </Button>
                <Button
                  size="sm"
                  onClick={() => onAddMetric(gap.id)}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

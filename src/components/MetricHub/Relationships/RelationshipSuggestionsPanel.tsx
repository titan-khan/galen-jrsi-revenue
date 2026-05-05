import { useState, useMemo, useCallback } from 'react';
import { GitCompare } from 'lucide-react';
import { DriverTree } from './DriverTree';
import { ContributorsPanel } from './ContributorsPanel';
import { getRootMetrics } from '@/data/metricsTreeData';

interface RelationshipSuggestionsPanelProps {
  onRelationshipConfirmed?: unknown;
  onViewDetails?: (metricId: string) => void;
}

export const RelationshipSuggestionsPanel = ({
  onViewDetails,
}: RelationshipSuggestionsPanelProps) => {
  const rootMetrics = useMemo(() => getRootMetrics(), []);
  const treeRoots = useMemo(
    () => rootMetrics.filter((n) => n.children.length > 0),
    [rootMetrics]
  );

  const [selectedRoot, setSelectedRoot] = useState(
    treeRoots[0]?.metricId || ''
  );

  const handleRootChange = useCallback((rootId: string) => {
    setSelectedRoot(rootId);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
          <GitCompare className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-foreground mb-0.5">
            Metric Driver Tree
          </h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Explore how metrics decompose into sub-metrics. Expand nodes to understand
            what drives changes in your key results.
          </p>
        </div>
      </div>

      {/* Driver Tree */}
      <DriverTree onViewDetails={onViewDetails} onRootChange={handleRootChange} />

      {/* Contributors Panel */}
      {selectedRoot && (
        <ContributorsPanel
          rootMetricId={selectedRoot}
          onViewDetails={onViewDetails}
        />
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-muted-foreground/60">Positive trend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[11px] text-muted-foreground/60">Negative trend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[11px] text-muted-foreground/60">Needs attention</span>
        </div>
      </div>
    </div>
  );
};

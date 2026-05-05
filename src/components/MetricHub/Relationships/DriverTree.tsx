import { useState, useMemo, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TreeNode } from './TreeNode';
import { getRootMetrics, getMetricSubtree } from '@/data/metricsTreeData';
import { useMetrics } from '@/contexts/MetricsContext';

interface DriverTreeProps {
  onViewDetails?: (metricId: string) => void;
  onRootChange?: (rootId: string) => void;
}

export function DriverTree({ onViewDetails, onRootChange }: DriverTreeProps) {
  const { getMetricById } = useMetrics();
  const rootMetrics = useMemo(() => getRootMetrics(), []);

  // Only show roots that actually have children (are tree heads)
  const treeRoots = useMemo(
    () => rootMetrics.filter((n) => n.children.length > 0),
    [rootMetrics]
  );

  const [selectedRoot, setSelectedRoot] = useState(
    treeRoots[0]?.metricId || rootMetrics[0]?.metricId || ''
  );

  // Default expand first 2 levels
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (treeRoots.length > 0) {
      const rootId = treeRoots[0].metricId;
      const subtree = getMetricSubtree(rootId);
      for (const node of subtree) {
        if (node.level <= 1) initial.add(node.metricId);
      }
    }
    return initial;
  });

  const handleToggleExpand = useCallback((metricId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(metricId)) {
        next.delete(metricId);
      } else {
        next.add(metricId);
      }
      return next;
    });
  }, []);

  const handleRootChange = useCallback(
    (rootId: string) => {
      setSelectedRoot(rootId);
      // Auto-expand first 2 levels of new root
      const subtree = getMetricSubtree(rootId);
      const initial = new Set<string>();
      for (const node of subtree) {
        if (node.level <= 1) initial.add(node.metricId);
      }
      setExpandedNodes(initial);
      onRootChange?.(rootId);
    },
    [onRootChange]
  );

  const rootMetric = getMetricById(selectedRoot);

  return (
    <div className="space-y-4">
      {/* Root metric selector */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-muted-foreground">Root metric:</span>
        <Select value={selectedRoot} onValueChange={handleRootChange}>
          <SelectTrigger className="h-9 w-[240px] text-[13px] border-border bg-background px-2.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {treeRoots.map((root) => {
              const m = getMetricById(root.metricId);
              return (
                <SelectItem key={root.metricId} value={root.metricId} className="text-[13px]">
                  {m?.name || root.metricId}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Tree visualization */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {rootMetric ? (
          <TreeNode
            metricId={selectedRoot}
            level={0}
            expandedNodes={expandedNodes}
            onToggleExpand={handleToggleExpand}
            onViewDetails={onViewDetails}
          />
        ) : (
          <div className="text-center py-12 text-[13px] text-muted-foreground/60">
            Select a root metric to view its driver tree
          </div>
        )}
      </div>
    </div>
  );
}

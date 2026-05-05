import { useState } from 'react';
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMetrics } from '@/contexts/MetricsContext';
import { getTreeNode } from '@/data/metricsTreeData';
import type { MetricStatus } from '@/types/metric';

interface TreeNodeProps {
  metricId: string;
  level: number;
  expandedNodes: Set<string>;
  onToggleExpand: (metricId: string) => void;
  onViewDetails?: (metricId: string) => void;
}

const STATUS_DOT: Record<MetricStatus, string> = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};

export function TreeNode({
  metricId,
  level,
  expandedNodes,
  onToggleExpand,
  onViewDetails,
}: TreeNodeProps) {
  const { getMetricById } = useMetrics();
  const metric = getMetricById(metricId);
  const treeNode = getTreeNode(metricId);

  if (!metric || !treeNode) return null;

  const hasChildren = treeNode.children.length > 0;
  const isExpanded = expandedNodes.has(metricId);
  const { displayData } = metric;
  const isPositive = displayData.changePercent >= 0;
  const isGood =
    metric.direction === 'down_is_good'
      ? displayData.changePercent <= 0
      : displayData.changePercent >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div>
      {/* Node row */}
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group',
          level === 0 && 'bg-muted/20'
        )}
        style={{ paddingLeft: `${12 + level * 28}px` }}
        onClick={() => onViewDetails?.(metricId)}
      >
        {/* Expand/collapse chevron */}
        <button
          className={cn(
            'h-5 w-5 flex items-center justify-center shrink-0 rounded transition-colors',
            hasChildren
              ? 'hover:bg-muted text-muted-foreground/60 hover:text-foreground'
              : 'invisible'
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggleExpand(metricId);
          }}
        >
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
        </button>

        {/* Connector line (vertical) for children */}
        {level > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 border-l border-border/40"
            style={{ left: `${12 + (level - 1) * 28 + 10}px` }}
          />
        )}

        {/* Status dot */}
        <div
          className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[displayData.status])}
        />

        {/* Metric name */}
        <span
          className={cn(
            'text-[13px] flex-1 min-w-0 truncate',
            level === 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
          )}
        >
          {metric.name}
        </span>

        {/* Value */}
        <span className="text-[14px] font-bold font-mono text-foreground shrink-0">
          {displayData.currentValue}
        </span>

        {/* Change badge */}
        {displayData.changeAbsolute !== 'N/A' && (
          <div
            className={cn(
              'inline-flex items-center gap-0.5 text-[11px] font-medium shrink-0 ml-1',
              isGood
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>
              {isPositive ? '+' : ''}
              {displayData.changePercent}%
            </span>
          </div>
        )}
      </div>

      {/* Children (expanded) */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {treeNode.children.map((childId) => (
            <TreeNode
              key={childId}
              metricId={childId}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}

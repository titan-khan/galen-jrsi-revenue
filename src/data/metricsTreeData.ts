import type { MetricTreeNode, AISummaryData, AISuggestionItem, MetricDomain, MetricDefinition } from '@/types/metric';
import { metricsData } from './metricsData';

// =============================================================================
// Metric Tree — parent-child decomposition for the Relationships tab
// =============================================================================
//
// Tree structure:
//
//  Total Revenue
//  ├── Ticket Revenue
//  │   └── Avg Order Value
//  ├── Ancillary Revenue
//  └── Revenue per Route
//      └── Trips Completed
//          └── On-Time Performance
//              └── Avg Delay Minutes
//
//  Transacting Users
//  ├── New Customers
//  └── Repeat Customers
//      └── Customer Retention Rate
//          └── NPS Score
//
//  Booking Conversion Rate
//  ├── Seat Selection Drop-off
//  └── Checkout Completion Rate
//
//  (Standalone)
//  ├── Avg Spend per User
//  ├── Fleet Utilization
//  ├── Cancellation Rate
//  └── Mobile App Sessions
// =============================================================================

/** Build tree nodes from the flat metric list's parentMetricId relationships */
function buildTreeNodes(): MetricTreeNode[] {
  const nodes: MetricTreeNode[] = [];
  const childrenMap = new Map<string, string[]>();

  // First pass: collect all parent→children edges
  for (const m of metricsData) {
    if (m.parentMetricId) {
      const existing = childrenMap.get(m.parentMetricId) || [];
      existing.push(m.id);
      childrenMap.set(m.parentMetricId, existing);
    }
  }

  // Second pass: build nodes with computed levels
  function getLevel(id: string): number {
    const metric = metricsData.find(m => m.id === id);
    if (!metric?.parentMetricId) return 0;
    return 1 + getLevel(metric.parentMetricId);
  }

  for (const m of metricsData) {
    nodes.push({
      metricId: m.id,
      parentMetricId: m.parentMetricId ?? null,
      children: childrenMap.get(m.id) || [],
      level: getLevel(m.id),
    });
  }

  return nodes;
}

export const METRIC_TREE: MetricTreeNode[] = buildTreeNodes();

// =============================================================================
// Tree Helpers
// =============================================================================

/** Get node by ID */
export function getTreeNode(metricId: string): MetricTreeNode | undefined {
  return METRIC_TREE.find(n => n.metricId === metricId);
}

/** Get all root nodes (no parent) */
export function getRootMetrics(): MetricTreeNode[] {
  return METRIC_TREE.filter(n => n.parentMetricId === null);
}

/** Get the full subtree for a root metric (breadth-first) */
export function getMetricSubtree(rootId: string): MetricTreeNode[] {
  const result: MetricTreeNode[] = [];
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const node = METRIC_TREE.find(n => n.metricId === currentId);
    if (node) {
      result.push(node);
      queue.push(...node.children);
    }
  }

  return result;
}

/** Get children of a given metric (direct children only) */
export function getChildMetrics(metricId: string): MetricTreeNode[] {
  const node = METRIC_TREE.find(n => n.metricId === metricId);
  if (!node) return [];
  return node.children
    .map(childId => METRIC_TREE.find(n => n.metricId === childId))
    .filter(Boolean) as MetricTreeNode[];
}

/** Get metrics whose changePercent is positive (contributors growing).
 *  Accepts live metrics array from context for real-time data. */
export function getPositiveContributors(
  rootId: string,
  liveMetrics?: MetricDefinition[]
): Array<{
  metricId: string;
  name: string;
  changePercent: number;
  value: string;
}> {
  const data = liveMetrics || metricsData;
  const subtree = getMetricSubtree(rootId);
  return subtree
    .filter(n => n.metricId !== rootId)
    .map(n => {
      const m = data.find(md => md.id === n.metricId);
      if (!m) return null;
      const isPositive =
        m.direction === 'down_is_good'
          ? m.displayData.changePercent < 0
          : m.displayData.changePercent > 0;
      if (!isPositive) return null;
      return {
        metricId: m.id,
        name: m.name,
        changePercent: m.displayData.changePercent,
        value: m.displayData.currentValue,
      };
    })
    .filter(Boolean) as Array<{
      metricId: string;
      name: string;
      changePercent: number;
      value: string;
    }>;
}

/** Get metrics whose change is negative (dragging performance down).
 *  Accepts live metrics array from context for real-time data. */
export function getNegativeContributors(
  rootId: string,
  liveMetrics?: MetricDefinition[]
): Array<{
  metricId: string;
  name: string;
  changePercent: number;
  value: string;
}> {
  const data = liveMetrics || metricsData;
  const subtree = getMetricSubtree(rootId);
  return subtree
    .filter(n => n.metricId !== rootId)
    .map(n => {
      const m = data.find(md => md.id === n.metricId);
      if (!m) return null;
      const isNegative =
        m.direction === 'down_is_good'
          ? m.displayData.changePercent > 0
          : m.displayData.changePercent < 0;
      if (!isNegative) return null;
      return {
        metricId: m.id,
        name: m.name,
        changePercent: m.displayData.changePercent,
        value: m.displayData.currentValue,
      };
    })
    .filter(Boolean) as Array<{
      metricId: string;
      name: string;
      changePercent: number;
      value: string;
    }>;
}

/** Get the breadcrumb path from root to a given metric */
export function getMetricPath(metricId: string, liveMetrics?: MetricDefinition[]): string[] {
  const data = liveMetrics || metricsData;
  const path: string[] = [];
  let current = data.find(m => m.id === metricId);

  while (current) {
    path.unshift(current.name);
    if (current.parentMetricId) {
      current = data.find(m => m.id === current!.parentMetricId);
    } else {
      break;
    }
  }

  return path;
}

// =============================================================================
// Default AI Summary placeholder (replaced by dynamic AI content)
// =============================================================================

export const DEFAULT_AI_SUMMARY: AISummaryData = {
  agentName: 'Galen Metrics Agent',
  timestamp: new Date().toISOString(),
  paragraph: 'Loading AI analysis of your metrics...',
  boldParts: [],
  positiveChanges: [],
  negativeChanges: [],
  topRisers: [],
  needsAttention: [],
};

// =============================================================================
// Suggestion Helpers (now work with dynamic data from context)
// =============================================================================

/** Get suggestions that haven't been dismissed */
export function getActiveSuggestions(
  suggestions: AISuggestionItem[],
  dismissedIds: Set<string>
): AISuggestionItem[] {
  return suggestions.filter(s => !dismissedIds.has(s.id));
}

/** Get suggestions by domain */
export function getSuggestionsByDomain(
  suggestions: AISuggestionItem[],
  domain: MetricDomain
): AISuggestionItem[] {
  return suggestions.filter(s => s.domain === domain);
}

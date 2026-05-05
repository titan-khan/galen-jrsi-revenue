// =============================================================================
// CausalFlowDiagram — SVG flow diagram: Findings → Root Causes → Actions
// =============================================================================

import { memo, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { RootCauseGroup } from '@/utils/insightGrouping';

interface CausalFlowDiagramProps {
  groups: RootCauseGroup[];
  className?: string;
  /** Default collapsed on mobile */
  defaultExpanded?: boolean;
}

// ─── Layout Constants ────────────────────────────────────────────────

const COL_FINDINGS = 0;       // X position column for findings
const COL_ROOT_CAUSE = 1;     // X position column for root causes
const COL_ACTIONS = 2;        // X position column for actions

const NODE_W = 140;           // Node rectangle width
const NODE_H = 32;            // Node rectangle height
const NODE_RX = 6;            // Node border radius
const COL_GAP = 60;           // Gap between columns
const ROW_GAP = 8;            // Gap between rows within a group
const GROUP_GAP = 20;         // Gap between groups
const PAD_X = 16;             // SVG horizontal padding
const PAD_Y = 24;             // SVG vertical padding (includes header)
const HEADER_H = 24;          // Column header height
const ARROW_SIZE = 5;         // Arrowhead size

// Severity colors for findings
const SEVERITY_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  critical: { fill: '#fef2f2', stroke: '#ef4444', text: '#dc2626' },
  high: { fill: '#fffbeb', stroke: '#f59e0b', text: '#d97706' },
  medium: { fill: '#eff6ff', stroke: '#3b82f6', text: '#2563eb' },
  low: { fill: '#f9fafb', stroke: '#9ca3af', text: '#6b7280' },
};

// Action scope colors
const SCOPE_COLORS = {
  strategic: { fill: '#eff6ff', stroke: '#3b82f6', text: '#2563eb' },
  tactical: { fill: '#ecfdf5', stroke: '#10b981', text: '#059669' },
};

// Root cause node colors
const RC_COLORS = { fill: '#fefce8', stroke: '#eab308', text: '#a16207' };

// ─── Types ───────────────────────────────────────────────────────────

interface NodePos {
  x: number;
  y: number;
  label: string;
  color: { fill: string; stroke: string; text: string };
  col: number;
}

interface Edge {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '\u2026';
}

function colX(col: number): number {
  return PAD_X + col * (NODE_W + COL_GAP);
}

// ─── Component ───────────────────────────────────────────────────────

export const CausalFlowDiagram = memo(function CausalFlowDiagram({
  groups,
  className,
  defaultExpanded = true,
}: CausalFlowDiagramProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const { nodes, edges, svgWidth, svgHeight } = useMemo(() => {
    const allNodes: NodePos[] = [];
    const allEdges: Edge[] = [];

    let currentY = PAD_Y + HEADER_H + 8; // Start below headers

    for (const group of groups) {
      const rc = group.rootCause;
      const findings = group.insights;
      const actions = [...group.strategicActions, ...group.tacticalActions];

      // Calculate group height (max of left/right column count)
      const leftCount = findings.length;
      const rightCount = actions.length;
      const maxCount = Math.max(leftCount, rightCount, 1);
      const groupHeight = maxCount * (NODE_H + ROW_GAP) - ROW_GAP;

      // Root cause node — centered vertically in group
      const rcY = currentY + groupHeight / 2 - NODE_H / 2;
      const rcNode: NodePos = {
        x: colX(COL_ROOT_CAUSE),
        y: rcY,
        label: truncate(rc.cause, 18) + ` (${rc.contributionPct}%)`,
        color: RC_COLORS,
        col: COL_ROOT_CAUSE,
      };
      allNodes.push(rcNode);

      // Findings nodes
      for (let i = 0; i < findings.length; i++) {
        const ins = findings[i];
        const y = currentY + i * (NODE_H + ROW_GAP);
        const severity = ins.severity || 'medium';
        const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;
        allNodes.push({
          x: colX(COL_FINDINGS),
          y,
          label: truncate(ins.headline, 18),
          color: colors,
          col: COL_FINDINGS,
        });
        // Edge from finding to root cause
        allEdges.push({
          from: { x: colX(COL_FINDINGS) + NODE_W, y: y + NODE_H / 2 },
          to: { x: colX(COL_ROOT_CAUSE), y: rcY + NODE_H / 2 },
          color: colors.stroke,
        });
      }

      // Action nodes
      for (let i = 0; i < actions.length; i++) {
        const act = actions[i];
        const y = currentY + i * (NODE_H + ROW_GAP);
        const scope = act.actionScope || 'tactical';
        const colors = SCOPE_COLORS[scope] || SCOPE_COLORS.tactical;
        allNodes.push({
          x: colX(COL_ACTIONS),
          y,
          label: truncate(act.title, 18),
          color: colors,
          col: COL_ACTIONS,
        });
        // Edge from root cause to action
        allEdges.push({
          from: { x: colX(COL_ROOT_CAUSE) + NODE_W, y: rcY + NODE_H / 2 },
          to: { x: colX(COL_ACTIONS), y: y + NODE_H / 2 },
          color: colors.stroke,
        });
      }

      currentY += groupHeight + GROUP_GAP;
    }

    const width = PAD_X * 2 + 3 * NODE_W + 2 * COL_GAP;
    const height = currentY + PAD_Y;

    return { nodes: allNodes, edges: allEdges, svgWidth: width, svgHeight: height };
  }, [groups]);

  if (groups.length === 0) return null;

  return (
    <div className={cn('rounded-lg border border-border bg-card overflow-hidden', className)}>
      {/* Collapsible header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-sm font-semibold text-foreground">Causal Flow</h3>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full"
            style={{ minWidth: 480, maxHeight: 400 }}
          >
            {/* Arrow marker definition */}
            <defs>
              <marker
                id="flow-arrow"
                viewBox={`0 0 ${ARROW_SIZE * 2} ${ARROW_SIZE * 2}`}
                refX={ARROW_SIZE * 2}
                refY={ARROW_SIZE}
                markerWidth={ARROW_SIZE}
                markerHeight={ARROW_SIZE}
                orient="auto-start-reverse"
              >
                <path
                  d={`M0,0 L${ARROW_SIZE * 2},${ARROW_SIZE} L0,${ARROW_SIZE * 2} Z`}
                  fill="#94a3b8"
                />
              </marker>
            </defs>

            {/* Column headers */}
            <text
              x={colX(COL_FINDINGS) + NODE_W / 2}
              y={PAD_Y}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={11}
              fontWeight={600}
            >
              Findings
            </text>
            <text
              x={colX(COL_ROOT_CAUSE) + NODE_W / 2}
              y={PAD_Y}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={11}
              fontWeight={600}
            >
              Root Causes
            </text>
            <text
              x={colX(COL_ACTIONS) + NODE_W / 2}
              y={PAD_Y}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={11}
              fontWeight={600}
            >
              Actions
            </text>

            {/* Edges (drawn first, under nodes) */}
            {edges.map((edge, i) => (
              <line
                key={`edge-${i}`}
                x1={edge.from.x}
                y1={edge.from.y}
                x2={edge.to.x}
                y2={edge.to.y}
                stroke={edge.color}
                strokeWidth={1.5}
                strokeOpacity={0.5}
                markerEnd="url(#flow-arrow)"
              />
            ))}

            {/* Nodes */}
            {nodes.map((node, i) => (
              <g key={`node-${i}`}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={NODE_RX}
                  fill={node.color.fill}
                  stroke={node.color.stroke}
                  strokeWidth={1.2}
                />
                <text
                  x={node.x + NODE_W / 2}
                  y={node.y + NODE_H / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={node.color.text}
                  fontSize={10}
                  fontWeight={500}
                >
                  {node.label}
                </text>
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: SEVERITY_COLORS.critical.stroke }} />
              <span className="text-xs text-muted-foreground">Critical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: SEVERITY_COLORS.high.stroke }} />
              <span className="text-xs text-muted-foreground">High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: SEVERITY_COLORS.medium.stroke }} />
              <span className="text-xs text-muted-foreground">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: RC_COLORS.stroke }} />
              <span className="text-xs text-muted-foreground">Akar Masalah</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: SCOPE_COLORS.strategic.stroke }} />
              <span className="text-xs text-muted-foreground">Strategis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: SCOPE_COLORS.tactical.stroke }} />
              <span className="text-xs text-muted-foreground">Taktis</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

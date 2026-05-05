import { useState } from 'react';
import { List, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GroupedInsightData } from '@/utils/insightGrouping';
import type { CrossSpecialistSignal } from '@/types/specialist';

// ─── Types ───────────────────────────────────────────────────────────

export type ActiveTab = 'overview' | 'insights' | 'log';

export interface OutlineSection {
  id: string;
  label: string;
  /** For root cause sections: rank number for badge coloring */
  rank?: number;
  /** Short meta chips (e.g. "45% impact", "3 actions") */
  chips?: string[];
  /** Nested items count (e.g. correlation count) */
  count?: number;
  /** Nested sub-sections (e.g. Evidence, Actions under a root cause) */
  children?: OutlineSection[];
}

interface SectionOutlineProps {
  activeTab: ActiveTab;
  /** Sections for the Insights & Actions tab */
  grouped: GroupedInsightData | null;
  /** Cross-specialist signals count */
  correlations: CrossSpecialistSignal[];
  /** Has executive summary? */
  hasExecutiveSummary: boolean;
  /** Has ungrouped insights? */
  hasUngroupedInsights?: boolean;
  /** Has ungrouped recommendations? */
  hasUngroupedRecs?: boolean;
  /** Currently active section in viewport */
  activeSectionId: string | null;
  /** Navigate to a section */
  onNavigate: (sectionId: string) => void;
  /** Force collapse (e.g. when detail panel is open on narrow screens) */
  forceCollapsed?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────

const RANK_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  2: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
};

const DEFAULT_RANK_COLOR = 'bg-muted text-muted-foreground';

// ─── Component ───────────────────────────────────────────────────────

export function SectionOutline({
  activeTab,
  grouped,
  correlations,
  hasExecutiveSummary,
  hasUngroupedInsights,
  hasUngroupedRecs,
  activeSectionId,
  onNavigate,
  forceCollapsed,
}: SectionOutlineProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = forceCollapsed || collapsed;

  // Build section list based on active tab
  const sections = buildSections({
    activeTab,
    grouped,
    correlations,
    hasExecutiveSummary,
    hasUngroupedInsights,
    hasUngroupedRecs,
  });

  // Don't render on log tab
  if (activeTab === 'log' || sections.length === 0) {
    return null;
  }

  return (
    <aside
      className={cn(
        'shrink-0 border-r border-border bg-muted/5 transition-all duration-200 self-start sticky top-0 max-h-screen overflow-y-auto',
        isCollapsed ? 'w-10' : 'w-[220px]',
      )}
    >
      {/* Header */}
      <div className={cn(
        'sticky top-0 bg-muted/5 border-b border-border/40 z-10',
        isCollapsed ? 'px-1.5 py-3' : 'px-4 py-3',
      )}>
        {isCollapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-accent transition-colors mx-auto"
            title="Expand outline"
          >
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <List className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Daftar Isi
              </span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-accent transition-colors"
              title="Collapse outline"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/50" />
            </button>
          </div>
        )}
      </div>

      {/* Section entries */}
      {!isCollapsed && (
        <nav className="px-2 py-2 space-y-0.5">
          {sections.map((section) => (
            <OutlineItem
              key={section.id}
              section={section}
              activeSectionId={activeSectionId}
              onNavigate={onNavigate}
              depth={0}
            />
          ))}
        </nav>
      )}
    </aside>
  );
}

// ─── Outline Item (recursive for nesting) ───────────────────────────

function OutlineItem({
  section,
  activeSectionId,
  onNavigate,
  depth,
}: {
  section: OutlineSection;
  activeSectionId: string | null;
  onNavigate: (id: string) => void;
  depth: number;
}) {
  const isActive = activeSectionId === section.id;
  // A parent is "active" if any of its children are active
  const isChildActive = section.children?.some((c) => c.id === activeSectionId) ?? false;

  return (
    <>
      <button
        onClick={() => onNavigate(section.id)}
        className={cn(
          'w-full text-left rounded-md transition-colors group relative',
          depth === 0 ? 'px-2 py-1.5' : 'px-2 py-1',
          isActive
            ? 'bg-accent/60 text-foreground'
            : isChildActive
              ? 'text-foreground/80'
              : 'text-muted-foreground/70 hover:bg-accent/30 hover:text-foreground/80',
        )}
      >
        {/* Active indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary" />
        )}

        <div className="flex items-center gap-2 min-w-0" style={depth > 0 ? { paddingLeft: `${depth * 12}px` } : undefined}>
          {/* Rank badge (for root causes only) */}
          {section.rank != null && (
            <span
              className={cn(
                'shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold',
                RANK_COLORS[section.rank] || DEFAULT_RANK_COLOR,
              )}
            >
              {section.rank}
            </span>
          )}

          {/* Label */}
          <span className={cn(
            'truncate flex-1 min-w-0',
            depth === 0 ? 'text-xs font-medium' : 'text-xs font-normal',
          )}>
            {section.label}
          </span>

          {/* Count badge */}
          {section.count != null && section.count > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground/50 font-medium">
              {section.count}
            </span>
          )}
        </div>

        {/* Chips row */}
        {section.chips && section.chips.length > 0 && (
          <div className="flex items-center gap-1.5 mt-0.5 ml-7">
            {section.chips.map((chip, i) => (
              <span
                key={i}
                className={cn(
                  'text-xs font-medium',
                  i === 0
                    ? 'text-muted-foreground/40'
                    : 'text-muted-foreground/55',
                )}
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Nested children — always visible for full navigation clarity */}
      {section.children && section.children.length > 0 && (
        <div className="space-y-0.5">
          {section.children.map((child) => (
            <OutlineItem
              key={child.id}
              section={child}
              activeSectionId={activeSectionId}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Section Builder ─────────────────────────────────────────────────

function buildSections({
  activeTab,
  grouped,
  correlations,
  hasExecutiveSummary,
  hasUngroupedInsights,
  hasUngroupedRecs,
}: {
  activeTab: ActiveTab;
  grouped: GroupedInsightData | null;
  correlations: CrossSpecialistSignal[];
  hasExecutiveSummary: boolean;
  hasUngroupedInsights?: boolean;
  hasUngroupedRecs?: boolean;
}): OutlineSection[] {
  if (activeTab === 'overview') {
    return buildOverviewSections(hasExecutiveSummary);
  }

  if (activeTab === 'insights') {
    return buildInsightsSections(grouped, correlations, hasExecutiveSummary, hasUngroupedInsights, hasUngroupedRecs);
  }

  return [];
}

function buildOverviewSections(hasExecutiveSummary: boolean): OutlineSection[] {
  const sections: OutlineSection[] = [];

  if (hasExecutiveSummary) {
    sections.push({ id: 'overview-bottom-line', label: 'Inti Temuan' });
  }
  sections.push({ id: 'overview-key-metrics', label: 'Metrik Utama' });
  sections.push({ id: 'overview-top-issues', label: 'Isu Utama' });
  sections.push({ id: 'overview-actions', label: 'Tindakan Segera' });

  return sections;
}

function buildInsightsSections(
  grouped: GroupedInsightData | null,
  correlations: CrossSpecialistSignal[],
  hasExecutiveSummary: boolean,
  hasUngroupedInsights?: boolean,
  hasUngroupedRecs?: boolean,
): OutlineSection[] {
  const sections: OutlineSection[] = [];

  // Stats bar
  sections.push({ id: 'insights-stats', label: 'Ringkasan' });

  // Problem statement
  if (hasExecutiveSummary) {
    sections.push({ id: 'insights-problem', label: 'Inti Permasalahan' });
  }

  // Root cause groups
  if (grouped) {
    for (const group of grouped.groups) {
      const rc = group.rootCause;
      const allActions = [...group.strategicActions, ...group.tacticalActions];
      const actionCount = allActions.length;
      const evidenceCount = rc.evidence.length + group.insights.length;

      // Aggregate impact across all actions in this root cause group
      const totalImpact = allActions.reduce((sum, a) => sum + (a.impact?.value ?? 0), 0);
      const impactCurrency = allActions.find((a) => a.impact?.currency)?.impact?.currency;

      const chips: string[] = [];
      if (rc.contributionPct > 0) chips.push(`${rc.contributionPct}%`);
      if (totalImpact > 0) chips.push(formatCompactImpact(totalImpact, impactCurrency));

      // Build sub-sections for each root cause
      const children: OutlineSection[] = [];
      if (evidenceCount > 0) {
        children.push({
          id: `rc-${rc.rank}-evidence`,
          label: 'Bukti',
          count: evidenceCount,
        });
      }
      if (actionCount > 0) {
        children.push({
          id: `rc-${rc.rank}-actions`,
          label: 'Aksi',
          count: actionCount,
        });
      }

      sections.push({
        id: `rc-${rc.rank}`,
        label: truncate(rc.cause, 28),
        rank: rc.rank,
        chips,
        children: children.length > 0 ? children : undefined,
      });
    }

    // Ungrouped
    if (hasUngroupedInsights && grouped.ungroupedInsights.length > 0) {
      sections.push({
        id: 'insights-other-observations',
        label: 'Observasi Lain',
        count: grouped.ungroupedInsights.length,
      });
    }
    if (hasUngroupedRecs && grouped.ungroupedRecommendations.length > 0) {
      sections.push({
        id: 'insights-other-actions',
        label: 'Aksi Lain',
        count: grouped.ungroupedRecommendations.length,
      });
    }
  }

  // Cross-specialist signals
  if (correlations.length > 0) {
    sections.push({
      id: 'insights-signals',
      label: 'Sinyal Lintas-Spesialis',
      count: correlations.length,
    });
  }

  return sections;
}

// ─── Utilities ───────────────────────────────────────────────────────

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trim() + '\u2026';
}

/** Compact impact formatting for the outline panel.
 *  IDR uses Indonesian units: Jt (Juta/million), M (Miliar/billion), T (Triliun/trillion)
 *  USD uses standard: K, M, B */
function formatCompactImpact(value: number, currency?: string): string {
  if (currency === 'IDR') {
    if (value >= 1_000_000_000_000) return `Rp${(value / 1_000_000_000_000).toFixed(1)}T`;
    if (value >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1)}M`;
    if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(0)}Jt`;
    return `Rp${(value / 1_000).toFixed(0)}Rb`;
  }
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}


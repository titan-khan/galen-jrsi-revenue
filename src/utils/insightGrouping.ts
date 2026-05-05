// =============================================================================
// Insight Grouping Utility — Groups insights & recommendations by root cause
// MECE Principle: each insight appears in exactly ONE group (its primary cause)
// =============================================================================

import type { SpecialistInsight, SpecialistRecommendation } from '@/types/specialist';
import type { RootCauseItem } from '@/services/specialistRunService';

// ─── Types ───────────────────────────────────────────────────────────

export interface RootCauseGroup {
  rootCause: RootCauseItem;
  /** Insights assigned exclusively to this root cause (MECE — no duplicates across groups) */
  insights: SpecialistInsight[];
  strategicActions: SpecialistRecommendation[];
  tacticalActions: SpecialistRecommendation[];
}

export interface GroupedInsightData {
  groups: RootCauseGroup[];
  ungroupedInsights: SpecialistInsight[];
  ungroupedRecommendations: SpecialistRecommendation[];
}

// ─── Detection ───────────────────────────────────────────────────────

/**
 * Detects whether the data has cross-reference fields (new runs) or not (legacy).
 * Used to decide between grouped layout (new) and flat layout (legacy).
 */
export function hasCrossReferences(
  insights: SpecialistInsight[],
  recommendations: SpecialistRecommendation[],
): boolean {
  const hasInsightRefs = insights.some(
    (i) => i.rootCauseRanks && i.rootCauseRanks.length > 0,
  );
  const hasRecRefs = recommendations.some(
    (r) => r.rootCauseRank != null && r.rootCauseRank > 0,
  );
  return hasInsightRefs || hasRecRefs;
}

// ─── Grouping (MECE) ─────────────────────────────────────────────────

/**
 * Groups insights and recommendations by root cause using MECE principle.
 *
 * MECE = Mutually Exclusive, Collectively Exhaustive
 * - Each insight appears in exactly ONE group (its primary root cause — lowest rank)
 * - Each recommendation appears in exactly ONE group
 * - Ungrouped items catch anything that doesn't map to a root cause
 *
 * This prevents the same finding from showing up under multiple root causes.
 */
export function groupByRootCause(
  rootCauses: RootCauseItem[],
  insights: SpecialistInsight[],
  recommendations: SpecialistRecommendation[],
): GroupedInsightData {
  // Sort root causes by rank (1 = highest contribution)
  const sortedCauses = [...rootCauses].sort((a, b) => a.rank - b.rank);

  // ── MECE assignment: each insight → its primary root cause only ──
  // Primary = lowest rank number in rootCauseRanks (highest priority cause)
  const insightToPrimaryRank = new Map<string, number>();

  for (const ins of insights) {
    if (ins.rootCauseRanks && ins.rootCauseRanks.length > 0) {
      // Assign to the highest-priority (lowest rank number) root cause
      const primaryRank = Math.min(...ins.rootCauseRanks);
      insightToPrimaryRank.set(ins.id, primaryRank);
    } else {
      // Check if any root cause claims this insight via insightIds
      for (const rc of sortedCauses) {
        if (rc.insightIds && rc.insightIds.includes(ins.id)) {
          insightToPrimaryRank.set(ins.id, rc.rank);
          break; // first (highest priority) match wins
        }
      }
    }
  }

  // Track which items get grouped
  const groupedInsightIds = new Set<string>();
  const groupedRecIds = new Set<string>();

  const groups: RootCauseGroup[] = sortedCauses.map((rc) => {
    // Only include insights whose PRIMARY assignment is this root cause
    const matchedInsights = insights.filter((ins) => {
      return insightToPrimaryRank.get(ins.id) === rc.rank;
    });

    // Recommendations: each maps to exactly one root cause via rootCauseRank
    const matchedRecs = recommendations.filter(
      (rec) => rec.rootCauseRank === rc.rank,
    );

    // Mark as grouped
    matchedInsights.forEach((ins) => groupedInsightIds.add(ins.id));
    matchedRecs.forEach((rec) => groupedRecIds.add(rec.id));

    // Split recommendations by action scope
    const strategicActions = matchedRecs.filter(
      (rec) => rec.actionScope === 'strategic',
    );
    const tacticalActions = matchedRecs.filter(
      (rec) => rec.actionScope !== 'strategic',
    );

    return {
      rootCause: rc,
      insights: matchedInsights,
      strategicActions,
      tacticalActions,
    };
  });

  // Collect ungrouped items
  const ungroupedInsights = insights.filter(
    (ins) => !groupedInsightIds.has(ins.id),
  );
  const ungroupedRecommendations = recommendations.filter(
    (rec) => !groupedRecIds.has(rec.id),
  );

  return {
    groups,
    ungroupedInsights,
    ungroupedRecommendations,
  };
}

// ─── Summary Helpers ─────────────────────────────────────────────────

/** Count total findings across all groups (MECE — no double counting) */
export function totalFindingsCount(data: GroupedInsightData): number {
  const grouped = data.groups.reduce((sum, g) => sum + g.insights.length, 0);
  return grouped + data.ungroupedInsights.length;
}

/** Count total actions across all groups */
export function totalActionsCount(data: GroupedInsightData): number {
  const grouped = data.groups.reduce(
    (sum, g) => sum + g.strategicActions.length + g.tacticalActions.length,
    0,
  );
  return grouped + data.ungroupedRecommendations.length;
}

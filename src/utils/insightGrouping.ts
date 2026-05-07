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
 *
 * Returns true also when there are root causes available — even without DB-side
 * `root_cause_rank` columns — because we can fall back to text-similarity inference
 * (see `inferRecRootCauseRank`).
 */
export function hasCrossReferences(
  insights: SpecialistInsight[],
  recommendations: SpecialistRecommendation[],
  rootCauses?: RootCauseItem[],
): boolean {
  const hasInsightRefs = insights.some(
    (i) => i.rootCauseRanks && i.rootCauseRanks.length > 0,
  );
  const hasRecRefs = recommendations.some(
    (r) => r.rootCauseRank != null && r.rootCauseRank > 0,
  );
  const hasInferenceBasis =
    !!rootCauses && rootCauses.length > 0 && recommendations.length > 0;
  return hasInsightRefs || hasRecRefs || hasInferenceBasis;
}

// ─── Inference fallbacks (when DB doesn't have root_cause_rank/action_scope) ─

const STOPWORDS = new Set([
  'untuk', 'dan', 'di', 'ke', 'dari', 'pada', 'yang', 'atau', 'dengan',
  'akan', 'dalam', 'oleh', 'tidak', 'ada', 'adalah', 'agar', 'antar',
  'antara', 'jika', 'maka', 'per', 'serta', 'tanpa', 'the', 'ini', 'itu',
  'a', 'an', 'of', 'to', 'for', 'in', 'with',
]);

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !STOPWORDS.has(t)),
  );
}

function tokenOverlapScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n / Math.min(a.size, b.size);
}

/**
 * Infer the BEST single root cause rank for a recommendation by keyword overlap
 * between the rec's title+description and each root cause's cause+evidence.
 * Returns the rank of the best match (>= 0.18), or null when nothing matches.
 *
 * Used as primary assignment when MECE single-bucket grouping is needed.
 */
export function inferRecRootCauseRank(
  rec: SpecialistRecommendation,
  rootCauses: RootCauseItem[],
): number | null {
  const ranks = inferRecRootCauseRanks(rec, rootCauses, 0.18);
  return ranks[0] ?? null;
}

/**
 * Infer the relevant root cause ranks for a recommendation (multi-mapping).
 * Returns ranks sorted by descending overlap score.
 *
 * Strategy:
 *   1. Score rec text vs each root cause's text via token overlap.
 *   2. Take the BEST match (always returned if it clears `primaryThreshold`).
 *   3. Additionally include secondary matches only if their score is at
 *      least `secondaryRatio` × primary score (default 0.80) — so a
 *      strongly-overlapping rec can appear in 2 RCs, but unrelated RCs
 *      with weak coincidental overlap don't pollute.
 *
 * This avoids the "every rec under every RC" problem caused by shared
 * domain vocabulary (kronis, penagihan, kendaraan, etc.).
 */
export function inferRecRootCauseRanks(
  rec: SpecialistRecommendation,
  rootCauses: RootCauseItem[],
  primaryThreshold = 0.18,
  secondaryRatio = 0.80,
): number[] {
  if (rootCauses.length === 0) return [];
  const recText = `${rec.title} ${rec.description ?? ''}`;
  const recTokens = tokenize(recText);
  if (recTokens.size === 0) return [];

  const scored: Array<{ rank: number; score: number }> = [];
  for (const rc of rootCauses) {
    const rcText = `${rc.cause} ${(rc.evidence || []).join(' ')}`;
    const rcTokens = tokenize(rcText);
    const score = tokenOverlapScore(recTokens, rcTokens);
    if (score > 0) scored.push({ rank: rc.rank, score });
  }
  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0 || scored[0].score < primaryThreshold) return [];

  const primaryScore = scored[0].score;
  const cutoff = Math.max(primaryThreshold, primaryScore * secondaryRatio);
  return scored.filter((m) => m.score >= cutoff).map((m) => m.rank);
}

const STRATEGIC_KEYWORDS = [
  'regulasi', 'kebijakan', 'pergub', 'perda', 'mou', 'rancang regulasi',
  'amnesti', 'reformasi', 'sistem', 'platform', 'arsitektur',
];

/**
 * Infer action scope when the DB doesn't have `action_scope` column.
 * Strategic = policy/regulation/system-level. Tactical = everything else.
 */
export function inferActionScope(
  rec: SpecialistRecommendation,
): 'strategic' | 'tactical' {
  if (rec.actionScope === 'strategic' || rec.actionScope === 'tactical') {
    return rec.actionScope;
  }
  const lower = `${rec.title} ${rec.description ?? ''}`.toLowerCase();
  for (const kw of STRATEGIC_KEYWORDS) {
    if (lower.includes(kw)) return 'strategic';
  }
  return 'tactical';
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

  // ── Pre-compute effective root cause rank(s) per rec ──────────
  // Strategy:
  //   1. DB-supplied `rootCauseRank` wins (single primary, e.g. when
  //      migration 20260217_add_recommendation_cross_refs.sql is applied
  //      and the AI populates the column at insert time).
  //   2. Keyword-overlap inference for legacy rows / pre-migration data.
  //      Allows multi-RC mapping (primary + secondary ≥80% of primary).
  //   3. Safety fallback: if a rec passes neither and there's only ONE
  //      root cause, assign to it (graceful degenerate case).
  //   Otherwise leave unranked → falls into "Aksi Lain".
  const recToEffectiveRanks = new Map<string, number[]>();
  for (const rec of recommendations) {
    if (rec.rootCauseRank != null && rec.rootCauseRank > 0) {
      recToEffectiveRanks.set(rec.id, [rec.rootCauseRank]);
      continue;
    }
    const inferred = inferRecRootCauseRanks(rec, sortedCauses);
    if (inferred.length > 0) {
      recToEffectiveRanks.set(rec.id, inferred);
      continue;
    }
    // Safety: single root cause? assign there. Else leave for "Aksi Lain".
    if (sortedCauses.length === 1) {
      recToEffectiveRanks.set(rec.id, [sortedCauses[0].rank]);
    } else {
      recToEffectiveRanks.set(rec.id, []);
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

    // Recommendations: include any rec whose effective rank set contains this RC
    const matchedRecs = recommendations.filter((rec) => {
      const ranks = recToEffectiveRanks.get(rec.id) ?? [];
      return ranks.includes(rc.rank);
    });

    // Mark as grouped
    matchedInsights.forEach((ins) => groupedInsightIds.add(ins.id));
    matchedRecs.forEach((rec) => groupedRecIds.add(rec.id));

    // Split recommendations by action scope (with inference fallback)
    const strategicActions = matchedRecs.filter(
      (rec) => inferActionScope(rec) === 'strategic',
    );
    const tacticalActions = matchedRecs.filter(
      (rec) => inferActionScope(rec) !== 'strategic',
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

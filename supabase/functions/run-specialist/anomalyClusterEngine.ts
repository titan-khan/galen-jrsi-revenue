// =============================================================================
// Anomaly Cluster Engine — Domain-agnostic anomaly grouping (no LLM)
// Groups related anomalies using dimension overlap, data source proximity,
// and optional causal chain scoring via processChain.
// =============================================================================

import type { DetectedAnomaly } from "./anomalyDetector.ts";
import type { KnowledgeContextConfig } from "./types.ts";

// ─── Types ───────────────────────────────────────────────────────────

export interface ClusterConfig {
  dimensionOverlapWeight: number;
  dataSourceProximityWeight: number;
  causalChainWeight: number;
  temporalWindowWeeks: number;
  autoClusterScore: number;
  suggestClusterScore: number;
  minAnomaliesForInvestigation: number;
}

export interface ScoringBreakdown {
  dimensionOverlap: number;
  dataSourceProximity: number;
  causalChain: number;
  temporalBonus: number;
}

export interface AnomalyCluster {
  clusterId: string;
  anomalies: DetectedAnomaly[];
  clusterScore: number;
  scoringBreakdown: ScoringBreakdown;
  sharedDimensions: Record<string, string[]>;
  status: 'auto' | 'suggested' | 'manual';
}

export interface ClusterResult {
  clusters: AnomalyCluster[];
  standaloneAnomalies: DetectedAnomaly[];
}

// ─── Defaults ────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ClusterConfig = {
  dimensionOverlapWeight: 0.4,
  dataSourceProximityWeight: 0.3,
  causalChainWeight: 0.3,
  temporalWindowWeeks: 2,
  autoClusterScore: 0.7,
  suggestClusterScore: 0.5,
  minAnomaliesForInvestigation: 2,
};

// ─── Scoring Functions ───────────────────────────────────────────────

/**
 * Dimension overlap using Jaccard similarity.
 * Compares dimension key-value pairs between two anomalies.
 * Returns 0-1 score (1 = identical dimensions).
 */
function scoreDimensionOverlap(a: DetectedAnomaly, b: DetectedAnomaly): number {
  const dimsA = a.dimensions || {};
  const dimsB = b.dimensions || {};

  const keysA = Object.keys(dimsA);
  const keysB = Object.keys(dimsB);

  if (keysA.length === 0 && keysB.length === 0) return 0.5; // neutral when no dimensions

  // Build sets of "key=value" pairs
  const setA = new Set(keysA.map(k => `${k}=${dimsA[k]}`));
  const setB = new Set(keysB.map(k => `${k}=${dimsB[k]}`));

  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;

  if (union === 0) return 0.5;
  return intersection / union;
}

/**
 * Data source proximity via metric name prefix matching.
 * Metrics from the same family (e.g., "otpByRoute" and "otpByMonth" share "otp")
 * get a higher score. No hard-coded metric IDs — uses string analysis.
 */
function scoreDataSourceProximity(a: DetectedAnomaly, b: DetectedAnomaly): number {
  const nameA = a.metric.toLowerCase();
  const nameB = b.metric.toLowerCase();

  // Exact same metric
  if (nameA === nameB) return 1.0;

  // Extract prefix: strip common suffixes (ByRoute, ByMonth, ByClient, Percent, Rate, etc.)
  const stripSuffixes = (name: string): string => {
    return name
      .replace(/by[a-z]+$/i, '')
      .replace(/(percent|rate|ratio|count|total|avg|sum)$/i, '')
      .replace(/[_-]+$/, '');
  };

  const prefixA = stripSuffixes(nameA);
  const prefixB = stripSuffixes(nameB);

  if (prefixA && prefixB && prefixA === prefixB) return 0.8;

  // Check for shared words (at least 2 characters)
  const wordsA = nameA.split(/[_\-\s]+|(?=[A-Z])/).filter(w => w.length >= 2).map(w => w.toLowerCase());
  const wordsB = nameB.split(/[_\-\s]+|(?=[A-Z])/).filter(w => w.length >= 2).map(w => w.toLowerCase());
  const sharedWords = wordsA.filter(w => wordsB.includes(w));

  if (sharedWords.length > 0) return 0.4 + (0.2 * Math.min(sharedWords.length, 3) / 3);

  return 0.0;
}

/**
 * Causal chain scoring using processChain from knowledge context.
 * Checks if anomaly A's metric maps to an upstream/downstream stage of anomaly B's metric.
 * Returns 0.5 (neutral) if no processChain is available — graceful degradation.
 */
function scoreCausalChain(
  a: DetectedAnomaly,
  b: DetectedAnomaly,
  processChain?: KnowledgeContextConfig['processChain'],
): number {
  if (!processChain || processChain.length === 0) return 0.5; // neutral

  // Build metric → stage mapping
  const metricToStage = new Map<string, string>();
  const stageOrder = new Map<string, number>();

  for (const stage of processChain) {
    stageOrder.set(stage.id, stage.order);
    if (stage.metrics) {
      for (const metric of stage.metrics) {
        metricToStage.set(metric.toLowerCase(), stage.id);
      }
    }
  }

  // Find stages for each anomaly's metric (fuzzy match — check if metric contains or is contained by a known metric)
  const findStage = (metricName: string): string | null => {
    const lower = metricName.toLowerCase();
    // Exact match
    if (metricToStage.has(lower)) return metricToStage.get(lower)!;
    // Prefix match
    for (const [known, stageId] of metricToStage) {
      if (lower.startsWith(known) || known.startsWith(lower)) return stageId;
    }
    return null;
  };

  const stageA = findStage(a.metric);
  const stageB = findStage(b.metric);

  if (!stageA || !stageB) return 0.5; // can't determine relationship

  if (stageA === stageB) return 0.9; // same stage = strongly related

  const orderA = stageOrder.get(stageA) ?? 0;
  const orderB = stageOrder.get(stageB) ?? 0;
  const distance = Math.abs(orderA - orderB);

  // Adjacent stages = likely causal, distant = less likely
  if (distance === 1) return 0.85;
  if (distance === 2) return 0.6;
  return 0.3;
}

/**
 * Compute pairwise similarity score between two anomalies.
 */
function computePairScore(
  a: DetectedAnomaly,
  b: DetectedAnomaly,
  config: ClusterConfig,
  processChain?: KnowledgeContextConfig['processChain'],
): { score: number; breakdown: ScoringBreakdown } {
  const dimOverlap = scoreDimensionOverlap(a, b);
  const dsProximity = scoreDataSourceProximity(a, b);
  const causalChain = scoreCausalChain(a, b, processChain);

  // Temporal bonus: anomalies from same run are always temporally proximate
  const temporalBonus = 0.15;

  const weightedScore =
    dimOverlap * config.dimensionOverlapWeight +
    dsProximity * config.dataSourceProximityWeight +
    causalChain * config.causalChainWeight +
    temporalBonus;

  return {
    score: Math.min(weightedScore, 1.0),
    breakdown: {
      dimensionOverlap: dimOverlap,
      dataSourceProximity: dsProximity,
      causalChain: causalChain,
      temporalBonus,
    },
  };
}

// ─── Shared Dimensions ───────────────────────────────────────────────

function computeSharedDimensions(anomalies: DetectedAnomaly[]): Record<string, string[]> {
  const dimValues: Record<string, Map<string, number>> = {};

  for (const a of anomalies) {
    if (!a.dimensions) continue;
    for (const [key, value] of Object.entries(a.dimensions)) {
      if (!dimValues[key]) dimValues[key] = new Map();
      dimValues[key].set(value, (dimValues[key].get(value) || 0) + 1);
    }
  }

  const shared: Record<string, string[]> = {};
  for (const [key, valueMap] of Object.entries(dimValues)) {
    // Only include dimension values that appear in 2+ anomalies
    const sharedValues = [...valueMap.entries()]
      .filter(([, count]) => count >= 2)
      .map(([value]) => value);
    if (sharedValues.length > 0) {
      shared[key] = sharedValues;
    }
  }

  return shared;
}

// ─── Clustering Algorithm ────────────────────────────────────────────

/**
 * Single-link agglomerative clustering.
 * Starts with each anomaly as a singleton cluster.
 * Iteratively merges the pair with highest score until no pair exceeds threshold.
 */
export function clusterAnomalies(
  anomalies: DetectedAnomaly[],
  knowledgeContext?: KnowledgeContextConfig | null,
): ClusterResult {
  const userConfig = knowledgeContext?.clusterConfig || {};
  const config: ClusterConfig = { ...DEFAULT_CONFIG, ...userConfig };

  if (anomalies.length < config.minAnomaliesForInvestigation) {
    return { clusters: [], standaloneAnomalies: anomalies };
  }

  const processChain = knowledgeContext?.processChain;

  // Initialize: each anomaly is its own cluster (index-based)
  let groups: number[][] = anomalies.map((_, i) => [i]);

  // Precompute pairwise scores
  const pairScores = new Map<string, { score: number; breakdown: ScoringBreakdown }>();
  for (let i = 0; i < anomalies.length; i++) {
    for (let j = i + 1; j < anomalies.length; j++) {
      const result = computePairScore(anomalies[i], anomalies[j], config, processChain);
      pairScores.set(`${i}-${j}`, result);
    }
  }

  // Agglomerative merging: single-link (max pairwise score between any members)
  let merged = true;
  while (merged) {
    merged = false;
    let bestScore = -1;
    let bestI = -1;
    let bestJ = -1;
    let bestBreakdown: ScoringBreakdown | null = null;

    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        // Single-link: max score between any pair of members
        let maxScore = -1;
        let maxBreakdown: ScoringBreakdown | null = null;
        for (const a of groups[i]) {
          for (const b of groups[j]) {
            const key = a < b ? `${a}-${b}` : `${b}-${a}`;
            const result = pairScores.get(key);
            if (result && result.score > maxScore) {
              maxScore = result.score;
              maxBreakdown = result.breakdown;
            }
          }
        }

        if (maxScore > bestScore) {
          bestScore = maxScore;
          bestI = i;
          bestJ = j;
          bestBreakdown = maxBreakdown;
        }
      }
    }

    if (bestScore >= config.suggestClusterScore && bestI >= 0 && bestJ >= 0) {
      // Merge bestJ into bestI
      groups[bestI] = [...groups[bestI], ...groups[bestJ]];
      groups.splice(bestJ, 1);
      merged = true;
    }
  }

  // Build result
  const clusters: AnomalyCluster[] = [];
  const standaloneAnomalies: DetectedAnomaly[] = [];

  for (const group of groups) {
    if (group.length >= config.minAnomaliesForInvestigation) {
      const clusterAnomalies = group.map(i => anomalies[i]);

      // Compute average pairwise score for the cluster
      let totalScore = 0;
      let pairCount = 0;
      let avgBreakdown: ScoringBreakdown = {
        dimensionOverlap: 0,
        dataSourceProximity: 0,
        causalChain: 0,
        temporalBonus: 0.15,
      };

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const key = group[i] < group[j] ? `${group[i]}-${group[j]}` : `${group[j]}-${group[i]}`;
          const result = pairScores.get(key);
          if (result) {
            totalScore += result.score;
            avgBreakdown.dimensionOverlap += result.breakdown.dimensionOverlap;
            avgBreakdown.dataSourceProximity += result.breakdown.dataSourceProximity;
            avgBreakdown.causalChain += result.breakdown.causalChain;
            pairCount++;
          }
        }
      }

      if (pairCount > 0) {
        totalScore /= pairCount;
        avgBreakdown.dimensionOverlap /= pairCount;
        avgBreakdown.dataSourceProximity /= pairCount;
        avgBreakdown.causalChain /= pairCount;
      }

      const status = totalScore >= config.autoClusterScore ? 'auto' : 'suggested';
      const timestamp = Date.now().toString(36);
      const hash = group.map(i => anomalies[i].metric).join('').slice(0, 6);

      clusters.push({
        clusterId: `CLU-${timestamp}-${hash}`,
        anomalies: clusterAnomalies,
        clusterScore: Math.round(totalScore * 100) / 100,
        scoringBreakdown: {
          dimensionOverlap: Math.round(avgBreakdown.dimensionOverlap * 100) / 100,
          dataSourceProximity: Math.round(avgBreakdown.dataSourceProximity * 100) / 100,
          causalChain: Math.round(avgBreakdown.causalChain * 100) / 100,
          temporalBonus: 0.15,
        },
        sharedDimensions: computeSharedDimensions(clusterAnomalies),
        status,
      });
    } else {
      for (const i of group) {
        standaloneAnomalies.push(anomalies[i]);
      }
    }
  }

  console.log(`[cluster-engine] ${anomalies.length} anomalies → ${clusters.length} clusters, ${standaloneAnomalies.length} standalone`);
  for (const c of clusters) {
    console.log(`[cluster-engine] Cluster ${c.clusterId}: ${c.anomalies.length} anomalies, score=${c.clusterScore}, status=${c.status}`);
    console.log(`[cluster-engine]   Breakdown: dim=${c.scoringBreakdown.dimensionOverlap}, ds=${c.scoringBreakdown.dataSourceProximity}, causal=${c.scoringBreakdown.causalChain}`);
  }

  return { clusters, standaloneAnomalies };
}

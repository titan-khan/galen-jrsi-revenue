// =============================================================================
// Metric Relevance — Dynamic field matching for specialist-aware chart filtering
//
// Checks whether a candidate DB field (used in charts/decomposition) is relevant
// to the specialist's resolved measures. No hardcoded metric families — purely
// driven by the specialist's declared measures from metric_definitions table.
// =============================================================================

/**
 * Check if a candidate DB field is relevant to the specialist's resolved measures.
 *
 * @param resolvedMeasures - DB column names from metric_definitions (e.g., ['returns_cost', 'is_returned'])
 * @param candidateField   - The field being checked (e.g., 'returns_cost', 'cm_pct', 'revenue')
 * @param computedFrom     - Optional source columns this field is computed from (e.g., return_rate ← ['is_returned'])
 * @returns true if the field is relevant to the specialist, or if no filter is configured (backward compat)
 */
export function isFieldRelevant(
  resolvedMeasures: string[] | undefined,
  candidateField: string,
  computedFrom?: string[],
): boolean {
  // No filter configured → everything is relevant (backward compat for old specialists)
  if (!resolvedMeasures || resolvedMeasures.length === 0) return true;

  const candidate = candidateField.toLowerCase();
  const measures = resolvedMeasures.map(m => m.toLowerCase());

  // 1. Exact match on candidate field
  if (measures.includes(candidate)) return true;

  // 2. Check computedFrom sources (e.g., return_rate chart is computed from is_returned column)
  if (computedFrom?.some(src => measures.includes(src.toLowerCase()))) return true;

  // 3. Fuzzy: candidate contains a measure or a measure contains the candidate
  //    Handles aliases like "cm_pct" matching "contribution_margin_pct"
  if (measures.some(m => candidate.includes(m) || m.includes(candidate))) return true;

  // 4. Token overlap: split on underscores and check if enough tokens match.
  //    Handles partial matches like "review_rework_rate" (measure) vs "rework_rate" (column)
  //    or "avg_review_days" (measure) vs "review_days" (column).
  const candidateTokens = new Set(candidate.split('_').filter(t => t.length > 1));
  if (candidateTokens.size >= 2) {
    for (const m of measures) {
      const measureTokens = m.split('_').filter(t => t.length > 1);
      const overlap = measureTokens.filter(t => candidateTokens.has(t)).length;
      // Require at least 2 matching tokens AND they cover majority of the shorter token set
      const minTokens = Math.min(candidateTokens.size, measureTokens.length);
      if (overlap >= 2 && overlap >= minTokens * 0.6) return true;
    }
  }

  return false;
}

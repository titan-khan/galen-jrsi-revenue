// =============================================================================
// Pattern Memory Loader — Query historical patterns for specialist learning
// =============================================================================

export interface PatternMemoryEntry {
  id: string;
  detectedAt: string;
  resolvedAt?: string;
  anomalySignature: {
    metric: string;
    deviation: number;
    dimensions?: Record<string, string>;
  };
  confirmedRootCause?: string;
  interventionApplied?: string;
  outcome?: 'resolved' | 'partially-resolved' | 'unresolved';
  outcomeMetric?: {
    before: number;
    after: number;
    unit: string;
  };
  learningNote?: string;
}

/**
 * Load recent pattern memory entries for a specialist.
 * Returns the most recent confirmed patterns (limit 10).
 */
export async function loadPatternMemory(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  specialistId: string,
  limit = 10,
): Promise<PatternMemoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from("specialist_pattern_memory")
      .select("*")
      .eq("specialist_id", specialistId)
      .order("detected_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn(`[pattern-memory] Failed to load: ${error.message}`);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      detectedAt: row.detected_at as string,
      resolvedAt: row.resolved_at as string | undefined,
      anomalySignature: row.anomaly_signature as PatternMemoryEntry['anomalySignature'],
      confirmedRootCause: row.confirmed_root_cause as string | undefined,
      interventionApplied: row.intervention_applied as string | undefined,
      outcome: row.outcome as PatternMemoryEntry['outcome'],
      outcomeMetric: row.outcome_metric as PatternMemoryEntry['outcomeMetric'],
      learningNote: row.learning_note as string | undefined,
    }));
  } catch (err) {
    console.warn(`[pattern-memory] Exception: ${err}`);
    return [];
  }
}

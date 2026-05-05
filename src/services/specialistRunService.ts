// =============================================================================
// Specialist Run Service — Invokes AI analysis and queries run results
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  SpecialistInsight,
  SpecialistRecommendation,
  CrossSpecialistSignal,
  InsightType,
  InsightSeverity,
  InsightStatus,
  RecommendationStatus,
  BusinessView,
} from '@/types/specialist';
import type { AgentRun } from '@/types/agent';

// ─── Safeguard Utilities ────────────────────────────────────────────

/** Safe number parsing — returns fallback on NaN/undefined/null */
function safeNum(value: unknown, fallback: number = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Clamp a number to [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const VALID_SEVERITY = ['critical', 'high', 'medium', 'low'];
const VALID_INSIGHT_TYPE = ['anomaly', 'trend', 'pattern', 'risk'];
const VALID_EFFORT = ['low', 'medium', 'high'];
const VALID_IMPACT_TYPE = ['revenue', 'cost', 'risk', 'efficiency'];
const VALID_ACTION_SCOPE = ['strategic', 'tactical'];

/** Validate enum value, fallback to default if invalid */
function safeEnum<T extends string>(value: unknown, allowed: string[], fallback: T): T {
  if (typeof value === 'string' && allowed.includes(value.toLowerCase())) {
    return value.toLowerCase() as T;
  }
  return fallback;
}

// ─── Types ───────────────────────────────────────────────────────────

export interface RunFindings {
  executive_summary: {
    headline: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    value_at_stake: number;
    currency: string;
    key_finding: string;
    compared_to_previous: number;
  };
  insights: Array<{
    id: string;
    type: string;
    severity: string;
    headline: string;
    description: string;
    root_cause: string;
    root_cause_ranks?: number[];
    confidence: number;
    related_metrics: string[];
  }>;
  root_causes: Array<{
    rank: number;
    cause: string;
    contribution_pct: number;
    confidence: number;
    evidence: string[];
    insight_ids?: string[];
  }>;
  cross_specialist_signals: Array<{
    target_specialist: string;
    correlation_strength: number;
    causal_link: string;
  }>;
  metrics_snapshot: Record<string, unknown>;
  ai_summary: string;
  recommendations?: Array<{
    title: string;
    description: string;
    impact_type?: string;
    impact_value?: number;
    impact_confidence?: number;
    effort?: string;
    priority?: string;
    deadline?: string;
    root_cause_rank?: number;
    action_scope?: 'strategic' | 'tactical';
    insight_ids?: string[];
  }>;
}

export interface ExecutiveSummaryData {
  headline: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  valueAtStake: number;
  currency: string;
  keyFinding: string;
  comparedToPrevious: number;
}

export interface RootCauseItem {
  rank: number;
  cause: string;
  contributionPct: number;
  confidence: number;
  evidence: string[];
  insightIds?: string[];  // insight IDs attributed to this root cause
}

export interface ContextPanelData {
  monitoring: { metricName: string; };
  state: 'healthy' | 'degraded' | 'critical';
  confidence: number;
  lastChecked: string;
  impactScope: Array<{ label: string; value: string | number }>;
  whatChanged: Array<{ text: string; severity: 'critical' | 'high' | 'medium' | 'low' }>;
}

// ─── Trigger a Specialist Run ────────────────────────────────────────

export async function runSpecialist(
  specialistId: string,
  trigger: 'manual' | 'scheduled' = 'manual'
): Promise<{ runId: string; findings: RunFindings }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/run-specialist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
    },
    body: JSON.stringify({ specialist_id: specialistId, trigger }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Run failed with status ${response.status}`);
  }

  const result = await response.json();
  return { runId: result.run_id, findings: result.findings };
}

// ─── Get Latest Findings ─────────────────────────────────────────────

export async function getLatestFindings(specialistId: string): Promise<RunFindings | null> {
  const { data, error } = await supabase
    .from('agent_runs')
    .select('findings, started_at')
    .eq('agent_id', specialistId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch findings: ${error.message}`);
  if (!data || !data.findings) return null;
  return data.findings as unknown as RunFindings;
}

// ─── Get Specialist Insights (from latest run) ──────────────────────

export async function getSpecialistInsights(
  specialistId: string
): Promise<SpecialistInsight[]> {
  const findings = await getLatestFindings(specialistId);
  if (!findings || !findings.insights) return [];

  const { data: runData } = await supabase
    .from('agent_runs')
    .select('started_at')
    .eq('agent_id', specialistId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const detectedAt = runData?.started_at || new Date().toISOString();

  return findings.insights.map((ins) => ({
    id: ins.id || `ins-${Math.random().toString(36).slice(2, 8)}`,
    specialistId,
    type: safeEnum<InsightType>(ins.type, VALID_INSIGHT_TYPE, 'anomaly'),
    severity: safeEnum<InsightSeverity>(ins.severity, VALID_SEVERITY, 'medium'),
    headline: ins.headline || 'Untitled Insight',
    description: ins.description || undefined,
    rootCause: ins.root_cause || undefined,
    rootCauseRanks: Array.isArray(ins.root_cause_ranks) ? ins.root_cause_ranks : undefined,
    confidence: clamp(safeNum(ins.confidence, 50), 0, 100),
    detectedAt,
    status: 'new' as InsightStatus,
    relatedMetrics: Array.isArray(ins.related_metrics) ? ins.related_metrics : [],
  }));
}

// ─── Get Executive Summary ───────────────────────────────────────────

export async function getExecutiveSummary(
  specialistId: string
): Promise<ExecutiveSummaryData | null> {
  const findings = await getLatestFindings(specialistId);
  if (!findings?.executive_summary) return null;

  const es = findings.executive_summary;
  return {
    headline: es.headline || 'No headline',
    severity: safeEnum<'critical' | 'high' | 'medium' | 'low'>(es.severity, VALID_SEVERITY, 'medium'),
    valueAtStake: safeNum(es.value_at_stake),
    currency: es.currency || 'IDR',
    keyFinding: es.key_finding || '',
    comparedToPrevious: safeNum(es.compared_to_previous),
  };
}

// ─── Get Root Causes ─────────────────────────────────────────────────

export async function getRootCauses(specialistId: string): Promise<RootCauseItem[]> {
  const findings = await getLatestFindings(specialistId);
  if (!findings?.root_causes) return [];

  return findings.root_causes.map((rc) => ({
    rank: safeNum(rc.rank, 1),
    cause: rc.cause || 'Unknown cause',
    contributionPct: clamp(safeNum(rc.contribution_pct, 0), 0, 100),
    confidence: clamp(safeNum(rc.confidence, 50), 0, 100),
    evidence: Array.isArray(rc.evidence) ? rc.evidence : [],
    insightIds: Array.isArray(rc.insight_ids) ? rc.insight_ids : [],
  }));
}

// ─── Get Cross-Specialist Signals ────────────────────────────────────

export async function getCrossSpecialistSignals(
  specialistId: string
): Promise<CrossSpecialistSignal[]> {
  const findings = await getLatestFindings(specialistId);
  if (!findings?.cross_specialist_signals) return [];

  // Collect unique target specialist IDs to resolve names
  const targetIds = [
    ...new Set(findings.cross_specialist_signals.map((s) => s.target_specialist)),
  ];

  // Batch-fetch specialist names from DB
  const nameMap = new Map<string, string>();
  if (targetIds.length > 0) {
    const { data } = await supabase
      .from('specialists')
      .select('id, name')
      .in('id', targetIds);
    if (data) {
      for (const row of data) nameMap.set(row.id, row.name);
    }
  }

  return findings.cross_specialist_signals.map((sig) => ({
    sourceSpecialistId: specialistId,
    targetSpecialistId: sig.target_specialist,
    targetSpecialistName: nameMap.get(sig.target_specialist),
    correlationStrength: sig.correlation_strength,
    causalLink: sig.causal_link,
  }));
}

// ─── Get AI Summary ──────────────────────────────────────────────────

export async function getAISummary(specialistId: string): Promise<string | null> {
  const findings = await getLatestFindings(specialistId);
  return findings?.ai_summary || null;
}

// ─── Get Recommendations (from agent_recommendations table) ─────────
// Only fetches recommendations from the LATEST completed run so that
// stale recommendations from prior runs don't pollute the view.

export async function getSpecialistRecommendations(
  specialistId: string
): Promise<SpecialistRecommendation[]> {
  // 1. Get latest completed run_id for this specialist
  const { data: latestRun } = await supabase
    .from('agent_runs')
    .select('id')
    .eq('agent_id', specialistId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Build query — scope to latest run when available
  let query = supabase
    .from('agent_recommendations')
    .select('*')
    .eq('agent_id', specialistId)
    .order('created_at', { ascending: false });

  if (latestRun?.id) {
    query = query.eq('run_id', latestRun.id);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch recommendations: ${error.message}`);
  if (!data) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    specialistId,
    insightId: (row.insight_id as string) || undefined,
    title: (row.title as string) || 'Untitled Recommendation',
    description: (row.description as string) || '',
    impact: {
      type: safeEnum<'revenue' | 'cost' | 'risk' | 'efficiency'>(row.impact_type, VALID_IMPACT_TYPE, 'efficiency'),
      value: safeNum(row.impact_value) || safeNum(row.potential_impact_numeric),
      currency: (row.impact_currency as string) || 'IDR',
      confidence: clamp(safeNum(row.impact_confidence, 50), 0, 100),
    },
    effort: safeEnum<'low' | 'medium' | 'high'>(row.estimated_effort, VALID_EFFORT, 'medium'),
    deadline: (row.deadline as string) || undefined,
    status: (row.status as RecommendationStatus) || 'proposed',
    rootCauseRank: safeNum(row.root_cause_rank) || undefined,
    actionScope: safeEnum<'strategic' | 'tactical'>(row.action_scope, VALID_ACTION_SCOPE, 'tactical'),
    relatedInsightIds: row.insight_id ? [row.insight_id as string] : [],
    structuredContent: row.structured_content ? (() => {
      const sc = row.structured_content as Record<string, unknown>;
      const calc = sc.calculation as Record<string, unknown> | null;
      return {
        currentState: (sc.current_state as string) || '',
        targetState: (sc.target_state as string) || '',
        calculation: calc ? {
          lineItems: Array.isArray(calc.line_items) ? calc.line_items as string[] : [],
          assumptions: Array.isArray(calc.assumptions) ? calc.assumptions as string[] : undefined,
          result: (calc.result as string) || '',
        } : { lineItems: [], result: '' },
        quarterlyImpact: (sc.quarterly_impact as string) || '',
        tactics: Array.isArray(sc.tactics) ? sc.tactics as string[] : [],
      };
    })() : undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    galenAction: row.galen_action ? (() => {
      const ga = row.galen_action as Record<string, unknown>;
      if (ga.type !== 'create_specialist') return undefined;
      const VALID_BV = ['revenue', 'operations', 'customer-experience', 'cost-optimization', 'risk-compliance', 'fleet-assets'];
      // LLM sometimes returns domain names instead of business view keys — map them
      const DOMAIN_TO_BV: Record<string, string> = {
        commercial: 'revenue',
        'supply-chain': 'operations',
        customer: 'customer-experience',
        finance: 'cost-optimization',
      };
      const rawBv = ga.suggested_business_view as string;
      const resolvedBv = VALID_BV.includes(rawBv) ? rawBv : (DOMAIN_TO_BV[rawBv] || 'operations');
      return {
        type: 'create_specialist' as const,
        suggestedName: (ga.suggested_name as string) || '',
        suggestedBusinessView: resolvedBv as BusinessView,
        suggestedMetrics: Array.isArray(ga.suggested_metrics) ? ga.suggested_metrics as string[] : [],
        suggestedDescription: (ga.suggested_description as string) || '',
      };
    })() : undefined,
  }));
}

// ─── Update Recommendation Status ────────────────────────────────────

export async function updateRecommendationStatus(
  recommendationId: string,
  status: 'approved' | 'rejected' | 'executed' | 'measured'
): Promise<void> {
  const { error } = await supabase
    .from('agent_recommendations')
    .update({ status })
    .eq('id', recommendationId);

  if (error) throw new Error(`Failed to update recommendation: ${error.message}`);
}

// ─── Get Run History ─────────────────────────────────────────────────

export async function getSpecialistRunHistory(
  specialistId: string,
  limit: number = 20
): Promise<AgentRun[]> {
  const { data, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('agent_id', specialistId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch run history: ${error.message}`);
  if (!data) return [];

  return data.map((row: Record<string, unknown>) => {
    const findings = row.findings as Record<string, unknown> | null;
    return {
      id: row.id as string,
      agentId: (row.agent_id as string) || '',
      startedAt: (row.started_at as string) || new Date().toISOString(),
      completedAt: (row.completed_at as string) || undefined,
      status: (row.status as AgentRun['status']) || 'running',
      trigger: (row.trigger as AgentRun['trigger']) || 'manual',
      summary: (findings?.executive_summary as { headline?: string })?.headline || (findings?.ai_summary as string) || undefined,
      findingsCount: (findings?.insights as unknown[])?.length || undefined,
    };
  });
}

// ─── Batch Specialist Summaries (for list view) ─────────────────────

export interface SpecialistSummary {
  criticalInsights: number;
  highInsights: number;
  pendingActions: number;
  lastRunStatus: 'completed' | 'running' | 'pending' | 'failed' | null;
}

export async function getBatchSpecialistSummaries(
  specialistIds: string[],
): Promise<Record<string, SpecialistSummary>> {
  if (specialistIds.length === 0) return {};

  const result: Record<string, SpecialistSummary> = {};
  for (const id of specialistIds) {
    result[id] = { criticalInsights: 0, highInsights: 0, pendingActions: 0, lastRunStatus: null };
  }

  // 1) Fetch recommendation counts (status = 'proposed') for all specialists
  const { data: recs } = await supabase
    .from('agent_recommendations')
    .select('agent_id, status')
    .in('agent_id', specialistIds)
    .eq('status', 'proposed');

  if (recs) {
    for (const rec of recs) {
      const id = rec.agent_id as string;
      if (result[id]) result[id].pendingActions++;
    }
  }

  // 2) Fetch latest completed run per specialist to get insight counts
  //    We query the latest completed run for each specialist
  const { data: runs } = await supabase
    .from('agent_runs')
    .select('agent_id, status, findings')
    .in('agent_id', specialistIds)
    .order('started_at', { ascending: false });

  if (runs) {
    const seenCompleted = new Set<string>();
    const seenLatest = new Set<string>();
    for (const run of runs) {
      const id = run.agent_id as string;
      if (!result[id]) continue;

      // Track latest run status (first row per specialist = latest)
      if (!seenLatest.has(id)) {
        seenLatest.add(id);
        result[id].lastRunStatus = run.status as SpecialistSummary['lastRunStatus'];
      }

      // Extract insight severities from first completed run
      if (!seenCompleted.has(id) && run.status === 'completed') {
        seenCompleted.add(id);
        const findings = run.findings as Record<string, unknown> | null;
        const insights = (findings?.insights as Array<{ severity?: string }>) || [];
        for (const ins of insights) {
          if (ins.severity === 'critical') result[id].criticalInsights++;
          else if (ins.severity === 'high') result[id].highInsights++;
        }
      }
    }
  }

  return result;
}

// ─── Derive Context Panel Data ───────────────────────────────────────

export function deriveContextFromFindings(
  specialist: { name: string; domain: string; lastActiveAt?: string },
  findings: RunFindings | null
): ContextPanelData {
  if (!findings) {
    // Derive a reasonable metric name from the specialist's config or domain
    const domainFallback =
      specialist.domain === 'supply-chain' ? 'Operations' :
      specialist.domain === 'customer' ? 'Customer Experience' :
      specialist.domain === 'commercial' ? 'Revenue' : 'Finance';
    const metricName = (specialist as any).metrics?.[0]?.name || domainFallback;
    return {
      monitoring: { metricName },
      state: 'healthy',
      confidence: 0,
      lastChecked: specialist.lastActiveAt || new Date().toISOString(),
      impactScope: [],
      whatChanged: [],
    };
  }

  const es = findings.executive_summary;
  const state: 'healthy' | 'degraded' | 'critical' =
    es?.severity === 'critical' ? 'critical' :
    es?.severity === 'high' ? 'degraded' : 'healthy';

  const maxConfidence = findings.insights?.length
    ? Math.max(...findings.insights.map((i) => i.confidence || 0))
    : 0;

  const snapshot = findings.metrics_snapshot || {};

  const impactScope: Array<{ label: string; value: string | number }> = [];
  if (snapshot.primary_metric_name) {
    impactScope.push({ label: snapshot.primary_metric_name as string, value: snapshot.primary_metric_value as string || '—' });
  }
  const secondaryMetrics = snapshot.secondary_metrics as Array<{ name: string; value: string }> | undefined;
  if (secondaryMetrics) {
    for (const m of secondaryMetrics.slice(0, 3)) {
      impactScope.push({ label: m.name, value: m.value });
    }
  }

  // Insights as "what changed"
  const whatChanged = (findings.insights || []).slice(0, 4).map((ins) => ({
    text: ins.headline,
    severity: (ins.severity || 'medium') as 'critical' | 'high' | 'medium' | 'low',
  }));

  return {
    monitoring: { metricName: (snapshot.primary_metric_name as string) || specialist.domain },
    state,
    confidence: maxConfidence,
    lastChecked: specialist.lastActiveAt || new Date().toISOString(),
    impactScope,
    whatChanged,
  };
}

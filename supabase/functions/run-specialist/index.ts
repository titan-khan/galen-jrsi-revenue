// =============================================================================
// RUN-SPECIALIST EDGE FUNCTION
// Queries real DB data based on specialist config, sends to Claude for analysis,
// stores structured results in agent_runs + agent_recommendations.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { validateFindings, validateInvestigationFindings, computeConfidenceScoring, type ValidationResult } from "./findingsValidation.ts";
import { validateOutputAgainstData, type DataValidationResult } from "./outputValidator.ts";
import { buildDecompositionCharts, buildSummaryCharts, buildFunnelChartGeneric, KPR_FUNNEL_PIPELINE, buildAutoKeyMetrics, enhanceChartHeadlines, generateConvergenceInsight, buildPyramidCharts, type ChartBuildContext } from "./chartBuilder.ts";
import { runChartGuardrails, validateDataQuality, type GuardrailSummary } from "./chartGuardrails.ts";
import type { FunnelPipelineDefinition } from "./types.ts";
import { resolveQuerySpecsFromContext } from "./dataQueryEngine.ts";
import { detectAnomalies, type AnomalyDetectorResult } from "./anomalyDetector.ts";
import { decomposeMetrics, type DecompositionResult } from "./statisticalDecomposer.ts";
import { loadPatternMemory, type PatternMemoryEntry } from "./patternMemoryLoader.ts";
import { clusterAnomalies, type ClusterResult, type AnomalyCluster } from "./anomalyClusterEngine.ts";
import type { QueryContextSpec, QueryScope, SpecialistConfig } from "./types.ts";
import { ROLLING_13M_FLOOR, getQuerySpecsForDomain, applyScopeToSpecs, buildEffectiveScope } from "./domainQuerySpecs.ts";
import { computeSummaryStats, formatDbDataForPrompt } from "./summaryStats.ts";
import { buildSystemPrompt, buildInvestigationSystemPrompt, buildUserPrompt } from "./promptBuilder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Query Execution ─────────────────────────────────────────────────

async function executeQueries(
  supabase: ReturnType<typeof createClient>,
  specs: QueryContextSpec[]
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  const promises = specs.map(async (spec) => {
    try {
      let query = supabase.from(spec.table).select(spec.select.join(", "));

      if (spec.filters) {
        for (const f of spec.filters) {
          switch (f.operator) {
            case "eq":
              query = query.eq(f.field, f.value);
              break;
            case "gte":
              query = query.gte(f.field, f.value);
              break;
            case "lte":
              query = query.lte(f.field, f.value);
              break;
            case "in":
              query = query.in(
                f.field,
                Array.isArray(f.value) ? f.value : [f.value]
              );
              break;
          }
        }
      }
      if (spec.orderBy) {
        query = query.order(spec.orderBy.field, {
          ascending: spec.orderBy.ascending,
        });
      }
      if (spec.limit) {
        query = query.limit(spec.limit);
      }

      const { data: rows, error } = await query;
      if (error) {
        console.error(`Query error on ${spec.table}:`, error.message);
        return { table: spec.table, rows: [], error: error.message };
      }
      return { table: spec.table, rows: rows || [], error: undefined };
    } catch (err) {
      console.error(`Exception querying ${spec.table}:`, err);
      return { table: spec.table, rows: [], error: String(err) };
    }
  });

  const results = await Promise.all(promises);
  const queryErrors: string[] = [];
  let totalRows = 0;

  for (const r of results) {
    data[r.table] = r.rows;
    totalRows += r.rows.length;
    if (r.rows.length === 0 && r.error) {
      queryErrors.push(`${r.table}: ${r.error}`);
    }
  }

  // ── Data quality guardrail ──
  // Warn loudly when all queries return empty — this is almost certainly
  // a configuration bug (wrong domain, wrong column names, missing tables),
  // NOT a genuine "no data" situation.
  if (totalRows === 0) {
    const tableNames = specs.map(s => s.table).join(', ');
    console.error(`[DATA GUARDRAIL] ⚠️ ALL ${specs.length} queries returned 0 rows! Tables: [${tableNames}]`);
    if (queryErrors.length > 0) {
      console.error(`[DATA GUARDRAIL] Query errors detected:\n${queryErrors.join('\n')}`);
    }
    console.error(`[DATA GUARDRAIL] This likely indicates a domain/schema mismatch — the specialist may be querying tables that don't exist in this project.`);
  } else {
    console.log(`[run-specialist] Data loaded: ${totalRows} total rows across ${results.filter(r => r.rows.length > 0).length}/${results.length} tables`);
  }

  // Compute summary stats
  computeSummaryStats(data);
  return data;
}

// ─── Funnel Pipeline Inference ─────────────────────────────────────────
// Returns a FunnelPipelineDefinition from specialist config or domain defaults.
// Priority: config.knowledgeContext.funnelPipeline > domain default > null

// Columns in v_kpr_weekly_funnel that are specialist-monitorable metrics
const KPR_FUNNEL_METRIC_COLUMNS = new Set([
  'avg_contact_hours', 'avg_credit_decision_days', 'avg_review_days',
  'avg_underwriting_days', 'avg_cycle_days_funded', 'total_rework',
  'cases_with_rework', 'total_leads', 'funded', 'approved', 'dropped',
  'docs_submitted', 'credit_decided', 'cancelled_post_approval',
  'k14_pct', 'drop_off_rate', 'review_return_rate', 'review_rework_rate',
  'review_completion_rate', 'review_rejection_rate', 'review_acceptance_rate',
  'cancellation_rate', 'competitor_leakage', 'approval_disburse_rate',
  'pipeline_coverage', 'doc_defect_rate',
]);

function resolveFunnelPipeline(
  config: { knowledgeContext?: { funnelPipeline?: FunnelPipelineDefinition; tables?: Array<{ table: string }> } | null },
  domain: string,
  dbData: Record<string, unknown>,
  resolvedMeasures?: string[],
): FunnelPipelineDefinition | null {
  // 1. Explicit pipeline from specialist knowledge context (always respected)
  if (config.knowledgeContext?.funnelPipeline) {
    return config.knowledgeContext.funnelPipeline;
  }
  // 2. Explicit table in knowledge context
  const contextTables = (config.knowledgeContext?.tables || []).map(t => t.table);
  if (contextTables.includes("v_kpr_weekly_funnel")) {
    if (domain === "banking" && Array.isArray(dbData["v_kpr_weekly_funnel"]) && (dbData["v_kpr_weekly_funnel"] as unknown[]).length > 0) {
      return KPR_FUNNEL_PIPELINE;
    }
  }
  // 3. Auto-detect: specialist's resolved measures overlap with funnel table columns
  if (domain === "banking" && Array.isArray(dbData["v_kpr_weekly_funnel"]) && (dbData["v_kpr_weekly_funnel"] as unknown[]).length > 0) {
    if (resolvedMeasures && resolvedMeasures.length > 0) {
      const hasFunnelMetric = resolvedMeasures.some(m => KPR_FUNNEL_METRIC_COLUMNS.has(m));
      if (hasFunnelMetric) {
        console.log(`[run-specialist] Auto-detected funnel relevance: measures [${resolvedMeasures.filter(m => KPR_FUNNEL_METRIC_COLUMNS.has(m)).join(', ')}] found in funnel table`);
        return KPR_FUNNEL_PIPELINE;
      }
    }
    console.log(`[run-specialist] Skipping funnel — measures [${(resolvedMeasures || []).join(', ')}] not in funnel table`);
    return null;
  }
  return null;
}

// ─── Domain → Skill Name Mapping ─────────────────────────────────────

const DOMAIN_SKILL_MAP: Record<string, string[]> = {
  "supply-chain": ["operational-excellence", "root-cause-analysis"],
  "commercial": ["revenue-analysis", "root-cause-analysis"],
  "customer": ["nps-analysis", "root-cause-analysis"],
  "finance": ["revenue-analysis", "root-cause-analysis"],
  "logistiq-revenue": ["revenue-analysis", "root-cause-analysis"],
  "banking": ["operational-excellence", "root-cause-analysis"],
};

/**
 * Fetch ALL matching skills for this specialist's domain.
 * Returns concatenated skill_md_body methodologies so every mapped skill
 * (e.g. "revenue-analysis" + "root-cause-analysis") gets injected.
 */
async function fetchSkillMethodology(
  supabase: ReturnType<typeof createClient>,
  domain: string,
  skillIds?: string[],
): Promise<{ skillId: string; skillName: string; methodology: string } | null> {
  // 1. If specialist has explicit skill_ids, use those first
  if (skillIds && skillIds.length > 0) {
    const { data } = await supabase
      .from("agent_skills")
      .select("id, name, display_name, skill_md_body")
      .in("id", skillIds)
      .eq("is_active", true)
      .not("skill_md_body", "is", null);

    if (data && data.length > 0) {
      const withBody = data.filter((d: { skill_md_body?: string }) => d.skill_md_body);
      if (withBody.length > 0) {
        return {
          skillId: withBody[0].id,
          skillName: withBody.map((d: { name: string }) => d.name).join(", "),
          methodology: withBody.map((d: { skill_md_body: string }) => d.skill_md_body).join("\n\n---\n\n"),
        };
      }
    }
  }

  // 2. Fall back to domain → skill name mapping
  const skillNames = DOMAIN_SKILL_MAP[domain];
  if (!skillNames || skillNames.length === 0) return null;

  const { data } = await supabase
    .from("agent_skills")
    .select("id, name, display_name, skill_md_body")
    .in("name", skillNames)
    .eq("is_active", true)
    .not("skill_md_body", "is", null)
    .order("name", { ascending: true });

  if (data && data.length > 0) {
    const withBody = data.filter((d: { skill_md_body?: string }) => d.skill_md_body);
    if (withBody.length > 0) {
      return {
        skillId: withBody[0].id,
        skillName: withBody.map((d: { name: string }) => d.name).join(", "),
        methodology: withBody.map((d: { skill_md_body: string }) => d.skill_md_body).join("\n\n---\n\n"),
      };
    }
  }

  return null;
}

// ─── Main Handler ────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { specialist_id, trigger = "manual", scope: requestScope } = await req.json() as {
      specialist_id: string;
      trigger?: string;
      scope?: QueryScope;
    };

    if (!specialist_id) {
      return new Response(
        JSON.stringify({ error: "specialist_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Load specialist config
    console.log(`[run-specialist] Loading specialist ${specialist_id}`);
    const { data: specialist, error: specError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", specialist_id)
      .eq("entity_type", "specialist")
      .single();

    if (specError || !specialist) {
      return new Response(
        JSON.stringify({ error: `Specialist not found: ${specError?.message || specialist_id}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = (specialist.specialist_config || {}) as SpecialistConfig;

    // 1b. Self-healing: auto-fail any stuck runs for this specialist
    // When Supabase kills an edge function at 150s, the catch block never runs,
    // leaving agent_runs stuck in 'running' forever. Clean them up here.
    const STUCK_THRESHOLD_MIN = 10;
    const stuckCutoff = new Date(Date.now() - STUCK_THRESHOLD_MIN * 60 * 1000).toISOString();
    const { data: stuckRuns, error: stuckErr } = await supabase
      .from("agent_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: `Auto-failed: stuck in running/pending state for >${STUCK_THRESHOLD_MIN} minutes (edge function likely timed out)`,
      })
      .eq("agent_id", specialist_id)
      .in("status", ["running", "pending"])
      .lt("started_at", stuckCutoff)
      .select("id");

    if (stuckRuns && stuckRuns.length > 0) {
      console.warn(`[run-specialist] Auto-failed ${stuckRuns.length} stuck run(s): ${stuckRuns.map((r: { id: string }) => r.id).join(", ")}`);
    }
    if (stuckErr) {
      console.error("[run-specialist] Failed to cleanup stuck runs:", stuckErr.message);
    }

    // 2. Create run record
    const { data: run, error: runError } = await supabase
      .from("agent_runs")
      .insert({
        agent_id: specialist_id,
        status: "running",
        trigger,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runError) {
      return new Response(
        JSON.stringify({ error: `Failed to create run: ${runError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const runId = run.id;
    console.log(`[run-specialist] Created run ${runId} for ${specialist.name}`);

    try {
      // ── FAIL-LOUD: Validate critical config before proceeding ──
      const _warnings: string[] = [];

      if (!specialist.domain) {
        _warnings.push(`CRITICAL: specialist "${specialist.name}" has no domain set — defaulting to banking. Fix in agents table.`);
        console.error(`[run-specialist] ⛔ ${_warnings[_warnings.length - 1]}`);
      }

      // 3. Query relevant data — merge domain defaults with knowledge context
      //    Domain specs provide the base (e.g. v_kpr_weekly_funnel for banking),
      //    knowledge context adds/overrides specialist-specific tables.
      const domain = specialist.domain || "banking";
      const knowledgeContext = config.knowledgeContext || null;
      const domainSpecs = getQuerySpecsForDomain(domain, config);
      const contextSpecs = resolveQuerySpecsFromContext(knowledgeContext, ROLLING_13M_FLOOR);
      // Merge: context specs override domain specs for same table, domain fills gaps
      let querySpecs: typeof domainSpecs;
      if (!contextSpecs) {
        querySpecs = domainSpecs;
      } else {
        const contextTables = new Set(contextSpecs.map(s => s.table));
        const domainExtras = domainSpecs.filter(s => !contextTables.has(s.table));
        querySpecs = [...contextSpecs, ...domainExtras];
      }
      // Apply runtime scope (time range, dimension filters) to all specs.
      // Merge config-level filters (monitoringScope.filters) with request-level
      // filters; request-scope filters override config filters on same field.
      const effectiveScope = buildEffectiveScope(config, requestScope);
      const hasAnyScope =
        requestScope !== undefined ||
        (effectiveScope.structuredFilters && effectiveScope.structuredFilters.length > 0);
      if (hasAnyScope) {
        querySpecs = applyScopeToSpecs(querySpecs, effectiveScope);
        console.log(`[run-specialist] Applied query scope: ${JSON.stringify(effectiveScope)}`);
      }

      console.log(`[run-specialist] Querying ${querySpecs.length} tables for domain: ${domain} (context: ${contextSpecs?.length ?? 0}, domain: ${domainSpecs.length}, merged: ${querySpecs.length})`);

      if (querySpecs.length === 0) {
        const msg = `No query specs resolved for domain "${domain}" — specialist "${specialist.name}" has no data sources configured`;
        console.error(`[run-specialist] ⛔ ${msg}`);
        _warnings.push(msg);
        // Still continue — will produce empty analysis with warning
      }

      const dbData = await executeQueries(supabase, querySpecs);

      // DG-01: Pre-chart data quality validation
      const dataQuality = validateDataQuality(dbData);

      // 3b. Resolve specialist metrics → DB column names from metric_definitions
      const metricNames = config.monitoringScope?.metrics || [];
      let resolvedMeasures: string[] = [];
      if (metricNames.length > 0) {
        const { data: metricDefs } = await supabase
          .from('metric_definitions')
          .select('name, measure, recommended_dimensions')
          .in('name', metricNames);
        resolvedMeasures = (metricDefs || []).map((d: { name: string; measure: string }) => d.measure);
        console.log(`[run-specialist] Resolved ${resolvedMeasures.length}/${metricNames.length} metric measures: [${resolvedMeasures.join(', ')}]`);

        // Safety net: if some metrics couldn't be resolved, log warning
        const unresolvedCount = metricNames.length - resolvedMeasures.length;
        if (unresolvedCount > 0) {
          const resolvedNames = new Set((metricDefs || []).map((d: { name: string }) => d.name));
          const unresolved = metricNames.filter(n => !resolvedNames.has(n));
          console.warn(`[run-specialist] ${unresolvedCount} metric(s) not in metric_definitions: [${unresolved.join(', ')}]`);
          // If NONE resolved, disable filtering entirely to avoid empty charts
          if (resolvedMeasures.length === 0) {
            const msg = `CRITICAL: No metrics resolved from metric_definitions for [${metricNames.join(', ')}] — chart filtering disabled`;
            console.error(`[run-specialist] ⛔ ${msg}`);
            _warnings.push(msg);
            resolvedMeasures = [];
          }
        }
      }

      // 3c. Auto-derive dimensions from metric_definitions when specialist has none configured
      let effectiveDimensions = config.monitoringScope?.dimensions as string[] | undefined;
      if (!effectiveDimensions?.length && metricNames.length > 0) {
        const metricDefs = (await supabase
          .from('metric_definitions')
          .select('recommended_dimensions')
          .in('name', metricNames)
          .not('recommended_dimensions', 'eq', '{}')).data;

        if (metricDefs && metricDefs.length > 0) {
          const dimFreq = new Map<string, number>();
          for (const md of metricDefs) {
            const dims = (md.recommended_dimensions as string[]) || [];
            for (const d of dims) {
              dimFreq.set(d, (dimFreq.get(d) || 0) + 1);
            }
          }
          // Sort: dimensions recommended by more metrics come first
          effectiveDimensions = [...dimFreq.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([dim]) => dim);
          console.log(`[run-specialist] Auto-derived dimensions from metric_definitions: [${effectiveDimensions.join(', ')}]`);
        }
      }
      if (effectiveDimensions?.length) {
        console.log(`[run-specialist] Using dimensions: [${effectiveDimensions.join(', ')}] (${config.monitoringScope?.dimensions?.length ? 'configured' : 'auto-derived'})`);
      }

      // 4. Load other specialists for cross-specialist signals
      const { data: otherSpecs } = await supabase
        .from("agents")
        .select("name, domain")
        .eq("entity_type", "specialist")
        .eq("status", "active")
        .neq("id", specialist_id);
      const otherSpecialists = (otherSpecs || []).map(
        (s: { name: string; domain: string }) => `${s.name} (${s.domain})`
      );

      // 4b. Statistical pre-processing (L5 pipeline — no LLM)
      // Each step is isolated: a failure in one step doesn't block the others.
      // Failures are tracked in preprocessingWarnings so the frontend can show
      // a "partial analysis" banner and the user knows what's degraded.
      let anomalyResult: AnomalyDetectorResult | null = null;
      let decomposition: DecompositionResult[] | null = null;
      let patternMemoryEntries: PatternMemoryEntry[] | null = null;
      const preprocessingWarnings: Array<{ step: string; error: string }> = [];

      // Step 1: Anomaly detection
      try {
        anomalyResult = detectAnomalies(
          dbData,
          knowledgeContext?.thresholdConfig || undefined,
          config.monitoringRules || undefined,
        );
        console.log(`[run-specialist] Anomaly detection: ${anomalyResult.anomalies.length} anomalies found`);
      } catch (anomalyErr) {
        const msg = anomalyErr instanceof Error ? anomalyErr.message : String(anomalyErr);
        preprocessingWarnings.push({ step: 'anomaly_detection', error: msg });
        console.error(`[run-specialist] Anomaly detection FAILED: ${msg}. Continuing without anomaly data.`);
      }

      // Step 2: Metric decomposition (can run without anomalies — falls back to all metrics)
      try {
        decomposition = decomposeMetrics(
          dbData,
          effectiveDimensions,
          anomalyResult && anomalyResult.anomalies.length > 0 ? anomalyResult.anomalies : undefined,
          resolvedMeasures,
        );
        console.log(`[run-specialist] Decomposition: ${decomposition.length} results`);
      } catch (decompErr) {
        const msg = decompErr instanceof Error ? decompErr.message : String(decompErr);
        preprocessingWarnings.push({ step: 'decomposition', error: msg });
        console.error(`[run-specialist] Decomposition FAILED: ${msg}. Continuing without decomposition data.`);
      }

      // Step 3: Pattern memory (historical precedents)
      try {
        patternMemoryEntries = await loadPatternMemory(supabase, specialist_id);
        console.log(`[run-specialist] Pattern memory: ${patternMemoryEntries.length} entries loaded`);
      } catch (memErr) {
        const msg = memErr instanceof Error ? memErr.message : String(memErr);
        preprocessingWarnings.push({ step: 'pattern_memory', error: msg });
        console.error(`[run-specialist] Pattern memory FAILED: ${msg}. Continuing without historical patterns.`);
      }

      if (preprocessingWarnings.length > 0) {
        console.warn(`[run-specialist] ${preprocessingWarnings.length} pre-processing step(s) failed: ${preprocessingWarnings.map(w => w.step).join(', ')}`);
      }

      // 4c. Cluster detection — all runs use the investigation pipeline
      let clusterResult: ClusterResult | null = null;
      const invTriggers = knowledgeContext?.investigationTriggers;
      const minClusterSize = invTriggers?.minClusterSize ?? knowledgeContext?.clusterConfig?.minAnomaliesForInvestigation ?? 3;

      if (anomalyResult && anomalyResult.anomalies.length >= minClusterSize) {
        try {
          clusterResult = clusterAnomalies(anomalyResult.anomalies, knowledgeContext);
          console.log(`[run-specialist] Clustering: ${clusterResult.clusters.length} clusters found`);
        } catch (clusterErr) {
          const msg = clusterErr instanceof Error ? clusterErr.message : String(clusterErr);
          preprocessingWarnings.push({ step: 'clustering', error: msg });
          console.error(`[run-specialist] Clustering FAILED: ${msg}. Continuing without cluster analysis.`);
        }
      }

      const hasCluster = clusterResult && clusterResult.clusters.length > 0;

      // Create synthetic cluster if no organic cluster exists
      // Case A: anomalies exist but < minClusterSize → bundle them into a synthetic cluster
      // Case B: zero anomalies (healthy metrics) → create a placeholder anomaly
      if (!hasCluster) {
        const hasAnomalies = anomalyResult && anomalyResult.anomalies.length > 0;
        const syntheticAnomalies = hasAnomalies
          ? anomalyResult!.anomalies
          : [{
              metric: specialist.name || 'Primary Metric',
              currentValue: 0,
              expectedValue: 0,
              deviation: 0,
              deviationType: 'threshold' as const,
              severity: 'medium' as const,
              dimensions: {},
              method: 'manual-investigation',
              description: `Manual investigation triggered for ${specialist.name}. No statistical anomalies detected — investigating overall performance.`,
            }];
        console.log(`[run-specialist] Manual investigation: creating synthetic cluster (${hasAnomalies ? syntheticAnomalies.length + ' real anomalies' : 'no anomalies, using placeholder'})`);
        const timestamp = Date.now().toString(36);
        const hash = Math.random().toString(36).slice(2, 6);
        clusterResult = {
          clusters: [{
            clusterId: `CLU-${timestamp}-${hash}`,
            anomalies: syntheticAnomalies,
            clusterScore: 1.0,
            scoringBreakdown: { dimensionOverlap: 1, dataSourceProximity: 1, causalChain: 0, temporalBonus: 0 },
            sharedDimensions: {},
            status: 'auto' as const,
          }],
          standaloneAnomalies: [],
        };
      }

      if (clusterResult && clusterResult.clusters.length > 0) {
        // ── INVESTIGATION PIPELINE ──────────────────────
        const cluster = clusterResult.clusters[0]; // primary cluster
        console.log(`[run-specialist] INVESTIGATION mode: cluster ${cluster.clusterId}, ${cluster.anomalies.length} anomalies, score=${cluster.clusterScore}`);

        // Serialized cluster data — computed once, reused across phase updates
        const serializedCluster = {
          clusterId: cluster.clusterId,
          anomalies: cluster.anomalies.map(a => ({
            metric: a.metric,
            value: a.currentValue,
            threshold: a.expectedValue,
            severity: a.severity,
            dimensions: a.dimensions || {},
          })),
          clusterScore: cluster.clusterScore,
          sharedDimensions: cluster.sharedDimensions,
        };

        // Update run record with investigation type and clustering phase
        await supabase.from("agent_runs").update({
          run_type: 'investigation',
          findings: {
            _type: 'investigation',
            _phase: 'clustering',
            cluster: serializedCluster,
          },
        }).eq("id", runId);

        // Phase 1: Multi-metric decomposition (uses anomalies if available, else all metrics)
        const investigationDecomposition = decomposeMetrics(
          dbData,
          effectiveDimensions,
          cluster.anomalies.length > 0 ? cluster.anomalies : undefined,
          resolvedMeasures,
        );
        console.log(`[run-specialist] Investigation decomposition: ${investigationDecomposition.length} results`);

        // Compute convergence: which dimensions appear across multiple anomaly decompositions
        const dimAppearances: Record<string, { metrics: Set<string>; totalContrib: number; count: number }> = {};
        for (const dec of investigationDecomposition) {
          for (const contrib of dec.topContributors) {
            const key = `${contrib.dimension}=${contrib.value}`;
            if (!dimAppearances[key]) {
              dimAppearances[key] = { metrics: new Set(), totalContrib: 0, count: 0 };
            }
            dimAppearances[key].metrics.add(dec.metric);
            dimAppearances[key].totalContrib += contrib.contribution;
            dimAppearances[key].count++;
          }
        }

        const convergence = Object.entries(dimAppearances)
          .filter(([, v]) => v.metrics.size >= 2) // appears in 2+ metrics
          .map(([key, v]) => {
            const [dimension, ...valueParts] = key.split('=');
            return {
              dimension,
              value: valueParts.join('='),
              appearsInMetrics: [...v.metrics],
              contributionAvg: Math.round((v.totalContrib / v.count) * 100) / 100,
            };
          })
          .sort((a, b) => b.appearsInMetrics.length - a.appearsInMetrics.length);

        // AI-generate convergence insight (2 sentences max, runs in parallel with chart building)
        const convergenceInsightPromise = generateConvergenceInsight(convergence, investigationDecomposition, specialist.name || 'Specialist');

        // Auto-generate decomposition charts from decomposition results
        // ── Decomposition charts (Phase 3: filter by significance, cap at 4) ──
        // Build charts using shared chart builder (eliminates duplication with standard path)
        const chartCtx: ChartBuildContext = {
          dbData,
          thresholds: knowledgeContext?.thresholdConfig || [],
          anomalies: anomalyResult?.anomalies || [],
          resolvedMeasures,
        };

        // Pyramid decomposition: progressive drill-down charts (L0 → L3)
        // Falls back to flat decomposition if pyramid produces no charts
        const pyramidCharts = buildPyramidCharts(
          investigationDecomposition, dbData, convergence, resolvedMeasures,
          knowledgeContext?.dimensionPriority || effectiveDimensions,
        );
        const decompositionCharts = pyramidCharts.length > 0
          ? pyramidCharts
          : buildDecompositionCharts(investigationDecomposition, resolvedMeasures);
        console.log(`[run-specialist] Pyramid charts: ${pyramidCharts.length}, fallback flat: ${pyramidCharts.length === 0}`);

        let summaryCharts = buildSummaryCharts(chartCtx);

        // Add funnel/Sankey chart from pipeline definition (generic)
        const funnelPipeline = resolveFunnelPipeline(config, domain, dbData, resolvedMeasures);
        if (funnelPipeline) {
          const funnelChart = buildFunnelChartGeneric(dbData, funnelPipeline);
          if (funnelChart) {
            summaryCharts.push(funnelChart);
            console.log(`[run-specialist] Funnel chart generated: ${funnelChart.id} (pipeline: ${funnelPipeline.id})`);
          } else {
            const rows = Array.isArray(dbData[funnelPipeline.sourceTable]) ? (dbData[funnelPipeline.sourceTable] as unknown[]).length : 0;
            console.warn(`[run-specialist] ⚠️ ${funnelPipeline.sourceTable} has ${rows} rows but funnel chart returned null`);
          }
        }

        // AI-enhance chart headlines (single batch call to Haiku)
        const allCharts = [...summaryCharts, ...decompositionCharts];
        const guardrailStats = { headlinesRejected: 0 };
        const enhanced = await enhanceChartHeadlines(allCharts, specialist.name || 'Specialist', guardrailStats);
        summaryCharts = enhanced.filter(c => c.layer === 'summary');
        const renderedDecompCharts = enhanced.filter(c => c.layer === 'decomposition');

        // ── CHART GUARDRAILS: Validate all charts before storage ──
        const chartGuardrailResult = runChartGuardrails([...summaryCharts, ...renderedDecompCharts]);
        chartGuardrailResult.headlinesRejected = guardrailStats.headlinesRejected;
        chartGuardrailResult.score = Math.max(0, chartGuardrailResult.score - guardrailStats.headlinesRejected * 10);
        // DG-01: Attach pre-chart data quality results
        chartGuardrailResult.dataQuality = {
          validTables: dataQuality.validTables.length,
          emptyTables: dataQuality.emptyTables.length,
          typeWarnings: dataQuality.typeWarnings.length,
        };
        chartGuardrailResult.score = Math.max(0, chartGuardrailResult.score - dataQuality.emptyTables.length * 3);
        chartGuardrailResult.warnings.push(...dataQuality.typeWarnings);

        const autoKeyMetrics = buildAutoKeyMetrics(summaryCharts);
        const renderedSummaryCharts = summaryCharts;

        // Await convergence insight (started earlier in parallel)
        const convergenceInsight = await convergenceInsightPromise;
        console.log(`[run-specialist] Convergence insight: ${convergenceInsight ? convergenceInsight.slice(0, 80) + '...' : 'none'}`);

        // Update with decomposition phase
        await supabase.from("agent_runs").update({
          findings: {
            _type: 'investigation',
            _phase: 'decomposition',
            _guardrailSummary: chartGuardrailResult,
            cluster: serializedCluster,
            summaryCharts: renderedSummaryCharts,
            decomposition: {
              perMetric: investigationDecomposition,
              convergence,
              convergenceInsight,
              charts: renderedDecompCharts,
            },
          },
        }).eq("id", runId);

        // Phase 2: Fetch skill + build investigation prompt + call Claude
        const skillData = await fetchSkillMethodology(supabase, domain, specialist.skill_ids || undefined);
        const dbDataText = formatDbDataForPrompt(dbData);

        const investigationSystemPrompt = buildInvestigationSystemPrompt(
          { name: specialist.name, domain, description: specialist.description || "" },
          skillData?.methodology,
          knowledgeContext,
        );

        // Build rich investigation user prompt
        const anomalyListText = cluster.anomalies.map((a, i) =>
          `${i + 1}. **${a.metric}**: current=${a.currentValue}, expected=${a.expectedValue}, severity=${a.severity}, deviation=${a.deviation.toFixed(2)}${a.dimensions ? `, dimensions=${JSON.stringify(a.dimensions)}` : ''}`
        ).join('\n');

        const convergenceText = convergence.length > 0
          ? `DECOMPOSITION CONVERGENCE:\n${convergence.map(c => `- "${c.dimension}=${c.value}" appears in ${c.appearsInMetrics.length} metrics (${c.appearsInMetrics.join(', ')}), avg contribution ${c.contributionAvg}%`).join('\n')}`
          : 'No significant cross-metric convergence detected.';

        const decompositionText = investigationDecomposition.length > 0
          ? `PER-METRIC DECOMPOSITION:\n${investigationDecomposition.map(d => `- ${d.metric}: top contributors = ${d.topContributors.slice(0, 3).map(c => `${c.dimension}=${c.value} (${c.contribution}%)`).join(', ')}`).join('\n')}`
          : '';

        const processChainText = knowledgeContext?.processChain
          ? `PROCESS CHAIN:\n${knowledgeContext.processChain.map(s => `Stage ${s.order}: ${s.name} (${s.id})${s.metrics ? ` — metrics: ${s.metrics.join(', ')}` : ''}`).join('\n')}`
          : '';

        const failureModesText = knowledgeContext?.failureModeLibrary
          ? `FAILURE MODES:\n${knowledgeContext.failureModeLibrary.map(f => `- ${f.name} (stage: ${f.stageId}): ${f.description || ''}`).join('\n')}`
          : '';

        const patternMemoryText = patternMemoryEntries && patternMemoryEntries.length > 0
          ? `PATTERN MEMORY:\n${patternMemoryEntries.map(p => `- ${p.anomaly_signature?.metric || 'unknown'}: root_cause=${p.confirmed_root_cause || 'unknown'}, outcome=${p.outcome || 'unknown'}`).join('\n')}`
          : '';

        // Business impact model — config-driven formula for revenue/cost impact estimation
        const impactModel = knowledgeContext?.impactModel;
        const impactModelText = impactModel
          ? `BUSINESS IMPACT MODEL (use this formula for revenue_impact calculation):
Formula: ${impactModel.formula}
Variables:
${Object.entries(impactModel.variables).map(([k, v]) => `  ${k}: source=${v.source}${v.aggregation ? `, aggregation=${v.aggregation}` : ''}${v.period ? `, period=${v.period}` : ''}${v.calculation ? `, calculation=${v.calculation}` : ''}`).join('\n')}
Currency: ${impactModel.currency || 'IDR'}
Display unit: ${impactModel.displayUnit || 'auto'}`
          : '';

        // Pyramid decomposition context for LLM
        const pyramidText = pyramidCharts.length > 0
          ? `PYRAMID DECOMPOSITION (${pyramidCharts.length} charts generated):
The system has generated a progressive drill-down chart sequence following the Pyramid Principle.
Each chart filters deeper into the problem entity — do NOT generate duplicate decomposition charts.
${pyramidCharts.map(c => {
  const p = c.pyramid as { level: number; focusEntity?: string; filters?: Array<{ dimension: string; value: string }>; question?: string } | undefined;
  return p ? `- L${p.level}: "${c.title}" (focus: ${p.focusEntity || 'all'}, filters: ${p.filters?.map((f: { dimension: string; value: string }) => `${f.dimension}=${f.value}`).join(', ') || 'none'}, answers: "${p.question}")` : '';
}).filter(Boolean).join('\n')}
Reference pyramid levels in your findings when relevant.`
          : '';

        // ── DATA PERIOD COMPUTATION ──────────────────────────
        const allDates: Date[] = [];
        const dateFieldsFromSpecs = new Set(querySpecs.map(s => s.dateField).filter(Boolean) as string[]);
        const dateFields = dateFieldsFromSpecs.size > 0
          ? [...dateFieldsFromSpecs]
          : ['order_date', 'period', 'date', 'week_start', 'created_at'];
        for (const tableRows of Object.values(dbData)) {
          if (!Array.isArray(tableRows)) continue;
          for (const row of tableRows as Record<string, unknown>[]) {
            for (const f of dateFields) {
              if (row[f] != null) {
                const raw = row[f];
                if (typeof raw === 'number' || (typeof raw === 'string' && /^\d{1,4}$/.test(raw.trim()))) continue;
                const d = new Date(raw as string);
                if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) allDates.push(d);
              }
            }
          }
        }

        const dataPeriod = allDates.length > 0
          ? {
              from: new Date(allDates.reduce((min, d) => d.getTime() < min ? d.getTime() : min, Infinity)).toISOString().slice(0, 10),
              to:   new Date(allDates.reduce((max, d) => d.getTime() > max ? d.getTime() : max, -Infinity)).toISOString().slice(0, 10),
              type: 'auto' as const,
            }
          : null;

        if (dataPeriod) {
          console.log(`[run-specialist] Data period: ${dataPeriod.from} to ${dataPeriod.to}`);
        }

        const periodContext = dataPeriod
          ? `\nDATA PERIOD ANALYZED: ${dataPeriod.from} to ${dataPeriod.to}\n`
          : '';

        const investigationUserPrompt = periodContext + `You are conducting a deep investigation of a CLUSTER of ${cluster.anomalies.length} related anomalies for specialist "${specialist.name}".

CLUSTER OVERVIEW:
Cluster ID: ${cluster.clusterId}
Cluster Score: ${cluster.clusterScore} (shared dimensions: ${JSON.stringify(cluster.sharedDimensions)})

TRIGGERED ANOMALIES:
${anomalyListText}

${convergenceText}

${decompositionText}

${pyramidText}

${processChainText}

${failureModesText}

${patternMemoryText}

${impactModelText}

DATA SNAPSHOT:
${dbDataText}

TASK — Produce a JSON investigation report with this exact structure:
{
  "title": "string — investigation title (e.g., 'Capacity Bottleneck Impact on Pipeline Conversion')",
  "subtitle": "string — descriptive subtitle with scope and period",
  "executive_summary": "string — 3-5 sentence narrative: what happened, why, what to do",
  "severity": "critical | high | medium | low",
  "confidence": "HIGH | MEDIUM | LOW",
  "root_cause": {
    "summary": "string — single unified root cause that explains ALL anomalies",
    "failure_mode": "string — failure mode name (from library if applicable)",
    "mechanism": "string — 2-3 sentence explanation of HOW root cause produces each anomaly",
    "evidence_chain": [
      {
        "id": 1,
        "signal": "string — what data signal was observed",
        "finding": "string — what this signal means, citing specific metric values",
        "has_chart": false
      }
    ],
    "alternatives_eliminated": ["string — alternative hypotheses considered and why rejected"]
  },
  "revenue_impact": {
    "estimated_loss": number (currency amount),
    "currency": "string (e.g., IDR, USD)",
    "period": "string (e.g., '4 weeks', 'monthly')",
    "model": "baseline_gap",
    "current_vs_potential": [
      { "metric": "string", "current": "string", "potential": "string" }
    ]
  },
  "recommendations": [
    {
      "tier": "immediate | short_term | structural",
      "title": "string",
      "description": "string — business rationale",
      "responsible": "string — role or team",
      "expected_impact": "string — short qualitative summary (e.g. 'Mencegah ~13 korban MD/kuartal')",
      "timeline": "string (e.g., 'This week', '2-4 weeks', '1-2 months')",
      "priority": "CRITICAL | HIGH | MEDIUM",
      "effort": "low | medium | high",
      "current_state": "string — current problem state with numbers",
      "target_state": "string — measurable goal",
      "calculation": {
        "line_items": ["string array — step-by-step math deriving impact_value (5 lines per JRSI IDR methodology when applicable)"],
        "assumptions": ["string array — stated prevention-rate / elasticity assumptions"],
        "result": "string — bottom-line QUARTERLY outcome that MUST equal impact_value (e.g. 'Total beban santunan dihindari per kuartal: Rp 268jt')"
      },
      "quarterly_impact": "string — net quarterly summary (e.g. 'Mencegah ~5,7 korban MD/kuartal = avoided santunan Rp 268jt')",
      "tactics": ["string array — 3-5 specific, time-bound implementation steps"],
      "impact_value": "number — QUARTERLY IDR impact, MUST equal calculation.result. NEVER null or 0 — if unable to quantify, rewrite the recommendation."
    }
  ],
  "monitoring_plan": [
    {
      "metric": "string",
      "current": "string — current value",
      "target_2w": "string — 2-week recovery target",
      "target_4w": "string — 4-week recovery target",
      "re_alert_threshold": "string — re-alert if exceeds this"
    }
  ],
  "trust_assessment": {
    "gate_1": { "score": number (0-1), "level": "HIGH | MEDIUM | LOW", "detail": "string — data quality assessment" },
    "gate_2": { "level": "HIGH | MEDIUM | LOW", "detail": "string — analytical rigor assessment" },
    "gate_3": { "level": "HIGH | MEDIUM | LOW", "detail": "string — actionability assessment" }
  },
  "findings": [
    {
      "id": 1,
      "title": "string — concise finding title",
      "severity": "high | medium | low",
      "impact_contribution": 0.0,
      "impact_value": "string — human-readable impact (e.g., 'Rp 34 Miliar', '$2.1M')",
      "evidence": [
        {
          "id": 1,
          "signal": "string — what data signal was observed",
          "finding": "string — what this signal means, citing specific metric values"
        }
      ],
      "recommendations": [
        {
          "tier": "immediate | short_term | structural",
          "title": "string — IMPORTANT: must EXACTLY match the title of the corresponding entry in top-level recommendations (these are nested cross-references, not duplicates)",
          "description": "string — business rationale",
          "responsible": "string — role or team",
          "expected_impact": "string — short qualitative summary",
          "timeline": "string",
          "priority": "CRITICAL | HIGH | MEDIUM",
          "effort": "low | medium | high",
          "current_state": "string — current problem state with numbers",
          "target_state": "string — measurable goal",
          "calculation": {
            "line_items": ["string array — same line_items as top-level entry"],
            "assumptions": ["string array — same assumptions as top-level entry"],
            "result": "string — same result as top-level entry"
          },
          "quarterly_impact": "string — same quarterly_impact as top-level entry",
          "tactics": ["string array — same tactics as top-level entry"],
          "impact_value": "number — same impact_value as top-level entry"
        }
      ]
    }
  ]
}

RULES:
1) Build a unified evidence chain with MINIMUM 6 data points, each citing specific metric values from the data.
2) Identify a SINGLE root cause that explains ALL ${cluster.anomalies.length} anomalies in the cluster.
3) Test and explicitly eliminate at least 2 alternative hypotheses.
4) Produce exactly 3 recommendations: 1 immediate, 1 short-term, 1 structural — these go in the top-level "recommendations" array.
5) Revenue impact: ${impactModel ? `Use the BUSINESS IMPACT MODEL formula above to calculate estimated loss. Apply the formula variables using the data snapshot values. Show the model name as "${impactModel.formula}".` : 'Optional — only include if you can calculate a reasonable estimate from the data.'}
6) Monitoring plan must have an entry for each anomaly metric in the cluster.
7) DO NOT include "key_metrics" in your output — KPIs are auto-generated from time-series data by the system.
8) "findings" must group the evidence chain into 2-4 thematic findings. Each finding should have its own subset of evidence items and 1-2 linked recommendations. The sum of all impact_contribution values should equal 1.0. Every recommendation must appear in at least one finding.

THREE-LAYER CHART FRAMEWORK — follow these rules strictly:

Charts are assigned to layers based on what QUESTION they answer. Users read progressive disclosure: broad → specific.

LAYER 1 (summary_charts): "Is there a problem? How big?"
- Auto-generated from primary outcome metrics. Do NOT include summary charts in your JSON — they are generated separately by the system.

LAYER 2 (decomposition charts): "Where is the problem? Which segment?"
- Auto-generated from the statistical decomposer. Do NOT include decomposition charts in your JSON — they are generated separately by the system.
- Decomposition charts are SHARED across findings (not owned by any single finding) because they answer "where", not "why".

LAYER 3 (evidence charts — INSIDE findings): "Why is this happening? What proves the causal claim?"
- YOU decide whether an evidence item needs a chart. This is the ONLY chart layer you control.
- For each evidence point in a finding, set has_chart=true ONLY when the evidence contains a CAUSAL claim that benefits from visual proof — i.e., removing the chart would make the root cause hypothesis significantly less convincing.
- Test: "If I remove this chart, is the causal claim still equally convincing from text alone?" If yes → has_chart=false. If no → has_chart=true.
- Evidence charts must show CORRELATION or CAUSAL MECHANISM (e.g., wait time vs abandonment rate, speed vs conversion). They are NOT descriptions of "where" — that belongs in decomposition.
- Each evidence chart is owned by exactly ONE finding. If a chart would be relevant to multiple findings, it belongs in decomposition, not here.
- For evidence points with has_chart=true, also add "chart_type" (one of: line_comparison, horizontal_bars, grouped_bars, correlation_dual_axis, bucket_performance, scatter, heatmap) and "chart_data_keys" (array of metric/dimension keys the chart should visualize).
- Also add "chart_title" (answers "what happened?", max 60 chars, NEVER raw field names), "chart_subtitle" (answers "so what?", max 80 chars — must contain magnitude, comparison, threshold context, or trend direction), and "chart_y_axis_title" (human-readable Y-axis label like "Return Rate (%)" — NOT raw field names like "value").

CHART QUALITY RULES:
- Title examples: "Delivery Hours 3x Higher for Returns" (good) vs "avg_delivery_hours by is_returned" (bad)
- Subtitle must contain one of: magnitude ("73% of total"), comparison ("vs 6.1% baseline"), threshold ("exceeding 10% red threshold"), trend ("accelerating since W09")
- CHART BUDGET: Evidence section max 2 charts per finding, max 4 total. Every chart must earn its place.

CRITICAL DISTINCTION — same data domain, different layers:
- "Which region has the problem?" → decomposition (auto-generated, not your concern)
- "Does wait time CAUSE abandonment?" → evidence chart (your decision, inside a finding)
- A distribution table showing WHERE delay occurs = decomposition. A correlation chart proving WHY delay matters = evidence.
Do NOT put descriptive/segmentation charts inside findings. Do NOT put causal-proof charts in decomposition.

Return ONLY valid JSON. No markdown fences.`;

        console.log(`[run-specialist] Investigation prompt: ~${investigationUserPrompt.length} chars`);

        // Update phase to analysis
        await supabase.from("agent_runs").update({
          findings: {
            _type: 'investigation',
            _phase: 'analysis',
            cluster: serializedCluster,
            decomposition: {
              perMetric: investigationDecomposition,
              convergence,
              convergenceInsight,
              charts: decompositionCharts,
            },
          },
        }).eq("id", runId);

        // Call AI for investigation analysis (direct — always Sonnet 4.5)
        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "anthropic/claude-sonnet-4",
            max_tokens: 12000,
            temperature: 0.3,
            messages: [
              { role: "system", content: investigationSystemPrompt },
              { role: "user", content: investigationUserPrompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          throw new Error(`AI API ${aiResponse.status}: ${errorText.slice(0, 500)}`);
        }

        const aiResult = await aiResponse.json();
        const rawContent = aiResult.choices?.[0]?.message?.content || "";

        let investigationJson: Record<string, unknown>;
        try {
          let cleaned = rawContent.trim();
          if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
          }
          investigationJson = JSON.parse(cleaned);
        } catch {
          console.error("[run-specialist] Failed to parse investigation response:", rawContent.slice(0, 500));
          throw new Error("Failed to parse investigation analysis response as JSON");
        }

        console.log(`[run-specialist] Investigation analysis complete`);

        // Validate investigation findings (structural integrity, enum correctness, impact normalization)
        const invValidation = validateInvestigationFindings(investigationJson);
        console.log(`[run-specialist] Investigation validation: valid=${invValidation.isValid}, warnings=${invValidation.warnings.length}, autoFixes=${invValidation.autoFixCount}`);
        if (invValidation.warnings.length > 0) {
          for (const w of invValidation.warnings.filter(w => w.severity === 'error' || w.severity === 'warning')) {
            console.warn(`[run-specialist] Validation ${w.severity}: [${w.code}] ${w.message}`);
          }
        }

        // ── DIFFERENTIATION GUARDRAIL ──────────────────────────────────
        // Check if this specialist's top decomposition finding overlaps with recent peer runs
        let differentiationWarning: Record<string, unknown> | undefined;
        try {
          const topContrib = investigationDecomposition[0]?.topContributors?.[0];
          const topDim = topContrib?.dimension;
          const topVal = topContrib?.value;

          if (topDim && topVal) {
            const { data: recentPeers } = await supabase
              .from('agent_runs')
              .select('agent_id, findings')
              .neq('agent_id', specialist_id)
              .eq('status', 'completed')
              .order('started_at', { ascending: false })
              .limit(10);

            const peerMatches = (recentPeers || []).filter(peer => {
              const peerDecomp = (peer.findings as Record<string, unknown>)?.decomposition as Record<string, unknown> | undefined;
              const peerMetrics = (peerDecomp?.perMetric || []) as Array<{ topContributors?: Array<{ dimension?: string; value?: string }> }>;
              const peerTop = peerMetrics[0]?.topContributors?.[0];
              return peerTop?.dimension === topDim && peerTop?.value === topVal;
            });

            if (peerMatches.length >= 2) {
              console.warn(`[run-specialist] ⚠️ DIFFERENTIATION WARNING: Top insight (${topDim}=${topVal}) matches ${peerMatches.length} other specialists.`);
              differentiationWarning = {
                topDimension: topDim,
                topValue: topVal,
                overlappingCount: peerMatches.length,
                message: `This specialist's primary finding overlaps with ${peerMatches.length} other specialist(s). Consider reviewing dimension configuration.`,
              };
            }
          }
        } catch (guardErr) {
          console.warn('[run-specialist] Differentiation guardrail check failed (non-fatal):', guardErr);
        }

        // Phase 3: Store complete investigation results
        const completeFindings = {
          _type: 'investigation',
          _phase: 'complete',
          cluster: serializedCluster,
          summaryCharts: renderedSummaryCharts,
          decomposition: {
            perMetric: investigationDecomposition,
            convergence,
            convergenceInsight,
            charts: renderedDecompCharts,
          },
          investigation: investigationJson,
          // Layer 1 KPIs: auto-generated from chart data (ensures KPIs match charts)
          key_metrics: autoKeyMetrics.length > 0 ? autoKeyMetrics : (investigationJson.key_metrics || []),
          // Preserve standard fields for backward compat
          executive_summary: {
            headline: investigationJson.title || "Investigation Report",
            severity: investigationJson.severity || "high",
            key_finding: investigationJson.executive_summary || "",
          },
          ai_summary: investigationJson.executive_summary || "",
          _anomaly_count: cluster.anomalies.length,
          _knowledge_context_used: !!knowledgeContext,
          _dataPeriod: dataPeriod,
          ...(differentiationWarning ? { _differentiationWarning: differentiationWarning } : {}),
        };

        // Store investigation recommendations in agent_recommendations table
        // Extract recs per-finding to preserve finding→recommendation linkage
        const invFindings = (investigationJson.findings || []) as Array<Record<string, unknown>>;
        const topLevelRecs = (investigationJson.recommendations || []) as Array<Record<string, unknown>>;
        const invRecIds: string[] = [];

        // Extract revenue impact for recommendation rows
        const revImpact = investigationJson.revenue_impact as Record<string, unknown> | undefined;
        const estimatedLoss = Number(revImpact?.estimated_loss) || 0;
        const impactCurrency = (revImpact?.currency as string) || knowledgeContext?.businessContext?.currency || "IDR";

        // Build rec rows. Top-level recommendations are the source of truth for
        // McKinsey-style calculation/tactics/impact_value (the schema asks for full
        // detail there); findings[].recommendations carry the finding→rec linkage
        // and may share titles with top-level. Merge: prefer top-level data, but
        // attach the matching finding's id so insight_id is populated correctly.
        const recRows: Array<Record<string, unknown>> = [];

        // Map: lowercased title → finding id, derived from findings[].recommendations.
        const findingIdByTitle = new Map<string, unknown>();
        for (const finding of invFindings) {
          const findingId = finding.id;
          for (const fr of (finding.recommendations || []) as Array<Record<string, unknown>>) {
            const t = String(fr.title || "").toLowerCase().trim();
            if (t && findingId != null && !findingIdByTitle.has(t)) {
              findingIdByTitle.set(t, findingId);
            }
          }
        }

        // Map: lowercased title → top-level rec (preferred for calc fields).
        const topLevelByTitle = new Map<string, Record<string, unknown>>();
        for (const tr of topLevelRecs) {
          const t = String(tr.title || "").toLowerCase().trim();
          if (t && !topLevelByTitle.has(t)) {
            topLevelByTitle.set(t, tr);
          }
        }

        // Pass 1: top-level recs (with full calculation), enriched with finding linkage.
        const seenTitles = new Set<string>();
        for (const r of topLevelRecs) {
          const title = String(r.title || "");
          const titleKey = title.toLowerCase().trim();
          if (!title || seenTitles.has(titleKey)) continue;
          seenTitles.add(titleKey);

          const rImpactValue = typeof r.impact_value === 'number' ? r.impact_value : null;
          const fallbackImpact = estimatedLoss > 0 ? Math.round(estimatedLoss / Math.max(topLevelRecs.length, 1)) : 0;
          const findingId = findingIdByTitle.get(titleKey);
          recRows.push({
            agent_id: specialist_id,
            run_id: runId,
            title,
            description: r.description || "",
            priority: (r.priority || "HIGH").toString().toLowerCase(),
            status: "proposed",
            potential_impact: r.expected_impact || "",
            potential_impact_numeric: rImpactValue ?? fallbackImpact,
            estimated_effort: r.effort || "medium",
            impact_type: r.tier === 'immediate' ? 'cost' : r.tier === 'structural' ? 'efficiency' : 'revenue',
            impact_value: rImpactValue ?? fallbackImpact,
            impact_currency: impactCurrency,
            impact_confidence: 70,
            deadline: r.timeline || null,
            root_cause_rank: r.tier === 'immediate' ? 1 : r.tier === 'short_term' ? 2 : 3,
            action_scope: r.tier === 'structural' ? 'strategic' : 'tactical',
            insight_id: findingId != null ? `inv-finding-${findingId}` : null,
            structured_content: r.current_state ? {
              current_state: r.current_state,
              target_state: r.target_state || null,
              calculation: r.calculation ?? null,
              quarterly_impact: r.quarterly_impact || r.expected_impact || null,
              tactics: Array.isArray(r.tactics) ? r.tactics : [],
            } : null,
            galen_action: null,
          });
        }

        // Pass 2: findings[] recs that don't have a matching top-level entry
        // (the schema discourages this, but handle it gracefully). Such rows
        // carry only the basic fields the LLM produced inside findings[].
        for (const finding of invFindings) {
          const findingId = finding.id;
          for (const r of (finding.recommendations || []) as Array<Record<string, unknown>>) {
            const title = String(r.title || "");
            const titleKey = title.toLowerCase().trim();
            if (!title || seenTitles.has(titleKey)) continue;
            seenTitles.add(titleKey);
            const rImpactValue = typeof r.impact_value === 'number' ? r.impact_value : null;
            const fallbackImpact = estimatedLoss > 0 ? Math.round(estimatedLoss / Math.max(topLevelRecs.length, recRows.length + 1)) : 0;
            recRows.push({
              agent_id: specialist_id,
              run_id: runId,
              title,
              description: r.description || "",
              priority: (r.priority || "HIGH").toString().toLowerCase(),
              status: "proposed",
              potential_impact: r.expected_impact || "",
              potential_impact_numeric: rImpactValue ?? fallbackImpact,
              estimated_effort: r.effort || "medium",
              impact_type: r.tier === 'immediate' ? 'cost' : r.tier === 'structural' ? 'efficiency' : 'revenue',
              impact_value: rImpactValue ?? fallbackImpact,
              impact_currency: impactCurrency,
              impact_confidence: 70,
              deadline: r.timeline || null,
              root_cause_rank: r.tier === 'immediate' ? 1 : r.tier === 'short_term' ? 2 : 3,
              action_scope: r.tier === 'structural' ? 'strategic' : 'tactical',
              insight_id: findingId != null ? `inv-finding-${findingId}` : null,
              structured_content: r.current_state ? {
                current_state: r.current_state,
                target_state: r.target_state || null,
                calculation: r.calculation ?? null,
                quarterly_impact: r.quarterly_impact || r.expected_impact || null,
                tactics: Array.isArray(r.tactics) ? r.tactics : [],
              } : null,
              galen_action: null,
            });
          }
        }

        if (recRows.length > 0) {
          const { data: insertedRecs, error: recError } = await supabase
            .from("agent_recommendations")
            .insert(recRows)
            .select("id");

          if (recError) {
            console.error("[run-specialist] Failed to insert investigation recommendations:", recError.message);
          } else {
            for (const ir of insertedRecs || []) {
              invRecIds.push(ir.id);
            }
          }
        }

        // Skill execution audit
        if (skillData) {
          await supabase.from("skill_executions").insert({
            skill_id: skillData.skillId,
            agent_id: specialist_id,
            input_data: { domain, trigger, run_id: runId, mode: 'investigation' },
            output_content: JSON.stringify(completeFindings).slice(0, 50000),
            status: "completed",
            completed_at: new Date().toISOString(),
          });
        }

        // Update run with complete investigation
        await supabase.from("agent_runs").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          findings: completeFindings,
          recommendations: { recommendation_ids: invRecIds },
          skill_outputs: skillData
            ? { skill_id: skillData.skillId, skill_name: skillData.skillName, methodology_used: true }
            : { methodology_used: false },
        }).eq("id", runId);

        // Update specialist metadata
        await supabase.from("agents").update({
          last_run_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          last_insight_at: new Date().toISOString(),
          total_runs: (specialist.total_runs || 0) + 1,
          is_monitoring: true,
        }).eq("id", specialist_id);

        console.log(`[run-specialist] Investigation run ${runId} completed successfully`);

        return new Response(
          JSON.stringify({
            run_id: runId,
            status: "completed",
            run_type: "investigation",
            cluster_id: cluster.clusterId,
            findings: completeFindings,
            recommendation_count: invRecIds.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // No cluster could be formed — this shouldn't happen since we create synthetic clusters above
      console.error('[run-specialist] BUG: No cluster available after synthetic cluster creation');
      return new Response(
        JSON.stringify({ error: 'Pipeline error — no cluster available' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      // Mark run as failed
      console.error("[run-specialist] Run failed:", error);
      await supabase
        .from("agent_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", runId);

      return new Response(
        JSON.stringify({
          run_id: runId,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("[run-specialist] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

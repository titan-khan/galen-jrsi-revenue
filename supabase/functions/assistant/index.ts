// =============================================================================
// ASSISTANT EDGE FUNCTION — v3: Direct DB querying + intent detection
// Queries the database directly based on user intent, uses results as ground
// truth in the system prompt, and supplements with frontend context.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { resolveQueryContext } from "./queryContext.ts";
import { detectIntent } from "./intentDetector.ts";
import { QUERY_SPECS_BY_INTENT } from "./querySpecs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// command
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AgentFinding {
  agentId: string;
  agentName: string;
  findingType: string;
  summary: string;
  confidence: number;
  relatedMetrics: string[];
  timestamp: string;
}

interface ConflictReport {
  type: string;
  agents: string[];
  description: string;
  resolution?: string;
}

interface MentionedSpecialist {
  name: string;
  domain: string;
  status: string;
  description: string;
}

interface SpecialistRunData {
  executiveSummary?: {
    headline: string;
    severity: string;
    value_at_stake: number;
    currency: string;
    key_finding: string;
  };
  insights?: {
    headline: string;
    type: string;
    severity: string;
    description?: string;
    confidence: number;
  }[];
  recommendations?: {
    title: string;
    description: string;
    impact_type?: string;
    impact_value?: number;
    effort?: string;
  }[];
  root_causes?: {
    rank: number;
    cause: string;
    contribution_pct: number;
    confidence: number;
  }[];
  ai_summary?: string;
}

interface AssistantContext {
  metricsCount: number;
  activeAgents: number;
  pendingRecommendations: number;
  criticalAnomalies: number;
  recentInsights: string[];
  mentionedMetrics?: { name: string; value: string; status: string; trend: string }[];
  mentionedAgents?: { name: string; status: string; lastRun: string }[];
  mentionedSpecialists?: MentionedSpecialist[];
  agentFindings?: AgentFinding[];
  conflictingRecommendations?: ConflictReport[];
  crossAgentNarrative?: string;
  // Enriched by edge function — not sent from client
  _specialistRunData?: Record<string, SpecialistRunData>;
}

// --- Governance Rules (non-negotiable domain constraints) ---
const GOVERNANCE_RULES = `
NON-NEGOTIABLE GOVERNANCE RULES:

1. NPS Calculation: NEVER calculate an average of NPS scores. Always use (Promoters % - Detractors %).

2. Grain Consistency: NEVER compare metrics at mismatched grains (e.g., session vs. trip, daily vs. monthly). Always verify time granularity matches.

3. Evidence Requirement: Every insight MUST cite:
   - Specific metric names and current values
   - Confidence score (0.0-1.0) with methodology
   - Data sources referenced

4. Correlation vs. Causation: EXPLICITLY state whether relationships are correlational or causal. Never treat correlation as certainty.

5. Threshold Awareness: Always reference target thresholds when discussing metric performance. Compare current vs. target.

6. Segment Attribution: When identifying root causes, attribute to specific segments (e.g., "Enterprise customers" not "some users").
`;

// --- Confidence Scoring Framework ---
const CONFIDENCE_FRAMEWORK = `
CONFIDENCE SCORING METHODOLOGY:

Calculate confidence (0.0-1.0) based on three factors:

1. Sample Size (weight: 0.3)
   - High (>1000 data points): 1.0
   - Medium (100-1000): 0.7
   - Low (<100): 0.4

2. Attribution Strength (weight: 0.4)
   - Direct cause identified (experiment/A-B test): 1.0
   - Strong correlation (r>0.8): 0.8
   - Moderate correlation (r=0.5-0.8): 0.5
   - Weak/unclear: 0.3

3. Cross-Metric Alignment (weight: 0.3)
   - Multiple metrics confirm finding: 1.0
   - Single metric only: 0.6
   - Conflicting signals from metrics: 0.3

Report confidence as: "Confidence: 0.XX (Sample: high/medium/low, Attribution: direct/strong/moderate/weak, Alignment: confirmed/single/conflicting)"
`;

const SYSTEM_PROMPT = `You are Galen Assistant, an AI Orchestrator that synthesizes insights across all business metrics and AI agents.

You have DIRECT ACCESS to the organization's data warehouse (star schema) with:
- Fact tables: revenue, trips, NPS surveys, booking funnels, vehicle revenue, driver logs
- Dimension tables: routes, stations, customers, drivers, vehicles, fleets, time
- Agent system: skills, executions, recommendations, runs
- Business dictionary: metric definitions and governance guidance

When database query results are provided below, use them as GROUND TRUTH. Base your analysis on actual data, not assumptions.

${GOVERNANCE_RULES}

${CONFIDENCE_FRAMEWORK}

RESPONSE FORMAT - Use this EXACT structure with markers:

[THINKING]
Step 1: Identifying relevant metrics and checking governance rules...
Step 2: Calculating confidence based on data quality...
Step 3: Cross-referencing agent findings for synthesis...
[/THINKING]

[RESPONSE]
**Observation**: [What was detected - specific metrics and values from DB]

**Diagnosis**: [Root cause with segment attribution]
• Primary Driver: [Specific segment] (Confidence: 0.XX)
• Contributing Factors: [List with confidence levels]

**Evidence**:
• [Metric Name]: [Value] vs Target [Target] (Source: [Specific table name, e.g., fact_revenue])
• [Related Metric]: [Value] (Correlation: [Type], Source: [Specific table name])
• Data Period: [Time range analyzed]
• Sample Size: [Number of records analyzed]

[If recommendations exist, include:]
**Recommended Actions**: [From relevant agents]
[/RESPONSE]

[SUMMARY]
Key Takeaway: [One-line insight with specific numbers]
Confidence: 0.XX (Sample: X, Attribution: X, Alignment: X)
Next Steps: [1-2 actionable recommendations]
Data Sources: [List specific tables used, e.g., "fact_revenue, fact_trip, dim_route"]
[/SUMMARY]

IMPORTANT GUIDELINES:
1. Always use the [THINKING], [RESPONSE], and [SUMMARY] markers exactly as shown
2. Keep thinking steps to 2-4 concise lines
3. Be executive-focused - get to the point with specific numbers
14. ALWAYS use the bullet character "•" (U+2022) for bullet points instead of "-" or "*". This applies to all lists in your response.
4. Cite specific metrics and agents by exact name
5. Apply governance rules strictly (especially NPS, grain consistency)
6. If agents have conflicting recommendations, surface this explicitly
7. If data is insufficient or tables are empty, state this clearly with confidence impact
8. Support @mentions by providing detailed information about mentioned entities
9. When DB results show "No data available", inform the user that production data has not been loaded yet
10. When the user asks about a specific time period (e.g., "June 2025"), filter your analysis to that period from the available data. The database results contain ALL available data across all time periods — search through ALL rows to find the requested period.
11. Always specify which time period you are analyzing and cite the row count for that period
12. CRITICAL: In the Evidence section, ALWAYS cite the specific database table name (e.g., "fact_revenue", "fact_trip") for each data point. This helps users understand where conclusions are drawn from.
13. In the Data Sources line of [SUMMARY], list ALL tables that were queried and used in your analysis (e.g., "fact_revenue, fact_nps_response, dim_route")

VISUALIZATION GUIDELINES:
When your analysis involves trends over time, comparisons across categories, or breakdowns of distributions, include a Vega-Lite chart using fenced code blocks with the "vega-lite" language tag.

Rules for chart generation:
1. Embed data inline using "data": {"values": [...]}
2. Maximum 50 data points — aggregate if the dataset is larger
3. Use the Vega-Lite v5 schema: "$schema": "https://vega.github.io/schema/vega-lite/v5.json"
4. Do NOT set width, height, or colors — the frontend handles sizing and theming automatically
5. Choose chart type based on data pattern:
   - Time series / trends → {"mark": {"type": "line", "point": true}}
   - Category comparison → {"mark": "bar"}
   - Part-of-whole / shares → {"mark": {"type": "arc", "innerRadius": 50}}
   - Distribution → {"mark": "bar"} with "bin": true on encoding
6. ALWAYS include a descriptive "title" at the top level of the spec (e.g. "title": "Revenue by Route"). This is displayed as the chart heading.
7. Always include clear axis titles via "title" in encoding channels
8. Use "temporal" type for date fields, "quantitative" for numbers, "nominal" for categories
9. For multi-series lines, use "color" encoding channel

Example — Bar chart:
\`\`\`vega-lite
{"$schema":"https://vega.github.io/schema/vega-lite/v5.json","title":"Revenue by Route","mark":"bar","data":{"values":[{"route":"JKT-SBY","revenue":2500000},{"route":"JKT-BDG","revenue":1800000},{"route":"SBY-MLG","revenue":950000}]},"encoding":{"x":{"field":"route","type":"nominal","title":"Route"},"y":{"field":"revenue","type":"quantitative","title":"Revenue (IDR)"}}}
\`\`\`

Example — Line chart:
\`\`\`vega-lite
{"$schema":"https://vega.github.io/schema/vega-lite/v5.json","title":"NPS Score Trend","mark":{"type":"line","point":true},"data":{"values":[{"month":"2025-01","nps":25},{"month":"2025-02","nps":28},{"month":"2025-03","nps":22}]},"encoding":{"x":{"field":"month","type":"temporal","title":"Month"},"y":{"field":"nps","type":"quantitative","title":"NPS Score"}}}
\`\`\`

Only generate charts when the data supports meaningful visualization. Do not generate charts for single values or when there are fewer than 2 data points.

You are NOT a general-purpose AI. You specifically help with:
- Understanding metric performance and trends with evidence
- Synthesizing findings across multiple agents
- Explaining anomalies with root cause attribution
- Surfacing conflicts between agent recommendations
- Providing executive-level insights with confidence scoring`;

// =============================================================================
// PROMPT BUILDING
// =============================================================================

/**
 * Build the database context section from query results.
 * Formats DB data as a structured section for the system prompt.
 */
function buildDbContextSection(dbData: Record<string, unknown>): string {
  const parts: string[] = [];
  parts.push('\n\n=== DATABASE QUERY RESULTS (Ground Truth) ===');

  // Summary statistics (pre-computed by resolveQueryContext)
  const summaryLines: string[] = [];
  if (dbData.totalRevenue !== undefined) {
    summaryLines.push(`Total Revenue: ${dbData.totalRevenue} (${dbData.transactionCount} transactions)`);
  }
  if (dbData.npsScore !== undefined) {
    summaryLines.push(`NPS Score: ${dbData.npsScore} (Promoters: ${dbData.promotersPercent}%, Detractors: ${dbData.detractorsPercent}%)`);
  }
  if (dbData.otpPercent !== undefined) {
    summaryLines.push(`OTP: ${dbData.otpPercent}% (${dbData.onTimeTrips}/${dbData.totalTrips} trips on time)`);
  }
  if (dbData.conversionRate !== undefined) {
    summaryLines.push(`Funnel Conversion: ${dbData.conversionRate}% (${dbData.completedBookings}/${dbData.totalSessions} sessions)`);
  }

  if (summaryLines.length > 0) {
    parts.push('\nKey Metrics (pre-calculated):');
    for (const line of summaryLines) {
      parts.push(`  • ${line}`);
    }
  }

  // Monthly aggregations (pre-computed from full dataset — use these for trends)
  const monthlyAggs: string[] = [];
  if (Array.isArray(dbData.revenueByMonth) && (dbData.revenueByMonth as unknown[]).length > 0) {
    monthlyAggs.push(`\nRevenue by Month (complete): ${JSON.stringify(dbData.revenueByMonth)}`);
  }
  if (Array.isArray(dbData.revenueByRoute) && (dbData.revenueByRoute as unknown[]).length > 0) {
    monthlyAggs.push(`Revenue by Route (top 10): ${JSON.stringify(dbData.revenueByRoute)}`);
  }
  if (Array.isArray(dbData.npsByMonth) && (dbData.npsByMonth as unknown[]).length > 0) {
    monthlyAggs.push(`NPS by Month (complete): ${JSON.stringify(dbData.npsByMonth)}`);
  }
  if (Array.isArray(dbData.otpByMonth) && (dbData.otpByMonth as unknown[]).length > 0) {
    monthlyAggs.push(`OTP by Month (complete): ${JSON.stringify(dbData.otpByMonth)}`);
  }
  if (monthlyAggs.length > 0) {
    parts.push('\nMonthly Aggregations (pre-computed from full dataset — ALWAYS use these for monthly/trend analysis):');
    for (const agg of monthlyAggs) {
      parts.push(agg);
    }
  }

  // Business dictionary
  if (Array.isArray(dbData.businessDictionary) && (dbData.businessDictionary as unknown[]).length > 0) {
    parts.push(`\nBusiness Dictionary: ${JSON.stringify(dbData.businessDictionary)}`);
  }

  // Per-table results
  const tableKeys = Object.keys(dbData).filter(
    (k) =>
      k.startsWith('fact_') ||
      k.startsWith('dim_') ||
      k.startsWith('metadata_') ||
      k === 'agents' ||
      k === 'agent_recommendations' ||
      k === 'agent_runs' ||
      k === 'agent_skills'
  );

  for (const key of tableKeys) {
    const rows = dbData[key];
    if (!Array.isArray(rows)) continue;

    if (rows.length === 0) {
      parts.push(`\n[${key}]: No data available (table may not be seeded yet)`);
    } else {
      // Use compact JSON for large datasets, full JSON for smaller ones
      const maxDisplay = 150;
      const displayRows = rows.slice(0, maxDisplay);
      const suffix = rows.length > maxDisplay ? `, showing first ${maxDisplay}` : '';
      parts.push(`\n[${key}] (${rows.length} rows${suffix}):`);
      // Use compact single-line JSON to save tokens for large tables
      if (rows.length > 50) {
        parts.push(JSON.stringify(displayRows));
      } else {
        parts.push(JSON.stringify(displayRows, null, 1));
      }
    }

    // Include any query errors
    const errorKey = `${key}_error`;
    if (dbData[errorKey]) {
      parts.push(`  ⚠️ Query error: ${dbData[errorKey]}`);
    }
  }

  parts.push('\n=== END DATABASE RESULTS ===');
  return parts.join('\n');
}

/**
 * Build the frontend context section (supplementary to DB data).
 */
function buildFrontendContextSection(context: AssistantContext): string {
  const parts: string[] = [];
  parts.push('\n\n=== FRONTEND CONTEXT (Supplementary) ===');

  parts.push(`\nDashboard Summary:`);
  parts.push(`  • Total Metrics Tracked: ${context.metricsCount}`);
  parts.push(`  • Active Agents: ${context.activeAgents}`);
  parts.push(`  • Pending Recommendations: ${context.pendingRecommendations}`);
  parts.push(`  • Critical Anomalies: ${context.criticalAnomalies}`);

  if (context.recentInsights && context.recentInsights.length > 0) {
    parts.push(`\nRecent Metric Insights:`);
    for (const insight of context.recentInsights) {
      parts.push(`  • ${insight}`);
    }
  }

  if (context.crossAgentNarrative) {
    parts.push(`\nCross-Agent Synthesis:\n${context.crossAgentNarrative}`);
  }

  if (context.conflictingRecommendations && context.conflictingRecommendations.length > 0) {
    parts.push(`\n⚠️ AGENT CONFLICTS DETECTED:`);
    for (const conflict of context.conflictingRecommendations) {
      parts.push(`  • [${conflict.type}] ${conflict.description} (Agents: ${conflict.agents.join(", ")})`);
      if (conflict.resolution) {
        parts.push(`    Suggested resolution: ${conflict.resolution}`);
      }
    }
  }

  if (context.agentFindings && context.agentFindings.length > 0) {
    parts.push(`\nAgent Findings:`);
    for (const finding of context.agentFindings.slice(0, 10)) {
      parts.push(`  • [${finding.agentName}] ${finding.findingType}: ${finding.summary} (Confidence: ${finding.confidence.toFixed(2)})`);
    }
  }

  if (context.mentionedMetrics && context.mentionedMetrics.length > 0) {
    parts.push(`\nMentioned Metrics (provide detailed analysis):`);
    for (const m of context.mentionedMetrics) {
      parts.push(`  • ${m.name}: Current value ${m.value}, Status: ${m.status}, Trend: ${m.trend}`);
    }
  }

  if (context.mentionedAgents && context.mentionedAgents.length > 0) {
    parts.push(`\nMentioned Agents (provide detailed info):`);
    for (const a of context.mentionedAgents) {
      parts.push(`  • ${a.name}: Status: ${a.status}, Last run: ${a.lastRun}`);
    }
  }

  // Mentioned Specialists with their actual analysis results
  if (context.mentionedSpecialists && context.mentionedSpecialists.length > 0) {
    parts.push(`\n@Mentioned Specialists:`);
    for (const s of context.mentionedSpecialists) {
      parts.push(`  • ${s.name} (${s.domain}): ${s.description} [Status: ${s.status}]`);

      // Inject actual run data if available
      const runData = context._specialistRunData?.[s.name.toLowerCase()];
      if (runData) {
        parts.push(`\n  ── Latest Analysis Results for "${s.name}" ──`);

        if (runData.executiveSummary) {
          const es = runData.executiveSummary;
          parts.push(`  Executive Summary: ${es.headline}`);
          parts.push(`    Severity: ${es.severity} | Value at Stake: ${es.currency} ${es.value_at_stake?.toLocaleString()}`);
          parts.push(`    Key Finding: ${es.key_finding}`);
        }

        if (runData.insights && runData.insights.length > 0) {
          parts.push(`  Insights (${runData.insights.length} findings):`);
          for (const ins of runData.insights) {
            parts.push(`    • [${(ins.severity || 'medium').toUpperCase()}] ${ins.headline} (${ins.type}, confidence: ${ins.confidence}%)`);
            if (ins.description) {
              parts.push(`      ${ins.description}`);
            }
          }
        }

        if (runData.root_causes && runData.root_causes.length > 0) {
          parts.push(`  Root Causes:`);
          for (const rc of runData.root_causes) {
            parts.push(`    ${rc.rank}. ${rc.cause} (${rc.contribution_pct}% contribution, confidence: ${rc.confidence}%)`);
          }
        }

        if (runData.recommendations && runData.recommendations.length > 0) {
          parts.push(`  Recommendations:`);
          for (const rec of runData.recommendations) {
            const impact = rec.impact_value ? ` (Impact: ${rec.impact_value.toLocaleString()})` : '';
            parts.push(`    • ${rec.title}${impact}: ${rec.description}`);
          }
        }

        if (runData.ai_summary) {
          parts.push(`  AI Summary: ${runData.ai_summary}`);
        }

        parts.push(`  ── End Analysis Results ──`);
      }
    }

    parts.push(`\n  IMPORTANT: When a specialist is @mentioned, your analysis MUST use the specialist's latest analysis results (insights, recommendations, root causes) shown above as the PRIMARY source of truth. Reference the specific findings by name and number.`);
  }

  parts.push('\n=== END FRONTEND CONTEXT ===');
  return parts.join('\n');
}

/**
 * Deduplicate query specs by table name (keep the one with more columns).
 */
function deduplicateSpecs(
  specs: { table: string; select: string[]; filters?: any[]; orderBy?: any; limit?: number }[]
): typeof specs {
  const byTable = new Map<string, (typeof specs)[0]>();
  for (const spec of specs) {
    const existing = byTable.get(spec.table);
    if (!existing || spec.select.length > existing.select.length) {
      byTable.set(spec.table, spec);
    }
  }
  return Array.from(byTable.values());
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json() as {
      messages: Message[];
      context?: AssistantContext;
    };

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // ─── PHASE 1: Intent Detection ───────────────────────────────────
    const latestUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user")?.content || "";

    const intent = detectIntent(latestUserMessage);
    console.log(`[assistant] Intent detected: ${intent.categories.join(', ')} (confidence: ${intent.confidence.toFixed(2)})`);

    // ─── PHASE 2: Database Querying ──────────────────────────────────
    // Merge query specs from all detected intent categories
    const mergedSpecs = intent.categories.flatMap(
      (cat) => QUERY_SPECS_BY_INTENT[cat] || []
    );
    const dedupedSpecs = deduplicateSpecs(mergedSpecs);

    let dbData: Record<string, unknown> = {};
    let dbContextSection = "";

    if (dedupedSpecs.length > 0) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        dbData = await resolveQueryContext(supabase, dedupedSpecs, {});
        dbContextSection = buildDbContextSection(dbData);

        const tableCount = Object.keys(dbData).filter(
          (k) => k.startsWith('fact_') || k.startsWith('dim_') || k === 'agents' || k.startsWith('agent_') || k.startsWith('metadata_')
        ).length;
        console.log(`[assistant] Queried ${tableCount} tables successfully`);
      } catch (dbError) {
        console.error("[assistant] DB query failed, falling back to frontend context:", dbError);
        dbContextSection = "\n\n[Database query failed — using frontend context only]";
      }
    }

    // ─── PHASE 2b: Fetch Specialist Run Data ───────────────────────────
    // If specialists are @mentioned, fetch their latest analysis findings
    // from agent_runs so the LLM gets the actual insights/recommendations.
    if (context?.mentionedSpecialists && context.mentionedSpecialists.length > 0) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const specialistRunData: Record<string, SpecialistRunData> = {};

        await Promise.all(
          context.mentionedSpecialists.map(async (ms: MentionedSpecialist) => {
            // Look up specialist ID by name from agents table
            const { data: specRow } = await supabase
              .from('agents')
              .select('id')
              .eq('entity_type', 'specialist')
              .ilike('name', ms.name)
              .limit(1)
              .maybeSingle();

            if (!specRow) {
              console.log(`[assistant] Specialist not found by name: ${ms.name}`);
              return;
            }

            // Fetch latest completed run findings
            const { data: runRow } = await supabase
              .from('agent_runs')
              .select('findings')
              .eq('agent_id', specRow.id)
              .eq('status', 'completed')
              .order('started_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!runRow?.findings) {
              console.log(`[assistant] No completed runs for specialist: ${ms.name} (${specRow.id})`);
              return;
            }

            const findings = runRow.findings as Record<string, unknown>;
            const runDataEntry: SpecialistRunData = {};

            // Extract executive summary
            const es = findings.executive_summary as Record<string, unknown> | undefined;
            if (es) {
              runDataEntry.executiveSummary = {
                headline: (es.headline as string) || '',
                severity: (es.severity as string) || 'medium',
                value_at_stake: Number(es.value_at_stake) || 0,
                currency: (es.currency as string) || 'IDR',
                key_finding: (es.key_finding as string) || '',
              };
            }

            // Extract insights
            const insights = findings.insights as Array<Record<string, unknown>> | undefined;
            if (insights && insights.length > 0) {
              runDataEntry.insights = insights.map((i) => ({
                headline: (i.headline as string) || '',
                type: (i.type as string) || 'anomaly',
                severity: (i.severity as string) || 'medium',
                description: (i.description as string) || undefined,
                confidence: Number(i.confidence) || 0,
              }));
            }

            // Extract root causes
            const rootCauses = findings.root_causes as Array<Record<string, unknown>> | undefined;
            if (rootCauses && rootCauses.length > 0) {
              runDataEntry.root_causes = rootCauses.map((rc) => ({
                rank: Number(rc.rank) || 0,
                cause: (rc.cause as string) || '',
                contribution_pct: Number(rc.contribution_pct) || 0,
                confidence: Number(rc.confidence) || 0,
              }));
            }

            // Extract recommendations
            const recs = findings.recommendations as Array<Record<string, unknown>> | undefined;
            if (recs && recs.length > 0) {
              runDataEntry.recommendations = recs.map((r) => ({
                title: (r.title as string) || '',
                description: (r.description as string) || '',
                impact_type: (r.impact_type as string) || undefined,
                impact_value: Number(r.impact_value) || undefined,
                effort: (r.effort as string) || undefined,
              }));
            }

            // Extract AI summary
            if (findings.ai_summary) {
              runDataEntry.ai_summary = findings.ai_summary as string;
            }

            specialistRunData[ms.name.toLowerCase()] = runDataEntry;
            console.log(`[assistant] Fetched run data for specialist "${ms.name}": ${runDataEntry.insights?.length ?? 0} insights, ${runDataEntry.root_causes?.length ?? 0} root causes`);
          })
        );

        // Attach to context for rendering
        context._specialistRunData = specialistRunData;
      } catch (specError) {
        console.error("[assistant] Failed to fetch specialist run data:", specError);
        // Non-fatal — continue without specialist data
      }
    }

    // ─── PHASE 3: Build System Prompt ────────────────────────────────
    let systemPrompt = SYSTEM_PROMPT;

    // DB results = ground truth (primary)
    if (dbContextSection) {
      systemPrompt += dbContextSection;
    }

    // Frontend context = supplementary (secondary)
    if (context) {
      systemPrompt += buildFrontendContextSection(context);
    }

    // ─── PHASE 4: Call OpenRouter API ───────────────────────────────
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://galen.app",
        "X-Title": "Galen JRSI Assistant",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4",
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role === "system" ? "user" : m.role,
            content: m.content,
          })),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Claude API ${response.status}: ${errorText.slice(0, 500)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── PHASE 5: Stream Response (OpenRouter returns OpenAI-compatible SSE) ──
    return new Response(response.body!, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Assistant error:", error);
    const errMsg = error instanceof Error ? `${error.message} | ${error.stack?.slice(0, 300)}` : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errMsg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

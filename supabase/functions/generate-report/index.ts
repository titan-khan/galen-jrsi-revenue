// =============================================================================
// GENERATE REPORT — Edge Function for AI-powered analytical report generation
// Takes pinned insights + conversation context + DB data → structured report
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { resolveQueryContext } from "./queryContext.ts";
import { detectIntent } from "./intentDetector.ts";
import { QUERY_SPECS_BY_INTENT } from "./querySpecs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ───────────────────────────────────────────────────────

interface InsightItem {
  id: string;
  type: "key-insight" | "action" | "chart";
  title: string;
  description?: string;
  sourceMessageId: string;
}

interface ConversationMessage {
  role: string;
  content: string;
}

interface FrontendContext {
  metricsCount?: number;
  activeAgents?: number;
  pendingRecommendations?: number;
  criticalAnomalies?: number;
  recentInsights?: string[];
  mentionedMetrics?: {
    name: string;
    value: string;
    status: string;
    trend: string;
  }[];
  agentFindings?: {
    agentName: string;
    findingType: string;
    summary: string;
    confidence: number;
  }[];
  crossAgentNarrative?: string;
}

interface RequestPayload {
  insights: InsightItem[];
  conversationMessages: ConversationMessage[];
  context?: FrontendContext;
  format: "full-report" | "executive-summary" | "action-plan";
  title: string;
}

// ─── Governance & Confidence (shared with assistant) ──────────────

const GOVERNANCE_RULES = `
NON-NEGOTIABLE GOVERNANCE RULES:
1. NPS Calculation: NEVER calculate an average of NPS scores. Always use (Promoters % - Detractors %).
2. Grain Consistency: NEVER compare metrics at mismatched grains.
3. Evidence Requirement: Every insight MUST cite specific metric names, values, and data sources.
4. Correlation vs. Causation: EXPLICITLY state relationship type.
5. Threshold Awareness: Always reference target thresholds.
6. Segment Attribution: Attribute root causes to specific segments.
`;

const CONFIDENCE_FRAMEWORK = `
CONFIDENCE SCORING (0.0-1.0):
Score = 0.3*(Sample Size) + 0.4*(Attribution Strength) + 0.3*(Cross-Metric Alignment)
- Sample Size: High (>1000)=1.0, Medium (100-1000)=0.7, Low (<100)=0.4
- Attribution: Direct=1.0, Strong=0.8, Moderate=0.5, Weak=0.3
- Alignment: Confirmed=1.0, Single=0.6, Conflicting=0.3
`;

// ─── Report-specific system prompt ───────────────────────────────

const REPORT_SECTION_TYPES = `"narrative" | "kpi-table" | "analysis" | "callout" | "recommendations" | "methodology"`;

const REPORT_CONTENT_SCHEMA = `
{
  "bottomLine": "One-paragraph executive summary of key findings with specific numbers",
  "sections": [
    {
      "id": "section-1",
      "title": "Section Title",
      "type": ${REPORT_SECTION_TYPES},
      "markdown": "GFM markdown with tables, bold, lists. Use pipe tables for data.",
      "chartSpec": null,
      "level": 1
    }
  ],
  "generatedAt": "ISO timestamp",
  "analysisPeriod": "Human-readable period, e.g. 'Feb 11 - Feb 12, 2026'",
  "dataSources": ["fact_revenue (320 rows)", "fact_trip (450 rows)"],
  "nextSteps": [
    { "action": "What to do", "owner": "Who", "due": "When" }
  ]
}`;

function buildFormatInstructions(
  format: string
): string {
  switch (format) {
    case "executive-summary":
      return `
FORMAT: EXECUTIVE SUMMARY (concise, 3-5 sections max)
Required sections:
1. "kpi-table" — Key Performance Indicators table (Metric | Value | Change | Status)
2. "narrative" — Bottom-line analysis (2-3 paragraphs max)
3. "recommendations" — Top 3 prioritized actions with expected impact
Keep it to ONE page equivalent. Focus on "what happened" and "what to do".`;

    case "action-plan":
      return `
FORMAT: ACTION PLAN (recommendation-focused)
Required sections:
1. "narrative" — Brief situation overview (1 paragraph)
2. "kpi-table" — Relevant KPIs driving the actions
3. "recommendations" — Detailed prioritized actions, each with:
   - Priority level (PRIORITY 1, 2, 3...)
   - Why (root cause)
   - Expected Impact (quantified)
   - Effort (Low/Medium/High)
   - Owner and timeline
4. "methodology" — How recommendations were derived`;

    default: // full-report
      return `
FORMAT: FULL ANALYTICAL REPORT (comprehensive, 5-8 sections)
Required sections:
1. "kpi-table" — Key Performance Indicators with columns: Metric | Today | Previous | Change | Status
   Include methodology note explaining how each KPI was calculated.
2. "analysis" — Root cause analysis. Break down by relevant dimensions (segment, time slot, driver, route, etc.)
   Use sub-sections (level: 2) for each analysis dimension.
   Include GFM tables with columns like: Segment | Metric | Value | vs Average | Impact
   Include an interpretation note after each table.
3. "callout" — Recurring patterns or anomalies detected. Use warning formatting.
   Include historical appearance data if cross-day patterns exist.
4. "recommendations" — Prioritized actions. Each recommendation MUST include:
   - PRIORITY N: [Action title]
   - **Why**: [Root cause explanation]
   - **Expected Impact**: [Quantified improvement]
   - **Effort**: [Low/Medium/High with timeframe]
5. "methodology" — Data sources table and analysis methodology steps.
   Include a GFM table: Data Source | Details
   List the numbered analysis methodology steps.
6. "narrative" — Next steps summary table: Action | Owner | Due`;
  }
}

function buildSystemPrompt(
  format: string,
  dbContextSection: string,
  frontendContextSection: string,
  insightsSection: string,
  conversationSection: string
): string {
  return `You are a professional analytics report writer for Galen, a business intelligence platform.

Your task is to generate a structured analytical report based on:
1. Database query results (GROUND TRUTH — base all analysis on this data)
2. User-curated insights (pinned by the user during their analysis conversation)
3. Conversation context (the analytical discussion that led to this report)

${GOVERNANCE_RULES}
${CONFIDENCE_FRAMEWORK}

OUTPUT FORMAT:
You MUST output ONLY a valid JSON object matching this exact schema:
${REPORT_CONTENT_SCHEMA}

${buildFormatInstructions(format)}

SECTION CONTENT RULES:
- All markdown MUST use GitHub-Flavored Markdown (GFM)
- Data tables MUST use GFM pipe table syntax:
  | Header 1 | Header 2 | Header 3 |
  |----------|----------|----------|
  | value 1  | value 2  | value 3  |
- Use **bold** for emphasis, status labels like **CRITICAL**, **WARNING**, **GOOD**
- For status indicators use: **CRITICAL** (red), **WARNING** (amber), **GOOD** (green), **HEALTHY** (green)
- Change indicators: use unicode arrows (e.g., "\\u25BC 2.2 pts" for down, "\\u25B2 12" for up)
- Include methodology/calculation notes after data tables where relevant
- For chart sections, include a "chartSpec" with a valid Vega-Lite v5 spec (inline data, no width/height/colors)
- NEVER hallucinate data — only use values from the database results or user insights
- If data is insufficient, explicitly state this

IMPORTANT:
- Output ONLY the JSON object, no markdown code fences, no extra text
- Ensure all JSON strings are properly escaped (no unescaped newlines, quotes, etc.)
- The "id" for each section should be a kebab-case slug (e.g., "key-performance-indicators")
- Section "level" should be 1 for main sections, 2 for sub-sections
- Today's date is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

${dbContextSection}
${frontendContextSection}
${insightsSection}
${conversationSection}`;
}

// ─── Context builders ────────────────────────────────────────────

function buildDbContextSection(
  dbData: Record<string, unknown>
): string {
  const parts: string[] = [];
  parts.push("\n\n=== DATABASE QUERY RESULTS (Ground Truth) ===");

  // Summary statistics
  const summaryLines: string[] = [];
  if (dbData.totalRevenue !== undefined)
    summaryLines.push(
      `Total Revenue: ${dbData.totalRevenue} (${dbData.transactionCount} transactions)`
    );
  if (dbData.npsScore !== undefined)
    summaryLines.push(
      `NPS Score: ${dbData.npsScore} (Promoters: ${dbData.promotersPercent}%, Detractors: ${dbData.detractorsPercent}%)`
    );
  if (dbData.otpPercent !== undefined)
    summaryLines.push(
      `OTP: ${dbData.otpPercent}% (${dbData.onTimeTrips}/${dbData.totalTrips} trips on time)`
    );
  if (dbData.conversionRate !== undefined)
    summaryLines.push(
      `Funnel Conversion: ${dbData.conversionRate}% (${dbData.completedBookings}/${dbData.totalSessions} sessions)`
    );

  if (summaryLines.length > 0) {
    parts.push("\nKey Metrics (pre-calculated):");
    for (const line of summaryLines) parts.push(`  - ${line}`);
  }

  // Monthly aggregations
  const monthlyKeys = [
    "revenueByMonth",
    "revenueByRoute",
    "npsByMonth",
    "otpByMonth",
  ];
  const monthlyParts: string[] = [];
  for (const key of monthlyKeys) {
    if (Array.isArray(dbData[key]) && (dbData[key] as unknown[]).length > 0) {
      monthlyParts.push(`${key}: ${JSON.stringify(dbData[key])}`);
    }
  }
  if (monthlyParts.length > 0) {
    parts.push("\nMonthly Aggregations:");
    for (const agg of monthlyParts) parts.push(agg);
  }

  // Per-table results (compact)
  const tableKeys = Object.keys(dbData).filter(
    (k) =>
      k.startsWith("fact_") ||
      k.startsWith("dim_") ||
      k.startsWith("metadata_") ||
      k === "agents" ||
      k.startsWith("agent_")
  );

  for (const key of tableKeys) {
    const rows = dbData[key];
    if (!Array.isArray(rows)) continue;
    if (rows.length === 0) {
      parts.push(`\n[${key}]: No data available`);
    } else {
      const maxDisplay = 100;
      const displayRows = rows.slice(0, maxDisplay);
      const suffix =
        rows.length > maxDisplay ? `, showing first ${maxDisplay}` : "";
      parts.push(`\n[${key}] (${rows.length} rows${suffix}):`);
      parts.push(JSON.stringify(displayRows));
    }
  }

  parts.push("\n=== END DATABASE RESULTS ===");
  return parts.join("\n");
}

function buildFrontendContextSection(
  context: FrontendContext
): string {
  const parts: string[] = [];
  parts.push("\n\n=== FRONTEND CONTEXT ===");

  parts.push(`Dashboard: ${context.metricsCount ?? 0} metrics tracked, ${context.activeAgents ?? 0} active agents, ${context.pendingRecommendations ?? 0} pending recommendations`);

  if (context.recentInsights && context.recentInsights.length > 0) {
    parts.push("Recent Metric Insights:");
    for (const insight of context.recentInsights.slice(0, 5)) {
      parts.push(`  - ${insight}`);
    }
  }

  if (context.crossAgentNarrative) {
    parts.push(`Cross-Agent Synthesis: ${context.crossAgentNarrative}`);
  }

  if (context.agentFindings && context.agentFindings.length > 0) {
    parts.push("Agent Findings:");
    for (const f of context.agentFindings.slice(0, 5)) {
      parts.push(
        `  - [${f.agentName}] ${f.findingType}: ${f.summary} (Confidence: ${f.confidence.toFixed(2)})`
      );
    }
  }

  if (context.mentionedMetrics && context.mentionedMetrics.length > 0) {
    parts.push("Dashboard Metrics:");
    for (const m of context.mentionedMetrics) {
      parts.push(`  - ${m.name}: ${m.value}, Status: ${m.status}, Trend: ${m.trend}`);
    }
  }

  parts.push("=== END FRONTEND CONTEXT ===");
  return parts.join("\n");
}

function buildInsightsSection(insights: InsightItem[]): string {
  if (insights.length === 0) return "";
  const parts: string[] = [];
  parts.push("\n\n=== USER-CURATED INSIGHTS ===");
  parts.push(
    "The user has pinned the following insights during their analysis. Incorporate these into the report:"
  );
  for (const insight of insights) {
    parts.push(
      `  - [${insight.type}] ${insight.title}${insight.description ? ": " + insight.description : ""}`
    );
  }
  parts.push("=== END USER INSIGHTS ===");
  return parts.join("\n");
}

function buildConversationSection(
  messages: ConversationMessage[]
): string {
  if (messages.length === 0) return "";

  // Keep the most recent 20 exchanges to manage token usage
  const recent = messages.slice(-40);
  const parts: string[] = [];
  parts.push("\n\n=== CONVERSATION CONTEXT ===");
  parts.push(
    "The following is the analytical conversation that preceded this report:"
  );
  for (const msg of recent) {
    const role = msg.role === "user" ? "USER" : "ASSISTANT";
    // Truncate very long messages
    const content =
      msg.content.length > 1500
        ? msg.content.slice(0, 1500) + "... [truncated]"
        : msg.content;
    parts.push(`[${role}]: ${content}`);
  }
  parts.push("=== END CONVERSATION ===");
  return parts.join("\n");
}

// ─── Dedup specs helper ──────────────────────────────────────────

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

// ─── Extract JSON from response ──────────────────────────────────

function extractJson(text: string): string {
  // Try to find JSON in code fences first
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to find raw JSON object
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    return text.slice(jsonStart, jsonEnd + 1);
  }

  return text;
}

// =================================================================
// MAIN HANDLER
// =================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: RequestPayload = await req.json();
    const { insights, conversationMessages, context, format, title } = payload;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    console.log(
      `[generate-report] Starting report: "${title}" (${format}), ${insights.length} insights, ${conversationMessages.length} messages`
    );

    // ── Phase 1: Intent detection from conversation ──────────────
    // Combine all user messages to detect what topics were discussed
    const userMessages = conversationMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");

    const intent = detectIntent(userMessages);
    console.log(
      `[generate-report] Intent: ${intent.categories.join(", ")} (confidence: ${intent.confidence.toFixed(2)})`
    );

    // ── Phase 2: Query database for ground truth ─────────────────
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
          (k) =>
            k.startsWith("fact_") ||
            k.startsWith("dim_") ||
            k === "agents" ||
            k.startsWith("agent_") ||
            k.startsWith("metadata_")
        ).length;
        console.log(
          `[generate-report] Queried ${tableCount} tables successfully`
        );
      } catch (dbError) {
        console.error("[generate-report] DB query failed:", dbError);
        dbContextSection =
          "\n\n[Database query failed — using conversation context and user insights only]";
      }
    }

    // ── Phase 3: Build system prompt ─────────────────────────────
    const frontendContextSection = context
      ? buildFrontendContextSection(context)
      : "";
    const insightsSection = buildInsightsSection(insights);
    const conversationSection = buildConversationSection(
      conversationMessages
    );

    const systemPrompt = buildSystemPrompt(
      format,
      dbContextSection,
      frontendContextSection,
      insightsSection,
      conversationSection
    );

    // ── Phase 4: Call Claude (non-streaming) ─────────────────────
    const userPrompt = `Generate a ${format.replace("-", " ")} titled "${title}" based on the data and conversation context provided. Output ONLY the JSON object.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[generate-report] Claude API error:",
        response.status,
        errorText
      );
      return new Response(
        JSON.stringify({
          error: `AI generation failed (${response.status})`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await response.json();

    // Extract text content from Claude response
    const textBlock = result.content?.find(
      (b: { type: string }) => b.type === "text"
    );
    if (!textBlock?.text) {
      throw new Error("No text content in Claude response");
    }

    // ── Phase 5: Parse and validate JSON ─────────────────────────
    const jsonText = extractJson(textBlock.text);
    let reportContent;
    try {
      reportContent = JSON.parse(jsonText);
    } catch (parseError) {
      console.error(
        "[generate-report] JSON parse failed:",
        (parseError as Error).message
      );
      console.error("[generate-report] Raw text:", jsonText.slice(0, 500));

      // Fallback: wrap the raw text as a single narrative section
      reportContent = {
        bottomLine: "Report generated but structured parsing failed. See content below.",
        sections: [
          {
            id: "raw-content",
            title: "Report Content",
            type: "narrative",
            markdown: textBlock.text,
            level: 1,
          },
        ],
        generatedAt: new Date().toISOString(),
        dataSources: ["AI-generated content"],
        nextSteps: [],
      };
    }

    // Ensure required fields
    reportContent.generatedAt =
      reportContent.generatedAt || new Date().toISOString();
    reportContent.dataSources = reportContent.dataSources || [];
    reportContent.nextSteps = reportContent.nextSteps || [];
    reportContent.sections = reportContent.sections || [];

    console.log(
      `[generate-report] Success: ${reportContent.sections.length} sections generated`
    );

    return new Response(JSON.stringify(reportContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-report] Error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

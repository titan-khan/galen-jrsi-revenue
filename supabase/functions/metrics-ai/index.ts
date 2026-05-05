import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * metrics-ai Edge Function
 *
 * Accepts a snapshot of all 20 metric values, the user's followed metric IDs,
 * and the current period/segment filters.
 *
 * Returns structured JSON:
 *  - summary: AISummaryData  (paragraph, positive/negative changes, top risers, needs attention)
 *  - suggestions: AISuggestionItem[]  (for non-followed metrics worth following)
 *  - insights: Record<metricId, { text, boldParts }>  (per-metric one-liner insights)
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

// ── Types ───────────────────────────────────────────────────────────────────

interface MetricSnapshot {
  id: string;
  name: string;
  domain: string;
  metricType?: string;
  direction?: string;
  currentValue: string;
  changePercent: number;
  changeAbsolute: string;
  status: string;
  isFollowing: boolean;
  parentMetricId?: string | null;
}

interface RequestBody {
  period: string;
  segment: string;
  followedMetricIds: string[];
  metricsSnapshot: MetricSnapshot[];
}

// ── System Prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(
  period: string,
  segment: string,
  followedIds: string[],
  metrics: MetricSnapshot[]
): string {
  const followedMetrics = metrics.filter((m) => followedIds.includes(m.id));
  const unfollowedMetrics = metrics.filter((m) => !followedIds.includes(m.id));

  const metricTable = metrics
    .map(
      (m) =>
        `| ${m.id} | ${m.name} | ${m.domain} | ${m.currentValue} | ${m.changePercent > 0 ? "+" : ""}${m.changePercent}% | ${m.changeAbsolute} | ${m.status} | ${m.isFollowing ? "YES" : "no"} | ${m.direction || "up_is_good"} |`
    )
    .join("\n");

  return `You are the Galen Metrics AI Agent for a 3PL (third-party logistics) fulfillment company in Indonesia.
Your job is to analyze metric performance data and produce structured JSON output.

## Business Context
- Company: 3PL fulfillment company in Indonesia
- Currency: IDR (Indonesian Rupiah)
- Segments: Clients, Channels, Warehouses, Delivery Partners, SKU Categories
- Current Period: ${period}
- Segment Filter: ${segment === "all" ? "All Segments" : segment}

## Followed Metrics (${followedIds.length})
These are the metrics the user actively monitors:
${followedMetrics.map((m) => `- ${m.id}: ${m.name} — ${m.currentValue} (${m.changePercent > 0 ? "+" : ""}${m.changePercent}%, ${m.status})`).join("\n")}

## All Metrics
| ID | Name | Domain | Value | Change | Absolute | Status | Following | Direction |
|----|------|--------|-------|--------|----------|--------|-----------|-----------|
${metricTable}

## Unfollowed Metrics (candidates for suggestions)
${unfollowedMetrics.map((m) => `- ${m.id}: ${m.name} [${m.domain}] — ${m.currentValue} (${m.changePercent > 0 ? "+" : ""}${m.changePercent}%)`).join("\n")}

## Governance Rules
1. NPS is calculated as (Promoters - Detractors) / Total × 100. Never average NPS scores.
2. Revenue figures use IDR. Use M for millions, B for billions, K for thousands.
3. "direction" field tells you whether up_is_good or down_is_good for each metric.
4. A metric with direction=down_is_good showing a negative change is POSITIVE news (e.g., Avg Delay Minutes going down).
5. Status thresholds: healthy (favorable change), warning (unfavorable 0-10%), critical (unfavorable >10%).

## Your Task
Produce a JSON object with exactly 3 keys: "summary", "suggestions", "insights".

### summary (AISummaryData)
Write a concise 2-3 sentence paragraph about the user's FOLLOWED metrics performance.
- Highlight the most notable positive and negative changes
- Bold the key values by listing them in boldParts
- List up to 5 positive and 5 negative changes as short descriptions
- List up to 4 topRisers (metrics performing well) and 4 needsAttention (metrics declining)
- CRITICAL: Use the exact metric ID from the "ID" column (e.g. "metric-revenue-total") in topRisers/needsAttention metricId fields

### suggestions (AISuggestionItem[])
Recommend 2-4 UNFOLLOWED metrics the user should consider following.
- Only suggest metrics that have meaningful signal (not zero change)
- Explain WHY with a clear sentence referencing the data
- Include the breadcrumb path from root metric (relatedMetricPath)
- Set confidence between 0.6 and 0.95
- Use accentType "warning" for declining metrics needing attention, "info" for positive ones worth monitoring
- CRITICAL: Use the exact metric ID from the "ID" column (e.g. "metric-ops-otp") in the metricId field

### insights (Record<metricId, { text, boldParts }>)
Generate a brief 1-sentence insight for each FOLLOWED metric.
- CRITICAL: The keys in this object MUST be the exact metric IDs from the "ID" column (e.g. "metric-revenue-total", "metric-customers-transacting"). Do NOT use metric names as keys.
- Reference specific values in the text
- List the key values/percentages in boldParts so they can be highlighted
- Focus on what changed and why it matters

## Output Format
Return ONLY valid JSON (no markdown, no code fences). The JSON must match this schema exactly:
{
  "summary": {
    "agentName": "Galen Metrics Agent",
    "timestamp": "<ISO timestamp>",
    "paragraph": "<2-3 sentence summary>",
    "boldParts": ["<values to bold>"],
    "positiveChanges": ["<metric_name> up X% to VALUE"],
    "negativeChanges": ["<metric_name> down X% to VALUE"],
    "topRisers": [{ "metricId": "<id>", "name": "<name>", "changePercent": <number> }],
    "needsAttention": [{ "metricId": "<id>", "name": "<name>", "changePercent": <number> }]
  },
  "suggestions": [
    {
      "id": "suggestion-<metricId>",
      "metricId": "<id>",
      "metricName": "<name>",
      "domain": "<Revenue|Customers|Operations|Product>",
      "confidence": <0.6-0.95>,
      "value": "<current value>",
      "changePercent": <number>,
      "why": "<clear explanation>",
      "relatedMetricPath": ["<root>", "...", "<this metric>"],
      "accentType": "<warning|info>"
    }
  ],
  "insights": {
    "<metricId>": { "text": "<1-sentence insight>", "boldParts": ["<values>"] }
  }
}`;
}

// ── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();
    const { period, segment, followedMetricIds, metricsSnapshot } = body;

    if (!metricsSnapshot || metricsSnapshot.length === 0) {
      return new Response(
        JSON.stringify({ error: "metricsSnapshot is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildSystemPrompt(period, segment, followedMetricIds, metricsSnapshot);

    // Call Claude API (non-streaming for structured JSON)
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Analyze the metrics for period ${period} (segment: ${segment === "all" ? "All Segments" : segment}) and generate the summary, suggestions, and insights JSON. Remember to return ONLY valid JSON with no markdown formatting.`,
          },
        ],
        stream: false,
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "AI service unavailable",
          details: `Claude API returned ${claudeResponse.status}`,
        }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const claudeResult = await claudeResponse.json();

    // Extract text content from Claude's response
    const textContent = claudeResult.content?.find(
      (block: { type: string }) => block.type === "text"
    );

    if (!textContent?.text) {
      throw new Error("No text content in Claude response");
    }

    // Parse the JSON from Claude's response
    let rawText = textContent.text.trim();

    // Strip markdown code fences if present (despite instructions)
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const aiResult = JSON.parse(rawText);

    // Validate required keys
    if (!aiResult.summary || !aiResult.suggestions || !aiResult.insights) {
      throw new Error("AI response missing required keys (summary, suggestions, insights)");
    }

    return new Response(JSON.stringify(aiResult), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("metrics-ai error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate AI metrics analysis",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

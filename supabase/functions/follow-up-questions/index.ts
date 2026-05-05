import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * follow-up-questions Edge Function
 *
 * AI-powered follow-up question generation agent skill.
 * Receives conversation context + metric data from the frontend,
 * calls Claude Haiku for fast, contextual question generation.
 *
 * Company-agnostic — all context (metric names, domains, values)
 * comes dynamically from the request payload.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

// ── Types ───────────────────────────────────────────────────────────────────

interface MentionedMetric {
  id: string;
  name: string;
  domain: string;
  currentValue: string;
  changePercent: number;
  status: string;
}

interface RequestBody {
  userQuestion: string;
  assistantResponse: string;
  summary: {
    keyTakeaway: string;
    confidence: string;
    nextSteps?: string;
  } | null;
  mentionedMetrics: MentionedMetric[];
  allMetricNames: string[];
  dataDomains: string[];
}

interface FollowUpQuestion {
  id: string;
  text: string;
  category: string;
}

// ── System Prompt (static, cacheable) ───────────────────────────────────────

const SYSTEM_PROMPT = `You are a follow-up question generator for a business metrics intelligence platform.

Given a user question, the assistant's response, metric data, and available data domains, generate 2-3 follow-up questions.

RULES:
1. Questions MUST reference REAL metric names from the provided context. Never invent metric names.
2. Questions must be ANSWERABLE using the data domains provided. Do not ask about data that isn't available.
3. Never repeat or rephrase the user's original question.
4. Never repeat information already covered in the assistant's response.
5. Each question explores a DIFFERENT angle: deeper analysis, actionable next steps, cross-metric correlation, dimensional breakdown, or historical trends.
6. Keep questions conversational and concise (under 120 characters).
7. Use specific values and percentages from the metric data when relevant.
8. Do not reference any company name, industry, or business type unless explicitly mentioned in the context.

CATEGORIES (assign exactly one per question):
- next-step: Deeper analysis of the primary topic
- action: What to do about a problem
- correlation: Cross-metric or cross-domain relationship
- drill-down: Breakdown by dimension, segment, or time period
- trend: Historical pattern or trajectory

OUTPUT: Return ONLY valid JSON (no markdown, no code fences):
{"questions":[{"id":"ai-1","text":"...","category":"..."},{"id":"ai-2","text":"...","category":"..."}]}`;

// ── User Message Builder (dynamic, per-request) ─────────────────────────────

function buildUserMessage(body: RequestBody): string {
  const {
    userQuestion,
    assistantResponse,
    summary,
    mentionedMetrics,
    allMetricNames,
    dataDomains,
  } = body;

  // Truncate response to keep input tokens low
  const truncatedResponse =
    assistantResponse.length > 800
      ? assistantResponse.slice(0, 800) + "..."
      : assistantResponse;

  const metricsSection =
    mentionedMetrics.length > 0
      ? mentionedMetrics
          .map(
            (m) =>
              `- ${m.name} (${m.domain}): ${m.currentValue}, ${m.changePercent > 0 ? "+" : ""}${m.changePercent}% change, status: ${m.status}`
          )
          .join("\n")
      : "No specific metrics mentioned.";

  const takeaway = summary?.keyTakeaway || "N/A";

  return `User asked: "${userQuestion}"

Assistant response (summary):
${truncatedResponse}

Key takeaway: ${takeaway}

Mentioned metrics:
${metricsSection}

All available metrics: [${allMetricNames.join(", ")}]
Available data domains: [${dataDomains.join(", ")}]

Generate 2-3 follow-up questions.`;
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

    // Validate required fields
    if (!body.userQuestion || !body.assistantResponse) {
      return new Response(
        JSON.stringify({
          error: "userQuestion and assistantResponse are required",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const userMessage = buildUserMessage(body);

    // Call Claude Haiku (non-streaming for structured JSON)
    const claudeResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 300,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userMessage }],
          stream: false,
        }),
      }
    );

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error(
        "Claude API error:",
        claudeResponse.status,
        errorText
      );
      return new Response(
        JSON.stringify({
          error: "AI service unavailable",
          details: `Claude API returned ${claudeResponse.status}`,
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
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
      rawText = rawText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const aiResult = JSON.parse(rawText);

    // Validate response structure
    if (
      !aiResult.questions ||
      !Array.isArray(aiResult.questions) ||
      aiResult.questions.length === 0
    ) {
      throw new Error(
        "AI response missing required 'questions' array or array is empty"
      );
    }

    // Validate and normalize each question
    const questions: FollowUpQuestion[] = aiResult.questions
      .slice(0, 3)
      .map((q: FollowUpQuestion, i: number) => ({
        id: q.id || `ai-followup-${i + 1}`,
        text: String(q.text || "").slice(0, 200),
        category: q.category || "next-step",
      }));

    return new Response(JSON.stringify({ questions }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("follow-up-questions error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate follow-up questions",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});

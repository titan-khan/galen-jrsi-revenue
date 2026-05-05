// =============================================================================
// T0 CLASSIFIER — Routes queries to the right model tier via GPT-5.4 Nano
// Cost: ~$0.0001 per call (~$2.50/mo at 25K requests)
// =============================================================================

import { CLASSIFIER_MODEL, CLASSIFIER_MAX_TOKENS, OPENROUTER_URL } from "./config.ts";
import type { ClassificationResult, Tier } from "./types.ts";

const CLASSIFIER_PROMPT = `You are a query complexity classifier for Galen, an AI-powered analytics platform for Indonesian logistics and FMCG companies. Classify each user query into exactly one tier based on the reasoning complexity required.

TIER DEFINITIONS:

T1 (Simple): Direct data retrieval, single metric lookup, FAQ, basic aggregation.
  Signals: "berapa", "tampilkan", "show me", "what is the current", "list", single metric name
  Examples: "Berapa total shipment bulan lalu?", "Show top 5 clients by revenue", "What is current OTP?"

T2 (Standard): Trend analysis, multi-metric comparison, standard report generation, basic pattern detection.
  Signals: "compare", "trend", "bandingkan", "over time", "report", "summary", multiple metrics mentioned
  Examples: "Compare OTP across 3 routes", "Revenue trend per region Q1-Q3", "Generate monthly report"

T3 (Complex): Root cause analysis, why/how questions, recommendations, anomaly investigation, multi-variable reasoning.
  Signals: "why", "kenapa", "mengapa", "how", "bagaimana", "recommend", "root cause", "correlation", "what's causing"
  Examples: "Why did NPS drop in Surabaya?", "What's driving margin compression?", "Recommend route allocation"

T4 (Critical): Executive/board-level decision support, cross-domain synthesis, scenario modeling, high-stakes strategic analysis.
  Signals: "strategic", "board", "executive", "scenario", "investment", "exit", "acquisition", "risk matrix", "direktur", "direksi"
  Examples: "Should we exit Java Timur market?", "Full competitive scenario analysis", "Board-ready investment recommendation"

RULES:
- When in doubt between two tiers, choose the LOWER (cheaper) tier.
- If the query contains both simple and complex parts, classify by the MOST complex part.
- Bahasa Indonesia and English queries follow the same tier logic.

Respond with ONLY valid JSON, no markdown, no explanation:
{"tier": "T1", "confidence": 0.92, "reasoning": "single metric lookup", "keywords": ["berapa"]}`;

const FALLBACK_PROMPT = `Classify this query into T1, T2, T3, or T4. Respond ONLY with the tier name, nothing else.`;

/**
 * Classify a user query into a routing tier.
 * Returns T2 with low confidence on any failure (safe middle ground).
 */
export async function classifyRequest(
  apiKey: string,
  userMessage: string,
  systemContextLength: number,
): Promise<ClassificationResult> {
  const estimatedTokens = Math.ceil((userMessage.length + systemContextLength) / 4);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        max_tokens: CLASSIFIER_MAX_TOKENS,
        temperature: 0,
        messages: [
          { role: "system", content: CLASSIFIER_PROMPT },
          { role: "user", content: userMessage.slice(0, 2000) },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`[routing/classifier] API returned ${response.status}, defaulting to T2`);
      return { tier: "T2", confidence: 0.5, reasoning: "classifier_api_error", keywords: [], estimatedTokens };
    }

    const result = await response.json();
    const raw = result.choices?.[0]?.message?.content?.trim() || "";

    try {
      // Try to extract JSON from response (may have markdown fences)
      let jsonStr = raw;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      const parsed = JSON.parse(jsonStr);
      const tier = parsed.tier as Tier;

      // Validate tier is valid
      if (!["T1", "T2", "T3", "T4"].includes(tier)) {
        throw new Error(`Invalid tier: ${tier}`);
      }

      return {
        tier,
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
        reasoning: String(parsed.reasoning || ""),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        estimatedTokens,
      };
    } catch {
      console.warn("[routing/classifier] Parse error, trying fallback. Raw:", raw.slice(0, 200));
      return fallbackClassify(apiKey, userMessage, estimatedTokens);
    }
  } catch (err) {
    console.error("[routing/classifier] Error:", err);
    return { tier: "T2", confidence: 0.5, reasoning: "classifier_exception", keywords: [], estimatedTokens };
  }
}

/** Simple fallback: ask for just the tier name */
async function fallbackClassify(
  apiKey: string,
  userMessage: string,
  estimatedTokens: number,
): Promise<ClassificationResult> {
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        max_tokens: 20,
        temperature: 0,
        messages: [
          { role: "system", content: FALLBACK_PROMPT },
          { role: "user", content: userMessage.slice(0, 1000) },
        ],
      }),
    });

    if (!response.ok) {
      return { tier: "T2", confidence: 0.5, reasoning: "fallback_api_error", keywords: [], estimatedTokens };
    }

    const result = await response.json();
    const raw = (result.choices?.[0]?.message?.content || "").trim().toUpperCase();

    for (const tier of ["T1", "T2", "T3", "T4"] as Tier[]) {
      if (raw.includes(tier)) {
        return { tier, confidence: 0.6, reasoning: "fallback_classifier", keywords: [], estimatedTokens };
      }
    }
  } catch {
    // fall through
  }

  return { tier: "T2", confidence: 0.5, reasoning: "fallback_default", keywords: [], estimatedTokens };
}

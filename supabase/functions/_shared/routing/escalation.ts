// =============================================================================
// ESCALATION — Pre-routing rules and T3 self-confidence check
// =============================================================================

import {
  TIER_REGISTRY,
  T4_KEYWORDS,
  LONG_CONTEXT_THRESHOLD,
  T3_TOKEN_SAFETY_LIMIT,
  TIER_ORDER,
  OPENROUTER_URL,
} from "./config.ts";
import type { Tier, ClassificationResult } from "./types.ts";

function nextTier(tier: Tier): Tier {
  const idx = TIER_ORDER.indexOf(tier);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : "T4";
}

/**
 * Apply escalation rules BEFORE routing.
 * Returns the (possibly bumped) tier.
 */
export function applyEscalation(
  classification: ClassificationResult,
  userMessage: string,
): { finalTier: Tier; escalated: boolean; reason?: string } {
  let currentTier = classification.tier;
  let escalated = false;
  let reason: string | undefined;

  // Rule 1: Keyword detection → direct T4
  const lowerMsg = userMessage.toLowerCase();
  const matchedKeyword = T4_KEYWORDS.find(kw => lowerMsg.includes(kw));
  if (matchedKeyword) {
    return { finalTier: "T4", escalated: true, reason: `keyword:${matchedKeyword}` };
  }

  // Rule 2: Long context → force T3+
  if (classification.estimatedTokens > LONG_CONTEXT_THRESHOLD) {
    if (TIER_ORDER.indexOf(currentTier) < TIER_ORDER.indexOf("T3")) {
      currentTier = "T3";
      escalated = true;
      reason = `long_context:${classification.estimatedTokens}`;
    }
  }

  // Rule 3: Kimi K2 (T3) has 131K context limit → skip to T4
  if (currentTier === "T3" && classification.estimatedTokens > T3_TOKEN_SAFETY_LIMIT) {
    return { finalTier: "T4", escalated: true, reason: `t3_token_overflow:${classification.estimatedTokens}` };
  }

  // Rule 4: Low confidence → bump up one tier
  const config = TIER_REGISTRY[currentTier];
  if (classification.confidence < config.confidenceThreshold) {
    const bumped = nextTier(currentTier);
    reason = reason || `low_confidence:${classification.confidence.toFixed(2)}<${config.confidenceThreshold}`;
    currentTier = bumped;
    escalated = true;
  }

  return { finalTier: currentTier, escalated, reason };
}

/**
 * Post-response T3 self-confidence check.
 * Ask the T3 model to self-assess. If confidence < 0.70, escalate to T4.
 * Only used for non-streaming calls (~$0.0005 per check).
 */
export async function checkT3SelfConfidence(
  apiKey: string,
  responseText: string,
): Promise<{ needsEscalation: boolean; selfConfidence: number }> {
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TIER_REGISTRY.T3.model,
        max_tokens: 100,
        temperature: 0,
        messages: [{
          role: "user",
          content: `Rate your confidence in this analysis on a scale of 0.0 to 1.0. Consider: Did you have enough data? Are there significant assumptions? Could this be misleading?\n\nReturn ONLY valid JSON: {"confidence": 0.85, "reason": "brief"}\n\nAnalysis:\n${responseText.slice(0, 3000)}`,
        }],
      }),
    });

    if (!response.ok) {
      return { needsEscalation: false, selfConfidence: 1.0 };
    }

    const result = await response.json();
    const raw = result.choices?.[0]?.message?.content?.trim() || "";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { needsEscalation: false, selfConfidence: 1.0 };

    const parsed = JSON.parse(jsonMatch[0]);
    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 1.0));

    console.log(`[routing/escalation] T3 self-confidence: ${confidence} (reason: ${parsed.reason || "none"})`);

    return {
      needsEscalation: confidence < TIER_REGISTRY.T3.confidenceThreshold,
      selfConfidence: confidence,
    };
  } catch (err) {
    console.warn("[routing/escalation] T3 confidence check failed:", err);
    return { needsEscalation: false, selfConfidence: 1.0 };
  }
}

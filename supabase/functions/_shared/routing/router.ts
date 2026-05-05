// =============================================================================
// ROUTER — Main orchestrator for multi-model routing
//
// Two entry points:
//   routedFetch()  — non-streaming, returns parsed JSON response
//   routedStream() — streaming, returns raw Response with SSE body
// =============================================================================

import {
  TIER_REGISTRY,
  ROUTING_PHASE,
  SHADOW_OVERRIDE_MODEL,
  TIER_PHASE_MAP,
  OPENROUTER_URL,
} from "./config.ts";
import { classifyRequest } from "./classifier.ts";
import { applyEscalation, checkT3SelfConfidence } from "./escalation.ts";
import { logRoutingDecision } from "./logger.ts";
import type { Tier, RoutingCallOptions, RoutingDecision, ClassificationResult, RoutingLogEntry } from "./types.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isTierEnabled(tier: Tier): boolean {
  return ROUTING_PHASE >= TIER_PHASE_MAP[tier];
}

function resolveModel(decision: RoutingDecision, forced: boolean): string {
  // When forceTier is used, always use the tier's model — the caller knows what they need
  if (forced) return decision.model;
  // For dynamically classified calls, apply phase gate
  if (decision.shadowMode) return SHADOW_OVERRIDE_MODEL;
  if (!isTierEnabled(decision.finalTier)) return SHADOW_OVERRIDE_MODEL;
  return decision.model;
}

function estimateTokens(messages: Array<{ role: string; content: string }>): number {
  const totalChars = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
  return Math.ceil(totalChars / 3.5); // conservative for mixed Bahasa/English
}

function buildLogEntry(
  options: RoutingCallOptions,
  classification: ClassificationResult,
  decision: RoutingDecision,
  actualModel: string,
  escalated: boolean,
  reason: string | undefined,
  startTime: number,
  classifierLatencyMs: number,
  success: boolean,
  errorCode?: string,
): RoutingLogEntry {
  return {
    timestamp: new Date().toISOString(),
    caller_function: options.callerFunction,
    call_site_id: options.callSiteId,
    classified_tier: classification.tier,
    final_tier: decision.finalTier,
    model: actualModel,
    escalated,
    escalation_reason: reason,
    input_tokens_estimate: classification.estimatedTokens,
    phase: ROUTING_PHASE,
    shadow_mode: decision.shadowMode,
    shadow_override_model: decision.shadowMode ? actualModel : undefined,
    latency_ms: Math.round(Date.now() - startTime),
    classifier_latency_ms: classifierLatencyMs,
    success,
    error_code: errorCode,
  };
}

async function classifyOrForce(
  apiKey: string,
  options: RoutingCallOptions,
): Promise<{ classification: ClassificationResult; classifierLatencyMs: number }> {
  if (options.forceTier) {
    return {
      classification: {
        tier: options.forceTier,
        confidence: 1.0,
        reasoning: "forced",
        keywords: [],
        estimatedTokens: estimateTokens(options.messages),
      },
      classifierLatencyMs: 0,
    };
  }

  const classStart = Date.now();
  const userMsg = [...options.messages].reverse().find(m => m.role === "user")?.content || "";
  const systemLen = options.messages.find(m => m.role === "system")?.content?.length || 0;
  const classification = await classifyRequest(apiKey, userMsg, systemLen);
  return {
    classification,
    classifierLatencyMs: Date.now() - classStart,
  };
}

function buildDecision(
  classification: ClassificationResult,
  userMessage: string,
): { decision: RoutingDecision; escalated: boolean; reason?: string } {
  const { finalTier, escalated, reason } = applyEscalation(classification, userMessage);
  const shadowMode = ROUTING_PHASE === 1;

  return {
    decision: {
      finalTier,
      model: TIER_REGISTRY[finalTier].model,
      classifiedTier: classification.tier,
      escalatedFrom: escalated ? classification.tier : undefined,
      escalationReason: reason,
      shadowMode,
      phase: ROUTING_PHASE,
    },
    escalated,
    reason,
  };
}

// ─── Non-Streaming ────────────────────────────────────────────────────────────

/**
 * Non-streaming routed API call.
 * Returns the parsed JSON response from OpenRouter (same shape as before).
 */
// deno-lint-ignore no-explicit-any
export async function routedFetch(
  apiKey: string,
  options: RoutingCallOptions,
): Promise<{ response: any; decision: RoutingDecision }> {
  const startTime = Date.now();

  // Step 1: Classify
  const { classification, classifierLatencyMs } = await classifyOrForce(apiKey, options);

  // Step 2: Escalation rules
  const userMsg = [...options.messages].reverse().find(m => m.role === "user")?.content || "";
  const { decision, escalated, reason } = buildDecision(classification, userMsg);
  const actualModel = resolveModel(decision, !!options.forceTier);

  // Step 3: API call
  const fetchInit: RequestInit = {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: actualModel,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      messages: options.messages,
      stream: false,
    }),
  };
  if (options.signal) fetchInit.signal = options.signal;

  const apiResponse = await fetch(OPENROUTER_URL, fetchInit);

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    logRoutingDecision(buildLogEntry(
      options, classification, decision, actualModel,
      escalated, reason, startTime, classifierLatencyMs,
      false, String(apiResponse.status),
    ));
    throw new Error(`AI API ${apiResponse.status}: ${errorText.slice(0, 500)}`);
  }

  const result = await apiResponse.json();

  // Step 4: T3 self-confidence check (non-streaming only, not in shadow mode)
  if (decision.finalTier === "T3" && !decision.shadowMode) {
    const responseText = result.choices?.[0]?.message?.content || "";
    const { needsEscalation, selfConfidence } = await checkT3SelfConfidence(apiKey, responseText);

    if (needsEscalation) {
      console.log(`[routing] T3→T4 escalation: selfConfidence=${selfConfidence}`);

      // Re-run on T4
      const t4FetchInit: RequestInit = {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TIER_REGISTRY.T4.model,
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          messages: options.messages,
          stream: false,
        }),
      };
      if (options.signal) t4FetchInit.signal = options.signal;

      const t4Response = await fetch(OPENROUTER_URL, t4FetchInit);
      if (t4Response.ok) {
        const t4Result = await t4Response.json();
        decision.finalTier = "T4";
        decision.model = TIER_REGISTRY.T4.model;
        decision.escalationReason = `${reason || ""};t3_self_confidence=${selfConfidence.toFixed(2)}`;

        logRoutingDecision(buildLogEntry(
          options, classification, decision, TIER_REGISTRY.T4.model,
          true, decision.escalationReason, startTime, classifierLatencyMs, true,
        ));

        return { response: t4Result, decision };
      }
    }
  }

  // Log success
  logRoutingDecision(buildLogEntry(
    options, classification, decision, actualModel,
    escalated, reason, startTime, classifierLatencyMs, true,
  ));

  return { response: result, decision };
}

// ─── Streaming ────────────────────────────────────────────────────────────────

/**
 * Streaming routed API call.
 * Returns raw Response with SSE body — pipe through existing transform streams.
 *
 * NOTE: T3 self-confidence check is NOT possible for streaming (response is streamed
 * directly to client). This is acceptable — keyword escalation catches most T4 queries.
 */
export async function routedStream(
  apiKey: string,
  options: RoutingCallOptions,
): Promise<{ response: Response; decision: RoutingDecision }> {
  const startTime = Date.now();

  // Step 1: Classify
  const { classification, classifierLatencyMs } = await classifyOrForce(apiKey, options);

  // Step 2: Escalation rules
  const userMsg = [...options.messages].reverse().find(m => m.role === "user")?.content || "";
  const { decision, escalated, reason } = buildDecision(classification, userMsg);
  const actualModel = resolveModel(decision, !!options.forceTier);

  // Step 3: Streaming API call
  const fetchInit: RequestInit = {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: actualModel,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      messages: options.messages,
      stream: true,
    }),
  };
  if (options.signal) fetchInit.signal = options.signal;

  const response = await fetch(OPENROUTER_URL, fetchInit);

  // Log (fire and forget)
  logRoutingDecision(buildLogEntry(
    options, classification, decision, actualModel,
    escalated, reason, startTime, classifierLatencyMs,
    response.ok, response.ok ? undefined : String(response.status),
  ));

  return { response, decision };
}

// =============================================================================
// ROUTING CONFIG — Model registry, tier definitions, phase gate
// =============================================================================

import type { Tier, TierConfig } from "./types.ts";

// ─── Model Registry ───────────────────────────────────────────────────────────

export const TIER_REGISTRY: Record<Tier, TierConfig> = {
  T1: {
    tier: "T1",
    model: "google/gemini-3-flash-preview",
    label: "Gemini 3 Flash",
    costPerMInput: 0.50,
    costPerMOutput: 3.00,
    contextLimit: 1_000_000,
    confidenceThreshold: 0.85,
    supportsTools: true,
  },
  T2: {
    tier: "T2",
    model: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    costPerMInput: 0.75,
    costPerMOutput: 4.50,
    contextLimit: 128_000,
    confidenceThreshold: 0.80,
    supportsTools: true,
  },
  T3: {
    tier: "T3",
    model: "moonshotai/kimi-k2-0905",
    label: "Kimi K2",
    costPerMInput: 0.60,
    costPerMOutput: 2.50,
    contextLimit: 131_072,
    confidenceThreshold: 0.70,
    supportsTools: true,
  },
  T4: {
    tier: "T4",
    model: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4.5",
    costPerMInput: 3.00,
    costPerMOutput: 15.00,
    contextLimit: 200_000,
    confidenceThreshold: 0, // never escalates further
    supportsTools: true,
  },
};

// ─── Classifier Config ────────────────────────────────────────────────────────

export const CLASSIFIER_MODEL = "openai/gpt-5.4-nano";
export const CLASSIFIER_MAX_TOKENS = 200;

// ─── Phase Gate ───────────────────────────────────────────────────────────────
// Phase 1 = shadow mode (classify but use Sonnet for all)
// Phase 2 = T1 enabled
// Phase 3 = T1 + T2 enabled
// Phase 4 = T1 + T2 + T3 enabled
// Phase 5 = full routing (all tiers)

export const ROUTING_PHASE = 2;

// In shadow mode (phase 1), classify but always use this model
export const SHADOW_OVERRIDE_MODEL = "anthropic/claude-sonnet-4";

// ─── Escalation Rules ─────────────────────────────────────────────────────────

/** Keywords that bypass classifier and go direct to T4 */
export const T4_KEYWORDS = [
  "strategic", "board", "executive", "c-level", "direktur",
  "direksi", "strategis", "keputusan besar", "ceo", "cto", "cfo",
  "investor", "stakeholder",
];

/** Force T3+ for queries above this token estimate */
export const LONG_CONTEXT_THRESHOLD = 100_000;

/** Skip T3 (Kimi K2, 131K limit) and go to T4 if above this */
export const T3_TOKEN_SAFETY_LIMIT = 120_000;

// ─── Tier Ordering ────────────────────────────────────────────────────────────

export const TIER_ORDER: Tier[] = ["T1", "T2", "T3", "T4"];

/** Minimum phase required for each tier to be active */
export const TIER_PHASE_MAP: Record<Tier, number> = {
  T1: 2,
  T2: 3,
  T3: 4,
  T4: 5,
};

// ─── OpenRouter ───────────────────────────────────────────────────────────────

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

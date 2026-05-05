// =============================================================================
// FINDINGS VALIDATION — Post-parse governance enforcement for specialist output
// Validates structure, ranges, cross-references, and consistency
// Hybrid approach: auto-fix where safe, warn on semantic issues, reject on
// unrecoverable structural failures
// =============================================================================

// ─── Types ──────────────────────────────────────────────────────────────

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  severity: "error" | "warning" | "info";
  autoFixed: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  autoFixCount: number;
}

interface Insight {
  id: string;
  type: string;
  severity: string;
  headline: string;
  description: string;
  root_cause: string;
  root_cause_ranks: number[];
  confidence: number;
  related_metrics: string[];
}

interface RootCause {
  rank: number;
  cause: string;
  contribution_pct: number;
  confidence: number;
  evidence: string[];
  insight_ids: string[];
}

interface Recommendation {
  title: string;
  description: string;
  current_state?: string;
  target_state?: string;
  calculation?: {
    line_items?: string[];
    assumptions?: string[];
    result?: string;
  };
  quarterly_impact?: string;
  tactics?: string[];
  impact_type?: string;
  impact_value?: number;
  impact_confidence?: number;
  effort?: string;
  priority?: string;
  deadline?: string;
  root_cause_rank?: number;
  action_scope?: string;
  insight_ids?: string[];
  galen_action?: {
    type: string;
    suggested_name: string;
    suggested_business_view: string;
    suggested_metrics: string[];
    suggested_description: string;
  } | null;
}

// ─── Constants ──────────────────────────────────────────────────────────

const REQUIRED_KEYS: { key: string; type: "object" | "array" | "string" }[] = [
  { key: "executive_summary", type: "object" },
  { key: "insights", type: "array" },
  { key: "root_causes", type: "array" },
  { key: "recommendations", type: "array" },
  { key: "ai_summary", type: "string" },
];

const CARDINALITY: Record<string, { min: number; max: number }> = {
  insights: { min: 3, max: 6 },
  root_causes: { min: 2, max: 4 },
  recommendations: { min: 2, max: 5 },
  cross_specialist_signals: { min: 1, max: 3 },
};

const ALLOWED_SEVERITY = ["critical", "high", "medium", "low"];
const ALLOWED_EFFORT = ["low", "medium", "high"];
const ALLOWED_IMPACT_TYPE = ["revenue", "cost", "risk", "efficiency"];
const ALLOWED_ACTION_SCOPE = ["strategic", "tactical"];
const ALLOWED_INSIGHT_TYPE = ["anomaly", "trend", "pattern", "risk"];

// NPS averaging detection patterns
const NPS_AVG_PATTERNS = [
  /average\s+(?:of\s+)?nps/i,
  /nps\s+average/i,
  /mean\s+nps/i,
  /avg[\.\s]+nps/i,
  /averaging\s+(?:the\s+)?nps/i,
];

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Extract numeric value from IDR-formatted string.
 * Handles: "Rp 8,645,000" → 8645000, "Rp 32,5jt" → 32500000,
 *          "Rp 2,1M" → 2100000000, "8645000" → 8645000
 */
export function extractNumericFromIDR(text: string): number | null {
  if (!text || typeof text !== "string") return null;

  // Try "jt" suffix (juta = million)
  const jtMatch = text.match(
    /(?:Rp\s*)?(\d+(?:[.,]\d+)?)\s*jt/i,
  );
  if (jtMatch) {
    const num = parseFloat(jtMatch[1].replace(",", "."));
    return isNaN(num) ? null : Math.round(num * 1_000_000);
  }

  // Try "M" suffix (miliar = billion in Indonesian context)
  // Be careful: only match M when it looks like Indonesian currency context
  const mMatch = text.match(
    /(?:Rp\s*)?(\d+(?:[.,]\d+)?)\s*M(?:iliar)?/i,
  );
  if (mMatch) {
    const num = parseFloat(mMatch[1].replace(",", "."));
    return isNaN(num) ? null : Math.round(num * 1_000_000_000);
  }

  // Try plain number with Rp prefix: "Rp 8,645,000" or "Rp 8.645.000"
  const rpMatch = text.match(
    /Rp\s*([\d.,]+)/,
  );
  if (rpMatch) {
    // Remove thousand separators (both . and ,)
    const cleaned = rpMatch[1]
      .replace(/\./g, "")
      .replace(/,/g, "");
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? null : num;
  }

  // Fallback: any large number in the string
  const numMatch = text.match(/(\d[\d.,]*\d)/);
  if (numMatch) {
    const cleaned = numMatch[1].replace(/[.,]/g, "");
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * Clamp a number to [min, max], returning default if NaN/undefined.
 */
function clampNum(
  value: unknown,
  min: number,
  max: number,
  defaultValue: number,
): { value: number; clamped: boolean; defaulted: boolean } {
  if (value === undefined || value === null || typeof value !== "number" || isNaN(value)) {
    return { value: defaultValue, clamped: false, defaulted: true };
  }
  if (value < min || value > max) {
    return { value: Math.max(min, Math.min(max, value)), clamped: true, defaulted: false };
  }
  return { value, clamped: false, defaulted: false };
}

/**
 * Validate an enum value, returning default if invalid. Case-insensitive.
 */
function validateEnum(
  value: unknown,
  allowed: string[],
  defaultValue: string,
): { value: string; fixed: boolean } {
  if (typeof value !== "string") {
    return { value: defaultValue, fixed: true };
  }
  const lower = value.toLowerCase().trim();
  if (allowed.includes(lower)) {
    if (lower !== value) {
      return { value: lower, fixed: true }; // case fix
    }
    return { value: lower, fixed: false };
  }
  return { value: defaultValue, fixed: true };
}

// ─── Main Validation Function ───────────────────────────────────────────

/**
 * Validate and auto-fix specialist findings output.
 * Mutates the findings object in-place for auto-fixes.
 * Returns validation result with warnings and validity status.
 */
export function validateFindings(
  findings: Record<string, unknown>,
  domain: string,
): ValidationResult {
  const warnings: ValidationWarning[] = [];
  let isValid = true;
  let autoFixCount = 0;

  function warn(
    field: string,
    code: string,
    message: string,
    severity: "error" | "warning" | "info",
    autoFixed: boolean,
  ) {
    warnings.push({ field, code, message, severity, autoFixed });
    if (autoFixed) autoFixCount++;
  }

  // ── Phase 1: Structural Completeness ─────────────────────────────────

  for (const { key, type } of REQUIRED_KEYS) {
    const val = findings[key];
    if (val === undefined || val === null) {
      if (type === "array") {
        // Auto-fix: default to empty array
        findings[key] = [];
        warn(key, "MISSING_FIELD_DEFAULTED", `Missing "${key}" — defaulted to empty array`, "warning", true);
      } else if (type === "string") {
        findings[key] = "";
        warn(key, "MISSING_FIELD_DEFAULTED", `Missing "${key}" — defaulted to empty string`, "warning", true);
      } else {
        // Cannot auto-fix executive_summary or other objects
        warn(key, "MISSING_FIELD", `Missing required field "${key}" — cannot auto-fix`, "error", false);
        isValid = false;
      }
    } else if (type === "array" && !Array.isArray(val)) {
      findings[key] = [];
      warn(key, "WRONG_TYPE_FIXED", `"${key}" was not an array — defaulted to empty array`, "warning", true);
    }
  }

  // ── Phase 2: Cardinality ─────────────────────────────────────────────

  for (const [key, { min, max }] of Object.entries(CARDINALITY)) {
    const arr = findings[key];
    if (!Array.isArray(arr)) continue;

    if (arr.length < min) {
      const severity = arr.length === 0 && key === "insights" ? "error" : "warning";
      warn(key, "BELOW_MIN_COUNT", `"${key}" has ${arr.length} items (min: ${min})`, severity as "error" | "warning", false);
      if (arr.length === 0 && key === "insights") {
        isValid = false;
      }
    }

    if (arr.length > max) {
      // Truncate to max, preferring higher-severity/higher-rank items
      findings[key] = arr.slice(0, max);
      warn(key, "ABOVE_MAX_TRUNCATED", `"${key}" had ${arr.length} items (max: ${max}) — truncated to ${max}`, "info", true);
    }
  }

  // ── Phase 3: Value Ranges ────────────────────────────────────────────

  const insights = (findings.insights || []) as Insight[];
  const rootCauses = (findings.root_causes || []) as RootCause[];
  const recommendations = (findings.recommendations || []) as Recommendation[];

  // Clamp confidence values on insights
  for (let i = 0; i < insights.length; i++) {
    const ins = insights[i];
    const { value, clamped, defaulted } = clampNum(ins.confidence, 0, 100, 50);
    if (clamped) {
      warn(`insights[${i}].confidence`, "CONFIDENCE_CLAMPED", `Insight "${ins.id}" confidence ${ins.confidence} clamped to ${value}`, "info", true);
    }
    if (defaulted) {
      warn(`insights[${i}].confidence`, "CONFIDENCE_DEFAULTED", `Insight "${ins.id}" confidence was missing — defaulted to ${value}`, "info", true);
    }
    ins.confidence = value;
  }

  // Clamp confidence on root causes
  for (let i = 0; i < rootCauses.length; i++) {
    const rc = rootCauses[i];
    const { value, clamped, defaulted } = clampNum(rc.confidence, 0, 100, 50);
    if (clamped || defaulted) {
      warn(`root_causes[${i}].confidence`, clamped ? "CONFIDENCE_CLAMPED" : "CONFIDENCE_DEFAULTED",
        `Root cause "${rc.cause}" confidence ${clamped ? 'clamped' : 'defaulted'} to ${value}`, "info", true);
    }
    rc.confidence = value;
  }

  // Clamp impact_confidence on recommendations
  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    const { value, clamped, defaulted } = clampNum(rec.impact_confidence, 0, 100, 50);
    if (clamped || defaulted) {
      warn(`recommendations[${i}].impact_confidence`, clamped ? "CONFIDENCE_CLAMPED" : "CONFIDENCE_DEFAULTED",
        `Recommendation "${rec.title}" impact_confidence ${clamped ? 'clamped' : 'defaulted'} to ${value}`, "info", true);
    }
    rec.impact_confidence = value;
  }

  // Validate contribution_pct sum
  if (rootCauses.length > 0) {
    const sum = rootCauses.reduce((s, rc) => s + (rc.contribution_pct || 0), 0);
    if (sum < 80 || sum > 120) {
      // Normalize to sum to 100
      if (sum > 0) {
        for (const rc of rootCauses) {
          rc.contribution_pct = Math.round((rc.contribution_pct / sum) * 100);
        }
        warn("root_causes.contribution_pct", "CONTRIBUTION_SUM_NORMALIZED",
          `contribution_pct sum was ${sum}% — normalized to 100%`, "info", true);
      } else {
        // All zeros — distribute evenly
        const evenPct = Math.round(100 / rootCauses.length);
        for (const rc of rootCauses) {
          rc.contribution_pct = evenPct;
        }
        warn("root_causes.contribution_pct", "CONTRIBUTION_ALL_ZERO",
          `All contribution_pct were 0 — distributed evenly at ${evenPct}% each`, "warning", true);
      }
    }
  }

  // ── Phase 4: Enum Validation ─────────────────────────────────────────

  // Insight enums
  for (let i = 0; i < insights.length; i++) {
    const ins = insights[i];
    const typeResult = validateEnum(ins.type, ALLOWED_INSIGHT_TYPE, "anomaly");
    if (typeResult.fixed) {
      warn(`insights[${i}].type`, "ENUM_FIXED", `Insight "${ins.id}" type "${ins.type}" → "${typeResult.value}"`, "info", true);
      ins.type = typeResult.value;
    }
    const sevResult = validateEnum(ins.severity, ALLOWED_SEVERITY, "medium");
    if (sevResult.fixed) {
      warn(`insights[${i}].severity`, "ENUM_FIXED", `Insight "${ins.id}" severity "${ins.severity}" → "${sevResult.value}"`, "info", true);
      ins.severity = sevResult.value;
    }
  }

  // Recommendation enums
  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    const effortResult = validateEnum(rec.effort, ALLOWED_EFFORT, "medium");
    if (effortResult.fixed) {
      warn(`recommendations[${i}].effort`, "ENUM_FIXED", `Recommendation "${rec.title}" effort "${rec.effort}" → "${effortResult.value}"`, "info", true);
      rec.effort = effortResult.value;
    }
    const priorityResult = validateEnum(rec.priority, ALLOWED_SEVERITY, "medium");
    if (priorityResult.fixed) {
      warn(`recommendations[${i}].priority`, "ENUM_FIXED", `Recommendation "${rec.title}" priority "${rec.priority}" → "${priorityResult.value}"`, "info", true);
      rec.priority = priorityResult.value;
    }
    const impactTypeResult = validateEnum(rec.impact_type, ALLOWED_IMPACT_TYPE, "efficiency");
    if (impactTypeResult.fixed) {
      warn(`recommendations[${i}].impact_type`, "ENUM_FIXED", `Recommendation "${rec.title}" impact_type "${rec.impact_type}" → "${impactTypeResult.value}"`, "info", true);
      rec.impact_type = impactTypeResult.value;
    }
    const scopeResult = validateEnum(rec.action_scope, ALLOWED_ACTION_SCOPE, "tactical");
    if (scopeResult.fixed) {
      warn(`recommendations[${i}].action_scope`, "ENUM_FIXED", `Recommendation "${rec.title}" action_scope "${rec.action_scope}" → "${scopeResult.value}"`, "info", true);
      rec.action_scope = scopeResult.value;
    }
  }

  // ── Phase 5: Cross-Reference Integrity ───────────────────────────────

  const insightIdSet = new Set(insights.map((i) => i.id));
  const rootCauseRankSet = new Set(rootCauses.map((rc) => rc.rank));

  // Every insight must have root_cause_ranks
  for (let i = 0; i < insights.length; i++) {
    const ins = insights[i];
    if (!ins.root_cause_ranks || !Array.isArray(ins.root_cause_ranks) || ins.root_cause_ranks.length === 0) {
      ins.root_cause_ranks = rootCauses.length > 0 ? [rootCauses[0].rank] : [1];
      warn(`insights[${i}].root_cause_ranks`, "ORPHAN_INSIGHT_FIXED",
        `Insight "${ins.id}" had no root_cause_ranks — assigned to rank ${ins.root_cause_ranks[0]}`, "warning", true);
    } else {
      // Validate each rank exists
      for (const rank of ins.root_cause_ranks) {
        if (!rootCauseRankSet.has(rank)) {
          warn(`insights[${i}].root_cause_ranks`, "INVALID_ROOT_CAUSE_RANK",
            `Insight "${ins.id}" references non-existent root_cause rank ${rank}`, "warning", false);
        }
      }
    }
  }

  // Every root_cause must have insight_ids
  for (let i = 0; i < rootCauses.length; i++) {
    const rc = rootCauses[i];
    if (!rc.insight_ids || !Array.isArray(rc.insight_ids) || rc.insight_ids.length === 0) {
      // Auto-fix: assign insights that reference this rank
      const linkedInsights = insights.filter(
        (ins) => ins.root_cause_ranks?.includes(rc.rank),
      ).map((ins) => ins.id);
      rc.insight_ids = linkedInsights.length > 0
        ? linkedInsights
        : insights.map((ins) => ins.id); // fallback: assign all
      warn(`root_causes[${i}].insight_ids`, "ORPHAN_ROOT_CAUSE_FIXED",
        `Root cause "${rc.cause}" had no insight_ids — assigned ${rc.insight_ids.length} insights`, "warning", true);
    } else {
      // Validate each insight_id exists
      for (const iid of rc.insight_ids) {
        if (!insightIdSet.has(iid)) {
          warn(`root_causes[${i}].insight_ids`, "INVALID_INSIGHT_ID",
            `Root cause "${rc.cause}" references non-existent insight "${iid}"`, "warning", false);
        }
      }
    }
  }

  // Every recommendation must have root_cause_rank and insight_ids
  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    if (!rec.root_cause_rank || typeof rec.root_cause_rank !== "number") {
      rec.root_cause_rank = rootCauses.length > 0 ? rootCauses[0].rank : 1;
      warn(`recommendations[${i}].root_cause_rank`, "REC_MISSING_ROOT_CAUSE_RANK",
        `Recommendation "${rec.title}" had no root_cause_rank — assigned rank ${rec.root_cause_rank}`, "warning", true);
    } else if (!rootCauseRankSet.has(rec.root_cause_rank)) {
      warn(`recommendations[${i}].root_cause_rank`, "INVALID_ROOT_CAUSE_RANK",
        `Recommendation "${rec.title}" references non-existent root_cause rank ${rec.root_cause_rank}`, "warning", false);
    }

    if (!rec.insight_ids || !Array.isArray(rec.insight_ids) || rec.insight_ids.length === 0) {
      warn(`recommendations[${i}].insight_ids`, "REC_MISSING_INSIGHT_IDS",
        `Recommendation "${rec.title}" has no insight_ids`, "warning", false);
    }
  }

  // ── Phase 5b: Root Cause Coverage + Recommendation Dedup ───────────

  // Every root cause must have ≥1 recommendation addressing it
  const coveredRanks = new Set(recommendations.map(r => r.root_cause_rank));
  const uncoveredRootCauses = rootCauses.filter(rc => !coveredRanks.has(rc.rank));
  if (uncoveredRootCauses.length > 0) {
    const names = uncoveredRootCauses.map(rc => `"${rc.cause}" (rank ${rc.rank})`).join(", ");
    warn("recommendations", "ROOT_CAUSE_UNCOVERED",
      `${uncoveredRootCauses.length} root cause(s) have no recommendation: ${names}`,
      "error", false);
    isValid = false;
  }

  // Detect duplicate recommendations by title
  const seenTitles = new Set<string>();
  for (let i = 0; i < recommendations.length; i++) {
    const title = recommendations[i].title?.toLowerCase().trim();
    if (!title) continue;
    if (seenTitles.has(title)) {
      warn(`recommendations[${i}].title`, "DUPLICATE_REC_TITLE",
        `Recommendation "${recommendations[i].title}" is a duplicate`,
        "error", false);
      isValid = false;
    }
    seenTitles.add(title);
  }

  // Detect semantically similar recommendations by content overlap (Jaccard similarity)
  for (let i = 0; i < recommendations.length; i++) {
    for (let j = i + 1; j < recommendations.length; j++) {
      const textA = `${recommendations[i].current_state || ""} ${recommendations[i].target_state || ""} ${recommendations[i].description || ""}`.toLowerCase();
      const textB = `${recommendations[j].current_state || ""} ${recommendations[j].target_state || ""} ${recommendations[j].description || ""}`.toLowerCase();
      // Extract significant words (>4 chars) for comparison
      const wordsA = new Set(textA.split(/\s+/).filter((w: string) => w.length > 4));
      const wordsB = new Set(textB.split(/\s+/).filter((w: string) => w.length > 4));
      if (wordsA.size === 0 || wordsB.size === 0) continue;
      let intersection = 0;
      for (const w of wordsA) { if (wordsB.has(w)) intersection++; }
      const union = wordsA.size + wordsB.size - intersection;
      const similarity = union > 0 ? intersection / union : 0;
      if (similarity > 0.6) {
        warn(`recommendations[${i}]+[${j}]`, "SIMILAR_REC_CONTENT",
          `Recommendations "${recommendations[i].title}" and "${recommendations[j].title}" have ${Math.round(similarity * 100)}% content overlap — may appear identical to users`,
          "warning", false);
      }
    }
  }

  // ── Phase 6: Impact Consistency + Domain-Specific Checks ─────────────

  // Impact value vs calculation.result consistency — with time horizon auto-fix
  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    if (rec.calculation?.result && rec.impact_value && rec.impact_value > 0) {
      const calcResultValue = extractNumericFromIDR(rec.calculation.result);
      if (calcResultValue !== null && calcResultValue > 0) {
        const ratio = rec.impact_value / calcResultValue;
        const field = `recommendations[${i}]`;

        if (ratio >= 2.5 && ratio <= 3.5) {
          // impact_value is quarterly, calc.result appears monthly → fix calc.result
          const oldResult = rec.calculation.result;
          const quarterlyValue = calcResultValue * 3;
          // Replace "monthly" with "quarterly" and update the numeric value
          rec.calculation.result = rec.calculation.result
            .replace(/monthly/i, "quarterly");
          // Replace the Rp amount in the string
          const rpPattern = /Rp\s*[\d.,]+(?:\s*(?:jt|M(?:iliar)?)\b)?/;
          const formattedQuarterly = `Rp ${quarterlyValue.toLocaleString("id-ID")}`;
          if (rpPattern.test(rec.calculation.result)) {
            rec.calculation.result = rec.calculation.result.replace(rpPattern, formattedQuarterly);
          }
          // Verify the replacement worked by re-extracting
          const reCheck = extractNumericFromIDR(rec.calculation.result);
          if (!reCheck || Math.abs(reCheck - quarterlyValue) > quarterlyValue * 0.1) {
            rec.calculation.result = `Net quarterly impact: ${formattedQuarterly}`;
          }
          warn(field, "TIME_HORIZON_FIXED_CALC_RESULT",
            `"${rec.title}" calc.result was monthly (${oldResult}) → auto-fixed to quarterly (${rec.calculation.result})`,
            "info", true);

        } else if (ratio >= 0.28 && ratio <= 0.4) {
          // impact_value appears monthly, calc.result is quarterly → fix impact_value
          const oldImpactValue = rec.impact_value;
          rec.impact_value = Math.round(rec.impact_value * 3);
          warn(field, "TIME_HORIZON_FIXED_IMPACT_VALUE",
            `"${rec.title}" impact_value was monthly (${oldImpactValue}) → auto-fixed to quarterly (${rec.impact_value})`,
            "info", true);

        } else if (ratio < 0.5 || ratio > 2.0) {
          // General mismatch — try quarterly_impact string as tiebreaker
          let autoFixed = false;
          if (rec.quarterly_impact) {
            const qiValue = extractNumericFromIDR(rec.quarterly_impact);
            if (qiValue !== null && qiValue > 0) {
              const impactCloseness = Math.abs(rec.impact_value / qiValue - 1.0);
              const calcCloseness = Math.abs(calcResultValue / qiValue - 1.0);

              if (impactCloseness < calcCloseness) {
                // impact_value is closer to quarterly_impact → fix calc.result to match
                const formattedVal = `Rp ${rec.impact_value.toLocaleString("id-ID")}`;
                rec.calculation.result = `Net quarterly impact: ${formattedVal}`;
                autoFixed = true;
                warn(field, "IMPACT_CALC_MISMATCH_FIXED",
                  `"${rec.title}" calc.result fixed to match impact_value (${rec.impact_value}) using quarterly_impact as tiebreaker`,
                  "info", true);
              } else {
                // calc.result is closer to quarterly_impact → fix impact_value to match
                const oldVal = rec.impact_value;
                rec.impact_value = calcResultValue;
                autoFixed = true;
                warn(field, "IMPACT_CALC_MISMATCH_FIXED",
                  `"${rec.title}" impact_value fixed from ${oldVal} to ${calcResultValue} using quarterly_impact as tiebreaker`,
                  "info", true);
              }
            }
          }

          if (!autoFixed) {
            warn(field, "IMPACT_CALC_MISMATCH",
              `"${rec.title}" impact_value (${rec.impact_value}) vs calc.result (${calcResultValue}). Ratio: ${ratio.toFixed(2)}`,
              "warning", false);
          }
        }
        // ratio 0.5-2.0 = acceptable, no action needed
      }
    }
  }

  // NPS governance check — domain "customer" only
  if (domain === "customer") {
    const fullText = JSON.stringify(findings);
    for (const pattern of NPS_AVG_PATTERNS) {
      if (pattern.test(fullText)) {
        warn("governance.nps", "NPS_AVERAGE_DETECTED",
          `Detected NPS averaging pattern in output — governance rule violation. NPS must use (Promoters% - Detractors%), never average.`,
          "error", false);
        // Don't set isValid=false here — it's a semantic issue best handled by retry feedback
        break;
      }
    }
  }

  // ── Phase 7: Evidence Grounding Check ──────────────────────────────

  for (let i = 0; i < rootCauses.length; i++) {
    const rc = rootCauses[i];
    if (!rc.evidence || rc.evidence.length === 0) {
      warn(`root_causes[${i}].evidence`, "NO_EVIDENCE",
        `Root cause "${rc.cause}" has no evidence items`, "warning", false);
    } else {
      // Check that at least one evidence item contains a specific number
      const hasNumericEvidence = rc.evidence.some(e => /\d+/.test(e));
      if (!hasNumericEvidence) {
        warn(`root_causes[${i}].evidence`, "VAGUE_EVIDENCE",
          `Root cause "${rc.cause}" evidence contains no specific numeric values — may be vague`, "warning", false);
      }
    }
  }

  // ── Final Result ─────────────────────────────────────────────────────

  return { isValid, warnings, autoFixCount };
}

// ─── Investigation Findings Validation ──────────────────────────────────

const ALLOWED_INV_SEVERITY = ["critical", "high", "medium", "low"];
const ALLOWED_INV_CONFIDENCE = ["HIGH", "MEDIUM", "LOW"];
const ALLOWED_INV_TIER = ["immediate", "short_term", "structural"];
const ALLOWED_INV_PRIORITY = ["CRITICAL", "HIGH", "MEDIUM"];
const ALLOWED_INV_EFFORT = ["low", "medium", "high"];

/**
 * Validate and auto-fix investigation findings (the LLM-generated `investigation` sub-object).
 * Lighter than standard validation but ensures structural integrity, enum correctness,
 * and impact_contribution normalization.
 */
export function validateInvestigationFindings(
  inv: Record<string, unknown>,
): ValidationResult {
  const warnings: ValidationWarning[] = [];
  let isValid = true;
  let autoFixCount = 0;

  function warn(
    field: string,
    code: string,
    message: string,
    severity: "error" | "warning" | "info",
    autoFixed: boolean,
  ) {
    warnings.push({ field, code, message, severity, autoFixed });
    if (autoFixed) autoFixCount++;
  }

  // ── Phase 1: Required fields ──
  const requiredStrings = ['title', 'executive_summary'];
  for (const key of requiredStrings) {
    if (!inv[key] || typeof inv[key] !== 'string') {
      if (key === 'title') {
        inv[key] = 'Investigation Report';
        warn(key, 'MISSING_FIELD_DEFAULTED', `Missing "${key}" — defaulted`, 'warning', true);
      } else if (key === 'executive_summary') {
        inv[key] = '';
        warn(key, 'MISSING_FIELD_DEFAULTED', `Missing "${key}" — defaulted to empty`, 'warning', true);
      }
    }
  }

  // Severity enum
  if (inv.severity) {
    const { value, fixed } = validateEnum(inv.severity, ALLOWED_INV_SEVERITY, 'high');
    if (fixed) {
      warn('severity', 'ENUM_FIXED', `severity "${inv.severity}" → "${value}"`, 'info', true);
      inv.severity = value;
    }
  } else {
    inv.severity = 'high';
    warn('severity', 'MISSING_FIELD_DEFAULTED', 'Missing severity — defaulted to "high"', 'warning', true);
  }

  // Confidence enum
  if (inv.confidence) {
    const upper = String(inv.confidence).toUpperCase();
    if (!ALLOWED_INV_CONFIDENCE.includes(upper)) {
      inv.confidence = 'MEDIUM';
      warn('confidence', 'ENUM_FIXED', `confidence "${inv.confidence}" → "MEDIUM"`, 'info', true);
    } else if (inv.confidence !== upper) {
      inv.confidence = upper;
    }
  } else {
    inv.confidence = 'MEDIUM';
    warn('confidence', 'MISSING_FIELD_DEFAULTED', 'Missing confidence — defaulted to "MEDIUM"', 'warning', true);
  }

  // ── Phase 2: Root cause structure ──
  const rootCause = inv.root_cause as Record<string, unknown> | undefined;
  if (!rootCause || typeof rootCause !== 'object') {
    warn('root_cause', 'MISSING_FIELD', 'Missing root_cause object', 'error', false);
    isValid = false;
  } else {
    if (!rootCause.summary || typeof rootCause.summary !== 'string') {
      warn('root_cause.summary', 'MISSING_FIELD', 'Missing root_cause.summary', 'warning', false);
    }
    const chain = rootCause.evidence_chain;
    if (!Array.isArray(chain) || chain.length === 0) {
      warn('root_cause.evidence_chain', 'MISSING_FIELD', 'Empty or missing evidence_chain', 'warning', false);
    } else if (chain.length < 3) {
      warn('root_cause.evidence_chain', 'BELOW_MIN_COUNT', `evidence_chain has ${chain.length} items (recommended min: 6)`, 'warning', false);
    }
  }

  // ── Phase 3: Recommendations validation ──
  const recs = inv.recommendations as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(recs) || recs.length === 0) {
    warn('recommendations', 'MISSING_FIELD', 'Missing or empty recommendations', 'error', false);
    isValid = false;
  } else {
    for (let i = 0; i < recs.length; i++) {
      const r = recs[i];
      // Tier enum
      if (r.tier) {
        const tierVal = String(r.tier).toLowerCase();
        if (!ALLOWED_INV_TIER.includes(tierVal)) {
          r.tier = 'short_term';
          warn(`recommendations[${i}].tier`, 'ENUM_FIXED', `tier "${r.tier}" → "short_term"`, 'info', true);
        } else {
          r.tier = tierVal;
        }
      }
      // Priority enum
      if (r.priority) {
        const priVal = String(r.priority).toUpperCase();
        if (!ALLOWED_INV_PRIORITY.includes(priVal)) {
          r.priority = 'HIGH';
          warn(`recommendations[${i}].priority`, 'ENUM_FIXED', `priority "${r.priority}" → "HIGH"`, 'info', true);
        } else {
          r.priority = priVal;
        }
      }
      // Effort enum
      if (r.effort) {
        const effVal = String(r.effort).toLowerCase();
        if (!ALLOWED_INV_EFFORT.includes(effVal)) {
          r.effort = 'medium';
          warn(`recommendations[${i}].effort`, 'ENUM_FIXED', `effort "${r.effort}" → "medium"`, 'info', true);
        } else {
          r.effort = effVal;
        }
      }
      // Title required
      if (!r.title || typeof r.title !== 'string') {
        warn(`recommendations[${i}].title`, 'MISSING_FIELD', 'Recommendation missing title', 'warning', false);
      }
    }
  }

  // ── Phase 4: Findings validation ──
  const findings = inv.findings as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(findings) && findings.length > 0) {
    // Validate impact_contribution sums to ~1.0
    const sum = findings.reduce((s, f) => s + (Number(f.impact_contribution) || 0), 0);
    if (sum > 0 && (sum < 0.8 || sum > 1.2)) {
      // Normalize
      for (const f of findings) {
        const val = Number(f.impact_contribution) || 0;
        f.impact_contribution = val / sum;
      }
      warn('findings.impact_contribution', 'CONTRIBUTION_SUM_NORMALIZED',
        `impact_contribution sum was ${sum.toFixed(2)} — normalized to 1.0`, 'info', true);
    } else if (sum === 0) {
      // Distribute evenly
      const even = 1.0 / findings.length;
      for (const f of findings) {
        f.impact_contribution = even;
      }
      warn('findings.impact_contribution', 'CONTRIBUTION_ALL_ZERO',
        `All impact_contribution were 0 — distributed evenly`, 'warning', true);
    }

    // Validate severity on each finding
    for (let i = 0; i < findings.length; i++) {
      const f = findings[i];
      if (f.severity) {
        const { value, fixed } = validateEnum(f.severity, ALLOWED_INV_SEVERITY, 'medium');
        if (fixed) {
          warn(`findings[${i}].severity`, 'ENUM_FIXED', `finding severity "${f.severity}" → "${value}"`, 'info', true);
          f.severity = value;
        }
      }
    }
  }

  // ── Phase 5: Monitoring plan ──
  const monPlan = inv.monitoring_plan;
  if (!Array.isArray(monPlan) || monPlan.length === 0) {
    warn('monitoring_plan', 'MISSING_FIELD', 'Missing or empty monitoring_plan', 'warning', false);
  }

  // ── Phase 6: Trust assessment ──
  const trust = inv.trust_assessment as Record<string, unknown> | undefined;
  if (!trust || typeof trust !== 'object') {
    warn('trust_assessment', 'MISSING_FIELD', 'Missing trust_assessment', 'warning', false);
  }

  return { isValid, warnings, autoFixCount };
}

// ─── Confidence Scoring (L5 Trust Framework) ──────────────────────────

interface AnomalyDetectorResultLike {
  anomalies: Array<{ metric: string; severity: string }>;
  dataQuality: {
    completeness: number;
    freshness: string;
    rowCount: number;
    tableCount: number;
  };
}

interface ConfidenceFactor {
  name: string;
  score: number;
  weight: number;
  reasoning: string;
}

interface ConfidenceScoring {
  dataConfidence: number;
  analysisConfidence: number;
  overallConfidence: number;
  factors: ConfidenceFactor[];
}

/**
 * Compute confidence scoring for specialist analysis output.
 * Weights: data quality (30%), statistical backing (30%),
 *          evidence density (20%), cross-reference integrity (20%).
 */
export function computeConfidenceScoring(
  findings: Record<string, unknown>,
  anomalyResult?: AnomalyDetectorResultLike | null,
): ConfidenceScoring {
  const factors: ConfidenceFactor[] = [];

  // Factor 1: Data Quality (30% weight)
  let dataScore = 50; // default when no anomaly result
  if (anomalyResult?.dataQuality) {
    const dq = anomalyResult.dataQuality;
    dataScore = dq.completeness;
    // Freshness penalty
    if (dq.freshness === 'stale') dataScore = Math.max(0, dataScore - 20);
    else if (dq.freshness === 'recent') dataScore = Math.max(0, dataScore - 5);
    // Row count bonus/penalty
    if (dq.rowCount < 10) dataScore = Math.max(0, dataScore - 30);
    else if (dq.rowCount < 50) dataScore = Math.max(0, dataScore - 10);
    else if (dq.rowCount > 500) dataScore = Math.min(100, dataScore + 5);
  }
  factors.push({
    name: 'data_quality',
    score: Math.round(dataScore),
    weight: 0.3,
    reasoning: anomalyResult?.dataQuality
      ? `Completeness: ${anomalyResult.dataQuality.completeness}%, freshness: ${anomalyResult.dataQuality.freshness}, rows: ${anomalyResult.dataQuality.rowCount}`
      : 'No data quality metrics available — using default score',
  });

  // Factor 2: Statistical Backing (30% weight)
  const insights = (findings.insights || []) as Array<Record<string, unknown>>;
  const anomalyCount = anomalyResult?.anomalies?.length || 0;
  let statScore = 30; // base score with no statistical backing
  if (anomalyCount > 0 && insights.length > 0) {
    // Higher score if insights are backed by pre-detected anomalies
    const backingRatio = Math.min(anomalyCount / insights.length, 1);
    statScore = Math.round(30 + backingRatio * 70);
  } else if (insights.length === 0) {
    statScore = 0;
  }
  factors.push({
    name: 'statistical_backing',
    score: statScore,
    weight: 0.3,
    reasoning: `${anomalyCount} pre-detected anomalies backing ${insights.length} insights`,
  });

  // Factor 3: Evidence Density (20% weight)
  const rootCauses = (findings.root_causes || []) as Array<{ evidence?: string[] }>;
  const totalEvidence = rootCauses.reduce((sum, rc) => sum + (rc.evidence?.length || 0), 0);
  const avgEvidence = rootCauses.length > 0 ? totalEvidence / rootCauses.length : 0;
  const evidenceScore = Math.min(100, Math.round(avgEvidence * 25)); // 4+ evidence items → 100
  factors.push({
    name: 'evidence_density',
    score: evidenceScore,
    weight: 0.2,
    reasoning: `${rootCauses.length} root causes with average ${avgEvidence.toFixed(1)} evidence items each`,
  });

  // Factor 4: Cross-Reference Integrity (20% weight)
  const recommendations = (findings.recommendations || []) as Array<{ root_cause_rank?: number; insight_ids?: string[] }>;
  let crossRefScore = 0;
  if (insights.length > 0 && rootCauses.length > 0 && recommendations.length > 0) {
    const insightsWithRanks = insights.filter((i) => {
      const ranks = i.root_cause_ranks as number[] | undefined;
      return ranks && ranks.length > 0;
    }).length;
    const recsWithRanks = recommendations.filter(r => r.root_cause_rank != null).length;
    const recsWithInsights = recommendations.filter(r => r.insight_ids && r.insight_ids.length > 0).length;

    const insightLinkage = insightsWithRanks / insights.length;
    const recRankLinkage = recsWithRanks / recommendations.length;
    const recInsightLinkage = recsWithInsights / recommendations.length;

    crossRefScore = Math.round(((insightLinkage + recRankLinkage + recInsightLinkage) / 3) * 100);
  }
  factors.push({
    name: 'cross_reference_integrity',
    score: crossRefScore,
    weight: 0.2,
    reasoning: `Insight→RootCause and Recommendation→Insight linkage completeness`,
  });

  // Compute weighted scores
  const dataConfidence = Math.round(factors[0].score);
  const analysisConfidence = Math.round(
    (factors[1].score * factors[1].weight + factors[2].score * factors[2].weight + factors[3].score * factors[3].weight)
    / (factors[1].weight + factors[2].weight + factors[3].weight)
  );
  const overallConfidence = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  );

  return {
    dataConfidence,
    analysisConfidence,
    overallConfidence,
    factors,
  };
}

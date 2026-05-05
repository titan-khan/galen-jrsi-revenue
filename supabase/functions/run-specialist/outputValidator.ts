// =============================================================================
// OUTPUT VALIDATOR — Data-aware post-LLM validation
// Cross-checks LLM claims (metrics, thresholds, headlines, counts)
// against actual data that was fed to the prompt.
// Runs AFTER structural validation (findingsValidation.ts), BEFORE DB save.
// =============================================================================

export interface DataCorrection {
  field: string;
  rule: string;
  original: unknown;
  corrected: unknown;
  reason: string;
}

export interface DataValidationResult {
  corrections: DataCorrection[];
  warnings: string[];
}

interface ChannelRow {
  channel: string;
  total_leads: number | string;
  funded: number | string;
  avg_credit_decision_days: number | string;
  avg_review_days: number | string;
  avg_contact_hours: number | string;
  cases_with_rework: number | string;
  docs_submitted_count: number | string;
  rework_rate_pct: number | string;
  k14_pct?: number | string;
  [key: string]: unknown;
}

interface WeeklyRow {
  week_number: number;
  channel?: string;
  avg_credit_decision_days?: number | string;
  avg_review_days?: number | string;
  avg_contact_hours?: number | string;
  cases_with_rework?: number | string;
  total_rework?: number | string;
  docs_submitted?: number | string;
  total_leads?: number | string;
  funded?: number | string;
  [key: string]: unknown;
}

export interface DataContext {
  channelSummary: ChannelRow[];
  weeklyFunnel: WeeklyRow[];
}

// ── Helpers ────────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function sumField(rows: Record<string, unknown>[], field: string): number {
  return rows.reduce((acc, r) => acc + toNum(r[field]), 0);
}

function avgField(rows: Record<string, unknown>[], field: string): number {
  const vals = rows.map((r) => toNum(r[field])).filter((v) => v !== 0);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Extract first number from string like "7.3 days" → 7.3 or "16.8%" → 16.8 */
function extractNumber(s: string): number | null {
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

/** Extract number from threshold string like "< 20 days" → 20, "<20 units" → 20 */
function extractThresholdNumber(s: string): number | null {
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

// Mapping from metric name patterns to DB column names
const METRIC_COLUMN_MAP: Array<{ pattern: RegExp; sumColumn?: string; avgColumn?: string; unit: string }> = [
  { pattern: /credit\s*decision|k22/i, avgColumn: "avg_credit_decision_days", unit: "days" },
  { pattern: /review\s*(complete|time|days)|k95/i, avgColumn: "avg_review_days", unit: "days" },
  { pattern: /contact\s*(time|hours)|k19/i, avgColumn: "avg_contact_hours", unit: "hours" },
  { pattern: /review\s*return\s*rate|k92/i, avgColumn: "rework_rate_pct", unit: "%" },
  { pattern: /conversion\s*rate|k14/i, avgColumn: "k14_pct", unit: "%" },
  { pattern: /rework\s*cases|total\s*rework/i, sumColumn: "cases_with_rework", unit: "count" },
  { pattern: /total\s*leads/i, sumColumn: "total_leads", unit: "count" },
  { pattern: /funded/i, sumColumn: "funded", unit: "count" },
];

function findColumnMapping(metricName: string) {
  return METRIC_COLUMN_MAP.find((m) => m.pattern.test(metricName));
}

function computeActualValue(
  mapping: { sumColumn?: string; avgColumn?: string },
  channelSummary: ChannelRow[],
): number | null {
  if (mapping.sumColumn) {
    return sumField(channelSummary as Record<string, unknown>[], mapping.sumColumn);
  }
  if (mapping.avgColumn) {
    return avgField(channelSummary as Record<string, unknown>[], mapping.avgColumn);
  }
  return null;
}

// ── Main Validator ─────────────────────────────────────────────────────

/**
 * Validate LLM output against actual data context.
 * Mutates `findings` in-place to correct inaccuracies.
 * Returns list of corrections and warnings for audit trail.
 */
export function validateOutputAgainstData(
  findings: Record<string, unknown>,
  dataContext: DataContext,
): DataValidationResult {
  const corrections: DataCorrection[] = [];
  const warnings: string[] = [];

  const { channelSummary, weeklyFunnel } = dataContext;

  // Skip if no data context available
  if (!channelSummary || channelSummary.length === 0) {
    warnings.push("No channel summary data available for cross-validation");
    return { corrections, warnings };
  }

  const snapshot = findings.metrics_snapshot as Record<string, unknown> | undefined;
  const execSummary = findings.executive_summary as Record<string, unknown> | undefined;

  // ── Rule 1: Primary Metric Value Cross-Check ─────────────────────────

  if (snapshot?.primary_metric_name) {
    const metricName = String(snapshot.primary_metric_name);
    const mapping = findColumnMapping(metricName);

    if (mapping) {
      const actualValue = computeActualValue(mapping, channelSummary);
      const claimedValue = extractNumber(String(snapshot.primary_metric_value || ""));

      if (actualValue !== null && claimedValue !== null && actualValue !== 0) {
        const deviation = Math.abs(claimedValue - actualValue) / actualValue;

        if (deviation > 0.15) {
          // Format the corrected value to match original format
          const unit = mapping.unit;
          let correctedStr: string;
          if (unit === "days") correctedStr = `${actualValue.toFixed(1)} days`;
          else if (unit === "hours") correctedStr = `${actualValue.toFixed(1)}h`;
          else if (unit === "%") correctedStr = `${actualValue.toFixed(1)}%`;
          else correctedStr = String(Math.round(actualValue));

          corrections.push({
            field: "metrics_snapshot.primary_metric_value",
            rule: "METRIC_VALUE_CROSSCHECK",
            original: snapshot.primary_metric_value,
            corrected: correctedStr,
            reason: `LLM claimed ${snapshot.primary_metric_value} but actual computed value is ${correctedStr} (${(deviation * 100).toFixed(0)}% deviation)`,
          });
          snapshot.primary_metric_value = correctedStr;
        }
      }
    }
  }

  // ── Rule 2: Threshold Unit Consistency ────────────────────────────────

  if (snapshot?.primary_metric_name && snapshot?.primary_metric_target) {
    const metricName = String(snapshot.primary_metric_name).toLowerCase();
    const target = String(snapshot.primary_metric_target);

    // Detect unit mismatches
    const isTimeMetric = /days|hours|time|duration|cycle|review|decision/i.test(metricName);
    const isRateMetric = /rate|pct|percent|%|ratio|conversion/i.test(metricName);
    const hasWrongUnit = target.toLowerCase().includes("units") || target.toLowerCase().includes("count");

    if (isTimeMetric && hasWrongUnit) {
      const thresholdNum = extractThresholdNumber(target);
      const mapping = findColumnMapping(String(snapshot.primary_metric_name));
      const unit = mapping?.unit || "days";
      const corrected = thresholdNum ? `< ${thresholdNum} ${unit}` : target.replace(/units?|count/gi, unit);

      corrections.push({
        field: "metrics_snapshot.primary_metric_target",
        rule: "THRESHOLD_UNIT_CONSISTENCY",
        original: target,
        corrected,
        reason: `Metric "${snapshot.primary_metric_name}" is measured in ${unit} but threshold used "${target}"`,
      });
      snapshot.primary_metric_target = corrected;
    }

    if (isRateMetric && hasWrongUnit) {
      const thresholdNum = extractThresholdNumber(target);
      const corrected = thresholdNum ? `< ${thresholdNum}%` : target.replace(/units?|count/gi, "%");

      corrections.push({
        field: "metrics_snapshot.primary_metric_target",
        rule: "THRESHOLD_UNIT_CONSISTENCY",
        original: target,
        corrected,
        reason: `Metric "${snapshot.primary_metric_name}" is a rate but threshold used "${target}"`,
      });
      snapshot.primary_metric_target = corrected;
    }
  }

  // ── Rule 3: Headline-Threshold Coherence ─────────────────────────────

  if (execSummary?.headline && snapshot?.primary_metric_value && snapshot?.primary_metric_target) {
    const headline = String(execSummary.headline);
    const metricValue = extractNumber(String(snapshot.primary_metric_value));
    const thresholdValue = extractThresholdNumber(String(snapshot.primary_metric_target));

    if (metricValue !== null && thresholdValue !== null) {
      const breachPatterns = /exceed(?:s|ing)|above|breach(?:es|ing)|surpass(?:es|ing)|over\s+(?:the\s+)?threshold/i;
      const claimsBreach = breachPatterns.test(headline);

      // Check if target is "< X" (lower is better) or "> X" (higher is better)
      const isLowerBetter = String(snapshot.primary_metric_target).startsWith("<") ||
                            String(snapshot.primary_metric_target).startsWith("≤");

      const actuallyBreached = isLowerBetter
        ? metricValue > thresholdValue
        : metricValue < thresholdValue;

      if (claimsBreach && !actuallyBreached) {
        // Headline claims breach but metric is within threshold → rewrite
        const metricName = String(snapshot.primary_metric_name || "metric");
        const metricVal = String(snapshot.primary_metric_value);

        // Compute trend from weekly data to use in corrected headline
        let trendContext = "deteriorating trend in recent weeks";
        if (weeklyFunnel.length >= 8) {
          // Aggregate by week (all channels combined)
          const weeklyAgg = new Map<number, number[]>();
          for (const row of weeklyFunnel) {
            const mapping = findColumnMapping(metricName);
            if (mapping?.avgColumn) {
              const wk = row.week_number;
              const val = toNum(row[mapping.avgColumn]);
              if (!weeklyAgg.has(wk)) weeklyAgg.set(wk, []);
              weeklyAgg.get(wk)!.push(val);
            }
          }
          const weeklyAvgs = [...weeklyAgg.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([, vals]) => vals.reduce((a, b) => a + b, 0) / vals.length);

          if (weeklyAvgs.length >= 4) {
            const early = weeklyAvgs.slice(0, Math.floor(weeklyAvgs.length / 2));
            const late = weeklyAvgs.slice(Math.floor(weeklyAvgs.length / 2));
            const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
            const lateAvg = late.reduce((a, b) => a + b, 0) / late.length;
            const pctChange = ((lateAvg - earlyAvg) / earlyAvg) * 100;
            if (Math.abs(pctChange) > 5) {
              trendContext = `${Math.abs(pctChange).toFixed(0)}% ${pctChange > 0 ? "increase" : "decrease"} from early to recent weeks`;
            }
          }
        }

        // Rewrite headline: replace breach claim with trend-based language
        const correctedHeadline = headline
          .replace(breachPatterns, "showing")
          .replace(
            /with\s+[\d.]+d?\s+average\s+exceeding\s+[\d.]+d?\s+threshold/i,
            `with ${metricVal} average and ${trendContext}`,
          );

        // If rewrite didn't change much, build a new headline
        const finalHeadline = correctedHeadline === headline
          ? headline.replace(breachPatterns, `approaching threshold with ${trendContext}`)
          : correctedHeadline;

        corrections.push({
          field: "executive_summary.headline",
          rule: "HEADLINE_THRESHOLD_COHERENCE",
          original: headline,
          corrected: finalHeadline,
          reason: `Headline claims threshold breach but ${metricVal} is within threshold ${snapshot.primary_metric_target} (${metricValue} < ${thresholdValue})`,
        });
        execSummary.headline = finalHeadline;
      }
    }
  }

  // ── Rule 4: Value-at-Stake Bounds ────────────────────────────────────

  if (execSummary?.value_at_stake) {
    const valueAtStake = toNum(execSummary.value_at_stake);

    // Compute total funded amount as a ceiling anchor
    const totalFundedAmount = channelSummary.reduce(
      (acc, r) => acc + toNum(r.total_funded_amount_idr ?? 0),
      0,
    );

    // Cap: value_at_stake should not exceed 10x total funded amount
    const cap = totalFundedAmount > 0 ? totalFundedAmount * 10 : 1_000_000_000_000; // 1T IDR fallback cap

    if (valueAtStake > cap && totalFundedAmount > 0) {
      // Compute a more reasonable estimate: delta × volume × timeframe
      const conservativeEstimate = Math.round(totalFundedAmount * 0.05); // 5% of total as conservative estimate

      corrections.push({
        field: "executive_summary.value_at_stake",
        rule: "VALUE_AT_STAKE_BOUNDS",
        original: valueAtStake,
        corrected: conservativeEstimate,
        reason: `Value at stake ${valueAtStake.toLocaleString()} exceeds 10x total funded amount (${totalFundedAmount.toLocaleString()}). Capped to conservative estimate.`,
      });
      execSummary.value_at_stake = String(conservativeEstimate);
    }
  }

  // ── Rule 5: Secondary Metric Count Cross-Check ───────────────────────

  if (snapshot?.secondary_metrics && Array.isArray(snapshot.secondary_metrics)) {
    const secondaryMetrics = snapshot.secondary_metrics as Array<{
      name: string;
      value: string;
      trend?: string;
    }>;

    for (let i = 0; i < secondaryMetrics.length; i++) {
      const m = secondaryMetrics[i];
      const mapping = findColumnMapping(m.name);
      if (!mapping) continue;

      const actual = computeActualValue(mapping, channelSummary);
      if (actual === null) continue;

      const claimed = extractNumber(m.value);
      if (claimed === null) continue;

      // For count-based metrics, exact match is expected
      if (mapping.sumColumn && Math.abs(claimed - actual) > 1) {
        const correctedStr = String(Math.round(actual));
        corrections.push({
          field: `metrics_snapshot.secondary_metrics[${i}].value`,
          rule: "COUNT_CROSSCHECK",
          original: m.value,
          corrected: correctedStr,
          reason: `"${m.name}" claimed ${m.value} but actual SUM is ${correctedStr}`,
        });
        m.value = correctedStr;
      }

      // For averaged metrics, allow 15% deviation
      if (mapping.avgColumn) {
        const deviation = Math.abs(claimed - actual) / actual;
        if (deviation > 0.15) {
          let correctedStr: string;
          if (mapping.unit === "days") correctedStr = `${actual.toFixed(1)} days`;
          else if (mapping.unit === "hours") correctedStr = `${actual.toFixed(1)}h`;
          else if (mapping.unit === "%") correctedStr = `${actual.toFixed(1)}%`;
          else correctedStr = String(actual.toFixed(1));

          corrections.push({
            field: `metrics_snapshot.secondary_metrics[${i}].value`,
            rule: "METRIC_VALUE_CROSSCHECK",
            original: m.value,
            corrected: correctedStr,
            reason: `"${m.name}" claimed ${m.value} but actual average is ${correctedStr} (${(deviation * 100).toFixed(0)}% deviation)`,
          });
          m.value = correctedStr;
        }
      }
    }
  }

  // ── Rule 6: Severity Calibration ─────────────────────────────────────

  if (execSummary?.severity && snapshot?.primary_metric_value && snapshot?.primary_metric_target) {
    const currentSeverity = String(execSummary.severity).toLowerCase();
    const metricValue = extractNumber(String(snapshot.primary_metric_value));
    const thresholdValue = extractThresholdNumber(String(snapshot.primary_metric_target));

    if (metricValue !== null && thresholdValue !== null && thresholdValue > 0) {
      const ratio = metricValue / thresholdValue; // e.g. 7.3/20 = 0.365

      // Check for trend deterioration
      let trendDeteriorating = false;
      if (weeklyFunnel.length >= 8) {
        const mapping = findColumnMapping(String(snapshot.primary_metric_name));
        if (mapping?.avgColumn) {
          const weeklyAgg = new Map<number, number[]>();
          for (const row of weeklyFunnel) {
            const wk = row.week_number;
            const val = toNum(row[mapping.avgColumn]);
            if (!weeklyAgg.has(wk)) weeklyAgg.set(wk, []);
            weeklyAgg.get(wk)!.push(val);
          }
          const weeks = [...weeklyAgg.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([, vals]) => vals.reduce((a, b) => a + b, 0) / vals.length);

          if (weeks.length >= 4) {
            const last4 = weeks.slice(-4);
            const first4 = weeks.slice(0, 4);
            const recentAvg = last4.reduce((a, b) => a + b, 0) / last4.length;
            const earlyAvg = first4.reduce((a, b) => a + b, 0) / first4.length;
            const wowChange = earlyAvg > 0 ? ((recentAvg - earlyAvg) / earlyAvg) * 100 : 0;
            // >20% deterioration = trend is bad
            trendDeteriorating = Math.abs(wowChange) > 20;
          }
        }
      }

      let maxSeverity: string;
      if (ratio < 0.5 && !trendDeteriorating) {
        maxSeverity = "medium"; // Well within threshold, no trend issue
      } else if (ratio < 0.8 && !trendDeteriorating) {
        maxSeverity = "high"; // Approaching but not critical
      } else {
        maxSeverity = "critical"; // Near/above threshold or deteriorating fast
      }

      const severityRank: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
      if ((severityRank[currentSeverity] ?? 0) > (severityRank[maxSeverity] ?? 0)) {
        corrections.push({
          field: "executive_summary.severity",
          rule: "SEVERITY_CALIBRATION",
          original: currentSeverity,
          corrected: maxSeverity,
          reason: `Severity "${currentSeverity}" exceeds max "${maxSeverity}" for metric at ${(ratio * 100).toFixed(0)}% of threshold${trendDeteriorating ? " (trend deteriorating)" : ""}`,
        });
        execSummary.severity = maxSeverity;
      }
    }
  }

  // Log summary
  if (corrections.length > 0) {
    console.log(
      `[outputValidator] ${corrections.length} corrections applied: ${corrections.map((c) => c.rule).join(", ")}`,
    );
  }

  return { corrections, warnings };
}

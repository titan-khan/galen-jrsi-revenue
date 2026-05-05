// =============================================================================
// CHART BUILDER — Shared chart generation for summary & decomposition layers
// Used by both investigation and standard run paths to eliminate duplication
// =============================================================================

import { routedFetch } from "../_shared/routing/router.ts";

import type { DecompositionResult } from "./statisticalDecomposer.ts";
import type { FunnelPipelineDefinition } from "./types.ts";
import { isFieldRelevant } from "./metricRelevance.ts";
import { validateHeadlineAlignment } from "./chartGuardrails.ts";

// ─── Types ──────────────────────────────────────────────────────────

interface ThresholdLevel {
  value: number | number[];
}

interface ThresholdConfig {
  metricName: string;
  red?: ThresholdLevel;
  yellow?: ThresholdLevel;
}

interface AnomalyLike {
  metric: string;
}

export interface ChartBuildContext {
  dbData: Record<string, unknown>;
  thresholds: ThresholdConfig[];
  anomalies: AnomalyLike[];
  resolvedMeasures?: string[];  // DB column names from metric_definitions, filters charts to specialist's metrics
}

type ChartRecord = Record<string, unknown>;

// ─── Helpers ────────────────────────────────────────────────────────

/** Format a numeric value for headline display. */
function formatHeadlineVal(v: number, field: string): string {
  const fl = field.toLowerCase();
  if (fl.includes('pct') || fl.includes('rate') || fl.includes('percent')) return `${v.toFixed(1)}%`;
  // Check unit-based fields BEFORE currency formatting to avoid "Rp 16.5K" for hours/days/counts
  if (fl.includes('days')) return `${v.toFixed(1)} days`;
  if (fl.includes('hours') || fl.includes('contact')) return `${v.toFixed(1)}h`;
  if (fl.includes('count') || fl.includes('leads') || fl.includes('funded')) return v.toLocaleString();
  if (fl.includes('rework') || fl.includes('cycle')) return `${v.toFixed(1)}`;
  // Currency formatting for monetary values
  if (v >= 1e12) return `Rp ${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(1)}M`;
  if (v >= 1e6) return `Rp ${(v / 1e6).toFixed(1)}Jt`;
  if (v >= 1e3) return `Rp ${(v / 1e3).toFixed(1)}Rb`;
  return `${v.toFixed(1)}`;
}

// ─── 5-Tier Verb Tables (EN + Bahasa Indonesia) ─────────────────────

const UP_VERBS_EN = [
  ['surged', 'jumped', 'soared'],           // >20%
  ['climbed', 'rose sharply', 'accelerated'], // 10-20%
  ['grew', 'increased', 'gained'],           // 5-10%
  ['edged up', 'inched higher', 'ticked up'], // 2-5%
  ['held steady', 'remained stable'],         // <2%
];
const DOWN_VERBS_EN = [
  ['plunged', 'collapsed', 'cratered'],      // >20%
  ['dropped', 'fell sharply', 'tumbled'],    // 10-20%
  ['declined', 'slipped', 'retreated'],      // 5-10%
  ['dipped', 'softened', 'eased'],           // 2-5%
  ['held flat', 'remained unchanged'],        // <2%
];
const UP_VERBS_ID = [
  ['melonjak', 'meledak', 'melesat'],
  ['naik signifikan', 'naik tajam'],
  ['tumbuh', 'meningkat', 'naik'],
  ['naik tipis', 'sedikit naik'],
  ['stabil', 'bertahan'],
];
const DOWN_VERBS_ID = [
  ['anjlok', 'ambruk', 'terjun'],
  ['menurun tajam', 'jatuh'],
  ['menurun', 'menyusut', 'turun'],
  ['turun sedikit', 'melunak'],
  ['tetap', 'tidak berubah'],
];

function selectVerb(absPct: number, isUp: boolean, lang: 'en' | 'id' = 'en'): string {
  const table = lang === 'id'
    ? (isUp ? UP_VERBS_ID : DOWN_VERBS_ID)
    : (isUp ? UP_VERBS_EN : DOWN_VERBS_EN);
  let tier: string[];
  if (absPct > 20) tier = table[0];
  else if (absPct > 10) tier = table[1];
  else if (absPct > 5) tier = table[2];
  else if (absPct > 2) tier = table[3];
  else tier = table[4];
  return tier[Math.floor(absPct) % tier.length];
}

// ─── Pattern-Aware Driver Clause ─────────────────────────────────────

const DRIVER_EN = ['driven by', 'fueled by', 'led by', 'amid', 'reflecting'];
const DRIVER_DOWN_EN = ['hit by', 'weighed down by', 'due to', 'amid'];

function driverClause(driver: string | undefined, isUp: boolean): string {
  if (!driver) return '';
  const templates = isUp ? DRIVER_EN : DRIVER_DOWN_EN;
  const tmpl = templates[Math.floor(Math.random() * templates.length)];
  return `, ${tmpl} ${driver}`;
}

// ─── Pattern Detection (12 patterns, inline for Deno compatibility) ──

type InsightPattern = 'trend_up_strong' | 'trend_up_moderate' | 'trend_down_strong' | 'trend_down_moderate'
  | 'flat_plateau' | 'threshold_crossed' | 'anomaly' | 'composition_shift'
  | 'comparison_diverge' | 'comparison_converge' | 'depth_broadening' | 'trend_reversal';

function detectInsightPattern(nums: number[]): { pattern: InsightPattern; absPct: number; isUp: boolean; streak: number } {
  if (nums.length < 2) return { pattern: 'flat_plateau', absPct: 0, isUp: true, streak: 0 };

  const last = nums[nums.length - 1];
  const prev = nums[nums.length - 2];
  const pct = prev === 0 ? (last > 0 ? 100 : 0) : ((last - prev) / Math.abs(prev)) * 100;
  const absPct = Math.abs(pct);
  const isUp = pct > 0;

  // Streak detection
  let streak = 1;
  for (let i = nums.length - 2; i > 0; i--) {
    const d = nums[i] - nums[i - 1];
    if ((isUp && d > 0) || (!isUp && d < 0)) streak++;
    else break;
  }

  // Anomaly detection: single period >2σ from mean
  if (nums.length >= 4) {
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const std = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
    if (std > 0 && Math.abs(last - mean) > 2 * std) {
      return { pattern: 'anomaly', absPct, isUp, streak: 1 };
    }
  }

  // Trend reversal: latest period reverses ≥3-period prior trend
  if (nums.length >= 5) {
    const priorDeltas: boolean[] = [];
    for (let i = nums.length - 3; i > 0; i--) {
      priorDeltas.push(nums[i] > nums[i - 1]);
    }
    const priorUp = priorDeltas.filter(d => d).length;
    const priorDir = priorUp > priorDeltas.length / 2;
    if (priorDeltas.length >= 3 && priorDir !== isUp) {
      return { pattern: 'trend_reversal', absPct, isUp, streak: 1 };
    }
  }

  // Flat plateau
  if (absPct < 2) {
    const allFlat = nums.length >= 4 && nums.slice(1).every((v, i) => {
      const d = nums[i] === 0 ? 0 : Math.abs((v - nums[i]) / Math.abs(nums[i])) * 100;
      return d < 5;
    });
    if (allFlat) return { pattern: 'flat_plateau', absPct, isUp, streak: nums.length };
    return { pattern: 'flat_plateau', absPct, isUp, streak };
  }

  // Strong vs moderate trends
  if (isUp) {
    return absPct > 10 && streak >= 3
      ? { pattern: 'trend_up_strong', absPct, isUp, streak }
      : { pattern: 'trend_up_moderate', absPct, isUp, streak };
  } else {
    return absPct > 10 && streak >= 3
      ? { pattern: 'trend_down_strong', absPct, isUp, streak }
      : { pattern: 'trend_down_moderate', absPct, isUp, streak };
  }
}

/**
 * Generate insight-driven chart title following contextual-chart-agent standard.
 * Enhanced with 12-pattern detection, 5-tier verb intensity, and driver clauses.
 */
function insightTitle(
  arr: Array<Record<string, unknown>>,
  field: string,
  label: string,
  sourceTable?: string,
): { title: string; subtitle: string; footnote: string } {
  const nums = arr.map(r => Number(r[field])).filter(n => !isNaN(n));
  const source = sourceTable || 'Galen platform analytics';
  const footnote = `Based on ${arr.length} months of data. Source: ${source}.`;

  if (nums.length < 2) return { title: `${label} — Monthly Trend`, subtitle: label, footnote };

  const last = nums[nums.length - 1];
  const prev = nums[nums.length - 2];
  if (prev === 0) return { title: `${label} at ${formatHeadlineVal(last, field)}`, subtitle: label, footnote };

  // Pattern detection
  const { pattern, absPct, isUp, streak } = detectInsightPattern(nums);
  const verb = selectVerb(absPct, isUp);
  const streakClause = streak >= 3 ? `, ${streak} consecutive months` : '';

  // Pattern-specific headline templates
  let title: string;
  switch (pattern) {
    case 'flat_plateau':
      title = `${label} held steady at ${formatHeadlineVal(last, field)} over ${nums.length} months`;
      break;
    case 'anomaly':
      title = `${label} showed unexpected ${isUp ? 'spike' : 'drop'} to ${formatHeadlineVal(last, field)} (${absPct.toFixed(1)}% change)`;
      break;
    case 'trend_reversal':
      title = `${label} reversed course, ${isUp ? 'improving' : 'declining'} ${absPct.toFixed(1)}% after prior trend`;
      break;
    case 'trend_up_strong':
    case 'trend_up_moderate':
    case 'trend_down_strong':
    case 'trend_down_moderate':
    default:
      title = `${label} ${verb} ${absPct.toFixed(1)}% month-over-month${streakClause}`;
      break;
  }

  // Subtitle with metric unit
  const fl = field.toLowerCase();
  const isPct = fl.includes('pct') || fl.includes('rate') || fl.includes('percent');
  const isCurrency = (fl.includes('cost') || fl.includes('revenue') || fl.includes('fee') || fl.includes('gmv')) && last > 1000;
  const unit = isPct ? '%' : isCurrency ? 'IDR' : fl.includes('days') ? 'days' : '';
  const subtitle = unit ? `${label}, monthly trend (${unit})` : `${label}, monthly trend`;

  return { title, subtitle, footnote };
}

/** Map threshold config to chart thresholds array. */
function mapThresholds(
  thresholds: ThresholdConfig[],
  metricKeyword: string,
): Array<{ value: number; color: string; label: string }> | undefined {
  const tc = thresholds.find(t => t.metricName.toLowerCase().includes(metricKeyword));
  if (!tc) return undefined;
  const result: Array<{ value: number; color: string; label: string }> = [];
  if (typeof tc.red?.value === 'number') result.push({ value: tc.red.value, color: '#DC2626', label: `Red: ${tc.red.value}` });
  else if (Array.isArray(tc.red?.value)) result.push({ value: tc.red.value[0], color: '#DC2626', label: `Red: ${tc.red.value[0]}` });
  if (typeof tc.yellow?.value === 'number') result.push({ value: tc.yellow.value, color: '#F59E0B', label: `Warning: ${tc.yellow.value}` });
  else if (Array.isArray(tc.yellow?.value)) result.push({ value: tc.yellow.value[0], color: '#F59E0B', label: `Warning: ${tc.yellow.value[0]}` });
  return result.length > 0 ? result : undefined;
}

/** Check if a metric keyword exists in anomaly list. */
function hasAnomaly(anomalies: AnomalyLike[], metricKeyword: string): boolean {
  return anomalies.some(a => a.metric.toLowerCase().includes(metricKeyword));
}

// ─── Decomposition Charts ───────────────────────────────────────────

const CONCENTRATION_THRESHOLD = 30; // % — any single segment above this is a concentration risk

/** Human-readable dimension value label for chart data */
function humanizeDimValue(dimension: string, value: string): string {
  if (dimension === 'is_returned' || dimension === 'return_status') {
    return value.toLowerCase() === 'true' ? 'Returned' : value.toLowerCase() === 'false' ? 'Non-Returned' : value;
  }
  if (value.toLowerCase() === 'true') return 'Yes';
  if (value.toLowerCase() === 'false') return 'No';
  return value;
}

/** Compute priority/alert tag for a decomposition chart */
function computeAlertTag(dec: DecompositionResult): { text: string; severity: string; color: string; sortOrder: number } {
  const top = dec.topContributors[0];
  if (!top) return { text: '→ Stable', severity: 'stable', color: '#059669', sortOrder: 4 };

  // Check for significant deltas (period-over-period shift)
  const maxDelta = Math.max(...dec.topContributors.map(c => Math.abs(c.deltaPp ?? 0)));

  // Concentration risk: any single segment > threshold
  if (top.contribution >= CONCENTRATION_THRESHOLD) {
    if (top.contribution >= 60) return { text: '⚠ High Concentration', severity: 'critical', color: '#DC2626', sortOrder: 1 };
    // Concentration + significant shift = escalate
    if (maxDelta > 5) return { text: '⚠ Concentration + Shift', severity: 'critical', color: '#DC2626', sortOrder: 1 };
    return { text: '⚠ Concentration Risk', severity: 'high', color: '#F59E0B', sortOrder: 2 };
  }

  // Significant shift without concentration
  if (maxDelta > 5) return { text: '↗ Significant Shift', severity: 'high', color: '#F59E0B', sortOrder: 2 };
  if (maxDelta > 2) return { text: '↗ Moderate Shift', severity: 'medium', color: '#2563EB', sortOrder: 3 };

  // Moderate spread — no single dominant contributor, no shift
  return { text: '→ Balanced', severity: 'stable', color: '#059669', sortOrder: 4 };
}

/**
 * Build Layer 2 decomposition charts from statistical decomposer results.
 * Implements contextual chart standard: priority tags, human labels,
 * rich footnotes, and concentration risk markers.
 */
export function buildDecompositionCharts(
  decomposition: DecompositionResult[],
  resolvedMeasures?: string[],
): ChartRecord[] {
  const charts: ChartRecord[] = [];
  const significant = decomposition
    .filter(dec => {
      if (dec.topContributors.length < 2 || (dec.topContributors[0]?.contribution ?? 0) < 25) return false;
      // SWD guard: skip "balanced" decompositions where all segments are within ±5% of each other
      const vals = dec.topContributors.map(c => c.contribution);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (mean > 0 && vals.every(v => Math.abs(v - mean) / mean < 0.05)) return false;
      return true;
    })
    .sort((a, b) => Math.abs(b.totalDeviation) - Math.abs(a.totalDeviation))
    .slice(0, 4);

  const filtered = significant.filter(dec => {
    const metricPart = dec.metric.split(' by ')[0].trim();
    return isFieldRelevant(resolvedMeasures, metricPart);
  });
  // Fallback: if relevance filter removes ALL decompositions, use the unfiltered set.
  // This prevents the frontend from falling back to the dumb contribution-% grid.
  const relevant = filtered.length > 0 ? filtered : significant;

  for (const dec of relevant) {
    const top = dec.topContributors[0];
    const second = dec.topContributors[1];
    if (!top) continue;

    const metricLbl = humanizeFieldName(dec.metric.split(' by ')[0].trim());
    const dimLbl = humanizeFieldName(top.dimension.replace(/_id$/, ''));
    const topPct = top.contribution.toFixed(1);
    const topDisplayName = humanizeDimValue(top.dimension, top.value);

    // Insight-driven title (concentration-aware)
    const concentrationRatio = second ? (top.contribution / second.contribution) : Infinity;
    let title: string;
    if (concentrationRatio > 3) {
      title = `${topDisplayName} dominates ${metricLbl} at ${topPct}% — ${concentrationRatio.toFixed(1)}× the next ${dimLbl}`;
    } else if (top.contribution >= 40) {
      const secondDisplay = second ? humanizeDimValue(second.dimension, second.value) : 'others';
      title = `${topDisplayName} leads ${metricLbl} at ${topPct}%, followed by ${secondDisplay} at ${second?.contribution.toFixed(1) || '?'}%`;
    } else {
      title = `${topDisplayName} drives ${topPct}% of ${metricLbl} across ${dec.topContributors.length} ${dimLbl}s`;
    }

    // Detect rate vs volume metric
    const metricRaw = dec.metric.split(' by ')[0].trim();
    const metricRawLower = metricRaw.toLowerCase();
    const isRateMetric = metricRawLower.includes('hours') || metricRawLower.includes('days')
      || metricRawLower.includes('pct') || metricRawLower.includes('rate') || metricRawLower.includes('cycle')
      || metricRawLower.includes('contact') || metricRawLower.includes('rework') || metricRawLower.includes('review');

    // Check if we have period comparison data
    const hasPrevious = dec.topContributors.some(c => c.previousContribution != null);
    const periodLabels = dec.periodLabels;

    // Source: derive table reference from metric name
    const sourceTable = metricRawLower.includes('contact') || metricRawLower.includes('credit') || metricRawLower.includes('review')
        || metricRawLower.includes('rework') || metricRawLower.includes('funded') || metricRawLower.includes('loan')
        || metricRawLower.includes('cycle') || metricRawLower.includes('approved') || metricRawLower.includes('kpr')
      ? 'kpr_applications'
      : metricRaw.startsWith('logistiq') ? 'logistiq_orders_flat'
      : metricRawLower.includes('gmv') || metricRawLower.includes('revenue') || metricRawLower.includes('margin') || metricRawLower.includes('cost') || metricRawLower.includes('fee')
        ? 'logistiq_orders_flat'
        : 'fact_orders';
    const truncNote = dec.topContributors.length >= 5 ? ` Showing top 5.` : '';

    // Priority alert tag
    const alertTag = computeAlertTag(dec);

    // ── Rate metric: show ACTUAL RATES per segment (diagnosis view) ──
    if (isRateMetric) {
      // Sort by avg rate descending for rate charts (worst performer first)
      // Filter out zero-value segments from title generation (they skew the comparison)
      const nonZeroContributors = dec.topContributors.filter(c => c.avgMetricValue > 0);
      const sortedByRate = [...(nonZeroContributors.length > 0 ? nonZeroContributors : dec.topContributors)]
        .sort((a, b) => b.avgMetricValue - a.avgMetricValue);
      const topByRate = sortedByRate[0];
      const bottomByRate = sortedByRate.length > 1 ? sortedByRate[sortedByRate.length - 1] : null;
      if (!topByRate) continue;

      const topRateDisplay = humanizeDimValue(topByRate.dimension, topByRate.value);
      const bottomRateDisplay = bottomByRate ? humanizeDimValue(bottomByRate.dimension, bottomByRate.value) : '';

      // Overall average
      const totalCount = dec.topContributors.reduce((s, c) => s + (c.count || 1), 0);
      const totalValue = dec.topContributors.reduce((s, c) => s + (c.metricValue || 0), 0);
      const overallAvg = totalCount > 0 ? totalValue / totalCount : 0;

      // Insight-driven title: highlight the gap between best and worst (both must be non-zero)
      const gap = bottomByRate ? topByRate.avgMetricValue - bottomByRate.avgMetricValue : 0;
      let rateTitle: string;
      if (gap > 0 && bottomByRate && bottomByRate.avgMetricValue > 0 && topByRate.avgMetricValue > overallAvg * 1.2) {
        rateTitle = `${topRateDisplay} at ${formatHeadlineVal(topByRate.avgMetricValue, metricLbl)} vs ${bottomRateDisplay} at ${formatHeadlineVal(bottomByRate.avgMetricValue, metricLbl)}`;
      } else {
        rateTitle = `${topRateDisplay} leads ${metricLbl} at ${formatHeadlineVal(topByRate.avgMetricValue, metricLbl)}`;
      }

      const rateSubtitle = hasPrevious && periodLabels
        ? `Average ${metricLbl} by ${dimLbl.toLowerCase()}, ${periodLabels.current} vs ${periodLabels.previous}`
        : `Average ${metricLbl} by ${dimLbl.toLowerCase()}`;

      const periodNote = hasPrevious && periodLabels ? ` Period: ${periodLabels.current} vs ${periodLabels.previous}.` : '';
      const rateFootnote = `${dimLbl} breakdown of ${metricLbl} (avg ${formatHeadlineVal(overallAvg, metricLbl)}).${periodNote} ${dec.topContributors.length} segments shown.${truncNote} Source: ${sourceTable}.`;

      // Build rate chart data — sorted by rate descending
      const rateChartData: Array<Record<string, unknown>> = [];
      for (let i = 0; i < sortedByRate.length; i++) {
        const c = sortedByRate[i];
        const displayName = humanizeDimValue(c.dimension, c.value);
        rateChartData.push({
          name: displayName,
          contribution: c.avgMetricValue, // Use avgMetricValue as the bar value
          metricValue: c.metricValue,
          is_primary: i === 0,
          concentrationRisk: c.avgMetricValue > overallAvg * 1.3,
          ...(hasPrevious && c.previousAvgMetricValue != null ? {
            previous: c.previousAvgMetricValue,
            deltaPp: Math.round((c.avgMetricValue - c.previousAvgMetricValue) * 10) / 10,
            deltaLabel: c.avgMetricValue >= c.previousAvgMetricValue
              ? `+${(c.avgMetricValue - c.previousAvgMetricValue).toFixed(1)}`
              : `${(c.avgMetricValue - c.previousAvgMetricValue).toFixed(1)}`,
            deltaSignificant: Math.abs(c.avgMetricValue - c.previousAvgMetricValue) > 2,
          } : {}),
        });
      }

      charts.push({
        id: `dec-${dec.metric}`,
        layer: 'decomposition',
        chartType: 'horizontal_bars',
        title: rateTitle,
        subtitle: rateSubtitle,
        footnote: rateFootnote,
        alertTag,
        data: rateChartData,
        config: {
          xField: 'contribution', // reuse same field name for rendering compatibility
          yField: 'name',
          yAxisTitle: metricLbl,
          highlightCondition: { field: 'is_primary', operator: '===', value: true, color: '#2563EB' },
        },
      });

    } else {
      // ── Volume/count metric: show CONTRIBUTION % (mix view) ──

      const subtitle = hasPrevious && periodLabels
        ? `% contribution by ${dimLbl.toLowerCase()}, ${periodLabels.current} vs ${periodLabels.previous}`
        : `% contribution by ${dimLbl.toLowerCase()}, current period`;

      const totalCount = dec.topContributors.reduce((s, c) => s + (c.count || 1), 0);
      const totalValue = dec.topContributors.reduce((s, c) => s + (c.metricValue || 0), 0);
      const valStr = totalValue > 0 ? ` (${formatHeadlineVal(totalValue, metricLbl)})` : '';
      const periodNote = hasPrevious && periodLabels ? ` Period: ${periodLabels.current} vs ${periodLabels.previous}.` : '';
      const footnote = `${dimLbl} breakdown of ${metricLbl}${valStr}.${periodNote} ${dec.topContributors.length} segments shown.${truncNote} Source: ${sourceTable}.`;

      // Build chart data — include previous period values for ghost bars
      const chartData: Array<Record<string, unknown>> = [];
      for (let i = 0; i < dec.topContributors.length; i++) {
        const c = dec.topContributors[i];
        const displayName = humanizeDimValue(c.dimension, c.value);
        const deltaPp = c.deltaPp ?? 0;
        const deltaLabel = deltaPp >= 0 ? `+${deltaPp.toFixed(1)}pp` : `${deltaPp.toFixed(1)}pp`;

        chartData.push({
          name: displayName,
          contribution: c.contribution,
          metricValue: c.metricValue,
          is_primary: i === 0,
          concentrationRisk: c.contribution >= CONCENTRATION_THRESHOLD,
          ...(hasPrevious ? {
            previous: c.previousContribution ?? null,
            deltaPp,
            deltaLabel: Math.abs(deltaPp) >= 0.1 ? deltaLabel : '—',
            deltaSignificant: Math.abs(deltaPp) > 2,
          } : {}),
        });
      }

      charts.push({
        id: `dec-${dec.metric}`,
        layer: 'decomposition',
        chartType: 'horizontal_bars',
        title,
        subtitle,
        footnote,
        alertTag,
        data: chartData,
        config: {
          xField: 'contribution',
          yField: 'name',
          yAxisTitle: '% Contribution',
          highlightCondition: { field: 'is_primary', operator: '===', value: true, color: '#2563EB' },
        },
      });
    }
  }

  // Sort charts by priority (most actionable first)
  charts.sort((a, b) => ((a.alertTag as Record<string, unknown>)?.sortOrder as number ?? 4) - ((b.alertTag as Record<string, unknown>)?.sortOrder as number ?? 4));

  return charts;
}

// ─── Pyramid Decomposition Charts ────────────────────────────────────

import { decomposeFiltered } from "./statisticalDecomposer.ts";

/** Default dimension drill-down priority (from investigation protocol) */
const DEFAULT_DIM_PRIORITY = [
  'region', 'channel', 'speed_bucket', 'contact_speed_bucket',
  'product_type', 'product', 'segment', 'customer_segment',
  'rm', 'rm_id', 'week', 'source', 'digital_source',
];

/** Dimensions that produce noise as focus entity (IDs, unknowns, high-cardinality) */
const NOISE_DIMENSIONS = new Set([
  'reviewer_id', 'rm_id', 'rm', 'week', 'week_number', 'month',
]);

/** Values that are noise / non-actionable as focus entity */
const NOISE_VALUES = new Set([
  'unknown', 'null', 'none', 'other', 'others', 'n/a', 'undefined', '-',
]);

/** Convergence entry from the investigation pipeline */
interface ConvergenceEntry {
  dimension: string;
  value: string;
  appearsInMetrics: string[];
  contributionAvg: number;
}

/**
 * Pick the best metric value for chart display.
 * `avgMetricValue` is preferred (it's the per-row average), but `decomposeFiltered`
 * may return absurdly large values when it matches a monetary/count column instead
 * of a rate/percentage column. In that case, fall back to `contribution` (always a
 * normalized percentage of total).
 *
 * Heuristic: if avgMetricValue > 10000, it's almost certainly a raw sum, not a rate.
 * Rate metrics (%, days, scores) are rarely above 10000.
 */
function pickChartValue(c: { avgMetricValue?: number; contribution: number }): number {
  if (c.avgMetricValue != null && c.avgMetricValue > 0 && c.avgMetricValue < 10_000) {
    return c.avgMetricValue;
  }
  return c.contribution;
}

/**
 * Build pyramid decomposition charts — progressive drill-down from L0 → L3.
 * Only called during investigation mode.
 *
 * L0: All entities, focus highlighted (reuses existing decomposition)
 * L1: Filtered to focus entity, decompose by next dimension
 * L2: Double-filtered, decompose by next deeper dimension
 * L3: Counterfactual recovery scenario
 */
export function buildPyramidCharts(
  decomposition: DecompositionResult[],
  dbData: Record<string, unknown>,
  convergence: ConvergenceEntry[],
  resolvedMeasures?: string[],
  dimensionPriority?: string[],
): ChartRecord[] {
  const dimPriority = dimensionPriority?.length ? dimensionPriority : DEFAULT_DIM_PRIORITY;
  const charts: ChartRecord[] = [];

  // N/A-like dimension values to filter out — shared across all pyramid levels
  const NA_VALUES = new Set(['n/a', 'unknown', 'null', 'undefined', 'none', 'no review', '']);

  // ── L0: Tag existing top decompositions with pyramid metadata ──
  // Filter out noise dimensions and require meaningful top contributors
  const significant = decomposition
    .filter(dec => {
      if (dec.topContributors.length < 2) return false;
      const top = dec.topContributors[0];
      if (!top || (top.contribution ?? 0) < 25) return false;
      // Skip noise dimensions (reviewer_id, rm_id, week_number)
      if (NOISE_DIMENSIONS.has(top.dimension)) return false;
      // Skip noise values (Unknown, null, etc.)
      if (NOISE_VALUES.has(top.value.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      // Prefer decompositions with higher deviation, then higher concentration
      const devDiff = Math.abs(b.totalDeviation) - Math.abs(a.totalDeviation);
      if (devDiff !== 0) return devDiff;
      return (b.topContributors[0]?.contribution ?? 0) - (a.topContributors[0]?.contribution ?? 0);
    });

  // Pick decompositions relevant to this specialist's metrics
  const filtered = significant.filter(dec => {
    const metricPart = dec.metric.split(' by ')[0].trim();
    return isFieldRelevant(resolvedMeasures, metricPart);
  });
  // Fallback: if relevance filter removes ALL, use unfiltered set
  const relevant = filtered.length > 0 ? filtered : significant;

  // Use dimension priority to select DIFFERENT decompositions for L0
  // (avoid showing the same dimension twice at L0)
  const l0Decomps: typeof relevant = [];
  const usedL0Dims = new Set<string>();
  for (const dec of relevant) {
    const dim = dec.topContributors[0]?.dimension;
    if (dim && !usedL0Dims.has(dim)) {
      l0Decomps.push(dec);
      usedL0Dims.add(dim);
      if (l0Decomps.length >= 2) break;
    }
  }

  // Identify focus entity from convergence or decomposition
  // Filter convergence to skip noise dimensions/values too
  const cleanConvergence = convergence.filter(c =>
    !NOISE_DIMENSIONS.has(c.dimension) &&
    !NOISE_VALUES.has(c.value.toLowerCase()),
  );

  // Pick focus: convergence (cross-metric signal) > decomposition top contributor
  // For decomposition fallback, prefer dimensions in dimPriority order
  let focusEntry: { dimension: string; value: string; appearsInMetrics: string[]; contributionAvg: number } | null = null;

  if (cleanConvergence.length > 0) {
    focusEntry = cleanConvergence[0];
  } else if (l0Decomps.length > 0) {
    // Pick the decomposition whose dimension appears earliest in dimPriority
    const bestDecomp = l0Decomps.reduce((best, dec) => {
      const dim = dec.topContributors[0]?.dimension || '';
      const bestDim = best.topContributors[0]?.dimension || '';
      const dimIdx = dimPriority.indexOf(dim);
      const bestIdx = dimPriority.indexOf(bestDim);
      // Lower index = higher priority; -1 means not in list (lowest priority)
      const normIdx = dimIdx === -1 ? 999 : dimIdx;
      const normBestIdx = bestIdx === -1 ? 999 : bestIdx;
      return normIdx < normBestIdx ? dec : best;
    });
    const top = bestDecomp.topContributors[0];
    focusEntry = {
      dimension: top.dimension,
      value: top.value,
      appearsInMetrics: [bestDecomp.metric],
      contributionAvg: top.contribution,
    };
  }

  if (!focusEntry) return charts;

  const focusDim = focusEntry.dimension;
  const focusVal = focusEntry.value;
  const focusDisplay = humanizeDimValue(focusDim, focusVal);

  // Build L0 charts from existing decomposition data (unique dimensions only)
  for (const dec of l0Decomps) {
    const top = dec.topContributors[0];
    if (!top) continue;

    const metricLbl = humanizeFieldName(dec.metric.split(' by ')[0].trim());
    const dimLbl = humanizeFieldName(top.dimension.replace(/_id$/, ''));

    // Filter out N/A-like dimension values that add no analytical value
    const cleanContributors = dec.topContributors.filter(c => !NA_VALUES.has(c.value.toLowerCase()));
    if (cleanContributors.length === 0) continue; // skip entirely N/A decompositions

    // Build chart data — highlight the actual highest value segment (not forced focus)
    const l0SortedForHighlight = [...cleanContributors].sort((a, b) => pickChartValue(b) - pickChartValue(a));
    const l0HighlightValue = l0SortedForHighlight[0]?.value;
    const chartData: Array<Record<string, unknown>> = cleanContributors.map((c) => {
      const displayName = humanizeDimValue(c.dimension, c.value);
      return {
        name: displayName,
        contribution: pickChartValue(c),
        metricValue: c.metricValue,
        is_primary: c.value === l0HighlightValue,
        concentrationRisk: c.contribution >= CONCENTRATION_THRESHOLD,
        ...(c.previousContribution != null ? {
          previous: c.previousAvgMetricValue ?? c.previousContribution,
          deltaPp: c.deltaPp ?? 0,
          deltaLabel: (c.deltaPp ?? 0) >= 0 ? `+${(c.deltaPp ?? 0).toFixed(1)}pp` : `${(c.deltaPp ?? 0).toFixed(1)}pp`,
          deltaSignificant: Math.abs(c.deltaPp ?? 0) > 2,
        } : {}),
      };
    });

    // L0 headline: ALWAYS use actual top contributors sorted by value. Never force focus entity.
    const l0Sorted = [...cleanContributors].sort((a, b) => pickChartValue(b) - pickChartValue(a));
    const l0Top = l0Sorted[0];
    const l0Second = l0Sorted.length > 1 ? l0Sorted[1] : null;
    const l0TopDisplay = humanizeDimValue(l0Top.dimension, l0Top.value);
    const l0TopVal = pickChartValue(l0Top);

    let l0Title: string;
    if (l0Second) {
      const l0SecondDisplay = humanizeDimValue(l0Second.dimension, l0Second.value);
      const l0SecondVal = pickChartValue(l0Second);
      l0Title = `${l0TopDisplay} at ${formatHeadlineVal(l0TopVal, metricLbl)} vs ${l0SecondDisplay} at ${formatHeadlineVal(l0SecondVal, metricLbl)}`;
    } else {
      l0Title = `${l0TopDisplay} leads at ${formatHeadlineVal(l0TopVal, metricLbl)}`;
    }

    const alertTag = computeAlertTag(dec);

    charts.push({
      id: `pyramid-l0-${dec.metric}`,
      layer: 'decomposition',
      chartType: 'horizontal_bars',
      title: l0Title,
      subtitle: `${metricLbl} by ${dimLbl} — all segments`,
      footnote: `L0: Identifying the problem entity. ${cleanContributors.length} segments shown. Source: statistical decomposition.`,
      alertTag,
      data: chartData,
      config: {
        xField: 'contribution',
        yField: 'name',
        yAxisTitle: metricLbl,
        highlightCondition: { field: 'is_primary', operator: '===', value: true, color: '#2563EB' },
      },
      pyramid: {
        level: 0,
        focusEntity: focusDisplay,
        focusDimension: focusDim,
        filters: [],
        question: `Which ${dimLbl.toLowerCase()} has the problem?`,
      },
    });
  }

  // ── L1: Filter to focus entity, decompose by next dimension ──
  const usedDimensions = new Set<string>([focusDim]);

  // Find the primary metric from decomposition (for drilling down)
  const primaryMetric = l0Decomps[0]?.metric.split(' by ')[0].trim() || '';
  if (!primaryMetric) return charts;

  const nextDimL1 = dimPriority.find(d => !usedDimensions.has(d));
  if (!nextDimL1) return charts;

  const l1Result = decomposeFiltered(
    dbData,
    [{ dimension: focusDim, value: focusVal }],
    nextDimL1,
    primaryMetric,
  );

  if (l1Result && l1Result.topContributors.length >= 2) {
    const metricLbl = humanizeFieldName(primaryMetric);
    const nextDimLbl = humanizeFieldName(nextDimL1.replace(/_id$/, ''));

    // L1: Sort by actual metric value to find real leader, then build data
    const l1Sorted = [...l1Result.topContributors].sort((a, b) => pickChartValue(b) - pickChartValue(a));
    const l1Top = l1Sorted[0];
    const l1TopDisplay = humanizeDimValue(l1Top.dimension, l1Top.value);
    const l1TopValue = l1Top.value; // raw value for matching

    const l1Clean = l1Result.topContributors.filter(c => !NA_VALUES.has(c.value.toLowerCase()));
    const l1Data: Array<Record<string, unknown>> = l1Clean.map((c) => ({
      name: humanizeDimValue(c.dimension, c.value),
      contribution: pickChartValue(c),
      metricValue: c.metricValue,
      is_primary: c.value === l1TopValue, // highlight the actual highest value segment
      concentrationRisk: c.contribution >= CONCENTRATION_THRESHOLD,
      ...(c.previousContribution != null ? {
        previous: c.previousAvgMetricValue ?? c.previousContribution,
        deltaPp: c.deltaPp ?? 0,
        deltaLabel: (c.deltaPp ?? 0) >= 0 ? `+${(c.deltaPp ?? 0).toFixed(1)}pp` : `${(c.deltaPp ?? 0).toFixed(1)}pp`,
        deltaSignificant: Math.abs(c.deltaPp ?? 0) > 2,
      } : {}),
    }));
    const l1TopVal = pickChartValue(l1Top);
    const l1Title = `Within ${focusDisplay}, ${l1TopDisplay} leads at ${formatHeadlineVal(l1TopVal, metricLbl)}`;

    charts.push({
      id: `pyramid-l1-${primaryMetric}-${nextDimL1}`,
      layer: 'decomposition',
      chartType: 'horizontal_bars',
      title: l1Title,
      subtitle: `${metricLbl} by ${nextDimLbl} — filtered to ${focusDisplay}`,
      footnote: `L1: Decomposing within ${focusDisplay}. Filter: ${focusDim}=${focusVal}. ${l1Result.topContributors.length} segments. Source: statistical decomposition.`,
      alertTag: computeAlertTag(l1Result),
      data: l1Data,
      config: {
        xField: 'contribution',
        yField: 'name',
        yAxisTitle: metricLbl,
        highlightCondition: { field: 'is_primary', operator: '===', value: true, color: '#2563EB' },
      },
      pyramid: {
        level: 1,
        focusEntity: focusDisplay,
        focusDimension: focusDim,
        filters: [{ dimension: focusDim, value: focusVal }],
        question: `Within ${focusDisplay}, what drives the problem by ${nextDimLbl.toLowerCase()}?`,
      },
    });

    usedDimensions.add(nextDimL1);

    // ── L2: Double-filter, decompose by next dimension ──
    const l1FocusVal = l1Top.value;
    const l1FocusDisplay = l1TopDisplay;
    const nextDimL2 = dimPriority.find(d => !usedDimensions.has(d));

    if (nextDimL2) {
      const l2Result = decomposeFiltered(
        dbData,
        [
          { dimension: focusDim, value: focusVal },
          { dimension: nextDimL1, value: l1FocusVal },
        ],
        nextDimL2,
        primaryMetric,
      );

      if (l2Result && l2Result.topContributors.length >= 2) {
        const nextDimL2Lbl = humanizeFieldName(nextDimL2.replace(/_id$/, ''));

        // Sort by actual value to find real leader
        const l2Sorted = [...l2Result.topContributors].sort((a, b) => pickChartValue(b) - pickChartValue(a));
        const l2Top = l2Sorted[0];
        const l2TopDisplay = humanizeDimValue(l2Top.dimension, l2Top.value);
        const l2TopValue = l2Top.value;

        const l2Clean = l2Result.topContributors.filter(c => !NA_VALUES.has(c.value.toLowerCase()));
        const l2Data: Array<Record<string, unknown>> = l2Clean.map((c) => ({
          name: humanizeDimValue(c.dimension, c.value),
          contribution: pickChartValue(c),
          metricValue: c.metricValue,
          is_primary: c.value === l2TopValue, // highlight actual highest
          concentrationRisk: c.contribution >= CONCENTRATION_THRESHOLD,
          ...(c.previousContribution != null ? {
            previous: c.previousAvgMetricValue ?? c.previousContribution,
            deltaPp: c.deltaPp ?? 0,
            deltaLabel: (c.deltaPp ?? 0) >= 0 ? `+${(c.deltaPp ?? 0).toFixed(1)}pp` : `${(c.deltaPp ?? 0).toFixed(1)}pp`,
            deltaSignificant: Math.abs(c.deltaPp ?? 0) > 2,
          } : {}),
        }));
        const l2TopVal = pickChartValue(l2Top);
        const l2Title = `${l2TopDisplay} leads within ${focusDisplay} → ${l1FocusDisplay} at ${formatHeadlineVal(l2TopVal, metricLbl)}`;

        charts.push({
          id: `pyramid-l2-${primaryMetric}-${nextDimL2}`,
          layer: 'decomposition',
          chartType: 'horizontal_bars',
          title: l2Title,
          subtitle: `${metricLbl} by ${nextDimL2Lbl} — filtered to ${focusDisplay} → ${l1FocusDisplay}`,
          footnote: `L2: Root cause within ${focusDisplay} → ${l1FocusDisplay}. Filters: ${focusDim}=${focusVal}, ${nextDimL1}=${l1FocusVal}. ${l2Result.topContributors.length} segments. Source: statistical decomposition.`,
          alertTag: computeAlertTag(l2Result),
          data: l2Data,
          config: {
            xField: 'contribution',
            yField: 'name',
            yAxisTitle: metricLbl,
            highlightCondition: { field: 'is_primary', operator: '===', value: true, color: '#2563EB' },
          },
          pyramid: {
            level: 2,
            focusEntity: focusDisplay,
            focusDimension: focusDim,
            filters: [
              { dimension: focusDim, value: focusVal },
              { dimension: nextDimL1, value: l1FocusVal },
            ],
            question: `What is the root cause within ${focusDisplay} → ${l1FocusDisplay}?`,
          },
        });

        usedDimensions.add(nextDimL2);
      }
    }

    // ── L3: Counterfactual recovery ──
    // Compare focus entity performance vs best segment, project recovery
    const allContributors = l1Result.topContributors;
    const worstSegment = allContributors[0]; // sorted by contribution/rate desc — highest = worst for cost/time metrics
    const bestSegment = allContributors[allContributors.length - 1];

    if (worstSegment && bestSegment && worstSegment.value !== bestSegment.value) {
      const worstVal = pickChartValue(worstSegment);
      const bestVal = pickChartValue(bestSegment);
      const delta = Math.abs(worstVal - bestVal);

      if (delta > 0) {
        const worstDisplay = humanizeDimValue(worstSegment.dimension, worstSegment.value);
        const bestDisplay = humanizeDimValue(bestSegment.dimension, bestSegment.value);

        const l3Data: Array<Record<string, unknown>> = [
          {
            name: `Current (${worstDisplay})`,
            contribution: worstVal,
            is_primary: false,
            is_potential: false,
          },
          {
            name: `If improved to ${bestDisplay} rate`,
            contribution: bestVal,
            is_primary: false,
            is_potential: true,
          },
        ];

        const l3Title = `Improving ${worstDisplay} to ${bestDisplay} level recovers ${formatHeadlineVal(delta, metricLbl)}`;

        charts.push({
          id: `pyramid-l3-${primaryMetric}-recovery`,
          layer: 'decomposition',
          chartType: 'horizontal_bars',
          title: l3Title,
          subtitle: `${metricLbl} — counterfactual recovery scenario`,
          footnote: `L3: Recovery estimate. If ${focusDisplay} ${worstDisplay} segment matched ${bestDisplay} performance. Delta: ${formatHeadlineVal(delta, metricLbl)}. Source: statistical decomposition.`,
          data: l3Data,
          config: {
            xField: 'contribution',
            yField: 'name',
            yAxisTitle: metricLbl,
            zeroAxis: true,
            highlightCondition: { field: 'is_potential', operator: '===', value: true, color: '#059669' },
          },
          pyramid: {
            level: 3,
            focusEntity: focusDisplay,
            focusDimension: focusDim,
            filters: [{ dimension: focusDim, value: focusVal }],
            question: `How much can we recover by fixing ${focusDisplay}?`,
          },
        });
      }
    }
  }

  return charts;
}

// ─── Summary Chart Helpers ──────────────────────────────────────────

const MAX_SUMMARY_CHARTS = 6;

/** Fields that are structural (period/dimension/count), not chartable metrics. */
const METADATA_FIELDS = new Set([
  'month', 'period', 'date', 'orders', 'count', 'total',
  'responses', 'trips', 'returned', 'cancelled', 'transactions',
]);

/** Detect temporal field in a row sample → indicates time-series data. */
function detectPeriodField(sample: Record<string, unknown>): string | null {
  for (const key of ['month', 'period', 'date']) {
    if (sample[key] !== undefined) {
      const val = String(sample[key]);
      // Validate it looks like a date (YYYY-MM or YYYY-MM-DD)
      if (/^\d{4}-\d{2}/.test(val)) return key;
    }
  }
  return null;
}

/** Convert field_name to human-readable label: returns_cost → Returns Cost */
function humanizeFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Pct\b/, '%')
    .replace(/^Avg /, 'Average ');
}

/** Infer chart type from data shape: percentages → line, currency/counts → bars. */
function inferChartType(rows: Array<Record<string, unknown>>, field: string): string {
  const fieldLower = field.toLowerCase();
  const isPctLike = fieldLower.includes('pct') || fieldLower.includes('rate') || fieldLower.includes('percent');
  if (isPctLike) return 'line_comparison';

  // Check value magnitudes — large values suit bars better
  const values = rows.map(r => Number(r[field]) || 0).filter(v => v !== 0);
  if (values.length > 0) {
    const avg = values.reduce((s, v) => s + Math.abs(v), 0) / values.length;
    if (avg > 1000) return 'metric_bars';
  }
  return 'line_comparison';
}

/** Infer y-axis title from field characteristics. */
function inferYAxisTitle(rows: Array<Record<string, unknown>>, field: string, label: string): string {
  const fieldLower = field.toLowerCase();
  if (fieldLower.includes('pct') || fieldLower.includes('rate') || fieldLower.includes('percent')) return `${label} (%)`;

  const values = rows.map(r => Number(r[field]) || 0).filter(v => v !== 0);
  const avg = values.length > 0 ? values.reduce((s, v) => s + Math.abs(v), 0) / values.length : 0;
  const isCurrency = (fieldLower.includes('cost') || fieldLower.includes('revenue') || fieldLower.includes('fee')
    || fieldLower.includes('gmv') || fieldLower.includes('cm')) && avg > 1000;
  if (isCurrency) return `${label} (IDR)`;

  if (fieldLower.includes('days')) return `${label} (days)`;
  return label;
}

/** Normalize period value: YYYY-MM → YYYY-MM-01 for Vega-Lite temporal axis. */
function normalizePeriod(val: string): string {
  return val.length === 7 ? val + '-01' : val;
}

// ─── Summary Charts (Data-Shape Driven) ─────────────────────────────

/**
 * Build Layer 1 summary charts by introspecting time-series data in dbData.
 * Scans all *ByMonth arrays, detects numeric fields, and generates charts
 * for fields matching the specialist's resolvedMeasures.
 * No hardcoded metric knowledge — works for any specialist with any metrics.
 */
// ─── Funnel / Sankey Chart Builder (Generic) ──────────────────────────
// Builds a Sankey chart from ANY funnel pipeline definition.
// Takes a FunnelPipelineDefinition (stages + source table) and dbData,
// aggregates volumes, builds nodes/links, returns a ChartRecord.

// ── KPR Mortgage Pipeline (default for banking domain) ──

export const KPR_FUNNEL_PIPELINE: FunnelPipelineDefinition = {
  id: 'kpr-pipeline',
  name: 'KPR Mortgage Pipeline',
  sourceTable: 'v_kpr_weekly_funnel',
  timeField: 'week_number',
  dimensionField: 'channel',
  stages: [
    { id: 'leads',     name: 'Leads',             volumeField: 'total_leads',              order: 0 },
    { id: 'docs',      name: 'Docs Submitted',    volumeField: 'docs_submitted',           order: 1 },
    { id: 'credit',    name: 'Credit Decided',    volumeField: 'credit_decided',           order: 2 },
    { id: 'approved',  name: 'Approved',           volumeField: 'approved',                 order: 3 },
    { id: 'funded',    name: 'Funded',             volumeField: 'funded',                   order: 4 },
    { id: 'dropped',   name: 'Dropped',            volumeField: 'dropped',                  order: 0, isLeakage: true, parentStageId: 'leads' },
    { id: 'rework',    name: 'Rework',             volumeField: 'cases_with_rework',        order: 1, isLeakage: true, parentStageId: 'docs' },
    { id: 'rejected',  name: 'Rejected',           volumeField: '',                         order: 2, isLeakage: true, parentStageId: 'credit' },
    { id: 'cancelled', name: 'Cancelled',          volumeField: 'cancelled_post_approval',  order: 3, isLeakage: true, parentStageId: 'approved' },
  ],
};

// ── Generic Funnel Chart Builder ──

export function buildFunnelChartGeneric(
  dbData: Record<string, unknown>,
  pipeline: FunnelPipelineDefinition,
): ChartRecord | null {
  const rows = dbData[pipeline.sourceTable] as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  // Separate main flow stages from leakage nodes, sorted by order
  const mainStages = pipeline.stages
    .filter(s => !s.isLeakage)
    .sort((a, b) => a.order - b.order);
  const leakageStages = pipeline.stages.filter(s => s.isLeakage);

  if (mainStages.length < 2) return null;

  // Aggregate volumes from DB rows
  const volumes = new Map<string, number>();
  for (const stage of pipeline.stages) {
    if (!stage.volumeField) continue;
    const total = rows.reduce((sum, row) => sum + (Number(row[stage.volumeField]) || 0), 0);
    volumes.set(stage.id, total);
  }

  // First and last main stage must have data
  const firstVol = volumes.get(mainStages[0].id) || 0;
  const lastVol = volumes.get(mainStages[mainStages.length - 1].id) || 0;
  if (firstVol === 0) return null;

  // Need at least one downstream stage with data
  const hasDownstream = mainStages.slice(1).some(s => (volumes.get(s.id) || 0) > 0);
  if (!hasDownstream) return null;

  // Build Sankey nodes (main flow)
  const nodes: Array<{ id: string; name: string; value: number }> = [];
  for (const stage of mainStages) {
    const vol = volumes.get(stage.id) || 0;
    nodes.push({ id: stage.id, name: `${stage.name} (${vol.toLocaleString()})`, value: vol });
  }

  // Build links between consecutive main stages + leakage branches
  const links: Array<{ source: string; target: string; value: number }> = [];
  let biggestLeakage = { name: '', value: 0 };

  for (let i = 0; i < mainStages.length - 1; i++) {
    const from = mainStages[i];
    const to = mainStages[i + 1];
    const fromVol = volumes.get(from.id) || 0;
    const toVol = volumes.get(to.id) || 0;

    // Main flow link
    if (toVol > 0) {
      links.push({ source: from.id, target: to.id, value: toVol });
    }

    // Leakage nodes branching from this stage
    const leakages = leakageStages.filter(l => l.parentStageId === from.id);
    for (const leak of leakages) {
      let leakVol = volumes.get(leak.id) || 0;

      // If no volumeField (computed leakage): parent - next main stage
      if (!leak.volumeField && fromVol > toVol) {
        leakVol = fromVol - toVol;
      }

      if (leakVol > 0) {
        nodes.push({ id: leak.id, name: `${leak.name} (${leakVol.toLocaleString()})`, value: leakVol });
        links.push({ source: from.id, target: leak.id, value: leakVol });
        if (leakVol > biggestLeakage.value) {
          biggestLeakage = { name: leak.name, value: leakVol };
        }
      }
    }
  }

  if (links.length < 2) return null;

  const convRate = firstVol > 0 ? Math.round((lastVol / firstVol) * 1000) / 10 : 0;
  const firstName = mainStages[0].name.toLowerCase();
  const lastName = mainStages[mainStages.length - 1].name.toLowerCase();

  return {
    id: `funnel-${pipeline.id}`,
    layer: 'summary',
    chartType: 'funnel',
    title: `${pipeline.name}: ${firstVol.toLocaleString()} ${firstName} → ${lastVol.toLocaleString()} ${lastName} (${convRate}% conversion)`,
    subtitle: `End-to-end ${firstName}-to-${lastName} funnel`,
    footnote: `Pipeline conversion: ${convRate}%.${biggestLeakage.value > 0 ? ` Biggest leakage: ${biggestLeakage.name}.` : ''} Source: ${pipeline.sourceTable}.`,
    data: [{ nodes, links }],
    config: { xField: 'value', yField: 'name' },
  };
}

// ── Backward-compatible wrapper (delegates to generic) ──

export function buildFunnelChart(dbData: Record<string, unknown>): ChartRecord | null {
  return buildFunnelChartGeneric(dbData, KPR_FUNNEL_PIPELINE);
}

export function buildSummaryCharts(ctx: ChartBuildContext): ChartRecord[] {
  const charts: ChartRecord[] = [];
  const charted = new Set<string>();
  const { dbData, thresholds, anomalies, resolvedMeasures } = ctx;

  // Helper: scan dbData and build charts, optionally skipping relevance filter
  function scanAndBuild(skipRelevanceFilter: boolean): void {
    for (const [tableKey, value] of Object.entries(dbData)) {
      if (!Array.isArray(value) || value.length < 2) continue;
      const rows = value as Array<Record<string, unknown>>;
      const sample = rows[0];
      if (!sample || typeof sample !== 'object') continue;

      // Only process time-series arrays (must have a temporal field)
      const periodField = detectPeriodField(sample);
      if (!periodField) continue;

      // Discover numeric fields in this time-series
      for (const [field, val] of Object.entries(sample)) {
        if (typeof val !== 'number') continue;
        if (METADATA_FIELDS.has(field)) continue;
        if (charted.has(field)) continue;
        if (!skipRelevanceFilter && !isFieldRelevant(resolvedMeasures, field)) continue;
        if (charts.length >= MAX_SUMMARY_CHARTS) break;

        const label = humanizeFieldName(field);
        const chartType = inferChartType(rows, field);
        const yAxisTitle = inferYAxisTitle(rows, field, label);
        const it = insightTitle(rows, field, label, tableKey);

        charts.push({
          id: `summary-${field}-trend`,
          layer: 'summary',
          chartType,
          title: it.title,
          subtitle: it.subtitle,
          footnote: it.footnote,
          _aiEnhanceable: true, // Summary trend charts can benefit from AI headline polish
          data: rows.map((m, i, arr) => ({
            period: normalizePeriod(String(m[periodField])),
            value: m[field],
            is_anomaly: i === arr.length - 1 && hasAnomaly(anomalies, field),
          })),
          config: {
            xField: 'period',
            yField: 'value',
            yAxisTitle,
            timeUnit: 'yearmonth',
            thresholds: mapThresholds(thresholds, field.replace(/_/g, ' ')),
          },
        });
        charted.add(field);
      }
      if (charts.length >= MAX_SUMMARY_CHARTS) break;
    }
  }

  // Pass 1: strict relevance filter using resolvedMeasures
  scanAndBuild(false);

  // Pass 2 fallback: if no charts generated and resolvedMeasures was active,
  // retry without relevance filter to pick up any available time-series.
  // This prevents empty summary sections when metric names don't match DB columns.
  if (charts.length === 0 && resolvedMeasures && resolvedMeasures.length > 0) {
    console.warn(`[chartBuilder] No summary charts with resolvedMeasures filter [${resolvedMeasures.join(', ')}] — falling back to unfiltered scan`);
    scanAndBuild(true);
  }

  return charts;
}

// ─── Auto Key Metrics ───────────────────────────────────────────────

/**
 * Auto-generate key metrics (KPIs) from summary charts.
 * Each chart produces a KPI card with value, MoM change, and direction.
 */
export function buildAutoKeyMetrics(
  summaryCharts: ChartRecord[],
): Array<{ label: string; value: string; change: string; direction: string; comparator: string }> {
  return summaryCharts.map(chart => {
    const pts = chart.data as Array<Record<string, unknown>> | undefined;
    const yField = (chart.config as Record<string, unknown>)?.yField as string || 'value';
    const yTitle = (chart.config as Record<string, unknown>)?.yAxisTitle as string || '';
    if (!Array.isArray(pts) || pts.length < 2) return null;
    const last = Number(pts[pts.length - 1]?.[yField]);
    const prev = Number(pts[pts.length - 2]?.[yField]);
    if (isNaN(last)) return null;
    // Derive label from chart title (strip insight verb patterns) or yAxisTitle
    const label = ((chart.title as string) || yTitle)
      .replace(/\s+(Up|Down)\s+[\d.]+%\s+MoM$/i, '')                     // legacy: "X Up 12% MoM"
      .replace(/\s+(surged|climbed|grew|edged up|plunged|dropped|declined|dipped)\s+.+$/i, '')  // insight verbs
      .replace(/\s+held steady\s+.+$/i, '')                               // flat pattern
      .replace(/\s+(at|—)\s+.+$/i, '')                                    // fallback patterns
      .trim();
    // Format: detect percentage vs currency from yAxisTitle
    const isPct = yTitle.includes('%') || yTitle.includes('Rate') || yTitle.includes('CM');
    const value = isPct ? `${last.toFixed(1)}%` : `Rp ${Math.round(last).toLocaleString()}`;
    let change = '';
    let direction = 'stable';
    if (!isNaN(prev) && prev !== 0) {
      const pct = ((last - prev) / Math.abs(prev) * 100).toFixed(1);
      direction = Number(pct) > 0 ? 'up' : Number(pct) < 0 ? 'down' : 'stable';
      change = `${Number(pct) > 0 ? '+' : ''}${pct}% MoM`;
    }
    return { label, value, change, direction, comparator: '' };
  }).filter((m): m is NonNullable<typeof m> => m !== null);
}

// ─── AI-Powered Chart Headlines ──────────────────────────────────────

/**
 * Enhance chart titles + subtitles using Claude AI.
 * Sends all charts in a single batch call to Haiku for efficiency.
 * Falls back to existing template-based titles on failure.
 */
export async function enhanceChartHeadlines(
  charts: ChartRecord[],
  specialistName: string,
  guardrailStats?: { headlinesRejected: number },
): Promise<ChartRecord[]> {
  if (charts.length === 0) return charts;

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return charts; // graceful fallback

  // Build chart summaries for the prompt
  const chartSummaries = charts.map((c, i) => {
    const pts = c.data as Array<Record<string, unknown>> | undefined;
    const yField = (c.config as Record<string, unknown>)?.yField as string || 'value';
    const yTitle = (c.config as Record<string, unknown>)?.yAxisTitle as string || '';
    const nums = (pts || []).map(p => Number(p[yField])).filter(n => !isNaN(n));
    const last = nums[nums.length - 1] ?? 0;
    const prev = nums[nums.length - 2] ?? 0;
    const pctChange = prev !== 0 ? ((last - prev) / Math.abs(prev) * 100) : 0;

    return {
      index: i,
      layer: c.layer,
      currentTitle: c.title,
      metric: yTitle || c.title,
      dataPoints: nums.length,
      lastValue: last,
      prevValue: prev,
      pctChange: pctChange.toFixed(1),
      trend: nums.slice(-4).map(n => n.toFixed(1)),
    };
  });

  try {
    const { response: result } = await routedFetch(apiKey, {
      messages: [{
        role: "user",
        content: `You are a McKinsey-quality data visualization specialist. Generate insight-driven chart headlines for a "${specialistName}" specialist dashboard.

For each chart below, generate:
- "title": A finding-driven headline (NOT just the metric name). Include the delta %, a verb (surged/climbed/grew/edged up/dipped/declined/dropped/plunged), and if possible WHY or WHAT it means. Max 80 chars.
- "subtitle": One-line description of what the chart shows (metric + unit + period). Max 50 chars.

Charts:
${JSON.stringify(chartSummaries, null, 2)}

Return ONLY valid JSON array matching chart indices:
[{"index": 0, "title": "...", "subtitle": "..."}, ...]`
      }],
      maxTokens: 1024,
      stream: false,
      forceTier: "T1",
      callerFunction: "run-specialist/chartBuilder",
      callSiteId: "chart-headlines",
    });

    // deno-lint-ignore no-explicit-any
    const text = (result as any)?.choices?.[0]?.message?.content || '';
    console.log(`[chartBuilder] AI headlines response: ${text.slice(0, 200)}`);

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[chartBuilder] Could not parse JSON from AI response');
      return charts;
    }

    const headlines = JSON.parse(jsonMatch[0]) as Array<{ index: number; title: string; subtitle: string }>;

    // ── GUARDRAIL: Opt-in + CG-01 headline-data alignment ──
    // Rule 1: AI can ONLY enhance charts with `_aiEnhanceable: true`
    // Rule 2: Even for opted-in charts, validate numbers in AI headline
    //         match the chart data. Reject hallucinated numbers.
    let enhanced = 0;
    let skipped = 0;
    let rejected = 0;
    for (const h of headlines) {
      if (h.index >= 0 && h.index < charts.length && h.title) {
        const chart = charts[h.index];
        if (chart._aiEnhanceable !== true) {
          skipped++;
          continue;
        }
        // CG-01: Validate AI headline numbers against chart data
        const originalTitle = chart.title as string;
        const validation = validateHeadlineAlignment(h.title, originalTitle, chart);
        if (validation.valid) {
          chart.title = h.title;
          if (h.subtitle) chart.subtitle = h.subtitle;
          chart._guardrail = { ...(chart._guardrail as object || {}), headlineValidated: true, headlineRejected: false };
          enhanced++;
        } else {
          // Reject AI headline — keep original data-computed title
          console.warn(`[CG-01] AI headline rejected for chart "${chart.id}": ${validation.reason}`);
          console.warn(`[CG-01]   AI wanted: "${h.title}"`);
          console.warn(`[CG-01]   Keeping:   "${originalTitle}"`);
          chart._guardrail = { ...(chart._guardrail as object || {}), headlineValidated: true, headlineRejected: true };
          rejected++;
        }
      }
    }
    if (guardrailStats) guardrailStats.headlinesRejected = rejected;
    console.log(`[chartBuilder] AI headlines: ${enhanced} enhanced, ${rejected} rejected (CG-01), ${skipped} skipped (protected)`);


    return charts;
  } catch (err) {
    console.warn('[chartBuilder] AI headline enhancement failed:', err);
    return charts;
  }
}

/**
 * Generate an AI-powered convergence insight (max 2 sentences).
 * Summarizes cross-metric decomposition convergence into an actionable finding.
 */
export async function generateConvergenceInsight(
  convergence: Array<{ dimension: string; value: string; appearsInMetrics: string[]; contributionAvg: number }>,
  decomposition: DecompositionResult[],
  specialistName: string,
): Promise<string | null> {
  if (convergence.length === 0) return null;

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return null;

  // Build compact context for Haiku
  const convergenceData = convergence.slice(0, 5).map(c => ({
    segment: `${c.dimension}=${c.value}`,
    appearsIn: c.appearsInMetrics.length,
    metrics: c.appearsInMetrics.map(m => m.split(' by ')[0]).join(', '),
    avgContribution: c.contributionAvg,
  }));

  // Add decomposition context: top contributors with deltas
  const decompContext = decomposition.slice(0, 4).map(d => ({
    metric: d.metric,
    top: d.topContributors.slice(0, 2).map(c => ({
      segment: `${c.dimension}=${c.value}`,
      pct: c.contribution,
      delta: c.deltaPp != null ? `${c.deltaPp > 0 ? '+' : ''}${c.deltaPp}pp` : null,
    })),
  }));

  try {
    const { response: result } = await routedFetch(apiKey, {
      messages: [{
        role: "user",
        content: `You are a senior business analyst writing for a "${specialistName}" monitoring dashboard. Generate a KEY INSIGHT about cross-metric convergence.

Convergence data (segments appearing across multiple metrics):
${JSON.stringify(convergenceData, null, 2)}

Decomposition context:
${JSON.stringify(decompContext, null, 2)}

Write exactly 2 sentences:
1. The finding: which segment is the concentrated risk and WHY (mention specific metrics and %)
2. The implication: what this means for the business (actionable)

Rules:
- Be specific with numbers (e.g., "drives 47% of costs but only 14% of revenue")
- Use business language, not technical jargon
- Max 200 characters total
- Do NOT use markdown or formatting
- Return ONLY the 2 sentences, nothing else`
      }],
      maxTokens: 200,
      stream: false,
      forceTier: "T1",
      callerFunction: "run-specialist/chartBuilder",
      callSiteId: "convergence-insight",
    });

    // deno-lint-ignore no-explicit-any
    const text = ((result as any)?.choices?.[0]?.message?.content || '').trim();
    if (text.length > 10 && text.length < 500) return text;
    return null;
  } catch (err) {
    console.warn('[chartBuilder] Convergence insight generation failed:', err);
    return null;
  }
}

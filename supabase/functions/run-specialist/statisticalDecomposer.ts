// =============================================================================
// Statistical Decomposer — Dimension-level contribution analysis (no LLM)
//
// Purpose: "Where is the problem? Which segment, which stage?"
// Always decomposes numeric metrics by available dimensions — no anomaly required.
// =============================================================================

import type { DetectedAnomaly } from "./anomalyDetector.ts";
import { isFieldRelevant } from "./metricRelevance.ts";

// ─── Types ───────────────────────────────────────────────────────────

export interface DimensionContribution {
  dimension: string;
  value: string;
  contribution: number; // percentage 0-100
  metricValue: number;
  count: number;
  /** Weighted average metric value per segment (metricValue / count) — useful for rate metrics */
  avgMetricValue: number;
  /** Previous period contribution % (if period data available) */
  previousContribution?: number;
  /** Previous period metric value */
  previousMetricValue?: number;
  /** Previous period average metric value */
  previousAvgMetricValue?: number;
  /** Change in percentage points (current - previous) */
  deltaPp?: number;
}

export interface DecompositionResult {
  metric: string;
  totalDeviation: number;
  decompositionMethod: 'percentage-of-total';
  topContributors: DimensionContribution[];
  /** Period labels for comparison */
  periodLabels?: { current: string; previous: string };
}

// ─── Main Entry Point ────────────────────────────────────────────────

/**
 * Decompose metrics by dimensions. Works with OR without anomalies.
 *
 * Strategy:
 * 1. If anomalies exist → decompose those specific metrics (focused)
 * 2. If no anomalies → decompose ALL numeric metrics in the data (exploratory)
 *
 * When resolvedMeasures is provided, only metrics relevant to the specialist are decomposed.
 * Either way, the user gets "where is the problem?" answer.
 */
export function decomposeMetrics(
  dbData: Record<string, unknown>,
  dimensions?: string[],
  anomalies?: DetectedAnomaly[],
  resolvedMeasures?: string[],
): DecompositionResult[] {
  const dims = dimensions?.length ? dimensions : inferDimensions(dbData);
  console.log(`[decomposer] Using dimensions: [${dims.join(', ')}] (${dimensions?.length ? 'configured' : 'inferred'})`);
  if (!dims.length) return [];

  // If we have anomalies, decompose those specific metrics
  // (anomalies are already specialist-scoped via thresholds/rules, no filtering needed)
  if (anomalies && anomalies.length > 0) {
    const results = decomposeByAnomalies(anomalies, dbData, dims, resolvedMeasures);
    // Fallback: if anomaly decomposition returned nothing (e.g., metric didn't match any table column),
    // try the exploratory path so the specialist still gets decomposition output.
    if (results.length > 0) return results;
    console.warn(`[DECOMPOSER] decomposeByAnomalies returned 0 results for ${anomalies.length} anomalies — falling back to decomposeAllMetrics`);
  }

  // No anomalies (or anomaly decomposition empty) — decompose numeric metrics, filtered to specialist's resolved measures
  return decomposeAllMetrics(dbData, dims, resolvedMeasures);
}

/**
 * @deprecated Use decomposeMetrics() instead. Kept for backward compat.
 */
export function decomposeAnomalies(
  anomalies: DetectedAnomaly[],
  dbData: Record<string, unknown>,
  dimensions?: string[],
): DecompositionResult[] {
  return decomposeMetrics(dbData, dimensions, anomalies);
}

// ─── Anomaly-based decomposition ─────────────────────────────────────

function decomposeByAnomalies(
  anomalies: DetectedAnomaly[],
  dbData: Record<string, unknown>,
  dims: string[],
  resolvedMeasures?: string[],
): DecompositionResult[] {
  const results: DecompositionResult[] = [];
  const seenDecomps = new Set<string>(); // track "metric by dim" to avoid duplicates

  for (const anomaly of anomalies) {
    if (anomaly.deviationType === 'rule') continue;

    // Find ALL tables that contain the specialist's measures (not just the best one).
    // This enables multi-dimensional decomposition: kprByChannel gives "by channel",
    // kprByRegion gives "by region", kprByReviewStatus gives "by review_status", etc.
    const relevantTables = findAllRelevantTables(dbData, resolvedMeasures, dims);
    // Fallback to single best table if multi-table search found nothing
    if (relevantTables.length === 0) {
      const single = findRelevantTableData(dbData, anomaly.metric, resolvedMeasures, dims);
      if (single && single.length > 0) relevantTables.push(single as Array<Record<string, unknown>>);
    }
    if (relevantTables.length === 0) continue;

    for (const rows of relevantTables) {
      // Resolve the actual numeric field for this anomaly in this specific table
      let resolvedField: string | null = null;
      if (resolvedMeasures?.length) {
        const sampleRows = rows.slice(0, Math.min(50, rows.length));
        const availableMeasures = resolvedMeasures.filter(measure =>
          sampleRows.some(r => r[measure] != null)
        );
        if (availableMeasures.length > 0) {
          const stopWords = new Set(['time', 'to', 'rate', 'monitoring', 'specialist', 'the', 'of', 'and', 'a']);
          const anomalyKeywords = anomaly.metric.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '').split(/\s+/)
            .filter(w => w.length > 1 && !stopWords.has(w));
          let bestMeasure = availableMeasures[0];
          let bestScore = 0;
          for (const measure of availableMeasures) {
            const parts = measure.toLowerCase().split('_');
            const score = anomalyKeywords.filter(kw => parts.some(fp => fp.includes(kw) || kw.includes(fp))).length;
            if (score > bestScore) { bestScore = score; bestMeasure = measure; }
          }
          resolvedField = bestMeasure;
        }
      }
      if (!resolvedField) {
        const sampleRow: Record<string, unknown> = {};
        for (const r of rows.slice(0, Math.min(50, rows.length))) {
          for (const [k, v] of Object.entries(r)) {
            if (sampleRow[k] == null && v != null) sampleRow[k] = v;
          }
        }
        resolvedField = findNumericField(sampleRow, anomaly.metric);
      }
      const metricLabel = resolvedField || anomaly.metric;

      const tableDims = findTableDimensions(rows, dims);
      if (tableDims.length === 0) continue;

      for (const dim of tableDims) {
        const decompKey = `${metricLabel}::${dim}`;
        if (seenDecomps.has(decompKey)) continue; // skip duplicate metric×dim combos
        seenDecomps.add(decompKey);

        const { contributions, periodLabels } = computeContributionsWithComparison(
          rows,
          dim,
          metricLabel,
        );

        if (contributions.length > 0) {
          results.push({
            metric: `${metricLabel} by ${dim}`,
            totalDeviation: anomaly.deviation,
            decompositionMethod: 'percentage-of-total',
            topContributors: contributions.slice(0, 5),
            periodLabels,
          });
        }
      }
    }
  }

  return results;
}

// ─── Metric-discovery decomposition (no anomalies needed) ────────────

/**
 * Discover numeric metrics in the data and decompose each by dimensions.
 * Prioritizes: "byX" summary tables > fact tables.
 * When resolvedMeasures is provided, only decompose metrics relevant to the specialist.
 * Caps at 8 decompositions to keep output manageable.
 */
function decomposeAllMetrics(
  dbData: Record<string, unknown>,
  dims: string[],
  resolvedMeasures?: string[],
): DecompositionResult[] {
  const results: DecompositionResult[] = [];
  const decomposedMetrics = new Set<string>();

  // Pass 1: "byX" summary tables (e.g., revenueByRoute, otpByClient)
  for (const [key, value] of Object.entries(dbData)) {
    if (!Array.isArray(value) || value.length < 2) continue;
    const rows = value as Array<Record<string, unknown>>;
    const sample = rows[0];
    if (!sample || typeof sample !== 'object') continue;

    // Find numeric fields in this table (including text columns with parseable numbers)
    const numericFields = Object.entries(sample)
      .filter(([, v]) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))))
      .map(([k]) => k)
      .filter((k) => !isIdOrDateField(k));

    // Find dimension fields (string with low cardinality)
    const tableDims = findTableDimensions(rows, dims);
    if (tableDims.length === 0) continue;

    for (const numField of numericFields) {
      if (decomposedMetrics.has(numField)) continue;
      if (results.length >= 8) break;
      // Filter: only decompose metrics relevant to this specialist
      if (!isFieldRelevant(resolvedMeasures, numField)) continue;

      for (const dim of tableDims) {
        if (results.length >= 8) break;
        const { contributions, periodLabels } = computeContributionsWithComparison(rows, dim, numField);

        if (contributions.length >= 2) {
          decomposedMetrics.add(numField);
          results.push({
            metric: `${numField} by ${dim}`,
            totalDeviation: 0, // no anomaly baseline
            decompositionMethod: 'percentage-of-total',
            topContributors: contributions.slice(0, 5),
            periodLabels,
          });
        }
      }
    }
  }

  // Pass 2: fact tables (if we haven't found enough)
  if (results.length < 2) {
    for (const [key, value] of Object.entries(dbData)) {
      if (!Array.isArray(value) || value.length < 3) continue;
      if (!key.startsWith('fact_') && !key.includes('orders') && !key.includes('transactions')) continue;

      const rows = value as Array<Record<string, unknown>>;
      const sample = rows[0];
      if (!sample || typeof sample !== 'object') continue;

      const numericFields = Object.entries(sample)
        .filter(([, v]) => typeof v === 'number')
        .map(([k]) => k)
        .filter((k) => !isIdOrDateField(k) && !decomposedMetrics.has(k));

      const tableDims = findTableDimensions(rows, dims);
      if (tableDims.length === 0) continue;

      for (const numField of numericFields.slice(0, 3)) {
        if (results.length >= 8) break;
        // Filter: only decompose metrics relevant to this specialist
        if (!isFieldRelevant(resolvedMeasures, numField)) continue;

        for (const dim of tableDims) {
          if (results.length >= 8) break;
          const { contributions, periodLabels } = computeContributionsWithComparison(rows, dim, numField);

          if (contributions.length >= 2) {
            decomposedMetrics.add(numField);
            results.push({
              metric: `${numField} by ${dim}`,
              totalDeviation: 0,
              decompositionMethod: 'percentage-of-total',
              topContributors: contributions.slice(0, 5),
              periodLabels,
            });
          }
        }
      }
    }
  }

  return results;
}

// ─── Auto-detect dimensions ──────────────────────────────────────────

/**
 * Infer categorical dimension columns from the data.
 * Looks for string columns with 2-20 unique values across all tables.
 * Excludes known non-dimension fields (ids, dates, descriptions).
 */
function inferDimensions(dbData: Record<string, unknown>): string[] {
  const candidates = new Map<string, number>(); // column → distinct count

  for (const [, value] of Object.entries(dbData)) {
    if (!Array.isArray(value) || value.length < 3) continue;
    const rows = value as Array<Record<string, unknown>>;
    const sample = rows[0];
    if (!sample || typeof sample !== 'object') continue;

    for (const [col, val] of Object.entries(sample)) {
      if (isIdOrDateField(col)) continue;
      if (candidates.has(col)) continue; // already evaluated
      // Accept strings and booleans as potential dimensions
      if (typeof val !== 'string' && typeof val !== 'boolean') continue;

      const uniques = new Set(rows.map((r) => String(r[col])).filter((v) => v !== 'undefined' && v !== 'null'));
      if (uniques.size >= 2 && uniques.size <= 20) {
        candidates.set(col, uniques.size);
      }
    }
  }

  // Sort by cardinality (lower = more useful for decomposition), take top 3
  return [...candidates.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([col]) => col);
}

/** Check if a column name is an ID, date, or temporal field (not useful as dimension) */
function isIdOrDateField(col: string): boolean {
  return /^(id|_id|uuid|created|updated|date|time|timestamp|description|notes|comment|email|phone|address|url|name$)/i.test(col)
    || isTemporalField(col);
}

/** Temporal/period columns that should never be used as decomposition dimensions */
function isTemporalField(col: string): boolean {
  return /^(week|month|quarter|year|day|period|yearmonth|year_month|order_month|invoice_month|week_number|week_of_year|day_of_week|day_of_month|month_number|month_name|quarter_number|fiscal_year|fiscal_quarter|calendar_week|reporting_period|report_month|report_week)$/i.test(col)
    || /_(?:week|month|quarter|year|period|date)$/i.test(col);
}

/** Find which dimension columns exist in a specific table's rows */
function findTableDimensions(
  rows: Array<Record<string, unknown>>,
  globalDims: string[],
): string[] {
  const sample = rows[0];
  if (!sample) return [];

  // First: use globally inferred dims that exist in this table
  const matching = globalDims.filter((d) => sample[d] !== undefined);
  if (matching.length > 0) return matching;

  // Fallback: find string/boolean columns with low cardinality in this table
  const localDims: string[] = [];
  for (const [col, val] of Object.entries(sample)) {
    if (isIdOrDateField(col)) continue;
    if (typeof val !== 'string' && typeof val !== 'boolean') continue;
    const uniques = new Set(rows.map((r) => String(r[col])).filter((v) => v !== 'undefined' && v !== 'null'));
    if (uniques.size >= 2 && uniques.size <= 20) {
      localDims.push(col);
    }
  }
  return localDims.slice(0, 3);
}

// ─── Period Detection & Comparison ───────────────────────────────────

/** Known period column names in order of preference */
const PERIOD_COLUMNS = ['order_month', 'month', 'period', 'yearmonth', 'invoice_month'];

/** Detect the period column in a table's rows. Returns null if no period field found. */
function detectPeriodField(rows: Array<Record<string, unknown>>): string | null {
  if (rows.length === 0) return null;
  const sample = rows[0];
  // Check known period columns
  for (const col of PERIOD_COLUMNS) {
    if (sample[col] !== undefined && typeof sample[col] === 'string') {
      const uniques = new Set(rows.map(r => String(r[col])));
      if (uniques.size >= 2 && uniques.size <= 24) return col; // at least 2 periods
    }
  }
  return null;
}

/** Split rows into current (latest) and previous period. Returns {current, previous, labels}. */
function splitByPeriod(
  rows: Array<Record<string, unknown>>,
  periodField: string,
): { current: Array<Record<string, unknown>>; previous: Array<Record<string, unknown>>; labels: { current: string; previous: string } } | null {
  const periods = [...new Set(rows.map(r => String(r[periodField])))].sort();
  if (periods.length < 2) return null;

  const currentPeriod = periods[periods.length - 1];
  const previousPeriod = periods[periods.length - 2];

  return {
    current: rows.filter(r => String(r[periodField]) === currentPeriod),
    previous: rows.filter(r => String(r[periodField]) === previousPeriod),
    labels: { current: currentPeriod, previous: previousPeriod },
  };
}

/**
 * Compute contributions WITH previous period comparison.
 * Returns DimensionContribution[] with previousContribution and deltaPp filled in.
 */
function computeContributionsWithComparison(
  rows: Array<Record<string, unknown>>,
  dimension: string,
  metricName: string,
): { contributions: DimensionContribution[]; periodLabels?: { current: string; previous: string } } {
  const periodField = detectPeriodField(rows);
  if (!periodField) {
    // No period field — return current-only contributions
    return { contributions: computeContributions(rows, dimension, metricName) };
  }

  const split = splitByPeriod(rows, periodField);
  if (!split || split.current.length === 0) {
    return { contributions: computeContributions(rows, dimension, metricName) };
  }

  // Compute contributions for both periods
  const currentContribs = computeContributions(split.current, dimension, metricName);
  const previousContribs = computeContributions(split.previous, dimension, metricName);

  // Merge: attach previous period data to current contributions
  const prevMap = new Map(previousContribs.map(c => [c.value, c]));
  for (const curr of currentContribs) {
    const prev = prevMap.get(curr.value);
    if (prev) {
      curr.previousContribution = prev.contribution;
      curr.previousMetricValue = prev.metricValue;
      curr.previousAvgMetricValue = prev.avgMetricValue;
      curr.deltaPp = Math.round((curr.contribution - prev.contribution) * 10) / 10;
    } else {
      // New segment (didn't exist in previous period)
      curr.previousContribution = 0;
      curr.previousMetricValue = 0;
      curr.previousAvgMetricValue = 0;
      curr.deltaPp = Math.round(curr.contribution * 10) / 10;
    }
  }

  return { contributions: currentContribs, periodLabels: split.labels };
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Find ALL tables in dbData that contain at least one resolvedMeasure AND at least one
 * configured dimension. Returns multiple tables so the decomposer can produce one
 * decomposition per table×dimension combination.
 *
 * Example: K92 with dims=["review_status","region","channel","product_type"]
 *   → kprByChannel (has review_return_rate + channel)
 *   → kprByRegion (has review_return_rate + region)
 *   → kprByReviewStatus (has review_return_rate + review_status)
 */
function findAllRelevantTables(
  dbData: Record<string, unknown>,
  resolvedMeasures?: string[],
  configuredDims?: string[],
): Array<Array<Record<string, unknown>>> {
  if (!resolvedMeasures?.length) return [];

  const tables: Array<{ rows: Array<Record<string, unknown>>; score: number }> = [];

  for (const [, value] of Object.entries(dbData)) {
    if (!Array.isArray(value) || value.length < 2) continue;
    const rows = value as Array<Record<string, unknown>>;
    const sampleRows = rows.slice(0, Math.min(50, rows.length));

    // Check if table has at least one resolvedMeasure
    let measureHits = 0;
    for (const measure of resolvedMeasures) {
      if (sampleRows.some(r => r[measure] != null)) measureHits++;
    }
    if (measureHits === 0) continue;

    const sample = rows[0];
    if (!sample || typeof sample !== 'object') continue;

    // Check if table has at least one configured dimension
    const dimHits = configuredDims?.length
      ? configuredDims.filter(d => sample[d] !== undefined).length
      : 0;

    // Also check for any generic dimension (fallback)
    const hasAnyDim = dimHits > 0 || Object.entries(sample).some(([k, v]) => {
      if (typeof v !== 'string' || isIdOrDateField(k)) return false;
      const uniques = new Set(rows.slice(0, 200).map(r => (r as Record<string, unknown>)[k]));
      return uniques.size >= 2 && uniques.size <= 20;
    });
    if (!hasAnyDim) continue;

    tables.push({ rows, score: measureHits + dimHits * 2 });
  }

  // Sort by score descending, cap at 6 tables to keep output manageable
  return tables
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(t => t.rows);
}

function findRelevantTableData(
  dbData: Record<string, unknown>,
  metricName: string,
  resolvedMeasures?: string[],
  configuredDims?: string[],
): unknown[] | null {
  const metricLower = metricName.toLowerCase();

  // Pass 0: Prefer tables that contain resolvedMeasures as actual columns.
  // This ensures aggregate tables (kpr_weekly_metrics, etc.) are preferred over
  // transactional tables (kpr_applications) when the specialist's metrics live there.
  if (resolvedMeasures && resolvedMeasures.length > 0) {
    let bestMatch: { table: unknown[]; score: number } | null = null;
    for (const [, value] of Object.entries(dbData)) {
      if (!Array.isArray(value) || value.length < 2) continue;
      const rows = value as Array<Record<string, unknown>>;
      // Sample multiple rows to handle nulls
      const sampleRows = rows.slice(0, Math.min(50, rows.length));
      let matchCount = 0;
      for (const measure of resolvedMeasures) {
        if (sampleRows.some(r => r[measure] != null)) matchCount++;
      }
      if (matchCount === 0) continue;

      // Check dimension compatibility
      const sample = rows[0];
      if (!sample || typeof sample !== 'object') continue;

      // Count how many of the specialist's configured dims exist in this table
      const configuredDimCount = configuredDims?.length
        ? configuredDims.filter(d => sample[d] !== undefined).length
        : 0;

      // Fallback: check for any generic dimension column
      const hasAnyDimension = configuredDimCount > 0 || Object.entries(sample).some(([k, v]) => {
        if (typeof v !== 'string' || isIdOrDateField(k)) return false;
        const uniques = new Set(rows.slice(0, 200).map(r => (r as Record<string, unknown>)[k]));
        return uniques.size >= 2 && uniques.size <= 20;
      });
      if (!hasAnyDimension) continue;

      // Score: measure matches + dimension bonus
      // Each matching configured dim is worth 2 measure matches —
      // ensures tables with the specialist's dims are preferred over tables with just measures
      const dimBonus = configuredDimCount * 2;
      const totalScore = matchCount + dimBonus;

      if (!bestMatch || totalScore > bestMatch.score) {
        bestMatch = { table: rows, score: totalScore };
      }
    }
    if (bestMatch) return bestMatch.table;
  }

  // Pass 1: Tables with "byX" naming (e.g., revenueByRoute, otpByClient)
  for (const [key, value] of Object.entries(dbData)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    const keyLower = key.toLowerCase();
    if (keyLower.includes('byroute') || keyLower.includes('byclient') ||
        keyLower.includes('bydriver') || keyLower.includes('bychannel')) {
      const sample = value[0] as Record<string, unknown>;
      for (const fieldKey of Object.keys(sample)) {
        if (metricLower.includes(fieldKey.toLowerCase()) ||
            fieldKey.toLowerCase().includes(metricLower.replace(/percent|pct|score/i, ''))) {
          return value;
        }
      }
    }
  }

  // Pass 2: Known fact/flat tables
  for (const [key, value] of Object.entries(dbData)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    if (key.startsWith('fact_') || key.startsWith('logistiq_orders')) {
      return value;
    }
  }

  // Pass 3: Generic — find the best table with a numeric column and a dimension column.
  // When resolvedMeasures are available, prefer tables containing those columns
  // (even if smaller) over blindly picking the largest table.
  let bestTable: unknown[] | null = null;
  let bestScore = 0; // composite: measureHits * 1000 + rowCount (measures trump size)
  for (const [, value] of Object.entries(dbData)) {
    if (!Array.isArray(value) || value.length < 3) continue;
    const rows = value as Array<Record<string, unknown>>;
    const sample = rows[0];
    if (!sample || typeof sample !== 'object') continue;

    const hasNumeric = Object.entries(sample).some(
      ([k, v]) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)))) && !isIdOrDateField(k)
    );
    const hasDimension = Object.entries(sample).some(([k, v]) => {
      if (typeof v !== 'string' || isIdOrDateField(k)) return false;
      const uniques = new Set(rows.slice(0, 200).map(r => (r as Record<string, unknown>)[k]));
      return uniques.size >= 2 && uniques.size <= 20;
    });

    if (!hasNumeric || !hasDimension) continue;

    // Score: measure relevance + dimension relevance + row count (tiebreaker)
    let measureHits = 0;
    if (resolvedMeasures?.length) {
      const sampleRows = rows.slice(0, Math.min(50, rows.length));
      for (const measure of resolvedMeasures) {
        if (sampleRows.some(r => (r as Record<string, unknown>)[measure] != null)) measureHits++;
      }
    }
    const dimHits = configuredDims?.length
      ? configuredDims.filter(d => sample[d] !== undefined).length
      : 0;
    const score = measureHits * 10000 + dimHits * 5000 + rows.length;
    if (score > bestScore) {
      bestTable = rows;
      bestScore = score;
    }
  }

  return bestTable;
}

function computeContributions(
  rows: Array<Record<string, unknown>>,
  dimension: string,
  metricName: string,
): DimensionContribution[] {
  const groups = new Map<string, { count: number; total: number }>();

  const numericField = findNumericField(rows[0], metricName);
  if (!numericField) {
    // Fall back to count-based contribution
    for (const row of rows) {
      const rawDim = row[dimension];
      const dimValue = rawDim === undefined || rawDim === null ? 'Unknown' : String(rawDim);
      const entry = groups.get(dimValue) || { count: 0, total: 0 };
      entry.count++;
      entry.total++;
      groups.set(dimValue, entry);
    }
  } else {
    for (const row of rows) {
      const rawDim = row[dimension];
      const dimValue = rawDim === undefined || rawDim === null ? 'Unknown' : String(rawDim);
      const entry = groups.get(dimValue) || { count: 0, total: 0 };
      entry.count++;
      entry.total += Number(row[numericField]) || 0;
      groups.set(dimValue, entry);
    }
  }

  const grandTotal = Array.from(groups.values()).reduce((s, g) => s + g.total, 0);
  if (grandTotal === 0) return [];

  return Array.from(groups.entries())
    .map(([value, g]) => ({
      dimension,
      value,
      contribution: Math.round((g.total / grandTotal) * 1000) / 10,
      metricValue: Math.round(g.total * 100) / 100,
      avgMetricValue: g.count > 0 ? Math.round((g.total / g.count) * 100) / 100 : 0,
      count: g.count,
    }))
    .sort((a, b) => b.contribution - a.contribution);
}

// ─── Pyramid Decomposition — Filtered decomposition for drill-down ────

/**
 * Decompose a metric by a target dimension AFTER applying WHERE-style filters.
 * Used by the Pyramid Decomposition Protocol to drill down into a focus entity.
 *
 * Example: decomposeFiltered(dbData, [{dimension:'channel', value:'Digital'}], 'speed_bucket', 'k14')
 *   → Decomposes k14 by speed_bucket WHERE channel='Digital'
 *
 * Returns null if fewer than 2 segments remain after filtering (data too sparse).
 */
export function decomposeFiltered(
  dbData: Record<string, unknown>,
  filters: Array<{ dimension: string; value: string }>,
  targetDimension: string,
  metric: string,
): DecompositionResult | null {
  // Find all tables that contain both the metric and the target dimension
  for (const [, value] of Object.entries(dbData)) {
    if (!Array.isArray(value) || value.length < 3) continue;
    const rows = value as Array<Record<string, unknown>>;
    const sample = rows[0];
    if (!sample || typeof sample !== 'object') continue;

    // Check that table has the target dimension column
    if (sample[targetDimension] === undefined) continue;

    // Check that table has numeric field matching the metric
    const numericField = findNumericField(sample, metric);
    if (!numericField) continue;

    // Check that ALL filter dimensions exist in this table
    const allFiltersPresent = filters.every(f => sample[f.dimension] !== undefined);
    if (!allFiltersPresent) continue;

    // Apply filters: keep only rows where ALL conditions match
    const filteredRows = rows.filter(row =>
      filters.every(f => String(row[f.dimension]) === f.value),
    );

    if (filteredRows.length < 2) continue;

    // Compute contributions on filtered subset
    const { contributions, periodLabels } = computeContributionsWithComparison(
      filteredRows,
      targetDimension,
      metric,
    );

    if (contributions.length < 2) continue;

    const filterDesc = filters.map(f => `${f.dimension}=${f.value}`).join(' & ');
    return {
      metric: `${metric} by ${targetDimension} (where ${filterDesc})`,
      totalDeviation: 0,
      decompositionMethod: 'percentage-of-total',
      topContributors: contributions.slice(0, 5),
      periodLabels,
    };
  }

  // Fallback: try findRelevantTableData for the metric
  const tableData = findRelevantTableData(dbData, metric);
  if (!tableData || tableData.length < 3) return null;

  const rows = tableData as Array<Record<string, unknown>>;
  const sample = rows[0] as Record<string, unknown>;

  // Verify target dimension exists
  if (sample[targetDimension] === undefined) return null;

  // Verify all filter dimensions exist
  const allFiltersPresent = filters.every(f => sample[f.dimension] !== undefined);
  if (!allFiltersPresent) return null;

  const filteredRows = rows.filter(row =>
    filters.every(f => String(row[f.dimension]) === f.value),
  );

  if (filteredRows.length < 2) return null;

  const { contributions, periodLabels } = computeContributionsWithComparison(
    filteredRows,
    targetDimension,
    metric,
  );

  if (contributions.length < 2) return null;

  const filterDesc = filters.map(f => `${f.dimension}=${f.value}`).join(' & ');
  return {
    metric: `${metric} by ${targetDimension} (where ${filterDesc})`,
    totalDeviation: 0,
    decompositionMethod: 'percentage-of-total',
    topContributors: contributions.slice(0, 5),
    periodLabels,
  };
}

function findNumericField(
  sampleRow: Record<string, unknown>,
  metricName: string,
): string | null {
  const metricLower = metricName.toLowerCase();
  // Include both native numbers and text fields that look numeric (e.g., "5.3", "12")
  const numericFields = Object.entries(sampleRow)
    .filter(([, v]) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))))
    .map(([k]) => k);

  // Exact match: field name IS the metric name
  const exact = numericFields.find(f => f.toLowerCase() === metricLower);
  if (exact) return exact;

  // Try partial match
  const match = numericFields.find(f =>
    metricLower.includes(f.toLowerCase()) ||
    f.toLowerCase().includes(metricLower.replace(/percent|pct|score|by\w+/gi, '').trim())
  );
  if (match) return match;

  // Known mappings
  const knownMaps: Record<string, string[]> = {
    otp: ['is_on_time', 'otpPercent', 'otp_percent'],
    revenue: ['gross_value_amount', 'logistiq_revenue', 'total_revenue', 'revenue'],
    delay: ['delay_minutes', 'avgDelay', 'avg_delay'],
    nps: ['nps', 'npsScore', 'nps_score'],
    margin: ['contribution_margin', 'contribution_margin_pct', 'cm'],
    aov: ['average_order_value', 'aov', 'avg_order_value'],
    gmv: ['gross_value_amount', 'gmv', 'total_gmv'],
    returns_cost: ['returns_cost', 'logistiqTotalReturnsCost'],
    return_rate: ['logistiqReturnRate', 'return_rate'],
    shipping: ['shipping_cost', 'logistiqTotalShippingCost'],
  };

  for (const [keyword, fields] of Object.entries(knownMaps)) {
    if (metricLower.includes(keyword)) {
      const found = fields.find(f => numericFields.includes(f));
      if (found) return found;
    }
  }

  // Keyword extraction: split metric name into meaningful words and find columns
  // that share keywords (e.g., "Time to Credit Decision (K22)" → matches "credit_decision_days")
  const stopWords = new Set(['time', 'to', 'rate', 'monitoring', 'specialist', 'the', 'of', 'and', 'a', 'an', 'in', 'for', 'by', 'avg', 'average', 'total', 'pct', 'percent']);
  const metricKeywords = metricLower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
  if (metricKeywords.length > 0) {
    let bestField: string | null = null;
    let bestScore = 0;
    for (const field of numericFields) {
      if (isIdOrDateField(field)) continue;
      const fieldParts = field.toLowerCase().split('_');
      const score = metricKeywords.filter(kw => fieldParts.some(fp => fp.includes(kw) || kw.includes(fp))).length;
      if (score > bestScore) { bestScore = score; bestField = field; }
    }
    // Adaptive threshold: require ≥2 keyword matches for multi-keyword metrics,
    // but accept ≥1 for short metrics (e.g., "NPS", "AOV", "margin") to avoid
    // falling through to the blind numericFields[0] fallback.
    const minScore = metricKeywords.length <= 2 ? 1 : 2;
    if (bestField && bestScore >= minScore) return bestField;
  }

  return numericFields[0] || null;
}

// =============================================================================
// CHART GUARDRAILS — Data accuracy validation for all chart outputs
// Runs AFTER chart generation, BEFORE storage. Catches wrong numbers,
// AI hallucinations, flow conservation violations, and cross-chart mismatches.
//
// Design principle: NEVER block output. Fix or flag, always render something.
// =============================================================================

type ChartRecord = Record<string, unknown>;

// ─── Guardrail Result Types ─────────────────────────────────────────

export interface GuardrailWarning {
  code: string;       // "DG-03-MATH", "CG-01-HEADLINE", etc.
  chartId: string;
  message: string;
  claimed?: unknown;
  actual?: unknown;
  autoFixed: boolean;
}

export interface GuardrailSummary {
  totalCharts: number;
  // Phase 1
  arithmeticFixed: number;
  headlinesRejected: number;
  flowWarnings: number;
  crossChartWarnings: number;
  // Phase 2
  nullWarnings: number;
  timeSeriesWarnings: number;
  chartTypeWarnings: number;
  scaleWarnings: number;
  // DG-01 pre-chart
  dataQuality?: { validTables: number; emptyTables: number; typeWarnings: number };
  // Aggregate
  warnings: GuardrailWarning[];
  score: number;       // 100 - penalties
}

// ─── Number Extraction ──────────────────────────────────────────────

/** Extract all numbers from a string (percentages, integers, decimals) */
function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+\.?\d*/g);
  if (!matches) return [];
  return matches.map(Number).filter(n => !isNaN(n) && isFinite(n));
}

// ─── DG-03: Arithmetic Verification ─────────────────────────────────
// Recompute key numbers in chart titles from actual data.
// If mismatch > tolerance → fix the title, log warning.

export function validateChartArithmetic(
  chart: ChartRecord,
  warnings: GuardrailWarning[],
): void {
  const chartId = (chart.id as string) || 'unknown';
  const title = chart.title as string;
  const chartType = chart.chartType as string;
  if (!title) return;

  // ── Funnel charts: verify conversion rate
  if (chartType === 'funnel' && Array.isArray(chart.data)) {
    const sankeyData = chart.data[0] as Record<string, unknown> | undefined;
    const nodes = sankeyData?.nodes as Array<{ id: string; value: number }> | undefined;
    if (nodes && nodes.length >= 2) {
      // First and last main-flow nodes (non-leakage)
      const firstNode = nodes[0];
      const lastMainNode = nodes.filter(n =>
        !['dropped', 'rejected', 'cancelled', 'rework', 'abandoned', 'lost'].some(kw => n.id.toLowerCase().includes(kw))
      ).pop();

      if (firstNode && lastMainNode && firstNode.value > 0) {
        const actualRate = Math.round((lastMainNode.value / firstNode.value) * 1000) / 10;
        const titleNumbers = extractNumbers(title);
        // Find the percentage in the title that looks like a conversion rate (0-100 range)
        const claimedRate = titleNumbers.find(n => n > 0 && n <= 100 && title.includes(`${n}%`));

        if (claimedRate !== undefined && Math.abs(claimedRate - actualRate) > 1) {
          warnings.push({
            code: 'DG-03-MATH',
            chartId,
            message: `Funnel conversion rate mismatch: title says ${claimedRate}%, data shows ${actualRate}%`,
            claimed: claimedRate,
            actual: actualRate,
            autoFixed: true,
          });
          chart.title = title.replace(`${claimedRate}%`, `${actualRate}%`);
          chart._guardrail = { ...(chart._guardrail as object || {}), arithmeticFixed: true };
        }
      }
    }
  }

  // ── Decomposition charts: verify top contributor percentage
  if (chart.layer === 'decomposition' && chart.alertTag) {
    const data = chart.data as Array<Record<string, unknown>> | undefined;
    if (data && data.length > 0) {
      const yField = ((chart.config as Record<string, unknown>)?.yField as string) || 'value';
      const values = data.map(d => Number(d[yField]) || 0).filter(v => v > 0);
      if (values.length > 0) {
        const total = values.reduce((a, b) => a + b, 0);
        const topPct = total > 0 ? Math.round((Math.max(...values) / total) * 1000) / 10 : 0;

        // Check if title contains a percentage that doesn't match
        const titleNumbers = extractNumbers(title);
        const claimedPct = titleNumbers.find(n => n > 0 && n <= 100 && title.includes(`${n}%`));
        if (claimedPct !== undefined && Math.abs(claimedPct - topPct) > 5) {
          warnings.push({
            code: 'DG-03-MATH',
            chartId,
            message: `Decomposition percentage mismatch: title says ${claimedPct}%, data shows top at ${topPct}%`,
            claimed: claimedPct,
            actual: topPct,
            autoFixed: false, // Don't auto-fix decomposition titles — too complex
          });
        }
      }
    }
  }

  // Mark as checked
  chart._guardrail = { ...(chart._guardrail as object || {}), arithmeticChecked: true };
}

// ─── CG-01: Headline-Data Alignment ─────────────────────────────────
// Validates that AI-generated headlines only contain numbers that exist
// in or are derivable from the chart data. Returns false if headline
// should be rejected.

export function validateHeadlineAlignment(
  aiTitle: string,
  originalTitle: string,
  chart: ChartRecord,
): { valid: boolean; reason?: string } {
  const data = chart.data as Array<Record<string, unknown>> | undefined;
  if (!data || data.length === 0) return { valid: true }; // Can't validate without data

  // Build set of valid numbers from chart data
  const validNumbers = new Set<number>();
  const yField = ((chart.config as Record<string, unknown>)?.yField as string) || 'value';

  const rawValues: number[] = [];
  for (const row of data) {
    const val = Number(row[yField]);
    if (!isNaN(val) && isFinite(val)) {
      rawValues.push(val);
      // Add raw value + common roundings
      validNumbers.add(Math.round(val * 10) / 10);
      validNumbers.add(Math.round(val));
      validNumbers.add(Math.round(val * 100) / 100);
    }
  }

  // Add derived values: deltas, percentages, min/max/mean/count
  if (rawValues.length >= 2) {
    for (let i = 1; i < rawValues.length; i++) {
      const delta = rawValues[i] - rawValues[i - 1];
      const pctChange = rawValues[i - 1] !== 0
        ? Math.abs((rawValues[i] - rawValues[i - 1]) / rawValues[i - 1] * 100)
        : 0;
      validNumbers.add(Math.round(Math.abs(delta) * 10) / 10);
      validNumbers.add(Math.round(pctChange * 10) / 10);
      validNumbers.add(Math.round(pctChange));
    }
  }

  validNumbers.add(rawValues.length); // count
  if (rawValues.length > 0) {
    validNumbers.add(Math.round(Math.min(...rawValues) * 10) / 10);
    validNumbers.add(Math.round(Math.max(...rawValues) * 10) / 10);
    const mean = rawValues.reduce((a, b) => a + b, 0) / rawValues.length;
    validNumbers.add(Math.round(mean * 10) / 10);
    validNumbers.add(Math.round(mean));
  }

  // Extract numbers from AI headline
  const headlineNumbers = extractNumbers(aiTitle);
  if (headlineNumbers.length === 0) return { valid: true }; // No numbers to validate

  // Check each number in the headline
  for (const num of headlineNumbers) {
    // Skip very small numbers (likely formatting artifacts like "0.1")
    if (num === 0) continue;

    // Check if this number is close to any valid number (±1 tolerance)
    const isValid = [...validNumbers].some(v => Math.abs(v - num) <= 1);

    if (!isValid) {
      return {
        valid: false,
        reason: `Number ${num} in AI headline not found in chart data (valid: ${[...validNumbers].slice(0, 10).join(', ')}...)`,
      };
    }
  }

  return { valid: true };
}

// ─── DG-06: Flow Data Conservation (Sankey) ─────────────────────────
// Validates that Sankey nodes have consistent inflow/outflow volumes.

export function validateSankeyFlow(
  chart: ChartRecord,
  warnings: GuardrailWarning[],
): void {
  const chartId = (chart.id as string) || 'unknown';
  if ((chart.chartType as string) !== 'funnel') return;

  const sankeyData = (chart.data as Array<Record<string, unknown>> | undefined)?.[0];
  if (!sankeyData) return;

  const nodes = sankeyData.nodes as Array<{ id: string; name: string; value: number }> | undefined;
  const links = sankeyData.links as Array<{ source: string; target: string; value: number }> | undefined;
  if (!nodes || !links) return;

  const nodeIds = new Set(nodes.map(n => n.id));

  // Check: no negative flow values
  for (const link of links) {
    if (link.value < 0) {
      warnings.push({
        code: 'DG-06-FLOW',
        chartId,
        message: `Negative flow value: ${link.source} → ${link.target} = ${link.value}`,
        autoFixed: false,
      });
    }
  }

  // Check: no self-links
  for (const link of links) {
    if (link.source === link.target) {
      warnings.push({
        code: 'DG-06-FLOW',
        chartId,
        message: `Self-referencing link: ${link.source} → ${link.target}`,
        autoFixed: false,
      });
    }
  }

  // Check: all link endpoints reference existing nodes
  for (const link of links) {
    if (!nodeIds.has(link.source)) {
      warnings.push({
        code: 'DG-06-FLOW',
        chartId,
        message: `Link source "${link.source}" not found in nodes`,
        autoFixed: false,
      });
    }
    if (!nodeIds.has(link.target)) {
      warnings.push({
        code: 'DG-06-FLOW',
        chartId,
        message: `Link target "${link.target}" not found in nodes`,
        autoFixed: false,
      });
    }
  }

  // Check: no orphan nodes (nodes with zero connections)
  for (const node of nodes) {
    const hasLink = links.some(l => l.source === node.id || l.target === node.id);
    if (!hasLink) {
      warnings.push({
        code: 'DG-06-FLOW',
        chartId,
        message: `Orphan node with no links: "${node.id}"`,
        autoFixed: false,
      });
    }
  }

  // Check: flow conservation at intermediate nodes
  for (const node of nodes) {
    const inflow = links.filter(l => l.target === node.id).reduce((s, l) => s + l.value, 0);
    const outflow = links.filter(l => l.source === node.id).reduce((s, l) => s + l.value, 0);

    // Skip source nodes (no inflow) and terminal nodes (no outflow)
    if (inflow === 0 || outflow === 0) continue;

    const maxFlow = Math.max(inflow, outflow);
    if (maxFlow > 0 && Math.abs(inflow - outflow) / maxFlow > 0.05) {
      warnings.push({
        code: 'DG-06-FLOW',
        chartId,
        message: `Flow conservation violated at "${node.id}": inflow=${inflow}, outflow=${outflow} (${Math.round(Math.abs(inflow - outflow) / maxFlow * 100)}% diff)`,
        claimed: inflow,
        actual: outflow,
        autoFixed: false,
      });
    }
  }

  chart._guardrail = { ...(chart._guardrail as object || {}), flowChecked: true };
}

// ─── DG-L3-05: Cross-Chart Consistency ──────────────────────────────
// Ensures the same metric shows the same value across all charts.

export function validateCrossChartConsistency(
  charts: ChartRecord[],
  warnings: GuardrailWarning[],
): void {
  // Build metric → { chartId, value } map
  const metricValues = new Map<string, Array<{ chartId: string; value: number }>>();

  for (const chart of charts) {
    const chartId = (chart.id as string) || 'unknown';
    const config = chart.config as Record<string, unknown> | undefined;
    const yField = (config?.yField as string) || 'value';
    const data = chart.data as Array<Record<string, unknown>> | undefined;
    if (!data || data.length === 0) continue;

    // Get the "current value" — last data point for time series
    const lastRow = data[data.length - 1];
    const val = Number(lastRow?.[yField]);
    if (isNaN(val)) continue;

    const metricKey = yField.toLowerCase();
    if (!metricValues.has(metricKey)) metricValues.set(metricKey, []);
    metricValues.get(metricKey)!.push({ chartId, value: val });
  }

  // Check for mismatches
  for (const [metric, entries] of metricValues) {
    if (entries.length < 2) continue;

    const baseValue = entries[0].value;
    for (let i = 1; i < entries.length; i++) {
      const other = entries[i];
      if (baseValue === 0 && other.value === 0) continue;
      const maxVal = Math.max(Math.abs(baseValue), Math.abs(other.value));
      const diff = Math.abs(baseValue - other.value) / maxVal;

      if (diff > 0.005) { // > 0.5% difference
        warnings.push({
          code: 'DG-L3-05-CROSSCHART',
          chartId: other.chartId,
          message: `Metric "${metric}" shows ${baseValue} in chart "${entries[0].chartId}" but ${other.value} in chart "${other.chartId}" (${(diff * 100).toFixed(1)}% diff)`,
          claimed: baseValue,
          actual: other.value,
          autoFixed: false,
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PHASE 2 GUARDRAILS — Data Quality & Chart Correctness
// ═══════════════════════════════════════════════════════════════════════

// ─── DG-01: Schema Validation (Pre-Chart) ───────────────────────────
// Validates raw dbData tables before charts are built.

export interface DataQualityResult {
  validTables: string[];
  emptyTables: string[];
  typeWarnings: GuardrailWarning[];
}

export function validateDataQuality(
  dbData: Record<string, unknown>,
): DataQualityResult {
  const validTables: string[] = [];
  const emptyTables: string[] = [];
  const typeWarnings: GuardrailWarning[] = [];

  for (const [table, value] of Object.entries(dbData)) {
    // Skip computed scalar values (kprTotalLeads, etc.)
    if (!Array.isArray(value)) continue;

    if (value.length === 0) {
      emptyTables.push(table);
      typeWarnings.push({
        code: 'DG-01-SCHEMA',
        chartId: table,
        message: `Table "${table}" returned 0 rows — possible schema mismatch`,
        autoFixed: false,
      });
      continue;
    }

    validTables.push(table);

    // Sample first row for type checking
    const sample = value[0] as Record<string, unknown>;
    if (!sample || typeof sample !== 'object') {
      typeWarnings.push({
        code: 'DG-01-SCHEMA',
        chartId: table,
        message: `Table "${table}" first row is not an object`,
        autoFixed: false,
      });
      continue;
    }

    // Check for string values that should be numeric (e.g., "N/A", "null", "")
    for (const [field, val] of Object.entries(sample)) {
      if (typeof val === 'string' && val !== '') {
        // If field name suggests numeric but value is non-numeric string
        const numericHints = ['count', 'total', 'avg', 'sum', 'rate', 'pct', 'amount', 'value', 'score', 'days', 'hours'];
        const isNumericField = numericHints.some(h => field.toLowerCase().includes(h));
        if (isNumericField && isNaN(Number(val))) {
          typeWarnings.push({
            code: 'DG-01-SCHEMA',
            chartId: table,
            message: `Field "${field}" in "${table}" looks numeric but has string value "${val}"`,
            autoFixed: false,
          });
        }
      }
    }
  }

  if (emptyTables.length > 0) {
    console.warn(`[DG-01] ${emptyTables.length} empty tables: ${emptyTables.join(', ')}`);
  }
  if (typeWarnings.length > 0) {
    console.warn(`[DG-01] ${typeWarnings.length} schema warnings`);
  }
  console.log(`[DG-01] Data quality: ${validTables.length} valid tables, ${emptyTables.length} empty`);

  return { validTables, emptyTables, typeWarnings };
}

// ─── DG-02: Null & Missing Value Handling ───────────────────────────

function validateNullRates(
  chart: ChartRecord,
  warnings: GuardrailWarning[],
): void {
  const chartId = (chart.id as string) || 'unknown';
  const data = chart.data as Array<Record<string, unknown>> | undefined;
  if (!data || data.length === 0) return;

  const config = chart.config as Record<string, unknown> | undefined;
  const yField = (config?.yField as string) || 'value';

  let nullCount = 0;
  for (const row of data) {
    const val = row[yField];
    if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
      nullCount++;
    }
  }

  const nullRate = nullCount / data.length;
  if (nullRate > 0.3) {
    warnings.push({
      code: 'DG-02-NULL',
      chartId,
      message: `${Math.round(nullRate * 100)}% null values in "${yField}" — low confidence data`,
      claimed: data.length,
      actual: data.length - nullCount,
      autoFixed: false,
    });
    chart._lowConfidence = true;
  } else if (nullRate > 0.1) {
    warnings.push({
      code: 'DG-02-NULL',
      chartId,
      message: `${Math.round(nullRate * 100)}% null values in "${yField}" — interpret with caution`,
      autoFixed: true,
    });
    // Auto-fix: append warning to footnote
    const existingFootnote = (chart.footnote as string) || '';
    const nullNote = `⚠ ${Math.round(nullRate * 100)}% of data points missing.`;
    chart.footnote = existingFootnote ? `${existingFootnote} ${nullNote}` : nullNote;
  }

  chart._guardrail = { ...(chart._guardrail as object || {}), nullChecked: true };
}

// ─── DG-05: Time Series Integrity ──────────────────────────────────

function validateTimeSeries(
  chart: ChartRecord,
  warnings: GuardrailWarning[],
): void {
  const chartId = (chart.id as string) || 'unknown';
  const config = chart.config as Record<string, unknown> | undefined;
  const xField = (config?.xField as string) || 'period';
  const timeUnit = config?.timeUnit as string | undefined;

  // Only validate time-series charts
  if (!timeUnit && xField !== 'period') return;

  const data = chart.data as Array<Record<string, unknown>> | undefined;
  if (!data || data.length < 2) return;

  const periods = data.map(d => String(d[xField] ?? '')).filter(Boolean);

  // Check for duplicates
  const seen = new Set<string>();
  for (const p of periods) {
    if (seen.has(p)) {
      warnings.push({
        code: 'DG-05-TIME',
        chartId,
        message: `Duplicate period detected: "${p}"`,
        autoFixed: false,
      });
      break; // One warning per chart is enough
    }
    seen.add(p);
  }

  // Check chronological order (lexicographic sort for YYYY-MM format)
  const sorted = [...periods].sort();
  let outOfOrder = false;
  for (let i = 0; i < periods.length; i++) {
    if (periods[i] !== sorted[i]) {
      outOfOrder = true;
      break;
    }
  }
  if (outOfOrder) {
    warnings.push({
      code: 'DG-05-TIME',
      chartId,
      message: `Periods not in chronological order`,
      autoFixed: false,
    });
  }

  chart._guardrail = { ...(chart._guardrail as object || {}), timeSeriesChecked: true };
}

// ─── CG-02: Chart Type Correctness ─────────────────────────────────

const TEMPORAL_CHART_TYPES = new Set(['trend_area', 'line_comparison', 'spaghetti_highlight']);
const BAR_CHART_TYPES = new Set(['metric_bars', 'horizontal_bars', 'grouped_bars', 'vertical_comparison']);

function validateChartType(
  chart: ChartRecord,
  warnings: GuardrailWarning[],
): void {
  const chartId = (chart.id as string) || 'unknown';
  const chartType = (chart.chartType as string) || '';
  const data = chart.data as Array<Record<string, unknown>> | undefined;
  if (!data) return;

  // Line/area chart with only 1 data point → should be bar or metric
  if (TEMPORAL_CHART_TYPES.has(chartType) && data.length <= 1) {
    warnings.push({
      code: 'CG-02-TYPE',
      chartId,
      message: `${chartType} chart has only ${data.length} data point(s) — consider bar chart or big number`,
      autoFixed: false,
    });
  }

  // Bar chart with too many categories
  if (BAR_CHART_TYPES.has(chartType) && data.length > 15) {
    warnings.push({
      code: 'CG-02-TYPE',
      chartId,
      message: `Bar chart has ${data.length} categories — consider Top-10 + Others grouping`,
      autoFixed: false,
    });
  }

  // Bar chart with only 1 category → pointless
  if (BAR_CHART_TYPES.has(chartType) && data.length <= 1) {
    warnings.push({
      code: 'CG-02-TYPE',
      chartId,
      message: `Bar chart has only ${data.length} category — chart is uninformative`,
      autoFixed: false,
    });
  }

  chart._guardrail = { ...(chart._guardrail as object || {}), chartTypeChecked: true };
}

// ─── CG-03: Scale Integrity ────────────────────────────────────────

function validateScaleIntegrity(
  chart: ChartRecord,
  warnings: GuardrailWarning[],
): void {
  const chartId = (chart.id as string) || 'unknown';
  const chartType = (chart.chartType as string) || '';
  const config = chart.config as Record<string, unknown> | undefined;
  const data = chart.data as Array<Record<string, unknown>> | undefined;
  if (!config || !data || data.length === 0) return;

  const yField = (config.yField as string) || 'value';
  const values = data.map(d => Number(d[yField])).filter(n => !isNaN(n) && isFinite(n));
  if (values.length === 0) return;

  // Bar charts MUST start at zero
  if (BAR_CHART_TYPES.has(chartType)) {
    if (config.zeroAxis === false) {
      warnings.push({
        code: 'CG-03-SCALE',
        chartId,
        message: `Bar chart "${chartId}" has non-zero baseline — misleading visual proportions`,
        autoFixed: true,
      });
      // Auto-fix: force zero axis for bars
      (config as Record<string, unknown>).zeroAxis = true;
    }
  }

  // Line charts: warn if scale is compressed (all values in narrow band)
  if (TEMPORAL_CHART_TYPES.has(chartType) && values.length >= 3) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    if (min > 0 && max > 0 && range < max * 0.05) {
      // All values within 5% of max — the line looks flat but data might have meaningful micro-trends
      warnings.push({
        code: 'CG-03-SCALE',
        chartId,
        message: `Line chart values range ${min.toFixed(1)}-${max.toFixed(1)} (${(range / max * 100).toFixed(1)}% range) — consider zoomed scale for visibility`,
        autoFixed: false,
      });
    }
  }

  chart._guardrail = { ...(chart._guardrail as object || {}), scaleChecked: true };
}

// ─── Main Pipeline ──────────────────────────────────────────────────

/** Run all guardrails on a set of charts. Returns summary with score. */
export function runChartGuardrails(charts: ChartRecord[]): GuardrailSummary {
  const warnings: GuardrailWarning[] = [];

  for (const chart of charts) {
    // Phase 1
    validateChartArithmetic(chart, warnings);
    validateSankeyFlow(chart, warnings);
    // Phase 2
    validateNullRates(chart, warnings);
    validateTimeSeries(chart, warnings);
    validateChartType(chart, warnings);
    validateScaleIntegrity(chart, warnings);
  }

  // Cross-chart (Phase 1)
  validateCrossChartConsistency(charts, warnings);

  // Compute score with Phase 1 + Phase 2 penalties
  const arithmeticFixed = warnings.filter(w => w.code === 'DG-03-MATH' && w.autoFixed).length;
  const flowWarnings = warnings.filter(w => w.code === 'DG-06-FLOW').length;
  const crossChartWarnings = warnings.filter(w => w.code === 'DG-L3-05-CROSSCHART').length;
  const nullWarnings = warnings.filter(w => w.code === 'DG-02-NULL').length;
  const nullSevere = warnings.filter(w => w.code === 'DG-02-NULL' && !w.autoFixed).length;
  const timeSeriesWarnings = warnings.filter(w => w.code === 'DG-05-TIME').length;
  const chartTypeWarnings = warnings.filter(w => w.code === 'CG-02-TYPE').length;
  const scaleWarnings = warnings.filter(w => w.code === 'CG-03-SCALE').length;

  let score = 100;
  // Phase 1
  score -= arithmeticFixed * 10;
  score -= flowWarnings * 15;
  score -= crossChartWarnings * 10;
  // Phase 2
  score -= (nullWarnings - nullSevere) * 5;   // mild nulls
  score -= nullSevere * 15;                     // severe nulls
  score -= timeSeriesWarnings * 5;
  score -= chartTypeWarnings * 3;
  score -= scaleWarnings * 5;
  score = Math.max(0, score);

  const summary: GuardrailSummary = {
    totalCharts: charts.length,
    arithmeticFixed,
    headlinesRejected: 0,
    flowWarnings,
    crossChartWarnings,
    nullWarnings,
    timeSeriesWarnings,
    chartTypeWarnings,
    scaleWarnings,
    warnings,
    score,
  };

  // Log summary
  if (warnings.length > 0) {
    console.warn(`[chartGuardrails] ${warnings.length} issues found (score: ${score}/100):`);
    for (const w of warnings.slice(0, 10)) {
      console.warn(`  [${w.code}] ${w.message}${w.autoFixed ? ' (auto-fixed)' : ''}`);
    }
    if (warnings.length > 10) console.warn(`  ... and ${warnings.length - 10} more`);
  } else {
    console.log(`[chartGuardrails] All ${charts.length} charts passed validation (score: 100/100)`);
  }

  return summary;
}

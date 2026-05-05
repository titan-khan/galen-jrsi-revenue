// =============================================================================
// Anomaly Detector — Statistical anomaly detection (no LLM)
// Checks metrics against thresholds, monitoring rules, Z-scores, and trends.
// =============================================================================

// ─── Types ───────────────────────────────────────────────────────────

interface ThresholdBand {
  operator: 'gte' | 'lte' | 'between';
  value: number | [number, number];
}

interface ThresholdConfig {
  metricName: string;
  green: ThresholdBand;
  yellow: ThresholdBand;
  red: ThresholdBand;
  trendTrigger?: {
    consecutivePeriods: number;
    direction: 'declining' | 'increasing';
    threshold: number;
  };
}

interface MonitoringRule {
  id: string;
  name: string;
  whenCondition: string;
  whenValue: number;
  whenUnit?: string;
  forScope?: string;
  severity: string;
  enabled: boolean;
}

export interface DetectedAnomaly {
  metric: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  deviationType: 'zscore' | 'threshold' | 'trend' | 'rule';
  severity: 'critical' | 'high' | 'medium' | 'low';
  dimensions?: Record<string, string>;
  method: string;
  description: string;
}

export interface AnomalyDetectorResult {
  anomalies: DetectedAnomaly[];
  healthStatus: 'healthy' | 'warning' | 'critical';
  dataQuality: {
    completeness: number;
    freshness: string;
    rowCount: number;
    tableCount: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function computeZScore(values: number[]): { mean: number; std: number } {
  if (values.length < 3) return { mean: 0, std: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

function matchesBand(value: number, band: ThresholdBand): boolean {
  if (band.operator === 'gte') return value >= (band.value as number);
  if (band.operator === 'lte') return value <= (band.value as number);
  if (band.operator === 'between' && Array.isArray(band.value)) {
    return value >= band.value[0] && value <= band.value[1];
  }
  return false;
}

function severityFromThreshold(
  value: number,
  config: ThresholdConfig,
): 'critical' | 'high' | 'medium' | 'low' | null {
  if (matchesBand(value, config.red)) return 'critical';
  if (matchesBand(value, config.yellow)) return 'high';
  if (matchesBand(value, config.green)) return null; // healthy
  return 'medium'; // outside all defined bands
}

// ─── Main Detection ──────────────────────────────────────────────────

export function detectAnomalies(
  dbData: Record<string, unknown>,
  thresholds?: ThresholdConfig[],
  monitoringRules?: MonitoringRule[],
): AnomalyDetectorResult {
  const anomalies: DetectedAnomaly[] = [];

  // Data quality assessment
  let totalRows = 0;
  let tableCount = 0;
  let latestDate = '';

  for (const [_table, rows] of Object.entries(dbData)) {
    if (Array.isArray(rows)) {
      tableCount++;
      totalRows += rows.length;
      // Attempt to find latest date
      for (const row of rows.slice(0, 5)) {
        const r = row as Record<string, unknown>;
        for (const val of Object.values(r)) {
          if (typeof val === 'string' && /^\d{4}-\d{2}/.test(val) && val > latestDate) {
            latestDate = val;
          }
        }
      }
    }
  }

  const completeness = tableCount > 0 ? Math.min(100, Math.round((totalRows / Math.max(tableCount, 1)) * 100 / 50)) : 0;

  // ── Threshold-based detection ──
  if (thresholds && thresholds.length > 0) {
    for (const tc of thresholds) {
      const metricValue = extractMetricValue(dbData, tc.metricName);
      if (metricValue === null) continue;

      const sev = severityFromThreshold(metricValue.value, tc);
      if (sev) {
        anomalies.push({
          metric: tc.metricName,
          currentValue: metricValue.value,
          expectedValue: getExpectedFromGreen(tc.green),
          deviation: metricValue.value,
          deviationType: 'threshold',
          severity: sev,
          method: 'threshold-config',
          description: `${tc.metricName} = ${metricValue.value} is in ${sev === 'critical' ? 'RED' : 'YELLOW'} zone`,
        });
      }

      // Trend trigger check
      if (tc.trendTrigger && metricValue.timeSeries && metricValue.timeSeries.length >= tc.trendTrigger.consecutivePeriods) {
        const recent = metricValue.timeSeries.slice(-tc.trendTrigger.consecutivePeriods);
        const isConsecutive = tc.trendTrigger.direction === 'declining'
          ? recent.every((v, i) => i === 0 || v < recent[i - 1])
          : recent.every((v, i) => i === 0 || v > recent[i - 1]);

        if (isConsecutive) {
          const totalChange = ((recent[recent.length - 1] - recent[0]) / Math.abs(recent[0] || 1)) * 100;
          if (Math.abs(totalChange) >= tc.trendTrigger.threshold) {
            anomalies.push({
              metric: tc.metricName,
              currentValue: recent[recent.length - 1],
              expectedValue: recent[0],
              deviation: totalChange,
              deviationType: 'trend',
              severity: 'high',
              method: 'trend-detection',
              description: `${tc.metricName} ${tc.trendTrigger.direction} for ${tc.trendTrigger.consecutivePeriods} consecutive periods (${totalChange.toFixed(1)}% change)`,
            });
          }
        }
      }
    }
  }

  // ── Z-score detection on summary stats ──
  const timeSeriesKeys = Object.keys(dbData).filter(k =>
    k.endsWith('ByMonth') || k.endsWith('byMonth')
  );

  for (const key of timeSeriesKeys) {
    const series = dbData[key] as Array<Record<string, unknown>>;
    if (!Array.isArray(series) || series.length < 4) continue;

    // Find numeric columns to analyze
    const numericKeys = Object.keys(series[0] || {}).filter(
      k => typeof series[0][k] === 'number' && k !== 'month'
    );

    for (const nk of numericKeys) {
      const values = series.map(s => Number(s[nk]) || 0);
      if (values.length < 4) continue;

      const { mean, std } = computeZScore(values.slice(0, -1)); // compute on history
      if (std === 0) continue;

      const latest = values[values.length - 1];
      const zscore = Math.abs((latest - mean) / std);

      if (zscore > 2) {
        anomalies.push({
          metric: `${key}.${nk}`,
          currentValue: latest,
          expectedValue: Math.round(mean * 100) / 100,
          deviation: Math.round(zscore * 100) / 100,
          deviationType: 'zscore',
          severity: zscore > 3 ? 'critical' : 'high',
          method: 'z-score',
          description: `${nk} in ${key}: latest value ${latest} is ${zscore.toFixed(1)} std devs from mean ${mean.toFixed(1)}`,
        });
      }
    }
  }

  // ── Monitoring rule evaluation (existing format) ──
  if (monitoringRules) {
    for (const rule of monitoringRules) {
      if (!rule.enabled) continue;
      // Monitoring rules are evaluated as context for the LLM — we flag them as
      // "rule" type anomalies when we can match them to summary stats
      const metricValue = extractMetricFromRuleName(dbData, rule);
      if (metricValue !== null) {
        const triggered = evaluateRule(metricValue, rule);
        if (triggered) {
          anomalies.push({
            metric: rule.name,
            currentValue: metricValue,
            expectedValue: rule.whenValue,
            deviation: Math.abs(metricValue - rule.whenValue),
            deviationType: 'rule',
            severity: (rule.severity as DetectedAnomaly['severity']) || 'medium',
            method: 'monitoring-rule',
            description: `Rule "${rule.name}": ${rule.whenCondition} ${rule.whenValue}${rule.whenUnit || ''}`,
          });
        }
      }
    }
  }

  // Determine overall health
  const hasCritical = anomalies.some(a => a.severity === 'critical');
  const hasHigh = anomalies.some(a => a.severity === 'high');

  return {
    anomalies,
    healthStatus: hasCritical ? 'critical' : hasHigh ? 'warning' : 'healthy',
    dataQuality: {
      completeness: Math.min(100, completeness),
      freshness: latestDate || 'unknown',
      rowCount: totalRows,
      tableCount,
    },
  };
}

// ─── Metric Extraction Helpers ───────────────────────────────────────

// Map threshold config metric names to summary stat keys
const METRIC_NAME_MAP: Record<string, { key: string; timeSeriesField?: string }> = {
  'CM%': { key: 'logistiqAvgCMPct', timeSeriesField: 'cm_pct' },
  'Return Rate': { key: 'logistiqReturnRate', timeSeriesField: 'return_rate' },
  'Returns Cost % of Revenue': { key: 'logistiqReturnsCostPctOfRevenue', timeSeriesField: 'returns_cost_pct' },
};

function extractMetricValue(
  dbData: Record<string, unknown>,
  metricName: string,
): { value: number; timeSeries?: number[] } | null {
  // Check named metric mappings first
  const mapped = METRIC_NAME_MAP[metricName];
  if (mapped) {
    const val = dbData[mapped.key];
    if (typeof val === 'number') {
      let timeSeries: number[] | undefined;
      if (mapped.timeSeriesField) {
        const lqByMonth = dbData.logistiqByMonth as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(lqByMonth)) {
          timeSeries = lqByMonth.map(m => Number(m[mapped.timeSeriesField!]) || 0);
        }
      }
      return { value: val, timeSeries };
    }
  }

  // Check top-level summary stats first (e.g., otpPercent, npsScore, totalRevenue)
  const directValue = dbData[metricName];
  if (typeof directValue === 'number') {
    // Try to find corresponding time series
    const timeSeriesKey = Object.keys(dbData).find(k =>
      k.toLowerCase().includes('bymonth') &&
      Array.isArray(dbData[k])
    );
    let timeSeries: number[] | undefined;
    if (timeSeriesKey) {
      const series = dbData[timeSeriesKey] as Array<Record<string, unknown>>;
      // Find a numeric field that might correspond
      const matchingField = Object.keys(series[0] || {}).find(
        k => k.toLowerCase().includes(metricName.toLowerCase().replace(/percent|pct/i, ''))
      );
      if (matchingField) {
        timeSeries = series.map(s => Number(s[matchingField]) || 0);
      }
    }
    return { value: directValue, timeSeries };
  }

  return null;
}

function getExpectedFromGreen(green: ThresholdBand): number {
  if (typeof green.value === 'number') return green.value;
  if (Array.isArray(green.value)) return (green.value[0] + green.value[1]) / 2;
  return 0;
}

function extractMetricFromRuleName(
  dbData: Record<string, unknown>,
  rule: MonitoringRule,
): number | null {
  // Try to match rule name to known summary stat keys
  const name = rule.name.toLowerCase();

  if (name.includes('otp') || name.includes('on-time') || name.includes('on time')) {
    return typeof dbData.otpPercent === 'number' ? dbData.otpPercent : null;
  }
  if (name.includes('nps')) {
    return typeof dbData.npsScore === 'number' ? dbData.npsScore : null;
  }
  if (name.includes('revenue') && name.includes('drop')) {
    return typeof dbData.totalRevenue === 'number' ? dbData.totalRevenue : null;
  }
  if (name.includes('margin')) {
    const cm = dbData.logistiqAvgCMPct;
    return typeof cm === 'number' ? cm : null;
  }
  if (name.includes('delay')) {
    return typeof dbData.avgDelayMinutes === 'number' ? dbData.avgDelayMinutes : null;
  }
  if (name.includes('return') && name.includes('cost')) {
    return typeof dbData.logistiqReturnsCostPctOfRevenue === 'number' ? dbData.logistiqReturnsCostPctOfRevenue : null;
  }
  if (name.includes('return') && (name.includes('rate') || name.includes('%'))) {
    return typeof dbData.logistiqReturnRate === 'number' ? dbData.logistiqReturnRate : null;
  }

  return null;
}

function evaluateRule(value: number, rule: MonitoringRule): boolean {
  const cond = rule.whenCondition.toLowerCase();
  const threshold = rule.whenValue;

  if (cond.includes('below') || cond.includes('falls below') || cond.includes('drops below')) {
    return value < threshold;
  }
  if (cond.includes('exceeds') || cond.includes('above') || cond.includes('over')) {
    return value > threshold;
  }
  if (cond.includes('drops by') || cond.includes('decreases by')) {
    // Would need previous value — skip for now
    return false;
  }

  return false;
}

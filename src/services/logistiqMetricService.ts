// =============================================================================
// LogistiQ Metric Service — Computes all 27 metric display values from Gold views
// =============================================================================

import {
  queryLogistiqOrders,
  queryLogistiqOrdersSparkline,
  queryLogistiqOrderLines,
  queryLogistiqOrderLinesSparkline,
  queryLogistiqWarehouseUtilization,
  type LogistiqOrderRow,
  type LogistiqOrderLineRow,
} from './logistiqMetricQueries';
import {
  parsePeriod,
  getComparisonPeriod,
  getSparklineMonths,
  type DateRange,
} from './periodUtils';
import type { MetricStatus } from '@/types/metric';

// ─── Types ───────────────────────────────────────────────────────────

export interface MetricDisplayData {
  filterContext: string;
  comparisonLabel: string; // e.g. "vs Dec 2025" or "vs Jan 2025 (YoY)"
  currentValue: string;
  changePercent: number;
  changeAbsolute: string;
  status: MetricStatus;
  sparklineData: Array<{ month: string; value: number }>;
  insight: { text: string; boldParts: string[] };
  targetProgress?: number;
}

export interface PeriodFilter {
  period: string;   // e.g. "dec-2025"
  segment: string;  // e.g. "all" or "CLT001"
  comparison: string; // "previous" | "yoy" | "none"
}

// ─── Value formatting ────────────────────────────────────────────────

/** Format IDR using Indonesian units: Rb (Ribu), Jt (Juta), M (Miliar), T (Triliun) */
function formatIDR(value: number): string {
  if (value >= 1_000_000_000_000) return `Rp ${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(2)}M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(2)}Jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(1)}Rb`;
  return `Rp ${Math.round(value)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

function formatWeight(value: number, unit: string): string {
  return `${value.toFixed(unit === 'kg' ? 2 : 0)} ${unit}`;
}

function formatDays(value: number): string {
  return `${value.toFixed(1)} days`;
}

function formatChangeAbsolute(current: number, previous: number, formatter: (v: number) => string): string {
  const diff = current - previous;
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${formatter(Math.abs(diff))}`;
}

function computeChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function determineStatus(
  changePercent: number,
  direction: 'up_is_good' | 'down_is_good' | 'neutral'
): MetricStatus {
  if (direction === 'neutral') return 'healthy';

  // For up_is_good: positive change = healthy, negative = warning/critical
  // For down_is_good: negative change = healthy, positive = warning/critical
  const effectiveChange = direction === 'down_is_good' ? -changePercent : changePercent;

  if (effectiveChange >= 2) return 'healthy';
  if (effectiveChange <= -8) return 'critical';
  if (effectiveChange <= -2) return 'warning';
  return 'healthy'; // between -2 and 2 = neutral, show as healthy
}

// ─── Segment mapping ─────────────────────────────────────────────────

/**
 * Map segment filter value to client_id for DB queries.
 * Returns null for "all" (no client filter).
 */
function mapSegmentToClientId(segment: string): string | null {
  if (segment === 'all') return null;
  return segment; // segment value IS the client_id (e.g., "CLT001")
}

// ─── Helper: aggregate order rows ────────────────────────────────────

function sumOrders(rows: LogistiqOrderRow[]) {
  const totalOrders = rows.reduce((s, r) => s + Number(r.total_orders), 0);
  const totalGmv = rows.reduce((s, r) => s + Number(r.total_gmv), 0);
  const totalCogs = rows.reduce((s, r) => s + Number(r.total_cogs), 0);
  const avgOrderValue = totalOrders > 0 ? totalGmv / totalOrders : 0;
  const totalWeightKg = rows.reduce((s, r) => s + Number(r.total_weight_kg), 0);
  const avgStorageDays = totalOrders > 0
    ? rows.reduce((s, r) => s + Number(r.avg_storage_days) * Number(r.total_orders), 0) / totalOrders
    : 0;
  const totalReceivingFee = rows.reduce((s, r) => s + Number(r.total_receiving_fee), 0);
  const totalStorageFee = rows.reduce((s, r) => s + Number(r.total_storage_fee), 0);
  const totalPickPackFee = rows.reduce((s, r) => s + Number(r.total_pick_pack_fee), 0);
  const totalQcFee = rows.reduce((s, r) => s + Number(r.total_qc_inspection_fee), 0);
  const totalKittingFee = rows.reduce((s, r) => s + Number(r.total_kitting_fee), 0);
  const totalSpecialPackagingFee = rows.reduce((s, r) => s + Number(r.total_special_packaging_fee), 0);
  const totalFulfillmentFee = rows.reduce((s, r) => s + Number(r.total_fulfillment_fee), 0);
  const totalShippingCost = rows.reduce((s, r) => s + Number(r.total_shipping_cost), 0);
  const totalReturnsCost = rows.reduce((s, r) => s + Number(r.total_returns_cost), 0);
  const totalRevenue = rows.reduce((s, r) => s + Number(r.total_logistiq_revenue), 0);
  const totalDirectCosts = rows.reduce((s, r) => s + Number(r.total_logistiq_direct_costs), 0);
  const totalContributionMargin = rows.reduce((s, r) => s + Number(r.total_contribution_margin), 0);
  const avgCmPct = totalOrders > 0
    ? rows.reduce((s, r) => s + Number(r.avg_cm_pct) * Number(r.total_orders), 0) / totalOrders
    : 0;
  const returnedOrders = rows.reduce((s, r) => s + Number(r.returned_orders), 0);
  const totalPalletsUsed = rows.reduce((s, r) => s + Number(r.total_pallets_used), 0);

  return {
    totalOrders,
    totalGmv,
    totalCogs,
    avgOrderValue,
    totalWeightKg,
    avgStorageDays,
    totalReceivingFee,
    totalStorageFee,
    totalPickPackFee,
    totalQcFee,
    totalKittingFee,
    totalSpecialPackagingFee,
    totalFulfillmentFee,
    totalShippingCost,
    totalReturnsCost,
    totalRevenue,
    totalDirectCosts,
    totalContributionMargin,
    avgCmPct,
    returnedOrders,
    totalPalletsUsed,
  };
}

// ─── Helper: aggregate order-line rows ───────────────────────────────

function sumOrderLines(rows: LogistiqOrderLineRow[]) {
  const totalGmv = rows.reduce((s, r) => s + Number(r.total_gmv), 0);
  const totalCogs = rows.reduce((s, r) => s + Number(r.total_cogs), 0);
  const totalWeightGrams = rows.reduce((s, r) => s + Number(r.total_weight_grams), 0);
  const totalGrossProfit = rows.reduce((s, r) => s + Number(r.total_gross_profit), 0);
  const lineCount = rows.reduce((s, r) => s + Number(r.line_count), 0);
  const avgCogsPct = lineCount > 0
    ? rows.reduce((s, r) => s + Number(r.avg_cogs_pct) * Number(r.line_count), 0) / lineCount
    : 0;
  const avgMarginPct = lineCount > 0
    ? rows.reduce((s, r) => s + Number(r.avg_margin_pct) * Number(r.line_count), 0) / lineCount
    : 0;
  const avgStorageDays = lineCount > 0
    ? rows.reduce((s, r) => s + Number(r.avg_storage_days) * Number(r.line_count), 0) / lineCount
    : 0;

  return {
    totalGmv,
    totalCogs,
    totalWeightGrams,
    totalGrossProfit,
    avgCogsPct,
    avgMarginPct,
    avgStorageDays,
    lineCount,
  };
}

// ─── Sparkline helpers ───────────────────────────────────────────────

function buildOrderSparkline(
  rows: LogistiqOrderRow[],
  months: DateRange[],
  extractor: (agg: ReturnType<typeof sumOrders>) => number
): Array<{ month: string; value: number }> {
  return months.map(m => {
    const targetMonth = m.startDate.substring(0, 7); // "2025-12"
    const monthRows = rows.filter(r => r.order_month === targetMonth);
    return { month: m.label, value: extractor(sumOrders(monthRows)) };
  });
}

function buildOrderLineSparkline(
  rows: LogistiqOrderLineRow[],
  months: DateRange[],
  extractor: (agg: ReturnType<typeof sumOrderLines>) => number
): Array<{ month: string; value: number }> {
  return months.map(m => {
    const targetMonth = m.startDate.substring(0, 7);
    const monthRows = rows.filter(r => r.order_month === targetMonth);
    return { month: m.label, value: extractor(sumOrderLines(monthRows)) };
  });
}

// ─── Main fetch function ─────────────────────────────────────────────

/**
 * Fetches and computes display data for all 27 LogistiQ metrics in parallel.
 * Returns a Map keyed by metric ID.
 */
export async function fetchLogistiqMetricDisplayData(
  filters: PeriodFilter
): Promise<Map<string, MetricDisplayData>> {
  const currentPeriod = parsePeriod(filters.period);
  const compPeriod = getComparisonPeriod(currentPeriod, filters.comparison as 'previous' | 'yoy' | 'none');
  const clientId = mapSegmentToClientId(filters.segment);
  const sparklineMonths = getSparklineMonths(filters.period, 12);

  const segmentLabel = filters.segment === 'all' ? 'All Clients' : filters.segment;
  const filterContext = `${currentPeriod.label} · ${segmentLabel}`;

  // Build comparison label for display on cards
  let comparisonLabel = '';
  if (compPeriod) {
    const compType = filters.comparison === 'yoy' ? ' (YoY)' : '';
    comparisonLabel = `vs ${compPeriod.label}${compType}`;
  }

  // Run all queries in parallel
  const [
    orderRows,
    prevOrderRows,
    orderSparkRows,
    orderLineRows,
    prevOrderLineRows,
    orderLineSparkRows,
    warehouseRows,
    prevWarehouseRows,
  ] = await Promise.all([
    queryLogistiqOrders(currentPeriod.startDate, clientId),
    compPeriod ? queryLogistiqOrders(compPeriod.startDate, clientId) : Promise.resolve([]),
    queryLogistiqOrdersSparkline(sparklineMonths, clientId),
    queryLogistiqOrderLines(currentPeriod.startDate, clientId),
    compPeriod ? queryLogistiqOrderLines(compPeriod.startDate, clientId) : Promise.resolve([]),
    queryLogistiqOrderLinesSparkline(sparklineMonths, clientId),
    queryLogistiqWarehouseUtilization(currentPeriod.startDate),
    compPeriod ? queryLogistiqWarehouseUtilization(compPeriod.startDate) : Promise.resolve([]),
  ]);

  // Aggregate current and previous values
  const curOrders = sumOrders(orderRows);
  const prevOrders = sumOrders(prevOrderRows);
  const curLines = sumOrderLines(orderLineRows);
  const prevLines = sumOrderLines(prevOrderLineRows);

  // Warehouse utilization: average utilization_pct across all warehouses
  const curWarehouseUtil = warehouseRows.length > 0
    ? warehouseRows.reduce((s, r) => s + Number(r.utilization_pct), 0) / warehouseRows.length
    : 0;
  const prevWarehouseUtil = prevWarehouseRows.length > 0
    ? prevWarehouseRows.reduce((s, r) => s + Number(r.utilization_pct), 0) / prevWarehouseRows.length
    : 0;

  const result = new Map<string, MetricDisplayData>();

  const noComparison = !compPeriod; // true when user selected "No Comparison"

  // Helper to build metric entry
  function addMetric(
    id: string,
    current: number,
    previous: number,
    direction: 'up_is_good' | 'down_is_good' | 'neutral',
    formatter: (v: number) => string,
    sparkline: Array<{ month: string; value: number }>,
    contextOverride?: string,
  ) {
    // When no comparison is selected, zero out change data
    const changePct = noComparison ? 0 : computeChangePercent(current, previous);
    const changeAbs = noComparison ? 'N/A' : formatChangeAbsolute(current, previous, formatter);
    const status = noComparison ? 'healthy' as MetricStatus : determineStatus(changePct, direction);

    result.set(id, {
      filterContext: contextOverride || filterContext,
      comparisonLabel: noComparison ? '' : comparisonLabel,
      currentValue: formatter(current),
      changePercent: changePct,
      changeAbsolute: changeAbs,
      status,
      sparklineData: sparkline,
      insight: { text: '', boldParts: [] }, // Populated by AI later
    });
  }

  // ─── Order-line metrics (from queryLogistiqOrderLines) ─────────────

  addMetric(
    'metric-logistiq-line-gmv',
    curLines.totalGmv,
    prevLines.totalGmv,
    'up_is_good',
    formatIDR,
    buildOrderLineSparkline(orderLineSparkRows, sparklineMonths, agg => agg.totalGmv),
  );

  addMetric(
    'metric-logistiq-line-cogs',
    curLines.totalCogs,
    prevLines.totalCogs,
    'down_is_good',
    formatIDR,
    buildOrderLineSparkline(orderLineSparkRows, sparklineMonths, agg => agg.totalCogs),
  );

  addMetric(
    'metric-logistiq-line-weight',
    curLines.totalWeightGrams,
    prevLines.totalWeightGrams,
    'neutral',
    (v) => formatWeight(v, 'g'),
    buildOrderLineSparkline(orderLineSparkRows, sparklineMonths, agg => agg.totalWeightGrams),
  );

  addMetric(
    'metric-logistiq-line-gross-profit',
    curLines.totalGrossProfit,
    prevLines.totalGrossProfit,
    'up_is_good',
    formatIDR,
    buildOrderLineSparkline(orderLineSparkRows, sparklineMonths, agg => agg.totalGrossProfit),
  );

  addMetric(
    'metric-logistiq-line-cogs-pct',
    curLines.avgCogsPct,
    prevLines.avgCogsPct,
    'down_is_good',
    formatPercent,
    buildOrderLineSparkline(orderLineSparkRows, sparklineMonths, agg => agg.avgCogsPct),
  );

  addMetric(
    'metric-logistiq-line-storage-days',
    curLines.avgStorageDays,
    prevLines.avgStorageDays,
    'down_is_good',
    formatDays,
    buildOrderLineSparkline(orderLineSparkRows, sparklineMonths, agg => agg.avgStorageDays),
  );

  // ─── Order metrics (from queryLogistiqOrders) ──────────────────────

  addMetric(
    'metric-logistiq-order-gmv',
    curOrders.totalGmv,
    prevOrders.totalGmv,
    'up_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalGmv),
  );

  addMetric(
    'metric-logistiq-order-cogs',
    curOrders.totalCogs,
    prevOrders.totalCogs,
    'down_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalCogs),
  );

  addMetric(
    'metric-logistiq-order-weight',
    curOrders.totalWeightKg,
    prevOrders.totalWeightKg,
    'neutral',
    (v) => formatWeight(v, 'kg'),
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalWeightKg),
  );

  addMetric(
    'metric-logistiq-order-storage-days',
    curOrders.avgStorageDays,
    prevOrders.avgStorageDays,
    'down_is_good',
    formatDays,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.avgStorageDays),
  );

  // ─── Fee metrics (from queryLogistiqOrders) ────────────────────────

  addMetric(
    'metric-logistiq-receiving-fee',
    curOrders.totalReceivingFee,
    prevOrders.totalReceivingFee,
    'up_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalReceivingFee),
  );

  addMetric(
    'metric-logistiq-storage-fee',
    curOrders.totalStorageFee,
    prevOrders.totalStorageFee,
    'up_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalStorageFee),
  );

  addMetric(
    'metric-logistiq-pick-pack-fee',
    curOrders.totalPickPackFee,
    prevOrders.totalPickPackFee,
    'up_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalPickPackFee),
  );

  addMetric(
    'metric-logistiq-qc-fee',
    curOrders.totalQcFee,
    prevOrders.totalQcFee,
    'up_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalQcFee),
  );

  addMetric(
    'metric-logistiq-kitting-fee',
    curOrders.totalKittingFee,
    prevOrders.totalKittingFee,
    'up_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalKittingFee),
  );

  addMetric(
    'metric-logistiq-special-packaging-fee',
    curOrders.totalSpecialPackagingFee,
    prevOrders.totalSpecialPackagingFee,
    'up_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalSpecialPackagingFee),
  );

  // ─── Revenue / Cost / Margin metrics (from queryLogistiqOrders) ────

  addMetric(
    'metric-logistiq-fulfillment-fee',
    curOrders.totalFulfillmentFee,
    prevOrders.totalFulfillmentFee,
    'up_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalFulfillmentFee),
  );

  addMetric(
    'metric-logistiq-shipping-cost',
    curOrders.totalShippingCost,
    prevOrders.totalShippingCost,
    'down_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalShippingCost),
  );

  addMetric(
    'metric-logistiq-returns-cost',
    curOrders.totalReturnsCost,
    prevOrders.totalReturnsCost,
    'down_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalReturnsCost),
  );

  addMetric(
    'metric-logistiq-direct-costs',
    curOrders.totalDirectCosts,
    prevOrders.totalDirectCosts,
    'down_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalDirectCosts),
  );

  addMetric(
    'metric-logistiq-cm',
    curOrders.totalContributionMargin,
    prevOrders.totalContributionMargin,
    'up_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalContributionMargin),
  );

  addMetric(
    'metric-logistiq-cm-pct',
    curOrders.avgCmPct,
    prevOrders.avgCmPct,
    'up_is_good',
    formatPercent,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.avgCmPct),
  );

  // ─── Derived metrics (computed from sumOrders) ─────────────────────

  addMetric(
    'metric-logistiq-order-count',
    curOrders.totalOrders,
    prevOrders.totalOrders,
    'up_is_good',
    formatNumber,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalOrders),
  );

  addMetric(
    'metric-logistiq-aov',
    curOrders.totalOrders > 0 ? curOrders.totalGmv / curOrders.totalOrders : 0,
    prevOrders.totalOrders > 0 ? prevOrders.totalGmv / prevOrders.totalOrders : 0,
    'up_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg =>
      agg.totalOrders > 0 ? agg.totalGmv / agg.totalOrders : 0
    ),
  );

  addMetric(
    'metric-logistiq-revenue-vs-commitment',
    curOrders.totalRevenue,
    prevOrders.totalRevenue,
    'up_is_good',
    formatIDR,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg => agg.totalRevenue),
  );

  addMetric(
    'metric-logistiq-return-rate',
    curOrders.totalOrders > 0 ? (curOrders.returnedOrders / curOrders.totalOrders) * 100 : 0,
    prevOrders.totalOrders > 0 ? (prevOrders.returnedOrders / prevOrders.totalOrders) * 100 : 0,
    'down_is_good',
    formatPercent,
    buildOrderSparkline(orderSparkRows, sparklineMonths, agg =>
      agg.totalOrders > 0 ? (agg.returnedOrders / agg.totalOrders) * 100 : 0
    ),
  );

  // ─── Warehouse utilization (from queryLogistiqWarehouseUtilization) ─

  addMetric(
    'metric-logistiq-warehouse-util',
    curWarehouseUtil,
    prevWarehouseUtil,
    'up_is_good',
    formatPercent,
    [], // Warehouse utilization sparkline requires per-month warehouse queries; skip for now
    `${currentPeriod.label} · All Warehouses`,
  );

  return result;
}

// ─── Legacy exports for backward compatibility ───────────────────────

export async function fetchMetricDefinitions() {
  // No longer needed — definitions live in logistiqMetricsData.ts
  return [];
}

export async function fetchMetricData(_metricId: string) {
  // No longer needed — use fetchLogistiqMetricDisplayData instead
  return null;
}

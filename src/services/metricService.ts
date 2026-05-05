// =============================================================================
// Metric Service — Computes all 20 metric display values from Gold views
// =============================================================================

import {
  queryRevenue,
  queryRevenueSparkline,
  queryTrips,
  queryTripsSparkline,
  queryNps,
  queryNpsSparkline,
  queryVehicleRevenue,
  queryVehicleRevenueSparkline,
  queryCustomers,
  queryCustomersSparkline,
  queryRetentionRate,
  queryFunnel,
  type RevenueRow,
  type TripRow,
  type NpsRow,
  type VehicleRevenueRow,
  type CustomerRow,
  type FunnelRow,
} from './metricQueries';
import {
  parsePeriod,
  getComparisonPeriod,
  getSparklineMonths,
  mapSegmentToRouteId,
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
  period: string;   // e.g. "jan-2026"
  segment: string;  // e.g. "all" or "R001"
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

function formatMinutes(value: number): string {
  return `${value.toFixed(1)} min`;
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

// ─── Helper: aggregate rows ──────────────────────────────────────────

function sumRevenue(rows: RevenueRow[]) {
  return {
    totalRevenue: rows.reduce((s, r) => s + Number(r.total_revenue), 0),
    totalOrders: rows.reduce((s, r) => s + Number(r.total_orders), 0),
    uniqueCustomers: rows.reduce((s, r) => s + Number(r.unique_customers), 0),
    cancelledOrders: rows.reduce((s, r) => s + Number(r.cancelled_orders), 0),
    netRevenue: rows.reduce((s, r) => s + Number(r.net_revenue), 0),
    routeCount: new Set(rows.map(r => r.route_id)).size,
  };
}

function sumTrips(rows: TripRow[]) {
  return {
    totalTrips: rows.reduce((s, r) => s + Number(r.total_trips), 0),
    completedTrips: rows.reduce((s, r) => s + Number(r.completed_trips), 0),
    onTimeTrips: rows.reduce((s, r) => s + Number(r.on_time_trips), 0),
    // Weighted average delay
    avgDelay: rows.length > 0
      ? rows.reduce((s, r) => s + Number(r.avg_delay_minutes) * Number(r.total_trips), 0) /
        rows.reduce((s, r) => s + Number(r.total_trips), 0)
      : 0,
    activeVehicles: rows.reduce((s, r) => s + Number(r.active_vehicles), 0),
  };
}

function sumNps(rows: NpsRow[]) {
  const promoters = rows.reduce((s, r) => s + Number(r.promoters), 0);
  const detractors = rows.reduce((s, r) => s + Number(r.detractors), 0);
  const totalResponses = rows.reduce((s, r) => s + Number(r.total_responses), 0);
  return {
    npsScore: totalResponses > 0
      ? Math.round(((promoters - detractors) / totalResponses) * 1000) / 10
      : 0,
    totalResponses,
  };
}

// ─── Sparkline helpers ───────────────────────────────────────────────

function buildRevenueSparkline(
  rows: RevenueRow[],
  months: DateRange[],
  extractor: (agg: ReturnType<typeof sumRevenue>) => number
): Array<{ month: string; value: number }> {
  return months.map(m => {
    const monthRows = rows.filter(r => {
      const rowMonth = r.month.substring(0, 7); // "2026-01"
      const targetMonth = m.startDate.substring(0, 7);
      return rowMonth === targetMonth;
    });
    return { month: m.label, value: extractor(sumRevenue(monthRows)) };
  });
}

function buildTripSparkline(
  rows: TripRow[],
  months: DateRange[],
  extractor: (agg: ReturnType<typeof sumTrips>) => number
): Array<{ month: string; value: number }> {
  return months.map(m => {
    const monthRows = rows.filter(r => {
      const rowMonth = r.month.substring(0, 7);
      const targetMonth = m.startDate.substring(0, 7);
      return rowMonth === targetMonth;
    });
    return { month: m.label, value: extractor(sumTrips(monthRows)) };
  });
}

function buildNpsSparkline(
  rows: NpsRow[],
  months: DateRange[]
): Array<{ month: string; value: number }> {
  return months.map(m => {
    const targetMonth = m.startDate.substring(0, 7);
    const monthRows = rows.filter(r => r.month === targetMonth);
    return { month: m.label, value: sumNps(monthRows).npsScore };
  });
}

function buildCustomerSparkline(
  rows: CustomerRow[],
  months: DateRange[],
  field: keyof CustomerRow
): Array<{ month: string; value: number }> {
  return months.map(m => {
    const targetMonth = m.startDate.substring(0, 7);
    const row = rows.find(r => r.month.substring(0, 7) === targetMonth);
    return { month: m.label, value: row ? Number(row[field]) : 0 };
  });
}

function buildVehicleRevenueSparkline(
  rows: VehicleRevenueRow[],
  months: DateRange[],
  field: 'ticket_revenue' | 'ancillary_revenue'
): Array<{ month: string; value: number }> {
  return months.map(m => {
    const targetMonth = m.startDate.substring(0, 7);
    const row = rows.find(r => r.month.substring(0, 7) === targetMonth);
    return { month: m.label, value: row ? Number(row[field]) : 0 };
  });
}

// ─── Main fetch function ─────────────────────────────────────────────

/**
 * Fetches and computes display data for all 20 metrics in parallel.
 * Returns a Map keyed by metric ID.
 */
export async function fetchAllMetricDisplayData(
  filters: PeriodFilter
): Promise<Map<string, MetricDisplayData>> {
  const currentPeriod = parsePeriod(filters.period);
  const compPeriod = getComparisonPeriod(currentPeriod, filters.comparison as 'previous' | 'yoy' | 'none');
  const routeId = mapSegmentToRouteId(filters.segment);
  const sparklineMonths = getSparklineMonths(filters.period, 12);

  const segmentLabel = filters.segment === 'all' ? 'All Routes' : filters.segment;
  const filterContext = `${currentPeriod.label} · ${segmentLabel}`;

  // Build comparison label for display on cards
  let comparisonLabel = '';
  if (compPeriod) {
    const compType = filters.comparison === 'yoy' ? ' (YoY)' : '';
    comparisonLabel = `vs ${compPeriod.label}${compType}`;
  }

  // Run all queries in parallel
  const [
    revenueRows,
    prevRevenueRows,
    revSparkRows,
    tripRows,
    prevTripRows,
    tripSparkRows,
    npsRows,
    prevNpsRows,
    npsSparkRows,
    vehRevRows,
    prevVehRevRows,
    vehRevSparkRows,
    custRows,
    prevCustRows,
    custSparkRows,
    retentionRate,
    prevRetentionRate,
    funnelRows,
  ] = await Promise.all([
    queryRevenue(currentPeriod.startDate, routeId),
    compPeriod ? queryRevenue(compPeriod.startDate, routeId) : Promise.resolve([]),
    queryRevenueSparkline(sparklineMonths, routeId),
    queryTrips(currentPeriod.startDate, routeId),
    compPeriod ? queryTrips(compPeriod.startDate, routeId) : Promise.resolve([]),
    queryTripsSparkline(sparklineMonths, routeId),
    queryNps(currentPeriod.startDate, routeId),
    compPeriod ? queryNps(compPeriod.startDate, routeId) : Promise.resolve([]),
    queryNpsSparkline(sparklineMonths, routeId),
    queryVehicleRevenue(currentPeriod.startDate),
    compPeriod ? queryVehicleRevenue(compPeriod.startDate) : Promise.resolve([]),
    queryVehicleRevenueSparkline(sparklineMonths),
    queryCustomers(currentPeriod.startDate),
    compPeriod ? queryCustomers(compPeriod.startDate) : Promise.resolve([]),
    queryCustomersSparkline(sparklineMonths),
    compPeriod
      ? queryRetentionRate(currentPeriod.startDate, compPeriod.startDate)
      : queryRetentionRate(
          currentPeriod.startDate,
          // Default: previous month
          new Date(new Date(currentPeriod.startDate).getFullYear(), new Date(currentPeriod.startDate).getMonth() - 1, 1).toISOString()
        ),
    compPeriod
      ? (() => {
          const prevOfComp = getComparisonPeriod(compPeriod, 'previous');
          return prevOfComp
            ? queryRetentionRate(compPeriod.startDate, prevOfComp.startDate)
            : Promise.resolve(0);
        })()
      : Promise.resolve(0),
    queryFunnel(),
  ]);

  // Aggregate current and previous values
  const curRev = sumRevenue(revenueRows);
  const prevRev = sumRevenue(prevRevenueRows);
  const curTrip = sumTrips(tripRows);
  const prevTrip = sumTrips(prevTripRows);
  const curNps = sumNps(npsRows);
  const prevNps = sumNps(prevNpsRows);
  const curVehRev = vehRevRows[0] || { ticket_revenue: 0, ancillary_revenue: 0 };
  const prevVehRev = prevVehRevRows[0] || { ticket_revenue: 0, ancillary_revenue: 0 };
  const curCust = custRows[0] || { transacting_users: 0, new_customers: 0, repeat_customers: 0, multi_order_customers: 0 };
  const prevCust = prevCustRows[0] || { transacting_users: 0, new_customers: 0, repeat_customers: 0, multi_order_customers: 0 };

  // Funnel aggregation (all channels combined)
  const funnelTotalSessions = funnelRows.reduce((s, r) => s + Number(r.total_sessions), 0);
  const funnelBookings = funnelRows.reduce((s, r) => s + Number(r.bookings), 0);
  const funnelConversion = funnelTotalSessions > 0 ? (funnelBookings / funnelTotalSessions) * 100 : 0;
  const funnelMobileSessions = funnelRows.find(r => r.channel_id === 'app')?.total_sessions || 0;
  const funnelSeatDropoff = funnelRows.length > 0
    ? funnelRows.reduce((s, r) => s + Number(r.seat_dropoff_rate), 0) / funnelRows.length
    : 0;
  const funnelCheckout = funnelRows.length > 0
    ? funnelRows.reduce((s, r) => s + Number(r.checkout_completion_rate), 0) / funnelRows.length
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

  // ─── Revenue metrics ──────────────────────────────────────────────

  addMetric(
    'metric-revenue-total',
    curRev.totalRevenue,
    prevRev.totalRevenue,
    'up_is_good',
    formatIDR,
    buildRevenueSparkline(revSparkRows, sparklineMonths, agg => agg.totalRevenue),
  );

  addMetric(
    'metric-revenue-aov',
    curRev.totalOrders > 0 ? curRev.totalRevenue / curRev.totalOrders : 0,
    prevRev.totalOrders > 0 ? prevRev.totalRevenue / prevRev.totalOrders : 0,
    'up_is_good',
    formatIDR,
    buildRevenueSparkline(revSparkRows, sparklineMonths, agg =>
      agg.totalOrders > 0 ? agg.totalRevenue / agg.totalOrders : 0
    ),
  );

  addMetric(
    'metric-revenue-per-route',
    curRev.routeCount > 0 ? curRev.totalRevenue / curRev.routeCount : 0,
    prevRev.routeCount > 0 ? prevRev.totalRevenue / prevRev.routeCount : 0,
    'up_is_good',
    formatIDR,
    buildRevenueSparkline(revSparkRows, sparklineMonths, agg =>
      agg.routeCount > 0 ? agg.totalRevenue / agg.routeCount : 0
    ),
  );

  addMetric(
    'metric-revenue-spend-per-user',
    curRev.uniqueCustomers > 0 ? curRev.totalRevenue / curRev.uniqueCustomers : 0,
    prevRev.uniqueCustomers > 0 ? prevRev.totalRevenue / prevRev.uniqueCustomers : 0,
    'up_is_good',
    formatIDR,
    buildRevenueSparkline(revSparkRows, sparklineMonths, agg =>
      agg.uniqueCustomers > 0 ? agg.totalRevenue / agg.uniqueCustomers : 0
    ),
  );

  // Ticket Revenue (from vehicle revenue — fleet-level)
  addMetric(
    'metric-revenue-ticket',
    Number(curVehRev.ticket_revenue),
    Number(prevVehRev.ticket_revenue),
    'up_is_good',
    formatIDR,
    buildVehicleRevenueSparkline(vehRevSparkRows, sparklineMonths, 'ticket_revenue'),
  );

  // Ancillary Revenue (from vehicle revenue)
  addMetric(
    'metric-revenue-ancillary',
    Number(curVehRev.ancillary_revenue),
    Number(prevVehRev.ancillary_revenue),
    'up_is_good',
    formatIDR,
    buildVehicleRevenueSparkline(vehRevSparkRows, sparklineMonths, 'ancillary_revenue'),
  );

  // ─── Customer metrics ─────────────────────────────────────────────

  addMetric(
    'metric-customers-transacting',
    Number(curCust.transacting_users),
    Number(prevCust.transacting_users),
    'up_is_good',
    formatNumber,
    buildCustomerSparkline(custSparkRows, sparklineMonths, 'transacting_users'),
    `${currentPeriod.label} · All Segments`,
  );

  addMetric(
    'metric-customers-new',
    Number(curCust.new_customers),
    Number(prevCust.new_customers),
    'up_is_good',
    formatNumber,
    buildCustomerSparkline(custSparkRows, sparklineMonths, 'new_customers'),
    `${currentPeriod.label} · All Channels`,
  );

  addMetric(
    'metric-customers-repeat',
    Number(curCust.repeat_customers),
    Number(prevCust.repeat_customers),
    'up_is_good',
    formatNumber,
    buildCustomerSparkline(custSparkRows, sparklineMonths, 'repeat_customers'),
    `${currentPeriod.label} · All Segments`,
  );

  // Retention Rate
  const retChangePct = noComparison ? 0 : computeChangePercent(retentionRate, prevRetentionRate);
  result.set('metric-customers-retention', {
    filterContext: `${currentPeriod.label} · All Segments`,
    comparisonLabel: noComparison ? '' : comparisonLabel,
    currentValue: formatPercent(retentionRate),
    changePercent: retChangePct,
    changeAbsolute: noComparison ? 'N/A' : `${retChangePct >= 0 ? '+' : ''}${(retentionRate - prevRetentionRate).toFixed(1)}pp`,
    status: noComparison ? 'healthy' as MetricStatus : determineStatus(retChangePct, 'up_is_good'),
    sparklineData: [], // Retention sparkline requires expensive cross-period queries; skip for now
    insight: { text: '', boldParts: [] },
  });

  // NPS Score
  addMetric(
    'metric-customers-nps',
    curNps.npsScore,
    prevNps.npsScore,
    'up_is_good',
    (v) => v.toFixed(1),
    buildNpsSparkline(npsSparkRows, sparklineMonths),
  );

  // ─── Operations metrics ───────────────────────────────────────────

  // OTP
  const curOtp = curTrip.totalTrips > 0 ? (curTrip.onTimeTrips / curTrip.totalTrips) * 100 : 0;
  const prevOtp = prevTrip.totalTrips > 0 ? (prevTrip.onTimeTrips / prevTrip.totalTrips) * 100 : 0;
  addMetric(
    'metric-ops-otp',
    curOtp,
    prevOtp,
    'up_is_good',
    formatPercent,
    buildTripSparkline(tripSparkRows, sparklineMonths, agg =>
      agg.totalTrips > 0 ? (agg.onTimeTrips / agg.totalTrips) * 100 : 0
    ),
  );

  // Avg Delay
  addMetric(
    'metric-ops-delay',
    curTrip.avgDelay,
    prevTrip.avgDelay,
    'down_is_good',
    formatMinutes,
    buildTripSparkline(tripSparkRows, sparklineMonths, agg => agg.avgDelay),
  );

  // Trips Completed
  addMetric(
    'metric-ops-trips',
    curTrip.completedTrips,
    prevTrip.completedTrips,
    'up_is_good',
    formatNumber,
    buildTripSparkline(tripSparkRows, sparklineMonths, agg => agg.completedTrips),
  );

  // Fleet Utilization (active vehicles / 25 total fleet * 100)
  const TOTAL_FLEET = 25;
  const curFleetUtil = (curTrip.activeVehicles / TOTAL_FLEET) * 100;
  const prevFleetUtil = prevTrip.totalTrips > 0 ? (prevTrip.activeVehicles / TOTAL_FLEET) * 100 : 0;
  addMetric(
    'metric-ops-fleet-util',
    curFleetUtil,
    prevFleetUtil,
    'up_is_good',
    formatPercent,
    buildTripSparkline(tripSparkRows, sparklineMonths, agg =>
      (agg.activeVehicles / TOTAL_FLEET) * 100
    ),
    `${currentPeriod.label} · All Fleets`,
  );

  // Cancellation Rate (using metric-ops-cancellation — matches metricsData.ts ID)
  addMetric(
    'metric-ops-cancellation',
    curRev.totalOrders > 0 ? (curRev.cancelledOrders / curRev.totalOrders) * 100 : 0,
    prevRev.totalOrders > 0 ? (prevRev.cancelledOrders / prevRev.totalOrders) * 100 : 0,
    'down_is_good',
    formatPercent,
    buildRevenueSparkline(revSparkRows, sparklineMonths, agg =>
      agg.totalOrders > 0 ? (agg.cancelledOrders / agg.totalOrders) * 100 : 0
    ),
  );

  // ─── Product metrics (funnel — aggregate, no date dimension) ─────
  // Funnel data has no date column so it's always aggregate.
  // Use same filterContext format as other cards for visual consistency.

  addMetric(
    'metric-product-conversion',
    funnelConversion,
    0,
    'up_is_good',
    formatPercent,
    [],
    filterContext, // Use the same period-based context as other cards
  );
  // Override: funnel has no date dimension so comparison is never applicable
  const convEntry = result.get('metric-product-conversion')!;
  convEntry.changePercent = 0;
  convEntry.changeAbsolute = 'N/A';
  convEntry.comparisonLabel = '';
  convEntry.status = funnelConversion >= 30 ? 'healthy' : funnelConversion >= 20 ? 'warning' : 'critical';

  addMetric(
    'metric-product-sessions',
    Number(funnelMobileSessions),
    0,
    'up_is_good',
    formatNumber,
    [],
    filterContext,
  );
  const sessEntry = result.get('metric-product-sessions')!;
  sessEntry.changePercent = 0;
  sessEntry.changeAbsolute = 'N/A';
  sessEntry.comparisonLabel = '';
  sessEntry.status = 'healthy';

  addMetric(
    'metric-product-seat-dropoff',
    funnelSeatDropoff,
    0,
    'down_is_good',
    formatPercent,
    [],
    filterContext,
  );
  const dropEntry = result.get('metric-product-seat-dropoff')!;
  dropEntry.changePercent = 0;
  dropEntry.changeAbsolute = 'N/A';
  dropEntry.comparisonLabel = '';
  dropEntry.status = funnelSeatDropoff <= 25 ? 'healthy' : funnelSeatDropoff <= 35 ? 'warning' : 'critical';

  addMetric(
    'metric-product-checkout',
    funnelCheckout,
    0,
    'up_is_good',
    formatPercent,
    [],
    filterContext,
  );
  const checkEntry = result.get('metric-product-checkout')!;
  checkEntry.changePercent = 0;
  checkEntry.changeAbsolute = 'N/A';
  checkEntry.comparisonLabel = '';
  checkEntry.status = funnelCheckout >= 60 ? 'healthy' : funnelCheckout >= 45 ? 'warning' : 'critical';

  return result;
}

// ─── Legacy exports for backward compatibility ───────────────────────

export async function fetchMetricDefinitions() {
  // No longer needed — definitions live in metricsData.ts
  return [];
}

export async function fetchMetricData(_metricId: string) {
  // No longer needed — use fetchAllMetricDisplayData instead
  return null;
}

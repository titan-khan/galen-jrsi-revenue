// =============================================================================
// Metric Queries — Batch queries against Gold layer views
// Returns raw DB rows; metricService.ts computes display values from these.
// =============================================================================

import { supabase } from "@/integrations/supabase/client";
import { toMonthStart, toNpsMonthFormat } from "./periodUtils";

// ─── Response types ──────────────────────────────────────────────────

export interface RevenueRow {
  month: string;
  route_id: string;
  total_orders: number;
  unique_customers: number;
  total_revenue: number;
  avg_order_value: number;
  cancelled_orders: number;
  valid_orders: number;
  net_revenue: number;
}

export interface TripRow {
  month: string;
  route_id: string;
  total_trips: number;
  completed_trips: number;
  on_time_trips: number;
  avg_delay_minutes: number;
  active_vehicles: number;
  active_drivers: number;
}

export interface NpsRow {
  month: string;
  route_id: string;
  promoters: number;
  passives: number;
  detractors: number;
  total_responses: number;
  nps_score: number;
}

export interface VehicleRevenueRow {
  month: string;
  ticket_revenue: number;
  ancillary_revenue: number;
  total_revenue: number;
  operating_cost: number;
  active_vehicles: number;
}

export interface CustomerRow {
  month: string;
  transacting_users: number;
  new_customers: number;
  repeat_customers: number;
  multi_order_customers: number;
}

export interface FunnelRow {
  channel_id: string;
  total_sessions: number;
  bookings: number;
  conversion_rate: number;
  seat_dropoff_rate: number;
  checkout_completion_rate: number;
}

// ─── Core query executor ─────────────────────────────────────────────

async function runQuery<T>(sql: string): Promise<T[]> {
  const { data, error } = await supabase.rpc('execute_raw_query', {
    query_text: sql,
  });

  if (error) {
    console.error('DB query error:', error.message, '\nSQL:', sql);
    return [];
  }

  // The RPC returns JSON directly — could be an array or null
  if (!data) return [];
  return data as unknown as T[];
}

// ─── Revenue ─────────────────────────────────────────────────────────

export async function queryRevenue(
  monthDate: string,
  routeId: string | null
): Promise<RevenueRow[]> {
  const monthStart = toMonthStart(monthDate);
  return runQuery<RevenueRow>(`
    SELECT * FROM v_monthly_revenue
    WHERE month = '${monthStart}'::date
    ${routeId ? `AND route_id = '${routeId}'` : ''}
  `);
}

export async function queryRevenueSparkline(
  months: Array<{ startDate: string }>,
  routeId: string | null
): Promise<RevenueRow[]> {
  const monthStarts = months.map(m => `'${toMonthStart(m.startDate)}'::date`).join(',');
  return runQuery<RevenueRow>(`
    SELECT * FROM v_monthly_revenue
    WHERE month IN (${monthStarts})
    ${routeId ? `AND route_id = '${routeId}'` : ''}
    ORDER BY month
  `);
}

// ─── Trips ───────────────────────────────────────────────────────────

export async function queryTrips(
  monthDate: string,
  routeId: string | null
): Promise<TripRow[]> {
  const monthStart = toMonthStart(monthDate);
  return runQuery<TripRow>(`
    SELECT * FROM v_monthly_trips
    WHERE month = '${monthStart}'::date
    ${routeId ? `AND route_id = '${routeId}'` : ''}
  `);
}

export async function queryTripsSparkline(
  months: Array<{ startDate: string }>,
  routeId: string | null
): Promise<TripRow[]> {
  const monthStarts = months.map(m => `'${toMonthStart(m.startDate)}'::date`).join(',');
  return runQuery<TripRow>(`
    SELECT * FROM v_monthly_trips
    WHERE month IN (${monthStarts})
    ${routeId ? `AND route_id = '${routeId}'` : ''}
    ORDER BY month
  `);
}

// ─── NPS ─────────────────────────────────────────────────────────────

export async function queryNps(
  monthDate: string,
  routeId: string | null
): Promise<NpsRow[]> {
  const npsMonth = toNpsMonthFormat(monthDate);
  return runQuery<NpsRow>(`
    SELECT * FROM v_monthly_nps
    WHERE month = '${npsMonth}'
    ${routeId ? `AND route_id = '${routeId}'` : ''}
  `);
}

export async function queryNpsSparkline(
  months: Array<{ startDate: string }>,
  routeId: string | null
): Promise<NpsRow[]> {
  const npsMonths = months.map(m => `'${toNpsMonthFormat(m.startDate)}'`).join(',');
  return runQuery<NpsRow>(`
    SELECT * FROM v_monthly_nps
    WHERE month IN (${npsMonths})
    ${routeId ? `AND route_id = '${routeId}'` : ''}
    ORDER BY month
  `);
}

// ─── Vehicle Revenue ─────────────────────────────────────────────────

export async function queryVehicleRevenue(
  monthDate: string
): Promise<VehicleRevenueRow[]> {
  const monthStart = toMonthStart(monthDate);
  return runQuery<VehicleRevenueRow>(`
    SELECT * FROM v_monthly_vehicle_revenue
    WHERE month = '${monthStart}'::date
  `);
}

export async function queryVehicleRevenueSparkline(
  months: Array<{ startDate: string }>
): Promise<VehicleRevenueRow[]> {
  const monthStarts = months.map(m => `'${toMonthStart(m.startDate)}'::date`).join(',');
  return runQuery<VehicleRevenueRow>(`
    SELECT * FROM v_monthly_vehicle_revenue
    WHERE month IN (${monthStarts})
    ORDER BY month
  `);
}

// ─── Customers ───────────────────────────────────────────────────────

export async function queryCustomers(
  monthDate: string
): Promise<CustomerRow[]> {
  const monthStart = toMonthStart(monthDate);
  return runQuery<CustomerRow>(`
    SELECT * FROM v_monthly_customers
    WHERE month = '${monthStart}'::date
  `);
}

export async function queryCustomersSparkline(
  months: Array<{ startDate: string }>
): Promise<CustomerRow[]> {
  const monthStarts = months.map(m => `'${toMonthStart(m.startDate)}'::date`).join(',');
  return runQuery<CustomerRow>(`
    SELECT * FROM v_monthly_customers
    WHERE month IN (${monthStarts})
    ORDER BY month
  `);
}

// ─── Retention ───────────────────────────────────────────────────────

export async function queryRetentionRate(
  currentMonthDate: string,
  previousMonthDate: string
): Promise<number> {
  const currentStart = toMonthStart(currentMonthDate);
  const previousStart = toMonthStart(previousMonthDate);

  const rows = await runQuery<{ prev_count: number; retained_count: number }>(`
    WITH current_customers AS (
      SELECT DISTINCT customer_id
      FROM fact_revenue
      WHERE date_trunc('month', booking_datetime)::date = '${currentStart}'::date
        AND ticket_status != 'cancelled'
    ),
    previous_customers AS (
      SELECT DISTINCT customer_id
      FROM fact_revenue
      WHERE date_trunc('month', booking_datetime)::date = '${previousStart}'::date
        AND ticket_status != 'cancelled'
    )
    SELECT
      COUNT(DISTINCT pc.customer_id)::int AS prev_count,
      COUNT(DISTINCT CASE WHEN cc.customer_id IS NOT NULL THEN pc.customer_id END)::int AS retained_count
    FROM previous_customers pc
    LEFT JOIN current_customers cc ON cc.customer_id = pc.customer_id
  `);

  if (rows.length === 0) return 0;
  const { prev_count, retained_count } = rows[0];
  if (prev_count === 0) return 0;
  return Math.round((retained_count / prev_count) * 1000) / 10;
}

// ─── Funnel (all-time, no date filter) ───────────────────────────────

export async function queryFunnel(): Promise<FunnelRow[]> {
  return runQuery<FunnelRow>(`SELECT * FROM v_funnel_summary`);
}

// =============================================================================
// LogistiQ Metric Queries — Batch queries against Gold layer views
// Returns raw DB rows; metricService computes display values from these.
// =============================================================================

import { supabase } from "@/integrations/supabase/client";

// ─── Response types ──────────────────────────────────────────────────

export interface LogistiqOrderRow {
  order_month: string;
  client_id: string;
  warehouse_id: string;
  total_orders: number;
  total_quantity: number;
  total_gmv: number;
  total_cogs: number;
  avg_order_value: number;
  total_weight_kg: number;
  avg_storage_days: number;
  total_receiving_fee: number;
  total_storage_fee: number;
  total_pick_pack_fee: number;
  total_qc_inspection_fee: number;
  total_kitting_fee: number;
  total_special_packaging_fee: number;
  total_fulfillment_fee: number;
  total_shipping_cost: number;
  total_returns_cost: number;
  total_logistiq_revenue: number;
  total_logistiq_direct_costs: number;
  total_contribution_margin: number;
  avg_cm_pct: number;
  returned_orders: number;
  total_pallets_used: number;
}

export interface LogistiqOrderLineRow {
  order_month: string;
  client_id: string;
  warehouse_id: string;
  category: string;
  total_gmv: number;
  total_cogs: number;
  total_weight_grams: number;
  total_gross_profit: number;
  avg_cogs_pct: number;
  avg_margin_pct: number;
  avg_storage_days: number;
  line_count: number;
}

export interface LogistiqWarehouseUtilRow {
  warehouse_id: string;
  warehouse_name: string;
  total_pallets_used: number;
  total_capacity_pallets: number;
  utilization_pct: number;
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

// ─── Helpers ─────────────────────────────────────────────────────────

/** Convert "2025-12-01" → "2025-12" for LogistiQ month format */
function toLogistiqMonth(dateStr: string): string {
  return dateStr.substring(0, 7);
}

// ─── Orders ──────────────────────────────────────────────────────────

export async function queryLogistiqOrders(
  monthDate: string,
  clientId: string | null
): Promise<LogistiqOrderRow[]> {
  const month = toLogistiqMonth(monthDate);
  return runQuery<LogistiqOrderRow>(`
    SELECT * FROM v_logistiq_monthly_orders
    WHERE order_month = '${month}'
    ${clientId ? `AND client_id = '${clientId}'` : ''}
  `);
}

export async function queryLogistiqOrdersSparkline(
  months: Array<{ startDate: string }>,
  clientId: string | null
): Promise<LogistiqOrderRow[]> {
  const monthList = months.map(m => `'${toLogistiqMonth(m.startDate)}'`).join(',');
  return runQuery<LogistiqOrderRow>(`
    SELECT * FROM v_logistiq_monthly_orders
    WHERE order_month IN (${monthList})
    ${clientId ? `AND client_id = '${clientId}'` : ''}
    ORDER BY order_month
  `);
}

// ─── Order Lines ─────────────────────────────────────────────────────

export async function queryLogistiqOrderLines(
  monthDate: string,
  clientId: string | null
): Promise<LogistiqOrderLineRow[]> {
  const month = toLogistiqMonth(monthDate);
  return runQuery<LogistiqOrderLineRow>(`
    SELECT * FROM v_logistiq_monthly_order_lines
    WHERE order_month = '${month}'
    ${clientId ? `AND client_id = '${clientId}'` : ''}
  `);
}

export async function queryLogistiqOrderLinesSparkline(
  months: Array<{ startDate: string }>,
  clientId: string | null
): Promise<LogistiqOrderLineRow[]> {
  const monthList = months.map(m => `'${toLogistiqMonth(m.startDate)}'`).join(',');
  return runQuery<LogistiqOrderLineRow>(`
    SELECT * FROM v_logistiq_monthly_order_lines
    WHERE order_month IN (${monthList})
    ${clientId ? `AND client_id = '${clientId}'` : ''}
    ORDER BY order_month
  `);
}

// ─── Warehouse Utilization ───────────────────────────────────────────

export async function queryLogistiqWarehouseUtilization(
  monthDate: string
): Promise<LogistiqWarehouseUtilRow[]> {
  const month = toLogistiqMonth(monthDate);
  return runQuery<LogistiqWarehouseUtilRow>(`
    SELECT
      fo.warehouse_id,
      dw.warehouse_name,
      SUM(fo.pallets_used) as total_pallets_used,
      dw.total_capacity_pallets,
      ROUND(SUM(fo.pallets_used)::numeric / NULLIF(dw.total_capacity_pallets, 0) * 100, 1) as utilization_pct
    FROM fact_orders fo
    JOIN dim_warehouse dw ON fo.warehouse_id = dw.warehouse_id
    WHERE fo.order_month = '${month}'
    GROUP BY fo.warehouse_id, dw.warehouse_name, dw.total_capacity_pallets
  `);
}

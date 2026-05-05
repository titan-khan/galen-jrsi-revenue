import type { TargetTableDefinition, TargetTableName, TargetColumn } from '@/types/dataConnector';

// ---------------------------------------------------------------------------
// Static registry of all fact / dimension tables in the LogistiQ data warehouse.
// Supabase project: oxotsdusfrtzjsugkszu (LogistiQ only — no TransportX)
//
// `required` = column must be provided during CSV upload.
// `autoGeneratePk` = PK is a default-gen UUID; users do not need to supply it.
// ---------------------------------------------------------------------------

function col(
  name: string,
  type: TargetColumn['type'],
  opts: Partial<Pick<TargetColumn, 'required' | 'isPrimaryKey' | 'isForeignKey' | 'referencedTable' | 'referencedColumn'>> = {},
): TargetColumn {
  return {
    name,
    type,
    required: opts.required ?? false,
    isPrimaryKey: opts.isPrimaryKey ?? false,
    isForeignKey: opts.isForeignKey ?? false,
    referencedTable: opts.referencedTable,
    referencedColumn: opts.referencedColumn,
  };
}

// ── Dimension Tables ─────────────────────────────────────────────────────────

const dim_channel: TargetTableDefinition = {
  name: 'dim_channel',
  displayName: 'Channels',
  category: 'dimension',
  primaryKey: 'channel_id',
  autoGeneratePk: false,
  fkDependencies: [],
  columns: [
    col('channel_id', 'string', { required: true, isPrimaryKey: true }),
    col('channel_name', 'string', { required: true }),
    col('channel_type', 'string', { required: true }),
    col('typical_aov', 'number'),
    col('order_complexity', 'string'),
  ],
};

const dim_client: TargetTableDefinition = {
  name: 'dim_client',
  displayName: 'Clients',
  category: 'dimension',
  primaryKey: 'client_id',
  autoGeneratePk: false,
  fkDependencies: [],
  columns: [
    col('client_id', 'string', { required: true, isPrimaryKey: true }),
    col('client_name', 'string', { required: true }),
    col('industry', 'string', { required: true }),
    col('storage_type_primary', 'string'),
    col('contract_start_date', 'date'),
    col('monthly_min_commitment', 'number'),
    col('target_orders_monthly', 'number'),
    col('avg_aov_target', 'number'),
    col('primary_channels', 'string'),
    col('special_requirements', 'string'),
  ],
};

const dim_delivery_partner: TargetTableDefinition = {
  name: 'dim_delivery_partner',
  displayName: 'Delivery Partners',
  category: 'dimension',
  primaryKey: 'partner_id',
  autoGeneratePk: false,
  fkDependencies: [],
  columns: [
    col('partner_id', 'string', { required: true, isPrimaryKey: true }),
    col('partner_name', 'string', { required: true }),
    col('service_type', 'string', { required: true }),
    col('base_rate_per_kg', 'number'),
    col('avg_delivery_hours', 'number'),
  ],
};

const dim_sku: TargetTableDefinition = {
  name: 'dim_sku',
  displayName: 'SKUs / Products',
  category: 'dimension',
  primaryKey: 'sku_id',
  autoGeneratePk: false,
  fkDependencies: ['dim_client'],
  columns: [
    col('sku_id', 'string', { required: true, isPrimaryKey: true }),
    col('client_id', 'string', { isForeignKey: true, referencedTable: 'dim_client', referencedColumn: 'client_id' }),
    col('sku_name', 'string', { required: true }),
    col('category', 'string', { required: true }),
    col('retail_price', 'number'),
    col('cogs_pct', 'number'),
    col('weight_grams', 'number'),
    col('storage_type_required', 'string'),
    col('fragile', 'boolean'),
    col('units_per_pallet', 'number'),
    col('cogs_per_unit', 'number'),
  ],
};

const dim_warehouse: TargetTableDefinition = {
  name: 'dim_warehouse',
  displayName: 'Warehouses',
  category: 'dimension',
  primaryKey: 'warehouse_id',
  autoGeneratePk: false,
  fkDependencies: [],
  columns: [
    col('warehouse_id', 'string', { required: true, isPrimaryKey: true }),
    col('warehouse_name', 'string', { required: true }),
    col('location', 'string', { required: true }),
    col('total_capacity_pallets', 'number'),
    col('ambient_capacity', 'number'),
    col('cool_16c_capacity', 'number'),
    col('refrigerated_4c_capacity', 'number'),
    col('rent_per_month', 'number'),
    col('utilities_per_month', 'number'),
    col('has_kitting_facility', 'boolean'),
    col('has_qc_station', 'boolean'),
  ],
};

// ── Fact Tables ──────────────────────────────────────────────────────────────

const fact_orders: TargetTableDefinition = {
  name: 'fact_orders',
  displayName: 'Orders',
  category: 'fact',
  primaryKey: 'order_id',
  autoGeneratePk: false,
  fkDependencies: ['dim_client', 'dim_warehouse', 'dim_delivery_partner'],
  columns: [
    col('order_id', 'string', { required: true, isPrimaryKey: true }),
    col('order_month', 'string', { required: true }),
    col('order_date', 'date', { required: true }),
    col('client_id', 'string', { isForeignKey: true, referencedTable: 'dim_client', referencedColumn: 'client_id' }),
    col('warehouse_id', 'string', { isForeignKey: true, referencedTable: 'dim_warehouse', referencedColumn: 'warehouse_id' }),
    col('delivery_partner_id', 'string', { isForeignKey: true, referencedTable: 'dim_delivery_partner', referencedColumn: 'partner_id' }),
    col('channel_id', 'string'),
    col('quantity', 'number'),
    col('num_items', 'number'),
    col('gmv', 'number'),
    col('total_cogs', 'number'),
    col('total_weight_kg', 'number'),
    col('storage_days', 'number'),
    col('pallets_used', 'number'),
    col('receiving_fee', 'number'),
    col('storage_fee', 'number'),
    col('pick_pack_fee', 'number'),
    col('qc_inspection_fee', 'number'),
    col('kitting_fee', 'number'),
    col('special_packaging_fee', 'number'),
    col('total_fulfillment_fee', 'number'),
    col('shipping_cost', 'number'),
    col('returns_cost', 'number'),
    col('logistiq_revenue', 'number'),
    col('logistiq_direct_costs', 'number'),
    col('contribution_margin', 'number'),
    col('contribution_margin_pct', 'number'),
    col('is_returned', 'boolean'),
    col('has_order_lines', 'boolean'),
  ],
};

const fact_order_lines: TargetTableDefinition = {
  name: 'fact_order_lines',
  displayName: 'Order Lines',
  category: 'fact',
  primaryKey: 'order_line_id',
  autoGeneratePk: false,
  fkDependencies: ['dim_client', 'dim_sku', 'dim_warehouse'],
  columns: [
    col('order_line_id', 'string', { required: true, isPrimaryKey: true }),
    col('order_id', 'string', { required: true }),
    col('order_month', 'string', { required: true }),
    col('client_id', 'string', { isForeignKey: true, referencedTable: 'dim_client', referencedColumn: 'client_id' }),
    col('sku_id', 'string', { isForeignKey: true, referencedTable: 'dim_sku', referencedColumn: 'sku_id' }),
    col('warehouse_id', 'string', { isForeignKey: true, referencedTable: 'dim_warehouse', referencedColumn: 'warehouse_id' }),
    col('category', 'string'),
    col('quantity', 'number'),
    col('unit_retail_price', 'number'),
    col('unit_cogs', 'number'),
    col('unit_weight_grams', 'number'),
    col('gmv', 'number'),
    col('total_cogs', 'number'),
    col('total_weight_grams', 'number'),
    col('gross_profit', 'number'),
    col('cogs_pct', 'number'),
    col('margin_pct', 'number'),
    col('storage_days', 'number'),
  ],
};

// ── Public Registry ──────────────────────────────────────────────────────────

export const TARGET_TABLES: Record<TargetTableName, TargetTableDefinition> = {
  // Dimensions
  dim_channel,
  dim_client,
  dim_delivery_partner,
  dim_sku,
  dim_warehouse,
  // Facts
  fact_orders,
  fact_order_lines,
};

/** Grouped list for UI selectors. */
export function getTargetTableOptions(): { label: string; tables: TargetTableDefinition[] }[] {
  const all = Object.values(TARGET_TABLES);
  return [
    { label: 'Fact Tables', tables: all.filter((t) => t.category === 'fact') },
    { label: 'Dimension Tables', tables: all.filter((t) => t.category === 'dimension') },
  ];
}

/** Columns the user can map to (excludes created_at and auto-gen PKs). */
export function getInsertableColumns(table: TargetTableDefinition): TargetColumn[] {
  return table.columns.filter((c) => {
    if (c.name === 'created_at') return false;
    if (c.isPrimaryKey && table.autoGeneratePk) return false;
    return true;
  });
}

// =============================================================================
// QUERY SPECS — Per-intent-category database query definitions
// Maps each IntentCategory to declarative QueryContextSpec arrays
//
// Fact tables use adaptiveConfig instead of static limits — the query resolver
// runs a lightweight COUNT(*) pre-query and sizes the fetch dynamically.
// Dimension/reference tables keep fixed limits since their size is stable.
// =============================================================================

interface QueryFilter {
  field: string;
  operator: string;
  value: string | number | boolean | string[];
}

// Adaptive config tells the query resolver how to size fetches dynamically
export interface AdaptiveConfig {
  maxLimit: number;    // absolute ceiling — never fetch more than this
  displayCap: number;  // how many rows buildDbContextSection shows to Claude
}

export interface QueryContextSpec {
  table: string;
  select: string[];
  filters?: QueryFilter[];
  orderBy?: { field: string; ascending: boolean };
  limit?: number;           // fixed limit (for dim/reference tables)
  adaptiveConfig?: AdaptiveConfig;  // dynamic limit (for fact tables)
}

// ---------------------------------------------------------------------------
// Rolling 13-month date floor — scope filter for time-series fact tables.
// Computed once per edge function invocation (short-lived, so always fresh).
// ---------------------------------------------------------------------------
const ROLLING_13M_FLOOR = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 13);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
})();

export { ROLLING_13M_FLOOR };

export const QUERY_SPECS_BY_INTENT: Record<string, QueryContextSpec[]> = {
  revenue: [
    {
      table: 'fact_revenue',
      select: [
        'gross_value_amount', 'booking_datetime', 'route_id',
        'origin_city', 'destination_city', 'customer_id', 'ticket_status',
      ],
      filters: [{ field: 'booking_datetime', operator: 'gte', value: ROLLING_13M_FLOOR }],
      orderBy: { field: 'booking_datetime', ascending: false },
      adaptiveConfig: { maxLimit: 2000, displayCap: 150 },
    },
    {
      table: 'dim_route',
      select: ['route_id', 'route_name', 'origin_city', 'destination_city', 'price_card', 'distance_km'],
      filters: [{ field: 'active_flag', operator: 'eq', value: true }],
    },
    {
      table: 'dim_customer',
      select: ['customer_id', 'customer_type', 'loyalty_tier', 'home_city'],
      filters: [{ field: 'active_flag', operator: 'eq', value: true }],
      limit: 200,
    },
  ],

  nps: [
    {
      table: 'fact_nps_response',
      select: [
        'month', 'customer_type', 'route_id',
        'promoters_count', 'passives_count', 'detractors_count', 'total_responses',
      ],
      filters: [{ field: 'month', operator: 'gte', value: ROLLING_13M_FLOOR.slice(0, 7) }],
      orderBy: { field: 'month', ascending: false },
      adaptiveConfig: { maxLimit: 1000, displayCap: 150 },
    },
    {
      table: 'fact_nps_response_raw',
      select: ['month', 'customer_type', 'route_id', 'nps_score', 'survey_channel'],
      filters: [{ field: 'month', operator: 'gte', value: ROLLING_13M_FLOOR.slice(0, 7) }],
      orderBy: { field: 'month', ascending: false },
      adaptiveConfig: { maxLimit: 1000, displayCap: 150 },
    },
  ],

  operations: [
    {
      table: 'fact_trip',
      select: [
        'trip_id', 'trip_date', 'trip_status', 'is_on_time',
        'delay_minutes', 'route_id', 'driver_id', 'vehicle_id',
      ],
      filters: [{ field: 'trip_date', operator: 'gte', value: ROLLING_13M_FLOOR }],
      orderBy: { field: 'trip_date', ascending: false },
      adaptiveConfig: { maxLimit: 5000, displayCap: 150 },
    },
    {
      table: 'dim_driver',
      select: ['driver_id', 'driver_name', 'employment_type', 'experience_years'],
      filters: [{ field: 'active_flag', operator: 'eq', value: true }],
    },
    {
      table: 'dim_route',
      select: ['route_id', 'route_name', 'origin_city', 'destination_city'],
      filters: [{ field: 'active_flag', operator: 'eq', value: true }],
    },
  ],

  fleet: [
    {
      table: 'dim_vehicle',
      select: [
        'vehicle_id', 'vehicle_code', 'vehicle_type', 'vehicle_class',
        'seat_capacity', 'fleet_id', 'active_flag',
      ],
      filters: [{ field: 'active_flag', operator: 'eq', value: true }],
    },
    {
      table: 'dim_driver',
      select: ['driver_id', 'driver_name', 'employment_type', 'experience_years'],
      filters: [{ field: 'active_flag', operator: 'eq', value: true }],
    },
    {
      table: 'fact_vehicle_revenue',
      select: ['vehicle_id', 'fleet_id', 'revenue_date', 'total_revenue', 'operating_cost'],
      filters: [{ field: 'revenue_date', operator: 'gte', value: ROLLING_13M_FLOOR }],
      orderBy: { field: 'revenue_date', ascending: false },
      adaptiveConfig: { maxLimit: 2000, displayCap: 150 },
    },
    {
      table: 'dim_fleet',
      select: ['fleet_id', 'fleet_name', 'fleet_category', 'vehicle_type', 'service_level'],
      filters: [{ field: 'active_flag', operator: 'eq', value: true }],
    },
  ],

  funnel: [
    {
      table: 'fact_funnel',
      select: [
        'session_id', 'channel_id', 'homepage_flag',
        'trip_input_page_flag', 'trip_option_page_flag',
        'seat_option_page_flag', 'booking_page_flag', 'order_id',
      ],
      adaptiveConfig: { maxLimit: 1000, displayCap: 150 },
    },
  ],

  agents: [
    {
      table: 'agents',
      select: [
        'id', 'name', 'description', 'status', 'category',
        'trust_score', 'total_runs', 'last_run_at',
      ],
    },
    {
      table: 'agent_recommendations',
      select: [
        'id', 'agent_id', 'title', 'description', 'priority',
        'status', 'potential_impact', 'created_at',
      ],
      orderBy: { field: 'created_at', ascending: false },
      limit: 50,
    },
    {
      table: 'agent_runs',
      select: [
        'id', 'agent_id', 'status', 'trigger',
        'started_at', 'completed_at', 'findings',
      ],
      orderBy: { field: 'started_at', ascending: false },
      limit: 20,
    },
    {
      table: 'agent_skills',
      select: ['id', 'name', 'display_name', 'description', 'category', 'is_active'],
      filters: [{ field: 'is_active', operator: 'eq', value: true }],
    },
  ],

  general: [
    {
      table: 'fact_revenue',
      select: ['gross_value_amount', 'booking_datetime', 'origin_city', 'destination_city'],
      filters: [{ field: 'booking_datetime', operator: 'gte', value: ROLLING_13M_FLOOR }],
      orderBy: { field: 'booking_datetime', ascending: false },
      adaptiveConfig: { maxLimit: 2000, displayCap: 150 },
    },
    {
      table: 'fact_nps_response',
      select: ['month', 'promoters_count', 'detractors_count', 'total_responses'],
      filters: [{ field: 'month', operator: 'gte', value: ROLLING_13M_FLOOR.slice(0, 7) }],
      orderBy: { field: 'month', ascending: false },
      adaptiveConfig: { maxLimit: 1000, displayCap: 150 },
    },
    {
      table: 'fact_trip',
      select: ['trip_date', 'is_on_time', 'delay_minutes'],
      filters: [{ field: 'trip_date', operator: 'gte', value: ROLLING_13M_FLOOR }],
      orderBy: { field: 'trip_date', ascending: false },
      adaptiveConfig: { maxLimit: 5000, displayCap: 150 },
    },
    {
      table: 'agents',
      select: ['id', 'name', 'status', 'trust_score', 'last_run_at'],
    },
    {
      table: 'agent_recommendations',
      select: ['id', 'agent_id', 'title', 'priority', 'status'],
      filters: [{ field: 'status', operator: 'in', value: ['proposed', 'approved'] }],
      limit: 10,
    },
  ],

  metadata: [
    {
      table: 'metadata_business_dictionary',
      select: ['term', 'full_name', 'business_definition', 'category', 'agent_guidance'],
    },
    {
      table: 'metadata_data_dictionary',
      select: ['table_name', 'column_name', 'data_type', 'business_definition'],
      limit: 100,
    },
  ],
};

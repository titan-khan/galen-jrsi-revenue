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

// JRSI workspace ID for filtering
const JRSI_WORKSPACE_ID = '32ef0116-97ea-4f39-ad9b-9a978862b9a2';

// Common JRSI kecelakaan query spec
const JRSI_KECELAKAAN_SPEC: QueryContextSpec = {
  table: 'jrsi irsms example',
  select: [
    'idKecelakaan', 'tanggal', 'waktu', 'hari', 'isWeekend', 'monthYear', 'hourBucket',
    'provinsi', 'kabupatenKota', 'kecamatan',
    'severityMax', 'jumlahMd', 'jumlahLl', 'totalKorban', 'bobotLaka',
    'kasusLaka', 'sifatKecelakaan', 'lakajol',
    'jumlahKendaraan', 'kendaraanSepedaMotor', 'kendaraanMobilPenumpang', 'kendaraanTruk',
    'extractedBrand', 'extractedModel', 'extractedBrandModel',
    'extractedCauses', 'extracted4mCategories',
    'surfaceCondName', 'weatherName', 'roadLight', 'roadGeometry',
    'statusJalan', 'fungsiJalan', 'gpsLuN', 'gpsLsN',
    'jumlahKlaimA', 'jumlahKlaimB',
    'deskripsiKecelakaan',
  ],
  orderBy: { field: 'tanggal', ascending: false },
  adaptiveConfig: { maxLimit: 500, displayCap: 100 },
};

export const QUERY_SPECS_BY_INTENT: Record<string, QueryContextSpec[]> = {
  // JRSI: accident overview, severity, trends
  revenue: [JRSI_KECELAKAAN_SPEC],
  nps: [JRSI_KECELAKAAN_SPEC],
  operations: [JRSI_KECELAKAAN_SPEC],
  fleet: [JRSI_KECELAKAAN_SPEC],
  funnel: [JRSI_KECELAKAAN_SPEC],

  agents: [
    {
      table: 'agents',
      select: [
        'id', 'name', 'description', 'status', 'category',
        'trust_score', 'total_runs', 'last_run_at',
      ],
      filters: [{ field: 'workspace_id', operator: 'eq', value: JRSI_WORKSPACE_ID }],
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
    JRSI_KECELAKAAN_SPEC,
    {
      table: 'agents',
      select: ['id', 'name', 'status', 'trust_score', 'last_run_at'],
      filters: [{ field: 'workspace_id', operator: 'eq', value: JRSI_WORKSPACE_ID }],
    },
    {
      table: 'metric_definitions',
      select: ['id', 'metric_id', 'name', 'definition', 'formula', 'domain', 'dashboard', 'computed_value'],
      filters: [{ field: 'workspace_id', operator: 'eq', value: JRSI_WORKSPACE_ID }],
    },
  ],

  metadata: [
    {
      table: 'metric_definitions',
      select: ['id', 'metric_id', 'name', 'definition', 'formula', 'measure', 'domain', 'granularity', 'source_columns', 'dashboard', 'computed_value', 'notes'],
      filters: [{ field: 'workspace_id', operator: 'eq', value: JRSI_WORKSPACE_ID }],
    },
  ],
};

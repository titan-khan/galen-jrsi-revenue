// =============================================================================
// QUERY SPECS — Per-intent-category database query definitions
// PKB pilot domain: Pajak Kendaraan Bermotor compliance for Jasa Raharja Kalteng
//
// Fact tables use adaptiveConfig instead of static limits — the query resolver
// runs a lightweight COUNT(*) pre-query and sizes the fetch dynamically.
// =============================================================================

interface QueryFilter {
  field: string;
  operator: string;
  value: string | number | boolean | string[];
}

export interface AdaptiveConfig {
  maxLimit: number;
  displayCap: number;
}

export interface QueryContextSpec {
  schema?: string;          // defaults to 'public' when omitted
  table: string;
  select: string[];
  filters?: QueryFilter[];
  orderBy?: { field: string; ascending: boolean };
  limit?: number;
  adaptiveConfig?: AdaptiveConfig;
}

// Rolling 13-month date floor for time-series filters (paid_on text "YYYY-MM-DD")
const ROLLING_13M_FLOOR = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 13);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
})();

export { ROLLING_13M_FLOOR };

// ---------------------------------------------------------------------------
// REUSABLE SPECS
// ---------------------------------------------------------------------------

const REGISTRY_SPEC: QueryContextSpec = {
  schema: 'gold',
  table: 'registry_enriched',
  select: [
    'vehicle_id', 'kabupaten_id', 'kode_jenken',
    'segmen_kepatuhan', 'segmen_nama',
    'durasi_tunggakan_days', 'has_phone', 'has_payment_history',
    'treatment_kanal_utama', 'treatment_kebijakan_amnesti',
    'treatment_aksi_utama', 'treatment_perkiraan_konversi',
    'est_pkb_per_kendaraan', 'usia_kendaraan',
    'merek_kendaraan', 'kecamatan', 'kelurahan',
    'source_period',
  ],
  adaptiveConfig: { maxLimit: 5000, displayCap: 30 },
};

const TRANSAKSI_2025_SPEC: QueryContextSpec = {
  schema: 'gold',
  table: 'transaksi_2025',
  select: [
    'paid_on', 'kabupaten_id', 'upt_id', 'kode_jenken', 'id_layanan',
    'pokok_pkb', 'tunggakan_pokok_pkb',
    'pokok_swdkllj', 'tunggakan_pokok_swdkllj',
    'denda_swdkllj', 'tunggakan_denda_swdkllj',
  ],
  filters: [{ field: 'paid_on', operator: 'gte', value: ROLLING_13M_FLOOR }],
  adaptiveConfig: { maxLimit: 5000, displayCap: 30 },
};

const DIM_KABUPATEN_SPEC: QueryContextSpec = {
  schema: 'gold',
  table: 'dim_kabupaten',
  select: ['kabupaten_id', 'nama_kabupaten', 'tipologi_wilayah'],
  limit: 20,
};

const DIM_JENKEN_SPEC: QueryContextSpec = {
  schema: 'gold',
  table: 'dim_jenken',
  select: ['kode_jenken', 'jenis_kendaraan', 'is_motor', 'est_pkb_per_kendaraan'],
  limit: 20,
};

const DIM_UPT_SPEC: QueryContextSpec = {
  schema: 'gold',
  table: 'dim_upt',
  select: ['upt_id', 'upt_nama', 'kabupaten_id'],
  limit: 20,
};

const DIM_LAYANAN_SPEC: QueryContextSpec = {
  schema: 'gold',
  table: 'dim_layanan',
  select: ['id_layanan', 'nama_layanan', 'kategori'],
  limit: 30,
};

const SEGMEN_SPEC: QueryContextSpec = {
  schema: 'ref',
  table: 'segmen',
  select: ['kode', 'nama', 'warna', 'kelas_pyramid', 'durasi_tunggakan', 'profil_perilaku', 'posisi_pyramid_djp'],
  limit: 10,
};

const TREATMENT_LOOKUP_SPEC: QueryContextSpec = {
  schema: 'ref',
  table: 'treatment_lookup',
  select: ['segmen_kode', 'tujuan_strategis', 'kanal_utama', 'pesan_personalisasi', 'kebijakan_amnesti', 'aksi_utama', 'perkiraan_konversi'],
  limit: 10,
};

const REVENUE_SCENARIO_SPEC: QueryContextSpec = {
  schema: 'ref',
  table: 'revenue_scenario',
  select: ['scenario_id', 'segmen_kode', 'konversi_pct', 'est_pendapatan_idr', 'scenario_label'],
  limit: 30,
};

const PROGRAM_SADAR_SPEC: QueryContextSpec = {
  schema: 'ref',
  table: 'program_sadar',
  select: ['program_id', 'nama', 'deskripsi', 'segmen_sasaran', 'pemangku_kepentingan', 'tipologi_wilayah'],
  limit: 15,
};

const RACI_SPEC: QueryContextSpec = {
  schema: 'ref',
  table: 'raci_matrix',
  select: ['raci_id', 'segmen_kode', 'aksi_kunci', 'jasa_raharja', 'bapenda', 'samsat', 'polri', 'kelurahan', 'vendor_ti'],
  limit: 60,
};

const METRIC_DICTIONARY_SPEC: QueryContextSpec = {
  schema: 'meta',
  table: 'metric_certification',
  select: [
    'metric_id', 'metric_name', 'metric_slug', 'business_domain', 'metric_type',
    'formula', 'unit', 'granularity', 'source_tables',
    'governance_source', 'valid_range_min', 'valid_range_max',
    'certification_level', 'confidence_score',
  ],
  filters: [{ field: 'deprecated', operator: 'eq', value: false }],
  limit: 80,
};

const TABLE_DICTIONARY_SPEC: QueryContextSpec = {
  schema: 'meta',
  table: 'table_metadata',
  select: ['table_id', 'schema_name', 'table_name', 'description', 'business_domain', 'grain', 'refresh_cadence', 'source_system'],
  limit: 30,
};

// ---------------------------------------------------------------------------
// INTENT → SPECS MAP
// ---------------------------------------------------------------------------

export const QUERY_SPECS_BY_INTENT: Record<string, QueryContextSpec[]> = {
  // Compliance pyramid, segments, demographics
  compliance: [REGISTRY_SPEC, SEGMEN_SPEC, DIM_KABUPATEN_SPEC],

  // PKB / SWDKLLJ realization & arrears
  revenue: [TRANSAKSI_2025_SPEC, DIM_KABUPATEN_SPEC, DIM_JENKEN_SPEC, REVENUE_SCENARIO_SPEC],

  // Treatment recommendations, programs, RACI
  treatment: [TREATMENT_LOOKUP_SPEC, PROGRAM_SADAR_SPEC, RACI_SPEC, SEGMEN_SPEC, REVENUE_SCENARIO_SPEC],

  // Geography / kabupaten breakdown
  geography: [DIM_KABUPATEN_SPEC, DIM_UPT_SPEC, REGISTRY_SPEC],

  // Vehicle types
  fleet: [DIM_JENKEN_SPEC, REGISTRY_SPEC],

  // Metric definitions, governance, lineage
  metadata: [METRIC_DICTIONARY_SPEC, TABLE_DICTIONARY_SPEC],

  // General overview — mix of compliance + dictionary + segmen reference
  general: [REGISTRY_SPEC, DIM_KABUPATEN_SPEC, SEGMEN_SPEC, METRIC_DICTIONARY_SPEC],
};

// =============================================================================
// PKB PILOT REGISTRY — Single source of truth for the Specialists feature.
// Pajak Kendaraan Bermotor (PKB) compliance pilot for Jasa Raharja Kalteng.
//
// Everything that used to be hardcoded JRSI accident-domain content is now
// PKB compliance content. Templates, business views, use cases, segments,
// and the data-source catalog all live here so:
//   • the wizard can render scalable choices for custom specialists
//   • DataSourceEvidence chips, OverviewTab metrics, and edge-function
//     querySpecs can all reference one canonical table list
//   • new tables / segments / business views can be added in one place
// =============================================================================

import type {
  BusinessView,
  BusinessViewConfig,
  DomainConfig,
  SpecialistDomain,
  SpecialistTemplate,
  UseCase,
} from '@/types/specialist';
import type { MetricDomain } from '@/types/metric';

// ─── DATA SOURCE CATALOG ─────────────────────────────────────────────────────
//
// One record per real Postgres table the assistant / specialists / wizard can
// reference. Schema-qualified names are the keys (matching the strings the
// edge function cites in its responses, and the keys DataSourceEvidence
// matches against).

export type PkbTableCategory =
  | 'fact'         // big transactional tables (gold.* large)
  | 'dimension'    // smaller dim tables (gold.dim_*)
  | 'reference'    // framework lookups (ref.*)
  | 'governance'   // metric / table metadata (meta.*)
  | 'knowledge';   // RAG / few-shot (kb.*)

export interface PkbDataSource {
  /** Schema-qualified table name, e.g. 'gold.registry_enriched' */
  table: string;
  /** Friendly display label (used as chip text in DataSourceEvidence) */
  displayName: string;
  /** One-line description shown in tooltips and the wizard data-source picker */
  description: string;
  category: PkbTableCategory;
  /** Approximate row count — for UI hints / cost estimation in adaptive queries */
  rowCount?: number;
  /** Key columns the analyst can filter / group by */
  keyColumns?: string[];
}

export const PKB_DATA_SOURCES: PkbDataSource[] = [
  // ── FACT TABLES ────────────────────────────────────────────────────────
  {
    table: 'gold.registry_enriched',
    displayName: 'Registry Enriched',
    description:
      'Master registrasi kendaraan + segmen kepatuhan, durasi tunggakan, treatment recommendation per kendaraan (~426k baris, Kalteng).',
    category: 'fact',
    rowCount: 426180,
    keyColumns: [
      'vehicle_id', 'kabupaten_id', 'kode_jenken',
      'segmen_kepatuhan', 'segmen_nama',
      'durasi_tunggakan_days', 'has_phone', 'has_payment_history',
      'treatment_kanal_utama', 'treatment_kebijakan_amnesti',
      'est_pkb_per_kendaraan', 'usia_kendaraan',
    ],
  },
  {
    table: 'gold.transaksi_2025',
    displayName: 'Transaksi 2025',
    description: 'Realisasi PKB & SWDKLLJ tahun 2025 (~492k baris). Sumber utama analisis revenue & arrears bulanan.',
    category: 'fact',
    rowCount: 492363,
    keyColumns: [
      'paid_on', 'kabupaten_id', 'upt_id', 'kode_jenken', 'id_layanan',
      'pokok_pkb', 'tunggakan_pokok_pkb',
      'pokok_swdkllj', 'tunggakan_pokok_swdkllj',
      'denda_swdkllj',
    ],
  },
  {
    table: 'gold.transaksi',
    displayName: 'Transaksi (Historis)',
    description: 'Realisasi PKB & SWDKLLJ multi-tahun (~683k baris). Untuk analisis tren historis lintas-tahun.',
    category: 'fact',
    rowCount: 683478,
    keyColumns: ['paid_on', 'kabupaten_id', 'kode_jenken', 'pokok_pkb', 'tunggakan_pokok_pkb'],
  },

  // ── DIMENSIONS ─────────────────────────────────────────────────────────
  {
    table: 'gold.dim_kabupaten',
    displayName: 'Dim Kabupaten',
    description: '14 kabupaten/kota Kalteng + tipologi wilayah (Pusat Urban / Hub Industri / Hinterland).',
    category: 'dimension',
    rowCount: 14,
    keyColumns: ['kabupaten_id', 'nama_kabupaten', 'tipologi_wilayah'],
  },
  {
    table: 'gold.dim_jenken',
    displayName: 'Dim Jenis Kendaraan',
    description: 'Master jenis kendaraan + estimasi PKB rata-rata per kendaraan.',
    category: 'dimension',
    rowCount: 8,
    keyColumns: ['kode_jenken', 'jenis_kendaraan', 'is_motor', 'est_pkb_per_kendaraan'],
  },
  {
    table: 'gold.dim_upt',
    displayName: 'Dim UPT',
    description: 'Master Unit Pelayanan Teknis (SAMSAT) per kabupaten.',
    category: 'dimension',
    rowCount: 2,
    keyColumns: ['upt_id', 'upt_nama', 'kabupaten_id'],
  },
  {
    table: 'gold.dim_layanan',
    displayName: 'Dim Layanan',
    description: 'Master 23 jenis layanan SAMSAT (registrasi / perpanjangan / mutasi / dst.).',
    category: 'dimension',
    rowCount: 23,
    keyColumns: ['id_layanan', 'nama_layanan', 'kategori'],
  },

  // ── REFERENCE / FRAMEWORK ──────────────────────────────────────────────
  {
    table: 'ref.segmen',
    displayName: 'Segmen Kepatuhan',
    description: '7 segmen Piramida Kepatuhan Pajak (Patuh Aktif → Kendaraan Hantu) + profil perilaku.',
    category: 'reference',
    rowCount: 7,
    keyColumns: ['kode', 'nama', 'kelas_pyramid', 'durasi_tunggakan', 'profil_perilaku'],
  },
  {
    table: 'ref.treatment_lookup',
    displayName: 'Treatment Lookup',
    description: 'Strategi treatment per segmen — kanal utama, pesan personalisasi, kebijakan amnesti, peluang sukses tagih.',
    category: 'reference',
    rowCount: 7,
    keyColumns: ['segmen_kode', 'tujuan_strategis', 'kanal_utama', 'kebijakan_amnesti', 'aksi_utama', 'perkiraan_konversi'],
  },
  {
    table: 'ref.revenue_scenario',
    displayName: 'Revenue Scenario',
    description: 'Skenario revenue Konservatif / Moderat / Optimis per segmen (15 baris).',
    category: 'reference',
    rowCount: 15,
    keyColumns: ['segmen_kode', 'konversi_pct', 'est_pendapatan_idr', 'scenario_label'],
  },
  {
    table: 'ref.program_sadar',
    displayName: 'Program SADAR',
    description: '9 program SADAR — registrasi, edukasi, penagihan, enforcement (target segmen + tipologi wilayah).',
    category: 'reference',
    rowCount: 9,
    keyColumns: ['program_id', 'nama', 'segmen_sasaran', 'pemangku_kepentingan', 'tipologi_wilayah'],
  },
  {
    table: 'ref.raci_matrix',
    displayName: 'RACI Matrix',
    description: 'RACI per aksi kunci × stakeholder (Jasa Raharja, Bapenda, Samsat, Polri, Kelurahan, Vendor TI).',
    category: 'reference',
    rowCount: 47,
    keyColumns: ['segmen_kode', 'aksi_kunci', 'jasa_raharja', 'bapenda', 'samsat', 'polri', 'kelurahan'],
  },

  // ── GOVERNANCE ─────────────────────────────────────────────────────────
  {
    table: 'meta.metric_certification',
    displayName: 'Metric Certification',
    description: '58 metrik tersertifikasi Bronze/Silver/Gold + formula + sumber + valid range.',
    category: 'governance',
    rowCount: 58,
    keyColumns: ['metric_id', 'metric_name', 'business_domain', 'formula', 'certification_level', 'confidence_score'],
  },
  {
    table: 'meta.table_metadata',
    displayName: 'Table Metadata',
    description: 'Inventory tabel: lineage, ownership, refresh cadence, source system, retention.',
    category: 'governance',
    rowCount: 15,
    keyColumns: ['table_id', 'schema_name', 'table_name', 'business_domain', 'grain', 'refresh_cadence'],
  },
  {
    table: 'meta.column_metadata',
    displayName: 'Column Metadata',
    description: 'Definisi kolom + business meaning + data profiling (cardinality, % null).',
    category: 'governance',
    keyColumns: ['column_id', 'table_id', 'column_name', 'business_meaning', 'pct_null', 'cardinality'],
  },
];

/** Quick lookup by qualified table name */
export const PKB_DATA_SOURCES_BY_TABLE: Record<string, PkbDataSource> =
  Object.fromEntries(PKB_DATA_SOURCES.map((d) => [d.table, d]));

// ─── SEGMENTS ────────────────────────────────────────────────────────────────
//
// 7 segmen Piramida Kepatuhan Pajak — single source of truth so templates,
// metrics, and chart styling all reference the same colors / order.

export interface PkbSegment {
  kode: 'H1' | 'K1' | 'O1' | 'M1' | 'M2' | 'S1' | 'S2';
  nama: string;
  shortLabel: string; // for chips / badges
  pyramidOrder: number; // 1..7 top-of-pyramid first
  durasiTunggakan: string;
  profilePerilaku: string;
  /** Tailwind colour token used by chart legends and chips */
  color: 'emerald' | 'lime' | 'amber' | 'orange' | 'red' | 'slate' | 'gray';
  /** Target framework percentage (Piramida Kepatuhan Pajak baseline) */
  targetPct: number;
  /** Estimated probability of successful collection (0–1) per ref.treatment_lookup */
  peluangSuksesTagih: number;
  /** Whether amnesty programs typically apply to this segment */
  amnestiApplies: boolean;
}

export const PKB_SEGMENTS: PkbSegment[] = [
  {
    kode: 'H1', nama: 'Patuh Aktif', shortLabel: 'Patuh',
    pyramidOrder: 1, durasiTunggakan: 'tepat waktu',
    profilePerilaku: 'Bayar PKB tepat waktu setiap tahun.',
    color: 'emerald', targetPct: 40, peluangSuksesTagih: 1.0, amnestiApplies: false,
  },
  {
    kode: 'K1', nama: 'Baru Lewat Jatuh Tempo', shortLabel: 'Baru Lewat',
    pyramidOrder: 2, durasiTunggakan: '1–90 hari',
    profilePerilaku: 'Lupa / tertunda jangka pendek; biasanya kembali setelah pengingat ringan.',
    color: 'lime', targetPct: 8, peluangSuksesTagih: 0.6, amnestiApplies: false,
  },
  {
    kode: 'O1', nama: 'Mulai Mengabaikan', shortLabel: 'Mengabaikan',
    pyramidOrder: 3, durasiTunggakan: '91–365 hari',
    profilePerilaku: 'Mulai menormalkan keterlambatan; butuh intervensi terstruktur.',
    color: 'amber', targetPct: 8, peluangSuksesTagih: 0.35, amnestiApplies: false,
  },
  {
    kode: 'M1', nama: 'Tidak Patuh Pasif', shortLabel: 'Pasif',
    pyramidOrder: 4, durasiTunggakan: '1–2 tahun',
    profilePerilaku: 'Tidak aktif membayar; perlu insentif / program penagihan terstruktur.',
    color: 'orange', targetPct: 6, peluangSuksesTagih: 0.25, amnestiApplies: true,
  },
  {
    kode: 'M2', nama: 'Tidak Patuh Kronis', shortLabel: 'Kronis',
    pyramidOrder: 5, durasiTunggakan: '2–5 tahun',
    profilePerilaku: 'Beban historis — denda 2–4× pokok; butuh amnesti penuh + enforcement.',
    color: 'red', targetPct: 33, peluangSuksesTagih: 0.15, amnestiApplies: true,
  },
  {
    kode: 'S1', nama: 'Belum Terdaftar', shortLabel: 'Belum Daftar',
    pyramidOrder: 6, durasiTunggakan: 'tidak terdaftar',
    profilePerilaku: 'Belum masuk sistem registrasi — target program registrasi (BUKAN target tagih).',
    color: 'slate', targetPct: 3, peluangSuksesTagih: 0.0, amnestiApplies: false,
  },
  {
    kode: 'S2', nama: 'Kendaraan Hantu', shortLabel: 'Hantu',
    pyramidOrder: 7, durasiTunggakan: '>5 tahun / hilang jejak',
    profilePerilaku: 'Tidak teridentifikasi keberadaan / pemilik — target pembersihan registrasi.',
    color: 'gray', targetPct: 17, peluangSuksesTagih: 0.0, amnestiApplies: false,
  },
];

export const PKB_SEGMENTS_BY_KODE: Record<string, PkbSegment> =
  Object.fromEntries(PKB_SEGMENTS.map((s) => [s.kode, s]));

// ─── DOMAIN CONFIGS ──────────────────────────────────────────────────────────

export const PKB_DOMAIN_CONFIGS: DomainConfig[] = [
  {
    id: 'compliance' as SpecialistDomain,
    name: 'Kepatuhan PKB',
    icon: 'ShieldCheck',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-l-amber-500',
  },
  {
    id: 'revenue-recovery' as SpecialistDomain,
    name: 'Recovery Revenue',
    icon: 'Wallet',
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-l-emerald-500',
  },
];

// ─── BUSINESS VIEWS — MECE (Mutually Exclusive, Collectively Exhaustive) ──
//
// Three lenses on the PKB pilot, no overlap:
//   1. Compliance Health  → STATE of the population (who is patuh / not)
//   2. Revenue & Arrears  → MONEY (apa yang tertagih, apa yang masih menggantung)
//   3. Treatment Execution → ACTION (apa yang kita lakukan untuk memperbaiki)
//
// Geographic / vehicle dimensions are NOT separate views — they are DRIVERS
// (breakdown columns) used inside any of the three views. e.g. "kepatuhan per
// kabupaten" = Compliance Health × dim Kabupaten; "PKB per jenis kendaraan"
// = Revenue & Arrears × dim Jenken.

export const PKB_BUSINESS_VIEW_CONFIGS: BusinessViewConfig[] = [
  {
    id: 'compliance-health' as BusinessView,
    name: 'Compliance Health',
    icon: 'TrendingDown',
    description: 'STATE populasi kendaraan: distribusi 7 segmen, ageing tunggakan, migrasi antar-segmen. (Bukan revenue, bukan eksekusi.)',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-l-amber-500',
  },
  {
    id: 'revenue-arrears' as BusinessView,
    name: 'Revenue & Arrears',
    icon: 'Wallet',
    description: 'MONEY: realisasi PKB & SWDKLLJ, total tunggakan, gap vs skenario Konservatif/Moderat/Optimis. (Outcome finansial.)',
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-l-emerald-500',
  },
  {
    id: 'treatment-execution' as BusinessView,
    name: 'Treatment Execution',
    icon: 'Send',
    description: 'ACTION: efektivitas saluran (WhatsApp/surat/RT-RW/SAMSAT), adopsi program SADAR & amnesti, akuntabilitas RACI. (Bagaimana kita memperbaiki.)',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-l-blue-500',
  },
];

// ─── BUSINESS VIEW → DOMAIN MAPPING ──────────────────────────────────────────

export const PKB_BUSINESS_VIEW_TO_DOMAIN: Record<string, SpecialistDomain> = {
  'compliance-health': 'compliance' as SpecialistDomain,
  'revenue-arrears': 'revenue-recovery' as SpecialistDomain,
  'treatment-execution': 'compliance' as SpecialistDomain,
};

// ─── BUSINESS VIEW → METRIC DOMAIN(s) MAP ────────────────────────────────────
//
// Single source for "which metric domains belong to this business view?".
// Used by HireSpecialist (suggested focus areas) AND MonitoringScopeStep
// (filter metrics shown in the picker). One MECE domain per view so
// suggestions / metric pickers don't overlap across views.
//
// Adding a new business view to PKB_BUSINESS_VIEW_CONFIGS only requires
// adding one entry here too — no code changes elsewhere.

export const PKB_BUSINESS_VIEW_TO_METRIC_DOMAINS: Record<string, MetricDomain[]> = {
  'compliance-health': ['Compliance'],
  'revenue-arrears': ['Revenue'],
  'treatment-execution': ['Treatment'],
  // Deprecated PKB slugs — fall back to Compliance so legacy DB rows don't crash
  'data-trust': ['Compliance'],
  'compliance-pyramid': ['Compliance'],
  'revenue-recovery': ['Compliance', 'Revenue'],
  'geographic-coverage': ['Compliance'],
  'vehicle-segmentation': ['Compliance', 'Vehicle'],
  'data-governance': ['Compliance'],
  // Legacy JRSI views (kept for type safety & old specialists)
  'accident-monitoring': ['Accident Overview', 'Time Analysis'],
  'risk-mapping': ['TRL Risk'],
  'vehicle-intelligence': ['Vehicle'],
  'santunan-claims': ['Financial'],
  'cause-analysis': ['Cause Analysis'],
  'data-quality': ['Data Quality'],
  // Legacy generic views
  revenue: ['Revenue', 'Margin'],
  operations: ['Operational', 'Performance'],
  'customer-experience': ['Operational', 'Performance'],
  'cost-optimization': ['Cost', 'Fee'],
  'risk-compliance': ['Cost', 'Operational'],
  'fleet-assets': ['Operational', 'Performance'],
};

/** Safe lookup that returns [] for unknown business views instead of undefined. */
export function getMetricDomainsForBusinessView(view: BusinessView | string | null | undefined): MetricDomain[] {
  if (!view) return [];
  return PKB_BUSINESS_VIEW_TO_METRIC_DOMAINS[view] ?? [];
}

// ─── DIMENSION CATALOG ───────────────────────────────────────────────────────
//
// Single source for "what dimensions can a specialist break down by / filter on?"
// Each entry maps a column id to a display label + dataType + (for categorical
// dimensions) a list of allowed values. IDs MUST match the actual database
// column name — applyScopeToSpecs() in the edge function silently skips
// filters whose field isn't in a table's select list.

export type DimensionDataType = 'categorical' | 'numeric' | 'date';

export type DimensionValuesSource =
  | { kind: 'static'; values: { id: string; label: string }[] }
  | { kind: 'table'; table: string; idCol: string; labelCol: string };

export interface DimensionDefinition {
  /** Column name as it appears in fact tables. */
  id: string;
  /** Display label (Bahasa Indonesia for PKB pilot). */
  label: string;
  /** Source table for documentation / lineage (schema-qualified). */
  table: string;
  dataType: DimensionDataType;
  /** Allowed values for categorical dims; omitted for numeric/date or unconstrained. */
  valuesSource?: DimensionValuesSource;
  /** Which business views surface this dimension in the wizard picker. */
  businessViews: BusinessView[];
  /** Optional one-line hint shown in tooltips. */
  description?: string;
}

// All 3 PKB business views see the same dimensional catalog (geographic +
// vehicle + behavior dims are cross-cutting drivers, not view-specific).
const ALL_PKB_VIEWS: BusinessView[] = [
  'compliance-health',
  'revenue-arrears',
  'treatment-execution',
];

// 14 kabupaten Kalteng — match gold.dim_kabupaten. IDs are BPS codes.
const KALTENG_KABUPATEN: { id: string; label: string }[] = [
  { id: '6201', label: 'Kotawaringin Barat' },
  { id: '6202', label: 'Kotawaringin Timur' },
  { id: '6203', label: 'Kapuas' },
  { id: '6204', label: 'Barito Selatan' },
  { id: '6205', label: 'Barito Utara' },
  { id: '6206', label: 'Sukamara' },
  { id: '6207', label: 'Lamandau' },
  { id: '6208', label: 'Seruyan' },
  { id: '6209', label: 'Katingan' },
  { id: '6210', label: 'Pulang Pisau' },
  { id: '6211', label: 'Gunung Mas' },
  { id: '6212', label: 'Barito Timur' },
  { id: '6213', label: 'Murung Raya' },
  { id: '6271', label: 'Palangka Raya' },
];

// 8 jenis kendaraan — match gold.dim_jenken.
const PKB_JENKEN: { id: string; label: string }[] = [
  { id: 'MTR', label: 'Sepeda Motor' },
  { id: 'MPU', label: 'Mobil Penumpang Umum' },
  { id: 'MPP', label: 'Mobil Penumpang Pribadi' },
  { id: 'BUS', label: 'Bus' },
  { id: 'TRK', label: 'Truk' },
  { id: 'PCP', label: 'Pick-up' },
  { id: 'KHU', label: 'Kendaraan Khusus' },
  { id: 'ALT', label: 'Alat Berat' },
];

const TIPOLOGI_WILAYAH: { id: string; label: string }[] = [
  { id: 'pusat_urban', label: 'Pusat Urban' },
  { id: 'hub_industri', label: 'Hub Industri' },
  { id: 'hinterland', label: 'Hinterland' },
];

const KANAL_UTAMA: { id: string; label: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'surat', label: 'Surat Fisik' },
  { id: 'rt_rw', label: 'RT/RW' },
  { id: 'samsat_keliling', label: 'SAMSAT Keliling' },
  { id: 'samsat_loket', label: 'SAMSAT Loket' },
];

const HAS_PHONE: { id: string; label: string }[] = [
  { id: 'true', label: 'Ada nomor HP' },
  { id: 'false', label: 'Tidak ada' },
];

const BAHAN_BAKAR: { id: string; label: string }[] = [
  { id: 'bensin', label: 'Bensin' },
  { id: 'solar', label: 'Solar/Diesel' },
  { id: 'listrik', label: 'Listrik (EV)' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'gas', label: 'Gas (CNG/LPG)' },
];

const WARNA_PLAT: { id: string; label: string }[] = [
  { id: 'hitam', label: 'Hitam (pribadi)' },
  { id: 'kuning', label: 'Kuning (umum)' },
  { id: 'merah', label: 'Merah (dinas)' },
  { id: 'putih', label: 'Putih (BLE/diplomatik)' },
];

// 5 kecamatan Palangka Raya (pilot focus). Other kabupaten kecamatan
// can be added when expanding beyond the pilot region.
const KECAMATAN_PALANGKA_RAYA: { id: string; label: string }[] = [
  { id: 'pahandut', label: 'Pahandut' },
  { id: 'jekan_raya', label: 'Jekan Raya' },
  { id: 'sebangau', label: 'Sebangau' },
  { id: 'bukit_batu', label: 'Bukit Batu' },
  { id: 'rakumpit', label: 'Rakumpit' },
];

// 2 SAMSAT UPT yang melayani Palangka Raya (per pilot starter pack rowCount=2).
const UPT_PALANGKA_RAYA: { id: string; label: string }[] = [
  { id: '1', label: 'SAMSAT Palangka Raya I' },
  { id: '2', label: 'SAMSAT Palangka Raya II' },
];

// Layanan utama (subset dari 23 layanan SAMSAT). Sisanya bisa ditambah
// kemudian — untuk wizard breakdown, ini sudah cover ~80% kasus.
const ID_LAYANAN: { id: string; label: string }[] = [
  { id: 'reg_baru', label: 'Registrasi Baru' },
  { id: 'perpanjangan_1th', label: 'Perpanjangan Tahunan' },
  { id: 'perpanjangan_5th', label: 'Perpanjangan 5 Tahun' },
  { id: 'mutasi_masuk', label: 'Mutasi Masuk' },
  { id: 'mutasi_keluar', label: 'Mutasi Keluar' },
  { id: 'balik_nama', label: 'Balik Nama' },
  { id: 'duplikat', label: 'Duplikat STNK/BPKB' },
  { id: 'cabut_berkas', label: 'Cabut Berkas' },
];

export const PKB_AVAILABLE_DIMENSIONS: DimensionDefinition[] = [
  // ── Geographic ─────────────────────────────────────────────────────
  {
    id: 'kabupaten_id',
    label: 'Kabupaten',
    table: 'gold.registry_fact',
    dataType: 'categorical',
    valuesSource: { kind: 'static', values: KALTENG_KABUPATEN },
    businessViews: ALL_PKB_VIEWS,
    description: '14 kabupaten/kota Kalteng.',
  },
  {
    id: 'kecamatan',
    label: 'Kecamatan',
    table: 'gold.registry_fact',
    dataType: 'categorical',
    valuesSource: { kind: 'static', values: KECAMATAN_PALANGKA_RAYA },
    businessViews: ALL_PKB_VIEWS,
    description: '5 kecamatan Palangka Raya (pilot focus).',
  },
  {
    id: 'upt_id',
    label: 'UPT (SAMSAT)',
    table: 'gold.dim_upt',
    dataType: 'categorical',
    valuesSource: { kind: 'static', values: UPT_PALANGKA_RAYA },
    businessViews: ALL_PKB_VIEWS,
    description: 'Unit Pelayanan Teknis SAMSAT.',
  },
  {
    id: 'tipologi_wilayah',
    label: 'Tipologi Wilayah',
    table: 'gold.dim_kabupaten',
    dataType: 'categorical',
    valuesSource: { kind: 'static', values: TIPOLOGI_WILAYAH },
    businessViews: ALL_PKB_VIEWS,
  },

  // ── Vehicle ────────────────────────────────────────────────────────
  {
    id: 'kode_jenken',
    label: 'Jenis Kendaraan',
    table: 'gold.registry_fact',
    dataType: 'categorical',
    valuesSource: { kind: 'static', values: PKB_JENKEN },
    businessViews: ALL_PKB_VIEWS,
  },
  {
    id: 'bahan_bakar',
    label: 'Bahan Bakar',
    table: 'gold.registry_fact',
    dataType: 'categorical',
    valuesSource: { kind: 'static', values: BAHAN_BAKAR },
    businessViews: ALL_PKB_VIEWS,
  },
  {
    id: 'warna_plat',
    label: 'Warna Plat',
    table: 'gold.registry_fact',
    dataType: 'categorical',
    valuesSource: { kind: 'static', values: WARNA_PLAT },
    businessViews: ALL_PKB_VIEWS,
    description: 'Hitam (pribadi) / Kuning (umum) / Merah (dinas) / Putih (BLE).',
  },
  {
    id: 'thn_buat',
    label: 'Tahun Pembuatan',
    table: 'gold.registry_fact',
    dataType: 'numeric',
    businessViews: ALL_PKB_VIEWS,
  },
  {
    id: 'usia_kendaraan',
    label: 'Usia Kendaraan (tahun)',
    table: 'gold.registry_fact',
    dataType: 'numeric',
    businessViews: ALL_PKB_VIEWS,
  },

  // ── Compliance behavior ────────────────────────────────────────────
  {
    id: 'segmen_kepatuhan',
    label: 'Segmen Kepatuhan',
    table: 'gold.registry_fact',
    dataType: 'categorical',
    valuesSource: {
      kind: 'static',
      values: PKB_SEGMENTS.map((s) => ({ id: s.kode, label: s.nama })),
    },
    businessViews: ALL_PKB_VIEWS,
    description: '7 segmen Piramida Kepatuhan Pajak (H1, K1, O1, M1, M2, S1, S2).',
  },
  {
    id: 'durasi_tunggakan_days',
    label: 'Durasi Tunggakan (hari)',
    table: 'gold.registry_fact',
    dataType: 'numeric',
    businessViews: ALL_PKB_VIEWS,
  },
  {
    id: 'has_phone',
    label: 'Cakupan Handphone',
    table: 'gold.registry_fact',
    dataType: 'categorical',
    valuesSource: { kind: 'static', values: HAS_PHONE },
    businessViews: ['treatment-execution', 'compliance-health'],
  },

  // ── Treatment ──────────────────────────────────────────────────────
  {
    id: 'treatment_kanal_utama',
    label: 'Saluran Treatment',
    table: 'gold.registry_fact',
    dataType: 'categorical',
    valuesSource: { kind: 'static', values: KANAL_UTAMA },
    businessViews: ['treatment-execution'],
  },

  // ── Service / temporal ─────────────────────────────────────────────
  {
    id: 'id_layanan',
    label: 'Jenis Layanan',
    table: 'gold.dim_layanan',
    dataType: 'categorical',
    valuesSource: { kind: 'static', values: ID_LAYANAN },
    businessViews: ['revenue-arrears', 'treatment-execution'],
    description: '8 layanan utama SAMSAT (registrasi / perpanjangan / mutasi / balik nama / dst.).',
  },
  {
    id: 'paid_on',
    label: 'Tanggal Bayar',
    table: 'gold.transaksi_fact',
    dataType: 'date',
    businessViews: ['revenue-arrears'],
  },
];

export const PKB_DIMENSIONS_BY_ID: Record<string, DimensionDefinition> =
  Object.fromEntries(PKB_AVAILABLE_DIMENSIONS.map((d) => [d.id, d]));

/** Dimensions surfaced for a given business view (Wizard picker source). */
export function getDimensionsForBusinessView(
  view: BusinessView | string | null | undefined,
): DimensionDefinition[] {
  if (!view) return [];
  return PKB_AVAILABLE_DIMENSIONS.filter((d) => d.businessViews.includes(view as BusinessView));
}

/** Resolve a dimension id → its display label, or echo the id if unknown. */
export function getDimensionLabel(id: string): string {
  return PKB_DIMENSIONS_BY_ID[id]?.label ?? id;
}

/** Resolve a value id → its display label for a dimension (categorical static lookup). */
export function getDimensionValueLabel(dimensionId: string, valueId: string): string {
  const def = PKB_DIMENSIONS_BY_ID[dimensionId];
  if (!def || def.valuesSource?.kind !== 'static') return valueId;
  return def.valuesSource.values.find((v) => v.id === valueId)?.label ?? valueId;
}

// ─── USE CASE CATALOG — 8 use cases, 2 per business view, MECE ────────────
//
// Each use case answers a DISTINCT question that doesn't overlap with the
// others. Geographic and vehicle dimensions appear as DRIVERS inside multiple
// use cases — that's correct (they're cuts, not separate use cases).

export const PKB_USE_CASE_CATALOG: UseCase[] = [
  // ── COMPLIANCE HEALTH (state of population) ─────────────────────────
  {
    id: 'uc-pyramid-state',
    name: 'Distribusi & Migrasi Piramida',
    description: 'Pantau distribusi 7 segmen kepatuhan vs target framework + migrasi antar-segmen bulanan. Jawab: "siapa yang patuh, siapa yang menggeser turun?"',
    businessView: 'compliance-health' as BusinessView,
    defaultMetrics: [
      { id: 'M-PKB-K01', name: 'Jumlah kendaraan Tidak Patuh Kronis' },
    ],
    defaultDimensions: ['segmen_kepatuhan', 'kabupaten_id', 'kode_jenken'],
    defaultDrivers: [],
    defaultRules: [
      {
        id: 'rule-pyramid-deviation',
        name: 'Deviasi distribusi vs target framework',
        whenCondition: 'Deviasi segmen vs target framework melebihi',
        whenValue: 5,
        whenUnit: '% poin',
        forScope: 'Per segmen',
        severity: 'high',
        enabled: true,
      },
      {
        id: 'rule-migration-warning',
        name: 'Migrasi keluar Patuh Aktif',
        whenCondition: 'Net migrasi keluar Patuh Aktif per bulan melebihi',
        whenValue: 1,
        whenUnit: '%',
        forScope: 'Semua kabupaten',
        severity: 'critical',
        enabled: true,
      },
    ],
  },
  {
    id: 'uc-ageing-erosion',
    name: 'Ageing Tunggakan & Risiko Erosi',
    description: 'Pantau durasi tunggakan rata-rata per segmen + risiko erosi kepatuhan ke Patuh Aktif pasca-amnesti. Jawab: "seberapa dalam beban historis dan apa risikonya buat populasi yang masih patuh?"',
    businessView: 'compliance-health' as BusinessView,
    defaultMetrics: [
      { id: 'M-PKB-K02', name: 'Durasi tunggakan rata-rata' },
    ],
    defaultDimensions: ['segmen_kepatuhan', 'usia_kendaraan', 'kabupaten_id'],
    defaultDrivers: [],
    defaultRules: [
      {
        id: 'rule-ageing-spike',
        name: 'Median ageing memburuk',
        whenCondition: 'Median durasi tunggakan segmen melebihi',
        whenValue: 60,
        whenUnit: 'hari',
        forScope: 'Per segmen',
        severity: 'high',
        enabled: true,
      },
      {
        id: 'rule-amnesti-erosion',
        name: 'Risiko erosi Patuh Aktif',
        whenCondition: 'Estimasi Patuh Aktif yang menunda bayar pasca-amnesti melebihi',
        whenValue: 3,
        whenUnit: '%',
        forScope: 'Pasca-amnesti',
        severity: 'high',
        enabled: true,
      },
    ],
  },

  // ── REVENUE & ARREARS (financial outcome) ───────────────────────────
  {
    id: 'uc-revenue-realization',
    name: 'Realisasi PKB & SWDKLLJ',
    description: 'Pantau realisasi PKB & SWDKLLJ bulanan dari gold.transaksi_2025. Jawab: "berapa yang sebenarnya masuk?"',
    businessView: 'revenue-arrears' as BusinessView,
    defaultMetrics: [],
    defaultDimensions: ['paid_on', 'kabupaten_id', 'kode_jenken'],
    defaultDrivers: [],
    defaultRules: [
      {
        id: 'rule-realization-drop',
        name: 'Realisasi turun vs bulan lalu',
        whenCondition: 'Realisasi PKB bulanan turun vs 1 bulan lalu lebih dari',
        whenValue: 5,
        whenUnit: '%',
        forScope: 'Per kabupaten',
        severity: 'high',
        enabled: true,
      },
    ],
  },
  {
    id: 'uc-scenario-gap',
    name: 'Gap vs Skenario Revenue',
    description: 'Pantau gap realisasi vs skenario Konservatif/Moderat/Optimis (ref.revenue_scenario) dan total tunggakan. Jawab: "berapa yang masih bisa direcovery, dan apakah kita on track?"',
    businessView: 'revenue-arrears' as BusinessView,
    defaultMetrics: [
      { id: 'M-PKB-K03', name: 'Estimasi PKB tertunggak segmen kronis' },
    ],
    defaultDimensions: ['segmen_kepatuhan', 'kabupaten_id'],
    defaultDrivers: [],
    defaultRules: [
      {
        id: 'rule-scenario-gap',
        name: 'Gap vs skenario Konservatif',
        whenCondition: 'Realisasi di bawah skenario Konservatif sebesar',
        whenValue: 15,
        whenUnit: '%',
        forScope: 'Bulanan',
        severity: 'high',
        enabled: true,
      },
    ],
  },

  // ── TREATMENT EXECUTION (action quality) ────────────────────────────
  {
    id: 'uc-channel-effectiveness',
    name: 'Efektivitas Saluran',
    description: 'Pantau cakupan handphone & efektivitas saluran (WhatsApp / surat / RT-RW / SAMSAT Keliling) per segmen. Jawab: "apakah pesan kita sampai dan saluran mana yang convert?"',
    businessView: 'treatment-execution' as BusinessView,
    defaultMetrics: [
      { id: 'M-PKB-K01', name: 'Jumlah kendaraan Tidak Patuh Kronis' },
    ],
    defaultDimensions: ['has_phone', 'treatment_kanal_utama', 'segmen_kepatuhan'],
    defaultDrivers: [],
    defaultRules: [
      {
        id: 'rule-phone-coverage',
        name: 'Cakupan handphone rendah',
        whenCondition: 'Cakupan nomor handphone segmen di bawah',
        whenValue: 70,
        whenUnit: '%',
        forScope: 'Per kabupaten',
        severity: 'medium',
        enabled: true,
      },
    ],
  },
  {
    id: 'uc-program-raci',
    name: 'Adopsi Program & RACI',
    description: 'Pantau adopsi 9 program SADAR (registrasi, amnesti, enforcement) + akuntabilitas RACI antar-stakeholder. Jawab: "apakah program berjalan, siapa yang accountable?"',
    businessView: 'treatment-execution' as BusinessView,
    defaultMetrics: [],
    defaultDimensions: ['tipologi_wilayah', 'kabupaten_id'],
    defaultDrivers: [],
    defaultRules: [
      {
        id: 'rule-program-stuck',
        name: 'Program tidak progres',
        whenCondition: 'Tidak ada update program selama',
        whenValue: 14,
        whenUnit: 'hari',
        forScope: 'Semua program',
        severity: 'medium',
        enabled: true,
      },
    ],
  },

];

// ─── SPECIALIST TEMPLATES ────────────────────────────────────────────────────
//
// 7 starter templates — one per segmen (matching the 7-segment Piramida
// Kepatuhan Pajak framework). Custom specialists can pick any business view
// and use case from the catalog above.

export const PKB_SPECIALIST_TEMPLATES: SpecialistTemplate[] = [
  {
    id: 'template-patuh-aktif-retention',
    name: 'Specialist Retensi Patuh Aktif',
    handle: 'patuh-aktif',
    description: 'Memantau segmen Patuh Aktif (~108k kendaraan) — deteksi awal migrasi ke segmen Baru Lewat Jatuh Tempo akibat reminder gagal, masalah saluran, atau sentimen amnesti.',
    icon: 'ShieldCheck',
    domain: 'compliance' as SpecialistDomain,
    monitors: ['Net migrasi keluar Patuh Aktif', 'Cakupan reminder pre-jatuh tempo', 'Sentimen pasca-amnesti'],
    detects: ['Erosi kepatuhan akibat amnesti generik', 'Drop di kabupaten tertentu', 'Pola gap reminder'],
    recommends: ['Pre-tempo reminder via WhatsApp', 'Campaign apresiasi loyalitas', 'Diferensiasi insentif vs kebijakan amnesti'],
    defaultRules: [
      {
        id: 'rule-patuh-erosion',
        name: 'Patuh Aktif menurun',
        whenCondition: 'Jumlah Patuh Aktif turun vs 1 bulan lalu lebih dari',
        whenValue: 2,
        whenUnit: '%',
        forScope: 'Semua kabupaten',
        severity: 'high',
        enabled: true,
      },
    ],
  },
  {
    id: 'template-baru-lewat-recovery',
    name: 'Specialist Recovery Baru Lewat Jatuh Tempo',
    handle: 'baru-lewat-recovery',
    description: 'Memantau segmen Baru Lewat Jatuh Tempo (~34k kendaraan, telat 1–90 hari) — peluang sukses tagih ~60%. Fokus pada reminder cepat sebelum migrasi ke Mulai Mengabaikan.',
    icon: 'Clock',
    domain: 'compliance' as SpecialistDomain,
    monitors: ['Volume Baru Lewat Jatuh Tempo', 'Time-to-recovery rata-rata', 'Cakupan handphone segmen'],
    detects: ['Ageing tunggakan > 60 hari', 'Recovery rate stagnan', 'Kabupaten dengan recovery lambat'],
    recommends: ['WhatsApp blast tahap 1 (hari 7)', 'Email/SMS tahap 2 (hari 30)', 'Surat fisik tahap 3 (hari 60)'],
    defaultRules: [
      {
        id: 'rule-aging-warning',
        name: 'Tunggakan menua',
        whenCondition: 'Median durasi tunggakan segmen melebihi',
        whenValue: 60,
        whenUnit: 'hari',
        forScope: 'Per kabupaten',
        severity: 'high',
        enabled: true,
      },
    ],
  },
  {
    id: 'template-mulai-mengabaikan',
    name: 'Specialist Intervensi Mulai Mengabaikan',
    handle: 'mengabaikan-intervention',
    description: 'Memantau segmen Mulai Mengabaikan (~33k kendaraan, telat 91–365 hari) — peluang sukses tagih ~35%. Butuh intervensi terstruktur sebelum jadi kronis.',
    icon: 'AlertCircle',
    domain: 'compliance' as SpecialistDomain,
    monitors: ['Volume Mulai Mengabaikan', 'Migrasi ke Tidak Patuh Pasif', 'Adopsi treatment per kabupaten'],
    detects: ['Migrasi cepat ke segmen kronis', 'Gap eksekusi treatment', 'Kabupaten tertentu over-represented'],
    recommends: ['Personalisasi pesan via ref.treatment_lookup', 'Koordinasi RT-RW segmen tanpa HP', 'SAMSAT Keliling targeted'],
    defaultRules: [
      {
        id: 'rule-mengabaikan-migration',
        name: 'Migrasi cepat ke segmen kronis',
        whenCondition: 'Migrasi Mulai Mengabaikan → Tidak Patuh per bulan melebihi',
        whenValue: 8,
        whenUnit: '%',
        forScope: 'Semua kabupaten',
        severity: 'critical',
        enabled: true,
      },
    ],
  },
  {
    id: 'template-pasif-reengagement',
    name: 'Specialist Re-engagement Tidak Patuh Pasif',
    handle: 'pasif-reengagement',
    description: 'Memantau segmen Tidak Patuh Pasif (~25k kendaraan, telat 1–2 tahun) — peluang sukses tagih ~25%. Butuh insentif amnesti parsial + saluran offline.',
    icon: 'UserX',
    domain: 'compliance' as SpecialistDomain,
    monitors: ['Volume Tidak Patuh Pasif', 'Kelayakan amnesti parsial', 'Saluran offline coverage'],
    detects: ['Stagnasi recovery', 'Konsentrasi geografis', 'Profil kendaraan dominan'],
    recommends: ['Amnesti denda parsial (50% denda) 60 hari', 'Koordinasi Kelurahan/RT-RW', 'Vehicle inspection campaign'],
    defaultRules: [
      {
        id: 'rule-pasif-stagnant',
        name: 'Recovery stagnan',
        whenCondition: 'Recovery rate Tidak Patuh Pasif di bawah',
        whenValue: 5,
        whenUnit: '% per bulan',
        forScope: 'Semua kabupaten',
        severity: 'medium',
        enabled: true,
      },
    ],
  },
  {
    id: 'template-kronis-recovery',
    name: 'Specialist Pemulihan Kepatuhan Kronis',
    handle: 'kronis-recovery',
    description: 'Memantau segmen Tidak Patuh Kronis (~137k kendaraan, telat 2–5 tahun) — distribusi per kabupaten, peluang amnesti penuh denda, jangkauan saluran, dan risiko erosi kepatuhan ke Patuh Aktif jika kebijakan amnesti diluncurkan.',
    icon: 'AlertTriangle',
    domain: 'compliance' as SpecialistDomain,
    monitors: ['Volume Tidak Patuh Kronis', 'Durasi tunggakan rata-rata', 'Estimasi PKB tertunggak', 'Cakupan handphone'],
    detects: ['Lonjakan populasi', 'Kabupaten konsentrasi tinggi', 'Risiko erosi pasca-amnesti', 'Gap revenue vs skenario'],
    recommends: ['Amnesti penuh denda 90 hari + razia gelombang pertama', 'WhatsApp masif + RT-RW untuk non-HP', 'Integrasi data ETLE'],
    defaultRules: [
      {
        id: 'rule-kronis-spike',
        name: 'Lonjakan populasi kronis',
        whenCondition: 'Jumlah Tidak Patuh Kronis naik vs 1 bulan lalu lebih dari',
        whenValue: 5,
        whenUnit: '%',
        forScope: 'Semua kabupaten',
        severity: 'critical',
        enabled: true,
      },
      {
        id: 'rule-amnesti-erosion',
        name: 'Risiko erosi Patuh Aktif pasca-amnesti',
        whenCondition: 'Estimasi Patuh Aktif menunda bayar pasca-amnesti melebihi',
        whenValue: 3,
        whenUnit: '%',
        forScope: 'Pasca-amnesti',
        severity: 'high',
        enabled: true,
      },
    ],
  },
  {
    id: 'template-belum-terdaftar',
    name: 'Specialist Registrasi Belum Terdaftar',
    handle: 'belum-terdaftar',
    description: 'Memantau segmen Belum Terdaftar (~13k kendaraan) — bukan target tagih, tapi target program registrasi. Koordinasi dengan Bapenda + Polri.',
    icon: 'UserPlus',
    domain: 'compliance' as SpecialistDomain,
    monitors: ['Volume Belum Terdaftar', 'Adopsi program registrasi', 'Sumber data identifikasi'],
    detects: ['Wilayah dengan gap registrasi', 'Pola jenis kendaraan dominan', 'Stagnasi onboarding'],
    recommends: ['Program SADAR Registrasi targeted', 'Koordinasi Bapenda/Polri', 'Field survey lokasi cluster'],
    defaultRules: [
      {
        id: 'rule-registrasi-stuck',
        name: 'Registrasi tidak progres',
        whenCondition: 'Penurunan Belum Terdaftar per bulan di bawah',
        whenValue: 1,
        whenUnit: '%',
        forScope: 'Per kabupaten',
        severity: 'low',
        enabled: true,
      },
    ],
  },
  {
    id: 'template-kendaraan-hantu',
    name: 'Specialist Pembersihan Kendaraan Hantu',
    handle: 'kendaraan-hantu',
    description: 'Memantau segmen Kendaraan Hantu (~78k kendaraan, jejak hilang) — bukan target tagih, target pembersihan registrasi & verifikasi keberadaan.',
    icon: 'EyeOff',
    domain: 'compliance' as SpecialistDomain,
    monitors: ['Volume Kendaraan Hantu', 'Verifikasi keberadaan', 'Status pembersihan registrasi'],
    detects: ['Akumulasi data hantu', 'Pola usia kendaraan', 'Wilayah konsentrasi'],
    recommends: ['Verifikasi lapangan via Kelurahan', 'Pembersihan registrasi terjadwal', 'Audit data sumber'],
    defaultRules: [
      {
        id: 'rule-hantu-growth',
        name: 'Volume hantu bertambah',
        whenCondition: 'Volume Kendaraan Hantu naik vs 1 bulan lalu lebih dari',
        whenValue: 3,
        whenUnit: '%',
        forScope: 'Semua kabupaten',
        severity: 'medium',
        enabled: true,
      },
    ],
  },
];

import type { MetricDefinition } from "@/types/metric";

// =============================================================================
// PKB Pilot Metrics — Pajak Kendaraan Bermotor (Jasa Raharja Kalteng)
// Sourced from gold.registry_enriched + gold.transaksi_2025 (~426k vehicles).
// Used by the Kronis specialist to display real values on the detail page.
// =============================================================================

const sparklineKronisCount = [
  { month: "2026-01", value: 132450 },
  { month: "2026-02", value: 134210 },
  { month: "2026-03", value: 135800 },
  { month: "2026-04", value: 136540 },
  { month: "2026-05", value: 137186 },
];

const sparklineTunggakanDays = [
  { month: "2026-01", value: 1428 },
  { month: "2026-02", value: 1455 },
  { month: "2026-03", value: 1480 },
  { month: "2026-04", value: 1500 },
  { month: "2026-05", value: 1517 },
];

const sparklineEstPkb = [
  { month: "2026-01", value: 35400 },   // in millions IDR (Rp 35,4 miliar)
  { month: "2026-02", value: 35900 },
  { month: "2026-03", value: 36300 },
  { month: "2026-04", value: 36500 },
  { month: "2026-05", value: 36700 },
];

const PKB_BASE = {
  dataSource: "gold.registry_enriched",
  aggregation: "count" as const,
  sparklineType: "non-cumulative" as const,
  dateField: "loaded_at",
  timeGranularity: "month" as const,
  valueSentiment: "up-bad" as const,
  filters: [],
  adjustableFilters: ["kabupaten", "kode_jenken", "kecamatan"],
  insightTypes: { trend: true, comparison: true, anomaly: true },
  category: "Compliance",
  owner: "PKB Pilot Team",
  createdAt: "2026-05-06",
  updatedAt: "2026-05-06",
  isFollowing: true,
  direction: "down_is_good" as const,
};

const PKB_DEFAULT_DISPLAY = {
  filterContext: "Kalimantan Tengah",
  comparisonLabel: "vs 1 bulan lalu",
  currentValue: "—",
  changePercent: 0,
  changeAbsolute: "",
  status: "healthy" as const,
  sparklineData: [] as Array<{ month: string; value: number }>,
  insight: { text: "", boldParts: [] as string[] },
};

// ─── Domain-specific snapshots (one per MECE business view) ──────────────

const sparklineRevenueRealization = [
  { month: "2026-01", value: 8400 },   // Rp 8,4 miliar
  { month: "2026-02", value: 9100 },
  { month: "2026-03", value: 8700 },
  { month: "2026-04", value: 9300 },
  { month: "2026-05", value: 8950 },
];

const sparklinePhoneCoverage = [
  { month: "2026-01", value: 73 },
  { month: "2026-02", value: 72 },
  { month: "2026-03", value: 71 },
  { month: "2026-04", value: 71 },
  { month: "2026-05", value: 71 },
];

export const pkbMetricsData: MetricDefinition[] = [
  // ─── COMPLIANCE HEALTH (domain: 'Compliance') ──────────────────────
  {
    ...PKB_BASE,
    id: "M-PKB-K01",
    name: "Jumlah kendaraan Tidak Patuh Kronis",
    description:
      "Total kendaraan dengan tunggakan PKB 2-5 tahun (segmen M2 — Tidak Patuh Kronis) di seluruh Kalimantan Tengah.",
    measure: "kronis_vehicle_count",
    aggregation: "count",
    domain: "Compliance",
    metricType: "result",
    displayData: {
      ...PKB_DEFAULT_DISPLAY,
      currentValue: "137.186",
      changePercent: 0.5,
      changeAbsolute: "+646",
      status: "critical",
      sparklineData: sparklineKronisCount,
      insight: {
        text:
          "32,1% dari total populasi kendaraan terdaftar masuk kategori Tidak Patuh Kronis — jauh di atas target framework Piramida Kepatuhan Pajak (~33% kombinasi M2+S2).",
        boldParts: ["32,1%", "framework Piramida Kepatuhan Pajak"],
      },
    },
  },
  {
    ...PKB_BASE,
    id: "M-PKB-K02",
    name: "Durasi tunggakan rata-rata",
    description:
      "Rata-rata durasi tunggakan (hari) untuk kendaraan segmen Tidak Patuh Kronis. Indikator kedalaman beban historis kepatuhan.",
    measure: "avg_tunggakan_days",
    aggregation: "avg",
    domain: "Compliance",
    metricType: "diagnostic",
    valueSentiment: "up-bad",
    displayData: {
      ...PKB_DEFAULT_DISPLAY,
      currentValue: "1.517 hari",
      changePercent: 1.1,
      changeAbsolute: "+17 hari",
      status: "critical",
      sparklineData: sparklineTunggakanDays,
      insight: {
        text:
          "Rata-rata 4,2 tahun tunggakan — denda kumulatif 2-4× pokok pajak. Tanpa amnesti penuh denda, peluang sukses tagih hanya 15-30%.",
        boldParts: ["4,2 tahun", "amnesti penuh denda", "15-30%"],
      },
    },
  },
  {
    ...PKB_BASE,
    id: "M-PKB-K03",
    name: "Estimasi PKB tertunggak segmen kronis",
    description:
      "Estimasi total potensi PKB yang tertunggak (pokok) dari segmen Tidak Patuh Kronis. Sumber: agregasi est_pkb_per_kendaraan × jumlah kendaraan kronis.",
    measure: "kronis_total_arrears",
    aggregation: "sum",
    domain: "Compliance",
    metricType: "result",
    direction: "down_is_good",
    valueSentiment: "up-bad",
    displayData: {
      ...PKB_DEFAULT_DISPLAY,
      currentValue: "Rp 36,70 miliar",
      changePercent: 0.5,
      changeAbsolute: "+Rp 200 juta",
      status: "warning",
      sparklineData: sparklineEstPkb,
      insight: {
        text:
          "Skenario Moderat (ref.revenue_scenario) memproyeksikan tambahan Rp 12,96 miliar realistis bila amnesti penuh denda 90 hari diluncurkan dengan enforcement gelombang pertama.",
        boldParts: ["Rp 36,70 miliar", "Rp 12,96 miliar", "amnesti penuh denda"],
      },
    },
  },

  // ─── REVENUE & ARREARS (domain: 'Revenue') ─────────────────────────
  {
    ...PKB_BASE,
    id: "M-PKB-R01",
    name: "Realisasi PKB bulanan",
    description:
      "Total realisasi PKB pokok yang masuk per bulan dari gold.transaksi_2025. Indikator utama outcome finansial pilot.",
    measure: "monthly_pkb_realization",
    aggregation: "sum",
    domain: "Revenue",
    metricType: "result",
    direction: "up_is_good",
    valueSentiment: "up-good",
    dataSource: "gold.transaksi_2025",
    displayData: {
      ...PKB_DEFAULT_DISPLAY,
      currentValue: "Rp 8,95 miliar",
      changePercent: -3.8,
      changeAbsolute: "-Rp 350 juta",
      status: "warning",
      sparklineData: sparklineRevenueRealization,
      insight: {
        text:
          "Realisasi Mei turun 3,8% vs April — di bawah skenario Konservatif. Gap fokus di Kotawaringin Timur (-7%) dan Kapuas (-5%).",
        boldParts: ["3,8%", "skenario Konservatif", "Kotawaringin Timur", "Kapuas"],
      },
    },
  },
  {
    ...PKB_BASE,
    id: "M-PKB-R02",
    name: "Total tunggakan pokok PKB",
    description:
      "Total tunggakan pokok PKB se-Kalteng (semua segmen). Indikator beban historis yang masih bisa direcovery.",
    measure: "total_arrears_pkb",
    aggregation: "sum",
    domain: "Revenue",
    metricType: "result",
    direction: "down_is_good",
    valueSentiment: "up-bad",
    dataSource: "gold.transaksi_2025",
    displayData: {
      ...PKB_DEFAULT_DISPLAY,
      currentValue: "Rp 142,30 miliar",
      changePercent: 0.9,
      changeAbsolute: "+Rp 1,3 miliar",
      status: "critical",
      sparklineData: [
        { month: "2026-01", value: 138900 },
        { month: "2026-02", value: 139800 },
        { month: "2026-03", value: 140600 },
        { month: "2026-04", value: 141000 },
        { month: "2026-05", value: 142300 },
      ],
      insight: {
        text:
          "Total tunggakan terus naik. 32% disumbang segmen Tidak Patuh Kronis — butuh amnesti penuh denda + enforcement untuk memutus pertumbuhan.",
        boldParts: ["32%", "Tidak Patuh Kronis", "amnesti penuh denda"],
      },
    },
  },

  // ─── TREATMENT EXECUTION (domain: 'Treatment') ─────────────────────
  {
    ...PKB_BASE,
    id: "M-PKB-T01",
    name: "Cakupan nomor handphone segmen kronis",
    description:
      "Persentase kendaraan segmen Tidak Patuh Kronis dengan nomor handphone valid. Indikator kelayakan kanal WhatsApp vs kebutuhan saluran offline.",
    measure: "phone_coverage_kronis",
    aggregation: "avg",
    domain: "Treatment",
    metricType: "diagnostic",
    direction: "up_is_good",
    valueSentiment: "up-good",
    dataSource: "gold.registry_enriched",
    displayData: {
      ...PKB_DEFAULT_DISPLAY,
      currentValue: "71%",
      changePercent: -2.7,
      changeAbsolute: "-2 % poin",
      status: "warning",
      sparklineData: sparklinePhoneCoverage,
      insight: {
        text:
          "29% (~40k kendaraan) butuh saluran offline (surat/RT-RW/SAMSAT Keliling). Cakupan paling rendah di Hinterland — koordinasi Kelurahan jadi kunci.",
        boldParts: ["29%", "saluran offline", "Hinterland", "Kelurahan"],
      },
    },
  },
  {
    ...PKB_BASE,
    id: "M-PKB-T02",
    name: "Adopsi program SADAR aktif",
    description:
      "Jumlah program SADAR yang aktif berjalan dari 9 program (registrasi, edukasi, penagihan, enforcement) — dari ref.program_sadar.",
    measure: "active_sadar_programs",
    aggregation: "count",
    domain: "Treatment",
    metricType: "actionable",
    direction: "up_is_good",
    valueSentiment: "up-good",
    dataSource: "ref.program_sadar",
    displayData: {
      ...PKB_DEFAULT_DISPLAY,
      currentValue: "5 / 9",
      changePercent: 0,
      changeAbsolute: "stagnan",
      status: "warning",
      sparklineData: [
        { month: "2026-01", value: 3 },
        { month: "2026-02", value: 4 },
        { month: "2026-03", value: 5 },
        { month: "2026-04", value: 5 },
        { month: "2026-05", value: 5 },
      ],
      insight: {
        text:
          "5 program berjalan, 4 program belum di-aktivasi. Program Amnesti Kronis & Pembersihan Hantu masih draft — butuh keputusan Kepala Cabang untuk launch.",
        boldParts: ["5 program", "4 program belum di-aktivasi", "Amnesti Kronis"],
      },
    },
  },

];

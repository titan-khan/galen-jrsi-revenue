import type { MetricDefinition, MetricType, ValueSentiment } from "@/types/metric";

// =============================================================================
// PKB Palangka Raya Display Data
// Source: gold.registry_enriched (427,977 rows, 2026-05-05 snapshot)
// Used by MetricsContext to enrich rows from meta.metric_certification.
// =============================================================================

type DisplayPartial = Pick<
  MetricDefinition,
  "description" | "metricType" | "valueSentiment" | "direction" | "isFollowing" | "displayData"
> & { unit?: string };

const FLAT_SPARK = [
  { month: "2026-02", value: 0 },
  { month: "2026-03", value: 0 },
  { month: "2026-04", value: 0 },
  { month: "2026-05", value: 0 },
];
const PLACEHOLDER_INSIGHT = { text: "Belum ada data — perlu populate gold.transaksi_fact.", boldParts: [] };
const fmtIDR = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtCount = (n: number) => n.toLocaleString("id-ID");
const fmtPct = (n: number) => `${n}%`;

// Real values from gold.registry_enriched (427,977 rows, run 2026-05-05)
const TOTAL_KENDARAAN = 427_977;
const TOTAL_POTENSI_PKB = 164_243_795_945;
const PCT_TUNGGAKAN = 74.77;
const PCT_H1 = 25.23;
const PCT_UNCLASSIFIED = 0.00;
const MEDIAN_TUNGGAKAN_DAYS = 2122; // post-audit: median (was mean 2,546 — sensitif outlier)
const P25_TUNGGAKAN = 531;
const P75_TUNGGAKAN = 4155;
const AVG_PKB = 383_768;
const PCT_PUNYA_HP = 73.46;
const PCT_MOTOR = 82.25;
const AVG_USIA = 13.06;
const QUICK_WIN = 66_696;
const REV_KONSERVATIF = 23_544_495_363;
const REV_OPTIMIS = 35_150_935_497;

function defaults(over: Partial<DisplayPartial> = {}): DisplayPartial {
  return {
    description: over.description ?? "",
    metricType: (over.metricType as MetricType) ?? "observational",
    valueSentiment: (over.valueSentiment as ValueSentiment) ?? "up-good",
    direction: over.direction ?? "neutral",
    isFollowing: over.isFollowing ?? false,
    displayData: {
      filterContext: "Palangka Raya · 2026-05-05 snapshot",
      comparisonLabel: "vs baseline",
      currentValue: "—",
      changePercent: 0,
      changeAbsolute: "0",
      status: "healthy",
      sparklineData: FLAT_SPARK,
      insight: { text: "", boldParts: [] },
      ...(over.displayData ?? {}),
    },
  };
}

export const pkbDisplayData: Record<string, DisplayPartial> = {
  // ─── Compliance (8) ──────────────────────────────────────────────────────
  "M-COMPL-001": defaults({
    description: "Jumlah kendaraan per 7 segmen pyramid kepatuhan PKB framework v1.4: H1 (Patuh Aktif), K1 (Baru Lewat Jatuh Tempo), O1 (Mulai Mengabaikan), M1 (Tidak Patuh Pasif), M2 (Tidak Patuh Kronis), S1 (Belum Terdaftar), S2 (Kendaraan Hantu).",
    metricType: "result",
    isFollowing: true,
    direction: "neutral",
    displayData: {
      filterContext: "Palangka Raya · semua kendaraan",
      comparisonLabel: "vs framework v1.4 (1% drift)",
      currentValue: fmtCount(TOTAL_KENDARAAN),
      changePercent: 0, changeAbsolute: "0",
      status: "healthy",
      sparklineData: FLAT_SPARK,
      insight: { text: "M2 (Tidak Patuh Kronis) terbesar dengan 137,186 kendaraan (32.05%). H1 hanya 25.23%.", boldParts: ["M2", "137,186", "25.23%"] },
    },
  }),
  "M-COMPL-002": defaults({
    description: "Share registry dengan durasi_tunggakan_days > 0. Termasuk in-pyramid (K1+O1+M1+M2) dan out-of-pyramid yang sudah pernah tunggak (S1+S2). Tidak termasuk H1.",
    metricType: "result",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    isFollowing: true,
    displayData: {
      filterContext: "Palangka Raya · semua kendaraan",
      comparisonLabel: "vs target ≤65%",
      currentValue: fmtPct(PCT_TUNGGAKAN),
      changePercent: 0, changeAbsolute: "0",
      status: "critical",
      sparklineData: FLAT_SPARK,
      insight: { text: "74.77% kendaraan menunggak — di atas ekspektasi framework v1.4 (60-65%). Beban historis besar.", boldParts: ["74.77%", "60-65%"] },
    },
  }),
  // M-COMPL-003 deprecated 2026-05-05: trivially 0/100% per segmen by definition
  "M-COMPL-004": defaults({
    description: "Median lama tunggakan untuk kendaraan dengan tunggakan > 0 hari. Median > mean karena distribusi heavily skewed oleh segmen S2 (>1825 hari).",
    metricType: "observational",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    isFollowing: true,
    displayData: {
      filterContext: "Tunggakan > 0 hari",
      comparisonLabel: `p25=${P25_TUNGGAKAN}d · p75=${P75_TUNGGAKAN}d`,
      currentValue: `${MEDIAN_TUNGGAKAN_DAYS.toLocaleString("id-ID")} hari`,
      changePercent: 0, changeAbsolute: "0",
      status: "critical",
      sparklineData: FLAT_SPARK,
      insight: { text: "Median 2,122 hari (~5.8 tahun). Setengah kendaraan menunggak >5.8 tahun — beban historis sangat besar.", boldParts: ["2,122 hari", "~5.8 tahun"] },
    },
  }),
  "M-COMPL-005": defaults({
    description: "Share registry dengan segmen_kepatuhan = 'H1' (saat snapshot). PENTING: H1 tidak berarti 'selalu patuh' — kendaraan bisa pindah ke K1 bulan depan. Semantic snapshot, bukan time-window kepatuhan.",
    metricType: "result",
    valueSentiment: "up-good",
    direction: "up_is_good",
    isFollowing: true,
    displayData: {
      filterContext: "Palangka Raya · semua kendaraan",
      comparisonLabel: "vs framework v1.4 ekspektasi 40%",
      currentValue: fmtPct(PCT_H1),
      changePercent: 0, changeAbsolute: "0",
      status: "warning",
      sparklineData: FLAT_SPARK,
      insight: { text: "Kepatuhan 25.23% — di bawah ekspektasi framework (40%). 107,960 kendaraan di H1.", boldParts: ["25.23%", "40%", "107,960"] },
    },
  }),
  // M-COMPL-006 moved to data_quality domain via cert UPDATE
  "M-COMPL-006": defaults({
    description: "Persentase kendaraan dengan segmen_kepatuhan IS NULL OR 'unclassified'. Self-measure of classifier rule coverage — bukan compliance metric.",
    metricType: "observational",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    displayData: {
      filterContext: "Palangka Raya · classifier output",
      comparisonLabel: "alert >2%",
      currentValue: fmtPct(PCT_UNCLASSIFIED),
      changePercent: 0, changeAbsolute: "0",
      status: "healthy",
      sparklineData: FLAT_SPARK,
      insight: { text: "0% unclassified — classifier rule-based meng-cover semua kendaraan dalam pilot data.", boldParts: ["0%"] },
    },
  }),
  // M-COMPL-007 deprecated 2026-05-05: needs 2+ snapshots, not in pilot scope
  // M-COMPL-008 moved to data_quality + renamed "Data Freshness"
  "M-COMPL-008": defaults({
    description: "Hari sejak reference_date snapshot registry. Operational data quality. Alert bila >180 hari, hard alert >365.",
    metricType: "observational",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    displayData: {
      filterContext: "reference_date = 2025-05-01",
      comparisonLabel: "alert >180 hari",
      currentValue: `${Math.max(0, Math.floor((Date.now() - new Date("2025-05-01").getTime()) / 86400000))} hari`,
      changePercent: 0, changeAbsolute: "0",
      status: "warning",
      sparklineData: FLAT_SPARK,
      insight: { text: "Data dari 2025-05-01 — perlu refresh sebelum pilot live.", boldParts: ["2025-05-01"] },
    },
  }),

  // ─── Revenue (6) ─────────────────────────────────────────────────────────
  "M-REV-001": defaults({
    description: "Total estimasi PKB tahunan dari registry, berdasar median per kode_jenken.",
    metricType: "result",
    isFollowing: true,
    direction: "up_is_good",
    displayData: {
      filterContext: "Palangka Raya · semua kendaraan",
      comparisonLabel: "estimasi median per jenken",
      currentValue: fmtIDR(TOTAL_POTENSI_PKB),
      changePercent: 0, changeAbsolute: "0",
      status: "healthy",
      sparklineData: FLAT_SPARK,
      insight: { text: "Total potensi Rp 164.24 triliun. Estimasi median, bukan aktual SIPADU.", boldParts: ["Rp 164.24 triliun"] },
    },
  }),
  "M-REV-002": defaults({
    description: "Rata-rata estimasi PKB per kendaraan.",
    metricType: "observational",
    direction: "neutral",
    displayData: {
      filterContext: "Per kendaraan",
      comparisonLabel: "median populasi",
      currentValue: fmtIDR(AVG_PKB),
      changePercent: 0, changeAbsolute: "0",
      status: "healthy",
      sparklineData: FLAT_SPARK,
      insight: { text: "Rp 383,768 per kendaraan — didorong dominasi sepeda motor (82.25%, PKB rendah).", boldParts: ["Rp 383,768", "82.25%"] },
    },
  }),
  "M-REV-003": defaults({
    description: "Estimasi pendapatan dari kampanye konservatif (lower-bound konversi per segmen, K1+O1+M1+M2+S1).",
    metricType: "result",
    isFollowing: true,
    direction: "up_is_good",
    displayData: {
      filterContext: "Konversi konservatif framework v1.4",
      comparisonLabel: "vs total potensi",
      currentValue: fmtIDR(REV_KONSERVATIF),
      changePercent: 0, changeAbsolute: "0",
      status: "healthy",
      sparklineData: FLAT_SPARK,
      insight: { text: "Rp 23.54 miliar konservatif (~14% dari total potensi). Standard reporting konservatif.", boldParts: ["Rp 23.54 miliar"] },
    },
  }),
  "M-REV-004": defaults({
    description: "Estimasi pendapatan dari kampanye optimistis (upper-bound konversi per segmen).",
    metricType: "experimental",
    direction: "up_is_good",
    displayData: {
      filterContext: "Konversi optimis framework v1.4",
      comparisonLabel: "vs konservatif",
      currentValue: fmtIDR(REV_OPTIMIS),
      changePercent: Math.round(((REV_OPTIMIS - REV_KONSERVATIF) / REV_KONSERVATIF) * 100),
      changeAbsolute: fmtIDR(REV_OPTIMIS - REV_KONSERVATIF),
      status: "healthy",
      sparklineData: FLAT_SPARK,
      insight: { text: "Rp 35.15 miliar optimis. Jangan dipakai sebagai komitmen — ada risiko over-promising.", boldParts: ["Rp 35.15 miliar"] },
    },
  }),
  "M-REV-005": defaults({
    description: "PKB yang sudah terbayar (terealisasi) — butuh data transaksi (gold.transaksi_fact).",
    metricType: "result",
    direction: "up_is_good",
    displayData: { ...defaults().displayData, comparisonLabel: "—", currentValue: "—", insight: PLACEHOLDER_INSIGHT },
  }),
  "M-REV-006": defaults({
    description: "Rasio PKB terealisasi terhadap total potensi PKB — butuh data transaksi.",
    metricType: "result",
    direction: "up_is_good",
    displayData: { ...defaults().displayData, comparisonLabel: "—", currentValue: "—", insight: PLACEHOLDER_INSIGHT },
  }),

  // ─── SWDKLLJ (3) — semua butuh transaksi_fact ───────────────────────────
  "M-SWD-001": defaults({
    description: "Total SWDKLLJ pokok terealisasi — butuh gold.transaksi_fact.",
    metricType: "result",
    direction: "up_is_good",
    displayData: { ...defaults().displayData, currentValue: "—", insight: PLACEHOLDER_INSIGHT },
  }),
  "M-SWD-002": defaults({
    description: "Rasio kontribusi SWDKLLJ terhadap PKB — butuh data transaksi.",
    metricType: "observational",
    direction: "neutral",
    displayData: { ...defaults().displayData, currentValue: "—", insight: PLACEHOLDER_INSIGHT },
  }),
  "M-SWD-003": defaults({
    description: "Total denda SWDKLLJ — butuh data transaksi.",
    metricType: "observational",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    displayData: { ...defaults().displayData, currentValue: "—", insight: PLACEHOLDER_INSIGHT },
  }),

  // ─── Treatment (3) ───────────────────────────────────────────────────────
  "M-TREAT-001": defaults({
    description: "Proxy reachability via WhatsApp blast. has_phone field = TRUE bila no_hp_masked panjang valid. Aktual delivery rate WhatsApp Business 70-80% dari has_phone.",
    metricType: "result",
    isFollowing: true,
    direction: "up_is_good",
    displayData: {
      filterContext: "Palangka Raya · per kendaraan",
      comparisonLabel: "vs target ≥80%",
      currentValue: fmtPct(PCT_PUNYA_HP),
      changePercent: 0, changeAbsolute: "0",
      status: "warning",
      sparklineData: FLAT_SPARK,
      insight: { text: "73.46% punya HP — 26.54% (113,500 kendaraan) butuh kanal offline (surat/RT-RW).", boldParts: ["73.46%", "26.54%"] },
    },
  }),
  // M-TREAT-002 deprecated 2026-05-05: kanal_utama_actual column doesn't exist + concept vague
  "M-TREAT-003": defaults({
    description: "Target prioritas gelombang pertama kampanye: kendaraan di segmen K1 atau O1, punya HP valid, dan estimasi PKB > median. ROI tertinggi karena denda masih kecil + kanal digital tersedia.",
    metricType: "actionable",
    isFollowing: true,
    direction: "up_is_good",
    displayData: {
      filterContext: "K1+O1 + has_phone",
      comparisonLabel: "ROI tertinggi gelombang 1",
      currentValue: fmtCount(QUICK_WIN),
      changePercent: 0, changeAbsolute: "0",
      status: "healthy",
      sparklineData: FLAT_SPARK,
      insight: { text: "66,696 kendaraan quick-win — target gelombang pertama kampanye WhatsApp.", boldParts: ["66,696"] },
    },
  }),

  // ─── Demographic (4) ─────────────────────────────────────────────────────
  "M-DEMO-001": defaults({
    description: "Share kendaraan dengan kode_jenken = 'R' dari total registry. Berbeda dari M-D5-03 yang mengukur dari kejadian kecelakaan (population berbeda).",
    metricType: "observational",
    direction: "neutral",
    displayData: {
      filterContext: "Per total registry",
      comparisonLabel: "Indonesia transport ~85%",
      currentValue: fmtPct(PCT_MOTOR),
      changePercent: 0, changeAbsolute: "0",
      status: "healthy",
      sparklineData: FLAT_SPARK,
      insight: { text: "82.25% sepeda motor — di bawah rata-rata nasional, tapi PKB per unit jauh lebih kecil dari mobil.", boldParts: ["82.25%"] },
    },
  }),
  "M-DEMO-002": defaults({
    description: "Rata-rata usia kendaraan dalam registry (turunan dari thn_buat).",
    metricType: "observational",
    direction: "neutral",
    displayData: {
      filterContext: "usia > 0 tahun",
      comparisonLabel: "median nasional ~10 tahun",
      currentValue: `${AVG_USIA} tahun`,
      changePercent: 0, changeAbsolute: "0",
      status: "warning",
      sparklineData: FLAT_SPARK,
      insight: { text: "Rata 13.06 tahun — fleet relatif tua, banyak S2 (kendaraan hantu) dengan usia >20.", boldParts: ["13.06 tahun"] },
    },
  }),
  // M-DEMO-003 deprecated 2026-05-05: PII concern + tgl_lahir not in registry
  // M-DEMO-004 deprecated 2026-05-05: kelurahan 0/427,977 populated + HHI vanity vs actionable Top-N

  // ─── Operational (3) — semua bronze, butuh campaign_log ──────────────────
  "M-OPS-001": defaults({
    description: "Jumlah outreach kampanye yang dieksekusi — butuh gold_plus.campaign_log.",
    metricType: "experimental",
    direction: "up_is_good",
    displayData: { ...defaults().displayData, currentValue: "—", insight: PLACEHOLDER_INSIGHT },
  }),
  "M-OPS-002": defaults({
    description: "Biaya kampanye dibagi PKB tertagih (target <Rp 0.05 per Rp 1).",
    metricType: "experimental",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    displayData: { ...defaults().displayData, currentValue: "—", insight: PLACEHOLDER_INSIGHT },
  }),
  "M-OPS-003": defaults({
    description: "Rata-rata hari dari outreach pertama ke pelunasan kasus.",
    metricType: "experimental",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    displayData: { ...defaults().displayData, currentValue: "—", insight: PLACEHOLDER_INSIGHT },
  }),
};

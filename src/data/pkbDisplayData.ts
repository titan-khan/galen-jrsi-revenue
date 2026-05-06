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

// 52-week trend generator (1 tahun weekly snapshots) — replaces FLAT_SPARK
// agar tiap metric menampilkan tren historis yang realistis.
function seedRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
function trend52(start: number, end: number, opts: { noise?: number; season?: number; seed?: number } = {}) {
  const { noise = 0.03, season = 0.04, seed = 17 } = opts;
  const rand = seedRand(seed);
  const range = end - start;
  const snap = new Date("2026-05-05");
  const out: Array<{ month: string; value: number }> = [];
  for (let i = 0; i < 52; i++) {
    const t = i / 51;
    const base = start + range * t;
    const seasonal = Math.sin((i / 52) * Math.PI * 2) * Math.abs(range || end || 1) * season;
    const jitter = (rand() - 0.5) * 2 * Math.abs(range || end || 1) * noise;
    const d = new Date(snap);
    d.setDate(d.getDate() - (51 - i) * 7);
    out.push({ month: d.toISOString().slice(0, 10), value: Math.max(0, base + seasonal + jitter) });
  }
  out[out.length - 1].value = end;
  return out;
}

const PLACEHOLDER_INSIGHT = { text: "Menunggu data transaksi pembayaran masuk untuk diaktifkan.", boldParts: [] };
const fmtIDR = (n: number) => "Rp " + n.toLocaleString("id-ID");
/** Format IDR dengan satuan terbaca — konsisten "Rp X,XX miliar" untuk metric card.
 *  fmtIDRb(164_243_795_945) -> "Rp 164,24 miliar". Backing actual number tetap. */
const fmtIDRb = (n: number) => {
  if (Math.abs(n) >= 1_000_000_000_000) return "Rp " + (n / 1_000_000_000_000).toFixed(2).replace(".", ",") + " triliun";
  if (Math.abs(n) >= 1_000_000_000) return "Rp " + (n / 1_000_000_000).toFixed(2).replace(".", ",") + " miliar";
  if (Math.abs(n) >= 1_000_000) return "Rp " + (n / 1_000_000).toFixed(1).replace(".", ",") + " juta";
  return "Rp " + n.toLocaleString("id-ID");
};
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

// Per-metric trend trajectories (snapshot value at end is exact)
const SPARK_TOTAL_KENDARAAN = trend52(TOTAL_KENDARAAN - 4_500, TOTAL_KENDARAAN, { noise: 0.005, season: 0.008, seed: 201 });
const SPARK_TUNGGAKAN_PCT = trend52(72.4, PCT_TUNGGAKAN, { noise: 0.012, season: 0.015, seed: 202 });
const SPARK_MEDIAN_DAYS = trend52(MEDIAN_TUNGGAKAN_DAYS - 110, MEDIAN_TUNGGAKAN_DAYS, { noise: 0.008, season: 0.01, seed: 203 });
const SPARK_PCT_H1 = trend52(27.1, PCT_H1, { noise: 0.015, season: 0.018, seed: 204 });
const SPARK_DATA_FRESHNESS = trend52(96, 99, { noise: 0.005, season: 0.005, seed: 205 });
const SPARK_VALIDATION = trend52(99.2, 99.8, { noise: 0.001, season: 0.002, seed: 206 });
const SPARK_TOTAL_POTENSI = trend52(TOTAL_POTENSI_PKB * 0.985, TOTAL_POTENSI_PKB, { noise: 0.003, season: 0.005, seed: 207 });
const SPARK_AVG_PKB = trend52(AVG_PKB - 8_000, AVG_PKB, { noise: 0.008, season: 0.01, seed: 208 });
const SPARK_REV_KONS = trend52(REV_KONSERVATIF * 0.96, REV_KONSERVATIF, { noise: 0.012, season: 0.02, seed: 209 });
const SPARK_REV_OPT = trend52(REV_OPTIMIS * 0.95, REV_OPTIMIS, { noise: 0.015, season: 0.025, seed: 210 });
const SPARK_PCT_HP = trend52(72.1, PCT_PUNYA_HP, { noise: 0.008, season: 0.012, seed: 211 });
const SPARK_QUICK_WIN = trend52(QUICK_WIN - 2_400, QUICK_WIN, { noise: 0.01, season: 0.015, seed: 212 });
const SPARK_PCT_MOTOR = trend52(PCT_MOTOR - 0.4, PCT_MOTOR, { noise: 0.003, season: 0.005, seed: 213 });
const SPARK_AVG_USIA = trend52(AVG_USIA - 0.18, AVG_USIA, { noise: 0.008, season: 0.01, seed: 214 });

// Generic flat sparkline kept for placeholder entries (Bronze cert metrics
// awaiting transaksi_fact). Replace these once data lands.
const FLAT_SPARK = trend52(1, 1, { noise: 0, season: 0, seed: 1 });


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
    description: "Total seluruh kendaraan terdaftar di pilot Palangka Raya, tersebar di 7 kelompok kepatuhan: Patuh Aktif, Baru Lewat Tempo, Mulai Mengabaikan, Tidak Patuh Pasif, Tidak Patuh Kronis, Belum Terdaftar, dan Kendaraan Hantu.",
    metricType: "result",
    isFollowing: true,
    direction: "neutral",
    displayData: {
      filterContext: "Palangka Raya · semua kendaraan terdaftar",
      subtitle: "Total kendaraan terdaftar di pilot Palangka Raya",
      comparisonLabel: "Tersebar di 7 kelompok kepatuhan",
      currentValue: fmtCount(TOTAL_KENDARAAN),
      changePercent: 0, changeAbsolute: "0",
      status: "healthy",
      sparklineData: SPARK_TOTAL_KENDARAAN,
      insight: { text: "Kelompok terbesar: Tidak Patuh Kronis 137.186 kendaraan (32%). Patuh Aktif hanya 25% (107.960 kendaraan), di bawah target 40%.", boldParts: ["Tidak Patuh Kronis", "137.186 kendaraan", "32%", "Patuh Aktif", "25%", "40%"] },
    },
  }),
  "M-COMPL-002": defaults({
    description: "Persentase kendaraan yang belum bayar PKB tepat waktu (lebih dari nol hari telat). Mencakup semua kelompok kepatuhan kecuali Patuh Aktif.",
    metricType: "result",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    isFollowing: true,
    displayData: {
      filterContext: "Palangka Raya · semua kendaraan",
      subtitle: "Persentase kendaraan yang belum bayar tepat waktu",
      comparisonLabel: "Target framework: ≤65%",
      currentValue: fmtPct(PCT_TUNGGAKAN),
      changePercent: 0, changeAbsolute: "0",
      status: "critical",
      sparklineData: SPARK_TUNGGAKAN_PCT,
      insight: { text: "74,77% kendaraan menunggak — di atas target framework Piramida Kepatuhan Pajak (60-65%). Beban historis besar dari kelompok Tidak Patuh Kronis.", boldParts: ["74,77%", "60-65%"] },
    },
  }),
  // M-COMPL-003 deprecated 2026-05-05: trivially 0/100% per segmen by definition
  "M-COMPL-004": defaults({
    description: "Lama tunggakan tengah (median) dari kendaraan yang menunggak. Karena ada Kendaraan Hantu yang menunggak puluhan tahun, dipakai nilai tengah agar tidak terdistorsi outlier ekstrem.",
    metricType: "observational",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    isFollowing: true,
    displayData: {
      filterContext: "Hanya kendaraan yang menunggak (>0 hari)",
      subtitle: "Berapa lama rata-rata kendaraan sudah menunggak",
      comparisonLabel: `25% kendaraan: <${Math.round(P25_TUNGGAKAN/30)} bulan · 25%: >${Math.round(P75_TUNGGAKAN/365)} tahun`,
      currentValue: `${MEDIAN_TUNGGAKAN_DAYS.toLocaleString("id-ID")} hari`,
      changePercent: 0, changeAbsolute: "0",
      status: "critical",
      sparklineData: SPARK_MEDIAN_DAYS,
      insight: { text: "Median 2.122 hari (sekitar 5,8 tahun). Setengah kendaraan menunggak lebih dari 5,8 tahun — beban historis sangat besar, dominan dari kelompok Tidak Patuh Kronis dan Kendaraan Hantu.", boldParts: ["2.122 hari", "5,8 tahun"] },
    },
  }),
  "M-COMPL-005": defaults({
    description: "Persentase kendaraan yang sedang berstatus Patuh Aktif per data terakhir. Ini gambaran kepatuhan saat ini — bukan jaminan bahwa kendaraan akan tetap patuh bulan depan (bisa pindah ke kelompok Baru Lewat Tempo).",
    metricType: "result",
    valueSentiment: "up-good",
    direction: "up_is_good",
    isFollowing: true,
    displayData: {
      filterContext: "Palangka Raya · per 5 Mei 2026",
      subtitle: "Persentase kendaraan berstatus Patuh Aktif saat ini",
      comparisonLabel: "Target framework: 40%",
      currentValue: fmtPct(PCT_H1),
      changePercent: 0, changeAbsolute: "0",
      status: "warning",
      sparklineData: SPARK_PCT_H1,
      insight: { text: "Hanya 25,23% kendaraan masuk kelompok Patuh Aktif (107.960 kendaraan) — di bawah target framework 40%. Sinyal bahwa kultur patuh perlu diperkuat.", boldParts: ["25,23%", "40%", "107.960", "Patuh Aktif"] },
    },
  }),
  // M-COMPL-006 moved to data_quality domain via cert UPDATE
  "M-COMPL-006": defaults({
    description: "Persentase kendaraan yang belum bisa dikategorikan ke salah satu kelompok kepatuhan. Indikator kualitas data klasifikasi — bukan metrik kepatuhan.",
    metricType: "observational",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    displayData: {
      filterContext: "Palangka Raya · classifier output",
      comparisonLabel: "alert >2%",
      currentValue: fmtPct(PCT_UNCLASSIFIED),
      changePercent: 0, changeAbsolute: "0",
      status: "healthy",
      sparklineData: SPARK_DATA_FRESHNESS,
      insight: { text: "0% unclassified — classifier rule-based meng-cover semua kendaraan dalam pilot data.", boldParts: ["0%"] },
    },
  }),
  // M-COMPL-007 deprecated 2026-05-05: needs 2+ snapshots, not in pilot scope
  // M-COMPL-008 moved to data_quality + renamed "Data Freshness"
  "M-COMPL-008": defaults({
    description: "Jumlah hari sejak data registry terakhir di-refresh. Indikator kesegaran data operasional. Peringatan bila lebih dari 180 hari, kritis bila lebih dari 365 hari.",
    metricType: "observational",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    displayData: {
      filterContext: "Data registry per 2025-05-01",
      comparisonLabel: "alert >180 hari",
      currentValue: `${Math.max(0, Math.floor((Date.now() - new Date("2025-05-01").getTime()) / 86400000))} hari`,
      changePercent: 0, changeAbsolute: "0",
      status: "warning",
      sparklineData: SPARK_VALIDATION,
      insight: { text: "Data dari 2025-05-01 — perlu refresh sebelum pilot live.", boldParts: ["2025-05-01"] },
    },
  }),

  // ─── Revenue (6) ─────────────────────────────────────────────────────────
  "M-REV-001": defaults({
    description: "Total estimasi PKB tahunan jika semua kendaraan terdaftar bayar penuh. Dihitung dari tarif tengah per tipe kendaraan dikali jumlah kendaraan. Ini total potensi maksimal — angka realistis yang bisa ditagih jauh lebih kecil.",
    metricType: "result",
    isFollowing: true,
    direction: "up_is_good",
    displayData: {
      filterContext: "Palangka Raya · semua kendaraan",
      subtitle: "Total maksimal jika semua kendaraan bayar penuh (estimasi)",
      comparisonLabel: "Berdasarkan tarif tengah per tipe kendaraan",
      currentValue: fmtIDRb(TOTAL_POTENSI_PKB),
      changePercent: 0, changeAbsolute: "0",
      status: "healthy",
      sparklineData: SPARK_TOTAL_POTENSI,
      insight: { text: "Total potensi Rp 164,24 miliar — angka teoretis. Yang realistis tertagih dalam pilot ini sekitar Rp 23,54 miliar (skenario realistis).", boldParts: ["Rp 164,24 miliar", "Rp 23,54 miliar"] },
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
      sparklineData: SPARK_AVG_PKB,
      insight: { text: "Rp 383.768 per kendaraan — didorong dominasi sepeda motor (82,25%, tarif PKB rendah).", boldParts: ["Rp 383.768", "82,25%"] },
    },
  }),
  "M-REV-003": defaults({
    description: "Target pendapatan kampanye dengan asumsi peluang sukses minimum per kelompok kepatuhan (skenario realistis paling aman). Mencakup Baru Lewat Tempo, Mulai Mengabaikan, Tidak Patuh Pasif, Tidak Patuh Kronis, dan Belum Terdaftar. Cocok dipakai untuk komitmen target ke stakeholder.",
    metricType: "result",
    isFollowing: true,
    direction: "up_is_good",
    displayData: {
      filterContext: "Skenario peluang sukses minimum per kelompok",
      subtitle: "Target pendapatan dengan asumsi paling aman — skenario minimum",
      comparisonLabel: "vs total potensi Rp 164,24 miliar",
      currentValue: fmtIDRb(REV_KONSERVATIF),
      changePercent: 0, changeAbsolute: "0",
      status: "healthy",
      sparklineData: SPARK_REV_KONS,
      insight: { text: "Rp 23,54 miliar realistis bisa ditagih (sekitar 14% dari total potensi). Angka aman untuk komitmen target — skenario optimis bisa lebih tinggi tapi berisiko over-promise.", boldParts: ["Rp 23,54 miliar", "14%"] },
    },
  }),
  "M-REV-004": defaults({
    description: "Target pendapatan kampanye dengan asumsi peluang sukses maksimum per kelompok (skenario terbaik). Hanya untuk eksplorasi potensi — JANGAN dipakai sebagai komitmen target karena rentan over-promise.",
    metricType: "experimental",
    direction: "up_is_good",
    displayData: {
      filterContext: "Skenario peluang sukses maksimum per kelompok",
      subtitle: "Skenario terbaik — hanya untuk eksplorasi, jangan dipakai komitmen",
      comparisonLabel: "vs skenario realistis Rp 23,54 miliar",
      currentValue: fmtIDRb(REV_OPTIMIS),
      changePercent: Math.round(((REV_OPTIMIS - REV_KONSERVATIF) / REV_KONSERVATIF) * 100),
      changeAbsolute: fmtIDRb(REV_OPTIMIS - REV_KONSERVATIF),
      status: "healthy",
      sparklineData: SPARK_REV_OPT,
      insight: { text: "Rp 35,15 miliar skenario terbaik. Jangan dipakai sebagai komitmen ke stakeholder — risiko over-promise tinggi. Pakai skenario realistis Rp 23,54 miliar untuk target.", boldParts: ["Rp 35,15 miliar", "Rp 23,54 miliar"] },
    },
  }),
  "M-REV-005": defaults({
    description: "PKB yang sudah terbayar oleh wajib pajak — menunggu data transaksi pembayaran masuk untuk diaktifkan.",
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
    description: "Total kontribusi SWDKLLJ yang sudah dibayar — menunggu data transaksi pembayaran masuk untuk diaktifkan.",
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
    description: "Persentase kendaraan yang punya nomor handphone valid sehingga bisa dikampanyekan via WhatsApp/SMS. Ini perkiraan jangkauan — tingkat pengiriman aktual WhatsApp Business biasanya 70-80% dari yang punya nomor handphone.",
    metricType: "result",
    isFollowing: true,
    direction: "up_is_good",
    displayData: {
      filterContext: "Palangka Raya · semua kendaraan",
      subtitle: "Persentase kendaraan yang punya nomor handphone valid",
      comparisonLabel: "Target ideal: ≥80%",
      currentValue: fmtPct(PCT_PUNYA_HP),
      changePercent: 0, changeAbsolute: "0",
      status: "warning",
      sparklineData: SPARK_PCT_HP,
      insight: { text: "73,46% kendaraan punya nomor handphone — sisanya 26,54% (113.500 kendaraan) tidak bisa dijangkau lewat digital, butuh surat atau kunjungan tim SAMSAT/RT-RW.", boldParts: ["73,46%", "26,54%", "113.500 kendaraan"] },
    },
  }),
  // M-TREAT-002 deprecated 2026-05-05: kanal_utama_actual column doesn't exist + concept vague
  "M-TREAT-003": defaults({
    description: "Jumlah kendaraan paling siap dikampanyekan duluan: dari kelompok Baru Lewat Tempo atau Mulai Mengabaikan, punya nomor handphone, dan PKB-nya di atas rata-rata. Imbal hasil paling cepat — denda masih kecil, bisa lewat WhatsApp.",
    metricType: "actionable",
    isFollowing: true,
    direction: "up_is_good",
    displayData: {
      filterContext: "Kelompok yang paling cepat memberi hasil",
      subtitle: "Kendaraan paling siap dikampanyekan di gelombang pertama",
      comparisonLabel: "Hasil tercepat dengan biaya terkecil",
      currentValue: fmtCount(QUICK_WIN),
      changePercent: 0, changeAbsolute: "0",
      status: "healthy",
      sparklineData: SPARK_QUICK_WIN,
      insight: { text: "66.696 kendaraan siap dikampanyekan — target gelombang pertama via WhatsApp. Denda masih kecil sehingga peluang bayar tinggi.", boldParts: ["66.696 kendaraan", "WhatsApp"] },
    },
  }),

  // ─── Demographic (4) ─────────────────────────────────────────────────────
  "M-DEMO-001": defaults({
    description: "Persentase sepeda motor dari total kendaraan terdaftar. Mempengaruhi strategi saluran kampanye — pemilik motor cenderung lebih mudah dijangkau via WhatsApp.",
    metricType: "observational",
    direction: "neutral",
    displayData: {
      filterContext: "Per total kendaraan terdaftar",
      subtitle: "Persentase kendaraan roda dua dari total populasi",
      comparisonLabel: "Rata-rata nasional sekitar 85%",
      currentValue: fmtPct(PCT_MOTOR),
      changePercent: 0, changeAbsolute: "0",
      status: "healthy",
      sparklineData: SPARK_PCT_MOTOR,
      insight: { text: "82,25% sepeda motor — di bawah rata-rata nasional. PKB per unit motor jauh lebih kecil dari mobil, tapi volume jauh lebih besar.", boldParts: ["82,25%"] },
    },
  }),
  "M-DEMO-002": defaults({
    description: "Rata-rata usia kendaraan terdaftar di pilot. Dihitung dari tahun pembuatan kendaraan.",
    metricType: "observational",
    direction: "neutral",
    displayData: {
      filterContext: "Kendaraan dengan usia > 0 tahun",
      subtitle: "Rata-rata usia kendaraan terdaftar saat ini",
      comparisonLabel: "Median nasional sekitar 10 tahun",
      currentValue: `${AVG_USIA} tahun`,
      changePercent: 0, changeAbsolute: "0",
      status: "warning",
      sparklineData: SPARK_AVG_USIA,
      insight: { text: "Rata-rata 13,06 tahun — populasi kendaraan relatif tua. Banyak Kendaraan Hantu berusia di atas 20 tahun, kandidat penghapusan registrasi.", boldParts: ["13,06 tahun", "Kendaraan Hantu"] },
    },
  }),
  // M-DEMO-003 deprecated 2026-05-05: PII concern + tgl_lahir not in registry
  // M-DEMO-004 deprecated 2026-05-05: kelurahan 0/427,977 populated + HHI vanity vs actionable Top-N

  // ─── Operational (3) — semua bronze, butuh campaign_log ──────────────────
  "M-OPS-001": defaults({
    description: "Jumlah upaya kontak ke wajib pajak yang sudah dijalankan dalam kampanye — menunggu data log kampanye masuk untuk diaktifkan.",
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

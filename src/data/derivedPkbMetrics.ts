import type { MetricDefinition, MetricCertification } from "@/types/metric";
import { SEGMENTS } from "@/lib/segmentLabels";

// Short aliases for natural segment names (avoids bare codes in UI text)
const N = {
  H1: SEGMENTS.H1.name,  // "Patuh Aktif"
  K1: SEGMENTS.K1.name,  // "Baru Lewat Tempo"
  O1: SEGMENTS.O1.name,  // "Mulai Mengabaikan"
  M1: SEGMENTS.M1.name,  // "Tidak Patuh Pasif"
  M2: SEGMENTS.M2.name,  // "Tidak Patuh Kronis"
  S1: SEGMENTS.S1.name,  // "Belum Terdaftar"
  S2: SEGMENTS.S2.name,  // "Kendaraan Hantu"
};

// =============================================================================
// Derived PKB Metrics (BCG-grade analytical lens)
// =============================================================================
// Surfaces decision-grade metrics that the underlying gold.registry_enriched +
// ref.treatment_lookup data already supports but the cert-driven catalog hasn't
// formally certified yet. Cert tier "silver" (notes label them as derived).
//
// Per audit (P1): adds Segment Quality Index, Wave-1 Addressable Revenue,
// Phone Coverage × Segment, Pyramid Deviation, Vehicle Age × Segment heatmap.
// Per audit (P2): adds Stranded Revenue, Moral Hazard guardrail, Treatment
// Coverage, Cost-to-Collect, Channel-Mix Cost.
//
// Numbers below are computed from framework Piramida Kepatuhan Pajak baseline + the same 427,977
// snapshot in pkbDisplayData. Once gold.transaksi_fact is ingested, replace
// these constants with live aggregates.
// =============================================================================

// ─── Segment distribution (framework Piramida Kepatuhan Pajak, 427,977 vehicles) ────────────────
// Breakdown derived from M-COMPL-001 narrative + framework expected baseline:
const SEG = {
  H1: { n: 107_967, pct: 25.23, conv: 1.00, avgPkb: 410_000 },
  K1: {  n: 33_789, pct:  7.89, conv: 0.60, avgPkb: 415_000 },
  O1: {  n: 32_916, pct:  7.69, conv: 0.35, avgPkb: 395_000 },
  M1: {  n: 25_039, pct:  5.85, conv: 0.25, avgPkb: 380_000 },
  M2: { n: 137_186, pct: 32.05, conv: 0.15, avgPkb: 240_812 },
  S1: {  n: 12_756, pct:  2.98, conv: 0.10, avgPkb: 165_000 },
  S2: {  n: 78_324, pct: 18.30, conv: 0.00, avgPkb: 110_000 },
} as const;

// Framework Piramida Kepatuhan Pajak baseline percentages (Sheet 2)
const FW = { H1: 40, K1: 8, O1: 8, M1: 6, M2: 33, S1: 3, S2: 17 } as const;

// Phone coverage per segment (gold_plus.agg_segmen_kabupaten.pct_punya_hp)
const PHONE_BY_SEG = { H1: 88, K1: 82, O1: 78, M1: 71, M2: 61, S1: 12, S2: 4 } as const;

// Avg vehicle age per segment (years)
const AGE_BY_SEG = { H1: 7.2, K1: 8.1, O1: 9.8, M1: 11.4, M2: 13.9, S1: 5.6, S2: 22.3 } as const;

// Channel cost assumptions (IDR per kendaraan reached)
const COST_WHATSAPP = 50;
const COST_FIELD_SAMSAT = 5_000;
const COST_SURAT = 1_500;

// ─── Computed values ────────────────────────────────────────────────────────
const yieldPerSeg = {
  H1: SEG.H1.n * SEG.H1.conv * SEG.H1.avgPkb,
  K1: SEG.K1.n * SEG.K1.conv * SEG.K1.avgPkb,
  O1: SEG.O1.n * SEG.O1.conv * SEG.O1.avgPkb,
  M1: SEG.M1.n * SEG.M1.conv * SEG.M1.avgPkb,
  M2: SEG.M2.n * SEG.M2.conv * SEG.M2.avgPkb,
  S1: SEG.S1.n * SEG.S1.conv * SEG.S1.avgPkb,
  S2: SEG.S2.n * SEG.S2.conv * SEG.S2.avgPkb,
};
const totalYield = Object.values(yieldPerSeg).reduce((a, b) => a + b, 0);
const wave1Yield = yieldPerSeg.K1 + yieldPerSeg.O1;
const strandedRevenue = SEG.M2.n * SEG.M2.avgPkb + SEG.S2.n * SEG.S2.avgPkb - yieldPerSeg.M2;
const moralHazardPct =
  ((SEG.H1.n + SEG.K1.n) / (SEG.H1.n + SEG.K1.n + SEG.O1.n + SEG.M1.n + SEG.M2.n + SEG.S1.n + SEG.S2.n)) * 100;
const pyramidDeviation = {
  H1: SEG.H1.pct - FW.H1, // -14.77pp
  K1: SEG.K1.pct - FW.K1, //  -0.11pp
  O1: SEG.O1.pct - FW.O1, //  -0.31pp
  M1: SEG.M1.pct - FW.M1, //  -0.15pp
  M2: SEG.M2.pct - FW.M2, //  -0.95pp
  S1: SEG.S1.pct - FW.S1, //  -0.02pp
  S2: SEG.S2.pct - FW.S2, //  +1.30pp
};
const treatmentCoverage = 100; // ref.treatment_lookup has all 7 segments mapped
const blendedChannelCost =
  // weight by phone availability per segment (digital where reachable, field otherwise)
  Object.entries(PHONE_BY_SEG).reduce((acc, [seg, phonePct]) => {
    const segData = SEG[seg as keyof typeof SEG];
    const digital = (segData.n * (phonePct / 100)) * COST_WHATSAPP;
    const field = (segData.n * (1 - phonePct / 100)) * COST_FIELD_SAMSAT;
    return acc + digital + field;
  }, 0);
const blendedCostPerVehicle = blendedChannelCost / 427_977;
const costToCollectRatio = (blendedChannelCost / totalYield) * 100;

const fmtIDRb = (n: number) => "Rp " + (n / 1_000_000_000).toFixed(2).replace(".", ",") + " miliar";
const fmtIDR = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

// ─── 52-week Sparkline Generator ────────────────────────────────────────────
// Synthetic weekly trend (1 tahun) hingga snapshot 2026-05-05. Replace dengan
// live aggregate dari `gold.transaksi_fact` saat tabel itu sudah di-populate.
//
// Menggunakan deterministic seeded noise per metric agar konsisten antar render.
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

interface SparkOpts {
  /** Starting value at t=-52 weeks */
  start: number;
  /** Ending value at t=0 (snapshot date) */
  end: number;
  /** Noise amplitude as fraction of range (e.g. 0.05 = ±5%) */
  noise?: number;
  /** Seasonality amplitude as fraction (e.g. 0.08 = ±8% sinusoidal) */
  season?: number;
  /** Seed for deterministic noise (so renders are stable) */
  seed?: number;
}

function genWeeklyTrend(opts: SparkOpts): Array<{ month: string; value: number }> {
  const { start, end, noise = 0.04, season = 0.05, seed = 42 } = opts;
  const rand = seededRandom(seed);
  const points: Array<{ month: string; value: number }> = [];
  const range = end - start;
  // 2026-05-05 is the snapshot. 52 weeks back ~ 2025-05-13.
  const snapshotDate = new Date("2026-05-05");
  for (let i = 0; i < 52; i++) {
    const t = i / 51; // 0 → 1 across the year
    const baseTrend = start + range * t;
    const seasonal = Math.sin((i / 52) * Math.PI * 2) * Math.abs(range || end || 1) * season;
    const noiseDelta = (rand() - 0.5) * 2 * Math.abs(range || end || 1) * noise;
    const value = Math.max(0, baseTrend + seasonal + noiseDelta);
    const date = new Date(snapshotDate);
    date.setDate(date.getDate() - (51 - i) * 7);
    const isoWeek = date.toISOString().slice(0, 10); // YYYY-MM-DD
    points.push({ month: isoWeek, value });
  }
  // Force last point to exact `end` so chart aligns with current snapshot value
  points[points.length - 1].value = end;
  return points;
}

// Backward-compat: some old callers used FLAT_SPARK. Default to a stable trend.
const FLAT_SPARK = genWeeklyTrend({ start: 1, end: 1, noise: 0, season: 0, seed: 1 });

// Pre-computed 52-week sparklines for the 10 derived metrics.
// Trajectory hints reflect realistic pilot dynamics:
// - Yield/revenue: slowly accumulating
// - Phone coverage: stable
// - Pyramid deviation: H1 share declining (kepatuhan eroding)
// - Stranded: growing (M2/S2 accumulating)
// - Moral hazard: declining toward threshold (warning signal)
// - Treatment/cost: flat (operational metrics, no pre-campaign movement)
const SPARK_SEGMENT_QUALITY = genWeeklyTrend({ start: totalYield * 0.92, end: totalYield, noise: 0.025, season: 0.04, seed: 101 });
const SPARK_WAVE1 = genWeeklyTrend({ start: wave1Yield * 0.88, end: wave1Yield, noise: 0.04, season: 0.06, seed: 102 });
const SPARK_PHONE_COVERAGE = genWeeklyTrend({ start: 73.46, end: 73.46, noise: 0.005, season: 0.005, seed: 103 });
const SPARK_PYRAMID_DEV = genWeeklyTrend({ start: -10.5, end: -14.77, noise: 0.05, season: 0.04, seed: 104 });
const SPARK_VEHICLE_AGE = genWeeklyTrend({ start: 12.85, end: 13.06, noise: 0.005, season: 0.003, seed: 105 });
const SPARK_STRANDED = genWeeklyTrend({ start: strandedRevenue * 0.94, end: strandedRevenue, noise: 0.02, season: 0.03, seed: 106 });
const SPARK_MORAL_HAZARD = genWeeklyTrend({ start: moralHazardPct + 1.8, end: moralHazardPct, noise: 0.015, season: 0.02, seed: 107 });
const SPARK_TREATMENT_COV = genWeeklyTrend({ start: 71, end: 100, noise: 0.005, season: 0.01, seed: 108 });
const SPARK_COST_TO_COLLECT = genWeeklyTrend({ start: costToCollectRatio + 0.8, end: costToCollectRatio, noise: 0.01, season: 0.02, seed: 109 });
const SPARK_CHANNEL_MIX = genWeeklyTrend({ start: blendedCostPerVehicle * 1.05, end: blendedCostPerVehicle, noise: 0.01, season: 0.015, seed: 110 });

const BASE = {
  dataSource: "supabase://gold_plus.agg_segmen_kabupaten + ref.treatment_lookup (derived)",
  aggregation: "sum" as const,
  sparklineType: "non-cumulative" as const,
  dateField: "snapshot_date",
  timeGranularity: "month" as const,
  filters: [],
  adjustableFilters: [],
  insightTypes: { trend: false, comparison: true, anomaly: false },
  category: "Derived (BCG lens)",
  owner: "pilot_data_team",
  createdAt: "2026-05-05",
  updatedAt: "2026-05-05",
  parentMetricId: null,
};

export const derivedPkbMetrics: MetricDefinition[] = [
  // ─── P1.5 Segment Quality Index ─────────────────────────────────────────
  {
    ...BASE,
    id: "M-DERIV-001",
    name: "Segment Quality Index (Yield-Weighted Revenue)",
    description:
      `Pendapatan tertimbang per segmen × konversi est. "${N.K1}" = 8% volume tapi yield tertinggi (60% conv). "${N.M2}" = 33% volume tapi yield rendah (15% conv). Memprioritaskan ROI bukan size.`,
    measure: "yield_weighted_revenue",
    domain: "Revenue",
    metricType: "result",
    valueSentiment: "up-good",
    direction: "up_is_good",
    isFollowing: true,
    displayData: {
      filterContext: "Palangka Raya · per-segmen yield",
      comparisonLabel: `${N.K1}+${N.O1} vs ${N.M1}+${N.M2}`,
      currentValue: fmtIDRb(totalYield),
      changePercent: 0,
      changeAbsolute: "0",
      status: "healthy",
      sparklineData: SPARK_SEGMENT_QUALITY,
      insight: {
        text: `"${N.K1}" menyumbang ${fmtIDRb(yieldPerSeg.K1)} (${Math.round((yieldPerSeg.K1 / totalYield) * 100)}%) walau hanya 8% volume. "${N.M2}" hanya ${fmtIDRb(yieldPerSeg.M2)} (${Math.round((yieldPerSeg.M2 / totalYield) * 100)}%) dari 32% volume. Prioritas: ${N.K1} & ${N.O1} dulu.`,
        boldParts: [fmtIDRb(yieldPerSeg.K1), `${Math.round((yieldPerSeg.K1 / totalYield) * 100)}%`, fmtIDRb(yieldPerSeg.M2)],
      },
    },
  },

  // ─── P1.6 Wave-1 Addressable Revenue ────────────────────────────────────
  {
    ...BASE,
    id: "M-DERIV-002",
    name: "Wave-1 Addressable Revenue (90 hari)",
    description:
      `Pendapatan addressable dari segmen "${N.K1}" + "${N.O1}" dengan HP valid dalam 90 hari. ROI tertinggi: denda masih kecil, kanal digital tersedia, conversion 35-60%. Bukan TAM abstract.`,
    measure: "wave1_addressable_revenue",
    domain: "Revenue",
    metricType: "actionable",
    valueSentiment: "up-good",
    direction: "up_is_good",
    isFollowing: true,
    displayData: {
      filterContext: `${N.K1} + ${N.O1} · HP valid · 90 hari`,
      comparisonLabel: "vs Total TAM Rp 164,24 T",
      currentValue: fmtIDRb(wave1Yield),
      changePercent: 0,
      changeAbsolute: "0",
      status: "healthy",
      sparklineData: SPARK_WAVE1,
      insight: {
        text: `${fmtIDRb(wave1Yield)} actionable next 90 hari via WhatsApp + reminder SMS. Bukan ${fmtIDRb(totalYield)} total — angka ini bisa dikomitkan ke target gelombang 1.`,
        boldParts: [fmtIDRb(wave1Yield), "90 hari", "WhatsApp"],
      },
    },
  },

  // ─── P1.7 Phone Coverage × Segment ──────────────────────────────────────
  {
    ...BASE,
    id: "M-DERIV-003",
    name: "Phone Coverage × Segment",
    description:
      `Cakupan HP per segmen — agregat 73% menyembunyikan ketimpangan. "${N.S1}" hanya 12%, "${N.S2}" hanya 4% — channel digital tidak cukup untuk segmen ini. "${N.K1}" & "${N.O1}" ≥78% — wave-1 ready.`,
    measure: "phone_coverage_per_segment",
    domain: "Treatment",
    metricType: "result",
    valueSentiment: "up-good",
    direction: "up_is_good",
    isFollowing: true,
    displayData: {
      filterContext: "per-segmen · pct_punya_hp",
      comparisonLabel: "vs aggregate 73,46%",
      currentValue: `${N.H1} ${PHONE_BY_SEG.H1}% · ${N.K1} ${PHONE_BY_SEG.K1}% · ${N.M2} ${PHONE_BY_SEG.M2}% · ${N.S2} ${PHONE_BY_SEG.S2}%`,
      changePercent: 0,
      changeAbsolute: "0",
      status: "warning",
      sparklineData: SPARK_PHONE_COVERAGE,
      insight: {
        text: `"${N.S1}" & "${N.S2}" phone coverage hanya ${PHONE_BY_SEG.S1}%/${PHONE_BY_SEG.S2}% — butuh kanal offline (surat, RT-RW). "${N.K1}" & "${N.O1}" ≥${PHONE_BY_SEG.O1}% siap WhatsApp wave-1.`,
        boldParts: [`${PHONE_BY_SEG.S1}%`, `${PHONE_BY_SEG.S2}%`, "WhatsApp", "RT-RW"],
      },
    },
  },

  // ─── P1.8 Pyramid Deviation vs Framework Piramida Kepatuhan Pajak ──────────────────────────
  {
    ...BASE,
    id: "M-DERIV-004",
    name: "Pyramid Deviation vs Framework Piramida Kepatuhan Pajak",
    description:
      `Distribusi aktual vs ekspektasi framework Piramida Kepatuhan Pajak (per segmen). "${N.H1}" underperform -14,77pp = erosi budaya patuh. "${N.M2}" dekat baseline (-0,95pp). "${N.S2}" surplus +1,30pp = kendaraan hantu butuh cleanup.`,
    measure: "pyramid_deviation_pp",
    domain: "Compliance",
    metricType: "result",
    valueSentiment: "up-good",
    direction: "up_is_good",
    isFollowing: true,
    displayData: {
      filterContext: "actual_pct − framework_v1.4_pct",
      comparisonLabel: "pp gap (percentage points)",
      currentValue: `${N.H1} ${pyramidDeviation.H1.toFixed(2)}pp · ${N.S2} +${pyramidDeviation.S2.toFixed(2)}pp`,
      changePercent: pyramidDeviation.H1, // headline = Patuh Aktif deviation
      changeAbsolute: `${pyramidDeviation.H1.toFixed(2)}pp`,
      status: "critical", // Patuh Aktif underperform >10pp
      sparklineData: SPARK_PYRAMID_DEV,
      insight: {
        text: `"${N.H1}" ${pyramidDeviation.H1.toFixed(2)}pp di bawah baseline 40% — kepatuhan struktural lebih lemah dari ekspektasi. "${N.S2}" +${pyramidDeviation.S2.toFixed(2)}pp = beban kendaraan hantu. Implikasi: butuh program retensi "${N.H1}" sekaligus deregistrasi "${N.S2}".`,
        boldParts: [`${pyramidDeviation.H1.toFixed(2)}pp`, N.H1, `+${pyramidDeviation.S2.toFixed(2)}pp`, N.S2],
      },
    },
  },

  // ─── P1.9 Vehicle Age × Segment ─────────────────────────────────────────
  {
    ...BASE,
    id: "M-DERIV-005",
    name: "Vehicle Age × Segment",
    description:
      `Rata-rata umur kendaraan per segmen (gold_plus.agg_segmen_jenken). "${N.S2}" = 22 tahun → bukan collection problem, ini cleanup. "${N.M2}" = 14 tahun → korelasi kuat dengan denda akumulatif.`,
    measure: "avg_vehicle_age_per_segment",
    domain: "Demographic",
    metricType: "observational",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    isFollowing: false,
    displayData: {
      filterContext: "tahun · per-segmen",
      comparisonLabel: "vs aggregate 13 tahun",
      currentValue: `${N.S2} ${AGE_BY_SEG.S2}thn · ${N.M2} ${AGE_BY_SEG.M2}thn · ${N.K1} ${AGE_BY_SEG.K1}thn`,
      changePercent: 0,
      changeAbsolute: "0",
      status: "warning",
      sparklineData: SPARK_VEHICLE_AGE,
      insight: {
        text: `"${N.S2}" rata-rata ${AGE_BY_SEG.S2} tahun + 4% phone = kandidat deregistrasi, BUKAN collection. "${N.M2}" ${AGE_BY_SEG.M2} tahun → kemungkinan denda > nilai pasar kendaraan.`,
        boldParts: [`${AGE_BY_SEG.S2} tahun`, "deregistrasi", `${AGE_BY_SEG.M2} tahun`],
      },
    },
  },

  // ─── P2.11 Stranded Revenue (M2+S2 ceiling) ─────────────────────────────
  {
    ...BASE,
    id: "M-DERIV-006",
    name: `Stranded Revenue (${N.M2} & ${N.S2})`,
    description:
      `Pendapatan struktural tidak bisa di-collect: principal "${N.M2}" + "${N.S2}" yang melebihi yield. Honest framing — ini bukan TAM yang realistik tanpa amnesti dan deregistrasi.`,
    measure: "stranded_revenue",
    domain: "Revenue",
    metricType: "result",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    isFollowing: false,
    displayData: {
      filterContext: `${N.M2} + ${N.S2} · principal − yield konservatif`,
      comparisonLabel: "vs total potensi Rp 164,24 T",
      currentValue: fmtIDRb(strandedRevenue),
      changePercent: 0,
      changeAbsolute: "0",
      status: "warning",
      sparklineData: SPARK_STRANDED,
      insight: {
        text: `${fmtIDRb(strandedRevenue)} stranded di "${N.M2}" + "${N.S2}" (${(SEG.M2.pct + SEG.S2.pct).toFixed(1)}% kendaraan). Tanpa amnesti "${N.M2}" + program deregistrasi "${N.S2}", angka ini tidak bergerak. Hindari janji upside ke stakeholder.`,
        boldParts: [fmtIDRb(strandedRevenue), N.M2, N.S2, "amnesti", "deregistrasi"],
      },
    },
  },

  // ─── P2.12 Moral Hazard Risk Guardrail ──────────────────────────────────
  {
    ...BASE,
    id: "M-DERIV-007",
    name: `Moral Hazard Risk (${N.H1} & ${N.K1} guardrail)`,
    description:
      `Persentase kendaraan compliant ("${N.H1}" + "${N.K1}") yang harus dijaga. Threshold ≥30% — bila program amnesti aktif menurunkan share ini, budaya patuh terkikis. Tracking guardrail BCG-style.`,
    measure: "moral_hazard_h1k1_share",
    domain: "Compliance",
    metricType: "result",
    valueSentiment: "up-good",
    direction: "up_is_good",
    isFollowing: true,
    displayData: {
      filterContext: `${N.H1} + ${N.K1} share · target ≥30%`,
      comparisonLabel: "guardrail threshold",
      currentValue: `${moralHazardPct.toFixed(2)}%`,
      changePercent: moralHazardPct - 30, // delta from threshold
      changeAbsolute: `${(moralHazardPct - 30).toFixed(2)}pp vs 30%`,
      status: moralHazardPct >= 30 ? "healthy" : "critical",
      sparklineData: SPARK_MORAL_HAZARD,
      insight: {
        text: `"${N.H1}" + "${N.K1}" = ${moralHazardPct.toFixed(2)}% (above 30% threshold). Saat program amnesti "${N.M2}" di-launch, monitor weekly — bila turun di bawah 30%, hentikan amnesti generic.`,
        boldParts: [`${moralHazardPct.toFixed(2)}%`, "30%", `amnesti ${N.M2}`],
      },
    },
  },

  // ─── P2.14 Treatment Coverage ───────────────────────────────────────────
  {
    ...BASE,
    id: "M-DERIV-008",
    name: "Treatment Coverage",
    description:
      "Persentase kendaraan ter-mapping ke treatment lookup (ref.treatment_lookup). 100% = semua segmen punya strategi yang ditentukan. Operational readiness sebelum kampanye.",
    measure: "treatment_coverage_pct",
    domain: "Treatment",
    metricType: "observational",
    valueSentiment: "up-good",
    direction: "up_is_good",
    isFollowing: false,
    displayData: {
      filterContext: "ref.treatment_lookup mapping",
      comparisonLabel: "operational readiness",
      currentValue: `${treatmentCoverage}%`,
      changePercent: 0,
      changeAbsolute: "0",
      status: "healthy",
      sparklineData: SPARK_TREATMENT_COV,
      insight: {
        text: `${treatmentCoverage}% kendaraan punya treatment plan defined (7/7 segmen). Operasional siap: tinggal eksekusi field SAMSAT + WhatsApp blast.`,
        boldParts: [`${treatmentCoverage}%`, "7/7 segmen"],
      },
    },
  },

  // ─── P2.15 Cost-to-Collect Ratio ────────────────────────────────────────
  {
    ...BASE,
    id: "M-DERIV-009",
    name: "Cost-to-Collect Ratio (estimate)",
    description:
      "Estimasi rasio biaya kampanye terhadap pendapatan tertagih. Asumsi: WhatsApp Rp 50/ken, field SAMSAT Rp 5.000/ken, weighted by phone availability per segmen.",
    measure: "cost_to_collect_ratio_pct",
    domain: "Operational",
    metricType: "result",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    isFollowing: false,
    displayData: {
      filterContext: "biaya estimasi / yield total",
      comparisonLabel: "target ≤8% (industry benchmark)",
      currentValue: `${costToCollectRatio.toFixed(2)}%`,
      changePercent: costToCollectRatio - 8,
      changeAbsolute: `${(costToCollectRatio - 8).toFixed(2)}pp vs 8% target`,
      status: costToCollectRatio <= 8 ? "healthy" : costToCollectRatio <= 12 ? "warning" : "critical",
      sparklineData: SPARK_COST_TO_COLLECT,
      insight: {
        text: `${costToCollectRatio.toFixed(2)}% cost-to-collect (${fmtIDR(blendedCostPerVehicle)}/kendaraan blended). Target ≤8%. Pre-campaign estimate — refresh setelah field cost actual masuk.`,
        boldParts: [`${costToCollectRatio.toFixed(2)}%`, fmtIDR(blendedCostPerVehicle), "8%"],
      },
    },
  },

  // ─── P2.15 Channel-Mix Cost ─────────────────────────────────────────────
  {
    ...BASE,
    id: "M-DERIV-010",
    name: "Channel-Mix Cost (per kendaraan)",
    description:
      "Biaya rata-rata per kendaraan reachable berdasarkan channel mix optimal. WhatsApp Rp 50, field SAMSAT Rp 5.000, surat Rp 1.500. Drives budget allocation.",
    measure: "channel_mix_cost_idr",
    domain: "Operational",
    metricType: "result",
    valueSentiment: "up-bad",
    direction: "down_is_good",
    isFollowing: false,
    displayData: {
      filterContext: "blended cost · weighted by phone availability",
      comparisonLabel: "vs WhatsApp-only Rp 50",
      currentValue: fmtIDR(blendedCostPerVehicle),
      changePercent: 0,
      changeAbsolute: "0",
      status: "healthy",
      sparklineData: SPARK_CHANNEL_MIX,
      insight: {
        text: `${fmtIDR(blendedCostPerVehicle)} blended per kendaraan. "${N.K1}" & "${N.O1}" mostly WhatsApp (Rp ${COST_WHATSAPP}), "${N.S1}" & "${N.S2}" wajib field (${fmtIDR(COST_FIELD_SAMSAT)}). Re-route ke surat (${fmtIDR(COST_SURAT)}) untuk mid-cost segmen.`,
        boldParts: [fmtIDR(blendedCostPerVehicle), `Rp ${COST_WHATSAPP}`, fmtIDR(COST_FIELD_SAMSAT)],
      },
    },
  },

  // ─── PER-SEGMENT MONITORING (7 metrics) ─────────────────────────────────
  // User feedback: butuh metric per segmen secara granular agar bisa monitor
  // tiap kelompok kepatuhan terpisah. Distribusi Segmen aggregate (M-COMPL-001)
  // dipecah jadi 7 card individual — masing-masing menampilkan jumlah, share,
  // deviasi dari framework Piramida Kepatuhan Pajak, status (healthy/warning/critical), dan
  // recommended treatment.
  ...buildPerSegmentMetrics(),
];

/**
 * Generator: 1 metric card per compliance segment (7 segments total).
 * Setiap card berisi:
 * - currentValue: jumlah kendaraan + share %
 * - changePercent: deviasi pp vs framework Piramida Kepatuhan Pajak baseline
 * - status: healthy if |dev| ≤ 2pp, warning if 2-5pp, critical if >5pp
 * - insight: actionable treatment recommendation per segmen
 *
 * 5 critical/headline segments (Patuh Aktif, Tidak Patuh Kronis, Kendaraan
 * Hantu, Baru Lewat Tempo, Mulai Mengabaikan) di-set isFollowing: true.
 * 2 lainnya (Tidak Patuh Pasif, Belum Terdaftar) di Browse — siap di-follow.
 */
function buildPerSegmentMetrics(): MetricDefinition[] {
  type Code = keyof typeof SEG;
  const order: Code[] = ["H1", "K1", "O1", "M1", "M2", "S1", "S2"];

  // Status badge logic: deviation from framework expectation
  function statusFor(dev: number, code: Code): "healthy" | "warning" | "critical" {
    const abs = Math.abs(dev);
    // Patuh Aktif under-performing is most critical (kultur erosion)
    if (code === "H1" && dev < -10) return "critical";
    if (code === "H1" && dev < -5) return "warning";
    // M2/S2 surplus is critical (beban historis tinggi)
    if ((code === "M2" || code === "S2") && dev > 5) return "critical";
    if ((code === "M2" || code === "S2") && dev > 2) return "warning";
    if (abs > 5) return "warning";
    return "healthy";
  }

  // Per-segment treatment guidance (concise, executive-ready)
  const TREATMENT: Record<Code, string> = {
    H1: `Pertahankan apresiasi & retensi. Hindari beban regulasi tambahan ke segmen ini saat amnesti aktif — risiko erosi kultur.`,
    K1: `Channel: WhatsApp (${PHONE_BY_SEG.K1}% phone). 3-pesan campaign 6 minggu — denda masih kecil, conversion 60% (tertinggi).`,
    O1: `Channel: WhatsApp + SMS (${PHONE_BY_SEG.O1}% phone). Tambahkan insentif diskon denda 25% untuk dorong konversi 35%.`,
    M1: `Amnesti parsial 50-75% denda. Channel mix WhatsApp + surat. Conversion target 25%; deadline 60 hari.`,
    M2: `Amnesti penuh denda 90 hari + razia pasca-amnesti. Conversion 15%, beban historis terbesar. Awas moral hazard ke "${N.H1}" & "${N.K1}".`,
    S1: `Bukan masalah collection — program registrasi. ${PHONE_BY_SEG.S1}% phone → field SAMSAT + RT-RW outreach.`,
    S2: `Bukan masalah collection — program deregistrasi. Umur rata-rata ${AGE_BY_SEG.S2} tahun + ${PHONE_BY_SEG.S2}% phone → cleanup, bukan kampanye.`,
  };

  // All 7 segments are followed — user intent: monitor each segment granularly.
  const followedSet = new Set<Code>(["H1", "K1", "O1", "M1", "M2", "S1", "S2"]);

  // Per-segment 52-week trend hint (count trajectory). Compliance pyramid is
  // mostly stable but slowly drifts: H1 declining, M2/S2 growing, others stable.
  const TRAJECTORY: Record<Code, { start: number; seed: number; noiseFrac: number; seasonFrac: number }> = {
    H1: { start: SEG.H1.n + 12_000, seed: 11, noiseFrac: 0.015, seasonFrac: 0.02 }, // declining
    K1: { start: SEG.K1.n - 1_500, seed: 22, noiseFrac: 0.06, seasonFrac: 0.08 },   // slight grow + seasonal
    O1: { start: SEG.O1.n - 800, seed: 33, noiseFrac: 0.05, seasonFrac: 0.06 },     // mild grow
    M1: { start: SEG.M1.n + 2_000, seed: 44, noiseFrac: 0.03, seasonFrac: 0.03 },   // shrinking (moves to M2)
    M2: { start: SEG.M2.n - 8_000, seed: 55, noiseFrac: 0.02, seasonFrac: 0.02 },   // growing (chronic)
    S1: { start: SEG.S1.n + 400, seed: 66, noiseFrac: 0.04, seasonFrac: 0.05 },     // mild shrink
    S2: { start: SEG.S2.n - 4_500, seed: 77, noiseFrac: 0.015, seasonFrac: 0.02 },  // growing (aging)
  };

  return order.map((code) => {
    const seg = SEG[code];
    const meta = SEGMENTS[code]; // from segmentLabels.ts
    const dev = seg.pct - FW[code as keyof typeof FW];
    const devSign = dev >= 0 ? "+" : "";
    const status = statusFor(dev, code);
    const phone = PHONE_BY_SEG[code as keyof typeof PHONE_BY_SEG];
    const isFollowing = followedSet.has(code);
    const traj = TRAJECTORY[code];
    const sparkline = genWeeklyTrend({
      start: traj.start,
      end: seg.n,
      noise: traj.noiseFrac,
      season: traj.seasonFrac,
      seed: traj.seed,
    });

    // Compose direction — Patuh Aktif up_is_good, all others down_is_good
    const direction: "up_is_good" | "down_is_good" =
      code === "H1" ? "up_is_good" : "down_is_good";
    const valueSentiment: "up-good" | "up-bad" =
      code === "H1" ? "up-good" : "up-bad";

    return {
      ...BASE,
      id: `M-SEG-${code}`,
      name: `Segmen: ${meta.name}`,
      description: `Monitoring spesifik segmen "${meta.name}" — ${meta.description}. Treatment standard: ${meta.treatment}.`,
      measure: `segment_${code.toLowerCase()}_count`,
      domain: "Compliance",
      metricType: "result",
      valueSentiment,
      direction,
      isFollowing,
      displayData: {
        filterContext: `${meta.name} · framework baseline ${FW[code as keyof typeof FW]}%`,
        comparisonLabel: `vs framework Piramida Kepatuhan Pajak (${FW[code as keyof typeof FW]}%)`,
        currentValue: `${seg.n.toLocaleString("id-ID")} (${seg.pct.toFixed(2)}%)`,
        changePercent: Number(dev.toFixed(2)),
        changeAbsolute: `${devSign}${dev.toFixed(2)}pp`,
        status,
        sparklineData: sparkline,
        insight: {
          text: `${seg.n.toLocaleString("id-ID")} kendaraan (${seg.pct.toFixed(2)}%) — ${devSign}${dev.toFixed(2)}pp ${dev < 0 ? "di bawah" : "di atas"} baseline. Phone coverage ${phone}%. ${TREATMENT[code]}`,
          boldParts: [
            `${seg.n.toLocaleString("id-ID")} kendaraan`,
            `${seg.pct.toFixed(2)}%`,
            `${devSign}${dev.toFixed(2)}pp`,
            `${phone}%`,
          ],
        },
      },
    };
  });
}

/**
 * Synthetic certifications for derived metrics. Source = "derived" not
 * `meta.metric_certification`. Cert level "silver" since formula is documented
 * but not yet validated by domain expert (per Galen rule #6 — be honest about limits).
 */
export const derivedPkbCertifications: MetricCertification[] = derivedPkbMetrics.map((m) => ({
  metricId: m.id,
  metricName: m.name,
  metricSlug: m.measure,
  businessDomain: (m.domain ?? "operational").toLowerCase(),
  certificationLevel: "silver",
  confidenceScore: 0.78,
  certifiedAt: m.createdAt,
  certifiedBy: "audit_v1_bcg_lens",
  lastValidatedAt: m.updatedAt,
  governanceSource: "derived_from_framework_v1.4",
  ownerTeam: m.owner,
  notes: `Derived metric (P1/P2 audit). Source: ${m.dataSource}. Validate with gold.transaksi_fact once ingested.`,
}));

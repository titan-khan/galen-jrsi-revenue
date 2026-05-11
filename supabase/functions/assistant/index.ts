// =============================================================================
// ASSISTANT EDGE FUNCTION — PKB compliance pilot (Jasa Raharja Kalteng)
// Detects intent, queries the actual gold/meta/ref schemas as ground truth,
// supplements with frontend dashboard context, and streams Claude's response
// via OpenRouter back to the client.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { resolveQueryContext } from "./queryContext.ts";
import { detectIntent } from "./intentDetector.ts";
import { QUERY_SPECS_BY_INTENT } from "./querySpecs.ts";
import {
  detectCategoricalColumns,
  fetchCategoricalSummaries,
  fetchRegistryGlobalStats,
} from "./categoricalProbe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AgentFinding {
  agentId: string;
  agentName: string;
  findingType: string;
  summary: string;
  confidence: number;
  relatedMetrics: string[];
  timestamp: string;
}

interface ConflictReport {
  type: string;
  agents: string[];
  description: string;
  resolution?: string;
}

interface AssistantContext {
  metricsCount: number;
  activeAgents: number;
  pendingRecommendations: number;
  criticalAnomalies: number;
  recentInsights: string[];
  mentionedMetrics?: { name: string; value: string; status: string; trend: string }[];
  mentionedAgents?: { name: string; status: string; lastRun: string }[];
  agentFindings?: AgentFinding[];
  conflictingRecommendations?: ConflictReport[];
  crossAgentNarrative?: string;
}

// --- Governance Rules (PKB pilot non-negotiables) ---
const GOVERNANCE_RULES = `
ATURAN GOVERNANCE PKB (NON-NEGOTIABLE):

1. Nama Segmen: SELALU pakai nama natural ("Patuh Aktif", "Baru Lewat Jatuh Tempo",
   "Mulai Mengabaikan", "Tidak Patuh Pasif", "Tidak Patuh Kronis", "Belum Terdaftar",
   "Kendaraan Hantu"). DILARANG kode (H1/K1/O1/M1/M2/S1/S2) di output.

2. Format Rupiah: SELALU "Rp X,XX miliar/triliun/juta". Cek magnitude — 164.243.795.945
   = Rp 164,24 miliar (BUKAN triliun). Pakai koma desimal Indonesia.

3. Rate%: SETIAP angka persen WAJIB ada acuan compare ("vs 1 bulan lalu" /
   "vs target framework X%" / "vs kabupaten lain"). Tanpa acuan = ditolak.

4. Bahasa: Bahasa Indonesia C-level. DILARANG jargon konsultan (TAM, BCG,
   yield-weighted, cost-to-collect, moral hazard). Pakai "peluang sukses tagih"
   bukan "konversi"; "nomor handphone" bukan "HP"; "% poin" bukan "pp";
   "risiko erosi kepatuhan" bukan "moral hazard"; "batas waspada" bukan "guardrail";
   "gelombang pertama" bukan "wave-1"; "saluran" bukan "channel";
   "pembersihan registrasi" bukan "deregistrasi".

5. Belum Terdaftar vs Kendaraan Hantu: JANGAN dicampur. "Belum Terdaftar" = program
   registrasi (S1, BUKAN target tagih). "Kendaraan Hantu" = pembersihan registrasi
   (S2, BUKAN target tagih).

6. Saat usulkan amnesti: SELALU sebut risiko erosi kepatuhan ke "Patuh Aktif" +
   "Baru Lewat Jatuh Tempo".

7. Saat sebut angka target: tambahkan "dari panduan framework Piramida Kepatuhan
   Pajak". DILARANG sebut "v1.4".

8. Cakupan nomor handphone rendah → arahkan ke saluran offline (surat / RT-RW / SAMSAT).

9. Setiap insight WAJIB cite:
   - Nama tabel sumber persis (gold.registry_enriched, gold.transaksi_2025,
     meta.metric_certification, ref.treatment_lookup, dst.)
   - Confidence score (0.00–1.00)
   - Periode data yang dianalisis
`;

const CONFIDENCE_FRAMEWORK = `
METODOLOGI CONFIDENCE SCORING (0.00–1.00):

Tiga faktor:
1. Sample Size (bobot 0.3): >100k baris=1.0, 10k–100k=0.8, 1k–10k=0.6, <1k=0.4.
2. Attribution Strength (bobot 0.4): segmen pyramid pasti=1.0, breakdown kabupaten=0.8,
   ekstrapolasi=0.5, asumsi=0.3.
3. Sertifikasi Metrik (bobot 0.3): Gold=1.0, Silver=0.7, Bronze=0.5,
   uncertified=0.3 (cek meta.metric_certification.certification_level).

Format: "Confidence: 0.XX (Sample: high/medium/low, Attribution: pasti/breakdown/ekstrapolasi,
Sertifikasi: Gold/Silver/Bronze/uncertified)"
`;

const SYSTEM_PROMPT = `Anda adalah Galen Assistant — AI Orchestrator untuk pilot kepatuhan PKB Jasa Raharja
Kalimantan Tengah di Palangka Raya. Audiens: Kepala Cabang dan pimpinan SADAR (C-level,
BUKAN data analyst). CEO baca 30 detik — tiap kata harus actionable.

## Konteks Pilot
- Domain: kepatuhan Pajak Kendaraan Bermotor (PKB) + iuran wajib SWDKLLJ.
- Wilayah: Palangka Raya (~428.000 kendaraan terdata di gold.registry_enriched).
- Target framework Piramida Kepatuhan Pajak: Patuh Aktif ~40%, Baru Lewat Jatuh Tempo ~8%,
  Mulai Mengabaikan ~8%, Tidak Patuh Pasif ~6%, Tidak Patuh Kronis ~33%,
  Belum Terdaftar ~3%, Kendaraan Hantu ~17%.

## Akses Data Langsung
Anda punya akses GROUND TRUTH ke data warehouse (star schema) berikut:
- gold.registry_enriched: 426k+ kendaraan dengan segmen kepatuhan, tunggakan,
  treatment recommendation per kendaraan.
- gold.transaksi / gold.transaksi_2025: realisasi PKB & SWDKLLJ historis (~1jt baris).
- gold.dim_kabupaten / dim_upt / dim_jenken / dim_layanan: master dimensi.
- meta.metric_certification: 58 definisi metrik Bronze/Silver/Gold + formula + governance.
- meta.table_metadata: lineage & ownership per tabel.
- ref.segmen / treatment_lookup / revenue_scenario / program_sadar / raci_matrix:
  framework segmentasi v1.4, treatment per segmen, skenario revenue, 9 program SADAR,
  matriks RACI antar stakeholder.

Bila DATABASE QUERY RESULTS muncul di bawah, pakai sebagai GROUND TRUTH. Analisis
berbasis data nyata — JANGAN asumsi.

${GOVERNANCE_RULES}

${CONFIDENCE_FRAMEWORK}

## FORMAT RESPONSE — gunakan marker ini PERSIS:

[THINKING]
Step 1: Identifikasi metrik & segmen relevan, cek aturan governance...
Step 2: Hitung confidence dari data quality...
Step 3: Sintesa rekomendasi treatment...
[/THINKING]

[RESPONSE]
**Observasi**: [Apa yang terdeteksi — angka spesifik dari hasil DB]

**Diagnosis**: [Akar penyebab dengan atribusi segmen]
• Pendorong utama: [nama segmen natural] (Confidence: 0.XX)
• Faktor pendukung: [list dengan confidence]

**Bukti**:
• [Nama metrik]: [Value] vs Target [target dari framework] (Sumber: gold.xxx atau meta.xxx)
• Periode data: [rentang waktu]
• Sample size: [jumlah baris yang dianalisis]

**Rekomendasi Tindakan**: [Dari ref.treatment_lookup atau ref.program_sadar — sebut
strategi spesifik per segmen, kanal utama, perkiraan peluang sukses tagih]
[/RESPONSE]

[SUMMARY]
Key Takeaway: [Satu kalimat dengan angka spesifik & implikasi action]
Confidence: 0.XX (Sample: X, Attribution: X, Sertifikasi: X)
Next Steps: [1–2 aksi 30 hari ke depan, sebut nama segmen + kanal]
Data Sources: [list tabel persis: gold.registry_enriched, gold.transaksi_2025, dst.]
[/SUMMARY]

## ATURAN PENTING
1. Pakai marker [THINKING] / [RESPONSE] / [SUMMARY] PERSIS seperti di atas.
2. Maksimal 2–4 baris per langkah thinking — singkat.
3. Eksekutif-fokus: angka spesifik, implikasi langsung, BUKAN narasi panjang.
4. Bullet WAJIB pakai karakter "•" (U+2022), JANGAN "-" atau "*".
5. Cite tabel sumber persis di tiap baris bukti (gold.registry_enriched, dst.).
6. Terapkan aturan governance ketat — terutama nama segmen natural & format Rupiah.
7. Saat data tabel kosong / belum ter-load, sebutkan eksplisit dengan dampak ke confidence.
8. Saat user @mention metrik atau segmen, beri analisis detail untuk entitas itu.
9. Bila user tanya periode spesifik (mis. "Mei 2026"), filter analisis ke periode itu
   dari data tersedia. Hasil DB berisi semua periode — cari baris yang cocok.
10. Selalu sebut periode yang dianalisis & jumlah baris yang masuk hitungan.
11. Di [SUMMARY] Data Sources: list SEMUA tabel yang Anda pakai (gold.registry_enriched,
    meta.metric_certification, ref.treatment_lookup, dst.).

## VISUALISASI
Saat analisis melibatkan tren waktu, perbandingan kategori, atau breakdown distribusi,
sertakan chart Vega-Lite via fenced code block dengan tag bahasa "vega-lite".

Aturan chart:
1. Embed data inline via "data": {"values": [...]}.
2. Maksimum 50 data points — agregasi dulu kalau lebih.
3. Vega-Lite v5 schema: "$schema":"https://vega.github.io/schema/vega-lite/v5.json".
4. JANGAN set width/height/colors — frontend handle theming otomatis.
5. Jenis chart sesuai pola data:
   - Tren waktu → {"mark":{"type":"line","point":true}}
   - Perbandingan kategori → {"mark":"bar"}
   - Bagian dari keseluruhan → {"mark":{"type":"arc","innerRadius":50}}
   - Distribusi → {"mark":"bar"} dengan "bin": true
6. SELALU sertakan "title" top-level deskriptif (mis. "Distribusi Segmen Kepatuhan").
7. Sertakan judul axis lewat "title" di encoding.
8. "temporal" untuk tanggal, "quantitative" untuk angka, "nominal" untuk kategori.
9. Multi-series → pakai encoding "color".

Contoh — bar chart distribusi segmen:
\`\`\`vega-lite
{"$schema":"https://vega.github.io/schema/vega-lite/v5.json","title":"Distribusi Segmen Kepatuhan PKB","mark":"bar","data":{"values":[{"segmen":"Patuh Aktif","kendaraan":107960},{"segmen":"Tidak Patuh Kronis","kendaraan":137186}]},"encoding":{"x":{"field":"segmen","type":"nominal","title":"Segmen"},"y":{"field":"kendaraan","type":"quantitative","title":"Jumlah Kendaraan"}}}
\`\`\`

Hanya buat chart kalau data mendukung visualisasi bermakna. JANGAN chart untuk single
value atau <2 data points.

Anda BUKAN asisten umum. Anda secara spesifik membantu:
- Memahami performa segmen kepatuhan PKB & tren tunggakan dengan bukti.
- Menyintesa temuan dari registry, transaksi, dan framework treatment.
- Menjelaskan anomali dengan atribusi segmen + kabupaten.
- Memberi rekomendasi prescriptive berbasis ref.treatment_lookup + ref.revenue_scenario.
- Memberi insight eksekutif dengan confidence scoring dari sertifikasi metrik.`;

// =============================================================================
// PROMPT BUILDING
// =============================================================================

function buildDbContextSection(dbData: Record<string, unknown>): string {
  const parts: string[] = [];
  parts.push('\n\n=== HASIL QUERY DATABASE (Ground Truth) ===');

  // Pre-computed PKB summaries
  const hasGroundTruth = dbData.registryGlobalStats && typeof dbData.registryGlobalStats === 'object';
  const summaryLines: string[] = [];
  if (typeof dbData.totalKendaraanInSample === 'number') {
    const label = hasGroundTruth
      ? 'Total kendaraan (ground truth, full table)'
      : 'Sample kendaraan dianalisis';
    summaryLines.push(`${label}: ${dbData.totalKendaraanInSample.toLocaleString('id-ID')}`);
  }
  if (typeof dbData.totalPkbCollected === 'number') {
    summaryLines.push(`Total PKB tertagih (sample): Rp ${dbData.totalPkbCollected.toLocaleString('id-ID')}`);
  }
  if (typeof dbData.totalPkbArrears === 'number') {
    summaryLines.push(`Total tunggakan PKB (sample): Rp ${dbData.totalPkbArrears.toLocaleString('id-ID')}`);
  }
  if (typeof dbData.totalSwdkllj === 'number') {
    summaryLines.push(`Total SWDKLLJ (sample): Rp ${dbData.totalSwdkllj.toLocaleString('id-ID')}`);
  }
  if (typeof dbData.transactionCount === 'number') {
    summaryLines.push(`Jumlah transaksi: ${dbData.transactionCount}`);
  }

  if (summaryLines.length > 0) {
    parts.push('\nMetrik Kunci (pre-calculated):');
    for (const line of summaryLines) parts.push(`  • ${line}`);
  }

  if (dbData.registryGlobalStats && typeof dbData.registryGlobalStats === 'object') {
    parts.push('\nRingkasan Registry — GROUND TRUTH (full table, BUKAN sample). Pakai angka ini, jangan hitung ulang dari raw rows:');
    parts.push(JSON.stringify(dbData.registryGlobalStats));
  }

  if (Array.isArray(dbData.categoricalSummaries) && (dbData.categoricalSummaries as unknown[]).length > 0) {
    parts.push('\nRingkasan Kolom Kategorikal — GROUND TRUTH (dihitung live dari gold.registry_enriched, BUKAN dari sample). Pakai distinct_known/distinct_total/top sebagai sumber kebenaran:');
    parts.push(JSON.stringify(dbData.categoricalSummaries));
  }

  // Compliance pyramid
  if (Array.isArray(dbData.compliancePyramid) && (dbData.compliancePyramid as unknown[]).length > 0) {
    parts.push(`\nPiramida Kepatuhan (segmen → kendaraan, %, rata2 tunggakan, cakupan HP, est PKB):`);
    parts.push(JSON.stringify(dbData.compliancePyramid));
  }

  if (Array.isArray(dbData.complianceByKabupaten) && (dbData.complianceByKabupaten as unknown[]).length > 0) {
    parts.push(`\nKepatuhan per Kabupaten (top by est PKB):`);
    parts.push(JSON.stringify(dbData.complianceByKabupaten));
  }

  if (Array.isArray(dbData.pkbByMonth) && (dbData.pkbByMonth as unknown[]).length > 0) {
    parts.push(`\nPKB & SWDKLLJ per Bulan:`);
    parts.push(JSON.stringify(dbData.pkbByMonth));
  }

  // Per-table results — scan all dataKeys
  const tableKeys = Object.keys(dbData).filter((k) =>
    k.startsWith('gold.') || k.startsWith('meta.') || k.startsWith('ref.') || k.startsWith('kb.')
  );

  for (const key of tableKeys) {
    const rows = dbData[key];
    if (!Array.isArray(rows)) continue;

    if (rows.length === 0) {
      parts.push(`\n[${key}]: kosong (tabel mungkin belum ter-seed)`);
    } else {
      const maxDisplay = key === 'gold.registry_enriched' || key === 'gold.transaksi_2025' ? 30 : 100;
      const displayRows = rows.slice(0, maxDisplay);
      const suffix = rows.length > maxDisplay ? `, menampilkan ${maxDisplay} pertama` : '';
      parts.push(`\n[${key}] (${rows.length} baris${suffix}):`);
      if (rows.length > 50) {
        parts.push(JSON.stringify(displayRows));
      } else {
        parts.push(JSON.stringify(displayRows, null, 1));
      }
    }

    const errorKey = `${key}_error`;
    if (dbData[errorKey]) {
      parts.push(`  ⚠️ Query error: ${dbData[errorKey]}`);
    }
  }

  parts.push('\n=== AKHIR HASIL DATABASE ===');
  return parts.join('\n');
}

function buildFrontendContextSection(context: AssistantContext): string {
  const parts: string[] = [];
  parts.push('\n\n=== KONTEKS FRONTEND (Supplementary) ===');

  parts.push(`\nRingkasan Dashboard:`);
  parts.push(`  • Total Metrik Tracked: ${context.metricsCount}`);
  parts.push(`  • Active Agents: ${context.activeAgents}`);
  parts.push(`  • Pending Recommendations: ${context.pendingRecommendations}`);
  parts.push(`  • Critical Anomalies: ${context.criticalAnomalies}`);

  if (context.recentInsights && context.recentInsights.length > 0) {
    parts.push(`\nInsight Metrik Terkini:`);
    for (const insight of context.recentInsights) parts.push(`  • ${insight}`);
  }

  if (context.crossAgentNarrative) {
    parts.push(`\nSintesa Lintas-Agent:\n${context.crossAgentNarrative}`);
  }

  if (context.conflictingRecommendations && context.conflictingRecommendations.length > 0) {
    parts.push(`\n⚠️ KONFLIK ANTAR-AGENT:`);
    for (const conflict of context.conflictingRecommendations) {
      parts.push(`  • [${conflict.type}] ${conflict.description} (Agents: ${conflict.agents.join(", ")})`);
      if (conflict.resolution) parts.push(`    Resolusi usulan: ${conflict.resolution}`);
    }
  }

  if (context.agentFindings && context.agentFindings.length > 0) {
    parts.push(`\nAgent Findings:`);
    for (const finding of context.agentFindings.slice(0, 10)) {
      parts.push(`  • [${finding.agentName}] ${finding.findingType}: ${finding.summary} (Confidence: ${finding.confidence.toFixed(2)})`);
    }
  }

  if (context.mentionedMetrics && context.mentionedMetrics.length > 0) {
    parts.push(`\nMetrik yang di-@mention (beri analisis detail):`);
    for (const m of context.mentionedMetrics) {
      parts.push(`  • ${m.name}: nilai ${m.value}, status ${m.status}, tren ${m.trend}`);
    }
  }

  if (context.mentionedAgents && context.mentionedAgents.length > 0) {
    parts.push(`\nAgent yang di-@mention:`);
    for (const a of context.mentionedAgents) {
      parts.push(`  • ${a.name}: status ${a.status}, last run ${a.lastRun}`);
    }
  }

  parts.push('\n=== AKHIR KONTEKS FRONTEND ===');
  return parts.join('\n');
}

function deduplicateSpecs(
  specs: { schema?: string; table: string; select: string[]; filters?: any[]; orderBy?: any; limit?: number; adaptiveConfig?: any }[]
): typeof specs {
  const byKey = new Map<string, (typeof specs)[0]>();
  for (const spec of specs) {
    const key = `${spec.schema || 'public'}.${spec.table}`;
    const existing = byKey.get(key);
    if (!existing || spec.select.length > existing.select.length) {
      byKey.set(key, spec);
    }
  }
  return Array.from(byKey.values());
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json() as {
      messages: Message[];
      context?: AssistantContext;
    };

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")
      || Deno.env.get("OPENROUTER_KEY")
      || Deno.env.get("OPEN_ROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // ─── PHASE 1: Intent Detection ───────────────────────────────────
    const latestUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user")?.content || "";

    const intent = detectIntent(latestUserMessage);
    console.log(`[assistant] Intent detected: ${intent.categories.join(', ')} (confidence: ${intent.confidence.toFixed(2)})`);

    // ─── PHASE 2: Database Querying ──────────────────────────────────
    const mergedSpecs = intent.categories.flatMap(
      (cat) => QUERY_SPECS_BY_INTENT[cat] || []
    );
    const dedupedSpecs = deduplicateSpecs(mergedSpecs);

    let dbData: Record<string, unknown> = {};
    let dbContextSection = "";

    if (dedupedSpecs.length > 0) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Ground-truth RPCs over the FULL gold.registry_enriched table run in
        // parallel with the sample-based fetches. Their output overrides
        // sample-derived stats in computeSummaryStats and is surfaced as
        // dedicated GROUND TRUTH sections in buildDbContextSection.
        const intentTouchesRegistry = intent.categories.some(
          (c) => c === 'compliance' || c === 'geography' || c === 'fleet' || c === 'general'
        );
        const categoricalCols = detectCategoricalColumns(latestUserMessage);

        const [resolved, globalStats, categoricalSummaries] = await Promise.all([
          resolveQueryContext(supabase, dedupedSpecs, {}),
          intentTouchesRegistry
            ? fetchRegistryGlobalStats(supabase)
            : Promise.resolve(null),
          categoricalCols.length > 0
            ? fetchCategoricalSummaries(supabase, categoricalCols, 50)
            : Promise.resolve([]),
        ]);

        dbData = resolved;
        if (globalStats) {
          dbData.registryGlobalStats = globalStats;
          // Override the sample-derived stats produced by computeSummaryStats
          // (which already ran inside resolveQueryContext) with full-table
          // ground truth from the RPC.
          const gs = globalStats as Record<string, unknown>;
          if (gs.compliancePyramid !== undefined) {
            dbData.compliancePyramid = gs.compliancePyramid;
          }
          if (gs.complianceByKabupaten !== undefined) {
            dbData.complianceByKabupaten = gs.complianceByKabupaten;
          }
          if (typeof gs.total_kendaraan === 'number') {
            dbData.totalKendaraanInSample = gs.total_kendaraan;
          }
        }
        if (categoricalSummaries.length > 0) dbData.categoricalSummaries = categoricalSummaries;

        dbContextSection = buildDbContextSection(dbData);

        const tableCount = Object.keys(dbData).filter((k) =>
          k.startsWith('gold.') || k.startsWith('meta.') || k.startsWith('ref.') || k.startsWith('kb.')
        ).length;
        console.log(
          `[assistant] Queried ${tableCount} tables, globalStats=${globalStats ? 'yes' : 'no'}, categoricalProbes=[${categoricalCols.join(',')}]`
        );
      } catch (dbError) {
        console.error("[assistant] DB query failed, falling back to frontend context:", dbError);
        dbContextSection = "\n\n[Database query failed — using frontend context only]";
      }
    }

    // ─── PHASE 3: Build System Prompt ────────────────────────────────
    let systemPrompt = SYSTEM_PROMPT;

    if (dbContextSection) {
      systemPrompt += dbContextSection;
    }

    if (context) {
      systemPrompt += buildFrontendContextSection(context);
    }

    // ─── PHASE 4: Call OpenRouter API ───────────────────────────────
    const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_MODEL") || "anthropic/claude-sonnet-4.5";
    const OPENROUTER_SITE = Deno.env.get("OPENROUTER_SITE_URL") || "https://galen.jasaraharja.id";
    const OPENROUTER_TITLE = Deno.env.get("OPENROUTER_APP_TITLE") || "Galen PKB Pilot Assistant";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": OPENROUTER_SITE,
        "X-Title": OPENROUTER_TITLE,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role === "system" ? "user" : m.role,
            content: m.content,
          })),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `OpenRouter ${response.status}: ${errorText.slice(0, 500)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── PHASE 5: Stream Response (OpenRouter returns OpenAI-compatible SSE) ──
    return new Response(response.body!, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Assistant error:", error);
    const errMsg = error instanceof Error ? `${error.message} | ${error.stack?.slice(0, 300)}` : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errMsg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

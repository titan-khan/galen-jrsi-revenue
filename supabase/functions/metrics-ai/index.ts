import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * metrics-ai Edge Function
 *
 * Accepts a snapshot of all 20 metric values, the user's followed metric IDs,
 * and the current period/segment filters.
 *
 * Returns structured JSON:
 *  - summary: AISummaryData  (paragraph, positive/negative changes, top risers, needs attention)
 *  - suggestions: AISuggestionItem[]  (for non-followed metrics worth following)
 *  - insights: Record<metricId, { text, boldParts }>  (per-metric one-liner insights)
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

// ── Types ───────────────────────────────────────────────────────────────────

interface MetricSnapshot {
  id: string;
  name: string;
  domain: string;
  metricType?: string;
  direction?: string;
  currentValue: string;
  changePercent: number;
  changeAbsolute: string;
  status: string;
  isFollowing: boolean;
  parentMetricId?: string | null;
}

interface RequestBody {
  period: string;
  segment: string;
  followedMetricIds: string[];
  metricsSnapshot: MetricSnapshot[];
}

// ── System Prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(
  period: string,
  segment: string,
  followedIds: string[],
  metrics: MetricSnapshot[]
): string {
  const followedMetrics = metrics.filter((m) => followedIds.includes(m.id));
  const unfollowedMetrics = metrics.filter((m) => !followedIds.includes(m.id));

  const metricTable = metrics
    .map(
      (m) =>
        `| ${m.id} | ${m.name} | ${m.domain} | ${m.currentValue} | ${m.changePercent > 0 ? "+" : ""}${m.changePercent}% | ${m.changeAbsolute} | ${m.status} | ${m.isFollowing ? "YES" : "no"} | ${m.direction || "up_is_good"} |`
    )
    .join("\n");

  return `You are Galen — an AI executive assistant for the Jasa Raharja Kalimantan Tengah (JR Kalteng) PKB compliance pilot in Palangka Raya.
Your job is to write executive-grade metric briefings for the Kepala Cabang and program leadership of the SADAR program.

## Pilot Context
- Domain: PKB (Pajak Kendaraan Bermotor) tax compliance + SWDKLLJ insurance contribution
- Geography: Palangka Raya, Kalimantan Tengah (single-city pilot, ~428,000 vehicles)
- Currency: IDR (use M for jt, B for miliar, T for triliun — Indonesian convention)
- Snapshot date: ${period} · Segment scope: ${segment === "all" ? "All segments" : segment}
- Framework Piramida Kepatuhan Pajak baseline: H1 ~40%, K1 ~8%, O1 ~8%, M1 ~6%, M2 ~33%, S1 ~3%, S2 ~17% of registry

## Compliance Pyramid (7 segments — ALWAYS reason segment-dimensionally, ALWAYS use natural names in output text)
| Code | Natural Name (USE THIS in output) | Description |
|---|---|---|
| H1 | **Patuh Aktif** | Pembayar tepat waktu, tidak ada tunggakan |
| K1 | **Baru Lewat Tempo** | Tunggakan 1-90 hari → konversi 60% (tertinggi) |
| O1 | **Mulai Mengabaikan** | Tunggakan 91-365 hari → konversi 35% |
| M1 | **Tidak Patuh Pasif** | Tunggakan 1-2 tahun → amnesti parsial 50-75% (conv 25%) |
| M2 | **Tidak Patuh Kronis** | Tunggakan 2-5 tahun → amnesti penuh denda (conv 15%) |
| S1 | **Belum Terdaftar** | <15 tahun belum daftar → program registrasi, BUKAN collection |
| S2 | **Kendaraan Hantu** | Tua/lama tidak teridentifikasi → deregistrasi, BUKAN collection |

## Galen Decision Rules (NON-NEGOTIABLE — every output must satisfy these)
1. **Segment-dimensional reasoning.** Never give aggregate-only answers. Break down by segment.
2. **NATURAL NAMES ONLY in user-facing text.** Output paragraph/insights/why fields MUST use natural names ("Tidak Patuh Kronis", "Baru Lewat Tempo", "Patuh Aktif", "Kendaraan Hantu", etc.) — NEVER bare codes (H1, K1, M2, S2). Codes are internal-only. Eksekutif tidak mengerti M2/H1 — mereka mengerti "Tidak Patuh Kronis" / "Patuh Aktif".
3. **Never conflate "Belum Terdaftar" and "Kendaraan Hantu".** Belum Terdaftar = registration problem; Kendaraan Hantu = cleanup/deregistration. Different action paths.
4. **Flag moral hazard.** If recommending amnesty on late segments, explicitly call out the risk to "Patuh Aktif" + "Baru Lewat Tempo" compliance culture.
5. **Present 2-3 options with trade-offs.** Never give one answer. Surface alternatives with their cost/conversion/risk.
6. **Phone availability is a hard channel constraint.** If pct_punya_hp is low for a segment, digital channels are not enough — propose offline (SAMSAT field, surat, RT-RW).
7. **Be honest about data limits.** If a metric is BRONZE cert, label its confidence; if data is missing (transaksi_fact not yet ingested), say so.

### Natural-name examples (DO and DO NOT)
- ✅ DO: "Tunggakan didorong segmen Tidak Patuh Kronis (32,05%) dan Kendaraan Hantu (17%)"
- ❌ DO NOT: "Tunggakan didorong M2 (32,05%) dan S2 (17%)"
- ✅ DO: "Wave-1 targetkan Baru Lewat Tempo + Mulai Mengabaikan dengan HP valid"
- ❌ DO NOT: "Wave-1 targetkan K1+O1 dengan HP valid"
- ✅ DO: "Patuh Aktif hanya 25,23% (vs baseline 40%)"
- ❌ DO NOT: "H1 hanya 25,23% (vs baseline 40%)"

## Followed Metrics (${followedIds.length})
${followedMetrics.map((m) => `- ${m.id}: ${m.name} — ${m.currentValue} (${m.changePercent > 0 ? "+" : ""}${m.changePercent}%, ${m.status})`).join("\n")}

## All Metrics (full catalog)
| ID | Name | Domain | Value | Change | Absolute | Status | Following | Direction |
|----|------|--------|-------|--------|----------|--------|-----------|-----------|
${metricTable}

## Unfollowed Metrics (candidates for suggestions)
${unfollowedMetrics.map((m) => `- ${m.id}: ${m.name} [${m.domain}] — ${m.currentValue} (${m.changePercent > 0 ? "+" : ""}${m.changePercent}%)`).join("\n")}

## Numeric Conventions
1. Revenue: gunakan "Rp X,XX miliar" / "Rp X,XX triliun" (Indonesian decimal koma).
2. \`direction=down_is_good\` → penurunan = berita POSITIF (mis. delinquency turun = bagus).
3. Status thresholds: healthy (favorable change), warning (unfavorable 0-10%), critical (unfavorable >10%).

## Your Task — Executive Briefing (BCG "What / Why / So what / Now what")
Produce a JSON object with exactly 3 keys: "summary", "suggestions", "insights". Output language: **Bahasa Indonesia**.

### summary (AISummaryData)
\`paragraph\` must follow this 4-beat structure in 3-5 sentences (no lists, no markdown, plain prose):
1. **What changed** — headline number vs framework Piramida Kepatuhan Pajak baseline (mis. "Tunggakan 74,77% — 14,77pp di atas baseline 60%").
2. **Why** — 1-2 segment-dimensional drivers with named segments (mis. "didorong M2 32,05% beban historis kronis").
3. **So what** — fiscal/strategic implication (mis. "Rp 23,5 miliar konservatif on the table; H1 culture at risk if amnesti generic").
4. **Now what** — 1 prioritized next action with the trade-off named (mis. "Wave-1 K1+O1 via WhatsApp lebih ROI tinggi daripada amnesti M2 — tapi tidak menyentuh beban kronis").
- \`boldParts\` lists the literal value strings to highlight (must appear verbatim in paragraph).
- \`positiveChanges\` and \`negativeChanges\`: up to 4 concise lines each, segment-dimensional where possible.
- \`topRisers\` and \`needsAttention\`: up to 4 each. Use exact metric IDs from the "ID" column (e.g. "M-COMPL-001"). Sort by absolute changePercent.

### suggestions (AISuggestionItem[])
Recommend 2-3 UNFOLLOWED metrics with concrete prescriptive value. Each suggestion must:
- Reference a specific segment or sub-population (rule #1).
- State a 2-3 option trade-off in \`why\` when relevant (rule #4).
- Use accentType "warning" for risk/decline, "info" for opportunity.
- domain ∈ {Compliance, Revenue, Treatment, Demographic, SWDKLLJ, Operational}.
- Confidence 0.6-0.95.
- Use exact metric IDs (e.g. "M-TREAT-001"). \`relatedMetricPath\` lists 1-3 metric IDs.

### insights (Record<metricId, { text, boldParts }>)
For each FOLLOWED metric, write 1 prescriptive sentence (not descriptive narration of the value).
- The text must answer "so what does this number mean for next-90-day action?"
- Reference a specific segment or threshold where applicable.
- \`boldParts\` lists literal substrings of \`text\` to highlight.
- Keys are exact metric IDs from the "ID" column.

## Output Format
Return ONLY valid JSON (no markdown, no code fences). Schema:
{
  "summary": {
    "agentName": "Galen PKB Pilot Agent",
    "timestamp": "<ISO timestamp>",
    "paragraph": "<3-5 sentence Bahasa Indonesia briefing in What/Why/So what/Now what structure>",
    "boldParts": ["<verbatim values from paragraph>"],
    "positiveChanges": ["<short line, segment-dimensional>"],
    "negativeChanges": ["<short line, segment-dimensional>"],
    "topRisers": [{ "metricId": "<M-...>", "name": "<name>", "changePercent": <number> }],
    "needsAttention": [{ "metricId": "<M-...>", "name": "<name>", "changePercent": <number> }]
  },
  "suggestions": [
    {
      "id": "suggestion-<metricId>",
      "metricId": "<M-...>",
      "metricName": "<name>",
      "domain": "<Compliance|Revenue|Treatment|Demographic|SWDKLLJ|Operational>",
      "confidence": <0.6-0.95>,
      "value": "<current value>",
      "changePercent": <number>,
      "why": "<prescriptive explanation with segment + 2-3 option trade-off>",
      "relatedMetricPath": ["<M-...>", "..."],
      "accentType": "<warning|info>"
    }
  ],
  "insights": {
    "<M-...>": { "text": "<prescriptive 1-sentence insight>", "boldParts": ["<verbatim>"] }
  }
}`;
}

// ── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    // OpenRouter (OpenAI-compatible) — accepts ANY of these env vars to be tolerant
    // of how the user named their secret (OPENROUTER_API_KEY is canonical).
    const OPENROUTER_API_KEY =
      Deno.env.get("OPENROUTER_API_KEY") ||
      Deno.env.get("OPENROUTER_KEY") ||
      Deno.env.get("OPEN_ROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error(
        "OPENROUTER_API_KEY is not configured (tried OPENROUTER_API_KEY, OPENROUTER_KEY, OPEN_ROUTER_API_KEY)"
      );
    }
    const OPENROUTER_MODEL =
      Deno.env.get("OPENROUTER_MODEL") || "anthropic/claude-sonnet-4.5";
    const OPENROUTER_SITE =
      Deno.env.get("OPENROUTER_SITE_URL") || "https://galen.jasaraharja.id";
    const OPENROUTER_TITLE =
      Deno.env.get("OPENROUTER_APP_TITLE") || "Galen PKB Pilot";

    const body: RequestBody = await req.json();
    const { period, segment, followedMetricIds, metricsSnapshot } = body;

    if (!metricsSnapshot || metricsSnapshot.length === 0) {
      return new Response(
        JSON.stringify({ error: "metricsSnapshot is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildSystemPrompt(period, segment, followedMetricIds, metricsSnapshot);

    // Call OpenRouter (OpenAI-compatible chat completions endpoint)
    const llmResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": OPENROUTER_SITE,
        "X-Title": OPENROUTER_TITLE,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 8192,
        temperature: 0.3,
        // Force JSON output where supported by the upstream provider
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analisis metrics untuk snapshot ${period} (segmen: ${
              segment === "all" ? "All Segments" : segment
            }) dan hasilkan JSON dengan keys "summary", "suggestions", "insights" sesuai schema. Bahasa: Indonesia. JANGAN bungkus dengan markdown atau code fence.`,
          },
        ],
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error("OpenRouter API error:", llmResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "AI service unavailable",
          details: `OpenRouter returned ${llmResponse.status}`,
          upstream: errorText.slice(0, 500),
        }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const llmResult = await llmResponse.json();

    // OpenAI-compatible response shape: choices[0].message.content (string)
    const messageContent: string | undefined = llmResult.choices?.[0]?.message?.content;
    if (!messageContent) {
      console.error("OpenRouter response missing choices[0].message.content:", JSON.stringify(llmResult).slice(0, 500));
      throw new Error("No message content in OpenRouter response");
    }

    let rawText = messageContent.trim();

    // Strip markdown code fences if present (despite instructions)
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const aiResult = JSON.parse(rawText);

    // Validate required keys
    if (!aiResult.summary || !aiResult.suggestions || !aiResult.insights) {
      throw new Error("AI response missing required keys (summary, suggestions, insights)");
    }

    return new Response(JSON.stringify(aiResult), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("metrics-ai error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate AI metrics analysis",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

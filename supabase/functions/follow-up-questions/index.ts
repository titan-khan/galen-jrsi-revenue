import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * follow-up-questions Edge Function — PKB pilot (Jasa Raharja Kalteng)
 *
 * Generates 2–3 contextual follow-up questions in bahasa Indonesia after the
 * Galen Assistant replies. Calls OpenRouter (consistent with the assistant
 * and metrics-ai functions) — no separate ANTHROPIC_API_KEY required.
 *
 * Returns null/empty on any error so the frontend falls back to the
 * deterministic generator in followUpGenerator.ts.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

interface MentionedMetric {
  id: string;
  name: string;
  domain: string;
  currentValue: string;
  changePercent: number;
  status: string;
}

interface RequestBody {
  userQuestion: string;
  assistantResponse: string;
  summary: {
    keyTakeaway: string;
    confidence: string;
    nextSteps?: string;
  } | null;
  mentionedMetrics: MentionedMetric[];
  allMetricNames: string[];
  dataDomains: string[];
}

interface FollowUpQuestion {
  id: string;
  text: string;
  category: string;
}

const SYSTEM_PROMPT = `Anda adalah generator pertanyaan lanjutan untuk Galen Assistant — pilot kepatuhan PKB
(Pajak Kendaraan Bermotor) Jasa Raharja Kalimantan Tengah. Audiens: Kepala Cabang
dan pimpinan SADAR (C-level). Bahasa: Indonesia.

Diberikan pertanyaan user, jawaban assistant, dan konteks metrik, hasilkan 2-3
pertanyaan lanjutan yang membantu eksekutif menggali lebih dalam atau mengambil
tindakan.

ATURAN:
1. Bahasa Indonesia natural, profesional, C-level. JANGAN bahasa Inggris.
2. Setiap pertanyaan harus ANSWERABLE dari data warehouse:
   - gold.registry_enriched (segmen kepatuhan, kabupaten, jenis kendaraan, tunggakan)
   - gold.transaksi_2025 (realisasi PKB & SWDKLLJ)
   - ref.segmen / ref.treatment_lookup / ref.revenue_scenario / ref.program_sadar / ref.raci_matrix
   - meta.metric_certification (definisi & sertifikasi metrik)
3. Pakai NAMA SEGMEN NATURAL: "Patuh Aktif", "Baru Lewat Jatuh Tempo",
   "Mulai Mengabaikan", "Tidak Patuh Pasif", "Tidak Patuh Kronis", "Belum Terdaftar",
   "Kendaraan Hantu". DILARANG kode H1/K1/M2/S2.
4. Glossary: pakai "peluang sukses tagih" bukan "konversi"; "nomor handphone" bukan "HP";
   "saluran" bukan "channel"; "risiko erosi kepatuhan" bukan "moral hazard".
5. Format Rupiah: "Rp X,XX miliar/triliun/juta" jika menyebut angka.
6. Maksimum 120 karakter per pertanyaan.
7. Jangan ulangi pertanyaan user. Jangan ulangi yang sudah dijawab assistant.
8. Setiap pertanyaan eksplorasi sudut yang BERBEDA — drill-down, action, korelasi,
   tren, atau skenario revenue.
9. Bila assistant menyebut amnesti, salah satu pertanyaan WAJIB tentang risiko erosi
   kepatuhan ke segmen Patuh Aktif / Baru Lewat Jatuh Tempo.
10. Bila assistant menyebut treatment / kanal, salah satu pertanyaan WAJIB tentang
    cakupan nomor handphone atau pilihan saluran offline (surat / RT-RW / SAMSAT).

KATEGORI (pilih satu per pertanyaan):
- next-step: gali lebih dalam topik utama
- action: aksi / tindakan yang harus dilakukan
- correlation: keterkaitan lintas-segmen, lintas-kabupaten, atau lintas-metrik
- drill-down: breakdown per dimensi (segmen / kabupaten / jenis kendaraan / waktu)
- trend: pola historis atau trajektori

OUTPUT: HANYA JSON valid (tanpa markdown, tanpa code fence):
{"questions":[{"id":"ai-1","text":"...","category":"..."},{"id":"ai-2","text":"...","category":"..."}]}`;

function buildUserMessage(body: RequestBody): string {
  const { userQuestion, assistantResponse, summary } = body;

  const truncated =
    assistantResponse.length > 1000
      ? assistantResponse.slice(0, 1000) + "..."
      : assistantResponse;

  const takeaway = summary?.keyTakeaway || "(belum ada ringkasan eksplisit)";
  const nextSteps = summary?.nextSteps || "(belum ada next steps eksplisit)";

  return `Pertanyaan user: "${userQuestion}"

Jawaban assistant (ringkas):
${truncated}

Key takeaway: ${takeaway}
Next steps: ${nextSteps}

Hasilkan 2-3 pertanyaan lanjutan dalam bahasa Indonesia.`;
}

Deno.serve(async (req: Request) => {
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
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")
      || Deno.env.get("OPENROUTER_KEY")
      || Deno.env.get("OPEN_ROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();

    if (!body.userQuestion || !body.assistantResponse) {
      return new Response(
        JSON.stringify({
          error: "userQuestion and assistantResponse are required",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const userMessage = buildUserMessage(body);

    const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_FOLLOWUP_MODEL")
      || "anthropic/claude-haiku-4.5";
    const OPENROUTER_SITE = Deno.env.get("OPENROUTER_SITE_URL") || "https://galen.jasaraharja.id";
    const OPENROUTER_TITLE = Deno.env.get("OPENROUTER_APP_TITLE") || "Galen PKB Pilot Follow-up";

    const llmResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": OPENROUTER_SITE,
          "X-Title": OPENROUTER_TITLE,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          max_tokens: 400,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        }),
      }
    );

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error("OpenRouter API error:", llmResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "AI service unavailable",
          details: `OpenRouter returned ${llmResponse.status}`,
          upstream: errorText.slice(0, 300),
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const llmResult = await llmResponse.json();
    const messageContent: string | undefined = llmResult.choices?.[0]?.message?.content;
    if (!messageContent) {
      throw new Error("No message content in OpenRouter response");
    }

    let rawText = messageContent.trim();
    if (rawText.startsWith("```")) {
      rawText = rawText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const aiResult = JSON.parse(rawText);

    if (
      !aiResult.questions ||
      !Array.isArray(aiResult.questions) ||
      aiResult.questions.length === 0
    ) {
      throw new Error(
        "AI response missing required 'questions' array or array is empty"
      );
    }

    const questions: FollowUpQuestion[] = aiResult.questions
      .slice(0, 3)
      .map((q: FollowUpQuestion, i: number) => ({
        id: q.id || `ai-followup-${i + 1}`,
        text: String(q.text || "").slice(0, 200),
        category: q.category || "next-step",
      }));

    return new Response(JSON.stringify({ questions }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("follow-up-questions error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate follow-up questions",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});

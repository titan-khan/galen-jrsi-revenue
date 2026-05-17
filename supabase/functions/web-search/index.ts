// =============================================================================
// WEB SEARCH EDGE FUNCTION — OpenAI gpt-4o-mini-search-preview via OpenRouter
//
// Returns structured citations (title, url, snippet, sourceDomain, date) from
// OpenAI's search-enabled chat model. Used by the Riset feature to back the
// BriefingDetail mention/evidence panel with live public sources when Demo Mode
// is OFF on the frontend.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Focus = "media" | "social" | "all";

interface RequestBody {
  query: string;
  focus?: Focus;
  maxResults?: number;
  locale?: string;
  /**
   * Lookback window in days. Constrains the search-preview model so results stay
   * within the user-selected period. Defaults to 30 days if not provided.
   */
  periodDays?: number;
}

interface UrlCitationAnnotation {
  type: "url_citation";
  url_citation: {
    url: string;
    title?: string;
    start_index?: number;
    end_index?: number;
    content?: string;
  };
}

interface ChoiceMessage {
  content?: string;
  annotations?: UrlCitationAnnotation[];
}

interface OpenRouterResponse {
  choices?: { message?: ChoiceMessage }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

interface WebSearchCitation {
  url: string;
  title: string;
  snippet: string;
  sourceDomain: string;
  date: string | null;
}

interface WebSearchTheme {
  name: string;
  description: string;
}

interface WebSearchSentiment {
  negativePct: number;
  neutralPct: number;
  positivePct: number;
  trendChangePoints: number;
}

interface WebSearchRegion {
  region: string;
  negativePct: number;
}

interface WebSearchTopic {
  rank: number;
  name: string;
  negativePct: number;
}

interface WebSearchRecommendation {
  title: string;
  description: string;
}

interface WebSearchPola {
  number: number;
  title: string;
  eventType: string;
  description: string;
  confidence: "tinggi" | "sedang" | "rendah";
  recommendations: WebSearchRecommendation[];
}

const DATE_REGEX_ISO = /\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/;
const DATE_REGEX_ID = /\b(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(20\d{2})\b/i;

function buildSystemPrompt(focus: Focus, locale: string, periodDays: number): string {
  const focusLine =
    focus === "media"
      ? "Prioritaskan media berita arus utama Indonesia (Kompas, Detik, Tempo, CNN Indonesia, Bisnis.com, Kontan, MediaIndonesia, Antara, Tribun, dll). Hindari blog pribadi dan situs aggregator."
      : focus === "social"
      ? "Prioritaskan postingan publik di platform sosial (Twitter/X, Reddit, YouTube comments yang public, forum publik, Facebook public posts). Hindari konten privat/grup tertutup."
      : "Cari di kombinasi media berita arus utama Indonesia + postingan publik di sosial media (Twitter/X, Reddit, forum publik). Variasikan sumber.";

  const periodLine =
    periodDays <= 7
      ? `WAJIB hanya pakai artikel/post yang dipublikasikan dalam ${periodDays} hari terakhir. Jika tidak ada hasil ${periodDays} hari, sebutkan eksplisit "Tidak ada citation dalam ${periodDays} hari terakhir" di summary dan TETAP isi section terstruktur dengan nilai 0 / [] yang sesuai.`
      : periodDays <= 90
      ? `WAJIB hanya pakai artikel/post yang dipublikasikan dalam ${periodDays} hari terakhir. Skip hasil yang lebih lama meski relevan secara tematik.`
      : `Pakai artikel/post yang dipublikasikan dalam ~${Math.round(periodDays / 30)} bulan terakhir. Hasil yang lebih lama hanya jika sangat penting + tetap jelaskan tanggalnya.`;

  return `Anda agen pencarian web untuk tim riset Jasa Raharja Indonesia (kepatuhan PKB & klaim asuransi kecelakaan).

OUTPUT BUDGET: Tulis ringkasan SINGKAT max 4 kalimat (≈150 kata). Sebagian besar token harus dipakai untuk SECTION TERSTRUKTUR di akhir.

Format ringkasan:
- 2-4 kalimat executive briefing berbahasa Indonesia
- ${focusLine}
- ${periodLine}
- Setiap klaim faktual diakhiri kutipan [domain](url). JANGAN mengarang URL.
- Locale ${locale}.

KONSISTENSI: Semua section terstruktur HARUS diturunkan dari citation di Highlights. Sentimen total = 100. Untuk N kecil (2-3 citation) pakai angka realistis (0/50/100), bukan 30/70 acak. Semua wilayah yang disebut citation WAJIB masuk ke section Wilayah.

WAJIB diakhiri PERSIS dengan 7 section ini, dalam urutan PERSIS seperti di bawah ini. Ini PRIORITAS — bila batas token mendekati, KORBANKAN ringkasan, bukan section terakhir.

## Highlights:
- [Judul asli artikel](https://url), Dipublikasikan pada DD Bulan YYYY
(5-10 bullet. Judul = judul asli artikel, BUKAN nama domain.)

## Pola:
- [tinggi] Contoh Judul Pola :: Insiden korban massal :: Contoh deskripsi 1-2 kalimat dengan angka spesifik.
(Format LITERAL: tanda kurung siku berisi salah satu kata "tinggi" / "sedang" / "rendah" — JANGAN tulis kata "confidence" di sana. Pisahkan judul/tipe/deskripsi dengan "::". Buat 1-5 bullet PERSIS seperti format di atas.

ATURAN MECE — wajib dipatuhi LITERAL:
• Setiap Pola HARUS punya TIPE EVENT yang UNIK — DILARANG 2+ Pola dengan tipe yang sama. Jika beberapa citation cocok ke "Edukasi publik", GABUNG semua jadi SATU Pola.
• Setiap Pola = cluster citation BERBEDA. DILARANG 2 Pola tentang "kecelakaan Cipali" hanya beda tanggal — GABUNG.
• Pilih TIPE EVENT dari daftar ini saja: Insiden korban massal | Keterlambatan proses klaim | Kritik publik | Kebijakan/regulasi | Edukasi publik | Anomali wilayah | Inovasi layanan.
• Jumlah Pola = jumlah TIPE EVENT yang muncul. Range valid: 1-5 Pola.)

## Rekomendasi:
Pola 1:
- Judul aksi ringkas — deskripsi 1 kalimat yang menjelaskan tindakan operasional spesifik
- Judul aksi ringkas — deskripsi
Pola 2:
- ...
(2-3 rekomendasi per Pola. Setiap rekomendasi harus AKSI OPERASIONAL yang bisa langsung dieksekusi cabang Jasa Raharja: koordinasi dengan pihak X, peningkatan kapasitas, komunikasi publik, dll. Contoh:
Pola 1:
- Kesiapan operasional cabang Cipali — Tingkatkan kapasitas verifikator di Subang/Cikampek 30 hari ke depan.
- Koordinasi Korlantas POLRI — Sinkronkan data korban dgn polisi untuk percepatan identifikasi.)

## Sentimen:
- Negatif: NN%
- Netral: NN%
- Positif: NN%
- Tren: +X.X poin
(Tone judul+cuplikan. Total = 100.)

## Wilayah:
- Nama wilayah: NN% negatif
(2-5 bullet. Wilayah konkret yang disebut citation — "Karawang", "Cipali". JANGAN "Nasional"/"Indonesia".)

## Topik:
- Nama topik: NN% negatif
(3-7 bullet. Topik = klaster spesifik, mis. "Lonjakan klaim Cipali".)

## Tema:
- Nama tema — deskripsi 1 kalimat
(2-3 bullet. Tema = pola luas yang muncul di sumber.)`;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function extractDate(text: string): string | null {
  const iso = text.match(DATE_REGEX_ISO);
  if (iso) return iso[0];
  const id = text.match(DATE_REGEX_ID);
  if (id) {
    const monthMap: Record<string, string> = {
      januari: "01", februari: "02", maret: "03", april: "04",
      mei: "05", juni: "06", juli: "07", agustus: "08",
      september: "09", oktober: "10", november: "11", desember: "12",
    };
    const day = id[1].padStart(2, "0");
    const month = monthMap[id[2].toLowerCase()];
    const year = id[3];
    if (month) return `${year}-${month}-${day}`;
  }
  return null;
}

function deriveSnippet(content: string, ann: UrlCitationAnnotation, maxLen = 220): string {
  const cite = ann.url_citation;
  // Prefer explicit content field if provider supplied it.
  if (cite.content && cite.content.trim().length > 0) {
    return stripMarkdown(cite.content).slice(0, maxLen).trim();
  }
  // OpenAI search-preview annotates a narrow slice (just the [domain](url) span).
  // Expand backward to the previous sentence boundary so the snippet carries real meaning.
  const start = typeof cite.start_index === "number" ? cite.start_index : 0;
  const end = typeof cite.end_index === "number" ? cite.end_index : start;

  // Hard stop at "## " (next markdown heading) so the Highlights list doesn't bleed in.
  const nextHeading = content.indexOf("\n## ", end);
  const ceiling = nextHeading >= 0 ? nextHeading : content.length;

  // Walk back up to ~maxLen chars or until a sentence end (. ! ? \n).
  let backStart = Math.max(0, start - maxLen);
  for (let i = start - 1; i >= backStart; i--) {
    const ch = content[i];
    if (ch === "." || ch === "!" || ch === "?" || ch === "\n") {
      backStart = i + 1;
      break;
    }
  }
  // Walk forward to a sentence end after end, but not past the ceiling.
  let forwardEnd = Math.min(ceiling, Math.max(end, backStart + maxLen));
  for (let i = end; i < Math.min(ceiling, end + maxLen); i++) {
    const ch = content[i];
    if (ch === "." || ch === "!" || ch === "?" || ch === "\n") {
      forwardEnd = Math.min(ceiling, i + 1);
      break;
    }
  }
  const raw = content.slice(backStart, forwardEnd).trim();
  const clean = stripMarkdown(raw).trim();
  return clean.length > maxLen ? clean.slice(0, maxLen).trim() + "…" : clean;
}

// Extract themes from the "## Tema:" section emitted by the system prompt.
// Format expected per line: "- NAMA TEMA — deskripsi" (em dash or " - " between).
function extractThemes(content: string): WebSearchTheme[] {
  const themes: WebSearchTheme[] = [];
  const startIdx = content.search(/##\s+Tema\s*:/i);
  if (startIdx < 0) return themes;
  // Slice from "## Tema:" up to the next "## " or end-of-content.
  const remainder = content.slice(startIdx);
  const endRelIdx = remainder.search(/\n##\s+/);
  const section = endRelIdx > 0 ? remainder.slice(0, endRelIdx) : remainder;
  const lines = section.split("\n").slice(1); // drop the heading line
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!/^[-•*]\s+/.test(line)) continue;
    const stripped = line.replace(/^[-•*]\s+/, "");
    // Separator: em dash, en dash, " - ", or ": "
    const m = /^(.+?)\s+(?:—|–|-|:)\s+(.+)$/.exec(stripped);
    const clean = (s: string) =>
      stripMarkdown(
        s
          .replace(/^\**/, "")
          .replace(/\**$/, "")
          .replace(/\*\*/g, "")
          .trim(),
      );
    if (m) {
      themes.push({ name: clean(m[1]).slice(0, 80), description: clean(m[2]).slice(0, 240) });
    } else if (stripped.length > 0) {
      themes.push({ name: clean(stripped).slice(0, 80), description: "" });
    }
    if (themes.length >= 6) break;
  }
  return themes;
}

// Slice a labeled markdown section ("## Sentimen:") out of the full content.
// Returns the body lines (without the heading) up to the next "## " or end.
function sliceSection(content: string, headingRegex: RegExp): string[] {
  const idx = content.search(headingRegex);
  if (idx < 0) return [];
  const remainder = content.slice(idx);
  const endRel = remainder.slice(1).search(/\n##\s+/); // skip first line so we don't match self
  const section = endRel > 0 ? remainder.slice(0, endRel + 1) : remainder;
  return section.split("\n").slice(1).map((l) => l.trim()).filter(Boolean);
}

const stripMd = (s: string) => s.replace(/^\**/, "").replace(/\**$/, "").replace(/\*\*/g, "").trim();

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Parse "## Sentimen:" — looks for "Negatif: NN%", "Netral: NN%", "Positif: NN%", "Tren: ±X.X".
function extractSentiment(content: string): WebSearchSentiment | null {
  const lines = sliceSection(content, /##\s+Sentimen\s*:/i);
  if (lines.length === 0) return null;
  let neg = NaN, neu = NaN, pos = NaN, trend = 0;
  for (const raw of lines) {
    const line = raw.replace(/^[-•*]\s*/, "");
    const m = /^([^:]+):\s*([+-]?\d+(?:\.\d+)?)\s*%?/i.exec(line);
    if (!m) continue;
    const label = m[1].toLowerCase().trim();
    const num = parseFloat(m[2]);
    if (/negatif/.test(label)) neg = num;
    else if (/netral|neutral/.test(label)) neu = num;
    else if (/positif|positive/.test(label)) pos = num;
    else if (/tren|trend/.test(label)) trend = num;
  }
  if (!Number.isFinite(neg) && !Number.isFinite(neu) && !Number.isFinite(pos)) return null;
  // Fill missing buckets so 3 always add to 100.
  const known = [neg, neu, pos].filter(Number.isFinite) as number[];
  const knownSum = known.reduce((a, b) => a + b, 0);
  const safe = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);
  const remainder = Math.max(0, 100 - knownSum);
  const missingCount = 3 - known.length;
  const fillEach = missingCount > 0 ? remainder / missingCount : 0;
  return {
    negativePct: clampPct(safe(neg, fillEach)),
    neutralPct: clampPct(safe(neu, fillEach)),
    positivePct: clampPct(safe(pos, fillEach)),
    trendChangePoints: Number.isFinite(trend) ? Math.round(trend * 10) / 10 : 0,
  };
}

function extractRegions(content: string): WebSearchRegion[] {
  const lines = sliceSection(content, /##\s+Wilayah\s*:/i);
  const result: WebSearchRegion[] = [];
  for (const raw of lines) {
    const line = raw.replace(/^[-•*]\s*/, "");
    const m = /^(.+?)[:\-—–]\s*(\d+(?:\.\d+)?)\s*%/i.exec(line);
    if (!m) continue;
    const region = stripMd(m[1]).replace(/\s+negatif$/i, "").slice(0, 60);
    if (!region || /^(nasional|indonesia|umum)$/i.test(region)) continue;
    result.push({ region, negativePct: clampPct(parseFloat(m[2])) });
    if (result.length >= 6) break;
  }
  return result;
}

/**
 * Parse the `## Rekomendasi:` section into a Map<polaNumber, recommendations[]>.
 * Expected format:
 *   ## Rekomendasi:
 *   Pola 1:
 *   - Judul aksi — deskripsi
 *   - Judul aksi — deskripsi
 *   Pola 2:
 *   - ...
 */
function extractRecommendationsByPola(content: string): Map<number, WebSearchRecommendation[]> {
  const result = new Map<number, WebSearchRecommendation[]>();
  const startIdx = content.search(/##\s+Rekomendasi\s*:/i);
  if (startIdx < 0) return result;
  const remainder = content.slice(startIdx);
  const endRel = remainder.slice(1).search(/\n##\s+/);
  const section = endRel > 0 ? remainder.slice(0, endRel + 1) : remainder;
  const lines = section.split("\n").slice(1);

  let currentPola = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const polaHeader = /^Pola\s+(\d+)\s*:/i.exec(line);
    if (polaHeader) {
      currentPola = parseInt(polaHeader[1], 10);
      if (!result.has(currentPola)) result.set(currentPola, []);
      continue;
    }
    if (currentPola === 0) continue;
    const bullet = /^[-•*]\s+(.+)$/.exec(line);
    if (!bullet) continue;
    const body = bullet[1];
    // Separator: em dash, en dash, " - ", or " : "
    const split = /^(.+?)\s+(?:—|–|-|:)\s+(.+)$/.exec(body);
    const cleanField = (s: string) => stripMarkdown(stripMd(s));
    const list = result.get(currentPola)!;
    if (split) {
      list.push({
        title: cleanField(split[1]).slice(0, 80),
        description: cleanField(split[2]).slice(0, 220),
      });
    } else {
      list.push({ title: cleanField(body).slice(0, 80), description: "" });
    }
    if (list.length >= 4) continue; // cap per Pola
  }
  return result;
}

function extractPola(content: string): WebSearchPola[] {
  const lines = sliceSection(content, /##\s+Pola\s*:/i);
  const result: WebSearchPola[] = [];
  for (const raw of lines) {
    const line = raw.replace(/^[-•*]\s*/, "");
    // Expected: [tinggi|sedang|rendah] JUDUL :: TIPE :: DESKRIPSI
    // Also accept the literal "[confidence]" placeholder — model sometimes copies
    // the template verbatim — and default to "sedang" in that case.
    const m = /^\[(tinggi|sedang|rendah|confidence)\]\s*(.+?)\s*::\s*(.+?)\s*::\s*(.+)$/i.exec(line);
    const cleanField = (s: string) => stripMarkdown(stripMd(s));
    const normalizeConfidence = (s: string): WebSearchPola["confidence"] => {
      const lower = s.toLowerCase();
      if (lower === "tinggi" || lower === "sedang" || lower === "rendah") return lower;
      return "sedang"; // graceful default for literal "[confidence]" leakage
    };
    const KNOWN_EVENT_TYPES = [
      "Insiden korban massal",
      "Keterlambatan proses klaim",
      "Kritik publik",
      "Kebijakan/regulasi",
      "Edukasi publik",
      "Anomali wilayah",
      "Inovasi layanan",
    ];
    /** When model collapses title+type into one field, derive title from description. */
    const deriveTitleFromDesc = (desc: string, eventType: string): string => {
      // Take first ~8 words of description as a fallback title.
      const firstSentence = desc.split(/[.!?]/)[0] ?? desc;
      const words = firstSentence.split(/\s+/).slice(0, 9).join(" ");
      return words || eventType;
    };
    if (!m) {
      // Fallback 1: em-dash separators if model used those instead of "::"
      const m2 = /^\[(tinggi|sedang|rendah|confidence)\]\s*(.+?)\s+[—–-]\s+(.+?)\s+[—–-]\s+(.+)$/i.exec(line);
      if (m2) {
        result.push({
          number: result.length + 1,
          title: cleanField(m2[2]).slice(0, 120),
          eventType: cleanField(m2[3]).slice(0, 60),
          description: cleanField(m2[4]).slice(0, 280),
          confidence: normalizeConfidence(m2[1]),
          recommendations: [],
        });
      } else {
        // Fallback 2: 2-field format `[conf] TIPE :: DESKRIPSI`
        // (model sometimes collapses title+type into one).
        const m3 = /^\[(tinggi|sedang|rendah|confidence)\]\s*(.+?)\s*::\s*(.+)$/i.exec(line);
        if (!m3) continue;
        const firstField = cleanField(m3[2]);
        const description = cleanField(m3[3]);
        // If first field matches a known event type, use it as eventType and derive title.
        const matchedType = KNOWN_EVENT_TYPES.find(
          (t) => firstField.toLowerCase() === t.toLowerCase(),
        );
        if (matchedType) {
          result.push({
            number: result.length + 1,
            title: deriveTitleFromDesc(description, matchedType).slice(0, 120),
            eventType: matchedType,
            description: description.slice(0, 280),
            confidence: normalizeConfidence(m3[1]),
            recommendations: [],
          });
        } else {
          // Otherwise treat as title with unknown type — leave eventType as the raw field.
          result.push({
            number: result.length + 1,
            title: firstField.slice(0, 120),
            eventType: firstField.slice(0, 60),
            description: description.slice(0, 280),
            confidence: normalizeConfidence(m3[1]),
            recommendations: [],
          });
        }
      }
    } else {
      result.push({
        number: result.length + 1,
        title: cleanField(m[2]).slice(0, 120),
        eventType: cleanField(m[3]).slice(0, 60),
        description: cleanField(m[4]).slice(0, 280),
        confidence: normalizeConfidence(m[1]),
        recommendations: [],
      });
    }
    if (result.length >= 6) break;
  }

  // Parse Rekomendasi section and attach to matching Pola BEFORE merging (so we keep
  // recommendations indexed against the original Pola numbers from the model output).
  const recsByPola = extractRecommendationsByPola(content);
  for (const p of result) {
    const recs = recsByPola.get(p.number);
    if (recs) p.recommendations = recs;
  }

  // Server-side MECE enforcement: if the model violated the "1 Pola per eventType"
  // rule, merge duplicates so the UI sees a clean list. Keep the highest-confidence
  // entry's title; concatenate descriptions; merge recommendations; preserve order.
  const merged = new Map<string, WebSearchPola>();
  const confidenceRank: Record<string, number> = { tinggi: 3, sedang: 2, rendah: 1 };
  for (const p of result) {
    const key = p.eventType.toLowerCase().trim();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...p });
    } else {
      const winsConfidence = confidenceRank[p.confidence] > confidenceRank[existing.confidence];
      // Dedup recommendations by title.
      const recMap = new Map<string, WebSearchRecommendation>();
      for (const r of [...existing.recommendations, ...p.recommendations]) {
        recMap.set(r.title.toLowerCase(), r);
      }
      merged.set(key, {
        number: existing.number,
        title: winsConfidence ? p.title : existing.title,
        eventType: existing.eventType,
        description: `${existing.description} ${p.description}`.slice(0, 280),
        confidence: winsConfidence ? p.confidence : existing.confidence,
        recommendations: Array.from(recMap.values()).slice(0, 4),
      });
    }
  }
  // Renumber 1..N after merge
  return Array.from(merged.values()).map((p, i) => ({ ...p, number: i + 1 }));
}

function extractTopics(content: string): WebSearchTopic[] {
  const lines = sliceSection(content, /##\s+Topik\s*:/i);
  const result: WebSearchTopic[] = [];
  for (const raw of lines) {
    const line = raw.replace(/^[-•*]\s*/, "");
    const m = /^(.+?)[:\-—–]\s*(\d+(?:\.\d+)?)\s*%/i.exec(line);
    if (!m) continue;
    const name = stripMd(m[1]).replace(/\s+negatif$/i, "").slice(0, 80);
    if (!name) continue;
    result.push({ rank: result.length + 1, name, negativePct: clampPct(parseFloat(m[2])) });
    if (result.length >= 8) break;
  }
  return result;
}

// Returns a Map<urlKey, date> built from the "## Highlights:" / list section.
// urlKey is the canonical URL after stripping query string + fragment.
function buildHighlightDateIndex(content: string): Map<string, string> {
  const index = new Map<string, string>();
  const lines = content.split("\n");
  const linkRegex = /\[([^\]]{1,240})\]\((https?:\/\/[^\s)]+)\)/;
  for (const line of lines) {
    if (!/^[\s]*(?:[-•*]|\d+\.)\s+/.test(line)) continue;
    const m = linkRegex.exec(line);
    if (!m) continue;
    const url = m[2].replace(/[),.;]+$/, "");
    const urlKey = url.split("#")[0].split("?")[0];
    const date = extractDate(line);
    if (date && !index.has(urlKey)) index.set(urlKey, date);
  }
  return index;
}

function stripMarkdown(text: string): string {
  return text
    // Markdown link [text](url) → text (drops the URL, keeps the visible label)
    .replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, "$1")
    // Collapse repeated whitespace introduced by the replacement
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeCitations(content: string, annotations: UrlCitationAnnotation[]): WebSearchCitation[] {
  const seen = new Set<string>();
  const result: WebSearchCitation[] = [];
  const highlightDates = buildHighlightDateIndex(content);

  // ── Path 1: annotations[] (preferred when model returns structured citations) ──
  for (const ann of annotations) {
    if (ann.type !== "url_citation") continue;
    const cite = ann.url_citation;
    if (!cite?.url) continue;
    const urlKey = cite.url.split("#")[0].split("?")[0];
    if (seen.has(urlKey)) continue;
    seen.add(urlKey);

    const snippet = deriveSnippet(content, ann);
    result.push({
      url: cite.url,
      title: (cite.title || cite.url).slice(0, 240),
      snippet: snippet || "(tidak ada cuplikan)",
      sourceDomain: extractDomain(cite.url),
      date: highlightDates.get(urlKey) ?? extractDate(snippet) ?? null,
    });
  }

  // Also harvest URLs that only appear in the Highlights list (not in annotations[]),
  // since the model often surfaces more sources there than it inlines.
  for (const [urlKey, date] of highlightDates.entries()) {
    if (seen.has(urlKey)) continue;
    // Find the original line + label for this URL key.
    const lines = content.split("\n");
    for (const line of lines) {
      const m = /\[([^\]]{1,240})\]\((https?:\/\/[^\s)]+)\)/.exec(line);
      if (!m) continue;
      const url = m[2].replace(/[),.;]+$/, "");
      if (url.split("#")[0].split("?")[0] !== urlKey) continue;
      seen.add(urlKey);
      const label = m[1];
      const labelLooksLikeDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(label.trim());
      const title = labelLooksLikeDomain ? extractDomain(url) : label.trim();
      const cleanSnippet = stripMarkdown(line.replace(/^[\s\-•·*]+/, "")).slice(0, 220);
      result.push({
        url,
        title: title.slice(0, 240),
        snippet: cleanSnippet || "(tidak ada cuplikan)",
        sourceDomain: extractDomain(url),
        date,
      });
      break;
    }
  }

  if (result.length > 0) return result;

  // ── Path 2: parse markdown links from content (model often inlines `[text](url)`) ──
  // Strategy: walk the "## Highlights:" / list section FIRST (proper titles + dates),
  // then fall through to inline citations for anything not yet captured.
  const linkRegex = /\[([^\]]{1,240})\]\((https?:\/\/[^\s)]+)\)/g;
  const lines = content.split("\n");

  // Heuristic: bullet/numbered list lines tend to have rich titles + dates.
  const highlightLineRegex = /^[\s]*(?:[-•*]|\d+\.)\s+/;
  const orderedLines: string[] = [];
  for (const line of lines) {
    if (highlightLineRegex.test(line)) orderedLines.push(line);
  }
  // Append non-list lines after, so they fill gaps for URLs that only appear inline.
  for (const line of lines) {
    if (!highlightLineRegex.test(line)) orderedLines.push(line);
  }

  // Iterate ORDERED lines (highlights first) so the richer entries win the dedup race.
  // Use a fresh regex per line so /g lastIndex never leaks across iterations.
  for (const line of orderedLines) {
    const perLineRegex = /\[([^\]]{1,240})\]\((https?:\/\/[^\s)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = perLineRegex.exec(line)) !== null) {
      const label = m[1];
      const url = m[2];
      if (!url) continue;
      const cleanUrl = url.replace(/[),.;]+$/, "");
      const urlKey = cleanUrl.split("#")[0].split("?")[0];
      if (seen.has(urlKey)) continue;
      seen.add(urlKey);

      const cleanSnippet = line
        .replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, "$1")
        .replace(/^[\s\-•·]+/, "")
        .trim()
        .slice(0, 220);

      const labelLooksLikeDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(label.trim());
      const title = labelLooksLikeDomain ? extractDomain(cleanUrl) : label.trim();

      result.push({
        url: cleanUrl,
        title: title.slice(0, 240),
        snippet: cleanSnippet || "(tidak ada cuplikan)",
        sourceDomain: extractDomain(cleanUrl),
        date: extractDate(line) ?? extractDate(content),
      });
    }
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const body = (await req.json()) as RequestBody;

    if (!body.query || typeof body.query !== "string" || body.query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing `query`" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const focus: Focus = body.focus ?? "all";
    const locale = body.locale ?? "id-ID";
    const maxResults = Math.min(Math.max(body.maxResults ?? 10, 3), 20);
    const periodDays = Math.min(Math.max(body.periodDays ?? 30, 1), 730);

    const OPENROUTER_API_KEY =
      Deno.env.get("OPENROUTER_API_KEY") ||
      Deno.env.get("OPENROUTER_KEY") ||
      Deno.env.get("OPEN_ROUTER_API_KEY");

    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const OPENROUTER_MODEL =
      Deno.env.get("OPENROUTER_SEARCH_MODEL") || "openai/gpt-4o-mini-search-preview";
    const OPENROUTER_SITE =
      Deno.env.get("OPENROUTER_SITE_URL") || "https://galen.jasaraharja.id";
    const OPENROUTER_TITLE =
      Deno.env.get("OPENROUTER_APP_TITLE") || "Galen Riset Web Search";

    const systemPrompt = buildSystemPrompt(focus, locale, periodDays);
    const userPrompt = `Topik riset: ${body.query.trim()}\n\nPeriode: ${periodDays} hari terakhir.\nTarget: kembalikan ringkasan + minimal ${maxResults} kutipan URL relevan dari periode tersebut.`;

    const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": OPENROUTER_SITE,
        "X-Title": OPENROUTER_TITLE,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        // 4000 leaves room for a tight summary + 7 structured sections (Highlights,
        // Tema, Sentimen, Wilayah, Topik, Pola, Rekomendasi). Empirically the model
        // needs ~1600 for the summary alone when citation count is high — bumping
        // headroom prevents the structured sections at the end from being cut off.
        max_tokens: 4000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!orResponse.ok) {
      const errText = await orResponse.text();
      console.error("[web-search] OpenRouter error:", orResponse.status, errText);

      if (orResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Batas permintaan tercapai. Coba lagi sebentar." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (orResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Kuota AI habis. Mohon tambah kredit di OpenRouter." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: `OpenRouter ${orResponse.status}: ${errText.slice(0, 400)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = (await orResponse.json()) as OpenRouterResponse;
    const message = data.choices?.[0]?.message;
    const content = message?.content ?? "";
    const annotations = message?.annotations ?? [];
    const citations = normalizeCitations(content, annotations);
    const themes = extractThemes(content);
    const sentiment = extractSentiment(content);
    const regions = extractRegions(content);
    const topics = extractTopics(content);
    const pola = extractPola(content);

    // Strip structured sections from the displayed summary — FE renders each as its own panel.
    const stripFromHeading = (s: string, re: RegExp) => {
      const idx = s.search(re);
      return idx > 0 ? s.slice(0, idx).trimEnd() : s;
    };
    let summaryClean = stripFromHeading(content, /\n##\s+Highlights\s*:/i);
    summaryClean = stripFromHeading(summaryClean, /\n##\s+Tema\s*:/i);
    summaryClean = stripFromHeading(summaryClean, /\n##\s+Sentimen\s*:/i);
    summaryClean = stripFromHeading(summaryClean, /\n##\s+Wilayah\s*:/i);
    summaryClean = stripFromHeading(summaryClean, /\n##\s+Topik\s*:/i);
    summaryClean = stripFromHeading(summaryClean, /\n##\s+Pola\s*:/i);
    summaryClean = stripFromHeading(summaryClean, /\n##\s+Rekomendasi\s*:/i);

    const latencyMs = Date.now() - startedAt;

    console.log(
      `[web-search] ok · model=${OPENROUTER_MODEL} · citations=${citations.length} · ` +
        `themes=${themes.length} · sentiment=${sentiment ? "y" : "n"} · ` +
        `regions=${regions.length} · topics=${topics.length} · pola=${pola.length} · ` +
        `tokens(in/out)=${data.usage?.prompt_tokens ?? "?"}/${data.usage?.completion_tokens ?? "?"} · ` +
        `latency=${latencyMs}ms`,
    );

    // Diagnostic: capture the raw `## Pola:` section so we can debug parse failures
    // (model uses unexpected separators, etc.) without re-running expensive calls.
    const polaRawIdx = content.search(/##\s+Pola\s*:/i);
    const polaRaw =
      polaRawIdx >= 0
        ? content.slice(polaRawIdx, polaRawIdx + 1500).replace(/\n##\s+\w+\s*:[\s\S]*$/, "")
        : null;

    return new Response(
      JSON.stringify({
        summary: summaryClean,
        citations,
        themes,
        sentiment,
        regions,
        topics,
        pola,
        periodDays,
        model: OPENROUTER_MODEL,
        latencyMs,
        usage: data.usage ?? null,
        _debug: { polaRaw },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[web-search] handler error:", error);
    const errMsg =
      error instanceof Error
        ? `${error.message}${error.stack ? ` | ${error.stack.slice(0, 300)}` : ""}`
        : "Unknown error";
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

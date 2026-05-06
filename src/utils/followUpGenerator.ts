/**
 * followUpGenerator.ts
 *
 * Generates 2-3 contextual follow-up questions after an assistant response.
 * PKB pilot domain (Pajak Kendaraan Bermotor — Jasa Raharja Kalteng).
 *
 * Pure function, no side effects, no API calls. Used as the immediate
 * deterministic answer; followUpService.ts then enhances via the
 * follow-up-questions edge function (Indonesian AI-generated).
 */

import type { MetricDefinition } from '@/types/metric';
import type { ParsedSummary } from '@/utils/streamingParser';

// ── Types ───────────────────────────────────────────────────────────────────

export interface FollowUpQuestion {
  id: string;
  text: string;
  category: 'next-step' | 'action' | 'correlation' | 'drill-down' | 'trend';
}

// ── PKB domain knowledge ───────────────────────────────────────────────────

const SEGMEN_NAMES = [
  'Patuh Aktif',
  'Baru Lewat Jatuh Tempo',
  'Mulai Mengabaikan',
  'Tidak Patuh Pasif',
  'Tidak Patuh Kronis',
  'Belum Terdaftar',
  'Kendaraan Hantu',
];

const KABUPATEN_NAMES = [
  'Palangka Raya', 'Kotawaringin Barat', 'Kotawaringin Timur',
  'Kapuas', 'Barito Selatan', 'Barito Utara', 'Sukamara',
  'Lamandau', 'Seruyan', 'Katingan', 'Pulang Pisau',
  'Gunung Mas', 'Barito Timur', 'Murung Raya',
];

interface DetectedTopics {
  segments: string[];
  kabupatens: string[];
  hasAmnesti: boolean;
  hasTreatment: boolean;
  hasKanal: boolean;
  hasRevenue: boolean;
  hasTunggakan: boolean;
  hasRaci: boolean;
  hasPhone: boolean;
  hasMetric: boolean;
  hasTrend: boolean;
}

// Find segments / kabupatens in `text`, ordered by their first occurrence in the
// text. Picks the longest match at each position so "Tidak Patuh Pasif" wins
// over "Tidak Patuh".
function findOrderedMatches(text: string, names: string[]): string[] {
  const lower = text.toLowerCase();
  // Sort longest-first so longer names get matched before shorter prefixes
  const sorted = [...names].sort((a, b) => b.length - a.length);
  const positions: { name: string; pos: number }[] = [];
  for (const name of sorted) {
    const pos = lower.indexOf(name.toLowerCase());
    if (pos !== -1) positions.push({ name, pos });
  }
  // De-duplicate by position-overlap: if a longer match already covers this
  // position, skip the shorter one.
  positions.sort((a, b) => a.pos - b.pos);
  const kept: { name: string; pos: number }[] = [];
  for (const p of positions) {
    const overlapsLonger = kept.some(
      (k) => p.pos >= k.pos && p.pos < k.pos + k.name.length
    );
    if (!overlapsLonger) kept.push(p);
  }
  return kept.map((p) => p.name);
}

function detectTopics(text: string): DetectedTopics {
  const lower = text.toLowerCase();
  return {
    segments: findOrderedMatches(text, SEGMEN_NAMES),
    kabupatens: findOrderedMatches(text, KABUPATEN_NAMES),
    hasAmnesti: /amnesti|penghapusan|pemutihan/.test(lower),
    hasTreatment: /treatment|tindakan|intervensi|aksi utama|rekomendasi/.test(lower),
    hasKanal: /whatsapp|kanal|saluran|surat|rt-rw|samsat keliling/.test(lower),
    hasRevenue: /pkb|pendapatan|tertagih|realisasi|miliar|triliun|juta/.test(lower),
    hasTunggakan: /tunggakan|denda|telat|jatuh tempo|hari/.test(lower),
    hasRaci: /raci|jasa raharja|bapenda|polri|kelurahan/.test(lower),
    hasPhone: /nomor handphone|hp|whatsapp/.test(lower),
    hasMetric: /metrik|metric|formula|sertifikasi|bronze|silver|gold/.test(lower),
    hasTrend: /bulan|tren|trend|periode|2025|2026|historis/.test(lower),
  };
}

// ── Generator ──────────────────────────────────────────────────────────────

interface ScoredCandidate extends FollowUpQuestion {
  priority: number;
  // dedup key — questions sharing the same key are considered duplicates
  dedupKey: string;
}

export function generateFollowUpQuestions(
  responseText: string,
  _summary: ParsedSummary | null,
  _metrics: MetricDefinition[]
): FollowUpQuestion[] {
  if (!responseText || responseText.length < 50) return [];

  const topics = detectTopics(responseText);
  const candidates: ScoredCandidate[] = [];

  const primarySegment = topics.segments[0];
  const secondarySegment = topics.segments[1];
  const primaryKabupaten = topics.kabupatens[0];

  // ── 1. Drill into the primary segmen mentioned ─────────────────────────
  if (primarySegment) {
    candidates.push({
      id: `drill-segmen-kabupaten`,
      text: `Bagaimana sebaran segmen ${primarySegment} per kabupaten di Kalteng?`,
      category: 'drill-down',
      priority: 10,
      dedupKey: `drill-${primarySegment}`,
    });

    candidates.push({
      id: `treatment-segmen`,
      text: `Apa rekomendasi treatment dan kanal utama untuk segmen ${primarySegment}?`,
      category: 'action',
      priority: 9,
      dedupKey: `treatment-${primarySegment}`,
    });
  }

  // ── 2. Cross-segmen comparison ─────────────────────────────────────────
  if (primarySegment && secondarySegment) {
    candidates.push({
      id: `compare-segmen`,
      text: `Bandingkan profil tunggakan & cakupan handphone antara ${primarySegment} dan ${secondarySegment}.`,
      category: 'correlation',
      priority: 8,
      dedupKey: `compare-${primarySegment}-${secondarySegment}`,
    });
  }

  // ── 3. Amnesti follow-up ───────────────────────────────────────────────
  if (topics.hasAmnesti) {
    candidates.push({
      id: `amnesti-erosi`,
      text: 'Berapa risiko erosi kepatuhan ke segmen Patuh Aktif jika amnesti diberlakukan 90 hari?',
      category: 'correlation',
      priority: 9,
      dedupKey: 'amnesti-erosi',
    });
    candidates.push({
      id: `amnesti-revenue`,
      text: 'Estimasi tambahan pendapatan PKB dari skenario Konservatif vs Moderat vs Optimis untuk amnesti ini.',
      category: 'next-step',
      priority: 7,
      dedupKey: 'amnesti-revenue',
    });
  }

  // ── 4. Treatment / kanal deep-dive ─────────────────────────────────────
  if (topics.hasTreatment && !topics.hasKanal) {
    candidates.push({
      id: `treatment-kanal`,
      text: 'Saluran mana yang paling efektif: WhatsApp, surat fisik, atau koordinasi RT-RW/SAMSAT?',
      category: 'drill-down',
      priority: 7,
      dedupKey: 'treatment-kanal',
    });
  }

  if (topics.hasKanal && topics.hasPhone) {
    candidates.push({
      id: `kanal-coverage`,
      text: 'Berapa cakupan nomor handphone per segmen, dan segmen mana yang butuh saluran offline?',
      category: 'drill-down',
      priority: 6,
      dedupKey: 'kanal-coverage',
    });
  }

  // ── 5. Revenue / tunggakan deep-dive ───────────────────────────────────
  if (topics.hasRevenue) {
    candidates.push({
      id: `revenue-trend`,
      text: 'Tampilkan tren realisasi PKB & SWDKLLJ per bulan untuk 13 bulan terakhir.',
      category: 'trend',
      priority: 7,
      dedupKey: 'revenue-trend',
    });

    if (!primaryKabupaten) {
      candidates.push({
        id: `revenue-kabupaten`,
        text: 'Kabupaten mana yang menyumbang potensi PKB tertagih tertinggi?',
        category: 'drill-down',
        priority: 6,
        dedupKey: 'revenue-kabupaten',
      });
    }
  }

  if (topics.hasTunggakan && !topics.hasAmnesti) {
    candidates.push({
      id: `tunggakan-action`,
      text: 'Aksi prioritas 30 hari untuk menurunkan tunggakan PKB tanpa mengganggu segmen patuh.',
      category: 'action',
      priority: 7,
      dedupKey: 'tunggakan-action',
    });
  }

  // ── 6. RACI / stakeholder follow-up ────────────────────────────────────
  if (topics.hasRaci || topics.hasTreatment) {
    candidates.push({
      id: `raci-stakeholder`,
      text: 'Stakeholder mana (Jasa Raharja, Bapenda, Samsat, Polri, Kelurahan) yang Accountable untuk eksekusi ini?',
      category: 'next-step',
      priority: 5,
      dedupKey: 'raci-stakeholder',
    });
  }

  // ── 7. Kabupaten drill-down ────────────────────────────────────────────
  if (primaryKabupaten) {
    candidates.push({
      id: `kabupaten-segmen`,
      text: `Distribusi 7 segmen kepatuhan di ${primaryKabupaten} — mana yang paling kritis?`,
      category: 'drill-down',
      priority: 8,
      dedupKey: `kabupaten-segmen-${primaryKabupaten}`,
    });
  }

  if (topics.kabupatens.length === 0 && (primarySegment || topics.hasRevenue)) {
    candidates.push({
      id: `tipologi-wilayah`,
      text: 'Bagaimana perbedaan profil kepatuhan antara wilayah Pusat Urban, Hub Industri, dan Hinterland?',
      category: 'correlation',
      priority: 5,
      dedupKey: 'tipologi-wilayah',
    });
  }

  // ── 8. Metric / governance follow-up ───────────────────────────────────
  if (topics.hasMetric) {
    candidates.push({
      id: `metric-formula`,
      text: 'Tampilkan formula & sumber data persis untuk metrik yang baru saja disebut.',
      category: 'drill-down',
      priority: 6,
      dedupKey: 'metric-formula',
    });
  }

  // ── 9. Default fallback questions if response is generic ──────────────
  if (candidates.length === 0) {
    candidates.push(
      {
        id: 'overview-pyramid',
        text: 'Ringkas distribusi 7 segmen kepatuhan PKB di Palangka Raya.',
        category: 'next-step',
        priority: 5,
        dedupKey: 'overview-pyramid',
      },
      {
        id: 'overview-revenue',
        text: 'Berapa total potensi PKB tertagih dan gap vs target framework?',
        category: 'next-step',
        priority: 4,
        dedupKey: 'overview-revenue',
      },
      {
        id: 'overview-priority',
        text: 'Segmen mana yang harus diprioritaskan 30 hari ke depan dan kenapa?',
        category: 'action',
        priority: 4,
        dedupKey: 'overview-priority',
      },
    );
  }

  // ── Sort, dedupe, top 3 ────────────────────────────────────────────────
  candidates.sort((a, b) => b.priority - a.priority);

  const seenKeys = new Set<string>();
  const selected: FollowUpQuestion[] = [];

  for (const c of candidates) {
    if (seenKeys.has(c.dedupKey)) continue;
    seenKeys.add(c.dedupKey);
    selected.push({ id: c.id, text: c.text, category: c.category });
    if (selected.length >= 3) break;
  }

  return selected;
}

// ── Legacy exports (still used by AssistantMessage to feed AI service) ─────
// extractMentionedMetrics is kept for backward compatibility with the
// followUpService call signature. With PKB metrics largely empty in this
// pilot, it usually returns an empty array — that's fine, the edge function
// builds its prompt from response text + topic detection.

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractMentionedMetrics(
  responseText: string,
  metrics: MetricDefinition[]
): MetricDefinition[] {
  if (!responseText || metrics.length === 0) return [];
  const text = responseText.toLowerCase();
  const matched: MetricDefinition[] = [];
  const sorted = [...metrics].sort((a, b) => b.name.length - a.name.length);
  for (const metric of sorted) {
    const pattern = new RegExp('\\b' + escapeRegex(metric.name.toLowerCase()) + '\\b');
    if (pattern.test(text)) matched.push(metric);
  }
  return matched;
}

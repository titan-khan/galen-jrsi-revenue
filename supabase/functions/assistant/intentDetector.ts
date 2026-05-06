// =============================================================================
// INTENT DETECTOR — Maps user messages to DB query categories
// PKB compliance pilot: bahasa Indonesia + English keyword matching
// =============================================================================

export type IntentCategory =
  | 'compliance'
  | 'revenue'
  | 'treatment'
  | 'geography'
  | 'fleet'
  | 'metadata'
  | 'general';

export interface DetectedIntent {
  categories: IntentCategory[];
  confidence: number;
  mentionedEntities: string[];
}

interface IntentRule {
  keywords: string[];
  weight: number;
}

const INTENT_RULES: Record<IntentCategory, IntentRule> = {
  compliance: {
    keywords: [
      'kepatuhan', 'segmen', 'patuh', 'tunggakan', 'piramida', 'pyramid',
      'compliance', 'h1', 'k1', 'm1', 'm2', 's1', 's2', 'o1',
      'patuh aktif', 'baru lewat', 'mengabaikan', 'tidak patuh',
      'belum terdaftar', 'kendaraan hantu', 'kronis', 'pasif',
      'detractor', 'distribusi', 'profil',
    ],
    weight: 1.0,
  },
  revenue: {
    keywords: [
      'pendapatan', 'revenue', 'pkb', 'pajak', 'tertagih', 'realisasi',
      'arrears', 'idr', 'rupiah', 'target', 'gap', 'pokok', 'denda',
      'swdkllj', 'iuran', 'potensi', 'koleksi', 'tagih', 'tagihan',
      'transaksi', 'bayar', 'bayaran', 'collection',
    ],
    weight: 1.0,
  },
  treatment: {
    keywords: [
      'treatment', 'tindakan', 'aksi', 'amnesti', 'kebijakan', 'intervensi',
      'kanal', 'whatsapp', 'surat', 'rt-rw', 'samsat', 'raci', 'sadar',
      'program', 'gelombang', 'rekomendasi', 'strategi', 'eksekusi',
      'wave', 'prioritas',
    ],
    weight: 0.9,
  },
  geography: {
    keywords: [
      'kabupaten', 'kota', 'kalteng', 'palangka raya', 'kalimantan',
      'wilayah', 'tipologi', 'urban', 'hub', 'hinterland',
      'kecamatan', 'kelurahan', 'upt', 'cabang', 'lokasi', 'daerah',
    ],
    weight: 0.9,
  },
  fleet: {
    keywords: [
      'kendaraan', 'motor', 'mobil', 'jenken', 'jenis', 'merek', 'merk',
      'bahan bakar', 'tahun', 'usia', 'cc', 'tipe', 'roda', 'truk',
      'sepeda motor',
    ],
    weight: 0.8,
  },
  metadata: {
    keywords: [
      'definisi', 'definition', 'formula', 'metric', 'metrik', 'sertifikasi',
      'bronze', 'silver', 'gold', 'governance', 'apa itu', 'arti',
      'data dictionary', 'lineage', 'confidence', 'sumber', 'source',
      'kolom', 'tabel', 'schema',
    ],
    weight: 0.6,
  },
  general: {
    keywords: [
      'ringkas', 'summary', 'overview', 'briefing', 'status', 'dashboard',
      'update', 'kondisi', 'gambaran', 'rangkum', 'sekarang', 'today',
      'minggu ini', 'bulan ini',
    ],
    weight: 0.5,
  },
};

const SCORE_THRESHOLD = 0.08;
const MAX_CATEGORIES = 3;

/**
 * Detect which DB query categories are relevant for a user message.
 */
export function detectIntent(message: string): DetectedIntent {
  const lower = message.toLowerCase();
  const tokens = lower.split(/\s+/);

  const scores: { category: IntentCategory; score: number }[] = [];

  for (const [category, rule] of Object.entries(INTENT_RULES) as [IntentCategory, IntentRule][]) {
    let matches = 0;

    for (const keyword of rule.keywords) {
      const kw = keyword.toLowerCase();
      if (kw.includes(' ') || kw.includes('-')) {
        if (lower.includes(kw)) matches++;
      } else {
        if (tokens.includes(kw)) matches++;
      }
    }

    if (matches > 0) {
      const score = (matches / rule.keywords.length) * rule.weight;
      scores.push({ category, score });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  let categories = scores
    .filter((s) => s.score >= SCORE_THRESHOLD)
    .slice(0, MAX_CATEGORIES)
    .map((s) => s.category);

  if (categories.length === 0) {
    categories = ['general'];
  }

  const topScore = scores.length > 0 ? scores[0].score : 0;
  const mentionedEntities = extractMentions(message);

  return {
    categories,
    confidence: Math.min(topScore, 1.0),
    mentionedEntities,
  };
}

/**
 * Extract @mention references from message text.
 * Greedy regex; allows multi-word names ending at double-space, newline, or punctuation.
 */
function extractMentions(content: string): string[] {
  const mentionRegex = /@([\w]+(?:\s[\w]+)*)(?=\s{2,}|$|@|\.|,|!|\?|\n)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1].trim().toLowerCase());
  }

  return mentions;
}

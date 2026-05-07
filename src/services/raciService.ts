// =============================================================================
// RACI Service — PKB inter-agency assignment matrix
// =============================================================================
//
// Data source: static frontend dataset (src/data/raciMatrixData.ts) snapshot
// of ref.raci_matrix on Supabase. The `ref` schema is not exposed to anon
// role on Supabase, so live fetch returns 401. RACI data is reference
// (47 rows × 7 segments × 6 agencies) and rarely changes.
//
// To switch back to live fetch later: GRANT SELECT ON ref.raci_matrix TO anon;
// + replace getAllRACIRows() body with the previous Supabase query.
//
// Segmen reference:
//   H1 — Patuh Aktif
//   K1 — Baru Lewat Jatuh Tempo
//   O1 — Mulai Mengabaikan
//   M1 — Tidak Patuh Pasif
//   M2 — Tidak Patuh Kronis
//   S1 — Belum Terdaftar
//   S2 — Kendaraan Hantu

// ─── Types ───────────────────────────────────────────────────────────

export type RACIRole = 'R' | 'A' | 'C' | 'I';

/** Ordered list of stakeholder columns. */
export const RACI_AGENCIES = [
  'jasa_raharja',
  'bapenda',
  'samsat',
  'polri',
  'kelurahan',
  'vendor_ti',
] as const;
export type RACIAgency = (typeof RACI_AGENCIES)[number];

export const AGENCY_LABEL: Record<RACIAgency, string> = {
  jasa_raharja: 'Jasa Raharja',
  bapenda: 'Bapenda',
  samsat: 'Samsat',
  polri: 'Polri',
  kelurahan: 'Kelurahan',
  vendor_ti: 'Vendor TI',
};

export const AGENCY_SHORT: Record<RACIAgency, string> = {
  jasa_raharja: 'JR',
  bapenda: 'Bapenda',
  samsat: 'Samsat',
  polri: 'Polri',
  kelurahan: 'Kel.',
  vendor_ti: 'Vendor TI',
};

export const RACI_ROLE_LABEL: Record<RACIRole, string> = {
  R: 'Responsible',
  A: 'Accountable',
  C: 'Consulted',
  I: 'Informed',
};

export interface RACIRow {
  id: number;
  segmenKode: string;
  aksiKunci: string;
  assignments: Partial<Record<RACIAgency, RACIRole>>;
}

export interface SegmenInfo {
  kode: string;
  nama: string;
  warna: string;
  durasiTunggakan: string;
}

// ─── Data accessors ──────────────────────────────────────────────────

import { PKB_RACI_MATRIX, PKB_SEGMEN_INFO } from '@/data/raciMatrixData';

export function getAllRACIRows(): RACIRow[] {
  return PKB_RACI_MATRIX;
}

export function getRACIForSegment(segmenKode: string): RACIRow[] {
  return PKB_RACI_MATRIX.filter((r) => r.segmenKode === segmenKode);
}

export function getSegmenInfo(): SegmenInfo[] {
  return PKB_SEGMEN_INFO;
}

export function getSegmenByKode(kode: string): SegmenInfo | undefined {
  return PKB_SEGMEN_INFO.find((s) => s.kode === kode);
}

// ─── Inference: text → segmenKode ────────────────────────────────────

/**
 * Heuristic: extract the most relevant segment code from free-form text
 * (specialist name, description, or recommendation title).
 * Returns null when no clear match.
 */
export function inferSegmenFromText(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Order matters: more specific phrases first.
  const map: Array<[string, string]> = [
    ['kendaraan hantu', 'S2'],
    ['belum terdaftar', 'S1'],
    ['tidak patuh kronis', 'M2'],
    ['kronis', 'M2'],
    ['tidak patuh pasif', 'M1'],
    ['mulai mengabaikan', 'O1'],
    ['baru lewat jatuh tempo', 'K1'],
    ['baru lewat tempo', 'K1'],
    ['baru telat', 'K1'],
    ['patuh aktif', 'H1'],
    ['patuh & hampir telat', 'H1'],
  ];

  for (const [needle, kode] of map) {
    if (lower.includes(needle)) return kode;
  }

  // Generic "menunggak" / "tunggak" → default to M2 (most impactful chronic segment)
  if (lower.includes('menunggak') || lower.includes('tunggakan')) return 'M2';

  return null;
}

// ─── Best-match: title → RACIRow ─────────────────────────────────────

/**
 * Find a RACI row whose `aksi_kunci` best matches a free-form action title.
 * Uses keyword overlap scoring within the same segmen (when provided).
 * Returns null when no row scores above threshold.
 */
export function bestMatchRACIRow(
  title: string,
  rows: RACIRow[] = PKB_RACI_MATRIX,
  segmenKode?: string,
): RACIRow | null {
  if (!title || rows.length === 0) return null;
  const candidates = segmenKode ? rows.filter((r) => r.segmenKode === segmenKode) : rows;
  if (candidates.length === 0) return null;

  const titleTokens = tokenize(title);
  if (titleTokens.size === 0) return null;

  let best: { row: RACIRow; score: number } | null = null;
  for (const row of candidates) {
    const aksiTokens = tokenize(row.aksiKunci);
    if (aksiTokens.size === 0) continue;
    let overlap = 0;
    for (const tok of titleTokens) {
      if (aksiTokens.has(tok)) overlap++;
    }
    const score = overlap / Math.min(titleTokens.size, aksiTokens.size);
    if (score > 0.25 && (!best || score > best.score)) {
      best = { row, score };
    }
  }
  return best?.row ?? null;
}

const STOPWORDS = new Set([
  'untuk', 'dan', 'di', 'ke', 'dari', 'pada', 'yang', 'atau', 'dengan',
  'akan', 'dalam', 'oleh', 'tidak', 'ada', 'adalah', 'agar', 'antar',
  'antara', 'jika', 'maka', 'per', 'serta', 'tanpa', 'the',
  'a', 'an', 'of', 'to', 'for', 'in', 'with',
]);

function tokenize(s: string): Set<string> {
  const tokens = s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
  return new Set(tokens);
}

// ─── Aggregation helpers ─────────────────────────────────────────────

/**
 * Summarize a row into "{R: X · A: Y · C: ...}" form for compact display.
 * Returns role-grouped agency names.
 */
export function summarizeRACIRow(row: RACIRow): Record<RACIRole, string[]> {
  const summary: Record<RACIRole, string[]> = { R: [], A: [], C: [], I: [] };
  for (const agency of RACI_AGENCIES) {
    const role = row.assignments[agency];
    if (role) summary[role].push(AGENCY_SHORT[agency]);
  }
  return summary;
}

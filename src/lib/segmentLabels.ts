// =============================================================================
// PKB Segment Labels — single source of truth for user-facing nomenclature
// =============================================================================
// Codes (H1, K1, O1, M1, M2, S1, S2) are framework Piramida Kepatuhan Pajak internal identifiers.
// Eksekutif tidak peduli kode — mereka peduli "siapa yang patuh dan siapa yang
// tidak". Helper ini ekspos nama natural untuk semua tampilan UI.
//
// Convention:
// - `name`     → short label untuk card/chart (2-3 kata, executive-friendly)
// - `nameLong` → full framework Piramida Kepatuhan Pajak name untuk tooltip/drawer
// - `code`     → tetap simpan untuk audit trail / SQL queries
// - `formal()` → "Tidak Patuh Kronis (M2)" — first-mention dalam dokumen
// - `casual()` → "Tidak Patuh Kronis" — second-mention dan seterusnya
// =============================================================================

export type SegmentCode = "H1" | "K1" | "O1" | "M1" | "M2" | "S1" | "S2";

interface SegmentMeta {
  code: SegmentCode;
  /** Short executive label (2-3 words). */
  name: string;
  /** Full framework Piramida Kepatuhan Pajak nomenclature. */
  nameLong: string;
  /** One-line behavioral description. */
  description: string;
  /** Default treatment direction. */
  treatment: string;
}

export const SEGMENTS: Record<SegmentCode, SegmentMeta> = {
  H1: {
    code: "H1",
    name: "Patuh Aktif",
    nameLong: "Patuh Aktif (H1)",
    description: "Bayar tepat waktu, tidak ada tunggakan",
    treatment: "Apresiasi & retensi",
  },
  K1: {
    code: "K1",
    name: "Baru Lewat Tempo",
    nameLong: "Baru Lewat Jatuh Tempo (K1)",
    description: "Telat 1-90 hari — peluang sukses tagih tertinggi (60%)",
    treatment: "Pengingat via WhatsApp / SMS",
  },
  O1: {
    code: "O1",
    name: "Mulai Mengabaikan",
    nameLong: "Mulai Mengabaikan (O1)",
    description: "Telat 91-365 hari — peluang sukses tagih 35%",
    treatment: "Pengingat + insentif diskon denda",
  },
  M1: {
    code: "M1",
    name: "Tidak Patuh Pasif",
    nameLong: "Tidak Patuh Pasif (M1)",
    description: "Telat 1-2 tahun — peluang sukses tagih 25%",
    treatment: "Amnesti sebagian 50-75% denda",
  },
  M2: {
    code: "M2",
    name: "Tidak Patuh Kronis",
    nameLong: "Tidak Patuh Kronis (M2)",
    description: "Telat 2-5 tahun — peluang sukses tagih 15%, beban historis terbesar",
    treatment: "Amnesti penuh denda + razia",
  },
  S1: {
    code: "S1",
    name: "Belum Terdaftar",
    nameLong: "Belum Terdaftar (S1)",
    description: "Kendaraan di bawah 15 tahun belum terdaftar — bukan masalah penagihan",
    treatment: "Program registrasi",
  },
  S2: {
    code: "S2",
    name: "Kendaraan Hantu",
    nameLong: "Kendaraan Hantu (S2)",
    description: "Kendaraan tua/lama tidak teridentifikasi — kandidat penghapusan registrasi",
    treatment: "Pembersihan registrasi",
  },
};

/** "Tidak Patuh Kronis (M2)" — formal first-mention */
export function formalLabel(code: SegmentCode): string {
  return SEGMENTS[code].nameLong;
}

/** "Tidak Patuh Kronis" — short label without code */
export function naturalLabel(code: SegmentCode): string {
  return SEGMENTS[code].name;
}

/** "Patuh Aktif & Baru Lewat Tempo" — combine multiple segments */
export function combinedLabel(codes: SegmentCode[]): string {
  if (codes.length === 0) return "";
  if (codes.length === 1) return naturalLabel(codes[0]);
  if (codes.length === 2) return `${naturalLabel(codes[0])} & ${naturalLabel(codes[1])}`;
  return codes.map(naturalLabel).slice(0, -1).join(", ") + ", & " + naturalLabel(codes[codes.length - 1]);
}

/**
 * Pre-formatted segment summary for LLM prompts so the model uses natural
 * names instead of bare codes in user-facing text.
 */
export function buildSegmentReferenceForPrompt(): string {
  return Object.values(SEGMENTS)
    .map(
      (s) =>
        `- ${s.code} = "${s.name}" (${s.nameLong}). ${s.description}. Treatment: ${s.treatment}.`
    )
    .join("\n");
}

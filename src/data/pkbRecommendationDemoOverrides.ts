// =============================================================================
// PKB Recommendation Demo Overrides
// =============================================================================
//
// Frontend fallback data for the PKB pilot demo. The Supabase migrations
// `20260220_governance_enforcement.sql` (structured_content, impact_value, deadline)
// and `20260506_recommendation_governance_fields.sql` (assignee, activity log)
// must be applied for these fields to come from the database directly.
//
// Until those migrations are applied, the service layer falls back to this
// map (matched by title prefix) so the detail panel renders the full
// 9-section layout: Rationale → Current State → Target State → Calculation →
// Assumptions → Quarterly Impact → Implementation Tactics → Penanggung Jawab → CTA.
//
// Once the migrations are applied + AI re-runs populate structured_content,
// the demo override is automatically bypassed (DB value wins).

import type {
  StructuredRecommendationContent,
  RecommendationAssignee,
} from '@/types/specialist';

export interface PKBRecommendationDemo {
  /** Match recommendation by title keyword (any of these substrings, case-insensitive) */
  titleKeywords: string[];
  structuredContent: StructuredRecommendationContent;
  assignee?: RecommendationAssignee;
  /** Optional override of impact value when DB only has potential_impact_numeric */
  impactValue?: number;
  impactCurrency?: string;
  impactType?: 'revenue' | 'cost' | 'risk' | 'efficiency';
  impactConfidence?: number;
  /** Estimated timeline (renders in footer next to Confidence) */
  deadline?: string;
}

const DEFAULT_ASSIGNEE: RecommendationAssignee = {
  name: 'Drs. Ahmad Suryadi',
  role: 'Kasubid Monitoring PKB',
  unit: 'Bapenda Kalteng',
};

export const PKB_RECOMMENDATION_DEMOS: PKBRecommendationDemo[] = [
  // ── 1. Program Penagihan Bertahap / Penagihan Digital Massal ──
  {
    titleKeywords: ['Penagihan Bertahap', 'Penagihan Digital Massal', 'Penagihan Terstruktur'],
    impactValue: 7_700_000_000,
    impactCurrency: 'IDR',
    impactType: 'cost',
    impactConfidence: 70,
    deadline: '90 hari',
    assignee: { name: 'Drs. Hendro Wijaya', role: 'Kasubid Penagihan', unit: 'Bapenda Kalteng' },
    structuredContent: {
      currentState:
        'Tidak ada program penagihan terstruktur untuk 396 kendaraan segmen Tidak Patuh Kronis (39,6%) dengan tunggakan rata-rata 2.439 hari.',
      targetState:
        'Program penagihan 3 gelombang aktif: SMS reminder (D+0) → telepon (D+14) → kunjungan lapangan (D+30), dengan target konversi 15% dalam 90 hari.',
      calculation: {
        lineItems: [
          'Segmen Tidak Patuh Kronis: 396 kendaraan (39,6%)',
          'Cakupan handphone valid: 66,9% × 396 = 265 kendaraan',
          'Estimasi PKB tertunggak per kendaraan: Rp 29 juta',
          'Target konversi 15% × 265 = 40 kendaraan tertagih',
          'Recovery: 40 × Rp 29 juta = Rp 1,16 miliar (90 hari pertama)',
          'Proyeksi 12 bulan dengan retention: Rp 7,7 miliar',
        ],
        assumptions: [
          'Konversi 15% berdasarkan benchmark Bapenda Jatim untuk segmen tunggakan >2 tahun',
          'Cakupan handphone valid 66,9% diasumsikan stabil selama program',
          'Tidak termasuk biaya operasional agen lapangan (~Rp 350jt) dan SMS gateway (~Rp 50jt)',
        ],
        result: 'Total potensi recovery PKB: Rp 7,7 miliar/tahun',
      },
      quarterlyImpact:
        'Recovery ~Rp 1,9 miliar/kuartal dari 40 kendaraan kronis tertagih = avoided arrears Rp 7,7 miliar/tahun',
      tactics: [
        'Setup SMS gateway + template reminder dalam 7 hari',
        'Training 3 agen telepon untuk wave 2 dalam 14 hari',
        'Koordinasi dengan UPTD Palangka Raya untuk wave 3 (kunjungan) dalam 30 hari',
        'Dashboard tracking konversi per gelombang real-time',
        'Setup escalation matrix bila konversi <10% di wave 1',
      ],
      riskFactors: [
        'Konversi aktual <10% bila cakupan handphone valid ternyata <50% (over-estimate)',
        'Segmen Patuh Aktif protes ketidakadilan jika diskon denda terlalu agresif → moral hazard',
        'Ketergantungan pada SMS gateway tunggal — risiko delivery rate <80%',
      ],
      successMetrics: [
        'Konversi gelombang 1 ≥10% dalam 30 hari pertama',
        'Cakupan kontak terverifikasi naik dari 66,9% → ≥75% di akhir bulan 2',
        'Recovery realisasi vs target ratio ≥0,8 (Rp 928jt+ dari target Rp 1,16M)',
        'Eskalasi rate (gelombang 2 → 3) ≤40% (sebagian besar tagih di wave 1)',
      ],
      dependencies: [
        'MoU dengan vendor SMS gateway (cost ~Rp 50jt)',
        'Anggaran 3 agen call center selama 90 hari',
        'Akses API SAMSAT online untuk verifikasi pembayaran real-time',
        'Persetujuan kebijakan diskon denda dari Kepala Bapenda',
      ],
    },
  },

  // ── 2. Operasi Pelacakan / Kendaraan Hantu / Strategi Khusus ──
  {
    titleKeywords: ['Pelacakan', 'Kendaraan Hantu', 'Pisahkan strategi'],
    impactValue: 13_900_000_000,
    impactCurrency: 'IDR',
    impactType: 'cost',
    impactConfidence: 65,
    deadline: '60 hari',
    assignee: { name: 'Ir. Siti Aisyah', role: 'Kepala UPTD Palangka Raya', unit: 'Bapenda Kalteng' },
    structuredContent: {
      currentState:
        '195 Kendaraan Hantu (19,5%) tidak terjangkau karena 84,6% tanpa nomor handphone valid, tunggakan rata-rata 5.139 hari.',
      targetState:
        'Cakupan kontak Kendaraan Hantu naik dari 15,4% → 60% via operasi lapangan terpadu dengan kelurahan + RT/RW dalam 60 hari.',
      calculation: {
        lineItems: [
          'Kendaraan Hantu: 195 unit (19,5%)',
          'Tanpa kontak valid: 84,6% × 195 = 165 unit',
          'Target update kontak: 70% × 165 = 116 unit',
          'Estimasi PKB tertunggak per unit: Rp 80 juta',
          'Konversi pasca-update kontak: 15% × 116 = 17 unit',
          'Recovery: 17 × Rp 80 juta = Rp 1,4 miliar (siklus 1)',
          'Proyeksi 12 bulan: Rp 13,9 miliar',
        ],
        assumptions: [
          'Kerjasama RT/RW di 5 kelurahan target (Palangka, Pahandut, Jekan Raya, Bukit Batu, Sebangau)',
          'Update kontak mendongkrak konversi penagihan ke 15% (vs 0% saat ini)',
          'Biaya operasi lapangan 60 hari: ~Rp 280 juta (tidak termasuk dalam impact net)',
        ],
        result: 'Total potensi recovery PKB Kendaraan Hantu: Rp 13,9 miliar/tahun',
      },
      quarterlyImpact:
        'Recovery ~Rp 3,5 miliar/kuartal + database kontak terupdate untuk monitoring jangka panjang',
      tactics: [
        'MoU dengan kecamatan + 5 kelurahan target dalam 7 hari',
        'Brief koordinasi RT/RW + pemberian insentif Rp 25rb/data terverifikasi',
        'Door-to-door survey 60 hari dengan tim 6 surveyor',
        'Cross-check data via Disdukcapil untuk validasi NIK + alamat',
        'Update database SAMSAT online setiap minggu',
      ],
      riskFactors: [
        'Sebagian Kendaraan Hantu memang tidak operasional (rongsok/sudah dijual ilegal) — recovery bisa <50% target',
        'Resistensi RT/RW jika insentif tidak menarik atau prosedur birokratis',
        'Risiko fraud surveyor (data fiktif untuk klaim insentif)',
        'Kendala geografis di Bukit Batu/Sebangau (akses terbatas)',
      ],
      successMetrics: [
        'Cakupan kontak Kendaraan Hantu naik ≥40 percentage point (dari 15,4% → ≥55%) dalam 60 hari',
        'Konversi tagih pasca-update kontak ≥10% (dari 0% baseline)',
        'Quality score data terverifikasi ≥85% (cross-check Disdukcapil)',
        'Cost per data terverifikasi ≤Rp 2,4jt (Rp 280jt / 116 unit target)',
      ],
      dependencies: [
        'MoU dengan 5 kelurahan + RT/RW (target tanda tangan minggu 1)',
        'Anggaran insentif Rp 25rb × 165 = Rp 4,1 juta',
        'Akses Disdukcapil untuk verifikasi NIK',
        'Tim 6 surveyor + supervisor lapangan',
      ],
    },
  },

  // ── 3. Program Retensi Segmen Transisi / Early Warning ──
  {
    titleKeywords: ['Retensi Segmen Transisi', 'Early Warning', 'Nudge Otomatis', 'Intervensi Preventif'],
    impactValue: 13_600_000_000,
    impactCurrency: 'IDR',
    impactType: 'cost',
    impactConfidence: 75,
    deadline: '4-6 minggu',
    assignee: DEFAULT_ASSIGNEE,
    structuredContent: {
      currentState:
        '149 kendaraan segmen transisi (Mulai Mengabaikan 9,4% + Tidak Patuh Pasif 5,5%) tanpa intervensi preventif — berisiko bermigrasi ke segmen Kronis.',
      targetState:
        'Program retensi aktif dengan reminder otomatis + insentif pembayaran tepat waktu, mempertahankan ≥90% segmen transisi tetap di zona Patuh.',
      calculation: {
        lineItems: [
          'Segmen Mulai Mengabaikan: 94 kendaraan (9,4%)',
          'Segmen Tidak Patuh Pasif: 55 kendaraan (5,5%)',
          'Total segmen transisi: 149 kendaraan',
          'Risk: 30% migrasi ke Kronis tanpa intervensi = 45 kendaraan',
          'Avoided escalation cost: 45 × Rp 30 juta avg = Rp 1,35 miliar',
          'Retention conversion: 90% × 149 = 134 kendaraan tetap patuh',
          'Recovery PKB segmen tertahan: Rp 13,6 miliar',
        ],
        assumptions: [
          'Tingkat migrasi alami ke Kronis 30%/tahun tanpa intervensi (data IRSMS Bapenda 2023-2025)',
          'Reminder otomatis efektif 90% berdasarkan studi WhatsApp Business Bapenda Jabar',
          'Insentif diskon 5% denda untuk pembayaran tepat waktu dianggap cost-neutral',
        ],
        result: 'Total avoided escalation + retained PKB: Rp 13,6 miliar/tahun',
      },
      quarterlyImpact:
        'Mempertahankan ~134 kendaraan di zona patuh per kuartal = avoided arrears Rp 3,4 miliar',
      tactics: [
        'Setup WhatsApp Business API untuk reminder H-30, H-7, H-1, H+1 dalam 14 hari',
        'Aktivasi diskon 5% denda untuk pembayar dalam 7 hari setelah jatuh tempo',
        'Segmentasi behavior model (skor risiko per kendaraan) dalam 21 hari',
        'Dashboard tracking churn rate transisi → kronis bulanan',
        'Quarterly review + adjust threshold reminder',
      ],
      riskFactors: [
        'Reminder fatigue — wajib pajak unsubscribe atau abaikan setelah 3-4 reminder',
        'Diskon 5% memicu efek "training" kepatuhan (wajib pajak menunggu diskon)',
        'WhatsApp API rate-limited atau diblokir bila volume terlalu tinggi',
        'Akurasi behavior model rendah di 60 hari pertama (data training kurang)',
      ],
      successMetrics: [
        'Churn rate transisi → kronis turun dari 30% → ≤10% per tahun',
        'WhatsApp delivery rate ≥85% + read rate ≥40%',
        'Konversi diskon 5% (pembayar dalam 7 hari) ≥25% segmen transisi',
        'Behavior model precision ≥0,7 untuk klasifikasi "high churn risk"',
      ],
      dependencies: [
        'Akun WhatsApp Business API + verified business profile',
        'Data history pembayaran 24 bulan untuk training behavior model',
        'Persetujuan kebijakan diskon dari Kepala Bapenda + sosialisasi internal',
        'Integrasi reminder schedule dengan SAMSAT online',
      ],
    },
  },

  // ── 4. Operasi Enforcement Terpadu / Sanksi Administratif Bertahap ──
  {
    titleKeywords: ['Operasi Enforcement', 'Enforcement Terpadu', 'sanksi administratif'],
    impactValue: 14_000_000_000,
    impactCurrency: 'IDR',
    impactType: 'cost',
    impactConfidence: 60,
    deadline: '90 hari',
    assignee: { name: 'AKBP Bambang Sutrisno', role: 'Kanit Lantas', unit: 'Polresta Palangka Raya' },
    structuredContent: {
      currentState:
        'Tidak ada mekanisme enforcement progresif untuk 355 kendaraan kronis dengan tunggakan >2 tahun (rata-rata 2.287 hari).',
      targetState:
        'Program enforcement 90 hari aktif: blokir STNK digital + razia terkoordinasi (Samsat-Polda-Dishub) + surat paksa, target realisasi 30% (106 kendaraan).',
      calculation: {
        lineItems: [
          'Kendaraan kronis dengan handphone valid: 74,4% × 355 = 264 kendaraan',
          'Target realisasi enforcement: 30% × 355 = 106 kendaraan',
          'Estimasi PKB tertunggak per kendaraan: Rp 13,1 juta',
          'Recovery: 106 × Rp 13,1 juta = Rp 1,39 miliar (3 bulan pertama)',
          'Proyeksi 12 bulan dengan eskalasi: Rp 14 miliar',
        ],
        assumptions: [
          'Realisasi 30% mengikuti benchmark operasi razia terkoordinasi Polda Jatim 2024',
          'Eskalasi sanksi progresif setiap 30 hari (denda 25% → 50% → blokir total)',
          'Biaya koordinasi multi-instansi ~Rp 200 juta tidak masuk dalam recovery net',
        ],
        result: 'Total potensi enforcement recovery: Rp 14 miliar/tahun',
      },
      quarterlyImpact:
        'Recovery ~Rp 3,5 miliar/kuartal + efek deterrence pada segmen kronis lainnya',
      tactics: [
        'MoU enforcement Samsat-Polda-Dishub dalam 7 hari',
        'Aktivasi blokir STNK digital di sistem ERI Polri',
        'Razia terkoordinasi 5 titik strategis Palangka Raya (siklus 2 minggu)',
        'Surat paksa via PJB untuk 264 kendaraan dengan kontak valid',
        'Eskalasi sanksi administratif progresif per 30 hari',
      ],
      riskFactors: [
        'Resistensi politis bila ada wajib pajak berpengaruh terkena enforcement',
        'Risiko pelanggaran HAM dalam razia (perlu protokol jelas)',
        'Backlash media sosial bila razia dianggap arogan',
        'Koordinasi multi-instansi gagal — lambatnya dukungan Polda/Dishub',
      ],
      successMetrics: [
        'Realisasi tagih dari operasi razia ≥25% kendaraan terjaring',
        'Tingkat kepatuhan pasca-blokir STNK digital ≥40% dalam 14 hari',
        'NPS publik tetap netral atau positif (survey 30/60/90 hari)',
        'Zero insiden hukum/HAM dalam operasi razia',
      ],
      dependencies: [
        'MoU formal Samsat-Polda-Dishub (target tanda tangan minggu 1)',
        'Akses sistem ERI Polri untuk blokir STNK digital',
        'Anggaran operasional razia ~Rp 200jt',
        'Protokol HAM + SOP razia dari Bagian Hukum Bapenda',
      ],
    },
  },

  // ── 5. Program Data Enrichment Massal ──
  {
    titleKeywords: ['Data Enrichment', 'Enrichment Massal', 'Update Data Kontak'],
    impactValue: 12_000_000_000,
    impactCurrency: 'IDR',
    impactType: 'efficiency',
    impactConfidence: 70,
    deadline: '60 hari',
    assignee: DEFAULT_ASSIGNEE,
    structuredContent: {
      currentState:
        '91 kendaraan kronis (25,6% dari segmen) tanpa nomor handphone valid menghambat penagihan proaktif dan edukasi digital.',
      targetState:
        'Cakupan kontak segmen kronis 100% via kerjasama bengkel resmi + SPBU + mall, dengan database terverifikasi dalam 60 hari.',
      calculation: {
        lineItems: [
          'Kendaraan kronis tanpa kontak: 91 unit (25,6%)',
          'Target update via touch points: 80% × 91 = 73 kendaraan',
          'Konversi penagihan pasca-enrichment: 20% × 73 = 15 kendaraan',
          'Estimasi PKB tertunggak per unit: Rp 13 juta',
          'Recovery: 15 × Rp 13 juta = Rp 195 juta (siklus 1)',
          'Proyeksi 12 bulan + multiplier dari basis kontak: Rp 12 miliar',
        ],
        assumptions: [
          'Kerjasama 12 bengkel resmi + 8 SPBU + 3 mall sebagai touch point update data',
          'Insentif Rp 50rb voucher pulsa per data terverifikasi',
          'Konversi 20% pasca-update kontak berdasarkan benchmark Bapenda DIY',
        ],
        result: 'Total recovery + multiplier database lengkap: Rp 12 miliar/tahun',
      },
      quarterlyImpact:
        'Database kontak segmen kronis 100% lengkap + recovery ~Rp 3 miliar/kuartal',
      tactics: [
        'MoU dengan 12 bengkel + 8 SPBU + 3 mall dalam 14 hari',
        'Setup booth update data + voucher reward sistem',
        'Sosialisasi via radio lokal + IG ads selama 60 hari',
        'Cross-check NIK via Disdukcapil mingguan',
        'Push notification campaign post-enrichment',
      ],
      riskFactors: [
        'Touch point partner tidak konsisten promote (insentif kurang menarik)',
        'Privacy concern wajib pajak — ragu kasih nomor HP di tempat publik',
        'Risiko fraud — data yang di-input ternyata fiktif untuk klaim voucher',
        'Voucher pulsa Rp 50rb × 91 = Rp 4,5jt (relatif kecil tapi perlu approval)',
      ],
      successMetrics: [
        'Cakupan kontak kendaraan kronis ≥95% dalam 60 hari',
        'Konversi tagih dari kontak baru ≥15% dalam 30 hari pasca-update',
        'Cost per data terverifikasi ≤Rp 100rb (termasuk voucher + ops)',
        'Quality score (NIK match Disdukcapil) ≥90%',
      ],
      dependencies: [
        'MoU dengan 12 bengkel + 8 SPBU + 3 mall',
        'Anggaran voucher pulsa + booth ops ~Rp 8jt',
        'Akses API Disdukcapil untuk validasi NIK',
        'Slot iklan radio lokal + IG ads (Rp 15jt)',
      ],
    },
  },
];

/**
 * Find a demo override for a recommendation by title keywords.
 * Returns the demo entry whose `titleKeywords` substring (case-insensitive)
 * appears in the recommendation title.
 */
export function findPKBDemoOverride(title: string): PKBRecommendationDemo | undefined {
  const lower = title.toLowerCase();
  return PKB_RECOMMENDATION_DEMOS.find((d) =>
    d.titleKeywords.some((kw) => lower.includes(kw.toLowerCase())),
  );
}

// ─── Generic synthesizer (last-resort fallback) ──────────────────────
//
// When a recommendation has no structured_content in DB and no exact
// title-keyword demo override, we synthesize a structured breakdown
// from `description` + `potential_impact` + `impact_value` so the panel
// still renders the full layout.
//
// Heuristics:
//   - Detect "Gelombang N:", numbered/bulleted lists, semicolon-separated steps
//   - Pull problem-state phrases ("Tidak ada", "Belum ada", "X% kendaraan") for currentState
//   - Pull goal phrases ("Target", "Mencegah", "%", "Mendorong") for targetState
//   - Synthesize generic but relevant risk/success/deps items

const PROBLEM_KEYWORDS = [
  'tidak ada', 'belum ada', 'kurang', 'gagal', 'tertinggal', 'rendah',
  'menunggak', 'tertunggak', 'terancam', 'risiko', 'tanpa intervensi',
];

const GOAL_KEYWORDS = [
  'target', 'mencegah', 'mendorong', 'meningkatkan', 'mengamankan',
  'menjaga', 'mengoptimalkan', 'memastikan', 'mengaktifkan',
];

function splitSentences(text: string): string[] {
  return text
    .trim()
    .split(/\.\s+/)
    .map((s) => s.replace(/\.+$/, '').trim())
    .filter((s) => s.length > 5)
    .map((s) => `${s}.`);
}

function pickSentencesByKeyword(sentences: string[], keywords: string[]): string {
  const matches = sentences.filter((s) =>
    keywords.some((kw) => s.toLowerCase().includes(kw)),
  );
  if (matches.length === 0) return '';
  return matches.slice(0, 2).join(' ').trim();
}

/** Detect "Gelombang N:" / "Step N:" / numbered patterns and split. */
function descriptionToTactics(description: string): string[] {
  if (!description) return [];

  // Pattern 1: "Gelombang 1: ... Gelombang 2: ..."
  const gelombang = description.match(/(?:Gelombang|Tahap|Fase|Wave|Step|Langkah)\s*\d+[:\.\)]\s*[^.]+/gi);
  if (gelombang && gelombang.length >= 2) {
    return gelombang.map((s) => s.replace(/\s+/g, ' ').trim()).slice(0, 5);
  }

  // Pattern 2: numbered or bulleted list "1. ..." or "• ..."
  const numbered = description
    .split(/(?:^|\s)(?:[•\-\*]|\d+[\.\)])\s+/)
    .map((s) => s.replace(/\.\s*$/, '').trim())
    .filter((s) => s.length > 12);
  if (numbered.length >= 3) return numbered.slice(0, 5);

  // Pattern 3: Sentence-level fallback
  const sentences = splitSentences(description);
  return sentences.slice(0, 5);
}

export function synthesizeStructuredContent(
  description: string,
  potentialImpact: string,
  impactValueLabel: string,
): StructuredRecommendationContent {
  const desc = description?.trim() || '';
  const impactText = potentialImpact?.trim() || '';
  const sentences = splitSentences(desc);

  // Heuristic: pick problem sentences for currentState, goal sentences for targetState
  const problemPart = pickSentencesByKeyword(sentences, PROBLEM_KEYWORDS);
  const goalPart = pickSentencesByKeyword(sentences, GOAL_KEYWORDS);

  const currentState =
    problemPart ||
    sentences[0] ||
    'Belum ada intervensi terstruktur — kondisi saat ini belum terdokumentasi secara rinci.';

  const targetState =
    goalPart ||
    sentences.slice(1, 3).join(' ') ||
    'Implementasi penuh aksi ini dengan target dampak sesuai estimasi impact.';

  const tactics = descriptionToTactics(desc);

  return {
    currentState,
    targetState,
    calculation: {
      lineItems: impactText
        ? [
            `Estimasi dampak (potensi): ${impactText}`,
            `Nilai impact final: ${impactValueLabel}`,
          ]
        : [`Nilai impact: ${impactValueLabel}`],
      assumptions: [
        'Detail kalkulasi disintesis dari deskripsi rekomendasi — angka final memerlukan validasi tim eksekusi.',
        'Angka impact menggunakan estimasi awal yang akan diperbarui setelah pilot.',
      ],
      result: impactValueLabel
        ? `Estimasi total dampak: ${impactValueLabel}`
        : 'Estimasi dampak akan dikuantifikasi pada fase implementasi.',
    },
    quarterlyImpact:
      impactText ||
      `Estimasi dampak per kuartal: ${impactValueLabel || 'akan dihitung pasca-implementasi'}`,
    tactics:
      tactics.length > 0
        ? tactics
        : [
            'Definisikan timeline detail dengan tim eksekusi',
            'Setup baseline metrik sebelum aksi dijalankan',
            'Tracking progres mingguan',
            'Review hasil di akhir kuartal',
          ],
    // Generic but relevant governance defaults — UI renders only when arrays exist
    riskFactors: [
      'Estimasi dampak meleset jika asumsi konversi/cakupan ternyata <60% target',
      'Resistensi internal/eksternal terhadap perubahan operasional',
      'Ketergantungan pada data/sistem eksternal yang belum siap',
    ],
    successMetrics: [
      `Realisasi dampak vs target ratio ≥0,8 (≥${(parseFloat(impactValueLabel.replace(/[^0-9.,]/g, '').replace(',', '.')) * 0.8 || 0).toFixed(1)})`,
      'Adoption rate stakeholder kunci ≥75% dalam 30 hari pertama',
      'Quality score data input ≥85% (cross-check dengan source of truth)',
    ],
    dependencies: [
      'Persetujuan stakeholder kunci + alokasi anggaran operasional',
      'Akses sistem/data yang relevan',
      'Tim eksekusi dengan kapasitas cukup',
    ],
  };
}

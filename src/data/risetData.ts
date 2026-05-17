// Riset feature — mock data
// Model: Riset → Sesi (dated sessions) → Pola (patterns) → Spawn Spesialis
//
// This replaces the heavier "Risk Lens / worklist / MAM" framing with a
// lighter pattern-detection feature where each Pola can be promoted to a
// Spesialis for ongoing monitoring.

export type Confidence = 'tinggi' | 'sedang' | 'rendah';

export type PolaStatus = 'baru' | 'direview' | 'spawned' | 'diabaikan';

export interface PolaEvidence {
  id: string;
  type: 'coupling' | 'external' | 'internal';
  source: string;
  timestamp: string;
  excerpt?: string;
  credibility?: number;
  credibilityLabel?: string;
  link?: string;
  internalRows?: { key: string; value: string }[];
  couplingStrengthLabel?: string;
  reach?: number;
  interactions?: number;
  influence?: number;
}

export interface PolaScope {
  entitas: string[];
  wilayah: string;
  jenisRisiko: string;
  triggers: string[];
}

export interface PolaResponseClass {
  name: string;
  description: string;
}

export interface Pola {
  id: string;
  number: number;
  title: string;
  eventType: string;
  preview: string;
  description: string;
  evidenceCount: number;
  evidence: PolaEvidence[];
  confidence: Confidence;
  status: PolaStatus;
  spawnedHandle?: string;
  isNew: boolean;
  recurrence?: string;
  previousSesi?: string;
  scope: PolaScope;
  responseClasses: PolaResponseClass[];
  couplingStrength?: number;
  proposedName: string;
  proposedHandle: string;
  notifications?: { channel: string; target: string }[];
  rationaleFactors?: { label: string; detail: string }[];
}

export interface SentimentRegion {
  region: string;
  negativePct: number;
}

export interface TopTopic {
  rank: number;
  name: string;
  negativePct: number;
  polaId?: string;
  polaNumber?: number;
}

export interface VolumeTimelineDay {
  date: string;
  label: string;
  negative: number;
  neutral: number;
  positive: number;
}

export interface VolumeTimelineAnnotation {
  date: string;
  label: string;
}

export interface VolumeTimeline {
  days: VolumeTimelineDay[];
  annotations: VolumeTimelineAnnotation[];
  context: string;
  totalConversations: number;
  rangeLabel: string;
}

export interface SesiAnalytics {
  totalConversations: number;
  sentimentNegativePct: number;
  sentimentNeutralPct: number;
  sentimentPositivePct: number;
  trendChangePoints: number;
  topRegions: SentimentRegion[];
  topTopics: TopTopic[];
  volumeTimeline?: VolumeTimeline;
}

export type SesiStatus = 'completed' | 'running' | 'queued' | 'draft';

export interface PlanStep {
  number: number;
  title: string;
  detailLines: Array<{ label: string; value: string }>;
  estTimeLabel: string;
  state: 'pending' | 'active' | 'done';
  progressPct?: number;
  liveDetail?: string;
}

export interface ActivityLogLine {
  time: string;
  parts: Array<{ kind: 'text' | 'accent' | 'good'; text: string }>;
}

export interface SesiRunProgress {
  startedAt: string;
  elapsedLabel: string;
  totalSteps: number;
  currentStep: number;
  overallPct: number;
  etaLabel: string;
  steps: PlanStep[];
  activityLog: ActivityLogLine[];
}

export interface SesiSummary {
  totalPola: number;
  highConfidenceCount: number;
  highConfidenceMentions: string[];
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  newPolaCount: number;
  recurringFromPrevious: number;
  resolvedCount: number;
  narrative: string;
}

export interface Sesi {
  id: string;
  date: string;
  time: string;
  risetName: string;
  status: SesiStatus;
  summary: SesiSummary;
  methodologyNote: string;
  analytics: SesiAnalytics;
  pola: Pola[];
  runProgress?: SesiRunProgress;
  plan?: PlanStep[];
}

// Mention feed — raw signal stream surfaced alongside Pola

export type MentionSentiment = 'negative' | 'neutral' | 'positive';

export type MentionAvatarTone =
  | 'lbh'
  | 'tribun'
  | 'korlantas'
  | 'cnn'
  | 'karawang'
  | 'detik'
  | 'kompas'
  | 'bisnis';

export interface Mention {
  id: string;
  sesiIds: string[];
  source: string;
  sourceKind: 'twitter' | 'news' | 'press_release' | 'community' | 'regulator';
  platform: string;
  avatarTone: MentionAvatarTone;
  avatarInitials: string;
  timestamp: string;
  excerpt: string;
  sentiment: MentionSentiment;
  reach: number;
  interactions: number;
  influence: number;
  credibility: 'high' | 'medium-high' | 'medium' | 'low';
  credibilityLabel: string;
  relatedEntities: string[];
  relatedPolaIds: string[];
  relatedTopicIds: number[];
  sourceUrl?: string;
  acquisition: {
    provider: 'Newstensity' | 'Determ';
    queryMatch: string;
    acquiredAt: string;
  };
}

export interface RisetInfo {
  id: string;
  name: string;
  description: string;
}

export const RISET_INFO: RisetInfo = {
  id: 'jrsi-claim-health',
  name: 'Riset Kesehatan Klaim JRSI',
  description:
    'Investigasi otomatis terjadwal — hasil analisis yang bisa dijadikan Spesialis untuk dipantau terus-menerus.',
};

// =========================================================================
// SESI 1 — 13 Mei 2026 (the primary fixture, fully populated)
// =========================================================================

const sesi13Mei: Sesi = {
  id: 'sesi-2026-05-13-jrsi-claim-health',
  date: '13 Mei 2026',
  time: '02:47 WIB',
  risetName: 'Riset Kesehatan Klaim JRSI',
  status: 'completed',
  summary: {
    totalPola: 5,
    highConfidenceCount: 2,
    highConfidenceMentions: ['Karawang', 'Tol Cipali'],
    mediumConfidenceCount: 2,
    lowConfidenceCount: 1,
    newPolaCount: 3,
    recurringFromPrevious: 1,
    resolvedCount: 1,
    narrative:
      '5 pola terdeteksi minggu ini. 2 dengan keyakinan tinggi: **Karawang** (klaim terlambat ditambah risiko viral) dan **Tol Cipali** (potensi lonjakan klaim setelah kecelakaan). 2 lainnya dengan keyakinan sedang, 1 keyakinan rendah.',
  },
  methodologyNote:
    '8 sumber eksternal · jrsi_claims, jrsi_customers, branch_directory (internal) · pipeline v3.2 · window 7 hari.',
  analytics: {
    totalConversations: 1247,
    sentimentNegativePct: 67,
    sentimentNeutralPct: 22,
    sentimentPositivePct: 11,
    trendChangePoints: 4.2,
    topRegions: [
      { region: 'Jawa Barat', negativePct: 78 },
      { region: 'Jakarta', negativePct: 64 },
      { region: 'Jawa Timur', negativePct: 52 },
      { region: 'Sumatera Utara', negativePct: 41 },
      { region: 'Bali', negativePct: 28 },
    ],
    topTopics: [
      { rank: 1, name: 'Penundaan santunan Karawang', negativePct: 89, polaId: 'pola-001', polaNumber: 1 },
      { rank: 2, name: 'Insiden Tol Cipali', negativePct: 72, polaId: 'pola-002', polaNumber: 2 },
      { rank: 3, name: 'Sentimen umum proses klaim', negativePct: 61, polaId: 'pola-004', polaNumber: 4 },
      { rank: 4, name: 'Bantuan LBH untuk korban', negativePct: 54 },
      { rank: 5, name: 'Penundaan santunan Pati', negativePct: 48, polaId: 'pola-003', polaNumber: 3 },
      { rank: 6, name: 'Konsultasi OJK definisi cacat', negativePct: 34 },
      { rank: 7, name: 'Reformasi sistem santunan', negativePct: 23 },
    ],
    volumeTimeline: {
      totalConversations: 1247,
      rangeLabel: '6–12 Mei 2026',
      context:
        'Lonjakan tajam pada **11 Mei** (LBH Jakarta mulai engage Karawang) dan **12 Mei** (kecelakaan Tol Cipali + Karawang viral). Hari biasa rata-rata 95–135 percakapan.',
      days: [
        { date: '2026-05-06', label: '6 Mei', negative: 58, neutral: 28, positive: 9 },
        { date: '2026-05-07', label: '7 Mei', negative: 54, neutral: 24, positive: 8 },
        { date: '2026-05-08', label: '8 Mei', negative: 72, neutral: 25, positive: 11 },
        { date: '2026-05-09', label: '9 Mei', negative: 82, neutral: 30, positive: 14 },
        { date: '2026-05-10', label: '10 Mei', negative: 100, neutral: 30, positive: 14 },
        { date: '2026-05-11', label: '11 Mei', negative: 160, neutral: 42, positive: 19 },
        { date: '2026-05-12', label: '12 Mei', negative: 310, neutral: 88, positive: 28 },
      ],
      annotations: [
        { date: '2026-05-11', label: 'LBH engage' },
        { date: '2026-05-12', label: 'Tol Cipali' },
      ],
    },
  },
  pola: [
    // POLA #1 — Karawang
    {
      id: 'pola-001',
      number: 1,
      title: 'Karawang: klaim terlambat mulai viral di media sosial',
      eventType: 'Keterlambatan proses klaim',
      preview:
        '23 klaim di Karawang sudah lewat 90 hari batas waktu. Kasus JR-2025-31847 (sudah 247 hari) mulai dibahas di Twitter/X dan dikutip LBH Jakarta — momentumnya naik 180% dalam 4 jam terakhir.',
      description:
        'Ada **23 klaim di Karawang** yang sudah melewati batas waktu 90 hari penyelesaian. Salah satunya, kasus **JR-2025-31847** (sudah 247 hari, masih menunggu verifikasi dokumen), sudah dibahas di Twitter/X dan dikutip oleh **LBH Jakarta** kemarin sore. Tribun Jakarta juga sudah meliput dini hari tadi. Pola serupa sudah pernah muncul 2 minggu lalu — sekarang momentumnya naik 180%, artinya perhatian publik tumbuh cepat.\n\nTotal nilai klaim yang berisiko di Karawang: **Rp 4,58 miliar**. Kasus JR-2025-31847 sendiri adalah klaim cacat permanen dengan estimasi santunan Rp 200 juta.',
      evidenceCount: 5,
      confidence: 'tinggi',
      status: 'baru',
      isNew: true,
      recurrence: 'Pola serupa sudah muncul Sesi 29 April',
      previousSesi: 'Sesi 29 April',
      couplingStrength: 0.83,
      proposedName: 'Spesialis Klaim Karawang — Risiko Viral',
      proposedHandle: '@klaim-karawang-viral',
      scope: {
        entitas: ['Cabang JR Karawang', 'Kasus JR-2025-31847', '@karawangwatch (Twitter/X)'],
        wilayah: 'Karawang, Jawa Barat',
        jenisRisiko: 'Keterlambatan proses klaim',
        triggers: ['Urgensi minimal: sedang', 'Saat momentum publik > 50%'],
      },
      responseClasses: [
        {
          name: 'Cegah eskalasi: percepat penyelesaian klaim',
          description:
            'Lakukan review cepat untuk mempercepat pencairan sebelum komitmen LBH menjadi eskalasi publik.',
        },
        {
          name: 'Komunikasi: kontak langsung keluarga korban',
          description:
            'Hubungi keluarga korban yang terdampak dengan transparansi tentang timeline.',
        },
      ],
      notifications: [
        { channel: 'Slack', target: '#klaim-eskalasi' },
        { channel: 'Email', target: 'direktur_operasional_klaim' },
      ],
      rationaleFactors: [
        {
          label: 'Kaitan internal × eksternal kuat',
          detail: 'Kasus JR-2025-31847 di internal data cocok dengan thread @LBHJakarta',
        },
        {
          label: 'Momentum publik naik 180% / 4h',
          detail: 'Mention rate dari 2/h ke 11/h antara 21:00–01:00 WIB',
        },
        {
          label: 'Pola rekuren',
          detail: 'Pola serupa sudah muncul Sesi 29 April',
        },
        {
          label: 'Actor berpengaruh terlibat',
          detail: '@LBHJakarta · reach 412k · credibility 0.85',
        },
      ],
      evidence: [
        {
          id: 'ev-001-coupling',
          type: 'coupling',
          source: 'Kaitan internal × eksternal',
          timestamp: '13 Mei 02:47',
          excerpt:
            'Kasus JR-2025-31847 yang disebut di media sosial cocok dengan data klaim internal (Karawang, sudah 247 hari). Lokasi geografis sama. Keterlibatan LBH Jakarta meningkatkan risiko eskalasi sekitar 1,7×.',
          credibility: 0.83,
          credibilityLabel: '0.83 (kuat)',
          couplingStrengthLabel: 'Kekuatan kaitan',
        },
        {
          id: 'ev-001-ext-1',
          type: 'external',
          source: '@LBHJakarta · Twitter/X',
          timestamp: '12 Mei 15:47',
          excerpt:
            'Kami akan membantu keluarga korban yang sudah menunggu santunan Jasa Raharja selama 8 bulan ini. Kasus #JR2025_31847 perlu segera diselesaikan.',
          credibility: 0.85,
          credibilityLabel: 'Tinggi',
          link: '#',
          reach: 28500,
          interactions: 1243,
          influence: 9,
        },
        {
          id: 'ev-001-ext-2',
          type: 'external',
          source: 'Tribun Jakarta · artikel berita',
          timestamp: '13 Mei 01:14',
          excerpt:
            'Keluarga korban kecelakaan di Karawang masih menunggu pencairan santunan Jasa Raharja setelah hampir 8 bulan menjalani proses administrasi.',
          credibility: 0.7,
          credibilityLabel: 'Cukup tinggi',
          link: '#',
          reach: 145200,
          interactions: 487,
          influence: 7,
        },
        {
          id: 'ev-001-ext-3',
          type: 'external',
          source: '@karawangwatch · Twitter/X',
          timestamp: '12 Mei 14:32',
          excerpt:
            'Sudah 8 bulan, mana santunan untuk korban Karawang? @LBHJakarta tolong bantu',
          credibility: 0.55,
          credibilityLabel: 'Sedang',
          link: '#',
          reach: 8400,
          interactions: 234,
          influence: 5,
        },
        {
          id: 'ev-001-int-1',
          type: 'internal',
          source: 'Data klaim — wilayah Karawang',
          timestamp: 'diperbarui 13 Mei 02:30',
          internalRows: [
            { key: 'Filter', value: 'Karawang, status menunggu, umur lebih dari 90 hari' },
            { key: 'Jumlah klaim', value: '23 kasus' },
            { key: 'Rata-rata umur', value: '247 hari' },
            { key: 'Total nilai', value: 'Rp 4.580.000.000' },
            { key: 'Kasus spesifik yang cocok', value: 'JR-2025-31847 (247 hari, menunggu verifikasi dokumen)' },
          ],
        },
      ],
    },

    // POLA #2 — Tol Cipali
    {
      id: 'pola-002',
      number: 2,
      title: 'Kecelakaan Tol Cipali: kemungkinan lonjakan klaim dalam 30 hari',
      eventType: 'Insiden korban massal',
      preview:
        'Korlantas POLRI mengumumkan kecelakaan beruntun di Tol Cipali kemarin sore dengan 23 korban. Berdasarkan pola historis, kemungkinan 60% akan ada lebih dari 200 klaim masuk dari koridor Cipali dalam 30 hari ke depan — perlu kesiapan operasional.',
      description:
        'Korlantas POLRI mengumumkan **kecelakaan beruntun di Tol Cipali** kemarin sore dengan 23 korban. Liputan media nasional (Kompas, Detik) sudah dimulai dan keluarga korban mulai mencari informasi proses klaim.\n\nBerdasarkan pola historis 3 tahun terakhir dari insiden serupa, **kemungkinan 60% akan ada lebih dari 200 klaim masuk** dari koridor Cipali dalam 30 hari ke depan. Estimasi total nilai santunan: **Rp 5–8 miliar**.\n\nPerlu kesiapan operasional cabang Subang/Cikampek/Purwakarta untuk volume klaim yang akan masuk.',
      evidenceCount: 4,
      confidence: 'tinggi',
      status: 'baru',
      isNew: true,
      couplingStrength: 0.78,
      proposedName: 'Spesialis Lonjakan Klaim Koridor Cipali',
      proposedHandle: '@klaim-cipali-surge',
      scope: {
        entitas: ['Cabang JR Subang', 'Cabang JR Cikampek', 'Insiden #KOR-CIPALI-2026-05-12'],
        wilayah: 'Koridor Tol Cipali, Jawa Barat',
        jenisRisiko: 'Lonjakan klaim insiden massal',
        triggers: ['Volume klaim koridor naik > 30%', 'Window 30 hari sejak insiden'],
      },
      responseClasses: [
        {
          name: 'Kesiapan operasional cabang terdampak',
          description:
            'Tingkatkan kapasitas verifikator di Subang/Cikampek untuk 30 hari ke depan.',
        },
        {
          name: 'Koordinasi dengan Korlantas POLRI',
          description: 'Sinkronkan data korban untuk percepatan proses identifikasi.',
        },
      ],
      notifications: [
        { channel: 'Slack', target: '#operasional-jawa-barat' },
        { channel: 'Email', target: 'kepala_cabang_subang' },
      ],
      rationaleFactors: [
        { label: 'Sumber regulator resmi', detail: 'Korlantas POLRI · credibility 0.90' },
        { label: 'Pola historis 60% probabilitas', detail: '3 insiden serupa 2023–2025 → semua melebihi 200 klaim' },
        { label: 'Coverage media tier-1', detail: 'Kompas + Detik lead article' },
      ],
      evidence: [
        {
          id: 'ev-002-coupling',
          type: 'coupling',
          source: 'Kaitan insiden × kapasitas cabang',
          timestamp: '13 Mei 02:47',
          excerpt:
            'Insiden Cipali (23 korban) dipasangkan dengan baseline kapasitas cabang Subang (rata-rata 8 klaim/hari). Berdasarkan pola insiden serupa, beban tambahan diprediksi 200+ klaim dalam 30 hari.',
          credibility: 0.78,
          credibilityLabel: '0.78 (kuat)',
          couplingStrengthLabel: 'Kekuatan kaitan',
        },
        {
          id: 'ev-002-ext-1',
          type: 'external',
          source: 'Korlantas POLRI · siaran pers',
          timestamp: '12 Mei 18:20',
          excerpt:
            'Kecelakaan beruntun di KM 78 Tol Cipali arah Cikampek pada pukul 16:42 WIB melibatkan 6 kendaraan dengan 23 korban (14 luka berat, 9 luka ringan).',
          credibility: 0.9,
          credibilityLabel: 'Sangat tinggi',
          link: '#',
          reach: 89400,
          interactions: 2156,
          influence: 9,
        },
        {
          id: 'ev-002-ext-2',
          type: 'external',
          source: 'Kompas.id · artikel berita',
          timestamp: '12 Mei 20:08',
          excerpt:
            'Kecelakaan beruntun Tol Cipali — keluarga korban mempertanyakan proses santunan setelah insiden serupa tahun lalu.',
          credibility: 0.85,
          credibilityLabel: 'Tinggi',
          link: '#',
          reach: 187000,
          interactions: 423,
          influence: 8,
        },
        {
          id: 'ev-002-int-1',
          type: 'internal',
          source: 'Data historis koridor Cipali',
          timestamp: 'diperbarui 13 Mei 02:30',
          internalRows: [
            { key: 'Insiden massal serupa (3 tahun)', value: '3 kasus' },
            { key: 'Rata-rata klaim masuk / insiden', value: '247 klaim' },
            { key: 'Window proses (P95)', value: '32 hari' },
            { key: 'Kapasitas cabang Subang', value: '~8 klaim/hari (baseline)' },
          ],
        },
      ],
    },

    // POLA #3 — Pati (medium, reviewed)
    {
      id: 'pola-003',
      number: 3,
      title: 'Pati: pola keterlambatan masih ada tapi belum meluas',
      eventType: 'Keterlambatan proses klaim',
      preview:
        '15 klaim di Pati melewati 90 hari batas waktu. Sudah ada 3 mention di media sosial tapi belum melibatkan akun yang punya pengaruh besar. Pola ini sudah muncul sejak Sesi 22 April namun tidak meluas.',
      description:
        '15 klaim di Pati melewati 90 hari batas waktu — situasinya belum berubah signifikan dari minggu lalu. Sudah ada 3 mention di media sosial tapi tidak ada akun berpengaruh yang terlibat. Tim Pati sudah menangani secara internal.',
      evidenceCount: 3,
      confidence: 'sedang',
      status: 'direview',
      isNew: false,
      recurrence: 'Sudah muncul sejak Sesi 22 April · tidak meluas',
      previousSesi: 'Sesi 22 April',
      couplingStrength: 0.62,
      proposedName: 'Spesialis Klaim Pati',
      proposedHandle: '@klaim-pati',
      scope: {
        entitas: ['Cabang JR Pati'],
        wilayah: 'Pati, Jawa Tengah',
        jenisRisiko: 'Keterlambatan proses klaim',
        triggers: ['Urgensi minimal: sedang'],
      },
      responseClasses: [
        {
          name: 'Pemantauan rutin tanpa intervensi',
          description: 'Pertahankan triage internal yang sudah berjalan.',
        },
      ],
      evidence: [
        {
          id: 'ev-003-int-1',
          type: 'internal',
          source: 'Data klaim — wilayah Pati',
          timestamp: 'diperbarui 13 Mei 02:30',
          internalRows: [
            { key: 'Klaim > 90 hari', value: '15 kasus' },
            { key: 'Status tim Pati', value: 'Sudah ditangani internal' },
            { key: 'Tren mingguan', value: 'stabil · tidak meluas' },
          ],
        },
        {
          id: 'ev-003-ext-1',
          type: 'external',
          source: '@warga_pati · Twitter/X',
          timestamp: '11 Mei 09:14',
          excerpt: 'Klaim santunan di Pati prosesnya lambat ya, ada yang punya pengalaman?',
          credibility: 0.4,
          credibilityLabel: 'Rendah · unverified',
        },
      ],
    },

    // POLA #4 — Sentimen nasional (already spawned)
    {
      id: 'pola-004',
      number: 4,
      title: 'Sentimen negatif soal proses klaim meningkat secara nasional',
      eventType: 'Penurunan sentimen publik',
      preview:
        'Selama 14 hari terakhir, sentimen negatif tentang "santunan ditunda", "lambat", dan "belum cair" konsisten naik 3.2% per minggu. Sejalan dengan kenaikan rata-rata umur klaim secara nasional.',
      description:
        'Sentimen negatif nasional tentang proses klaim Jasa Raharja konsisten naik 3.2% per minggu selama 14 hari terakhir. Berkorelasi dengan kenaikan rata-rata umur klaim secara nasional (dari 68 hari ke 81 hari).',
      evidenceCount: 6,
      confidence: 'sedang',
      status: 'spawned',
      spawnedHandle: '@sentimen-nasional',
      isNew: true,
      couplingStrength: 0.68,
      proposedName: 'Spesialis Sentimen Nasional Proses Klaim',
      proposedHandle: '@sentimen-nasional',
      scope: {
        entitas: ['Kata kunci: santunan ditunda · lambat · belum cair'],
        wilayah: 'Nasional',
        jenisRisiko: 'Penurunan sentimen publik',
        triggers: ['Sentimen negatif > 60%', 'Trend mingguan +2 poin'],
      },
      responseClasses: [
        {
          name: 'Komunikasi proaktif',
          description: 'Siapkan narasi soal program "Zero Pending Claim".',
        },
      ],
      evidence: [],
    },

    // POLA #5 — Bali low confidence (diabaikan)
    {
      id: 'pola-005',
      number: 5,
      title: 'Sentimen positif di Bali — tidak biasa, mungkin tidak akurat',
      eventType: 'Pola tidak biasa',
      preview:
        'Sentimen positif di Bali naik bersamaan dengan perbaikan operasional, tapi pola ini di luar yang biasa kami deteksi. Buktinya terbatas — kemungkinan noise dari sumber data baru.',
      description:
        'Sentimen positif di Bali naik bersamaan dengan perbaikan operasional. Namun bukti terbatas dan ini di luar pola yang biasa terdeteksi — kemungkinan noise dari sumber data baru yang belum di-tuning.',
      evidenceCount: 2,
      confidence: 'rendah',
      status: 'diabaikan',
      isNew: true,
      couplingStrength: 0.31,
      proposedName: 'Spesialis Sentimen Positif Bali',
      proposedHandle: '@sentimen-bali',
      scope: {
        entitas: ['Wilayah Bali'],
        wilayah: 'Bali',
        jenisRisiko: 'Pola tidak biasa',
        triggers: [],
      },
      responseClasses: [],
      evidence: [],
    },
  ],
};

// =========================================================================
// SESI 2 — 6 Mei 2026 (lighter)
// =========================================================================

const sesi6Mei: Sesi = {
  id: 'sesi-2026-05-06-jrsi-claim-health',
  date: '6 Mei 2026',
  time: '02:43 WIB',
  risetName: 'Riset Kesehatan Klaim JRSI',
  status: 'completed',
  summary: {
    totalPola: 3,
    highConfidenceCount: 1,
    highConfidenceMentions: ['Pati'],
    mediumConfidenceCount: 1,
    lowConfidenceCount: 1,
    newPolaCount: 1,
    recurringFromPrevious: 1,
    resolvedCount: 1,
    narrative:
      '3 pola terdeteksi. 1 keyakinan tinggi (**Pati** — pola yang sama muncul lagi). Pola Karawang dari Sesi sebelumnya tidak muncul lagi minggu ini.',
  },
  methodologyNote: '8 sumber eksternal · pipeline v3.2 · window 7 hari.',
  analytics: {
    totalConversations: 982,
    sentimentNegativePct: 62,
    sentimentNeutralPct: 26,
    sentimentPositivePct: 12,
    trendChangePoints: 1.8,
    topRegions: [
      { region: 'Jawa Tengah', negativePct: 71 },
      { region: 'Jakarta', negativePct: 58 },
      { region: 'Jawa Barat', negativePct: 49 },
    ],
    topTopics: [
      { rank: 1, name: 'Penundaan santunan Pati', negativePct: 76 },
      { rank: 2, name: 'Sentimen umum proses klaim', negativePct: 55 },
      { rank: 3, name: 'Kebijakan baru OJK', negativePct: 22 },
    ],
  },
  pola: [],
};

// =========================================================================
// SESI 3 — 29 Apr 2026 (older)
// =========================================================================

const sesi29Apr: Sesi = {
  id: 'sesi-2026-04-29-jrsi-claim-health',
  date: '29 Apr 2026',
  time: '02:48 WIB',
  risetName: 'Riset Kesehatan Klaim JRSI',
  status: 'completed',
  summary: {
    totalPola: 4,
    highConfidenceCount: 2,
    highConfidenceMentions: ['Karawang', 'Banyuwangi'],
    mediumConfidenceCount: 2,
    lowConfidenceCount: 0,
    newPolaCount: 4,
    recurringFromPrevious: 0,
    resolvedCount: 0,
    narrative: '4 pola terdeteksi. 2 keyakinan tinggi: Karawang (pertama kali muncul) dan Banyuwangi.',
  },
  methodologyNote: '8 sumber eksternal · pipeline v3.1 · window 7 hari.',
  analytics: {
    totalConversations: 1102,
    sentimentNegativePct: 58,
    sentimentNeutralPct: 30,
    sentimentPositivePct: 12,
    trendChangePoints: 2.4,
    topRegions: [
      { region: 'Jawa Barat', negativePct: 68 },
      { region: 'Jawa Timur', negativePct: 56 },
    ],
    topTopics: [
      { rank: 1, name: 'Penundaan santunan Karawang', negativePct: 81 },
      { rank: 2, name: 'Insiden Banyuwangi', negativePct: 64 },
    ],
  },
  pola: [],
};

// =========================================================================
// SESI 4 — 22 Apr 2026 (oldest, smallest)
// =========================================================================

const sesi22Apr: Sesi = {
  id: 'sesi-2026-04-22-jrsi-claim-health',
  date: '22 Apr 2026',
  time: '02:51 WIB',
  risetName: 'Riset Kesehatan Klaim JRSI',
  status: 'completed',
  summary: {
    totalPola: 2,
    highConfidenceCount: 0,
    highConfidenceMentions: [],
    mediumConfidenceCount: 1,
    lowConfidenceCount: 1,
    newPolaCount: 2,
    recurringFromPrevious: 0,
    resolvedCount: 0,
    narrative:
      '2 pola terdeteksi. Sesi ini lebih sedikit karena periode Lebaran — sinkronisasi data internal sedikit tertunda.',
  },
  methodologyNote: '8 sumber eksternal · pipeline v3.1 · window 7 hari · catatan: Lebaran.',
  analytics: {
    totalConversations: 612,
    sentimentNegativePct: 51,
    sentimentNeutralPct: 35,
    sentimentPositivePct: 14,
    trendChangePoints: -1.2,
    topRegions: [
      { region: 'Jawa Tengah', negativePct: 58 },
    ],
    topTopics: [{ rank: 1, name: 'Penundaan santunan Pati', negativePct: 58 }],
  },
  pola: [],
};

// =========================================================================
// Public API
// =========================================================================

// Canonical 5-step plan for "Mulai Sesi" wizard preview + running page
export const CANONICAL_PLAN: PlanStep[] = [
  {
    number: 1,
    title: 'Tarik sinyal eksternal 7 hari terakhir',
    detailLines: [
      { label: 'sumber:', value: 'Newstensity (primary), Determ (international)' },
      { label: 'filter:', value: 'Karawang region + Cipali corridor + amplifier list + 6 event types' },
      { label: 'est. volume:', value: '~1.000–1.500 signals' },
    ],
    estTimeLabel: '~1 menit',
    state: 'pending',
  },
  {
    number: 2,
    title: 'Klasterisasi topik & sentiment per topik',
    detailLines: [
      { label: 'algoritma:', value: 'embedding-based clustering · threshold merge 0.78' },
      { label: 'output:', value: '5–10 cluster topik dengan sentiment distribution' },
      { label: 'model:', value: 'Claude Opus 4.6 untuk classification' },
    ],
    estTimeLabel: '~30 detik',
    state: 'pending',
  },
  {
    number: 3,
    title: 'Tarik data klaim internal terkait',
    detailLines: [
      { label: 'query:', value: "klaim status='pending' AND umur >90 hari AND wilayah IN [Karawang, Cipali corridor]" },
      { label: 'est. records:', value: '~25–35 klaim' },
      { label: 'supplementary:', value: 'regional capacity model, claim age distribution' },
    ],
    estTimeLabel: '~30 detik',
    state: 'pending',
  },
  {
    number: 4,
    title: 'Apply coupling signatures & hasilkan Pola',
    detailLines: [
      { label: 'signatures:', value: 'claim_processing_delay × viral_amplification, mass_casualty × predictive_claim_surge' },
      { label: 'filter:', value: 'confidence ≥ 0.4 untuk surfacing' },
      { label: 'est. output:', value: '3–7 Pola' },
    ],
    estTimeLabel: '~1.5 menit',
    state: 'pending',
  },
  {
    number: 5,
    title: 'Sintesis Briefing & output user-friendly',
    detailLines: [
      { label: 'struktur:', value: 'Ringkasan · Volume timeline · Sentiment + Topics · Pola list · Top mentions' },
      { label: 'format Pola:', value: 'narrative title + description + suggested monitoring scope + response classes' },
      { label: 'bahasa:', value: 'Indonesian (user-facing)' },
    ],
    estTimeLabel: '~1 menit',
    state: 'pending',
  },
];

// Running ad-hoc Sesi — snapshot frozen at 62% (step 3 active)
const sesi13MeiAdhoc: Sesi = {
  id: 'sesi-2026-05-13-jrsi-claim-health-adhoc',
  date: '13 Mei 2026',
  time: '14:32 WIB',
  risetName: 'Riset Kesehatan Klaim JRSI',
  status: 'running',
  summary: {
    totalPola: 0,
    highConfidenceCount: 0,
    highConfidenceMentions: [],
    mediumConfidenceCount: 0,
    lowConfidenceCount: 0,
    newPolaCount: 0,
    recurringFromPrevious: 0,
    resolvedCount: 0,
    narrative: 'Sesi sedang berjalan — hasil akan tersedia setelah selesai.',
  },
  methodologyNote: 'Sesi ad-hoc · fokus: Karawang × Cipali · mode Standard.',
  analytics: {
    totalConversations: 0,
    sentimentNegativePct: 0,
    sentimentNeutralPct: 0,
    sentimentPositivePct: 0,
    trendChangePoints: 0,
    topRegions: [],
    topTopics: [],
  },
  pola: [],
  runProgress: {
    startedAt: '14:32 WIB',
    elapsedLabel: '2 menit 47 detik berlalu',
    totalSteps: 5,
    currentStep: 3,
    overallPct: 62,
    etaLabel: '~1 menit 50 detik',
    steps: [
      {
        ...CANONICAL_PLAN[0],
        state: 'done',
        liveDetail:
          '1.247 signals · 4 sumber (Newstensity, Determ, Twitter/X, Tribun network) · 45 detik',
      },
      {
        ...CANONICAL_PLAN[1],
        state: 'done',
        liveDetail: '7 cluster topik teridentifikasi · sentiment classified · 28 detik',
      },
      {
        ...CANONICAL_PLAN[2],
        state: 'active',
        progressPct: 73,
        liveDetail:
          '23 klaim past SLA ditarik · mencocokkan dengan 1.247 signals · 16 match ditemukan sejauh ini',
      },
      { ...CANONICAL_PLAN[3], state: 'pending', liveDetail: 'menunggu step 3 selesai' },
      { ...CANONICAL_PLAN[4], state: 'pending', liveDetail: 'menunggu step 4 selesai' },
    ],
    activityLog: [
      {
        time: '14:35:02',
        parts: [
          { kind: 'good', text: 'match' },
          { kind: 'text', text: ' ditemukan: kasus ' },
          { kind: 'accent', text: 'JR-2025-31847' },
          { kind: 'text', text: ' ↔ tweet @LBHJakarta · join confidence 0.83' },
        ],
      },
      {
        time: '14:34:58',
        parts: [
          { kind: 'good', text: 'match' },
          { kind: 'text', text: ' ditemukan: kasus ' },
          { kind: 'accent', text: 'JR-2025-31891' },
          { kind: 'text', text: ' ↔ artikel Tribun Jakarta · join confidence 0.71' },
        ],
      },
      {
        time: '14:34:51',
        parts: [
          {
            kind: 'text',
            text: "tarik 23 klaim past SLA dari Karawang region (filter status='pending', umur > 90 hari)",
          },
        ],
      },
      {
        time: '14:34:38',
        parts: [
          { kind: 'text', text: 'klaster topik: ' },
          { kind: 'accent', text: '"Penundaan santunan Karawang"' },
          { kind: 'text', text: ' (89% negatif, 247 signals)' },
        ],
      },
      {
        time: '14:34:38',
        parts: [
          { kind: 'text', text: 'klaster topik: ' },
          { kind: 'accent', text: '"Insiden Tol Cipali"' },
          { kind: 'text', text: ' (72% negatif, 184 signals)' },
        ],
      },
      {
        time: '14:34:21',
        parts: [
          { kind: 'good', text: 'selesai' },
          { kind: 'text', text: ' akuisisi signals: 1.247 total dari 4 sumber dalam 45 detik' },
        ],
      },
      {
        time: '14:34:15',
        parts: [{ kind: 'text', text: 'akuisisi Twitter/X via Determ: 386 signals' }],
      },
      {
        time: '14:34:08',
        parts: [
          { kind: 'text', text: 'akuisisi Newstensity: 612 signals (regional + national)' },
        ],
      },
    ],
  },
  plan: CANONICAL_PLAN,
};

export const SESIONS: Sesi[] = [sesi13MeiAdhoc, sesi13Mei, sesi6Mei, sesi29Apr, sesi22Apr];

// ============ Mention feed fixture =====================================
export const MENTIONS: Mention[] = [
  {
    id: 'mention-lbh-1',
    sesiIds: ['sesi-2026-05-13-jrsi-claim-health'],
    source: '@LBHJakarta',
    sourceKind: 'twitter',
    platform: 'Twitter/X · advokasi hukum',
    avatarTone: 'lbh',
    avatarInitials: 'LB',
    timestamp: '12 Mei 15:47 WIB',
    excerpt:
      'Kami akan membantu keluarga korban yang sudah menunggu santunan Jasa Raharja selama 8 bulan ini. Kasus #JR2025_31847 perlu segera diselesaikan.',
    sentiment: 'negative',
    reach: 28500,
    interactions: 1243,
    influence: 9,
    credibility: 'high',
    credibilityLabel: 'Tinggi',
    relatedEntities: ['JR-2025-31847', 'Karawang'],
    relatedPolaIds: ['pola-001'],
    relatedTopicIds: [1],
    sourceUrl: '#',
    acquisition: {
      provider: 'Determ',
      queryMatch:
        "amplifier_handle='@LBHJakarta' AND keyword IN ['santunan', 'Jasa Raharja'] AND lang='id'",
      acquiredAt: '12 Mei 15:51 WIB',
    },
  },
  {
    id: 'mention-korlantas-1',
    sesiIds: ['sesi-2026-05-13-jrsi-claim-health'],
    source: 'Korlantas POLRI',
    sourceKind: 'press_release',
    platform: 'Press release · regulator',
    avatarTone: 'korlantas',
    avatarInitials: 'KL',
    timestamp: '12 Mei 18:42 WIB',
    excerpt:
      'Kecelakaan beruntun di KM 152 Tol Cipali arah Jakarta melibatkan 4 kendaraan dengan 23 korban (5 meninggal dunia, 18 luka-luka).',
    sentiment: 'neutral',
    reach: 89400,
    interactions: 2156,
    influence: 9,
    credibility: 'high',
    credibilityLabel: 'Tinggi',
    relatedEntities: ['Tol Cipali'],
    relatedPolaIds: ['pola-002'],
    relatedTopicIds: [2],
    sourceUrl: '#',
    acquisition: {
      provider: 'Newstensity',
      queryMatch: "source='korlantas' AND topic IN ['kecelakaan', 'incident']",
      acquiredAt: '12 Mei 18:55 WIB',
    },
  },
  {
    id: 'mention-cnn-1',
    sesiIds: ['sesi-2026-05-13-jrsi-claim-health'],
    source: 'CNN Indonesia',
    sourceKind: 'news',
    platform: 'Artikel berita · media nasional',
    avatarTone: 'cnn',
    avatarInitials: 'CN',
    timestamp: '11 Mei 19:30 WIB',
    excerpt:
      'Bagaimana proses santunan untuk korban kecelakaan lalu lintas? Berikut langkah-langkah pengajuan klaim Jasa Raharja yang perlu diketahui keluarga korban.',
    sentiment: 'neutral',
    reach: 234000,
    interactions: 1890,
    influence: 8,
    credibility: 'high',
    credibilityLabel: 'Tinggi',
    relatedEntities: [],
    relatedPolaIds: [],
    relatedTopicIds: [3],
    sourceUrl: '#',
    acquisition: {
      provider: 'Newstensity',
      queryMatch: "publisher='cnn.id' AND topic IN ['santunan', 'klaim']",
      acquiredAt: '11 Mei 19:42 WIB',
    },
  },
  {
    id: 'mention-tribun-1',
    sesiIds: ['sesi-2026-05-13-jrsi-claim-health'],
    source: 'Tribun Jakarta',
    sourceKind: 'news',
    platform: 'Artikel berita · media regional',
    avatarTone: 'tribun',
    avatarInitials: 'TJ',
    timestamp: '13 Mei 01:14 WIB',
    excerpt:
      'Keluarga korban kecelakaan di Karawang masih menunggu pencairan santunan Jasa Raharja setelah hampir 8 bulan menjalani proses administrasi.',
    sentiment: 'negative',
    reach: 145200,
    interactions: 487,
    influence: 7,
    credibility: 'medium-high',
    credibilityLabel: 'Cukup tinggi',
    relatedEntities: ['Karawang'],
    relatedPolaIds: ['pola-001'],
    relatedTopicIds: [1],
    sourceUrl: '#',
    acquisition: {
      provider: 'Newstensity',
      queryMatch: "publisher='tribun-jakarta' AND region='karawang'",
      acquiredAt: '13 Mei 01:22 WIB',
    },
  },
  {
    id: 'mention-detik-1',
    sesiIds: ['sesi-2026-05-13-jrsi-claim-health'],
    source: 'Detik',
    sourceKind: 'news',
    platform: 'Artikel berita · media nasional',
    avatarTone: 'detik',
    avatarInitials: 'DT',
    timestamp: '10 Mei 11:20 WIB',
    excerpt:
      'Jasa Raharja paparkan strategi tingkatkan layanan santunan pasca-kecelakaan, target percepatan pencairan hingga 30%.',
    sentiment: 'positive',
    reach: 187000,
    interactions: 423,
    influence: 7,
    credibility: 'medium-high',
    credibilityLabel: 'Cukup tinggi',
    relatedEntities: [],
    relatedPolaIds: [],
    relatedTopicIds: [7],
    sourceUrl: '#',
    acquisition: {
      provider: 'Newstensity',
      queryMatch: "publisher='detik' AND topic='jasa_raharja'",
      acquiredAt: '10 Mei 11:30 WIB',
    },
  },
  {
    id: 'mention-karawangwatch-1',
    sesiIds: ['sesi-2026-05-13-jrsi-claim-health'],
    source: '@karawangwatch',
    sourceKind: 'community',
    platform: 'Twitter/X · komunitas lokal',
    avatarTone: 'karawang',
    avatarInitials: 'KW',
    timestamp: '12 Mei 14:32 WIB',
    excerpt:
      'Sudah 8 bulan, mana santunan untuk korban Karawang? @LBHJakarta tolong bantu keluarga yang sudah menunggu lama ini.',
    sentiment: 'negative',
    reach: 8400,
    interactions: 234,
    influence: 5,
    credibility: 'medium',
    credibilityLabel: 'Sedang',
    relatedEntities: ['Karawang'],
    relatedPolaIds: ['pola-001'],
    relatedTopicIds: [1],
    sourceUrl: '#',
    acquisition: {
      provider: 'Determ',
      queryMatch: "region='karawang' AND keyword IN ['santunan', 'menunggu']",
      acquiredAt: '12 Mei 14:38 WIB',
    },
  },
  {
    id: 'mention-kompas-1',
    sesiIds: ['sesi-2026-05-13-jrsi-claim-health'],
    source: 'Kompas.id',
    sourceKind: 'news',
    platform: 'Artikel berita · media nasional',
    avatarTone: 'kompas',
    avatarInitials: 'KP',
    timestamp: '12 Mei 20:08 WIB',
    excerpt:
      'Kecelakaan beruntun Tol Cipali — keluarga korban mempertanyakan proses santunan setelah insiden serupa tahun lalu.',
    sentiment: 'negative',
    reach: 187000,
    interactions: 612,
    influence: 8,
    credibility: 'high',
    credibilityLabel: 'Tinggi',
    relatedEntities: ['Tol Cipali'],
    relatedPolaIds: ['pola-002'],
    relatedTopicIds: [2],
    sourceUrl: '#',
    acquisition: {
      provider: 'Newstensity',
      queryMatch: "publisher='kompas' AND topic='kecelakaan_lalu_lintas'",
      acquiredAt: '12 Mei 20:18 WIB',
    },
  },
];

export function getSesi(id: string | undefined): Sesi | undefined {
  if (!id) return undefined;
  return SESIONS.find((s) => s.id === id);
}

export function getPola(sesiId: string, polaId: string): Pola | undefined {
  return getSesi(sesiId)?.pola.find((p) => p.id === polaId);
}

// =========================================================================
// Mock client-side store for status overrides (spawn / review / dismiss)
// =========================================================================

const statusOverrides = new Map<string, PolaStatus>();
const overrideListeners = new Set<() => void>();

function notifyStatusListeners() {
  overrideListeners.forEach((fn) => fn());
}

export function setPolaStatus(polaId: string, status: PolaStatus) {
  statusOverrides.set(polaId, status);
  notifyStatusListeners();
}

export function getEffectivePolaStatus(pola: Pola): PolaStatus {
  return statusOverrides.get(pola.id) ?? pola.status;
}

export function subscribePolaStatus(fn: () => void): () => void {
  overrideListeners.add(fn);
  return () => overrideListeners.delete(fn);
}

// Track spawned handles so detail page can show the link after spawn
const spawnedHandles = new Map<string, string>();
export function setSpawnedHandle(polaId: string, handle: string) {
  spawnedHandles.set(polaId, handle);
  notifyStatusListeners();
}
export function getSpawnedHandle(pola: Pola): string | undefined {
  return spawnedHandles.get(pola.id) ?? pola.spawnedHandle;
}

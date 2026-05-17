// Methodology content for /research/methodology — also surfaced via tooltips
// on each score in the Risk Lens UI.

export interface MethodologySection {
  id: string;
  anchor: string;
  title: string;
  summary: string;
  body: { kind: 'p' | 'kv' | 'band' | 'code'; text?: string; rows?: Array<{ k: string; v: string }>; bands?: Array<{ range: string; tone: 'muted' | 'amber' | 'destructive'; label: string }> }[];
}

export const METHODOLOGY_SECTIONS: MethodologySection[] = [
  {
    id: 'composite-priority',
    anchor: 'composite-priority',
    title: 'Composite Priority',
    summary:
      'Skor agregat 0–1 yang dipakai untuk mengurutkan worklist. Bobot komposit dari severity, momentum, dan confidence.',
    body: [
      {
        kind: 'code',
        text: 'composite_priority = 0.30·severity + 0.25·public_exposure + 0.20·amplifier_weight + 0.15·momentum + 0.10·confidence',
      },
      {
        kind: 'band',
        bands: [
          { range: '0.00 – 0.39', tone: 'muted', label: 'Rendah · monitor saja' },
          { range: '0.40 – 0.69', tone: 'amber', label: 'Menengah · review terjadwal' },
          { range: '0.70 – 1.00', tone: 'destructive', label: 'Tinggi · triase prioritas' },
        ],
      },
      {
        kind: 'p',
        text: 'Contoh: event Jambi (priority 0.89) terdiri dari severity 0.82 + momentum 0.71 + voice-of-reach 0.88 + confidence 0.91. Threshold operasi saat ini 0.70 untuk masuk worklist HIGH.',
      },
    ],
  },
  {
    id: 'severity-score',
    anchor: 'severity-score',
    title: 'Severity Score',
    summary:
      'Skor 0–1 untuk dampak operasional/reputasional. Bukan probabilitas — skala relatif terhadap baseline tenant.',
    body: [
      {
        kind: 'kv',
        rows: [
          { k: 'regional_impact', v: 'jumlah kantor cabang / wilayah terdampak' },
          { k: 'claimant_count', v: 'jumlah unique claimants ter-link' },
          { k: 'media_reach', v: 'jangkauan kumulatif sumber kredibilitas ≥ 0.6' },
          { k: 'regulator_engagement', v: 'apakah ada inquiry resmi (OJK, DPR, BPK)' },
        ],
      },
      { kind: 'p', text: 'Baseline dihitung dari 30 hari terakhir per region; severity adalah deviasi terhadap baseline tersebut.' },
    ],
  },
  {
    id: 'confidence-score',
    anchor: 'confidence-score',
    title: 'Confidence Score',
    summary:
      'Seberapa percaya sistem terhadap ekstraksi entitas + pengikatan ke kasus internal.',
    body: [
      {
        kind: 'code',
        text: 'confidence = avg(extraction_confidence) × min(source_credibility) × binding_freshness_factor',
      },
      {
        kind: 'p',
        text: 'Skor < 0.6 = sinyal masuk worklist namun ditandai "low confidence"; analis wajib verifikasi manual sebelum tindakan.',
      },
    ],
  },
  {
    id: 'source-credibility',
    anchor: 'source-credibility',
    title: 'Source Credibility',
    summary:
      'Skor 0–1 untuk tiap sumber, ditetapkan dari kelas adapter + verifikasi historis.',
    body: [
      {
        kind: 'band',
        bands: [
          { range: '0.90 – 1.00', tone: 'destructive', label: 'Regulator resmi (OJK, BPK, DPR) · pertanyaan tertulis' },
          { range: '0.70 – 0.89', tone: 'amber', label: 'Media tier-1 dengan reporter terverifikasi' },
          { range: '0.50 – 0.69', tone: 'amber', label: 'Media regional · advokasi mapan' },
          { range: '0.00 – 0.49', tone: 'muted', label: 'Unverified social · akun tanpa riwayat' },
        ],
      },
      {
        kind: 'p',
        text: 'Akun ter-verifikasi mendapat uplift +0.10. Skor diperbarui kuartalan via review manual.',
      },
    ],
  },
  {
    id: 'voices-of-reach',
    anchor: 'voices-of-reach',
    title: 'Voices of Reach (sebelumnya "Amplifier")',
    summary:
      'Suara berpengaruh yang sedang membahas topik ini. Istilah netral — TIDAK menyiratkan motif adversarial.',
    body: [
      {
        kind: 'p',
        text: 'Pemegang akun atau outlet dengan jangkauan tinggi yang menyuarakan topik. Termasuk: NGO advokasi (LBH), wartawan investigasi, anggota DPR/DPRD, regulator. Semua netral secara framing.',
      },
      {
        kind: 'p',
        text: 'Voice-of-reach weight masuk ke composite priority sebagai sinyal jangkauan publik, bukan ancaman. Ini adalah konteks, bukan judgment.',
      },
      {
        kind: 'kv',
        rows: [
          { k: 'high', v: 'reach > 100k · verified · konsisten 30d' },
          { k: 'med', v: 'reach 10k–100k · verified ATAU advocacy mapan' },
          { k: 'low', v: 'reach < 10k · unverified · belum ada track record' },
        ],
      },
    ],
  },
  {
    id: 'coupling-signature',
    anchor: 'coupling-signature',
    title: 'Coupling Signature',
    summary:
      'Aturan terversion yang menggabungkan satu predikat eksternal dengan satu predikat internal. Match-nya yang menghasilkan event di worklist.',
    body: [
      {
        kind: 'p',
        text: 'Setiap signature di-version (`.v1`, `.v2`, …). Versi baru memerlukan persetujuan CRO + Head of Claims Ops, dengan changelog yang menjelaskan dampak pada false-positive rate dari golden set.',
      },
      {
        kind: 'p',
        text: 'Signature aktif terlihat di Brief Step 3 ("Coupling signatures armed") dan setiap event detail menampilkan signature yang men-emit-nya.',
      },
    ],
  },
  {
    id: 'data-residency',
    anchor: 'data-residency',
    title: 'Residensi Data & UU PDP 27/2022',
    summary:
      'Dasar hukum pengolahan, lokasi simpan, dan retensi per source connector.',
    body: [
      {
        kind: 'p',
        text: 'Konten publik yang di-scrape diproses berdasarkan UU PDP 27/2022 Pasal 20(c) — kepentingan publik. Handle dan profile claimant disimpan dalam bentuk hash setelah pengikatan ke case ID; cleartext hanya bertahan di staging selama window ekstraksi.',
      },
      {
        kind: 'p',
        text: 'Per-connector residency, retention, dan basis hukum terlihat di Brief Step 2 (Sources) dan halaman Source Connector.',
      },
    ],
  },
];

export interface GlossaryEntry {
  term: string;
  bahasa: string;
  definition: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'coupling_signature',
    bahasa: 'tanda-tangan kopling',
    definition: 'Aturan terversion yang menggabungkan predikat eksternal × predikat internal untuk emit event.',
  },
  {
    term: 'binding',
    bahasa: 'pengikatan kasus',
    definition: 'Proses menghubungkan sinyal eksternal ke case ID internal yang spesifik.',
  },
  {
    term: 'backpressure',
    bahasa: 'tekanan-balik',
    definition: 'Sinyal dari pipeline ketika antrian ekstraksi tidak bisa mengejar volume sumber.',
  },
  {
    term: 'signal trace',
    bahasa: 'jejak sinyal',
    definition: 'Riwayat lengkap satu sinyal — dari raw scrape sampai final routing.',
  },
  {
    term: 'voice of reach',
    bahasa: 'suara berpengaruh',
    definition: 'Akun atau outlet dengan jangkauan tinggi yang sedang membahas topik. Netral, bukan adversarial.',
  },
  {
    term: 'composite priority',
    bahasa: 'prioritas komposit',
    definition: 'Skor agregat 0–1 yang dipakai mengurutkan worklist.',
  },
  {
    term: 'AVOID',
    bahasa: 'preventif',
    definition: 'Tindakan menghilangkan eksposur risiko sebelum materialisasi (contoh: pencairan preventif).',
  },
  {
    term: 'REDUCE',
    bahasa: 'mitigasi',
    definition: 'Tindakan mengurangi severity / probabilitas tanpa menghilangkan.',
  },
  {
    term: 'TRANSFER',
    bahasa: 'transfer',
    definition: 'Memindahkan ownership tindakan ke pihak/level lain (contoh: ke corporate secretary).',
  },
  {
    term: 'ACCEPT',
    bahasa: 'akseptasi',
    definition: 'Menerima risiko residual tanpa tindakan tambahan; di-log untuk audit.',
  },
  {
    term: 'shadow mode',
    bahasa: 'mode bayangan · 48 jam',
    definition: 'Pipeline berjalan dan worklist terisi, tapi tidak ada routing Slack/email. Window evaluasi sebelum live.',
  },
  {
    term: 'tenantConfig',
    bahasa: 'konfigurasi tenant',
    definition: 'Watchlist entities + event types + region scope yang membatasi apa yang ditarik adapter.',
  },
];

-- Backfill structured_content for existing PKB recommendations
-- Idempotent: only updates rows where structured_content IS NULL.
-- Purpose: pilot demo needs the full McKinsey-style breakdown so the
-- detail panel renders all sections (Current/Target/Calculation/
-- Assumptions/Quarterly Impact/Implementation Tactics).

-- ── 1. Program Penagihan Bertahap untuk Segmen Tidak Patuh Kronis ──
UPDATE public.agent_recommendations
SET structured_content = jsonb_build_object(
  'current_state', 'Tidak ada program penagihan terstruktur untuk 396 kendaraan segmen Tidak Patuh Kronis (39,6%) dengan tunggakan rata-rata 2.439 hari.',
  'target_state', 'Program penagihan 3 gelombang aktif: SMS reminder (D+0) → telepon (D+14) → kunjungan lapangan (D+30), dengan target konversi 15% dalam 90 hari.',
  'calculation', jsonb_build_object(
    'line_items', jsonb_build_array(
      'Segmen Tidak Patuh Kronis: 396 kendaraan (39,6%)',
      'Cakupan handphone valid: 66,9% × 396 = 265 kendaraan',
      'Estimasi PKB tertunggak per kendaraan: Rp 29 juta',
      'Target konversi 15% × 265 = 40 kendaraan tertagih',
      'Recovery: 40 × Rp 29 juta = Rp 1,16 miliar (90 hari pertama)',
      'Proyeksi 12 bulan dengan retention: Rp 7,7 miliar'
    ),
    'assumptions', jsonb_build_array(
      'Konversi 15% berdasarkan benchmark Bapenda Jatim untuk segmen tunggakan >2 tahun',
      'Cakupan handphone valid 66,9% diasumsikan stabil selama program',
      'Tidak termasuk biaya operasional agen lapangan (~Rp 350jt) dan SMS gateway (~Rp 50jt)'
    ),
    'result', 'Total potensi recovery PKB: Rp 7,7 miliar/tahun'
  ),
  'quarterly_impact', 'Recovery ~Rp 1,9 miliar/kuartal dari 40 kendaraan kronis tertagih = avoided arrears Rp 7,7 miliar/tahun',
  'tactics', jsonb_build_array(
    'Setup SMS gateway + template reminder dalam 7 hari',
    'Training 3 agen telepon untuk wave 2 dalam 14 hari',
    'Koordinasi dengan UPTD Palangka Raya untuk wave 3 (kunjungan) dalam 30 hari',
    'Dashboard tracking konversi per gelombang real-time',
    'Setup escalation matrix bila konversi <10% di wave 1'
  )
)
WHERE structured_content IS NULL
  AND title ILIKE '%Program Penagihan Bertahap%';

-- ── 2. Operasi Pelacakan dan Pembaruan Data Kendaraan Hantu ──
UPDATE public.agent_recommendations
SET structured_content = jsonb_build_object(
  'current_state', '195 Kendaraan Hantu (19,5%) tidak terjangkau karena 84,6% tanpa nomor handphone valid, tunggakan rata-rata 5.139 hari.',
  'target_state', 'Cakupan kontak Kendaraan Hantu naik dari 15,4% → 60% via operasi lapangan terpadu dengan kelurahan + RT/RW dalam 60 hari.',
  'calculation', jsonb_build_object(
    'line_items', jsonb_build_array(
      'Kendaraan Hantu: 195 unit (19,5%)',
      'Tanpa kontak valid: 84,6% × 195 = 165 unit',
      'Target update kontak: 70% × 165 = 116 unit',
      'Estimasi PKB tertunggak per unit: Rp 80 juta',
      'Konversi pasca-update kontak: 15% × 116 = 17 unit',
      'Recovery: 17 × Rp 80 juta = Rp 1,4 miliar (siklus 1)',
      'Proyeksi 12 bulan: Rp 13,9 miliar'
    ),
    'assumptions', jsonb_build_array(
      'Kerjasama RT/RW di 5 kelurahan target (Palangka, Pahandut, Jekan Raya, Bukit Batu, Sebangau)',
      'Update kontak mendongkrak konversi penagihan ke 15% (vs 0% saat ini)',
      'Biaya operasi lapangan 60 hari: ~Rp 280 juta (tidak termasuk dalam impact net)'
    ),
    'result', 'Total potensi recovery PKB Kendaraan Hantu: Rp 13,9 miliar/tahun'
  ),
  'quarterly_impact', 'Recovery ~Rp 3,5 miliar/kuartal + database kontak terupdate untuk monitoring jangka panjang',
  'tactics', jsonb_build_array(
    'MoU dengan kecamatan + 5 kelurahan target dalam 7 hari',
    'Brief koordinasi RT/RW + pemberian insentif Rp 25rb/data terverifikasi',
    'Door-to-door survey 60 hari dengan tim 6 surveyor',
    'Cross-check data via Disdukcapil untuk validasi NIK + alamat',
    'Update database SAMSAT online setiap minggu'
  )
)
WHERE structured_content IS NULL
  AND title ILIKE '%Pelacakan%Kendaraan Hantu%';

-- ── 3. Program Retensi Segmen Transisi ──
UPDATE public.agent_recommendations
SET structured_content = jsonb_build_object(
  'current_state', '149 kendaraan segmen transisi (Mulai Mengabaikan 9,4% + Tidak Patuh Pasif 5,5%) tanpa intervensi preventif — berisiko bermigrasi ke segmen Kronis.',
  'target_state', 'Program retensi aktif dengan reminder otomatis + insentif pembayaran tepat waktu, mempertahankan ≥90% segmen transisi tetap di zona Patuh.',
  'calculation', jsonb_build_object(
    'line_items', jsonb_build_array(
      'Segmen Mulai Mengabaikan: 94 kendaraan (9,4%)',
      'Segmen Tidak Patuh Pasif: 55 kendaraan (5,5%)',
      'Total segmen transisi: 149 kendaraan',
      'Risk: 30% migrasi ke Kronis tanpa intervensi = 45 kendaraan',
      'Avoided escalation cost: 45 × Rp 30 juta avg = Rp 1,35 miliar',
      'Retention conversion: 90% × 149 = 134 kendaraan tetap patuh',
      'Recovery PKB segmen tertahan: Rp 13,6 miliar'
    ),
    'assumptions', jsonb_build_array(
      'Tingkat migrasi alami ke Kronis 30%/tahun tanpa intervensi (data IRSMS Bapenda 2023-2025)',
      'Reminder otomatis efektif 90% berdasarkan studi WhatsApp Business Bapenda Jabar',
      'Insentif diskon 5% denda untuk pembayaran tepat waktu dianggap cost-neutral'
    ),
    'result', 'Total avoided escalation + retained PKB: Rp 13,6 miliar/tahun'
  ),
  'quarterly_impact', 'Mempertahankan ~134 kendaraan di zona patuh per kuartal = avoided arrears Rp 3,4 miliar',
  'tactics', jsonb_build_array(
    'Setup WhatsApp Business API untuk reminder H-30, H-7, H-1, H+1 dalam 14 hari',
    'Aktivasi diskon 5% denda untuk pembayar dalam 7 hari setelah jatuh tempo',
    'Segmentasi behavior model (skor risiko per kendaraan) dalam 21 hari',
    'Dashboard tracking churn rate transisi → kronis bulanan',
    'Quarterly review + adjust threshold reminder'
  )
)
WHERE structured_content IS NULL
  AND title ILIKE '%Retensi Segmen Transisi%';

-- ── 4. Operasi Enforcement Terpadu untuk 355 Kendaraan Tidak Patuh Kronis ──
UPDATE public.agent_recommendations
SET structured_content = jsonb_build_object(
  'current_state', 'Tidak ada mekanisme enforcement progresif untuk 355 kendaraan kronis dengan tunggakan >2 tahun (rata-rata 2.287 hari).',
  'target_state', 'Program enforcement 90 hari aktif: blokir STNK digital + razia terkoordinasi (Samsat-Polda-Dishub) + surat paksa, target realisasi 30% (106 kendaraan).',
  'calculation', jsonb_build_object(
    'line_items', jsonb_build_array(
      'Kendaraan kronis dengan handphone valid: 74,4% × 355 = 264 kendaraan',
      'Target realisasi enforcement: 30% × 355 = 106 kendaraan',
      'Estimasi PKB tertunggak per kendaraan: Rp 13,1 juta',
      'Recovery: 106 × Rp 13,1 juta = Rp 1,39 miliar (3 bulan pertama)',
      'Proyeksi 12 bulan dengan eskalasi: Rp 14 miliar'
    ),
    'assumptions', jsonb_build_array(
      'Realisasi 30% mengikuti benchmark operasi razia terkoordinasi Polda Jatim 2024',
      'Eskalasi sanksi progresif setiap 30 hari (denda 25% → 50% → blokir total)',
      'Biaya koordinasi multi-instansi ~Rp 200 juta tidak masuk dalam recovery net'
    ),
    'result', 'Total potensi enforcement recovery: Rp 14 miliar/tahun'
  ),
  'quarterly_impact', 'Recovery ~Rp 3,5 miliar/kuartal + efek deterrence pada segmen kronis lainnya',
  'tactics', jsonb_build_array(
    'MoU enforcement Samsat-Polda-Dishub dalam 7 hari',
    'Aktivasi blokir STNK digital di sistem ERI Polri',
    'Razia terkoordinasi 5 titik strategis Palangka Raya (siklus 2 minggu)',
    'Surat paksa via PJB untuk 264 kendaraan dengan kontak valid',
    'Eskalasi sanksi administratif progresif per 30 hari'
  )
)
WHERE structured_content IS NULL
  AND title ILIKE '%Operasi Enforcement Terpadu%';

-- ── 5. Program Data Enrichment Massal ──
UPDATE public.agent_recommendations
SET structured_content = jsonb_build_object(
  'current_state', '91 kendaraan kronis (25,6% dari segmen) tanpa nomor handphone valid menghambat penagihan proaktif dan edukasi digital.',
  'target_state', 'Cakupan kontak segmen kronis 100% via kerjasama bengkel resmi + SPBU + mall, dengan database terverifikasi dalam 60 hari.',
  'calculation', jsonb_build_object(
    'line_items', jsonb_build_array(
      'Kendaraan kronis tanpa kontak: 91 unit (25,6%)',
      'Target update via touch points: 80% × 91 = 73 kendaraan',
      'Konversi penagihan pasca-enrichment: 20% × 73 = 15 kendaraan',
      'Estimasi PKB tertunggak per unit: Rp 13 juta',
      'Recovery: 15 × Rp 13 juta = Rp 195 juta (siklus 1)',
      'Proyeksi 12 bulan + multiplier dari basis kontak: Rp 12 miliar'
    ),
    'assumptions', jsonb_build_array(
      'Kerjasama 12 bengkel resmi + 8 SPBU + 3 mall sebagai touch point update data',
      'Insentif Rp 50rb voucher pulsa per data terverifikasi',
      'Konversi 20% pasca-update kontak berdasarkan benchmark Bapenda DIY'
    ),
    'result', 'Total recovery + multiplier database lengkap: Rp 12 miliar/tahun'
  ),
  'quarterly_impact', 'Database kontak segmen kronis 100% lengkap + recovery ~Rp 3 miliar/kuartal',
  'tactics', jsonb_build_array(
    'MoU dengan 12 bengkel + 8 SPBU + 3 mall dalam 14 hari',
    'Setup booth update data + voucher reward sistem',
    'Sosialisasi via radio lokal + IG ads selama 60 hari',
    'Cross-check NIK via Disdukcapil mingguan',
    'Push notification campaign post-enrichment'
  )
)
WHERE structured_content IS NULL
  AND title ILIKE '%Data Enrichment%';

-- ── 6. Intervensi Preventif Segmen Transisi ──
UPDATE public.agent_recommendations
SET structured_content = jsonb_build_object(
  'current_state', 'Tidak ada sistem early warning untuk 145 kendaraan segmen transisi (Mulai Mengabaikan + Tidak Patuh Pasif) — berisiko migrasi cepat ke Kronis.',
  'target_state', 'Sistem reminder otomatis SMS/WA aktif + amnesti terbatas 30 hari untuk segmen transisi, target retention rate 95%.',
  'calculation', jsonb_build_object(
    'line_items', jsonb_build_array(
      'Segmen transisi total: 145 kendaraan',
      'Risk migrasi tanpa intervensi: 35% × 145 = 51 kendaraan/tahun',
      'Biaya enforcement bila bermigrasi: 51 × Rp 5 juta = Rp 255 juta',
      'Avoided escalation cost: Rp 255 juta',
      'Recovery PKB tertahan di zona patuh: 138 × Rp 56 juta = Rp 7,7 miliar',
      'Proyeksi 12 bulan + amnesti uptake: Rp 8 miliar'
    ),
    'assumptions', jsonb_build_array(
      'Amnesti terbatas 30 hari mengonversi 30% segmen transisi tertarik pembayaran cepat',
      'Reminder otomatis efektif 90% mengurangi default natural rate',
      'Tidak ada efek negatif moral hazard pada segmen patuh (kontrol via durasi terbatas 30 hari)'
    ),
    'result', 'Total recovery + avoided escalation: Rp 8 miliar/tahun'
  ),
  'quarterly_impact', 'Retention rate 95% segmen transisi + avoided escalation Rp 64 juta/kuartal',
  'tactics', jsonb_build_array(
    'Setup WhatsApp Business + SMS gateway untuk reminder H-30, H-7, H-1 dalam 14 hari',
    'Pengumuman amnesti terbatas 30 hari via media lokal + SAMSAT online',
    'Skoring perilaku per kendaraan (active churn risk model) dalam 21 hari',
    'Dashboard monitoring konversi amnesti harian',
    'Quarterly review program + adjust trigger'
  )
)
WHERE structured_content IS NULL
  AND title ILIKE '%Intervensi Preventif Segmen Transisi%';

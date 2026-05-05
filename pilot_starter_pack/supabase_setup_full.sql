-- =============================================================================
-- JR PILOT — SUPABASE SETUP COMPLETE
-- =============================================================================
-- Purpose: All tables + reference seed + KB schemas untuk Supabase pilot
-- Run sekali di Supabase SQL Editor (di order)
-- Skip: gold.registry_enriched (sudah ada di project Anda)
--
-- Sections:
--   1. Extensions
--   2. Schemas
--   3. Reference tables (gold.dim_*, ref.*) with seed data
--   4. Fact tables (transaksi_fact only — registry_enriched assumed exist)
--   5. Materialized views (assumes registry_enriched exists)
--   6. KB tables (pgvector)
--   7. Audit & lineage (batch_manifest)
--   8. RPC functions
--   9. Indexes
--  10. Comments & verification
--
-- After running this, run embed_kb.py untuk populate kb.reference_docs
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;            -- pgvector untuk RAG
CREATE EXTENSION IF NOT EXISTS pg_cron;            -- optional: scheduled MV refresh
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; -- optional: query monitoring


-- =============================================================================
-- 2. SCHEMAS
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS gold;
CREATE SCHEMA IF NOT EXISTS gold_plus;
CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS kb;

COMMENT ON SCHEMA gold      IS 'Cleansed + classified facts and dimensions';
COMMENT ON SCHEMA gold_plus IS 'Pre-aggregated materialized views';
COMMENT ON SCHEMA ref       IS 'Reference / lookup data dari framework v1.4';
COMMENT ON SCHEMA kb        IS 'Galen specialist knowledge base (pgvector)';


-- =============================================================================
-- 3. REFERENCE TABLES (ref.*)
-- =============================================================================

-- 3.1 ref.segmen — 7 segmen definitions per framework v1.4 Sheet 1
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ref.segmen (
  kode               TEXT PRIMARY KEY,
  nama               TEXT NOT NULL,
  warna              TEXT NOT NULL,
  kelas_pyramid      TEXT NOT NULL,
  durasi_tunggakan   TEXT NOT NULL,
  profil_perilaku    TEXT NOT NULL,
  posisi_pyramid_djp TEXT NOT NULL
);

INSERT INTO ref.segmen (kode, nama, warna, kelas_pyramid, durasi_tunggakan, profil_perilaku, posisi_pyramid_djp) VALUES
('H1', 'Patuh Aktif',           'HIJAU',  'Basis Patuh',         'Belum jatuh tempo',
 'Wajib pajak yang disiplin. Membayar sebelum atau pada saat jatuh tempo. Kebiasaan sudah terbentuk dan stabil.',
 'Basis pyramid — mau dan mampu. Intervensi: menjaga kepatuhan, bukan membangun kepatuhan baru.'),

('K1', 'Baru Lewat Jatuh Tempo','KUNING', 'Goyah Awal',          '1-90 hari + ada riwayat',
 'Lupa atau sibuk. Niat membayar masih ada. Akumulasi denda kecil dan belum jadi beban.',
 'Peralihan dari patuh ke goyah. Pengingat ringan sudah cukup mengembalikan kepatuhan.'),

('O1', 'Mulai Mengabaikan',     'ORANYE', 'Goyah Lanjut',        '91-365 hari + ada riwayat',
 'Mulai lalai. Pajak tergeser dari prioritas. Mungkin kendala keuangan atau hilang urgensi. Denda mulai memberatkan.',
 'Goyah menuju tidak mau. Diperlukan intervensi lebih dari sekadar pengingat — friksi perlu dikurangi.'),

('M1', 'Tidak Patuh Pasif',     'MERAH',  'Tidak Mau Pasif',     '1-2 tahun + ada riwayat',
 'Sudah ambil keputusan pasif untuk tidak membayar. Akumulasi denda jadi penghalang nyata — total kewajiban bisa mendekati atau melebihi pokok pajak.',
 'Tidak mau pasif. Denda bukan lagi sekadar konsekuensi, melainkan tembok penghalang. Amnesti parsial dipertimbangkan.'),

('M2', 'Tidak Patuh Kronis',    'MERAH',  'Tidak Mau Mengakar',  '2-5+ tahun + ada riwayat',
 'Ketidakpatuhan mengakar. Denda 2-4× pokok pajak. Tanpa intervensi mendasar, kendaraan tidak akan kembali ke sistem.',
 'Tidak mau mengakar. Amnesti penuh denda diperlukan sebagai satu-satunya pengungkit realistis.'),

('S1', 'Belum Terdaftar',       'ABU',    'Luar Pyramid',        'Tidak pernah membayar (≤15 thn)',
 'Pembelian tangan kedua tanpa balik nama. 97.5% sepeda motor. Hanya 2% punya nomor HP tercatat.',
 'Di luar pyramid DJP — belum pernah masuk sistem. Penghalang utama: biaya & kerumitan balik nama, bukan denda.'),

('S2', 'Kendaraan Hantu',       'ABU',    'Luar Pyramid',        'Tidak pernah membayar (>15 thn) atau >5 thn tunggakan + >20 thn usia',
 'Diasumsikan sudah dibuang/rusak permanen/pindah wilayah tanpa mutasi. Hanya 19% punya HP.',
 'Di luar pyramid — bukan target kampanye. Tindakan yang tepat: verifikasi registrasi & pembersihan data.')

ON CONFLICT (kode) DO UPDATE SET
  nama = EXCLUDED.nama,
  warna = EXCLUDED.warna,
  kelas_pyramid = EXCLUDED.kelas_pyramid,
  durasi_tunggakan = EXCLUDED.durasi_tunggakan,
  profil_perilaku = EXCLUDED.profil_perilaku,
  posisi_pyramid_djp = EXCLUDED.posisi_pyramid_djp;


-- 3.2 ref.treatment_lookup — Strategi & Program SADAR per segmen (Sheet 3)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ref.treatment_lookup (
  segmen_kode               TEXT PRIMARY KEY REFERENCES ref.segmen(kode),
  tujuan_strategis          TEXT NOT NULL,
  kanal_utama               TEXT NOT NULL,
  pesan_personalisasi       TEXT NOT NULL,
  kebijakan_amnesti         TEXT NOT NULL,
  aksi_utama                TEXT NOT NULL,
  perkiraan_konversi        TEXT NOT NULL
);

INSERT INTO ref.treatment_lookup VALUES

('H1', 'Retensi dan pencegahan — pertahankan kepatuhan dan cegah pergeseran ke K1.',
 'WhatsApp otomatis (99.99% terjangkau)',
 'Pengingat ramah pada 30/14/7 hari sebelum jatuh tempo. Bahasa daerah (Dayak/Banjar) untuk kedekatan emosional. Tautan pembayaran + jadwal SAMSAT.',
 'TIDAK ADA AMNESTI. Justru perlu dihargai. Pertimbangkan loyalitas: sertifikat digital "Wajib Pajak Taat", pengurangan pajak tahun berikutnya untuk early payment, manfaat keselamatan JR.',
 'Alur WhatsApp otomatis terpicu sd_notice. Pantau read-rate, click-rate, conversion per gelombang. Identifikasi WP progresif dengan multi-kendaraan.',
 'Tinggi (85-95%)'),

('K1', 'Pemulihan cepat — kembalikan kepatuhan sebelum denda terakumulasi.',
 'WhatsApp + SMS sebagai cadangan',
 'Mendesak tetapi tidak menghakimi. Sampaikan denda masih kecil dan masih bisa dihindari peningkatannya dengan bertindak segera. Tautan pembayaran + jadwal Keliling.',
 'TIDAK ADA AMNESTI. Denda <90 hari masih kecil dan berfungsi sebagai pendorong alami. Menghapus denda di tahap ini menghilangkan insentif tepat waktu.',
 'WhatsApp minggu pertama setelah jatuh tempo. Tindak lanjut hari 30 dan 60 dengan urgensi naik. SMS pada hari 45 untuk yang tidak respond. Analisis konversi per gelombang.',
 'Tinggi (60-75%)'),

('O1', 'Keterlibatan kembali — tarik WP sebelum pola perilaku mengeras menjadi kronis.',
 'WhatsApp bertahap + SMS + Pemberitahuan kedekatan SAMSAT Keliling',
 'Gabungkan urgensi + kemudahan akses. Tampilkan akumulasi denda yang bertumbuh personal. Tawarkan kenyamanan: jadwal/lokasi Keliling terdekat dengan kecamatan penerima.',
 'TIDAK ADA AMNESTI. Denda 3-12 bulan masih seimbang dengan pelanggaran. Amnesti dini = bahaya moral untuk H1/K1. Intervensi yang tepat: kurangi hambatan, bukan kewajiban.',
 'Kampanye WhatsApp 3 pesan dalam 6 minggu. Selaraskan jadwal Keliling dengan kecamatan kepadatan tinggi. Pemberitahuan berbasis lokasi. Integrasi data ETLE.',
 'Sedang (35-50%)'),

('M1', 'Pengurangan hambatan — atasi akumulasi denda yang sudah jadi penghalang finansial.',
 'WhatsApp + Surat tagihan fisik + SAMSAT Keliling',
 'Akui jeda pembayaran tanpa menyalahkan. Mulai dari solusi, bukan teguran. Personalisasi perhitungan denda per kendaraan secara transparan.',
 'AMNESTI PARSIAL — pengurangan denda PKB 50-75%. Denda SWDKLLJ proporsional. Pokok PKB+SWDKLLJ tetap penuh. 60 hari, satu kali. Pada 1-2 thn, denda bisa setara/melebihi pokok — pengurangan ini menurunkan ambang masuk kembali.',
 'Regulasi amnesti parsial 60 hari. Hasilkan perhitungan denda individual untuk WhatsApp. Cetak surat tagihan fisik penguat. Aktifkan Duta Pajak (Hayak Bahayau / Huma Betang Mahaga). Validasi setiap transaksi.',
 'Sedang (25-40%)'),

('M2', 'Pemulihan pendapatan — maksimalkan penagihan via amnesti terstruktur + penegakan pasca-amnesti.',
 'WhatsApp (71% terjangkau) + Surat fisik untuk 29% + Kelurahan/RT-RW + Razia pasca-amnesti',
 'Langsung dan transaksional. Sampaikan program penghapusan denda dengan deadline dan cukup bayar pokok. Insentif finansial tegas, bukan himbauan emosional.',
 'AMNESTI PENUH DENDA — semua denda PKB+SWDKLLJ dihapus. Tunggakan pokok historis dapat dinegosiasi (bayar tahun berjalan + 1 tahun belakang). 90 hari, satu kali. WAJIB diikuti razia pasca-amnesti. Pada 2-5 thn denda 2-4× pokok — tanpa penghapusan, kendaraan tidak akan kembali ke sistem.',
 'Regulasi amnesti penuh denda 90 hari. WA massal ke 71%. Koordinasi kelurahan untuk 29% offline. Keliling di area konsentrasi. ETLE deteksi yang masih beroperasi. "Tidak Bayar Pajak = Tidak Ada BBM" untuk kendaraan dinas. Razia pasca-amnesti wajib.',
 'Rendah-Sedang (15-30%)'),

('S1', 'Memasukkan ke dalam sistem — bawa kendaraan tidak terdaftar ke registrasi formal pertama kalinya.',
 'Berbasis komunitas: SAMSAT Keliling + RT/RW + Kampanye kelurahan + Spanduk + Duta Pajak',
 'Edukatif, bukan menghukum. Banyak pemilik tidak paham kewajiban / yakin kendaraan bukan atas namanya. Jelaskan proses sederhana — balik nama bisa di Keliling.',
 'PENGURANGAN BBNKB — pengurangan/penghapusan Bea Balik Nama untuk dorong registrasi formal. Denda tidak berlaku (belum pernah ada kewajiban PKB). Penghalang: biaya BBNKB. Setiap konversi = aliran pendapatan baru berulang. 90 hari, sync M2.',
 'Regulasi pengurangan BBNKB 90 hari (sync M2). Identifikasi titik konsentrasi via kelurahan. Keliling dengan kapabilitas balik nama langsung. Spanduk + Duta Pajak. Libatkan BRILink, PT POS, BUMDES sebagai titik layanan.',
 'Rendah (10-20%)'),

('S2', 'Kebersihan registrasi — verifikasi status dan bersihkan basis data. JANGAN buang anggaran kampanye.',
 'TIDAK ADA KAMPANYE — proses data internal saja',
 'TIDAK BERLAKU. Kendaraan ini tidak boleh menerima pesan kampanye. Mengirim ke ghost vehicle merusak kredibilitas seluruh kampanye dan membuang anggaran.',
 'TIDAK ADA AMNESTI. Yang diperlukan: verifikasi registrasi (cross-match Polri/Ditlantas), penandaan untuk verifikasi fisik saat razia, atau penghapusan data untuk yang konfirmasi tidak aktif >5 tahun.',
 'Tandai massal untuk peninjauan registrasi. Pemberitahuan administratif terakhir surat fisik (90 hari respond). Yang tidak respond → arsip/hapus. Yang respond → reklasifikasi M2 atau S1.',
 'Tidak berlaku — tujuan adalah kualitas data')

ON CONFLICT (segmen_kode) DO UPDATE SET
  tujuan_strategis = EXCLUDED.tujuan_strategis,
  kanal_utama = EXCLUDED.kanal_utama,
  pesan_personalisasi = EXCLUDED.pesan_personalisasi,
  kebijakan_amnesti = EXCLUDED.kebijakan_amnesti,
  aksi_utama = EXCLUDED.aksi_utama,
  perkiraan_konversi = EXCLUDED.perkiraan_konversi;


-- 3.3 ref.program_sadar — 9 program SADAR (Sheet 5)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ref.program_sadar (
  program_id            SERIAL PRIMARY KEY,
  nama                  TEXT NOT NULL UNIQUE,
  deskripsi             TEXT NOT NULL,
  segmen_sasaran        TEXT[] NOT NULL,
  pemangku_kepentingan  TEXT[] NOT NULL,
  tipologi_wilayah      TEXT[] NOT NULL
);

INSERT INTO ref.program_sadar (nama, deskripsi, segmen_sasaran, pemangku_kepentingan, tipologi_wilayah) VALUES
('Pengingat Prediktif via Gateway WhatsApp',
 'Pengiriman pengingat pembayaran proaktif via WhatsApp dan SMS. Personalisasi berdasarkan profil risiko dari riwayat transaksi. Pemicu otomatis berdasar tanggal jatuh tempo. Bahasa daerah untuk kedekatan emosional.',
 ARRAY['H1','K1','O1','M1','M2'],
 ARRAY['Jasa Raharja','Vendor TI'],
 ARRAY['Pusat Urban','Hub Industri']),

('Program Loyalitas dan Insentif',
 'Penghargaan bagi WP patuh konsisten. Sertifikat digital "Wajib Pajak Taat", pengurangan pajak tahun berikutnya untuk early payment, manfaat keselamatan JR.',
 ARRAY['H1'],
 ARRAY['Jasa Raharja','Bapenda'],
 ARRAY['Pusat Urban','Hub Industri','Wilayah Hinterland']),

('Penempatan Layanan Dinamis (SAMSAT Keliling)',
 'Optimalisasi lokasi/jadwal Keliling berdasar distribusi geografis kendaraan menunggak. Layanan keliling konvensional + mandiri + integrasi BUMDES, koperasi, BRILink, PT POS.',
 ARRAY['O1','M1','M2','S1'],
 ARRAY['SAMSAT','Bapenda'],
 ARRAY['Pusat Urban','Hub Industri','Wilayah Hinterland']),

('Mobil Pajak Keliling Multi-Layanan',
 'Transformasi mobil pajak keliling jadi unit multi-layanan: pajak + kesehatan/kependudukan. Terminal pembayaran luring-ke-daring untuk area tanpa sinyal.',
 ARRAY['S1','O1'],
 ARRAY['SAMSAT','Kelurahan'],
 ARRAY['Wilayah Hinterland']),

('Amnesti Pajak Bertarget',
 'Program amnesti spesifik per segmen. M1 parsial 50-75%. M2 penuh denda. S1 pengurangan BBNKB. Selalu berbatas waktu. Tidak pernah blanket. Wajib diikuti penegakan setelah deadline.',
 ARRAY['M1','M2','S1'],
 ARRAY['Bapenda','SAMSAT'],
 ARRAY['Pusat Urban','Hub Industri','Wilayah Hinterland']),

('Kolaborasi Ekosistem',
 'Aktivasi peran setiap lini: Polri via ETLE terintegrasi data pajak, Bapenda via Duta Pajak (Hayak Bahayau / Huma Betang Mahaga), JR via manfaat keselamatan, mitra dompet elektronik untuk skema cicilan.',
 ARRAY['O1','M1','M2','S1','S2'],
 ARRAY['Jasa Raharja','Bapenda','SAMSAT','Polri','Kelurahan','Vendor TI'],
 ARRAY['Pusat Urban','Hub Industri','Wilayah Hinterland']),

('Kemitraan Korporat SAMSAT',
 'Layanan pemeriksaan di lokasi perusahaan untuk armada perkebunan/pertambangan. Pemeriksaan massal + pembayaran kolektif. Label "Perusahaan Taat Pajak" sebagai komponen ESG.',
 ARRAY['M1','M2'],
 ARRAY['SAMSAT','Bapenda'],
 ARRAY['Hub Industri']),

('Penegakan Hukum Berbasis Risiko',
 'Razia/tilang diarahkan ke lokasi/kelompok dengan probabilitas tunggakan tertinggi. Bukan acak. Penargetan berbasis data untuk optimalkan sumber daya dan dampak pencegahan.',
 ARRAY['M2','S2'],
 ARRAY['Polri','SAMSAT'],
 ARRAY['Pusat Urban','Hub Industri']),

('Audit Kepatuhan Kendaraan Dinas',
 '"Tidak Bayar Pajak, Tidak Ada BBM": kendaraan dinas menunggak tidak dapat kuota BBM bersubsidi atau anggaran pemeliharaan APBD. Memberikan keteladanan ke masyarakat.',
 ARRAY['M2'],
 ARRAY['Bapenda','Pemerintah Daerah'],
 ARRAY['Pusat Urban','Hub Industri','Wilayah Hinterland'])

ON CONFLICT (nama) DO UPDATE SET
  deskripsi = EXCLUDED.deskripsi,
  segmen_sasaran = EXCLUDED.segmen_sasaran,
  pemangku_kepentingan = EXCLUDED.pemangku_kepentingan,
  tipologi_wilayah = EXCLUDED.tipologi_wilayah;


-- 3.4 ref.raci_matrix — RACI per aksi kunci (Sheet 4)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ref.raci_matrix (
  raci_id        SERIAL PRIMARY KEY,
  segmen_kode    TEXT REFERENCES ref.segmen(kode),
  aksi_kunci     TEXT NOT NULL,
  jasa_raharja   TEXT CHECK (jasa_raharja  IN ('R','A','C','I',NULL)),
  bapenda        TEXT CHECK (bapenda       IN ('R','A','C','I',NULL)),
  samsat         TEXT CHECK (samsat        IN ('R','A','C','I',NULL)),
  polri          TEXT CHECK (polri         IN ('R','A','C','I',NULL)),
  kelurahan      TEXT CHECK (kelurahan     IN ('R','A','C','I',NULL)),
  vendor_ti      TEXT CHECK (vendor_ti     IN ('R','A','C','I',NULL))
);

-- Truncate dulu untuk re-seed clean
TRUNCATE ref.raci_matrix RESTART IDENTITY;

INSERT INTO ref.raci_matrix (segmen_kode, aksi_kunci, jasa_raharja, bapenda, samsat, polri, kelurahan, vendor_ti) VALUES
-- H1 (Patuh Aktif)
('H1', 'Konfigurasi alur pengingat WhatsApp otomatis (30/14/7 hari)', 'C', 'A', 'I', NULL, NULL, 'R'),
('H1', 'Kirim pengingat perpanjangan via WhatsApp + tautan pembayaran', NULL, 'I', 'I', NULL, NULL, 'R'),
('H1', 'Personalisasi pesan dengan bahasa daerah', 'R', 'A', 'C', NULL, NULL, 'C'),
('H1', 'Pantau read-rate, click-rate, conversion per gelombang', 'R', 'A', 'I', NULL, NULL, 'C'),
('H1', 'Evaluasi program loyalitas (sertifikat + manfaat keselamatan)', 'A', 'C', 'C', NULL, NULL, NULL),
('H1', 'Identifikasi WP progresif multi-kendaraan untuk penghargaan', 'R', 'A', 'I', NULL, NULL, 'C'),

-- K1 (Baru Lewat Jatuh Tempo)
('K1', 'Hasilkan daftar kontak tunggakan <90 hari + nomor HP', 'R', 'C', 'I', NULL, NULL, 'C'),
('K1', 'Kirim WhatsApp massal minggu 1 setelah jatuh tempo', NULL, 'I', 'I', NULL, NULL, 'R'),
('K1', 'Tindak lanjut WhatsApp hari 30 dan 60 dengan urgensi naik', NULL, 'I', 'I', NULL, NULL, 'R'),
('K1', 'Alihkan ke SMS hari 45 bagi yang tidak respond', NULL, 'I', 'I', NULL, NULL, 'R'),
('K1', 'Proses pembayaran via kanal digital', NULL, 'I', 'R', NULL, NULL, NULL),
('K1', 'Analisis konversi per gelombang untuk tuning', 'R', 'A', 'C', NULL, NULL, 'C'),

-- O1 (Mulai Mengabaikan)
('O1', 'Rancang kampanye WhatsApp 3 pesan dalam 6 minggu', 'R', 'A', 'C', NULL, NULL, 'C'),
('O1', 'Selaraskan jadwal SAMSAT Keliling dengan konsentrasi O1', 'I', 'A', 'R', NULL, 'C', NULL),
('O1', 'Pemberitahuan berbasis lokasi saat Keliling dekat', NULL, 'I', 'C', NULL, NULL, 'R'),
('O1', 'Integrasi ETLE untuk identifikasi yang masih beroperasi', 'I', 'C', 'C', 'R', NULL, 'C'),
('O1', 'SMS massal sebagai cadangan untuk yang tidak respond WA', NULL, 'I', 'I', NULL, NULL, 'R'),
('O1', 'Pantau konversi per kecamatan untuk optimasi rute Keliling', 'R', 'A', 'C', NULL, NULL, 'C'),

-- M1 (Tidak Patuh Pasif)
('M1', 'Rancang regulasi amnesti parsial 50-75% (deadline 60 hari)', 'C', 'A', 'C', NULL, 'I', NULL),
('M1', 'Hasilkan perhitungan denda individual untuk WhatsApp', 'R', 'C', 'I', NULL, NULL, 'C'),
('M1', 'Kirim kampanye WhatsApp bertarget dengan kewajiban personal', NULL, 'I', 'I', NULL, NULL, 'R'),
('M1', 'Cetak dan distribusikan surat tagihan fisik penguat', NULL, 'A', 'R', NULL, 'C', NULL),
('M1', 'Aktivasi Duta Pajak (Hayak Bahayau / Huma Betang Mahaga)', 'I', 'C', 'R', NULL, 'A', NULL),
('M1', 'Proses pembayaran amnesti di loket SAMSAT dan Keliling', NULL, 'I', 'R', NULL, NULL, NULL),
('M1', 'Validasi & rekonsiliasi setiap transaksi amnesti', 'C', 'A', 'R', NULL, NULL, NULL),

-- M2 (Tidak Patuh Kronis)
('M2', 'Rancang regulasi amnesti penuh denda (deadline 90 hari)', 'C', 'A', 'C', 'C', NULL, NULL),
('M2', 'Kampanye WA massal ke 71% kendaraan terjangkau', NULL, 'I', 'I', NULL, NULL, 'R'),
('M2', 'Koordinasi kelurahan/RT-RW untuk 29% offline', 'I', 'C', 'R', NULL, 'A', NULL),
('M2', 'Tempatkan SAMSAT Keliling di area konsentrasi', 'I', 'A', 'R', NULL, 'C', NULL),
('M2', 'Integrasi ETLE deteksi yang masih beroperasi', 'I', 'C', 'C', 'R', NULL, 'C'),
('M2', 'Proses pembayaran amnesti pokok PKB di SAMSAT/Keliling', NULL, 'I', 'R', NULL, NULL, NULL),
('M2', 'Kebijakan "Tidak Bayar = Tidak Ada BBM" untuk kendaraan dinas', 'I', 'A', 'C', 'C', NULL, NULL),
('M2', 'Rencanakan jadwal/lokasi razia pasca-amnesti berbasis data', 'I', 'C', 'C', 'A', NULL, NULL),
('M2', 'Eksekusi razia + tilang pasca-amnesti', 'I', 'I', 'C', 'R', NULL, NULL),
('M2', 'Proses pembayaran langsung di lokasi selama razia', NULL, 'I', 'R', 'C', NULL, NULL),

-- S1 (Belum Terdaftar)
('S1', 'Rancang regulasi pengurangan BBNKB untuk registrasi pertama', 'C', 'A', 'C', 'C', NULL, NULL),
('S1', 'Identifikasi titik konsentrasi via koordinasi kelurahan', 'I', 'C', 'C', NULL, 'R', NULL),
('S1', 'SAMSAT Keliling dengan kapabilitas balik nama langsung', 'I', 'A', 'R', 'C', 'C', NULL),
('S1', 'Kampanye komunitas via spanduk, RT/RW, Duta Pajak', 'I', 'C', 'R', NULL, 'A', NULL),
('S1', 'Libatkan BRILink, PT POS, BUMDES sebagai titik layanan', 'C', 'A', 'R', NULL, 'C', NULL),
('S1', 'Proses balik nama dan registrasi PKB baru di lokasi', NULL, 'I', 'R', 'C', NULL, NULL),
('S1', 'Sediakan terminal pembayaran luring-ke-daring untuk area sinyal terbatas', 'C', 'I', 'C', NULL, NULL, 'R'),

-- S2 (Kendaraan Hantu)
('S2', 'Tandai kendaraan hantu massal untuk peninjauan registrasi', NULL, 'A', 'R', 'C', NULL, NULL),
('S2', 'Pemberitahuan administratif terakhir surat fisik (90 hari respond)', NULL, 'A', 'R', NULL, NULL, NULL),
('S2', 'Pencocokan silang dengan data Polri/Ditlantas', NULL, 'C', 'C', 'R', NULL, NULL),
('S2', 'Reklasifikasi yang merespond ke M2 atau S1', 'R', 'A', 'I', NULL, 'I', NULL),
('S2', 'Arsipkan/hapus registrasi yang konfirmasi tidak aktif', NULL, 'A', 'R', NULL, 'I', NULL);


-- 3.5 ref.revenue_scenario — Simulasi pendapatan (Sheet 6)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ref.revenue_scenario (
  scenario_id          SERIAL PRIMARY KEY,
  segmen_kode          TEXT REFERENCES ref.segmen(kode),
  konversi_pct         NUMERIC(4,2) NOT NULL,
  est_pendapatan_idr   NUMERIC(14,0) NOT NULL,
  scenario_label       TEXT NOT NULL CHECK (scenario_label IN ('Konservatif','Moderat','Optimis')),
  UNIQUE (segmen_kode, scenario_label)
);

INSERT INTO ref.revenue_scenario (segmen_kode, konversi_pct, est_pendapatan_idr, scenario_label) VALUES
-- Konservatif (recommended)
('K1', 0.60, 10800604714, 'Konservatif'),
('O1', 0.35,  5005847081, 'Konservatif'),
('M1', 0.25,  2446328598, 'Konservatif'),
('M2', 0.15,  5091725071, 'Konservatif'),
('S1', 0.10,   199989899, 'Konservatif'),
-- Moderat
('K1', 0.70, 12600794293, 'Moderat'),
('O1', 0.45,  6435929817, 'Moderat'),
('M1', 0.35,  3424070430, 'Moderat'),
('M2', 0.25,  8486569670, 'Moderat'),
('S1', 0.15,   299984849, 'Moderat'),
-- Optimis
('K1', 0.75, 13501013272, 'Optimis'),
('O1', 0.50,  7151582575, 'Optimis'),
('M1', 0.40,  3914360266, 'Optimis'),
('M2', 0.30, 10183811359, 'Optimis'),
('S1', 0.20,   400168025, 'Optimis')
ON CONFLICT (segmen_kode, scenario_label) DO UPDATE SET
  konversi_pct = EXCLUDED.konversi_pct,
  est_pendapatan_idr = EXCLUDED.est_pendapatan_idr;


-- =============================================================================
-- 4. DIMENSION TABLES (gold.dim_*)
-- =============================================================================

-- 4.1 gold.dim_kabupaten — 14 kabupaten/kota Kalteng
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.dim_kabupaten (
  kabupaten_id     INT PRIMARY KEY,
  nama_kabupaten   TEXT NOT NULL UNIQUE,
  tipologi_wilayah TEXT NOT NULL CHECK (tipologi_wilayah IN ('Pusat Urban','Hub Industri','Wilayah Hinterland'))
);

INSERT INTO gold.dim_kabupaten (kabupaten_id, nama_kabupaten, tipologi_wilayah) VALUES
(6271, 'PALANGKA RAYA',     'Pusat Urban'),
(6202, 'SAMPIT',            'Pusat Urban'),
(6201, 'PANGKALAN BUN',     'Pusat Urban'),
(6203, 'KUALA KAPUAS',      'Pusat Urban'),
(6205, 'MUARA TEWEH',       'Hub Industri'),
(6204, 'BUNTOK',            'Hub Industri'),
(6206, 'KASONGAN',          'Wilayah Hinterland'),
(6207, 'NANGA BULIK',       'Wilayah Hinterland'),
(6208, 'KUALA PEMBUANG',    'Wilayah Hinterland'),
(6209, 'TAMIANG LAYANG',    'Wilayah Hinterland'),
(6210, 'PULANG PISAU',      'Wilayah Hinterland'),
(6211, 'KUALA KURUN',       'Wilayah Hinterland'),
(6212, 'PURUK CAHU',        'Wilayah Hinterland'),
(6213, 'SUKAMARA',          'Wilayah Hinterland')
ON CONFLICT (kabupaten_id) DO UPDATE SET
  nama_kabupaten = EXCLUDED.nama_kabupaten,
  tipologi_wilayah = EXCLUDED.tipologi_wilayah;


-- 4.2 gold.dim_upt — UPT lookup (auto-populated saat data masuk)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.dim_upt (
  upt_id         INT PRIMARY KEY,
  upt_nama       TEXT NOT NULL,
  kabupaten_id   INT REFERENCES gold.dim_kabupaten(kabupaten_id)
);

-- Seed PR UPT (yang sudah pasti ada)
INSERT INTO gold.dim_upt (upt_id, upt_nama, kabupaten_id) VALUES
(2,  'SAMSAT PALANGKA RAYA',           6271),
(44, 'SAMKEL PALANGKA RAYA (BIS)',     6271)
ON CONFLICT (upt_id) DO UPDATE SET
  upt_nama = EXCLUDED.upt_nama,
  kabupaten_id = EXCLUDED.kabupaten_id;


-- 4.3 gold.dim_jenken — 8 jenis kendaraan + avg PKB (Sheet 7 numbers)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.dim_jenken (
  kode_jenken             TEXT PRIMARY KEY,
  jenis_kendaraan         TEXT NOT NULL,
  is_motor                BOOLEAN NOT NULL,
  est_pkb_per_kendaraan   NUMERIC(12,0)
);

INSERT INTO gold.dim_jenken (kode_jenken, jenis_kendaraan, is_motor, est_pkb_per_kendaraan) VALUES
('R', 'SEPEDA MOTOR',  TRUE,   122712),
('C', 'MINIBUS',       FALSE, 1284741),
('F', 'PICK UP',       FALSE, 1301059),
('B', 'JEEP',          FALSE, 2316498),
('G', 'TRUCK DUMP',    FALSE, 2215921),
('H', 'LIGHT TRUCK',   FALSE, 1760474),
('S', 'SEDAN',         FALSE, 1103276),
('X', 'Lainnya',       FALSE, 1500000)
ON CONFLICT (kode_jenken) DO UPDATE SET
  jenis_kendaraan = EXCLUDED.jenis_kendaraan,
  is_motor = EXCLUDED.is_motor,
  est_pkb_per_kendaraan = EXCLUDED.est_pkb_per_kendaraan;


-- 4.4 gold.dim_layanan — Service types (auto-populated saat transaksi masuk)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gold.dim_layanan (
  id_layanan     INT PRIMARY KEY,
  nama_layanan   TEXT NOT NULL UNIQUE,
  kategori       TEXT  -- 'PENDAFTARAN', 'MUTASI', 'DUPLIKAT', 'GANTI', etc.
);

-- Seed service types yang sudah pasti ada (dari Transaksi 2025)
INSERT INTO gold.dim_layanan (id_layanan, nama_layanan, kategori) VALUES
(1,  'PENDAFTARAN BARU',                  'PENDAFTARAN'),
(3,  'PENDAFTARAN ULANG 5 TAHUN',         'PENDAFTARAN'),
(42, 'PENDAFTARAN ULANG',                 'PENDAFTARAN'),
(41, 'MUTASI MASUK DALAM PROPINSI',       'MUTASI'),
(4,  'MUTASI MASUK LUAR PROPINSI',        'MUTASI'),
(5,  'MUTASI KELUAR DALAM PROPINSI',      'MUTASI'),
(6,  'MUTASI KELUAR LUAR PROPINSI',       'MUTASI'),
(7,  'JUAL BELI',                         'TRANSFER'),
(8,  'DUPLIKAT STNK',                     'DUPLIKAT'),
(9,  'DUPLIKAT NOTICE',                   'DUPLIKAT'),
(10, 'GANTI ALAMAT',                      'GANTI'),
(11, 'GANTI NO KENDARAAN',                'GANTI'),
(12, 'GANTI WARNA',                       'GANTI'),
(13, 'GANTI WARNA PLAT',                  'GANTI'),
(14, 'GANTI MESIN',                       'GANTI'),
(15, 'TAMBAHAN PAJAK',                    'KOREKSI'),
(16, 'RUBAH BENTUK',                      'KOREKSI'),
(17, 'HIBAH / WARISAN',                   'TRANSFER'),
(18, 'EKS BADAN PEMERINTAH',              'EKS_BADAN'),
(19, 'EKS BADAN PENYALUR',                'EKS_BADAN'),
(20, 'EKS DUMP TNI/POLISI',               'EKS_BADAN'),
(21, 'STNK/PLAT NOMOR RAHASIA',           'KHUSUS'),
(22, 'DUMP/LELANG PEMERINTAH',            'KHUSUS')
ON CONFLICT (id_layanan) DO UPDATE SET
  nama_layanan = EXCLUDED.nama_layanan,
  kategori = EXCLUDED.kategori;


-- =============================================================================
-- 5. FACT TABLES (transaksi_fact only — registry_enriched assumed exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gold.transaksi_fact (
  transaksi_id            BIGINT PRIMARY KEY,
  paid_on                 TIMESTAMPTZ NOT NULL,
  vehicle_bucket          TEXT,                 -- masked nopol
  kabupaten_id            INT REFERENCES gold.dim_kabupaten(kabupaten_id),
  upt_id                  INT REFERENCES gold.dim_upt(upt_id),
  kode_jenken             TEXT REFERENCES gold.dim_jenken(kode_jenken),
  id_layanan              INT REFERENCES gold.dim_layanan(id_layanan),

  pokok_pkb               NUMERIC(12,0),
  tunggakan_pokok_pkb     NUMERIC(12,0),
  pokok_bbnkb             NUMERIC(12,0),
  pokok_swdkllj           NUMERIC(12,0),
  tunggakan_pokok_swdkllj NUMERIC(12,0),
  denda_swdkllj           NUMERIC(12,0),
  tunggakan_denda_swdkllj NUMERIC(12,0),
  total_amount            NUMERIC(12,0),

  loaded_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 6. MATERIALIZED VIEWS (gold_plus.*)
-- Note: These reference gold.registry_enriched yang assumed sudah ada.
-- Akan empty sampai data registry_enriched ter-load.
-- =============================================================================

-- 6.1 agg_segmen_kabupaten — Distribution per (segmen × kabupaten)
-- -----------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS gold_plus.agg_segmen_kabupaten AS
SELECT
  r.segmen_kepatuhan,
  k.tipologi_wilayah,
  k.nama_kabupaten,
  COUNT(*) AS n_kendaraan,
  ROUND(SUM(CASE WHEN j.is_motor THEN 1 ELSE 0 END)::NUMERIC / COUNT(*), 4) AS pct_motor,
  ROUND(SUM(CASE WHEN r.has_phone THEN 1 ELSE 0 END)::NUMERIC / COUNT(*), 4) AS pct_punya_hp,
  ROUND(AVG(j.est_pkb_per_kendaraan)::NUMERIC, 0) AS rata_pkb_per_kendaraan,
  SUM(j.est_pkb_per_kendaraan)::NUMERIC(14,0) AS total_potensi_pkb,
  AVG(GREATEST(r.durasi_tunggakan_days, 0))::INT AS rata_hari_tunggakan
FROM gold.registry_enriched r
JOIN gold.dim_kabupaten k ON r.kabupaten_id = k.kabupaten_id
LEFT JOIN gold.dim_jenken j ON r.kode_jenken = j.kode_jenken
GROUP BY 1, 2, 3
WITH NO DATA;

-- Index untuk concurrent refresh + query
CREATE UNIQUE INDEX IF NOT EXISTS idx_agg_segmen_kab
  ON gold_plus.agg_segmen_kabupaten(segmen_kepatuhan, nama_kabupaten);


-- 6.2 agg_segmen_jenken — Distribution per (segmen × jenis kendaraan)
-- -----------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS gold_plus.agg_segmen_jenken AS
SELECT
  r.segmen_kepatuhan,
  j.jenis_kendaraan,
  j.kode_jenken,
  COUNT(*) AS jumlah,
  AVG(j.est_pkb_per_kendaraan)::NUMERIC(12,0) AS est_pkb_per_kendaraan,
  ROUND(SUM(CASE WHEN r.has_phone THEN 1 ELSE 0 END)::NUMERIC / COUNT(*), 4) AS pct_punya_hp,
  AVG(r.usia_kendaraan)::FLOAT AS rata_usia,
  ROUND(COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER (PARTITION BY r.segmen_kepatuhan), 4) AS pct_volume
FROM gold.registry_enriched r
LEFT JOIN gold.dim_jenken j ON r.kode_jenken = j.kode_jenken
GROUP BY 1, 2, 3
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agg_segmen_jen
  ON gold_plus.agg_segmen_jenken(segmen_kepatuhan, kode_jenken);


-- 6.3 agg_revenue_monthly_kabupaten — Revenue per kabupaten per bulan (transaksi)
-- -----------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS gold_plus.agg_revenue_monthly_kabupaten AS
SELECT
  DATE_TRUNC('month', t.paid_on)::DATE AS month,
  k.nama_kabupaten,
  k.tipologi_wilayah,
  COUNT(*) AS n_transaksi,
  SUM(t.total_amount)::NUMERIC(14,0) AS total_revenue,
  SUM(t.pokok_pkb)::NUMERIC(14,0) AS pokok_pkb,
  SUM(t.pokok_swdkllj)::NUMERIC(14,0) AS pokok_swdkllj,
  SUM(t.tunggakan_pokok_swdkllj)::NUMERIC(14,0) AS tunggakan_swdkllj,
  SUM(t.denda_swdkllj)::NUMERIC(14,0) AS denda_swdkllj
FROM gold.transaksi_fact t
JOIN gold.dim_kabupaten k ON t.kabupaten_id = k.kabupaten_id
GROUP BY 1, 2, 3
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agg_revenue_monthly
  ON gold_plus.agg_revenue_monthly_kabupaten(month, nama_kabupaten);


-- =============================================================================
-- 7. KB TABLES (kb.*) — pgvector + few_shot
-- =============================================================================

-- 7.1 kb.reference_docs — Reference docs dengan vector embeddings
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kb.reference_docs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL,         -- e.g., 'framework_v1.4_kerangka', 'paper_saptono_khozen'
  category        TEXT,                  -- e.g., 'segmen_definition', 'treatment', 'anti_pattern'
  chunk_text      TEXT NOT NULL,
  chunk_metadata  JSONB DEFAULT '{}',
  embedding       VECTOR(1536),          -- OpenAI text-embedding-3-small
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reference_docs_source ON kb.reference_docs(source);
CREATE INDEX IF NOT EXISTS idx_reference_docs_category ON kb.reference_docs(category);
CREATE INDEX IF NOT EXISTS idx_reference_docs_embedding
  ON kb.reference_docs USING hnsw (embedding vector_cosine_ops);


-- 7.2 kb.few_shot — Question→reasoning→answer examples
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kb.few_shot (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT NOT NULL,
  question        TEXT NOT NULL,
  reasoning       TEXT,
  expected_answer TEXT NOT NULL,
  embedding       VECTOR(1536),
  approved        BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_few_shot_category ON kb.few_shot(category);
CREATE INDEX IF NOT EXISTS idx_few_shot_embedding
  ON kb.few_shot USING hnsw (embedding vector_cosine_ops);


-- =============================================================================
-- 8. AUDIT & LINEAGE (public.batch_manifest)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.batch_manifest (
  batch_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file_name      TEXT NOT NULL,
  source_period         TEXT NOT NULL,
  raw_md5_checksum      TEXT,
  raw_row_count         INT,
  loaded_row_count      INT,
  loaded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                TEXT NOT NULL CHECK (status IN ('uploading','loaded','failed','rolled_back','cancelled')),
  notes                 TEXT
);

CREATE INDEX IF NOT EXISTS idx_batch_manifest_status ON public.batch_manifest(status);
CREATE INDEX IF NOT EXISTS idx_batch_manifest_loaded_at ON public.batch_manifest(loaded_at DESC);


-- =============================================================================
-- 9. RPC FUNCTIONS
-- =============================================================================

-- 9.1 kb.search_docs — Similarity search untuk RAG (dipanggil Galen specialist)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION kb.search_docs(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count     INT DEFAULT 5,
  source_filter   TEXT DEFAULT NULL
)
RETURNS TABLE (
  source         TEXT,
  category       TEXT,
  chunk_text     TEXT,
  chunk_metadata JSONB,
  similarity     FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    source,
    category,
    chunk_text,
    chunk_metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM kb.reference_docs
  WHERE
    embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
    AND (source_filter IS NULL OR source = source_filter)
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;


-- 9.2 kb.search_few_shot — Similar few-shot examples untuk in-context learning
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION kb.search_few_shot(
  query_embedding VECTOR(1536),
  match_count     INT DEFAULT 3
)
RETURNS TABLE (
  category        TEXT,
  question        TEXT,
  reasoning       TEXT,
  expected_answer TEXT,
  similarity      FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    category, question, reasoning, expected_answer,
    1 - (embedding <=> query_embedding) AS similarity
  FROM kb.few_shot
  WHERE embedding IS NOT NULL AND approved = TRUE
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;


-- 9.3 public.classify_vehicle_segment — Ad-hoc classification (untuk single vehicle)
-- -----------------------------------------------------------------------------
-- Note: Untuk bulk classification, dilakukan di Python loader sebelum upload.
-- Function ini berguna untuk one-off lookup dari Edge Functions / SQL queries.

CREATE OR REPLACE FUNCTION public.classify_vehicle_segment(
  p_sd_notice          DATE,
  p_tanggal_transaksi  DATE,
  p_thn_buat           INT,
  p_reference_date     DATE DEFAULT '2025-05-01'
)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    -- Out-of-pyramid (priority)
    WHEN p_tanggal_transaksi IS NULL
         AND (EXTRACT(YEAR FROM p_reference_date) - p_thn_buat) <= 15
      THEN 'S1'
    WHEN p_tanggal_transaksi IS NULL
         AND (EXTRACT(YEAR FROM p_reference_date) - p_thn_buat) > 15
      THEN 'S2'

    -- In-pyramid (durasi-based)
    WHEN p_sd_notice IS NULL OR (p_reference_date - p_sd_notice) <= 0
      THEN 'H1'
    WHEN (p_reference_date - p_sd_notice) BETWEEN 1 AND 90
      THEN 'K1'
    WHEN (p_reference_date - p_sd_notice) BETWEEN 91 AND 365
      THEN 'O1'
    WHEN (p_reference_date - p_sd_notice) BETWEEN 366 AND 730
      THEN 'M1'
    WHEN (p_reference_date - p_sd_notice) BETWEEN 731 AND 1825
      THEN 'M2'

    -- Edge case: tunggakan >5 thn
    WHEN (p_reference_date - p_sd_notice) > 1825
         AND (EXTRACT(YEAR FROM p_reference_date) - p_thn_buat) < 20
      THEN 'M2'
    WHEN (p_reference_date - p_sd_notice) > 1825
         AND (EXTRACT(YEAR FROM p_reference_date) - p_thn_buat) >= 20
      THEN 'S2'

    ELSE 'unclassified'
  END;
$$;


-- 9.4 public.refresh_all_mvs — Helper untuk refresh semua MV setelah data load
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_all_mvs()
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW gold_plus.agg_segmen_kabupaten;
  REFRESH MATERIALIZED VIEW gold_plus.agg_segmen_jenken;
  REFRESH MATERIALIZED VIEW gold_plus.agg_revenue_monthly_kabupaten;
  RAISE NOTICE 'All materialized views refreshed';
END;
$$;


-- =============================================================================
-- 10. INDEXES (additional, non-vector)
-- =============================================================================

-- transaksi_fact indexes
CREATE INDEX IF NOT EXISTS idx_transaksi_paid_on
  ON gold.transaksi_fact(paid_on);
CREATE INDEX IF NOT EXISTS idx_transaksi_kabupaten
  ON gold.transaksi_fact(kabupaten_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_jenken
  ON gold.transaksi_fact(kode_jenken);


-- =============================================================================
-- 11. COMMENTS (documentation)
-- =============================================================================

COMMENT ON TABLE  ref.segmen IS '7-segmen definitions per framework v1.4 Sheet 1';
COMMENT ON TABLE  ref.treatment_lookup IS 'Treatment recommendation per segmen — Sheet 3';
COMMENT ON TABLE  ref.program_sadar IS '9 SADAR programs catalog — Sheet 5';
COMMENT ON TABLE  ref.raci_matrix IS 'RACI per aksi kunci × stakeholder — Sheet 4';
COMMENT ON TABLE  ref.revenue_scenario IS 'Konservatif/Moderat/Optimis scenarios — Sheet 6';

COMMENT ON TABLE  gold.dim_kabupaten IS 'Master 14 kab/kota Kalteng + tipologi';
COMMENT ON TABLE  gold.dim_jenken IS 'Master jenis kendaraan + avg PKB dari Sheet 7';
COMMENT ON TABLE  gold.transaksi_fact IS 'Raw transaksi 2025 (optional, for revenue analysis)';

COMMENT ON MATERIALIZED VIEW gold_plus.agg_segmen_kabupaten IS 'Pre-aggregated for fast Galen queries';

COMMENT ON TABLE  kb.reference_docs IS 'Reference docs dengan pgvector embeddings (RAG source)';
COMMENT ON TABLE  kb.few_shot IS 'Q→reasoning→answer examples untuk in-context learning';

COMMENT ON FUNCTION kb.search_docs IS 'Similarity search RAG — dipanggil Galen via Edge Functions';
COMMENT ON FUNCTION public.classify_vehicle_segment IS 'Ad-hoc single-vehicle classification (bulk dilakukan di Python loader)';


-- =============================================================================
-- 12. VERIFICATION QUERIES
-- Run setelah file ini selesai untuk confirm setup OK
-- =============================================================================

-- 12.1 Schemas exist
-- SELECT schema_name FROM information_schema.schemata
-- WHERE schema_name IN ('gold','gold_plus','ref','kb');
-- Expected: 4 rows

-- 12.2 Reference data populated
-- SELECT COUNT(*) FROM ref.segmen;            -- expect 7
-- SELECT COUNT(*) FROM ref.treatment_lookup;  -- expect 7
-- SELECT COUNT(*) FROM ref.program_sadar;     -- expect 9
-- SELECT COUNT(*) FROM ref.raci_matrix;       -- expect 47
-- SELECT COUNT(*) FROM ref.revenue_scenario;  -- expect 15

-- 12.3 Dimensions populated
-- SELECT COUNT(*) FROM gold.dim_kabupaten;    -- expect 14
-- SELECT COUNT(*) FROM gold.dim_upt;          -- expect 2 (PR only seed)
-- SELECT COUNT(*) FROM gold.dim_jenken;       -- expect 8
-- SELECT COUNT(*) FROM gold.dim_layanan;      -- expect 22

-- 12.4 KB schemas ready (will be populated after embed_kb.py runs)
-- SELECT COUNT(*) FROM kb.reference_docs;     -- expect 0 saat ini, akan ada setelah embed
-- SELECT COUNT(*) FROM kb.few_shot;           -- expect 0 saat ini, akan ada setelah load

-- 12.5 Test classification function
-- SELECT public.classify_vehicle_segment(
--   '2024-01-15'::DATE,  -- sd_notice
--   '2023-01-10'::DATE,  -- tanggal_transaksi
--   2018                  -- thn_buat
-- );
-- Expected: 'M1'

-- 12.6 Refresh MVs (akan kosong sampai registry_enriched ter-load)
-- SELECT public.refresh_all_mvs();

-- =============================================================================
-- DONE. Next steps:
--   1. Verify reference data (queries di atas)
--   2. Load registry_enriched (kalau belum) via Python loader
--   3. Refresh MVs: SELECT public.refresh_all_mvs();
--   4. Embed KB: run embed_kb.py untuk populate kb.reference_docs + kb.few_shot
-- =============================================================================

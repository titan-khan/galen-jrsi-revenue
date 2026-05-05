-- =============================================================================
-- JR PILOT — Reference Data Seed
-- Run AFTER 01_schema.sql
-- =============================================================================

-- =============================================================================
-- TREATMENT LOOKUP per Segmen (from Sheet 3 — Strategi & Program SADAR)
-- =============================================================================

INSERT INTO ref.treatment_lookup VALUES
('H1', 'Retensi dan pencegahan — mempertahankan kepatuhan dan mencegah pergeseran ke segmen K1.',
 'WhatsApp otomatis',
 'Pengingat ramah pada 30, 14, dan 7 hari sebelum jatuh tempo. Bahasa daerah (Dayak/Banjar). Tautan pembayaran + jadwal SAMSAT.',
 'TIDAK ADA AMNESTI. Justru perlu dihargai. Pertimbangkan loyalitas: sertifikat digital, pengurangan pajak tahun berikutnya untuk early payment, manfaat keselamatan JR.',
 'Jalankan alur WhatsApp otomatis terpicu sd_notice. Pantau read-rate, click-rate, conversion. Identifikasi WP progresif dengan multi-kendaraan.',
 'Tinggi (85-95%)'
),
('K1', 'Pemulihan cepat — mengembalikan kepatuhan sebelum denda terakumulasi.',
 'WhatsApp lalu SMS sebagai cadangan',
 'Mendesak tetapi tidak menghakimi. Sampaikan denda masih kecil dan masih bisa dihindari peningkatannya. Tautan pembayaran + jadwal SAMSAT Keliling.',
 'TIDAK ADA AMNESTI. Denda < 90 hari masih kecil dan berfungsi sebagai pendorong alami. Menghapus denda = menghilangkan insentif tepat waktu.',
 'WhatsApp minggu pertama setelah jatuh tempo. Tindak lanjut hari 30 dan 60 dengan urgensi naik. SMS pada hari 45 untuk yang tidak respond. Analisis konversi per gelombang.',
 'Tinggi (60-75%)'
),
('O1', 'Keterlibatan kembali — menarik wajib pajak sebelum pola perilaku mengeras menjadi kronis.',
 'WhatsApp bertahap, SMS, pemberitahuan kedekatan SAMSAT Keliling',
 'Gabungan urgensi + kemudahan akses. Tampilkan akumulasi denda yang bertumbuh personal. Tawarkan kenyamanan: jadwal/lokasi SAMSAT Keliling terdekat.',
 'TIDAK ADA AMNESTI. Denda 3-12 bulan masih seimbang dengan pelanggaran. Amnesti dini = bahaya moral untuk H1 dan K1. Intervensi: kurangi hambatan, bukan kewajiban.',
 'Kampanye WhatsApp 3 pesan dalam 6 minggu. Selaraskan jadwal Keliling dengan kecamatan kepadatan tinggi. Pemberitahuan berbasis lokasi. Integrasi data ETLE.',
 'Sedang (35-50%)'
),
('M1', 'Pengurangan hambatan — mengatasi akumulasi denda yang sudah jadi penghalang finansial.',
 'WhatsApp, surat tagihan fisik, SAMSAT Keliling',
 'Akui jeda pembayaran tanpa menyalahkan. Mulai dari solusi, bukan teguran. Personalisasi perhitungan denda per kendaraan.',
 'AMNESTI PARSIAL — pengurangan denda PKB 50-75%. Denda SWDKLLJ proporsional. Pokok PKB+SWDKLLJ tetap penuh. 60 hari, satu kali. Pada 1-2 tahun denda bisa setara/lebih dari pokok.',
 'Regulasi amnesti parsial. Hasilkan perhitungan individual. Kampanye WhatsApp bertarget. Surat tagihan fisik penguat. Aktivasi Duta Pajak (Hayak Bahayau / Huma Betang Mahaga).',
 'Sedang (25-40%)'
),
('M2', 'Pemulihan pendapatan — memaksimalkan penagihan dari basis besar via amnesti terstruktur + penegakan pasca-amnesti.',
 'WhatsApp (71% terjangkau), surat fisik, kelurahan/RT-RW, razia pasca-amnesti',
 'Langsung dan transaksional. Sampaikan program penghapusan denda dengan deadline. Cukup bayar pokok. Insentif finansial tegas, bukan himbauan emosional.',
 'AMNESTI PENUH DENDA — semua denda PKB+SWDKLLJ dihapus. Tunggakan pokok historis dapat dinegosiasi (bayar tahun berjalan + 1 tahun belakang). 90 hari, satu kali. WAJIB diikuti razia pasca-amnesti.',
 'Regulasi amnesti penuh denda. Kampanye WA massal ke 71%. Koordinasi kelurahan untuk 29% offline. SAMSAT Keliling di area konsentrasi. ETLE deteksi yang masih beroperasi. "Tidak Bayar = Tidak Ada BBM" untuk kendaraan dinas. Rencana razia pasca-amnesti.',
 'Rendah-Sedang (15-30%)'
),
('S1', 'Memasukkan ke dalam sistem — bawa kendaraan tidak terdaftar ke sistem formal untuk pertama kalinya.',
 'Berbasis komunitas: SAMSAT Keliling, RT/RW, kampanye kelurahan',
 'Edukatif, bukan menghukum. Banyak pemilik tidak paham kewajiban / yakin kendaraan bukan atas namanya. Jelaskan proses sederhana — balik nama bisa di SAMSAT Keliling.',
 'PENGURANGAN BEA BALIK NAMA (BBNKB) — pengurangan/penghapusan untuk dorong registrasi formal. Denda tidak berlaku (belum pernah ada kewajiban PKB sebelumnya). Penghalang: biaya BBNKB, bukan denda. Setiap konversi = aliran pendapatan baru berulang.',
 'Regulasi pengurangan BBNKB 90 hari (selaras M2). Identifikasi titik konsentrasi via koordinasi kelurahan. SAMSAT Keliling dengan kemampuan balik nama. Spanduk + Duta Pajak. BRILink, PT POS, BUMDES sebagai titik layanan. Terminal luring-ke-daring untuk area tanpa sinyal.',
 'Rendah (10-20%)'
),
('S2', 'Kebersihan registrasi — verifikasi status dan bersihkan basis data. JANGAN buang anggaran kampanye untuk kendaraan tidak ada.',
 'TIDAK ADA KAMPANYE AKTIF — proses data internal saja',
 'TIDAK BERLAKU. Kendaraan ini tidak boleh menerima pesan kampanye. Mengirim pesan ke ghost vehicle merusak kredibilitas seluruh kampanye dan membuang sumber daya.',
 'TIDAK ADA AMNESTI. Yang diperlukan: verifikasi registrasi (cross-match Polri/Ditlantas), penandaan untuk verifikasi fisik saat razia, atau penghapusan data untuk yang konfirmasi tidak aktif >5 tahun.',
 'Tandai massal untuk peninjauan registrasi. Pemberitahuan administratif terakhir surat fisik (90 hari respond). Yang tidak respond → arsip/hapus. Yang respond → reklasifikasi ke M2 atau S1.',
 'Tidak berlaku — tujuannya kualitas data');

-- =============================================================================
-- 9 PROGRAM SADAR (from Sheet 5 — Indeks Program SADAR)
-- =============================================================================

INSERT INTO ref.program_sadar (nama, deskripsi, segmen_sasaran, pemangku_kepentingan, tipologi_wilayah) VALUES
('Pengingat Prediktif via Gateway WhatsApp',
 'Pengiriman pengingat pembayaran proaktif via WhatsApp dan SMS. Personalisasi berdasarkan profil risiko dari riwayat transaksi. Pemicu otomatis berdasar tanggal jatuh tempo. Bahasa daerah untuk kedekatan emosional.',
 ARRAY['H1','K1','O1','M1','M2'],
 ARRAY['Jasa Raharja','Vendor TI'],
 ARRAY['Pusat Urban','Hub Industri']),

('Program Loyalitas dan Insentif',
 'Penghargaan bagi WP patuh konsisten. Sertifikat digital "Wajib Pajak Taat", pengurangan pajak tahun berikutnya untuk early payment, manfaat keselamatan JR. Membangun hubungan positif WP-otoritas.',
 ARRAY['H1'],
 ARRAY['Jasa Raharja','Bapenda'],
 ARRAY['Pusat Urban','Hub Industri','Wilayah Hinterland']),

('Penempatan Layanan Dinamis (SAMSAT Keliling)',
 'Optimalisasi lokasi/jadwal Keliling berdasar distribusi geografis kendaraan menunggak. Layanan keliling konvensional + mandiri + integrasi BUMDES, koperasi, BRILink, PT POS.',
 ARRAY['O1','M1','M2','S1'],
 ARRAY['SAMSAT','Bapenda'],
 ARRAY['Pusat Urban','Hub Industri','Wilayah Hinterland']),

('Mobil Pajak Keliling Multi-Layanan',
 'Transformasi mobil pajak keliling menjadi unit multi-layanan: pembayaran pajak + kesehatan/kependudukan. Terminal pembayaran luring-ke-daring untuk area tanpa sinyal.',
 ARRAY['S1','O1'],
 ARRAY['SAMSAT','Kelurahan'],
 ARRAY['Wilayah Hinterland']),

('Amnesti Pajak Bertarget',
 'Program amnesti spesifik per segmen. M1: parsial 50-75%. M2: penuh denda. S1: pengurangan BBNKB. Selalu berbatas waktu. Tidak pernah blanket. Wajib diikuti penegakan setelah deadline.',
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
 ARRAY['M1','M2'],  -- terutama untuk fleet
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
 ARRAY['Pusat Urban','Hub Industri','Wilayah Hinterland']);

-- =============================================================================
-- RACI MATRIX (from Sheet 4 — RACI per Aksi Kunci)
-- =============================================================================
-- Selected high-priority actions per segmen

INSERT INTO ref.raci_matrix (segmen_kode, aksi_kunci, jasa_raharja, bapenda, samsat, polri, kelurahan, vendor_ti) VALUES
-- H1
('H1', 'Konfigurasi alur pengingat WhatsApp otomatis', 'C', 'A', 'I', NULL, NULL, 'R'),
('H1', 'Kirim pengingat perpanjangan via WhatsApp', NULL, 'I', 'I', NULL, NULL, 'R'),
('H1', 'Personalisasi pesan menggunakan bahasa daerah', 'R', 'A', 'C', NULL, NULL, 'C'),
('H1', 'Evaluasi program loyalitas (sertifikat + manfaat keselamatan)', 'A', 'C', 'C', NULL, NULL, NULL),

-- K1
('K1', 'Hasilkan daftar kontak tunggakan <90 hari + nomor HP', 'R', 'C', 'I', NULL, NULL, 'C'),
('K1', 'Kirim WhatsApp massal minggu pertama setelah jatuh tempo', NULL, 'I', 'I', NULL, NULL, 'R'),
('K1', 'Tindak lanjut WhatsApp hari 30 dan 60 dengan urgensi naik', NULL, 'I', 'I', NULL, NULL, 'R'),
('K1', 'Alihkan ke SMS hari 45 bagi yang tidak respond', NULL, 'I', 'I', NULL, NULL, 'R'),

-- O1
('O1', 'Rancang kampanye WhatsApp bertahap 3 pesan dalam 6 minggu', 'R', 'A', 'C', NULL, NULL, 'C'),
('O1', 'Selaraskan jadwal SAMSAT Keliling dengan konsentrasi O1', 'I', 'A', 'R', NULL, 'C', NULL),
('O1', 'Pemberitahuan berbasis lokasi saat Keliling dekat penerima', NULL, 'I', 'C', NULL, NULL, 'R'),
('O1', 'Integrasi data ETLE untuk identifikasi kendaraan beroperasi', 'I', 'C', 'C', 'R', NULL, 'C'),

-- M1
('M1', 'Rancang regulasi amnesti parsial 50-75% (deadline 60 hari)', 'C', 'A', 'C', NULL, 'I', NULL),
('M1', 'Hasilkan perhitungan denda individual untuk WhatsApp', 'R', 'C', 'I', NULL, NULL, 'C'),
('M1', 'Kirim kampanye WhatsApp bertarget dengan kewajiban personal', NULL, 'I', 'I', NULL, NULL, 'R'),
('M1', 'Cetak dan distribusikan surat tagihan fisik', NULL, 'A', 'R', NULL, 'C', NULL),
('M1', 'Aktivasi Duta Pajak (Hayak Bahayau / Huma Betang Mahaga)', 'I', 'C', 'R', NULL, 'A', NULL),

-- M2
('M2', 'Rancang regulasi amnesti penuh denda (deadline 90 hari)', 'C', 'A', 'C', 'C', NULL, NULL),
('M2', 'Kampanye WA massal ke 71% kendaraan terjangkau digital', NULL, 'I', 'I', NULL, NULL, 'R'),
('M2', 'Koordinasi kelurahan/RT-RW untuk penjangkauan 29% offline', 'I', 'C', 'R', NULL, 'A', NULL),
('M2', 'Tempatkan SAMSAT Keliling di area konsentrasi tertinggi', 'I', 'A', 'R', NULL, 'C', NULL),
('M2', 'Integrasi ETLE deteksi M2 yang masih beroperasi', 'I', 'C', 'C', 'R', NULL, 'C'),
('M2', 'Kebijakan "Tidak Bayar = Tidak Ada BBM" untuk kendaraan dinas', 'I', 'A', 'C', 'C', NULL, NULL),
('M2', 'Razia + tilang pasca-amnesti', 'I', 'I', 'C', 'R', NULL, NULL),

-- S1
('S1', 'Regulasi pengurangan BBNKB untuk registrasi pertama', 'C', 'A', 'C', 'C', NULL, NULL),
('S1', 'Identifikasi titik konsentrasi via koordinasi kelurahan', 'I', 'C', 'C', NULL, 'R', NULL),
('S1', 'SAMSAT Keliling dengan kapabilitas balik nama langsung', 'I', 'A', 'R', 'C', 'C', NULL),
('S1', 'Kampanye komunitas via spanduk, RT/RW, Duta Pajak', 'I', 'C', 'R', NULL, 'A', NULL),
('S1', 'Libatkan BRILink, PT POS, BUMDES sebagai titik layanan', 'C', 'A', 'R', NULL, 'C', NULL),

-- S2
('S2', 'Tandai massal untuk peninjauan registrasi internal', NULL, 'A', 'R', 'C', NULL, NULL),
('S2', 'Pemberitahuan administratif terakhir (90 hari respond)', NULL, 'A', 'R', NULL, NULL, NULL),
('S2', 'Cross-match data Polri/Ditlantas', NULL, 'C', 'C', 'R', NULL, NULL),
('S2', 'Reklasifikasi yang merespond ke M2 atau S1', 'R', 'A', 'I', NULL, 'I', NULL);

-- =============================================================================
-- REVENUE PROJECTION SCENARIO (from Sheet 6 — Konservatif)
-- =============================================================================

INSERT INTO ref.revenue_scenario (segmen_kode, konversi_pct, est_pendapatan_idr, scenario_label) VALUES
-- Conservative (recommended)
('K1', 0.60, 10800604714, 'Konservatif'),
('O1', 0.35,  5005847081, 'Konservatif'),
('M1', 0.25,  2446328598, 'Konservatif'),
('M2', 0.15,  5091725071, 'Konservatif'),
('S1', 0.10,   199989899, 'Konservatif'),
-- Moderate (mid-range targets)
('K1', 0.70, 12600794293, 'Moderat'),
('O1', 0.45,  6435929817, 'Moderat'),
('M1', 0.35,  3424070430, 'Moderat'),
('M2', 0.25,  8486569670, 'Moderat'),
('S1', 0.15,   299984849, 'Moderat'),
-- Optimistic
('K1', 0.75, 13501013272, 'Optimis'),
('O1', 0.50,  7151582575, 'Optimis'),
('M1', 0.40,  3914360266, 'Optimis'),
('M2', 0.30, 10183811359, 'Optimis'),
('S1', 0.20,   400168025, 'Optimis');

-- =============================================================================
-- DIM_JENKEN seed (with avg PKB from Sheet 7)
-- =============================================================================

INSERT INTO gold.dim_jenken (kode_jenken, jenis_kendaraan, is_motor, est_pkb_per_kendaraan) VALUES
('R', 'SEPEDA MOTOR',  TRUE,   122712),
('C', 'MINIBUS',       FALSE, 1284741),
('F', 'PICK UP',       FALSE, 1301059),
('B', 'JEEP',          FALSE, 2316498),
('G', 'TRUCK DUMP',    FALSE, 2215921),
('H', 'LIGHT TRUCK',   FALSE, 1760474),
('S', 'SEDAN',         FALSE, 1103276),
('X', 'Lainnya',       FALSE, 1500000);

-- =============================================================================
-- Final verification queries
-- =============================================================================

-- Check segment definitions
-- SELECT * FROM ref.segmen ORDER BY kode;

-- Check treatment lookup completeness
-- SELECT s.kode, s.nama, t.kanal_utama, t.perkiraan_konversi
-- FROM ref.segmen s LEFT JOIN ref.treatment_lookup t ON s.kode = t.segmen_kode
-- ORDER BY s.kode;

-- Check program SADAR
-- SELECT program_id, nama, segmen_sasaran FROM ref.program_sadar ORDER BY program_id;

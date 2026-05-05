#!/usr/bin/env python3
"""
Generate CSV files untuk Supabase import.

Output: 11 CSV files yang dapat di-import via:
  - Supabase Studio → Table Editor → Import data via CSV
  - psql COPY command
  - Postgres `\\copy` meta-command

Note: KB CSVs tidak include embedding column (vector type).
After CSV import, run embed_kb.py untuk populate embedding.
"""

import csv
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent

# =============================================================================
# UTILITIES
# =============================================================================

def to_pg_array(items: list[str]) -> str:
    """Convert Python list → Postgres array literal: {a,b,c}."""
    escaped = [s.replace('"', '\\"') for s in items]
    return "{" + ",".join(escaped) + "}"


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]):
    """Write CSV dengan QUOTE_ALL untuk safety (handle multiline + special chars)."""
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=fieldnames,
            quoting=csv.QUOTE_ALL,
            lineterminator="\n"
        )
        writer.writeheader()
        writer.writerows(rows)
    print(f"  ✓ {path.name} ({len(rows)} rows)")


# =============================================================================
# 01. dim_kabupaten (14 kabupaten/kota Kalteng)
# =============================================================================

dim_kabupaten = [
    {"kabupaten_id": 6271, "nama_kabupaten": "PALANGKA RAYA",     "tipologi_wilayah": "Pusat Urban"},
    {"kabupaten_id": 6202, "nama_kabupaten": "SAMPIT",            "tipologi_wilayah": "Pusat Urban"},
    {"kabupaten_id": 6201, "nama_kabupaten": "PANGKALAN BUN",     "tipologi_wilayah": "Pusat Urban"},
    {"kabupaten_id": 6203, "nama_kabupaten": "KUALA KAPUAS",      "tipologi_wilayah": "Pusat Urban"},
    {"kabupaten_id": 6205, "nama_kabupaten": "MUARA TEWEH",       "tipologi_wilayah": "Hub Industri"},
    {"kabupaten_id": 6204, "nama_kabupaten": "BUNTOK",            "tipologi_wilayah": "Hub Industri"},
    {"kabupaten_id": 6206, "nama_kabupaten": "KASONGAN",          "tipologi_wilayah": "Wilayah Hinterland"},
    {"kabupaten_id": 6207, "nama_kabupaten": "NANGA BULIK",       "tipologi_wilayah": "Wilayah Hinterland"},
    {"kabupaten_id": 6208, "nama_kabupaten": "KUALA PEMBUANG",    "tipologi_wilayah": "Wilayah Hinterland"},
    {"kabupaten_id": 6209, "nama_kabupaten": "TAMIANG LAYANG",    "tipologi_wilayah": "Wilayah Hinterland"},
    {"kabupaten_id": 6210, "nama_kabupaten": "PULANG PISAU",      "tipologi_wilayah": "Wilayah Hinterland"},
    {"kabupaten_id": 6211, "nama_kabupaten": "KUALA KURUN",       "tipologi_wilayah": "Wilayah Hinterland"},
    {"kabupaten_id": 6212, "nama_kabupaten": "PURUK CAHU",        "tipologi_wilayah": "Wilayah Hinterland"},
    {"kabupaten_id": 6213, "nama_kabupaten": "SUKAMARA",          "tipologi_wilayah": "Wilayah Hinterland"},
]
write_csv(OUT / "01_dim_kabupaten.csv",
          ["kabupaten_id", "nama_kabupaten", "tipologi_wilayah"],
          dim_kabupaten)


# =============================================================================
# 02. dim_upt (PR seed only)
# =============================================================================

dim_upt = [
    {"upt_id": 2,  "upt_nama": "SAMSAT PALANGKA RAYA",           "kabupaten_id": 6271},
    {"upt_id": 44, "upt_nama": "SAMKEL PALANGKA RAYA (BIS)",     "kabupaten_id": 6271},
]
write_csv(OUT / "02_dim_upt.csv",
          ["upt_id", "upt_nama", "kabupaten_id"],
          dim_upt)


# =============================================================================
# 03. dim_jenken (8 jenis kendaraan + avg PKB dari Sheet 7)
# =============================================================================

dim_jenken = [
    {"kode_jenken": "R", "jenis_kendaraan": "SEPEDA MOTOR",  "is_motor": "TRUE",  "est_pkb_per_kendaraan": 122712},
    {"kode_jenken": "C", "jenis_kendaraan": "MINIBUS",       "is_motor": "FALSE", "est_pkb_per_kendaraan": 1284741},
    {"kode_jenken": "F", "jenis_kendaraan": "PICK UP",       "is_motor": "FALSE", "est_pkb_per_kendaraan": 1301059},
    {"kode_jenken": "B", "jenis_kendaraan": "JEEP",          "is_motor": "FALSE", "est_pkb_per_kendaraan": 2316498},
    {"kode_jenken": "G", "jenis_kendaraan": "TRUCK DUMP",    "is_motor": "FALSE", "est_pkb_per_kendaraan": 2215921},
    {"kode_jenken": "H", "jenis_kendaraan": "LIGHT TRUCK",   "is_motor": "FALSE", "est_pkb_per_kendaraan": 1760474},
    {"kode_jenken": "S", "jenis_kendaraan": "SEDAN",         "is_motor": "FALSE", "est_pkb_per_kendaraan": 1103276},
    {"kode_jenken": "X", "jenis_kendaraan": "Lainnya",       "is_motor": "FALSE", "est_pkb_per_kendaraan": 1500000},
]
write_csv(OUT / "03_dim_jenken.csv",
          ["kode_jenken", "jenis_kendaraan", "is_motor", "est_pkb_per_kendaraan"],
          dim_jenken)


# =============================================================================
# 04. dim_layanan (22 service types)
# =============================================================================

dim_layanan = [
    {"id_layanan": 1,  "nama_layanan": "PENDAFTARAN BARU",                  "kategori": "PENDAFTARAN"},
    {"id_layanan": 3,  "nama_layanan": "PENDAFTARAN ULANG 5 TAHUN",         "kategori": "PENDAFTARAN"},
    {"id_layanan": 42, "nama_layanan": "PENDAFTARAN ULANG",                 "kategori": "PENDAFTARAN"},
    {"id_layanan": 41, "nama_layanan": "MUTASI MASUK DALAM PROPINSI",       "kategori": "MUTASI"},
    {"id_layanan": 4,  "nama_layanan": "MUTASI MASUK LUAR PROPINSI",        "kategori": "MUTASI"},
    {"id_layanan": 5,  "nama_layanan": "MUTASI KELUAR DALAM PROPINSI",      "kategori": "MUTASI"},
    {"id_layanan": 6,  "nama_layanan": "MUTASI KELUAR LUAR PROPINSI",       "kategori": "MUTASI"},
    {"id_layanan": 7,  "nama_layanan": "JUAL BELI",                         "kategori": "TRANSFER"},
    {"id_layanan": 8,  "nama_layanan": "DUPLIKAT STNK",                     "kategori": "DUPLIKAT"},
    {"id_layanan": 9,  "nama_layanan": "DUPLIKAT NOTICE",                   "kategori": "DUPLIKAT"},
    {"id_layanan": 10, "nama_layanan": "GANTI ALAMAT",                      "kategori": "GANTI"},
    {"id_layanan": 11, "nama_layanan": "GANTI NO KENDARAAN",                "kategori": "GANTI"},
    {"id_layanan": 12, "nama_layanan": "GANTI WARNA",                       "kategori": "GANTI"},
    {"id_layanan": 13, "nama_layanan": "GANTI WARNA PLAT",                  "kategori": "GANTI"},
    {"id_layanan": 14, "nama_layanan": "GANTI MESIN",                       "kategori": "GANTI"},
    {"id_layanan": 15, "nama_layanan": "TAMBAHAN PAJAK",                    "kategori": "KOREKSI"},
    {"id_layanan": 16, "nama_layanan": "RUBAH BENTUK",                      "kategori": "KOREKSI"},
    {"id_layanan": 17, "nama_layanan": "HIBAH / WARISAN",                   "kategori": "TRANSFER"},
    {"id_layanan": 18, "nama_layanan": "EKS BADAN PEMERINTAH",              "kategori": "EKS_BADAN"},
    {"id_layanan": 19, "nama_layanan": "EKS BADAN PENYALUR",                "kategori": "EKS_BADAN"},
    {"id_layanan": 20, "nama_layanan": "EKS DUMP TNI/POLISI",               "kategori": "EKS_BADAN"},
    {"id_layanan": 21, "nama_layanan": "STNK/PLAT NOMOR RAHASIA",           "kategori": "KHUSUS"},
    {"id_layanan": 22, "nama_layanan": "DUMP/LELANG PEMERINTAH",            "kategori": "KHUSUS"},
]
write_csv(OUT / "04_dim_layanan.csv",
          ["id_layanan", "nama_layanan", "kategori"],
          dim_layanan)


# =============================================================================
# 05. ref_segmen (7 segmen definitions)
# =============================================================================

ref_segmen = [
    {
        "kode": "H1", "nama": "Patuh Aktif", "warna": "HIJAU",
        "kelas_pyramid": "Basis Patuh",
        "durasi_tunggakan": "Belum jatuh tempo",
        "profil_perilaku": "Wajib pajak yang disiplin. Membayar sebelum atau pada saat jatuh tempo. Kebiasaan sudah terbentuk dan stabil.",
        "posisi_pyramid_djp": "Basis pyramid — mau dan mampu. Intervensi: menjaga kepatuhan, bukan membangun kepatuhan baru.",
    },
    {
        "kode": "K1", "nama": "Baru Lewat Jatuh Tempo", "warna": "KUNING",
        "kelas_pyramid": "Goyah Awal",
        "durasi_tunggakan": "1-90 hari + ada riwayat",
        "profil_perilaku": "Lupa atau sibuk. Niat membayar masih ada. Akumulasi denda kecil dan belum jadi beban.",
        "posisi_pyramid_djp": "Peralihan dari patuh ke goyah. Pengingat ringan sudah cukup mengembalikan kepatuhan.",
    },
    {
        "kode": "O1", "nama": "Mulai Mengabaikan", "warna": "ORANYE",
        "kelas_pyramid": "Goyah Lanjut",
        "durasi_tunggakan": "91-365 hari + ada riwayat",
        "profil_perilaku": "Mulai lalai. Pajak tergeser dari prioritas. Mungkin kendala keuangan atau hilang urgensi. Denda mulai memberatkan.",
        "posisi_pyramid_djp": "Goyah menuju tidak mau. Diperlukan intervensi lebih dari sekadar pengingat — friksi perlu dikurangi.",
    },
    {
        "kode": "M1", "nama": "Tidak Patuh Pasif", "warna": "MERAH",
        "kelas_pyramid": "Tidak Mau Pasif",
        "durasi_tunggakan": "1-2 tahun + ada riwayat",
        "profil_perilaku": "Sudah ambil keputusan pasif untuk tidak membayar. Akumulasi denda jadi penghalang nyata — total kewajiban bisa mendekati atau melebihi pokok pajak.",
        "posisi_pyramid_djp": "Tidak mau pasif. Denda bukan lagi sekadar konsekuensi, melainkan tembok penghalang. Amnesti parsial dipertimbangkan.",
    },
    {
        "kode": "M2", "nama": "Tidak Patuh Kronis", "warna": "MERAH",
        "kelas_pyramid": "Tidak Mau Mengakar",
        "durasi_tunggakan": "2-5+ tahun + ada riwayat",
        "profil_perilaku": "Ketidakpatuhan mengakar. Denda 2-4× pokok pajak. Tanpa intervensi mendasar, kendaraan tidak akan kembali ke sistem.",
        "posisi_pyramid_djp": "Tidak mau mengakar. Amnesti penuh denda diperlukan sebagai satu-satunya pengungkit realistis.",
    },
    {
        "kode": "S1", "nama": "Belum Terdaftar", "warna": "ABU",
        "kelas_pyramid": "Luar Pyramid",
        "durasi_tunggakan": "Tidak pernah membayar (≤15 thn)",
        "profil_perilaku": "Pembelian tangan kedua tanpa balik nama. 97.5% sepeda motor. Hanya 2% punya nomor HP tercatat.",
        "posisi_pyramid_djp": "Di luar pyramid DJP — belum pernah masuk sistem. Penghalang utama: biaya & kerumitan balik nama, bukan denda.",
    },
    {
        "kode": "S2", "nama": "Kendaraan Hantu", "warna": "ABU",
        "kelas_pyramid": "Luar Pyramid",
        "durasi_tunggakan": "Tidak pernah membayar (>15 thn) atau >5 thn tunggakan + >20 thn usia",
        "profil_perilaku": "Diasumsikan sudah dibuang/rusak permanen/pindah wilayah tanpa mutasi. Hanya 19% punya HP.",
        "posisi_pyramid_djp": "Di luar pyramid — bukan target kampanye. Tindakan yang tepat: verifikasi registrasi & pembersihan data.",
    },
]
write_csv(OUT / "05_ref_segmen.csv",
          ["kode", "nama", "warna", "kelas_pyramid", "durasi_tunggakan", "profil_perilaku", "posisi_pyramid_djp"],
          ref_segmen)


# =============================================================================
# 06. ref_treatment_lookup (7 treatment per segmen)
# =============================================================================

ref_treatment_lookup = [
    {
        "segmen_kode": "H1",
        "tujuan_strategis": "Retensi dan pencegahan — pertahankan kepatuhan dan cegah pergeseran ke K1.",
        "kanal_utama": "WhatsApp otomatis (99.99% terjangkau)",
        "pesan_personalisasi": "Pengingat ramah pada 30/14/7 hari sebelum jatuh tempo. Bahasa daerah (Dayak/Banjar) untuk kedekatan emosional. Tautan pembayaran + jadwal SAMSAT.",
        "kebijakan_amnesti": "TIDAK ADA AMNESTI. Justru perlu dihargai. Pertimbangkan loyalitas: sertifikat digital Wajib Pajak Taat, pengurangan pajak tahun berikutnya untuk early payment, manfaat keselamatan JR.",
        "aksi_utama": "Alur WhatsApp otomatis terpicu sd_notice. Pantau read-rate, click-rate, conversion per gelombang. Identifikasi WP progresif dengan multi-kendaraan.",
        "perkiraan_konversi": "Tinggi (85-95%)",
    },
    {
        "segmen_kode": "K1",
        "tujuan_strategis": "Pemulihan cepat — kembalikan kepatuhan sebelum denda terakumulasi.",
        "kanal_utama": "WhatsApp + SMS sebagai cadangan",
        "pesan_personalisasi": "Mendesak tetapi tidak menghakimi. Sampaikan denda masih kecil dan masih bisa dihindari peningkatannya dengan bertindak segera. Tautan pembayaran + jadwal Keliling.",
        "kebijakan_amnesti": "TIDAK ADA AMNESTI. Denda <90 hari masih kecil dan berfungsi sebagai pendorong alami. Menghapus denda di tahap ini menghilangkan insentif tepat waktu.",
        "aksi_utama": "WhatsApp minggu pertama setelah jatuh tempo. Tindak lanjut hari 30 dan 60 dengan urgensi naik. SMS pada hari 45 untuk yang tidak respond. Analisis konversi per gelombang.",
        "perkiraan_konversi": "Tinggi (60-75%)",
    },
    {
        "segmen_kode": "O1",
        "tujuan_strategis": "Keterlibatan kembali — tarik WP sebelum pola perilaku mengeras menjadi kronis.",
        "kanal_utama": "WhatsApp bertahap + SMS + Pemberitahuan kedekatan SAMSAT Keliling",
        "pesan_personalisasi": "Gabungkan urgensi + kemudahan akses. Tampilkan akumulasi denda yang bertumbuh personal. Tawarkan kenyamanan: jadwal/lokasi Keliling terdekat dengan kecamatan penerima.",
        "kebijakan_amnesti": "TIDAK ADA AMNESTI. Denda 3-12 bulan masih seimbang dengan pelanggaran. Amnesti dini = bahaya moral untuk H1/K1. Intervensi yang tepat: kurangi hambatan, bukan kewajiban.",
        "aksi_utama": "Kampanye WhatsApp 3 pesan dalam 6 minggu. Selaraskan jadwal Keliling dengan kecamatan kepadatan tinggi. Pemberitahuan berbasis lokasi. Integrasi data ETLE.",
        "perkiraan_konversi": "Sedang (35-50%)",
    },
    {
        "segmen_kode": "M1",
        "tujuan_strategis": "Pengurangan hambatan — atasi akumulasi denda yang sudah jadi penghalang finansial.",
        "kanal_utama": "WhatsApp + Surat tagihan fisik + SAMSAT Keliling",
        "pesan_personalisasi": "Akui jeda pembayaran tanpa menyalahkan. Mulai dari solusi, bukan teguran. Personalisasi perhitungan denda per kendaraan secara transparan.",
        "kebijakan_amnesti": "AMNESTI PARSIAL — pengurangan denda PKB 50-75%. Denda SWDKLLJ proporsional. Pokok PKB+SWDKLLJ tetap penuh. 60 hari, satu kali. Pada 1-2 thn, denda bisa setara/melebihi pokok — pengurangan ini menurunkan ambang masuk kembali.",
        "aksi_utama": "Regulasi amnesti parsial 60 hari. Hasilkan perhitungan denda individual untuk WhatsApp. Cetak surat tagihan fisik penguat. Aktifkan Duta Pajak (Hayak Bahayau / Huma Betang Mahaga). Validasi setiap transaksi.",
        "perkiraan_konversi": "Sedang (25-40%)",
    },
    {
        "segmen_kode": "M2",
        "tujuan_strategis": "Pemulihan pendapatan — maksimalkan penagihan via amnesti terstruktur + penegakan pasca-amnesti.",
        "kanal_utama": "WhatsApp (71% terjangkau) + Surat fisik untuk 29% + Kelurahan/RT-RW + Razia pasca-amnesti",
        "pesan_personalisasi": "Langsung dan transaksional. Sampaikan program penghapusan denda dengan deadline dan cukup bayar pokok. Insentif finansial tegas, bukan himbauan emosional.",
        "kebijakan_amnesti": "AMNESTI PENUH DENDA — semua denda PKB+SWDKLLJ dihapus. Tunggakan pokok historis dapat dinegosiasi (bayar tahun berjalan + 1 tahun belakang). 90 hari, satu kali. WAJIB diikuti razia pasca-amnesti. Pada 2-5 thn denda 2-4× pokok — tanpa penghapusan, kendaraan tidak akan kembali ke sistem.",
        "aksi_utama": "Regulasi amnesti penuh denda 90 hari. WA massal ke 71%. Koordinasi kelurahan untuk 29% offline. Keliling di area konsentrasi. ETLE deteksi yang masih beroperasi. Tidak Bayar Pajak = Tidak Ada BBM untuk kendaraan dinas. Razia pasca-amnesti wajib.",
        "perkiraan_konversi": "Rendah-Sedang (15-30%)",
    },
    {
        "segmen_kode": "S1",
        "tujuan_strategis": "Memasukkan ke dalam sistem — bawa kendaraan tidak terdaftar ke registrasi formal pertama kalinya.",
        "kanal_utama": "Berbasis komunitas: SAMSAT Keliling + RT/RW + Kampanye kelurahan + Spanduk + Duta Pajak",
        "pesan_personalisasi": "Edukatif, bukan menghukum. Banyak pemilik tidak paham kewajiban / yakin kendaraan bukan atas namanya. Jelaskan proses sederhana — balik nama bisa di Keliling.",
        "kebijakan_amnesti": "PENGURANGAN BBNKB — pengurangan/penghapusan Bea Balik Nama untuk dorong registrasi formal. Denda tidak berlaku (belum pernah ada kewajiban PKB). Penghalang: biaya BBNKB. Setiap konversi = aliran pendapatan baru berulang. 90 hari, sync M2.",
        "aksi_utama": "Regulasi pengurangan BBNKB 90 hari (sync M2). Identifikasi titik konsentrasi via kelurahan. Keliling dengan kapabilitas balik nama langsung. Spanduk + Duta Pajak. Libatkan BRILink, PT POS, BUMDES sebagai titik layanan.",
        "perkiraan_konversi": "Rendah (10-20%)",
    },
    {
        "segmen_kode": "S2",
        "tujuan_strategis": "Kebersihan registrasi — verifikasi status dan bersihkan basis data. JANGAN buang anggaran kampanye.",
        "kanal_utama": "TIDAK ADA KAMPANYE — proses data internal saja",
        "pesan_personalisasi": "TIDAK BERLAKU. Kendaraan ini tidak boleh menerima pesan kampanye. Mengirim ke ghost vehicle merusak kredibilitas seluruh kampanye dan membuang anggaran.",
        "kebijakan_amnesti": "TIDAK ADA AMNESTI. Yang diperlukan: verifikasi registrasi (cross-match Polri/Ditlantas), penandaan untuk verifikasi fisik saat razia, atau penghapusan data untuk yang konfirmasi tidak aktif >5 tahun.",
        "aksi_utama": "Tandai massal untuk peninjauan registrasi. Pemberitahuan administratif terakhir surat fisik (90 hari respond). Yang tidak respond → arsip/hapus. Yang respond → reklasifikasi M2 atau S1.",
        "perkiraan_konversi": "Tidak berlaku — tujuan adalah kualitas data",
    },
]
write_csv(OUT / "06_ref_treatment_lookup.csv",
          ["segmen_kode", "tujuan_strategis", "kanal_utama", "pesan_personalisasi",
           "kebijakan_amnesti", "aksi_utama", "perkiraan_konversi"],
          ref_treatment_lookup)


# =============================================================================
# 07. ref_program_sadar (9 programs, with array fields)
# =============================================================================

ref_program_sadar = [
    {
        "program_id": 1,
        "nama": "Pengingat Prediktif via Gateway WhatsApp",
        "deskripsi": "Pengiriman pengingat pembayaran proaktif via WhatsApp dan SMS. Personalisasi berdasarkan profil risiko dari riwayat transaksi. Pemicu otomatis berdasar tanggal jatuh tempo. Bahasa daerah untuk kedekatan emosional.",
        "segmen_sasaran": to_pg_array(["H1","K1","O1","M1","M2"]),
        "pemangku_kepentingan": to_pg_array(["Jasa Raharja","Vendor TI"]),
        "tipologi_wilayah": to_pg_array(["Pusat Urban","Hub Industri"]),
    },
    {
        "program_id": 2,
        "nama": "Program Loyalitas dan Insentif",
        "deskripsi": "Penghargaan bagi WP patuh konsisten. Sertifikat digital Wajib Pajak Taat, pengurangan pajak tahun berikutnya untuk early payment, manfaat keselamatan JR.",
        "segmen_sasaran": to_pg_array(["H1"]),
        "pemangku_kepentingan": to_pg_array(["Jasa Raharja","Bapenda"]),
        "tipologi_wilayah": to_pg_array(["Pusat Urban","Hub Industri","Wilayah Hinterland"]),
    },
    {
        "program_id": 3,
        "nama": "Penempatan Layanan Dinamis (SAMSAT Keliling)",
        "deskripsi": "Optimalisasi lokasi/jadwal Keliling berdasar distribusi geografis kendaraan menunggak. Layanan keliling konvensional + mandiri + integrasi BUMDES, koperasi, BRILink, PT POS.",
        "segmen_sasaran": to_pg_array(["O1","M1","M2","S1"]),
        "pemangku_kepentingan": to_pg_array(["SAMSAT","Bapenda"]),
        "tipologi_wilayah": to_pg_array(["Pusat Urban","Hub Industri","Wilayah Hinterland"]),
    },
    {
        "program_id": 4,
        "nama": "Mobil Pajak Keliling Multi-Layanan",
        "deskripsi": "Transformasi mobil pajak keliling jadi unit multi-layanan: pajak + kesehatan/kependudukan. Terminal pembayaran luring-ke-daring untuk area tanpa sinyal.",
        "segmen_sasaran": to_pg_array(["S1","O1"]),
        "pemangku_kepentingan": to_pg_array(["SAMSAT","Kelurahan"]),
        "tipologi_wilayah": to_pg_array(["Wilayah Hinterland"]),
    },
    {
        "program_id": 5,
        "nama": "Amnesti Pajak Bertarget",
        "deskripsi": "Program amnesti spesifik per segmen. M1 parsial 50-75%. M2 penuh denda. S1 pengurangan BBNKB. Selalu berbatas waktu. Tidak pernah blanket. Wajib diikuti penegakan setelah deadline.",
        "segmen_sasaran": to_pg_array(["M1","M2","S1"]),
        "pemangku_kepentingan": to_pg_array(["Bapenda","SAMSAT"]),
        "tipologi_wilayah": to_pg_array(["Pusat Urban","Hub Industri","Wilayah Hinterland"]),
    },
    {
        "program_id": 6,
        "nama": "Kolaborasi Ekosistem",
        "deskripsi": "Aktivasi peran setiap lini: Polri via ETLE terintegrasi data pajak, Bapenda via Duta Pajak (Hayak Bahayau / Huma Betang Mahaga), JR via manfaat keselamatan, mitra dompet elektronik untuk skema cicilan.",
        "segmen_sasaran": to_pg_array(["O1","M1","M2","S1","S2"]),
        "pemangku_kepentingan": to_pg_array(["Jasa Raharja","Bapenda","SAMSAT","Polri","Kelurahan","Vendor TI"]),
        "tipologi_wilayah": to_pg_array(["Pusat Urban","Hub Industri","Wilayah Hinterland"]),
    },
    {
        "program_id": 7,
        "nama": "Kemitraan Korporat SAMSAT",
        "deskripsi": "Layanan pemeriksaan di lokasi perusahaan untuk armada perkebunan/pertambangan. Pemeriksaan massal + pembayaran kolektif. Label Perusahaan Taat Pajak sebagai komponen ESG.",
        "segmen_sasaran": to_pg_array(["M1","M2"]),
        "pemangku_kepentingan": to_pg_array(["SAMSAT","Bapenda"]),
        "tipologi_wilayah": to_pg_array(["Hub Industri"]),
    },
    {
        "program_id": 8,
        "nama": "Penegakan Hukum Berbasis Risiko",
        "deskripsi": "Razia/tilang diarahkan ke lokasi/kelompok dengan probabilitas tunggakan tertinggi. Bukan acak. Penargetan berbasis data untuk optimalkan sumber daya dan dampak pencegahan.",
        "segmen_sasaran": to_pg_array(["M2","S2"]),
        "pemangku_kepentingan": to_pg_array(["Polri","SAMSAT"]),
        "tipologi_wilayah": to_pg_array(["Pusat Urban","Hub Industri"]),
    },
    {
        "program_id": 9,
        "nama": "Audit Kepatuhan Kendaraan Dinas",
        "deskripsi": "Tidak Bayar Pajak Tidak Ada BBM: kendaraan dinas menunggak tidak dapat kuota BBM bersubsidi atau anggaran pemeliharaan APBD. Memberikan keteladanan ke masyarakat.",
        "segmen_sasaran": to_pg_array(["M2"]),
        "pemangku_kepentingan": to_pg_array(["Bapenda","Pemerintah Daerah"]),
        "tipologi_wilayah": to_pg_array(["Pusat Urban","Hub Industri","Wilayah Hinterland"]),
    },
]
write_csv(OUT / "07_ref_program_sadar.csv",
          ["program_id", "nama", "deskripsi", "segmen_sasaran", "pemangku_kepentingan", "tipologi_wilayah"],
          ref_program_sadar)


# =============================================================================
# 08. ref_raci_matrix (47 actions)
# =============================================================================

ref_raci_matrix = [
    # H1 (Patuh Aktif)
    {"raci_id": 1,  "segmen_kode": "H1", "aksi_kunci": "Konfigurasi alur pengingat WhatsApp otomatis (30/14/7 hari)", "jasa_raharja": "C", "bapenda": "A", "samsat": "I", "polri": "", "kelurahan": "", "vendor_ti": "R"},
    {"raci_id": 2,  "segmen_kode": "H1", "aksi_kunci": "Kirim pengingat perpanjangan via WhatsApp + tautan pembayaran", "jasa_raharja": "", "bapenda": "I", "samsat": "I", "polri": "", "kelurahan": "", "vendor_ti": "R"},
    {"raci_id": 3,  "segmen_kode": "H1", "aksi_kunci": "Personalisasi pesan dengan bahasa daerah", "jasa_raharja": "R", "bapenda": "A", "samsat": "C", "polri": "", "kelurahan": "", "vendor_ti": "C"},
    {"raci_id": 4,  "segmen_kode": "H1", "aksi_kunci": "Pantau read-rate, click-rate, conversion per gelombang", "jasa_raharja": "R", "bapenda": "A", "samsat": "I", "polri": "", "kelurahan": "", "vendor_ti": "C"},
    {"raci_id": 5,  "segmen_kode": "H1", "aksi_kunci": "Evaluasi program loyalitas (sertifikat + manfaat keselamatan)", "jasa_raharja": "A", "bapenda": "C", "samsat": "C", "polri": "", "kelurahan": "", "vendor_ti": ""},
    {"raci_id": 6,  "segmen_kode": "H1", "aksi_kunci": "Identifikasi WP progresif multi-kendaraan untuk penghargaan", "jasa_raharja": "R", "bapenda": "A", "samsat": "I", "polri": "", "kelurahan": "", "vendor_ti": "C"},

    # K1 (Baru Lewat Jatuh Tempo)
    {"raci_id": 7,  "segmen_kode": "K1", "aksi_kunci": "Hasilkan daftar kontak tunggakan <90 hari + nomor HP", "jasa_raharja": "R", "bapenda": "C", "samsat": "I", "polri": "", "kelurahan": "", "vendor_ti": "C"},
    {"raci_id": 8,  "segmen_kode": "K1", "aksi_kunci": "Kirim WhatsApp massal minggu 1 setelah jatuh tempo", "jasa_raharja": "", "bapenda": "I", "samsat": "I", "polri": "", "kelurahan": "", "vendor_ti": "R"},
    {"raci_id": 9,  "segmen_kode": "K1", "aksi_kunci": "Tindak lanjut WhatsApp hari 30 dan 60 dengan urgensi naik", "jasa_raharja": "", "bapenda": "I", "samsat": "I", "polri": "", "kelurahan": "", "vendor_ti": "R"},
    {"raci_id": 10, "segmen_kode": "K1", "aksi_kunci": "Alihkan ke SMS hari 45 bagi yang tidak respond", "jasa_raharja": "", "bapenda": "I", "samsat": "I", "polri": "", "kelurahan": "", "vendor_ti": "R"},
    {"raci_id": 11, "segmen_kode": "K1", "aksi_kunci": "Proses pembayaran via kanal digital", "jasa_raharja": "", "bapenda": "I", "samsat": "R", "polri": "", "kelurahan": "", "vendor_ti": ""},
    {"raci_id": 12, "segmen_kode": "K1", "aksi_kunci": "Analisis konversi per gelombang untuk tuning", "jasa_raharja": "R", "bapenda": "A", "samsat": "C", "polri": "", "kelurahan": "", "vendor_ti": "C"},

    # O1 (Mulai Mengabaikan)
    {"raci_id": 13, "segmen_kode": "O1", "aksi_kunci": "Rancang kampanye WhatsApp 3 pesan dalam 6 minggu", "jasa_raharja": "R", "bapenda": "A", "samsat": "C", "polri": "", "kelurahan": "", "vendor_ti": "C"},
    {"raci_id": 14, "segmen_kode": "O1", "aksi_kunci": "Selaraskan jadwal SAMSAT Keliling dengan konsentrasi O1", "jasa_raharja": "I", "bapenda": "A", "samsat": "R", "polri": "", "kelurahan": "C", "vendor_ti": ""},
    {"raci_id": 15, "segmen_kode": "O1", "aksi_kunci": "Pemberitahuan berbasis lokasi saat Keliling dekat", "jasa_raharja": "", "bapenda": "I", "samsat": "C", "polri": "", "kelurahan": "", "vendor_ti": "R"},
    {"raci_id": 16, "segmen_kode": "O1", "aksi_kunci": "Integrasi ETLE untuk identifikasi yang masih beroperasi", "jasa_raharja": "I", "bapenda": "C", "samsat": "C", "polri": "R", "kelurahan": "", "vendor_ti": "C"},
    {"raci_id": 17, "segmen_kode": "O1", "aksi_kunci": "SMS massal sebagai cadangan untuk yang tidak respond WA", "jasa_raharja": "", "bapenda": "I", "samsat": "I", "polri": "", "kelurahan": "", "vendor_ti": "R"},
    {"raci_id": 18, "segmen_kode": "O1", "aksi_kunci": "Pantau konversi per kecamatan untuk optimasi rute Keliling", "jasa_raharja": "R", "bapenda": "A", "samsat": "C", "polri": "", "kelurahan": "", "vendor_ti": "C"},

    # M1 (Tidak Patuh Pasif)
    {"raci_id": 19, "segmen_kode": "M1", "aksi_kunci": "Rancang regulasi amnesti parsial 50-75% (deadline 60 hari)", "jasa_raharja": "C", "bapenda": "A", "samsat": "C", "polri": "", "kelurahan": "I", "vendor_ti": ""},
    {"raci_id": 20, "segmen_kode": "M1", "aksi_kunci": "Hasilkan perhitungan denda individual untuk WhatsApp", "jasa_raharja": "R", "bapenda": "C", "samsat": "I", "polri": "", "kelurahan": "", "vendor_ti": "C"},
    {"raci_id": 21, "segmen_kode": "M1", "aksi_kunci": "Kirim kampanye WhatsApp bertarget dengan kewajiban personal", "jasa_raharja": "", "bapenda": "I", "samsat": "I", "polri": "", "kelurahan": "", "vendor_ti": "R"},
    {"raci_id": 22, "segmen_kode": "M1", "aksi_kunci": "Cetak dan distribusikan surat tagihan fisik penguat", "jasa_raharja": "", "bapenda": "A", "samsat": "R", "polri": "", "kelurahan": "C", "vendor_ti": ""},
    {"raci_id": 23, "segmen_kode": "M1", "aksi_kunci": "Aktivasi Duta Pajak (Hayak Bahayau / Huma Betang Mahaga)", "jasa_raharja": "I", "bapenda": "C", "samsat": "R", "polri": "", "kelurahan": "A", "vendor_ti": ""},
    {"raci_id": 24, "segmen_kode": "M1", "aksi_kunci": "Proses pembayaran amnesti di loket SAMSAT dan Keliling", "jasa_raharja": "", "bapenda": "I", "samsat": "R", "polri": "", "kelurahan": "", "vendor_ti": ""},
    {"raci_id": 25, "segmen_kode": "M1", "aksi_kunci": "Validasi & rekonsiliasi setiap transaksi amnesti", "jasa_raharja": "C", "bapenda": "A", "samsat": "R", "polri": "", "kelurahan": "", "vendor_ti": ""},

    # M2 (Tidak Patuh Kronis)
    {"raci_id": 26, "segmen_kode": "M2", "aksi_kunci": "Rancang regulasi amnesti penuh denda (deadline 90 hari)", "jasa_raharja": "C", "bapenda": "A", "samsat": "C", "polri": "C", "kelurahan": "", "vendor_ti": ""},
    {"raci_id": 27, "segmen_kode": "M2", "aksi_kunci": "Kampanye WA massal ke 71% kendaraan terjangkau", "jasa_raharja": "", "bapenda": "I", "samsat": "I", "polri": "", "kelurahan": "", "vendor_ti": "R"},
    {"raci_id": 28, "segmen_kode": "M2", "aksi_kunci": "Koordinasi kelurahan/RT-RW untuk 29% offline", "jasa_raharja": "I", "bapenda": "C", "samsat": "R", "polri": "", "kelurahan": "A", "vendor_ti": ""},
    {"raci_id": 29, "segmen_kode": "M2", "aksi_kunci": "Tempatkan SAMSAT Keliling di area konsentrasi", "jasa_raharja": "I", "bapenda": "A", "samsat": "R", "polri": "", "kelurahan": "C", "vendor_ti": ""},
    {"raci_id": 30, "segmen_kode": "M2", "aksi_kunci": "Integrasi ETLE deteksi yang masih beroperasi", "jasa_raharja": "I", "bapenda": "C", "samsat": "C", "polri": "R", "kelurahan": "", "vendor_ti": "C"},
    {"raci_id": 31, "segmen_kode": "M2", "aksi_kunci": "Proses pembayaran amnesti pokok PKB di SAMSAT/Keliling", "jasa_raharja": "", "bapenda": "I", "samsat": "R", "polri": "", "kelurahan": "", "vendor_ti": ""},
    {"raci_id": 32, "segmen_kode": "M2", "aksi_kunci": "Kebijakan Tidak Bayar = Tidak Ada BBM untuk kendaraan dinas", "jasa_raharja": "I", "bapenda": "A", "samsat": "C", "polri": "C", "kelurahan": "", "vendor_ti": ""},
    {"raci_id": 33, "segmen_kode": "M2", "aksi_kunci": "Rencanakan jadwal/lokasi razia pasca-amnesti berbasis data", "jasa_raharja": "I", "bapenda": "C", "samsat": "C", "polri": "A", "kelurahan": "", "vendor_ti": ""},
    {"raci_id": 34, "segmen_kode": "M2", "aksi_kunci": "Eksekusi razia + tilang pasca-amnesti", "jasa_raharja": "I", "bapenda": "I", "samsat": "C", "polri": "R", "kelurahan": "", "vendor_ti": ""},
    {"raci_id": 35, "segmen_kode": "M2", "aksi_kunci": "Proses pembayaran langsung di lokasi selama razia", "jasa_raharja": "", "bapenda": "I", "samsat": "R", "polri": "C", "kelurahan": "", "vendor_ti": ""},

    # S1 (Belum Terdaftar)
    {"raci_id": 36, "segmen_kode": "S1", "aksi_kunci": "Rancang regulasi pengurangan BBNKB untuk registrasi pertama", "jasa_raharja": "C", "bapenda": "A", "samsat": "C", "polri": "C", "kelurahan": "", "vendor_ti": ""},
    {"raci_id": 37, "segmen_kode": "S1", "aksi_kunci": "Identifikasi titik konsentrasi via koordinasi kelurahan", "jasa_raharja": "I", "bapenda": "C", "samsat": "C", "polri": "", "kelurahan": "R", "vendor_ti": ""},
    {"raci_id": 38, "segmen_kode": "S1", "aksi_kunci": "SAMSAT Keliling dengan kapabilitas balik nama langsung", "jasa_raharja": "I", "bapenda": "A", "samsat": "R", "polri": "C", "kelurahan": "C", "vendor_ti": ""},
    {"raci_id": 39, "segmen_kode": "S1", "aksi_kunci": "Kampanye komunitas via spanduk, RT/RW, Duta Pajak", "jasa_raharja": "I", "bapenda": "C", "samsat": "R", "polri": "", "kelurahan": "A", "vendor_ti": ""},
    {"raci_id": 40, "segmen_kode": "S1", "aksi_kunci": "Libatkan BRILink, PT POS, BUMDES sebagai titik layanan", "jasa_raharja": "C", "bapenda": "A", "samsat": "R", "polri": "", "kelurahan": "C", "vendor_ti": ""},
    {"raci_id": 41, "segmen_kode": "S1", "aksi_kunci": "Proses balik nama dan registrasi PKB baru di lokasi", "jasa_raharja": "", "bapenda": "I", "samsat": "R", "polri": "C", "kelurahan": "", "vendor_ti": ""},
    {"raci_id": 42, "segmen_kode": "S1", "aksi_kunci": "Sediakan terminal pembayaran luring-ke-daring", "jasa_raharja": "C", "bapenda": "I", "samsat": "C", "polri": "", "kelurahan": "", "vendor_ti": "R"},

    # S2 (Kendaraan Hantu)
    {"raci_id": 43, "segmen_kode": "S2", "aksi_kunci": "Tandai kendaraan hantu massal untuk peninjauan registrasi", "jasa_raharja": "", "bapenda": "A", "samsat": "R", "polri": "C", "kelurahan": "", "vendor_ti": ""},
    {"raci_id": 44, "segmen_kode": "S2", "aksi_kunci": "Pemberitahuan administratif terakhir surat fisik (90 hari)", "jasa_raharja": "", "bapenda": "A", "samsat": "R", "polri": "", "kelurahan": "", "vendor_ti": ""},
    {"raci_id": 45, "segmen_kode": "S2", "aksi_kunci": "Pencocokan silang dengan data Polri/Ditlantas", "jasa_raharja": "", "bapenda": "C", "samsat": "C", "polri": "R", "kelurahan": "", "vendor_ti": ""},
    {"raci_id": 46, "segmen_kode": "S2", "aksi_kunci": "Reklasifikasi yang merespond ke M2 atau S1", "jasa_raharja": "R", "bapenda": "A", "samsat": "I", "polri": "", "kelurahan": "I", "vendor_ti": ""},
    {"raci_id": 47, "segmen_kode": "S2", "aksi_kunci": "Arsipkan/hapus registrasi yang konfirmasi tidak aktif", "jasa_raharja": "", "bapenda": "A", "samsat": "R", "polri": "", "kelurahan": "I", "vendor_ti": ""},
]
write_csv(OUT / "08_ref_raci_matrix.csv",
          ["raci_id", "segmen_kode", "aksi_kunci", "jasa_raharja", "bapenda", "samsat", "polri", "kelurahan", "vendor_ti"],
          ref_raci_matrix)


# =============================================================================
# 09. ref_revenue_scenario (15 rows: 5 segmen × 3 scenarios)
# =============================================================================

ref_revenue_scenario = [
    # Konservatif (recommended)
    {"scenario_id": 1,  "segmen_kode": "K1", "konversi_pct": 0.60, "est_pendapatan_idr": 10800604714, "scenario_label": "Konservatif"},
    {"scenario_id": 2,  "segmen_kode": "O1", "konversi_pct": 0.35, "est_pendapatan_idr":  5005847081, "scenario_label": "Konservatif"},
    {"scenario_id": 3,  "segmen_kode": "M1", "konversi_pct": 0.25, "est_pendapatan_idr":  2446328598, "scenario_label": "Konservatif"},
    {"scenario_id": 4,  "segmen_kode": "M2", "konversi_pct": 0.15, "est_pendapatan_idr":  5091725071, "scenario_label": "Konservatif"},
    {"scenario_id": 5,  "segmen_kode": "S1", "konversi_pct": 0.10, "est_pendapatan_idr":   199989899, "scenario_label": "Konservatif"},
    # Moderat
    {"scenario_id": 6,  "segmen_kode": "K1", "konversi_pct": 0.70, "est_pendapatan_idr": 12600794293, "scenario_label": "Moderat"},
    {"scenario_id": 7,  "segmen_kode": "O1", "konversi_pct": 0.45, "est_pendapatan_idr":  6435929817, "scenario_label": "Moderat"},
    {"scenario_id": 8,  "segmen_kode": "M1", "konversi_pct": 0.35, "est_pendapatan_idr":  3424070430, "scenario_label": "Moderat"},
    {"scenario_id": 9,  "segmen_kode": "M2", "konversi_pct": 0.25, "est_pendapatan_idr":  8486569670, "scenario_label": "Moderat"},
    {"scenario_id": 10, "segmen_kode": "S1", "konversi_pct": 0.15, "est_pendapatan_idr":   299984849, "scenario_label": "Moderat"},
    # Optimis
    {"scenario_id": 11, "segmen_kode": "K1", "konversi_pct": 0.75, "est_pendapatan_idr": 13501013272, "scenario_label": "Optimis"},
    {"scenario_id": 12, "segmen_kode": "O1", "konversi_pct": 0.50, "est_pendapatan_idr":  7151582575, "scenario_label": "Optimis"},
    {"scenario_id": 13, "segmen_kode": "M1", "konversi_pct": 0.40, "est_pendapatan_idr":  3914360266, "scenario_label": "Optimis"},
    {"scenario_id": 14, "segmen_kode": "M2", "konversi_pct": 0.30, "est_pendapatan_idr": 10183811359, "scenario_label": "Optimis"},
    {"scenario_id": 15, "segmen_kode": "S1", "konversi_pct": 0.20, "est_pendapatan_idr":   400168025, "scenario_label": "Optimis"},
]
write_csv(OUT / "09_ref_revenue_scenario.csv",
          ["scenario_id", "segmen_kode", "konversi_pct", "est_pendapatan_idr", "scenario_label"],
          ref_revenue_scenario)


# =============================================================================
# 10. kb_reference_docs (read from kb_chunks_to_embed.jsonl, NO embedding column)
# =============================================================================

kb_chunks_path = OUT.parent / "kb_chunks_to_embed.jsonl"
kb_reference_docs = []
if kb_chunks_path.exists():
    with open(kb_chunks_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                item = json.loads(line)
                kb_reference_docs.append({
                    "source": item["source"],
                    "category": item.get("category", ""),
                    "chunk_text": item["chunk_text"],
                    "chunk_metadata": json.dumps(item.get("metadata", {})),
                })
write_csv(OUT / "10_kb_reference_docs.csv",
          ["source", "category", "chunk_text", "chunk_metadata"],
          kb_reference_docs)


# =============================================================================
# 11. kb_few_shot (read from 04_galen_few_shot.jsonl, NO embedding column)
# =============================================================================

few_shot_path = OUT.parent / "04_galen_few_shot.jsonl"
kb_few_shot = []
if few_shot_path.exists():
    with open(few_shot_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                item = json.loads(line)
                kb_few_shot.append({
                    "category": item.get("category", "general"),
                    "question": item["question"],
                    "reasoning": item.get("reasoning", ""),
                    "expected_answer": item["expected_answer"],
                    "approved": "TRUE",
                })
write_csv(OUT / "11_kb_few_shot.csv",
          ["category", "question", "reasoning", "expected_answer", "approved"],
          kb_few_shot)

print("\n✓ All 11 CSV files generated successfully")
print(f"  Output dir: {OUT}")

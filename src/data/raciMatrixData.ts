// =============================================================================
// PKB RACI Matrix — static reference data
// =============================================================================
// Source: ref.raci_matrix table on Supabase project babpwnkoapgzvnuftyid
// (snapshot: 2026-05-07).
//
// Why static? The `ref` schema is not exposed to anon role on Supabase,
// so PostgREST returns 401 for direct queries. The data is reference
// (47 rows × 7 segments × 6 agencies) and rarely changes — bundling
// in the frontend is acceptable for the PKB pilot.
//
// Long-term: GRANT SELECT ON ref.raci_matrix TO anon; in a migration,
// then switch back to live fetch.
// =============================================================================

import type { RACIRow, SegmenInfo } from '@/services/raciService';

export const PKB_RACI_MATRIX: RACIRow[] = [
  // ─── H1 — Patuh Aktif (6 aksi) ─────────────────────────────────────
  {
    id: 1,
    segmenKode: 'H1',
    aksiKunci: 'Konfigurasi alur pengingat WhatsApp otomatis (30/14/7 hari)',
    assignments: { jasa_raharja: 'C', bapenda: 'A', samsat: 'I', vendor_ti: 'R' },
  },
  {
    id: 2,
    segmenKode: 'H1',
    aksiKunci: 'Kirim pengingat perpanjangan via WhatsApp + tautan pembayaran',
    assignments: { bapenda: 'I', samsat: 'I', vendor_ti: 'R' },
  },
  {
    id: 3,
    segmenKode: 'H1',
    aksiKunci: 'Personalisasi pesan dengan bahasa daerah',
    assignments: { jasa_raharja: 'R', bapenda: 'A', samsat: 'C', vendor_ti: 'C' },
  },
  {
    id: 4,
    segmenKode: 'H1',
    aksiKunci: 'Pantau read-rate, click-rate, conversion per gelombang',
    assignments: { jasa_raharja: 'R', bapenda: 'A', samsat: 'I', vendor_ti: 'C' },
  },
  {
    id: 5,
    segmenKode: 'H1',
    aksiKunci: 'Evaluasi program loyalitas (sertifikat + manfaat keselamatan)',
    assignments: { jasa_raharja: 'A', bapenda: 'C', samsat: 'C' },
  },
  {
    id: 6,
    segmenKode: 'H1',
    aksiKunci: 'Identifikasi WP progresif multi-kendaraan untuk penghargaan',
    assignments: { jasa_raharja: 'R', bapenda: 'A', samsat: 'I', vendor_ti: 'C' },
  },

  // ─── K1 — Baru Lewat Jatuh Tempo (6 aksi) ──────────────────────────
  {
    id: 7,
    segmenKode: 'K1',
    aksiKunci: 'Hasilkan daftar kontak tunggakan <90 hari + nomor HP',
    assignments: { jasa_raharja: 'R', bapenda: 'C', samsat: 'I', vendor_ti: 'C' },
  },
  {
    id: 8,
    segmenKode: 'K1',
    aksiKunci: 'Kirim WhatsApp massal minggu 1 setelah jatuh tempo',
    assignments: { bapenda: 'I', samsat: 'I', vendor_ti: 'R' },
  },
  {
    id: 9,
    segmenKode: 'K1',
    aksiKunci: 'Tindak lanjut WhatsApp hari 30 dan 60 dengan urgensi naik',
    assignments: { bapenda: 'I', samsat: 'I', vendor_ti: 'R' },
  },
  {
    id: 10,
    segmenKode: 'K1',
    aksiKunci: 'Alihkan ke SMS hari 45 bagi yang tidak respond',
    assignments: { bapenda: 'I', samsat: 'I', vendor_ti: 'R' },
  },
  {
    id: 11,
    segmenKode: 'K1',
    aksiKunci: 'Proses pembayaran via kanal digital',
    assignments: { bapenda: 'I', samsat: 'R' },
  },
  {
    id: 12,
    segmenKode: 'K1',
    aksiKunci: 'Analisis konversi per gelombang untuk tuning',
    assignments: { jasa_raharja: 'R', bapenda: 'A', samsat: 'C', vendor_ti: 'C' },
  },

  // ─── O1 — Mulai Mengabaikan (6 aksi) ───────────────────────────────
  {
    id: 13,
    segmenKode: 'O1',
    aksiKunci: 'Rancang kampanye WhatsApp 3 pesan dalam 6 minggu',
    assignments: { jasa_raharja: 'R', bapenda: 'A', samsat: 'C', vendor_ti: 'C' },
  },
  {
    id: 14,
    segmenKode: 'O1',
    aksiKunci: 'Selaraskan jadwal SAMSAT Keliling dengan konsentrasi O1',
    assignments: { jasa_raharja: 'I', bapenda: 'A', samsat: 'R', kelurahan: 'C' },
  },
  {
    id: 15,
    segmenKode: 'O1',
    aksiKunci: 'Pemberitahuan berbasis lokasi saat Keliling dekat',
    assignments: { bapenda: 'I', samsat: 'C', vendor_ti: 'R' },
  },
  {
    id: 16,
    segmenKode: 'O1',
    aksiKunci: 'Integrasi ETLE untuk identifikasi yang masih beroperasi',
    assignments: { jasa_raharja: 'I', bapenda: 'C', samsat: 'C', polri: 'R', vendor_ti: 'C' },
  },
  {
    id: 17,
    segmenKode: 'O1',
    aksiKunci: 'SMS massal sebagai cadangan untuk yang tidak respond WA',
    assignments: { bapenda: 'I', samsat: 'I', vendor_ti: 'R' },
  },
  {
    id: 18,
    segmenKode: 'O1',
    aksiKunci: 'Pantau konversi per kecamatan untuk optimasi rute Keliling',
    assignments: { jasa_raharja: 'R', bapenda: 'A', samsat: 'C', vendor_ti: 'C' },
  },

  // ─── M1 — Tidak Patuh Pasif (7 aksi) ───────────────────────────────
  {
    id: 19,
    segmenKode: 'M1',
    aksiKunci: 'Rancang regulasi amnesti parsial 50-75% (deadline 60 hari)',
    assignments: { jasa_raharja: 'C', bapenda: 'A', samsat: 'C', kelurahan: 'I' },
  },
  {
    id: 20,
    segmenKode: 'M1',
    aksiKunci: 'Hasilkan perhitungan denda individual untuk WhatsApp',
    assignments: { jasa_raharja: 'R', bapenda: 'C', samsat: 'I', vendor_ti: 'C' },
  },
  {
    id: 21,
    segmenKode: 'M1',
    aksiKunci: 'Kirim kampanye WhatsApp bertarget dengan kewajiban personal',
    assignments: { bapenda: 'I', samsat: 'I', vendor_ti: 'R' },
  },
  {
    id: 22,
    segmenKode: 'M1',
    aksiKunci: 'Cetak dan distribusikan surat tagihan fisik penguat',
    assignments: { bapenda: 'A', samsat: 'R', kelurahan: 'C' },
  },
  {
    id: 23,
    segmenKode: 'M1',
    aksiKunci: 'Aktivasi Duta Pajak (Hayak Bahayau / Huma Betang Mahaga)',
    assignments: { jasa_raharja: 'I', bapenda: 'C', samsat: 'R', kelurahan: 'A' },
  },
  {
    id: 24,
    segmenKode: 'M1',
    aksiKunci: 'Proses pembayaran amnesti di loket SAMSAT dan Keliling',
    assignments: { bapenda: 'I', samsat: 'R' },
  },
  {
    id: 25,
    segmenKode: 'M1',
    aksiKunci: 'Validasi & rekonsiliasi setiap transaksi amnesti',
    assignments: { jasa_raharja: 'C', bapenda: 'A', samsat: 'R' },
  },

  // ─── M2 — Tidak Patuh Kronis (10 aksi) ─────────────────────────────
  {
    id: 26,
    segmenKode: 'M2',
    aksiKunci: 'Rancang regulasi amnesti penuh denda (deadline 90 hari)',
    assignments: { jasa_raharja: 'C', bapenda: 'A', samsat: 'C', polri: 'C' },
  },
  {
    id: 27,
    segmenKode: 'M2',
    aksiKunci: 'Kampanye WA massal ke 71% kendaraan terjangkau',
    assignments: { bapenda: 'I', samsat: 'I', vendor_ti: 'R' },
  },
  {
    id: 28,
    segmenKode: 'M2',
    aksiKunci: 'Koordinasi kelurahan/RT-RW untuk 29% offline',
    assignments: { jasa_raharja: 'I', bapenda: 'C', samsat: 'R', kelurahan: 'A' },
  },
  {
    id: 29,
    segmenKode: 'M2',
    aksiKunci: 'Tempatkan SAMSAT Keliling di area konsentrasi',
    assignments: { jasa_raharja: 'I', bapenda: 'A', samsat: 'R', kelurahan: 'C' },
  },
  {
    id: 30,
    segmenKode: 'M2',
    aksiKunci: 'Integrasi ETLE deteksi yang masih beroperasi',
    assignments: { jasa_raharja: 'I', bapenda: 'C', samsat: 'C', polri: 'R', vendor_ti: 'C' },
  },
  {
    id: 31,
    segmenKode: 'M2',
    aksiKunci: 'Proses pembayaran amnesti pokok PKB di SAMSAT/Keliling',
    assignments: { bapenda: 'I', samsat: 'R' },
  },
  {
    id: 32,
    segmenKode: 'M2',
    aksiKunci: 'Kebijakan "Tidak Bayar = Tidak Ada BBM" untuk kendaraan dinas',
    assignments: { jasa_raharja: 'I', bapenda: 'A', samsat: 'C', polri: 'C' },
  },
  {
    id: 33,
    segmenKode: 'M2',
    aksiKunci: 'Rencanakan jadwal/lokasi razia pasca-amnesti berbasis data',
    assignments: { jasa_raharja: 'I', bapenda: 'C', samsat: 'C', polri: 'A' },
  },
  {
    id: 34,
    segmenKode: 'M2',
    aksiKunci: 'Eksekusi razia + tilang pasca-amnesti',
    assignments: { jasa_raharja: 'I', bapenda: 'I', samsat: 'C', polri: 'R' },
  },
  {
    id: 35,
    segmenKode: 'M2',
    aksiKunci: 'Proses pembayaran langsung di lokasi selama razia',
    assignments: { bapenda: 'I', samsat: 'R', polri: 'C' },
  },

  // ─── S1 — Belum Terdaftar (7 aksi) ─────────────────────────────────
  {
    id: 36,
    segmenKode: 'S1',
    aksiKunci: 'Rancang regulasi pengurangan BBNKB untuk registrasi pertama',
    assignments: { jasa_raharja: 'C', bapenda: 'A', samsat: 'C', polri: 'C' },
  },
  {
    id: 37,
    segmenKode: 'S1',
    aksiKunci: 'Identifikasi titik konsentrasi via koordinasi kelurahan',
    assignments: { jasa_raharja: 'I', bapenda: 'C', samsat: 'C', kelurahan: 'R' },
  },
  {
    id: 38,
    segmenKode: 'S1',
    aksiKunci: 'SAMSAT Keliling dengan kapabilitas balik nama langsung',
    assignments: { jasa_raharja: 'I', bapenda: 'A', samsat: 'R', polri: 'C', kelurahan: 'C' },
  },
  {
    id: 39,
    segmenKode: 'S1',
    aksiKunci: 'Kampanye komunitas via spanduk, RT/RW, Duta Pajak',
    assignments: { jasa_raharja: 'I', bapenda: 'C', samsat: 'R', kelurahan: 'A' },
  },
  {
    id: 40,
    segmenKode: 'S1',
    aksiKunci: 'Libatkan BRILink, PT POS, BUMDES sebagai titik layanan',
    assignments: { jasa_raharja: 'C', bapenda: 'A', samsat: 'R', kelurahan: 'C' },
  },
  {
    id: 41,
    segmenKode: 'S1',
    aksiKunci: 'Proses balik nama dan registrasi PKB baru di lokasi',
    assignments: { bapenda: 'I', samsat: 'R', polri: 'C' },
  },
  {
    id: 42,
    segmenKode: 'S1',
    aksiKunci: 'Sediakan terminal pembayaran luring-ke-daring untuk area sinyal terbatas',
    assignments: { jasa_raharja: 'C', bapenda: 'I', samsat: 'C', vendor_ti: 'R' },
  },

  // ─── S2 — Kendaraan Hantu (5 aksi) ─────────────────────────────────
  {
    id: 43,
    segmenKode: 'S2',
    aksiKunci: 'Tandai kendaraan hantu massal untuk peninjauan registrasi',
    assignments: { bapenda: 'A', samsat: 'R', polri: 'C' },
  },
  {
    id: 44,
    segmenKode: 'S2',
    aksiKunci: 'Pemberitahuan administratif terakhir surat fisik (90 hari respond)',
    assignments: { bapenda: 'A', samsat: 'R' },
  },
  {
    id: 45,
    segmenKode: 'S2',
    aksiKunci: 'Pencocokan silang dengan data Polri/Ditlantas',
    assignments: { bapenda: 'C', samsat: 'C', polri: 'R' },
  },
  {
    id: 46,
    segmenKode: 'S2',
    aksiKunci: 'Reklasifikasi yang merespond ke M2 atau S1',
    assignments: { jasa_raharja: 'R', bapenda: 'A', samsat: 'I', kelurahan: 'I' },
  },
  {
    id: 47,
    segmenKode: 'S2',
    aksiKunci: 'Arsipkan/hapus registrasi yang konfirmasi tidak aktif',
    assignments: { bapenda: 'A', samsat: 'R', kelurahan: 'I' },
  },
];

export const PKB_SEGMEN_INFO: SegmenInfo[] = [
  { kode: 'H1', nama: 'Patuh Aktif', warna: 'HIJAU', durasiTunggakan: 'Belum jatuh tempo' },
  { kode: 'K1', nama: 'Baru Lewat Jatuh Tempo', warna: 'KUNING', durasiTunggakan: '1-90 hari' },
  { kode: 'O1', nama: 'Mulai Mengabaikan', warna: 'ORANYE', durasiTunggakan: '91-365 hari' },
  { kode: 'M1', nama: 'Tidak Patuh Pasif', warna: 'MERAH', durasiTunggakan: '1-2 tahun' },
  { kode: 'M2', nama: 'Tidak Patuh Kronis', warna: 'MERAH', durasiTunggakan: '2-5+ tahun' },
  { kode: 'S1', nama: 'Belum Terdaftar', warna: 'ABU', durasiTunggakan: 'Tidak pernah membayar' },
  { kode: 'S2', nama: 'Kendaraan Hantu', warna: 'ABU', durasiTunggakan: '>15 tahun atau >5 thn tunggakan' },
];

# L4-DATA-004 — `tahun_pajak` di transaksi belum tentu = year of payment

**Tags:** `data_quality`, `tahun_pajak`, `temporal`

**Rule:** Kolom `tahun_pajak` di transaksi adalah tahun obligation (untuk pajak tahun X), BUKAN tanggal pembayaran aktual.

**Why:** Pemilik bisa bayar pajak tahun 2024 di tanggal 2025-03-15 (telat).

**How to apply:** Untuk metric "realized in year Y", pakai filter `tanggal_bayar` (kalau ada) atau dokumen sebagai "obligation realized for year Y" (semantic explicit).

**Source:** Domain knowledge transaksi pajak.

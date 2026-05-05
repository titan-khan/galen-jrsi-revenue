# L4-SEGMEN-003 — S1 dan S2 keduanya "tanpa history", bukan "tidak terdaftar"

**Tags:** `segmen`, `S1`, `S2`, `data_gap`

**Rule:** S1/S2 = kendaraan terdaftar di registry tapi `has_payment_history = FALSE` (pernah skip pembayaran sejak data dimulai).

**Why:** "Tidak terdaftar" itu berarti tidak ada di registry sama sekali, jadi otomatis tidak masuk segmen apapun. S1/S2 adalah kendaraan terdaftar + invisible di transaksi.

**Caveat:** Ada chance bahwa transaksi dataset incomplete (e.g., scope hanya 2020+). Kendaraan yang bayar 2018-2019 saja akan misclassified ke S1/S2.

**How to apply:** Galen perlu disclose "scope data transaksi" ketika menjelaskan S1/S2. Add transparency line: "estimasi berdasarkan history yang tersedia di sistem (X tahun terakhir)".

**Source:** Saptono & Khozen (2021) framework + business review.

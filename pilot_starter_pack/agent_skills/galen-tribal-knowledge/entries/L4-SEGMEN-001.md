# L4-SEGMEN-001 — M2/S2 boundary at usia 20 tahun is a soft rule

**Tags:** `segmen`, `boundary`, `framework_v1.4`

**Rule:** Untuk kendaraan dengan `durasi_tunggakan > 1825 hari` (5 tahun), framework v1.4 split jadi M2 (jika usia <20) atau S2 (jika usia ≥20).

**Why:** Logika business: kendaraan tua + nunggak lama → biasanya sudah hilang/di-stripped. Kendaraan <20 tahun masih likely physically exist + recoverable.

**Caveat:** Ini "soft rule" — di data observed, 3,780 rows landed di M2/S2 boundary dengan classification yang sedikit beda dari Sheet 2 reference distribution. Difference karena edge case di handling NULL `thn_buat`.

**How to apply:** Galen jangan over-confident di angka per-row M2 vs S2. Boleh roll-up ke M+S group untuk total recovery estimation.

**Source:** Framework v1.4 Sheet "Segmentasi Kepatuhan PKB" + verifikasi vs enriched_registry.csv 2026-05-04.

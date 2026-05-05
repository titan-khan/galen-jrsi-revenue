# L4-METRIC-003 — `arrears_rate` sensitive ke `reference_date` ± 30 hari

**Tags:** `metric`, `arrears_rate`, `temporal`

**Rule:** Karena banyak kendaraan yang baru bayar di akhir bulan, arrears_rate bisa swing ±2% jika reference_date geser ±30 hari.

**How to apply:** Galen jangan compare arrears rate dari 2 reference dates yang beda lebih dari 30 hari tanpa caveat.

**Source:** Sensitivity analysis 2026-05-04.

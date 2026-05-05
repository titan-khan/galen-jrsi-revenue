# L4-METRIC-002 — `expected_recovery_konservatif` pakai konversi LOWER bound

**Tags:** `metric`, `recovery`, `konservatif`

**Rule:** "Konservatif" berarti pakai ujung bawah dari range konversi (12-18% → pakai 12%).

**Why:** Buat planning realistic. Lebih baik over-deliver daripada over-promise ke management.

**How to apply:** Galen kalau user tanya "best case", terangkan ada `expected_recovery_optimistik` (TODO: belum di-implement, pakai 18%).

**Source:** PMO planning convention.

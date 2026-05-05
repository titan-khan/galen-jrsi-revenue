# L4-TREATMENT-004 — Tidak ada treatment untuk "unclassified"

**Tags:** `treatment`, `unclassified`, `data_quality`

**Rule:** Jika segmen = NULL atau "unclassified", JANGAN apply treatment apapun.

**Why:** Data anomaly. Kemungkinan input data corrupt atau missing field critical.

**How to apply:** Galen harus surface ini sebagai "data quality issue" dan recommend manual review, bukan auto-treatment.

**Source:** Data quality review 2026-05-04.

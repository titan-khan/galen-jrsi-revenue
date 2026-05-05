# L4-METRIC-004 — `phone_coverage_pct` includes invalid numbers

**Tags:** `metric`, `phone_coverage`, `data_quality`

**Rule:** Definisi `has_phone` cuma cek length≥8. Jadi "08abcdef" lulus.

**Impact:** Real WA-deliverable rate biasanya 70-80% dari `has_phone=TRUE`.

**How to apply:** Galen frame sebagai "indicative phone coverage", real deliverable rate butuh test campaign.

**Source:** Validation 2026-05-04.

# L4-METRIC-001 — `total_potensi_pkb` adalah ESTIMASI dari median, bukan sum aktual

**Tags:** `metric`, `total_potensi_pkb`, `estimate`

**Rule:** `total_potensi_pkb` di-derive dari `est_pkb_per_kendaraan` (median per kode_jenken) × count, BUKAN sum dari outstanding actual obligation.

**Why:** Pilot belum punya per-row obligation amount per registry. Median estimate adalah proxy.

**Caveat:** Bisa under/over-estimate by ~10-20% vs actual SIPADU (sistem pajak resmi).

**How to apply:** Galen frame sebagai "estimasi potensi (~Rp X miliar)". Jangan claim "Rp X miliar terutang exactly".

**Source:** Methodology decision pilot.

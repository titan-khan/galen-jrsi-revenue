# L4-DATA-005 — Dataset transaksi belum kita ingest fully — pakai aggregate dari xlsx dictionary

**Tags:** `data_quality`, `pilot_scope`, `transaksi`

**Rule:** Untuk pilot ini, kita **belum** load full transaksi rows (hanya aggregate ke `dim_jenken.est_pkb_per_kendaraan`). `transaksi_fact` di gold schema seeded tapi belum populated.

**Impact:**
- `has_payment_history` di registry_enriched dihitung dari pre-aggregated lookup, BUKAN live join.
- Time-series queries (e.g., "month-over-month") tidak feasible sampai transaksi_fact populated.

**How to apply:** Galen, kalau user request time-series analysis, surface limitation explicitly: "Pilot ini belum include data transaksi level row. Saya bisa aggregasi, tapi tidak time-series."

**Source:** Pilot scope decision 2026-05-04.

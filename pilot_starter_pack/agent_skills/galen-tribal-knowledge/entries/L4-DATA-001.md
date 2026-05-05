# L4-DATA-001 — 5 extra kode_jenken di transaksi vs dim_jenken seed

**Tags:** `data_quality`, `kode_jenken`, `joins`

**Rule:** Ditemukan 5 `kode_jenken` value di transaksi yang tidak ada di seed `dim_jenken` table: A, D, E, plus anomaly di S.

**Impact:** Joins akan gagal untuk row-row dengan kode ini → estimasi PKB-nya akan NULL → segmen-level aggregate akan under-count.

**How to apply:** Sebelum jalan classification, run validation: `SELECT DISTINCT kode_jenken FROM transaksi WHERE kode_jenken NOT IN (SELECT kode_jenken FROM dim_jenken)`. Either add ke dim_jenken atau flag unresolved.

**Source:** Verifikasi enriched_registry.csv 2026-05-04.

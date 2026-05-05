# L4-SEGMEN-002 — H1 ≠ "tidak menunggak forever"

**Tags:** `segmen`, `H1`, `interpretation`

**Rule:** Segmen H1 (taat) berarti `durasi_tunggakan_days <= 0` AT REFERENCE DATE (2025-05-01). Bukan "selalu taat".

**Why:** Snapshot semantic. Kendaraan yang baru bayar hari ini masuk H1, padahal mungkin selama 3 tahun sebelumnya nunggak.

**How to apply:** Kalau user tanya "berapa kendaraan yang taat sepanjang masa?", JANGAN langsung jawab pakai count(H1). Jelaskan bahwa H1 = taat per snapshot, dan compliance history butuh longitudinal join ke transaksi_fact.

**Source:** Discussion 2026-05-03 (clarification re: snapshot vs time-series semantics).

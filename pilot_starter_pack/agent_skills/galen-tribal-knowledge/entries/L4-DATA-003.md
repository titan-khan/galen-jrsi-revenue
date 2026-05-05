# L4-DATA-003 — Multi-pemilik per nopol possible (jarang tapi terjadi)

**Tags:** `data_quality`, `nopol`, `joins`

**Rule:** Ada kasus 1 nopol punya >1 pemilik di history (transfer kepemilikan).

**Impact:** `has_payment_history` join may overcount jika ada multiple ownership periods.

**How to apply:** Untuk pilot, abaikan (rare case, <0.5%). Document untuk production.

**Source:** Sample inspection.

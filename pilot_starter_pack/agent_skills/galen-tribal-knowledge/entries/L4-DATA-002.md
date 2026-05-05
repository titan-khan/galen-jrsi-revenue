# L4-DATA-002 — Phone column may have non-digit chars

**Tags:** `data_quality`, `phone`, `validation`

**Rule:** `telp_pemilik` dan `hp_pemilik` adalah string dan kadang berisi karakter selain digit (spasi, tanda baca, country code).

**Impact:** `LENGTH(telp) >= 8` validation pass-through anomaly: `"08-1234"` lulus tapi sebenarnya invalid.

**How to apply:** Untuk pilot, current validation OK (98%+ phone coverage match). Untuk production, perlu regex `^[0-9+]{8,}$`.

**Source:** Spot check 2026-05-04.

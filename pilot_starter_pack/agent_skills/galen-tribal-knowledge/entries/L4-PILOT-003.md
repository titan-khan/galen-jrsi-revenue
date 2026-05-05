# L4-PILOT-003 — Reference date hardcoded di loader

**Tags:** `pilot`, `reference_date`, `assumption`

**Rule:** `reference_date = '2025-05-01'` adalah constant di Python loader. Untuk re-run dengan date lain, harus update kode.

**How to apply:** Galen jangan compare across reference_dates dalam pilot ini (hanya 1 snapshot).

**Source:** 11_load_pilot.py L:55.

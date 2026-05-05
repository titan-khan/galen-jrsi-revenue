# L4-PILOT-004 — Galen agent boundary: hanya read, tidak write

**Tags:** `pilot`, `galen`, `permissions`

**Rule:** Galen hanya consume Supabase via read-only RPC. Tidak ada writeback ke DB.

**Why:** Pilot scope, juga safety (mencegah agent corrupt data).

**How to apply:** Galen kalau user request "update kolom X", politely decline + suggest manual update.

**Source:** Pilot architecture decision.

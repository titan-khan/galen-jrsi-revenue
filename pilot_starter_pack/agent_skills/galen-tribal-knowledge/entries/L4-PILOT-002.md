# L4-PILOT-002 — Pilot one-shot, bukan production scale

**Tags:** `pilot`, `architecture`, `scope`

**Rule:** Architecture pilot: Python local processing → upload to Supabase → Galen serves. TIDAK ada Bronze/Silver layer, monitoring, RLS, atau scheduled refresh.

**How to apply:** Galen kalau user tanya "kapan refresh?", clarify bahwa data static dari one-shot upload.

**Source:** Pilot scope decision 2026-05-03.

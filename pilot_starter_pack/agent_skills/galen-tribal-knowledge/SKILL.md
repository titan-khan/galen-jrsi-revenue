---
name: galen-tribal-knowledge
description: Institutional knowledge for the JR PKB pilot — data quirks, classification edge cases, regulatory context, why-this-not-that decisions. Load when an answer needs context the data alone doesn't reveal.
---

# Galen Tribal Knowledge (L4)

29 institutional / domain-specific entries that explain the *why* behind data quirks, segment-classification edge cases, regulatory constraints, and operational tradeoffs. These are non-obvious facts that would otherwise be lost when a team member rotates off the project.

Use this skill whenever a question's answer depends on *context* the data alone doesn't reveal — boundary drift, missing dimension codes, PII handling, why a metric is bronze-rated, etc.

## Entries
- [`L4-SEGMEN-001`](entries/L4-SEGMEN-001.md) — M2/S2 boundary at usia 20 tahun is a soft rule
- [`L4-SEGMEN-002`](entries/L4-SEGMEN-002.md) — H1 ≠ "tidak menunggak forever"
- [`L4-SEGMEN-003`](entries/L4-SEGMEN-003.md) — S1 dan S2 keduanya "tanpa history", bukan "tidak terdaftar"
- [`L4-SEGMEN-004`](entries/L4-SEGMEN-004.md) — K1 vs O1 split di 90 hari adalah operational, bukan regulatory
- [`L4-TREATMENT-001`](entries/L4-TREATMENT-001.md) — "Kanal_utama" ≠ "Only kanal"
- [`L4-TREATMENT-002`](entries/L4-TREATMENT-002.md) — Amnesti "active" tidak berarti auto-applied
- [`L4-TREATMENT-003`](entries/L4-TREATMENT-003.md) — "Perkiraan konversi" adalah HISTORICAL benchmark, bukan SLA
- [`L4-TREATMENT-004`](entries/L4-TREATMENT-004.md) — Tidak ada treatment untuk "unclassified"
- [`L4-DATA-001`](entries/L4-DATA-001.md) — 5 extra kode_jenken di transaksi vs dim_jenken seed
- [`L4-DATA-002`](entries/L4-DATA-002.md) — Phone column may have non-digit chars
- [`L4-DATA-003`](entries/L4-DATA-003.md) — Multi-pemilik per nopol possible (jarang tapi terjadi)
- [`L4-DATA-004`](entries/L4-DATA-004.md) — `tahun_pajak` di transaksi belum tentu = year of payment
- [`L4-DATA-005`](entries/L4-DATA-005.md) — Dataset transaksi belum kita ingest fully — pakai aggregate dari xlsx dictionary
- [`L4-REGULASI-001`](entries/L4-REGULASI-001.md) — Denda PKB capped at 48%
- [`L4-REGULASI-002`](entries/L4-REGULASI-002.md) — SWDKLLJ wajib, tidak bisa amnesti
- [`L4-REGULASI-003`](entries/L4-REGULASI-003.md) — Data pribadi pemilik (NIK, alamat) tidak boleh muncul di output Galen
- [`L4-OPS-001`](entries/L4-OPS-001.md) — Surat fisik mahal, prioritaskan untuk M1+M2 saja
- [`L4-OPS-002`](entries/L4-OPS-002.md) — WhatsApp blast butuh nomor terdaftar Business API
- [`L4-OPS-003`](entries/L4-OPS-003.md) — Kunjungan lapangan butuh izin & koordinasi Polri
- [`L4-OPS-004`](entries/L4-OPS-004.md) — "Aksi_utama" text adalah saran, bukan SOP
- [`L4-METRIC-001`](entries/L4-METRIC-001.md) — `total_potensi_pkb` adalah ESTIMASI dari median, bukan sum aktual
- [`L4-METRIC-002`](entries/L4-METRIC-002.md) — `expected_recovery_konservatif` pakai konversi LOWER bound
- [`L4-METRIC-003`](entries/L4-METRIC-003.md) — `arrears_rate` sensitive ke `reference_date` ± 30 hari
- [`L4-METRIC-004`](entries/L4-METRIC-004.md) — `phone_coverage_pct` includes invalid numbers
- [`L4-PILOT-001`](entries/L4-PILOT-001.md) — Pilot scope: Palangka Raya, Kalimantan Tengah, snapshot 2025-05-01
- [`L4-PILOT-002`](entries/L4-PILOT-002.md) — Pilot one-shot, bukan production scale
- [`L4-PILOT-003`](entries/L4-PILOT-003.md) — Reference date hardcoded di loader
- [`L4-PILOT-004`](entries/L4-PILOT-004.md) — Galen agent boundary: hanya read, tidak write
- [`L4-PILOT-005`](entries/L4-PILOT-005.md) — Bahasa: campur Bahasa Indonesia + English istilah teknis

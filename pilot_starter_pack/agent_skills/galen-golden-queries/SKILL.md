---
name: galen-golden-queries
description: Vetted SQL templates for the most common Galen analytical questions in the JR PKB pilot. Load before writing any new SQL — adapt these instead.
---

# Galen Golden Queries (L6)

19 verified SQL queries that answer the most common Galen questions. Each query is annotated with a trust level (VERIFIED / PROVISIONAL / UNTESTED) and a description of what it computes.

Use this skill as the *first stop* when an answer requires a SQL query — these are vetted templates. Adapt them rather than writing from scratch when possible.

## Index

### CONTACT

- [`Q-CONTACT-001`](queries/Q-CONTACT-001.md) [VERIFIED] — Phone coverage per segmen
- [`Q-CONTACT-002`](queries/Q-CONTACT-002.md) [VERIFIED] — Kendaraan unreachable (no phone, M1+M2 segmen)

### DD

- [`Q-DD-001`](queries/Q-DD-001.md) [VERIFIED] — K1 segmen detail
- [`Q-DD-002`](queries/Q-DD-002.md) [VERIFIED] — M2 segmen
- [`Q-DD-003`](queries/Q-DD-003.md) [VERIFIED] — Top 50 kendaraan by potensi PKB di K1+O1

### DIST

- [`Q-DIST-001`](queries/Q-DIST-001.md) [VERIFIED] — Total kendaraan per segmen
- [`Q-DIST-002`](queries/Q-DIST-002.md) [VERIFIED] — Distribusi motor vs mobil per segmen
- [`Q-DIST-003`](queries/Q-DIST-003.md) [VERIFIED] — Usia kendaraan distribution per segmen

### REV

- [`Q-REV-001`](queries/Q-REV-001.md) [VERIFIED] — Total potensi PKB per segmen
- [`Q-REV-002`](queries/Q-REV-002.md) [VERIFIED] — Expected recovery konservatif per segmen
- [`Q-REV-003`](queries/Q-REV-003.md) [REVIEWED] — SWDKLLJ realized total + share

### ROLLUP

- [`Q-ROLLUP-001`](queries/Q-ROLLUP-001.md) [VERIFIED] — Pilot dashboard one-shot summary
- [`Q-ROLLUP-002`](queries/Q-ROLLUP-002.md) [REVIEWED] — Wilayah/typology rollup

### TREAT

- [`Q-TREAT-001`](queries/Q-TREAT-001.md) [VERIFIED] — Treatment recommendation per segmen with sample count
- [`Q-TREAT-002`](queries/Q-TREAT-002.md) [VERIFIED] — Treatment feasibility (kanal x phone availability)

### VAL

- [`Q-VAL-001`](queries/Q-VAL-001.md) [VERIFIED] — Sanity check row count
- [`Q-VAL-002`](queries/Q-VAL-002.md) [VERIFIED] — Unclassified rows
- [`Q-VAL-003`](queries/Q-VAL-003.md) [VERIFIED] — Kode_jenken yang missing dari dim_jenken (L4-DATA-001)
- [`Q-VAL-004`](queries/Q-VAL-004.md) [VERIFIED] — Distribusi vs framework reference (audit)

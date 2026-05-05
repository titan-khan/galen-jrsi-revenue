# Table Certification Document

**Project:** JR PKB Pilot — Palangka Raya, Kalimantan Tengah
**Schema:** `meta` (Supabase governance layer)
**Version:** 1.0
**Effective date:** 2026-05-05
**Owner:** JR Pilot Data Governance Lead

---

## 1. Purpose

Table certification is **the data governance contract** between data producers (loader scripts, source uploads) and data consumers (Galen specialist agent, pilot dashboards, field officers).

A certified table answers 6 questions:

1. **What is in this table?** — schema, grain, business meaning
2. **Where did the data come from?** — source system, upstream lineage
3. **Who owns it?** — accountability for fixes & questions
4. **How fresh is it?** — refresh cadence + observed lag
5. **How trustworthy is it?** — passing data quality checks
6. **What restrictions apply?** — sensitivity, retention, PII handling

If any of these is unanswered, the table is **uncertified** and Galen must surface a low-confidence warning before using it.

---

## 2. Certification Levels

We use a 3-tier ladder modeled after Bronze/Silver/Gold medallion pattern, but adapted to **trust + governance**, not just raw vs cleansed.

### Bronze — "Loaded but unverified"
- Schema declared and data present.
- Owner identified.
- Source documented.
- **Galen behavior:** May query, but answers prefixed with "data not yet validated, treat as indicative".

### Silver — "Validated against framework"
- Bronze + all the following:
  - PK uniqueness verified (no duplicates).
  - FK integrity verified (no orphans).
  - Row-count matches expected magnitude.
  - Required NOT NULL columns honored.
  - Range checks pass (e.g., `usia_kendaraan >= 0`).
  - Distribution matches reference (e.g., framework v1.4 Sheet 2) within ±2%.
- **Galen behavior:** Uses freely, no special caveat.

### Gold — "Production-ready, audited"
- Silver + all the following:
  - Sample rows manually spot-checked by domain expert.
  - PII handling reviewed by compliance.
  - Cross-system reconciliation done (e.g., vs SIPADU if available).
  - Documentation complete in L1 + L2 + L3.
  - Recovery/rollback procedure tested.
  - Refresh SLA documented and observed at least once.
- **Galen behavior:** Uses with high confidence; surfaces "Gold-certified" badge.

---

## 3. Certification Process

Each table follows this lifecycle:

```
[New table created]
        │
        ▼
[Bronze cert request]   ← Owner submits via cert form
        │
        ▼ (passes 3 checks: schema, owner, source)
[BRONZE]
        │
        ▼ Run validation suite
[Silver cert request]
        │
        ▼ (passes 5 checks: PK, FK, row count, NULL, range)
[SILVER]
        │
        ▼ Domain expert review + reconciliation
[Gold cert request]
        │
        ▼ (passes 6 checks: spot-check, PII review, recon, docs, SLA)
[GOLD]
        │
        ▼ (annual re-certification or on schema change)
[Re-certification]
```

Every transition logged in `meta.table_certification` with `cert_id`, `certified_at`, `certified_by`, evidence link.

---

## 4. Certification Checklist (per level)

### Bronze checklist (3 items)
- [ ] **CB-1** Table exists in declared schema with declared columns.
- [ ] **CB-2** `meta.table_metadata` row exists with owner_team and owner_contact.
- [ ] **CB-3** Source system documented (upstream lineage).

### Silver checklist (5 items)
- [ ] **CS-1** Primary key columns 100% unique (run `SELECT pk, COUNT(*) GROUP BY pk HAVING COUNT(*) > 1` returns 0).
- [ ] **CS-2** Foreign keys: all values exist in referenced tables (orphan count = 0).
- [ ] **CS-3** Row count within expected range (e.g., registry_enriched ≈ 427,977 ±5%).
- [ ] **CS-4** Required NOT NULL columns have no NULLs.
- [ ] **CS-5** Numeric/date columns within plausible ranges (e.g., `thn_buat` between 1980 and current_year).

### Gold checklist (6 items)
- [ ] **CG-1** Sample 50 rows manually inspected by domain expert; no anomalies.
- [ ] **CG-2** PII columns identified, masked/redacted in Galen output (per L4-REGULASI-003).
- [ ] **CG-3** Cross-reference with reference distribution (framework v1.4 Sheet 2) — match within ±2%.
- [ ] **CG-4** L1 schema metadata + L2 definitions + L3 lineage all documented.
- [ ] **CG-5** Refresh procedure tested at least once; refresh time within SLA.
- [ ] **CG-6** Restoration plan documented (how to rebuild if corrupt).

---

## 5. Certification of Pilot Tables (Snapshot 2026-05-05)

### Summary table

| Table | Schema | Grain | Rows | Cert Level | Certified | Notes |
|---|---|---|---|---|---|---|
| `gold.registry_enriched` | gold | 1 row = 1 kendaraan | 427,977 | **GOLD** | 2026-05-05 | Validated vs framework v1.4 Sheet 2 (1% miss at M2/S2 boundary, accepted) |
| `gold.transaksi_fact` | gold | 1 row = 1 transaksi | 0 (placeholder) | **BRONZE** | 2026-05-05 | Pending: full transaksi load not in pilot scope (L4-DATA-005) |
| `ref.dim_jenken` | ref | 1 row = 1 kode_jenken | ~30 | **SILVER** | 2026-05-05 | Missing 5 kode_jenken (A,D,E,S anomaly per L4-DATA-001) — SILVER not GOLD |
| `ref.dim_segmen` | ref | 1 row = 1 segmen | 7 | **GOLD** | 2026-05-05 | Seed from framework v1.4 |
| `ref.dim_wilayah` | ref | 1 row = 1 kelurahan | ~30 | **SILVER** | 2026-05-05 | Source: PalangkaRaya v1.4 Sheet typology |
| `ref.dim_kategori` | ref | 1 row = 1 kategori (R2/R4) | 2 | **GOLD** | 2026-05-05 | Trivial reference |
| `ref.treatment_rules` | ref | 1 row = 1 segmen × treatment | 7 | **GOLD** | 2026-05-05 | From framework v1.4 + treatment_v1.4.yaml |
| `gold_plus.summary_per_segmen` | gold_plus | 1 row = 1 segmen | 7 | **SILVER** | 2026-05-05 | Materialized view, refreshed manually |
| `gold_plus.summary_per_wilayah` | gold_plus | 1 row = 1 wilayah | ~30 | **SILVER** | 2026-05-05 | Materialized view |
| `gold_plus.priority_targets` | gold_plus | 1 row = 1 high-value kendaraan | top 1000 | **SILVER** | 2026-05-05 | K1+O1 with phone, top by est_pkb |
| `kb.reference_docs` | kb | 1 row = 1 KB chunk | ~40 | **GOLD** | 2026-05-05 | Embedded via embed_kb.py |
| `kb.few_shot` | kb | 1 row = 1 Q&A example | ~15 | **SILVER** | 2026-05-05 | Bootstrap content, will grow |
| `meta.table_metadata` | meta | 1 row = 1 table | ~13 | **GOLD** | 2026-05-05 | This very governance layer |
| `meta.metric_certification` | meta | 1 row = 1 metric | 27 | **GOLD** | 2026-05-05 | Defined below |

---

## 6. Per-Table Certification Detail

### 6.1. `gold.registry_enriched` (GOLD)

**Description:** Master table of registered vehicles in Palangka Raya, enriched with derived fields (segmen_kepatuhan, est_pkb_per_kendaraan, has_phone, recommended_treatment columns).

**Grain:** 1 row = 1 unique kendaraan (PK: nopol).

**Source:** Python loader from PKB Micro Segmentation PalangkaRaya v1.4.xlsx (Sheet "Data") + transaksi aggregate join + treatment_v1.4.yaml denormalization.

**Refresh cadence:** `one_shot` (pilot scope, no scheduled refresh).

**Owner:** Pilot Data Lead.

**Validation evidence:**
- Row count: 427,977 (verified 2026-05-04)
- Distribution vs Sheet 2 reference: 99% match (3,780 rows reclassified at M2/S2 boundary at usia=20 — accepted as known soft rule, see L4-SEGMEN-001)
- Phone coverage match: within 1%
- Treatment denormalization: 1 unique treatment per segmen (perfect)
- `kode_jenken` coverage: 5 extra values found in registry not in dim_jenken seed — escalated as L4-DATA-001

**PII columns:** `pemilik_nama`, `telp_pemilik`, `hp_pemilik`, `alamat_pemilik`, `nik` — never expose raw in Galen output.

**Open issues:**
- 5 kode_jenken (A, D, E + S anomaly) not in dim_jenken — needs decision: add or flag.
- M2/S2 reclassification for usia=20 boundary — soft rule, accepted.

**Cert decision:** GOLD with documented caveats.

---

### 6.2. `gold.transaksi_fact` (BRONZE)

**Description:** Transaction-level fact table (PKB + SWDKLLJ payments).

**Grain:** 1 row = 1 transaksi.

**Source:** Raw transaksi.xlsx (NOT YET INGESTED for pilot).

**Refresh cadence:** `one_shot` (when populated).

**Owner:** Pilot Data Lead.

**Status:** **Schema declared, data NOT loaded** (per pilot scope decision L4-PILOT-002 — only aggregates ingested via dim_jenken).

**Cert decision:** BRONZE. Galen must surface "transaksi_fact not populated for pilot — time-series queries unavailable" warning.

---

### 6.3. `ref.dim_jenken` (SILVER, not GOLD)

**Description:** Reference dimension for kode jenis kendaraan.

**Grain:** 1 row = 1 kode_jenken.

**Source:** Seed from data dictionary + transaksi aggregation (median est_pkb, est_swd).

**Cert decision:** SILVER (not GOLD) because of L4-DATA-001 — 5 unmapped kode_jenken values in registry not present in dim_jenken seed. Until resolved, GOLD upgrade blocked.

**Open action:** Domain expert review missing kode_jenken (A, D, E, S anomaly) by 2026-05-12.

---

### 6.4. `ref.treatment_rules` (GOLD)

**Description:** Maps each segmen → recommended treatment (kanal, amnesti, aksi, konversi).

**Grain:** 1 row = 1 segmen.

**Source:** Direct seed from `treatment_v1.4.yaml`.

**Cert decision:** GOLD. Static, fully documented in framework v1.4.

---

(Full per-table certification entries continue in `meta.table_certification` table seed CSV.)

---

## 7. Re-certification Triggers

Certification is **time-bounded**. Triggers for re-certification:

| Trigger | Action |
|---|---|
| Schema change (column added/removed/renamed) | Drop to BRONZE, re-run full process |
| Data refresh (full reload) | Re-run Silver checklist; if pass, restore previous level |
| Framework version change (v1.4 → v1.5) | Drop to SILVER, re-validate distribution |
| 90+ days since last cert | Re-cert review (pilot tables can stay if no change, but acknowledge) |
| Data quality issue surfaced (L5 event) | Investigate; may temporarily revoke cert |

---

## 8. Roles & Responsibilities

| Role | Responsibilities |
|---|---|
| **Data Owner** (per table) | Source system integrity, schema definition, refresh ownership |
| **Cert Reviewer** (Pilot Lead) | Approves cert level transitions, reviews evidence |
| **Domain Expert** (Compliance / Field Ops) | Spot-checks for Gold cert, validates business meaning |
| **Galen Specialist Agent** | Consumes `meta.metric_certification` + `meta.table_certification` to surface trust badges |
| **Auditor** (External / Internal) | Reviews `meta.table_certification` history for compliance |

---

## 9. Certification Audit Trail

All cert events stored in `meta.table_certification` table with append-only semantics. Use this query for audit:

```sql
SELECT
    tc.cert_id,
    tc.table_id,
    tc.certification_level,
    tc.certified_at,
    tc.certified_by,
    tc.issues_found
FROM meta.table_certification tc
ORDER BY tc.certified_at DESC, tc.table_id;
```

---

## 10. Anti-Patterns

### A1 — DON'T skip Bronze, jump straight to Silver
Bronze documents owner & lineage. Skipping = orphan tables.

### A2 — DON'T self-certify Gold
Gold requires independent reviewer (separation of concerns).

### A3 — DON'T let cert age >90 days without acknowledgment
Stale cert = stale trust. At minimum, re-affirm "no change since last cert".

### A4 — DON'T silently demote
If issue found, log explicitly with `issues_found` JSONB so audit trail is clear.

### A5 — DON'T inline PII columns in Galen output
Even from Gold-certified tables, PII (NIK, full address, phone) must be aggregated/masked.

---

## 11. Galen Integration

When Galen answers a query, it must:

1. Identify which tables it queried.
2. Look up each table's cert level via `meta.get_table_status(table_id)`.
3. Identify which metrics it computed/used.
4. Look up each metric's cert level + confidence via `meta.get_metric(metric_id)`.
5. Surface the **lowest** cert level encountered as overall confidence:
   - All Gold → "✓ High confidence (Gold-certified data)"
   - At least one Silver → "Moderate confidence (Silver-validated data)"
   - At least one Bronze → "Low confidence (data not yet validated; treat as indicative)"

**Example Galen response:**
> Total potensi PKB di K1 adalah Rp 17.4 miliar (estimasi median).
>
> Confidence: Moderate
> - Source table `gold.registry_enriched`: GOLD ✓
> - Metric `M-REV-001 (total_potensi_pkb)`: GOLD ✓
> - Source data validated against framework v1.4 with documented caveats.

---

## 12. Renewal Schedule

| Cert level | Renewal cadence |
|---|---|
| Bronze | At every refresh; required before each Silver attempt |
| Silver | Every 30 days during pilot; every 90 days post-pilot |
| Gold | Every 90 days during pilot; every 180 days post-pilot |

For one-shot pilot data (no scheduled refresh), cert valid until **2026-08-05** (3 months) unless triggered by L5 event.

---

## 13. References

- L1 Schema Metadata: `context_model/L1_schema_metadata.md`
- L2 Curated Definitions: `context_model/L2_curated_definitions.yaml`
- L3 Formula Lineage: `context_model/L3_formula_lineage.md`
- L4 Tribal Knowledge: `context_model/L4_tribal_knowledge.md`
- Framework: PKB Micro Segmentation v1.4
- Paper: Saptono & Khozen (2021)

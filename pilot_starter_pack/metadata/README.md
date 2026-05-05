# Metadata Layer — JR PKB Pilot

**Schema:** `meta` (Supabase governance layer)
**Purpose:** Data governance — who owns what, what's certified, how trustworthy each metric is.
**Last updated:** 2026-05-05

---

## What's Here

| File | Type | Purpose |
|---|---|---|
| `supabase_metadata_ddl.sql` | DDL | Creates `meta` schema with 4 tables + RPCs |
| `table_certification.md` | Doc | Certification process, levels, checklist, per-table status |
| `metric_certification.md` | Doc | 27 metric definitions with cert level + confidence score |
| `csv_for_supabase/` | CSV seeds | Importable CSVs for `meta` schema |
| `csv_for_supabase/README.md` | Guide | How to import CSVs into Supabase |

---

## Why Two Layers (Context Model + Metadata)?

| Layer | Purpose | Audience |
|---|---|---|
| **Context Model (`context_model/`)** | Knowledge for Galen to answer queries (L1-L6) | LLM agent retrieval |
| **Metadata (`metadata/`)** | Governance contracts (ownership, cert, SLA) | Auditors + agent confidence layer |

Both are needed:
- Without Context Model → Galen can't answer.
- Without Metadata → Galen answers but can't justify trust.

The two layers cross-reference each other (e.g., metric_certification CSV cites L4 entries for tribal knowledge caveats).

---

## Quick Start

### 1. Apply DDL
```bash
psql $SUPABASE_DB_URL -f metadata/supabase_metadata_ddl.sql
```

### 2. Import seed CSVs
```bash
cd metadata/csv_for_supabase/
for f in 01_*.csv 02_*.csv 03_*.csv 04_*.csv; do
    table=$(echo $f | sed 's/^[0-9]*_//; s/\.csv$//')
    psql $SUPABASE_DB_URL -c "\\COPY meta.$table FROM '$f' CSV HEADER"
done
```

### 3. Verify
```sql
SELECT certification_level, COUNT(*)
FROM meta.metric_certification
GROUP BY certification_level;
-- Expected: gold 7, silver 8, bronze 12
```

### 4. Test Galen RPC
```sql
-- List all gold-certified metrics
SELECT * FROM meta.list_gold_metrics();

-- Confidence lookup (works with metric_id OR metric_slug)
SELECT meta.confidence_for_metric('M-COMPL-001');                     -- 0.98
SELECT meta.confidence_for_metric('distribusi_kendaraan_per_segmen'); -- 0.98

-- Full metric metadata (works with metric_id OR metric_slug)
SELECT * FROM meta.get_metric('total_potensi_pkb');
```

---

## Tables Overview

### `meta.table_metadata` (14 rows)
Master inventory: schema, table, owner, refresh cadence, lineage, PII flags, retention.

### `meta.table_certification` (14 rows)
Cert record per table — Bronze/Silver/Gold with full checklist.

### `meta.metric_certification` (27 rows)
Per-metric: formula, source, governance, cert level, confidence score.

### `meta.column_metadata` (25 rows)
Column-level: data type, sample values, NULL%, sensitivity, derivation.

---

## 27 Defined Metrics by Domain

| Domain | Count | Gold | Silver | Bronze |
|---|---|---|---|---|
| Compliance | 8 | 5 | 1 | 2 |
| Revenue | 6 | 1 | 2 | 3 |
| SWDKLLJ | 3 | 0 | 0 | 3 |
| Treatment | 3 | 1 | 2 | 0 |
| Demographic | 4 | 0 | 3 | 1 |
| Operational | 3 | 0 | 0 | 3 |
| **Total** | **27** | **7** | **8** | **12** |

**Pilot-ready metrics (Gold + Silver):** 15
**Bronze pending data ingest:** 12 (mostly transaksi-dependent)

See `metric_certification.md` for full catalog.

---

## How Galen Uses Metadata

```
User: "Berapa total potensi PKB di K1?"
    │
    ▼
Galen routes to L6 query Q-REV-001
    │
    ▼
SELECT meta.confidence_for_metric('M-REV-001')
    → 0.80 (SILVER)
    │
    ▼
SELECT meta.get_table_status('gold.registry_enriched')
    → GOLD certified 2026-05-05
    │
    ▼
Galen returns:
"Total potensi PKB K1 = Rp 17.4 miliar
 Confidence: 0.80 (SILVER) — median-based estimate
 Source: gold.registry_enriched (GOLD-certified)
 Caveat: SIPADU reconciliation pending."
```

---

## Re-certification Schedule

| Cert level | Cadence (pilot) | Cadence (production) |
|---|---|---|
| Bronze | At every refresh | Same |
| Silver | Every 30 days | Every 90 days |
| Gold | Every 90 days | Every 180 days |

For the one-shot pilot dataset, valid until **2026-08-05** unless triggered by L5 events.

---

## Owner

JR Pilot Data Governance Lead.

For questions, escalate via `pilot.lead@jr.example`.

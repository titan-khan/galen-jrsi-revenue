# L3 — Formula Lineage

**Layer:** L3 (Six-Layer Context Model)
**Purpose:** DAG (Directed Acyclic Graph) yang men-trace setiap metric/kolom turunan kembali ke source raw column-nya. Membuat Galen bisa **menjelaskan provenance** angka, dan **debug rasa angka** ketika user bertanya "kenapa angkanya segini?".
**Format:** Markdown narrative + JSON spec (`L3_formula_lineage.json`)
**Last updated:** 2026-05-05
**Companion file:** `L3_formula_lineage.json` (machine-readable DAG)

---

## 1. Why Formula Lineage Matters

Galen sering ditanya 3 pertanyaan ini:

1. **"Angkanya dari mana?"** → user butuh trail dari final number ke raw column.
2. **"Kalau kolom X berubah, apa yang ke-impact?"** → forward propagation.
3. **"Kalau angkanya ganjil, di-step mana yang salah?"** → backward debug.

Tanpa lineage, Galen hanya hafal definisi (L2). Dengan lineage, Galen bisa **walk the graph**: mulai dari raw → derived → metric → recommendation.

---

## 2. Lineage Notation

Setiap node dalam DAG punya attribute:

| Attribute | Deskripsi | Contoh |
|-----------|-----------|--------|
| `node_id` | Unique identifier (lowercase + underscore) | `durasi_tunggakan_days` |
| `node_type` | `raw` / `derived` / `aggregate` / `metric` / `decision` | `derived` |
| `layer` | Source layer (gold / gold_plus / ref / computed) | `gold` |
| `formula` | SQL/Python expression atau rule statement | `(reference_date - sd_notice).days` |
| `upstream` | List of node_ids that feed into this node | `["sd_notice", "reference_date"]` |
| `downstream` | List of node_ids that this node feeds into | `["segmen_kepatuhan"]` |
| `governance` | `framework_v1.4` / `business_assumption` / `derived_runtime` | `framework_v1.4` |

---

## 3. The Six Lineage Branches

Galen's metrics flatten into **6 lineage trees**, each rooted in a different raw source:

```
LINEAGE TREE OVERVIEW
━━━━━━━━━━━━━━━━━━━━━

[1] COMPLIANCE TREE        rooted at  → sd_notice (gold.registry_enriched)
[2] REVENUE POTENTIAL TREE rooted at  → transaksi.pokok_pkb (raw)
[3] SWDKLLJ TREE           rooted at  → transaksi.pokok_swd (raw)
[4] DENDA TREE             rooted at  → transaksi.denda_swd / pokok_pkb (raw)
[5] DEMOGRAPHIC TREE       rooted at  → transaksi.tgl_lahir (raw)
[6] CONTACTABILITY TREE    rooted at  → telp_pemilik / hp_pemilik (raw)
```

---

## 4. Tree #1 — Compliance Tree (Segmen Classification)

**Goal:** Classify every kendaraan into 1 of 7 segmen (H1, K1, O1, M1, M2, S1, S2).

### Lineage diagram (text)

```
[RAW]                          [DERIVED]                       [METRIC / DECISION]

sd_notice                ─┬─→ durasi_tunggakan_days   ─┬─→ segmen_kepatuhan ─┬─→ segmen_distribution (L2 metric)
                          │   (cutoff_date - sd_notice)│   (rule-based,      │
reference_date            ─┘                            │    framework v1.4) │
(business asumsi:                                       │                    └─→ recommended_treatment
 cutoff = 2025-05-01)                                   │                       (via JOIN ref.treatment_rules)
                                                        │
nopol                    ────→ has_payment_history     ─┤
   ├ JOIN transaksi_fact        (boolean,              │
   │ ON nopol = nopol           pernah pay PKB?)       │
                                                        │
usia_kendaraan           ──────→ usia_kendaraan_band   ─┘
(thn_buat - reference_year)      (≤15 / >15 cutoff)
```

### Key derivations (formula details)

#### `durasi_tunggakan_days`
- **Formula:** `(reference_date::date - sd_notice::date)`
- **Unit:** days (int)
- **Edge cases:**
  - `sd_notice IS NULL` → days = NULL → segmen falls to S-track via `has_payment_history`
  - `sd_notice > reference_date` (kebijakan amnesti aktif?) → clamp to 0 → segmen = H1
- **Upstream:** `sd_notice` (raw, gold.registry_enriched), `reference_date` (constant)
- **Downstream:** `segmen_kepatuhan`, `arrears_rate` (L2 metric)

#### `has_payment_history`
- **Formula:** `EXISTS (SELECT 1 FROM gold.transaksi_fact tf WHERE tf.nopol = re.nopol)`
- **Unit:** boolean
- **Edge cases:**
  - Multi-year history? → still TRUE if ANY year has payment.
  - Different nopol but same pemilik? → currently NOT joined (kendaraan-level history only).
- **Upstream:** `nopol` (registry_enriched), `nopol` (transaksi_fact)
- **Downstream:** `segmen_kepatuhan` (controls S1/S2 vs other branches)

#### `usia_kendaraan_band`
- **Formula:** `CASE WHEN usia_kendaraan <= 15 THEN '<=15' WHEN usia_kendaraan > 15 THEN '>15' ELSE NULL END`
- **Unit:** categorical (3 levels including NULL)
- **Edge cases:**
  - `thn_buat IS NULL` → usia = NULL → band = NULL → S-track defaults to S1
  - `thn_buat > reference_year` (data error) → usia negative → treat as NULL
- **Upstream:** `thn_buat`, `reference_year`
- **Downstream:** `segmen_kepatuhan` (S1 vs S2 split)

#### `segmen_kepatuhan`
- **Formula:** Rule-based classifier (full logic in `python_loader/classify_segment.py`):
  ```
  IF NOT has_payment_history:
      IF usia_kendaraan_band == '<=15' OR NULL → 'S1'
      IF usia_kendaraan_band == '>15'           → 'S2'
  ELIF durasi_tunggakan_days <= 0   → 'H1'
  ELIF 1   <= days <= 90            → 'K1'
  ELIF 91  <= days <= 365           → 'O1'
  ELIF 366 <= days <= 730           → 'M1'
  ELIF 731 <= days <= 1825          → 'M2'
  ELIF days > 1825:
      IF usia_kendaraan < 20 → 'M2' (keep recoverable)
      ELSE                   → 'S2' (mark unrecoverable)
  ```
- **Upstream:** `durasi_tunggakan_days`, `has_payment_history`, `usia_kendaraan_band`
- **Downstream:** `recommended_treatment`, `segmen_distribution`, `arrears_rate`, all segmen-level aggregates
- **Governance:** `framework_v1.4` (sheet "Segmentasi Kepatuhan PKB")

#### `recommended_treatment`
- **Formula:** `JOIN ref.treatment_rules ON segmen_kepatuhan = treatment_rules.segmen`
- **Output columns** (denormalized into registry_enriched per hybrid design):
  - `kanal_utama` (e.g., "WhatsApp blast")
  - `kebijakan_amnesti` (e.g., "Aktif sampai 2025-12-31")
  - `aksi_utama` (text, ~150 chars)
  - `perkiraan_konversi` (e.g., "12-18%")
- **Upstream:** `segmen_kepatuhan`, `ref.treatment_rules`
- **Downstream:** Galen's chat answer, `expected_recovery_konservatif` (L2 metric)

---

## 5. Tree #2 — Revenue Potential Tree

**Goal:** Estimate total potential PKB revenue by segmen, derive per-kendaraan averages.

### Lineage diagram (text)

```
[RAW transaksi]                    [AGGREGATE per kode_jenken]            [JOIN to registry]            [METRIC]

transaksi.pokok_pkb        ───┐
transaksi.kode_jenken      ───┤
transaksi.tahun_pajak      ───┼──→ dim_jenken.est_pkb_per_kendaraan ──→ est_pkb_per_kendaraan ──→ total_potensi_pkb
                              │    (median per kode_jenken,                (registry_enriched,         (SUM by segmen)
                              │     last 3 tahun pajak)                     joined via kode_jenken)
                              │
transaksi.pokok_swd        ───┴──→ dim_jenken.est_swd_per_kendaraan ──→ est_swd_per_kendaraan
                                   (median per kode_jenken)
```

### Key derivations

#### `dim_jenken.est_pkb_per_kendaraan`
- **Formula:** `MEDIAN(pokok_pkb) GROUP BY kode_jenken WHERE tahun_pajak >= reference_year - 3`
- **Why median?** PKB amount distribution is right-skewed (outliers from luxury cars). Median = robust central tendency.
- **Edge case:** If kode_jenken hanya muncul di old data (tahun_pajak < cutoff), fallback ke all-time median dengan flag `is_stale_estimate = TRUE`.
- **Upstream:** `transaksi.pokok_pkb`, `transaksi.kode_jenken`, `transaksi.tahun_pajak`
- **Downstream:** `registry_enriched.est_pkb_per_kendaraan` (denormalized via JOIN at load time)

#### `total_potensi_pkb` (L2 metric)
- **Formula:** `SUM(est_pkb_per_kendaraan) GROUP BY segmen_kepatuhan` (atau filter scope)
- **Unit:** IDR
- **Upstream:** `est_pkb_per_kendaraan`, `segmen_kepatuhan`
- **Downstream:** Reported in dashboard, divided by `count(*)` to get `rata_pkb_per_kendaraan`

#### `expected_recovery_konservatif` (L2 metric)
- **Formula:** `total_potensi_pkb × konversi_lower_bound[segmen]`
- **Where:** `konversi_lower_bound` parsed from `recommended_treatment.perkiraan_konversi` (e.g., "12-18%" → 0.12)
- **Upstream:** `total_potensi_pkb`, `recommended_treatment.perkiraan_konversi`
- **Downstream:** Galen's revenue recovery answer
- **Governance:** `framework_v1.4` (perkiraan konversi per segmen)

---

## 6. Tree #3 — SWDKLLJ Tree

**Goal:** Track SWDKLLJ realized revenue and recovery share vs PKB.

### Lineage diagram (text)

```
[RAW transaksi]                          [DERIVED metric]

transaksi.pokok_swd       ───┬──→ swdkllj_total_realized
transaksi.tahun_pajak     ───┤    (SUM filtered by year)
                              │
transaksi.pokok_pkb       ───┴──→ swdkllj_recovery_share
                                   = pokok_swd / pokok_pkb (per row, then aggregated)
```

#### `swdkllj_total_realized` (L2 metric)
- **Formula:** `SUM(pokok_swd) WHERE tahun_pajak = reference_year`
- **Unit:** IDR
- **Note:** SWDKLLJ realized = actual cash that came in (vs PKB which is potential).
- **Upstream:** `transaksi.pokok_swd`, `transaksi.tahun_pajak`

#### `swdkllj_recovery_share` (L2 metric)
- **Formula:** `SUM(pokok_swd) / SUM(pokok_pkb) × 100%` per scope
- **Interpretation:** SWDKLLJ as % of PKB realized → benchmark vs nasional ~15-25%.
- **Edge case:** If `SUM(pokok_pkb) = 0` → return NULL (avoid div by zero).

---

## 7. Tree #4 — Denda Tree

**Goal:** Compute denda (penalty) burden across segmen.

### Lineage diagram (text)

```
[RAW transaksi]                          [DERIVED metric]

transaksi.denda_swd       ────────→ denda_swdkllj_total
                                     (SUM, filtered to relevant scope)

transaksi.pokok_pkb       ───┬──→ denda_pkb_estimated
transaksi.tahun_pajak     ───┘    (per framework: 25% × pokok_pkb × years_late, capped at 48%)
durasi_tunggakan_days     ───┘
```

#### `denda_swdkllj_total` (L2 metric)
- **Formula:** `SUM(denda_swd)` per scope
- **Source:** Direct from `transaksi.denda_swd` column.

#### `denda_pkb_estimated` (derived, not yet in L2)
- **Formula:** `pokok_pkb × 0.25 × LEAST(FLOOR(durasi_tunggakan_days / 365), 1.92)`
- **Why 1.92?** Denda capped at 48% (per regulasi PKB), so `0.48 / 0.25 = 1.92` years.
- **Status:** Derived at runtime in Python loader. Not stored.

---

## 8. Tree #5 — Demographic Tree

**Goal:** Estimate pemilik age distribution (proxy for risk targeting).

```
[RAW transaksi]                  [DERIVED]                         [METRIC]

transaksi.tgl_lahir   ────→ usia_pemilik_estimated     ──→ usia_pemilik_band ──→ Galen breakdown queries
reference_date        ────┘  (years between dates)         (e.g., <30, 30-50, 50+)
```

#### `usia_pemilik_estimated`
- **Formula:** `EXTRACT(YEAR FROM AGE(reference_date, tgl_lahir))`
- **Edge cases:**
  - `tgl_lahir > reference_date` → data error → set NULL.
  - `tgl_lahir IS NULL` → propagate NULL.

---

## 9. Tree #6 — Contactability Tree

**Goal:** Determine which channel (WA, telp, kunjungan) is feasible per kendaraan.

```
[RAW registry_enriched]             [DERIVED]                     [METRIC]

telp_pemilik (string)        ──┬──→ has_phone (boolean)    ──→ phone_coverage_pct
hp_pemilik (string)          ──┘    (NOT NULL AND length>=8)     (% per segmen)
                                                                      │
                                                                      └──→ kanal_utama feasibility check
                                                                           (if has_phone=FALSE for K1, downgrade to surat)
```

#### `has_phone`
- **Formula:** `(telp_pemilik IS NOT NULL AND LENGTH(telp_pemilik) >= 8) OR (hp_pemilik IS NOT NULL AND LENGTH(hp_pemilik) >= 8)`
- **Edge cases:**
  - String with non-numeric chars → currently passes if length OK. TODO: validate digit-only.
  - Phone formatted with country code (`+62...`) → length still >=8, OK.

#### `phone_coverage_pct` (L2 metric)
- **Formula:** `COUNT(*) WHERE has_phone = TRUE / COUNT(*)` per segmen
- **Threshold for kanal_utama:** If <30% segmen punya phone → fallback to letter/visit.

---

## 10. Cross-Tree Dependencies (Critical!)

Beberapa metric **menggabungkan multiple trees**. Ini adalah pernikahan antar-tree yang harus Galen tahu:

### `expected_recovery_konservatif` (compliance × revenue)
```
segmen_kepatuhan ──┐
                   ├──→ recommended_treatment.perkiraan_konversi ──┐
                   │                                                ├──→ expected_recovery_konservatif
                   │                                                │
total_potensi_pkb ─┴──→ (SUM est_pkb per segmen) ────────────────┘
```

### `kanal_utama_actual` (compliance × contactability)
```
segmen_kepatuhan      ──→ recommended_treatment.kanal_utama (default)
                                                │
                                                ├──→ IF kanal=='telp' AND has_phone=FALSE
                                                │     THEN downgrade to 'surat'
                                                │
has_phone             ──────────────────────────┘
```

### `denda_total_segmen` (denda × compliance)
```
segmen_kepatuhan      ──┐
                        ├──→ GROUP BY → SUM(denda_pkb_estimated + denda_swd) per segmen
denda_pkb_estimated  ──┤
denda_swd            ──┘
```

---

## 11. Forward Propagation Map (Impact Analysis)

Ketika user bertanya "kalau saya rubah X, apa yang ke-impact?", refer ke tabel ini:

| Source change | Impacted derived/metric |
|---|---|
| `reference_date` (cutoff) | `durasi_tunggakan_days`, `segmen_kepatuhan` (all rows!), `usia_pemilik_estimated`, all segmen-aggregated metrics |
| `sd_notice` (single row) | `durasi_tunggakan_days`, `segmen_kepatuhan` (that row), reclassification → recommended_treatment |
| `framework_v1.4` segmen rule (e.g., 90→120 days for K1) | `segmen_kepatuhan` for borderline rows (re-run loader required) |
| `transaksi.pokok_pkb` ingest new year | `dim_jenken.est_pkb_per_kendaraan`, `total_potensi_pkb`, `expected_recovery` |
| `treatment_rules.perkiraan_konversi` updated | `expected_recovery_konservatif` (no need to re-run loader, just re-query) |
| `telp_pemilik` updated | `has_phone`, `phone_coverage_pct`, `kanal_utama_actual` |

---

## 12. Backward Debug Map (Provenance)

Ketika user bertanya "angka 27% phone coverage di K1 itu dari mana?", trace mundur:

```
phone_coverage_pct[segmen=K1] = 27%
    ↑ COUNT(has_phone=TRUE) / COUNT(*) where segmen=K1
        ↑ has_phone derived from telp_pemilik / hp_pemilik in gold.registry_enriched
            ↑ Source: kolom telp/hp di file Palangka_Raya.xlsx (raw upload)
            ↑ Loader script: 11_load_pilot.py L:425-430 (has_phone derivation)
        ↑ segmen=K1 filter via gold.registry_enriched.segmen_kepatuhan
            ↑ classified by classify_segment() L:380-410
            ↑ depends on durasi_tunggakan_days = (2025-05-01 - sd_notice).days
                ↑ sd_notice from raw Palangka_Raya.xlsx
```

Galen harus bisa generate trace ini on-demand. Implement via L3 JSON spec (next file).

---

## 13. Lineage Validation Checklist

Sebelum data dianggap "Galen-ready", verify lineage integrity:

- [ ] Setiap derived column di registry_enriched punya entry di L3 JSON.
- [ ] Setiap L2 metric punya minimum 1 upstream (raw atau derived).
- [ ] Tidak ada cycle (DAG must be acyclic) — auto-check via Python script.
- [ ] Setiap formula bisa di-execute (Python expression valid, SQL parses).
- [ ] Edge cases documented (NULL handling, division by zero, out-of-range).
- [ ] Governance source cited (framework_v1.4 / business assumption / runtime).

---

## 14. How Galen Uses L3

| Galen task | L3 usage pattern |
|---|---|
| Answer "where does X come from?" | Walk upstream from X, return chain. |
| Answer "if I change Y, what breaks?" | Walk downstream from Y, list impacted metrics. |
| Generate SQL for "give me K1 with high recovery potential" | Resolve metrics to underlying columns (segmen_kepatuhan, est_pkb_per_kendaraan), build SELECT. |
| Validate user's manual SQL | Check that referenced columns exist in lineage; warn if formula bypasses lineage (potential error). |
| Explain confidence | Surface `governance` attribute (framework_v1.4 = high trust; business_assumption = medium; derived_runtime = low). |

---

## 15. Maintenance Protocol

L3 lineage **must be updated** when:

1. New derived column added to registry_enriched → add node + edges.
2. Framework v1.4 rule changes → update formula in affected node.
3. New metric added to L2 → add corresponding leaf node in L3.
4. Source column renamed/removed → trace impact, update or deprecate.

**Owner:** Pilot team (revisit at every framework update).
**Review cadence:** End of each sprint atau setelah framework revision.

---

## 16. Companion JSON

Machine-readable version: see `L3_formula_lineage.json` next to this file.

JSON schema:
```json
{
  "version": "1.0",
  "last_updated": "2026-05-05",
  "nodes": [
    {
      "node_id": "durasi_tunggakan_days",
      "node_type": "derived",
      "layer": "computed",
      "formula": "(reference_date::date - sd_notice::date)",
      "unit": "days",
      "upstream": ["sd_notice", "reference_date"],
      "downstream": ["segmen_kepatuhan", "arrears_rate"],
      "governance": "framework_v1.4",
      "edge_cases": ["sd_notice IS NULL → days=NULL", "sd_notice > reference_date → clamp to 0"]
    }
  ],
  "edges": [
    {"from": "sd_notice", "to": "durasi_tunggakan_days", "type": "input"},
    {"from": "durasi_tunggakan_days", "to": "segmen_kepatuhan", "type": "input"}
  ]
}
```

Galen's RAG retriever should ingest this JSON for fast lookup, while this MD provides narrative context for the LLM.

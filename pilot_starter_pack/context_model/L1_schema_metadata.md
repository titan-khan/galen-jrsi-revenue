# L1 — Schema Metadata
> **Layer purpose**: table structure, types, PKs/FKs, cardinality, row counts.
> **Pipeline phase**: Phase 1 (Assessment).
> **Built how**: Automated extraction from Supabase.
> **Consumed by**: Galen specialist untuk schema-aware reasoning.

> **Source data**: `supabase_setup_full.sql`, observed dari `enriched_registry.csv` (427,977 rows verified)
> **Reference date**: 2025-05-01

---

## 1. Schema Inventory

5 schemas total. Semua di Supabase project pilot.

| Schema | Purpose | Tables |
|--------|---------|--------|
| `gold` | Cleansed facts + dimensions | 5 |
| `gold_plus` | Materialized aggregate views | 3 |
| `ref` | Reference / lookup data dari framework v1.4 | 5 |
| `kb` | Galen knowledge base (pgvector) | 2 |
| `public` | System utilities + audit | 1 |

---

## 2. Table Catalog

### 2.1 `gold.dim_kabupaten`
- **Purpose**: Master 14 kabupaten/kota Kalteng + tipologi wilayah
- **PK**: `kabupaten_id` (INT)
- **Row count**: 14 (seeded)
- **No FK out**

| Column | Type | Constraints | Cardinality | Notes |
|--------|------|-------------|-------------|-------|
| kabupaten_id | INT | PK, NOT NULL | 14 unique | e.g., 6271 = Palangka Raya |
| nama_kabupaten | TEXT | UNIQUE, NOT NULL | 14 unique | Capital case |
| tipologi_wilayah | TEXT | NOT NULL, CHECK | 3 values | Pusat Urban (4) / Hub Industri (2) / Wilayah Hinterland (8) |

---

### 2.2 `gold.dim_upt`
- **Purpose**: Master Unit Pelaksana Teknis SAMSAT
- **PK**: `upt_id` (INT)
- **Row count**: 2 (PR seed; auto-grow saat data dari kab lain masuk)
- **FK out**: `kabupaten_id → gold.dim_kabupaten`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| upt_id | INT | PK | e.g., 2 = SAMSAT PALANGKA RAYA |
| upt_nama | TEXT | NOT NULL | UPT nama lengkap |
| kabupaten_id | INT | FK | parent kabupaten |

---

### 2.3 `gold.dim_jenken`
- **Purpose**: Master jenis kendaraan + avg PKB dari aggregate Transaksi 2025
- **PK**: `kode_jenken` (TEXT, 1 char)
- **Row count**: 8 seeded; observed extras: A, D, E (3 more) → recommended add
- **No FK out**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| kode_jenken | TEXT | PK | Single-char code: R, C, F, B, G, H, S, X (+ A, D, E observed) |
| jenis_kendaraan | TEXT | NOT NULL | e.g., SEPEDA MOTOR, MINIBUS, JEEP |
| is_motor | BOOLEAN | NOT NULL | TRUE only for kode 'R' |
| est_pkb_per_kendaraan | NUMERIC(12,0) | nullable | Computed from AVG(transaksi.pokok_pkb) per jenken |

#### Kode Jenken Reference (observed dari enriched_registry.csv)

| Kode | Jenis (typical) | Volume di registry | Avg PKB | is_motor |
|------|-----------------|-------------------:|--------:|----------|
| R | SEPEDA MOTOR | 352,017 | 130,416 | TRUE |
| C | MINIBUS | 44,795 | 1,358,490 | FALSE |
| F | PICK UP | 15,034 | 1,402,355 | FALSE |
| B | JEEP | 5,648 | 2,710,583 | FALSE |
| H | LIGHT TRUCK | 5,392 | 2,744,521 | FALSE |
| A | (?) | 1,886 | 1,193,524 | FALSE — needs clarification |
| G | TRUCK DUMP | 1,295 | 2,280,081 | FALSE |
| S | (?, low PKB) | 1,247 | 130,206 | FALSE — flagged: bukan SEDAN, mungkin segment lain |
| D | (?) | 426 | 1,824,346 | FALSE — needs clarification |
| E | (?) | 80 | 1,844,035 | FALSE — needs clarification |
| (empty) | unclassified | 157 | 0 | rows tanpa kode_jenken |

---

### 2.4 `gold.dim_layanan`
- **Purpose**: Master Samsat service types
- **PK**: `id_layanan` (INT)
- **Row count**: 23 (seeded dari Transaksi_2025 observed)
- **No FK out**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id_layanan | INT | PK | e.g., 42 = PENDAFTARAN ULANG |
| nama_layanan | TEXT | UNIQUE, NOT NULL | |
| kategori | TEXT | nullable | PENDAFTARAN / MUTASI / DUPLIKAT / GANTI / KOREKSI / TRANSFER / EKS_BADAN / KHUSUS |

---

### 2.5 `gold.registry_enriched` ⭐ FACT UTAMA
- **Purpose**: Vehicles dengan segmen + treatment pre-computed (HYBRID approach)
- **PK**: `vehicle_id` (BIGINT)
- **Row count observed**: **427,977** (matches Sheet 2 expected total exactly)
- **FK out**: `kabupaten_id`, `upt_id`, `kode_jenken`, `segmen_kepatuhan`, `batch_id`
- **Sourced from**: `Palangka_Raya.csv` (after SAMSAT PALANGKARAYA filter) → cleansed + classified + enriched di Python loader

| Column | Type | Constraints | Cardinality | Notes |
|--------|------|-------------|-------------|-------|
| vehicle_id | BIGINT | PK | 427,977 unique | Sourced dari `id` di CSV |
| nopol_masked | TEXT | nullable | 611 distinct buckets | Masked, banyak vehicle share 1 bucket |
| kabupaten_id | INT | FK | 1 unique (6271) | Pilot scope: PR only |
| upt_id | INT | FK, nullable | 1-2 | |
| kode_jenken | TEXT | FK, nullable | 11 observed | See dim_jenken table |
| sd_notice | DATE | nullable | 8,648 distinct | tanggal jatuh tempo STNK |
| tanggal_transaksi | DATE | nullable | 3,926 distinct | NULL = belum pernah transact |
| thn_buat | INT | nullable | 78 distinct | 1941-2025 valid; 10 outliers (e.g., 110, 2180) |
| no_hp_masked | TEXT | nullable | 19 mask patterns | NULL atau '' = no phone |
| merek_kendaraan | TEXT | nullable | 175 distinct | trim required |
| tipe | TEXT | nullable | 3,612 distinct | |
| bahan_bakar | TEXT | nullable | 4 distinct | BENSIN/SOLAR/LISTRIK/GAS |
| warna_plat | TEXT | nullable | 19 distinct | mostly PUTIH/MERAH/HITAM/KUNING |
| kecamatan | TEXT | nullable | 42 distinct | 48% blank di sub-source |
| kelurahan | TEXT | nullable | (auto-grow) | |
| **durasi_tunggakan_days** | INT | computed | -609 to 45,776 | reference_date - sd_notice. Outliers from sentinel 1900-01-01 |
| **has_payment_history** | BOOLEAN | computed | 82.57% TRUE | tanggal_transaksi IS NOT NULL |
| **usia_kendaraan** | INT | computed | -155 to 1,915 | reference_date.year - thn_buat. Outliers from data errors |
| **has_phone** | BOOLEAN | computed | varies per segmen | 100% (H1) → 1.6% (S1) |
| **segmen_kepatuhan** | TEXT | FK to ref.segmen | 7 values | H1 / K1 / O1 / M1 / M2 / S1 / S2 |
| **segmen_nama** | TEXT | denormalized | 7 values | e.g., "Patuh Aktif", "Tidak Patuh Kronis" |
| **segmen_warna** | TEXT | denormalized | 4 values | HIJAU / KUNING / ORANYE / MERAH / ABU |
| **treatment_kanal_utama** | TEXT | denormalized | 7 values | 1 unique per segmen (verified) |
| **treatment_kebijakan_amnesti** | TEXT | denormalized | 7 values | Long text |
| **treatment_aksi_utama** | TEXT | denormalized | 7 values | Long text |
| **treatment_perkiraan_konversi** | TEXT | denormalized | 7 values | e.g., "60-75%" |
| **est_pkb_per_kendaraan** | NUMERIC | computed | 0 to 2,744,521 | mapped dari dim_jenken |
| batch_id | UUID | FK | 1 active | lineage |
| loaded_at | TIMESTAMPTZ | NOT NULL | | |
| source_period | TEXT | | "2025" | |

**Indexes**:
- `idx_registry_segmen` on `segmen_kepatuhan`
- `idx_registry_kabupaten` on `kabupaten_id`
- `idx_registry_jenken` on `kode_jenken`
- `idx_registry_sd_notice` on `sd_notice`

---

### 2.6 `gold.transaksi_fact` (optional load)
- **Purpose**: Raw Transaksi 2025 untuk revenue analysis
- **PK**: `transaksi_id` (BIGINT)
- **Row count**: 685,751 (jika di-load)
- **FK out**: `kabupaten_id`, `upt_id`, `kode_jenken`, `id_layanan`

| Column | Type | Notes |
|--------|------|-------|
| transaksi_id | BIGINT | PK, sourced from `id` |
| paid_on | TIMESTAMPTZ | DD/MM/YYYY HH:MM in source |
| vehicle_bucket | TEXT | masked nopol bucket |
| kabupaten_id, upt_id, kode_jenken, id_layanan | FK | |
| pokok_pkb, tunggakan_pokok_pkb, pokok_bbnkb | NUMERIC(12,0) | Revenue components |
| pokok_swdkllj, tunggakan_pokok_swdkllj, denda_swdkllj, tunggakan_denda_swdkllj | NUMERIC(12,0) | JR-specific |
| total_amount | NUMERIC(12,0) | Sum of components |

---

### 2.7 `ref.segmen`
- **Purpose**: 7 segmen definitions per framework v1.4 Sheet 1
- **PK**: `kode` (TEXT)
- **Row count**: 7 (fixed)
- **No FK out**

| Column | Type | Notes |
|--------|------|-------|
| kode | TEXT | PK | H1 / K1 / O1 / M1 / M2 / S1 / S2 |
| nama | TEXT | "Patuh Aktif", "Tidak Patuh Kronis", dll |
| warna | TEXT | HIJAU / KUNING / ORANYE / MERAH / ABU |
| kelas_pyramid | TEXT | "Basis Patuh", "Tidak Mau Mengakar", "Luar Pyramid", dll |
| durasi_tunggakan | TEXT | Human-readable definition |
| profil_perilaku | TEXT | Long description |
| posisi_pyramid_djp | TEXT | Reference ke Pyramid DJP |

---

### 2.8 `ref.treatment_lookup`
- **Purpose**: Treatment per segmen (Sheet 3)
- **PK**: `segmen_kode` (TEXT, FK ke ref.segmen)
- **Row count**: 7 (1 per segmen)

| Column | Type | Notes |
|--------|------|-------|
| segmen_kode | TEXT | PK + FK |
| tujuan_strategis | TEXT | |
| kanal_utama | TEXT | |
| pesan_personalisasi | TEXT | |
| kebijakan_amnesti | TEXT | TIDAK ADA / PARSIAL / PENUH / BBNKB |
| aksi_utama | TEXT | |
| perkiraan_konversi | TEXT | e.g., "60-75%" |

---

### 2.9 `ref.program_sadar`
- **Purpose**: 9 SADAR programs (Sheet 5)
- **PK**: `program_id` (SERIAL)
- **Row count**: 9
- **Special**: array fields (no FK enforcement)

| Column | Type | Notes |
|--------|------|-------|
| program_id | SERIAL | PK, hardcoded 1-9 |
| nama | TEXT | UNIQUE |
| deskripsi | TEXT | |
| segmen_sasaran | TEXT[] | array, e.g., {H1,K1,O1,M1,M2} |
| pemangku_kepentingan | TEXT[] | array, e.g., {Jasa Raharja, Vendor TI} |
| tipologi_wilayah | TEXT[] | array |

---

### 2.10 `ref.raci_matrix`
- **Purpose**: RACI per aksi kunci (Sheet 4)
- **PK**: `raci_id` (SERIAL)
- **Row count**: 47
- **FK out**: `segmen_kode → ref.segmen`

| Column | Type | Notes |
|--------|------|-------|
| raci_id | SERIAL | PK |
| segmen_kode | TEXT | FK |
| aksi_kunci | TEXT | |
| jasa_raharja, bapenda, samsat, polri, kelurahan, vendor_ti | TEXT (CHECK R/A/C/I/NULL) | 6 stakeholder columns |

**Distribution**: H1 (6 actions), K1 (6), O1 (6), M1 (7), M2 (10), S1 (7), S2 (5).

---

### 2.11 `ref.revenue_scenario`
- **Purpose**: Konservatif/Moderat/Optimis projections (Sheet 6)
- **PK**: `scenario_id` (SERIAL)
- **Row count**: 15 (5 segmen × 3 scenarios)
- **UNIQUE**: (segmen_kode, scenario_label)

| Column | Type | Notes |
|--------|------|-------|
| scenario_id | SERIAL | PK |
| segmen_kode | TEXT | FK |
| konversi_pct | NUMERIC(4,2) | 0.10 - 0.75 |
| est_pendapatan_idr | NUMERIC(14,0) | up to ~13.5B IDR |
| scenario_label | TEXT | Konservatif / Moderat / Optimis |

---

### 2.12 `gold_plus.agg_segmen_kabupaten` (Materialized View)
- **Purpose**: Pre-aggregated distribusi (segmen × kabupaten)
- **Row count expected**: 7 × 1 = 7 (PR only saat ini)
- **Refresh**: pg_cron daily 04:00, atau manual `SELECT public.refresh_all_mvs()`

| Column | Type | Computed |
|--------|------|----------|
| segmen_kepatuhan | TEXT | from registry_enriched |
| tipologi_wilayah | TEXT | from dim_kabupaten |
| nama_kabupaten | TEXT | from dim_kabupaten |
| n_kendaraan | INT | COUNT(*) |
| pct_motor | FLOAT | from dim_jenken.is_motor |
| pct_punya_hp | FLOAT | from has_phone |
| rata_pkb_per_kendaraan | NUMERIC | AVG(est_pkb) |
| total_potensi_pkb | NUMERIC(14,0) | SUM(est_pkb) |
| rata_hari_tunggakan | INT | AVG(durasi >= 0) |

---

### 2.13 `gold_plus.agg_segmen_jenken` (Materialized View)
- **Purpose**: Pre-aggregated distribusi (segmen × jenis kendaraan)
- **Row count expected**: ~50 (7 segmen × ~7 jenken each)

| Column | Type | Computed |
|--------|------|----------|
| segmen_kepatuhan | TEXT | |
| jenis_kendaraan | TEXT | from dim_jenken |
| kode_jenken | TEXT | |
| jumlah | INT | COUNT(*) |
| est_pkb_per_kendaraan | NUMERIC | |
| pct_punya_hp | FLOAT | |
| rata_usia | FLOAT | |
| pct_volume | FLOAT | within segmen |

---

### 2.14 `gold_plus.agg_revenue_monthly_kabupaten` (Materialized View)
- **Purpose**: Monthly revenue per kabupaten dari transaksi_fact
- **Source**: gold.transaksi_fact + gold.dim_kabupaten
- **Row count expected**: ~12 months × 14 kabupaten = ~168 (jika full load)

---

### 2.15 `kb.reference_docs`
- **Purpose**: Reference docs dengan pgvector embeddings (RAG)
- **PK**: `id` (UUID)
- **Row count expected**: ~48 chunks (framework + paper + dictionary fields)
- **No FK**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, auto-gen |
| source | TEXT | e.g., 'framework_v1.4_kerangka', 'paper_saptono_khozen' |
| category | TEXT | e.g., 'segmen_h1', 'anti_pattern' |
| chunk_text | TEXT | |
| chunk_metadata | JSONB | extra annotations |
| embedding | VECTOR(1536) | OpenAI text-embedding-3-small |

**HNSW index** on embedding for similarity search.

---

### 2.16 `kb.few_shot`
- **Purpose**: Q→reasoning→answer examples
- **PK**: `id` (UUID)
- **Row count expected**: 15 (curated examples)

---

### 2.17 `public.batch_manifest`
- **Purpose**: Lineage tracking
- **PK**: `batch_id` (UUID)
- **Row count**: 1 active (after first load)

---

## 3. PK / FK Reference Map

```
gold.dim_kabupaten ────────────┐
                               │
gold.dim_upt ───────── kab_id ─┘
   │
   ├─ upt_id ─────────────┐
                          │
gold.dim_jenken ──────────┤
   │                      │
   ├─ kode_jenken ────┐   │
                      │   │
gold.dim_layanan      │   │
   │                  │   │
   ├─ id_layanan ─┐   │   │
                  │   │   │
                  ▼   ▼   ▼
            gold.transaksi_fact

ref.segmen ───────── kode ──┐
   │                        │
   ├─ ref.treatment_lookup  │
   ├─ ref.raci_matrix       │
   ├─ ref.revenue_scenario  │
                            │
gold.registry_enriched ◄────┘
   ├─ kabupaten_id (→ dim_kabupaten)
   ├─ upt_id (→ dim_upt)
   ├─ kode_jenken (→ dim_jenken)
   ├─ segmen_kepatuhan (→ ref.segmen)
   └─ batch_id (→ public.batch_manifest)
```

**13 FK constraints total** (full table di FK reference doc).

---

## 4. Cardinality & Volume Profile

| Table | Rows | Size hint |
|-------|------|-----------|
| `gold.registry_enriched` | 427,977 | ~150 MB CSV |
| `gold.transaksi_fact` (optional) | 685,751 | ~270 MB CSV |
| `gold.dim_kabupaten` | 14 | tiny |
| `gold.dim_upt` | 2-43 | tiny |
| `gold.dim_jenken` | 8-11 | tiny |
| `gold.dim_layanan` | 23 | tiny |
| `ref.segmen` | 7 | fixed |
| `ref.treatment_lookup` | 7 | fixed |
| `ref.program_sadar` | 9 | fixed |
| `ref.raci_matrix` | 47 | fixed |
| `ref.revenue_scenario` | 15 | fixed |
| `kb.reference_docs` | ~48 chunks | per chunk ~1KB + 1536-dim vector |
| `kb.few_shot` | 15 | per row ~1KB + vector |
| `public.batch_manifest` | grows | 1 entry per load |
| `gold_plus.agg_*` | ~7-200 | derived |

**Total Supabase footprint estimate**: ~700 MB raw data + ~10 MB pgvector embeddings.

---

## 5. Distribution Stats (from observed enriched_registry.csv)

```
Segment distribution (Palangka Raya only):
H1 (Patuh Aktif):       107,960 (25.23%)
K1 (Baru Lewat):         33,789 ( 7.90%)
O1 (Mulai Mengabaikan):  32,916 ( 7.69%)
M1 (Tidak Patuh Pasif):  25,039 ( 5.85%)
M2 (Tidak Patuh Kronis): 137,186 (32.06%)
S1 (Belum Terdaftar):    12,763 ( 2.98%)
S2 (Kendaraan Hantu):    78,324 (18.30%)
TOTAL:                  427,977

Phone availability:
H1: 100.00%   K1: 99.99%   O1: 99.98%
M1: 99.91%    M2: 72.03%   S1: 1.60%   S2: 20.08%

Has payment history: 82.57% (TRUE)
Outliers in derived columns: ~10 rows (data quality flagged)
```

---

## 6. Galen Consumption Pattern

**Primary lookup paths** untuk Galen specialist:

| User Question Pattern | Tables Hit |
|-----------------------|------------|
| "Berapa kendaraan di segmen X?" | `gold_plus.agg_segmen_kabupaten` |
| "Treatment apa untuk segmen X?" | `gold.registry_enriched` (denormalized) atau `ref.treatment_lookup` |
| "Siapa pelaksana untuk aksi X?" | `ref.raci_matrix` |
| "Berapa potensi revenue?" | `ref.revenue_scenario` |
| "Apa beda S1 dan S2?" | `kb.reference_docs` (RAG) |
| "Distribusi jenis kendaraan di segmen Y?" | `gold_plus.agg_segmen_jenken` |
| "Trend revenue bulanan?" | `gold_plus.agg_revenue_monthly_kabupaten` |
| Anti-pattern check | `kb.reference_docs` (category=anti_pattern) |

---

*Generated 2026-05-04 dari supabase_setup_full.sql + observed enriched_registry.csv*

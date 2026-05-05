# Schema Design — JR Pilot (PKB Micro-Segmentation)
> Reviewable schema documentation untuk Supabase pilot.
>
> Source: framework PKB Micro Segmentation Palangka Raya v1.4.
> Reference date: **2025-05-01**.

---

## 1. Overview & Design Principles

### 1.1 Tujuan schema

Schema ini dirancang untuk **3 kebutuhan utama**:
1. **Menyimpan data registry kendaraan** dari Palangka Raya (~428K records) dengan struktur yang queryable
2. **Mengklasifikasi setiap kendaraan ke 7-segmen** sesuai framework v1.4 secara otomatis (computed/derived)
3. **Menyediakan data + reference + KB untuk Galen specialist** agar bisa menjawab pertanyaan strategis

### 1.2 Prinsip desain

| Prinsip | Penerapan |
|---------|-----------|
| **Read-optimized** | Star schema (fact + dim), materialized views, indexes pada kolom filter |
| **Derived-not-stored** untuk segmentasi | Klasifikasi segmen dilakukan di view, bukan kolom fisik — supaya kalau logic berubah, cukup update view |
| **Reference date single-source-of-truth** | Hardcoded `'2025-05-01'` di SQL function. Untuk update, satu titik perubahan |
| **Lineage tracking minimal** | `batch_manifest` di Supabase walaupun raw data di luar |
| **PII protection** | Field PII di-mask di source. RLS policies deferred ke production |
| **Pilot scope** | Skip Bronze/Silver. Skip SCD type 2. Skip RLS. Plan untuk graduate ke production |

### 1.3 Layer architecture

```
LOCAL (Python loader)              SUPABASE (this schema)
─────────────────────              ───────────────────────────────
                                    ┌─────────────────────────┐
                                    │  Schema: gold           │  Star schema
                                    │   ├── dim_kabupaten     │  (fact + dim)
                                    │   ├── dim_upt           │
                                    │   ├── dim_jenken        │
                                    │   ├── dim_layanan       │
                                    │   ├── registry_fact ◄───┼──── from CSV
                                    │   └── transaksi_fact    │
                                    └─────────────────────────┘
                                    ┌─────────────────────────┐
                                    │  Schema: gold_plus      │  Derived
                                    │   ├── registry_segmented│  (view)
                                    │   ├── agg_segmen_kab    │  (MV)
                                    │   └── agg_segmen_jenken │  (MV)
                                    └─────────────────────────┘
                                    ┌─────────────────────────┐
                                    │  Schema: ref            │  Lookups
                                    │   ├── segmen            │
                                    │   ├── treatment_lookup  │
                                    │   ├── program_sadar     │
                                    │   ├── raci_matrix       │
                                    │   └── revenue_scenario  │
                                    └─────────────────────────┘
                                    ┌─────────────────────────┐
                                    │  Schema: kb             │  Galen KB
                                    │   ├── reference_docs    │  (pgvector)
                                    │   └── few_shot          │
                                    └─────────────────────────┘
                                    ┌─────────────────────────┐
                                    │  Schema: public         │  System
                                    │   └── batch_manifest    │
                                    └─────────────────────────┘
```

---

## 2. Schema Organization

| Schema | Tujuan | Akses pattern |
|--------|--------|---------------|
| `gold` | Data terpercaya: facts + dimensions | Heavy read, write hanya saat batch load |
| `gold_plus` | Data turunan: views + materialized aggregates | Read-only, refresh by pg_cron |
| `ref` | Reference / lookup data dari framework v1.4 | One-time seed, jarang berubah |
| `kb` | Galen knowledge base (pgvector + few_shot) | Read by Edge Functions, write saat update KB |
| `public` | System utilities (manifest, RPCs) | Various |

### ⚠️ REVIEW DECISION 1
**Apakah schema split ini OK?** Alternatif: semua di schema `public` (lebih simple). Saya pilih multi-schema untuk:
- Clearer organization (dim/fact vs aggregates vs reference)
- Easier permissions (e.g., Galen specialist hanya akses `gold_plus` + `ref` + `kb`, no `gold`)
- Cleaner namespacing

Trade-off: Supabase Studio UI akan show schema selector — sedikit extra step untuk dev.

---

## 3. Dimension Tables

### 3.1 `gold.dim_kabupaten`

**Purpose**: master kabupaten/kota Kalimantan Tengah dengan tipologi wilayah dari framework v1.4.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `kabupaten_id` | INT, PK | ID kabupaten dari source SAMSAT (e.g., 6271 = Palangka Raya) |
| `nama_kabupaten` | TEXT, UNIQUE NOT NULL | Nama kabupaten/kota dalam huruf kapital |
| `tipologi_wilayah` | TEXT NOT NULL | Salah satu: `Pusat Urban`, `Hub Industri`, `Wilayah Hinterland` (CHECK constraint) |

**Seed data**: 14 kabupaten (saat ini hardcoded di `11_load_pilot.py`)

**Tipologi mapping** (preliminary — perlu validasi):
- **Pusat Urban**: Palangka Raya, Sampit, Pangkalan Bun, Kuala Kapuas
- **Hub Industri**: Sampit (alt), Pangkalan Bun (alt), Muara Teweh, Buntok
- **Wilayah Hinterland**: Kasongan, Nanga Bulik, Kuala Pembuang, Tamiang Layang, Pulang Pisau, Kuala Kurun, Puruk Cahu, Sukamara

### ⚠️ REVIEW DECISION 2
Beberapa kabupaten masuk dua kategori (Sampit di Pusat Urban DAN Hub Industri). Saat ini saya pilih salah satu. **Apakah perlu satu kabupaten bisa punya multiple tipologi?**

Alternatif:
- (a) Single tipologi (current) — simpler tapi kurang akurat
- (b) Many-to-many table — lebih akurat tapi lebih kompleks
- (c) Hierarchical (primary + secondary tipologi) — middle ground

Dampak ke Galen: kalau (a), pertanyaan "strategi untuk Sampit" akan jawab dengan satu tipologi. Kalau (b), bisa jawab dengan kombinasi.

---

### 3.2 `gold.dim_upt`

**Purpose**: master Unit Pelaksana Teknis SAMSAT.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `upt_id` | INT, PK | ID UPT |
| `upt_nama` | TEXT NOT NULL | Nama UPT (e.g., "SAMSAT PALANGKARAYA") |
| `kabupaten_id` | INT, FK → dim_kabupaten | Kabupaten parent |

**Note**: Saat ini Palangka_Raya.csv hanya punya 1 UPT (`002 SAMSAT PALANGKARAYA`). Pilot tidak butuh seed data — auto-populate via loader saat ada data masuk.

### ⚠️ REVIEW DECISION 3
Pilot scope hanya 1 UPT (PR). **Apakah `dim_upt` perlu di pilot?** Saya keep karena:
- Schema sudah ready untuk extend ke 14 kabupaten × N UPT later
- Foreign key consistency dari hari pertama
- Tidak ada cost (table kecil)

Kalau ingin maximally simple, bisa skip dan pakai `upt_nama` langsung di registry_fact.

---

### 3.3 `gold.dim_jenken`

**Purpose**: master jenis kendaraan dengan **average PKB per kendaraan dari Sheet 7**.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `kode_jenken` | TEXT, PK | Kode 1-huruf (R = Sepeda Motor, C = Minibus, dst) |
| `jenis_kendaraan` | TEXT NOT NULL | Label panjang |
| `is_motor` | BOOLEAN NOT NULL | Untuk fast filter motor vs non-motor |
| `est_pkb_per_kendaraan` | NUMERIC(12,0) | Average PKB tahunan dari sample 2025 PR |

**Seed data** (8 rows):

| Kode | Jenis | is_motor | Avg PKB |
|------|-------|----------|---------|
| R | SEPEDA MOTOR | TRUE | 122,712 |
| C | MINIBUS | FALSE | 1,284,741 |
| F | PICK UP | FALSE | 1,301,059 |
| B | JEEP | FALSE | 2,316,498 |
| G | TRUCK DUMP | FALSE | 2,215,921 |
| H | LIGHT TRUCK | FALSE | 1,760,474 |
| S | SEDAN | FALSE | 1,103,276 |
| X | Lainnya | FALSE | 1,500,000 |

### ⚠️ REVIEW DECISION 4
**Avg PKB sebagai kolom di dim atau dihitung dinamis?** Saya pilih store as column karena:
- Konsisten dengan angka di Sheet 7 framework v1.4
- Tidak ada full transaksi history di pilot (hanya 2025)
- Computed dynamic akan butuh re-aggregate setiap query

Trade-off: kalau angka actual berubah (data 2026 masuk), perlu update manual. Production phase akan replace dengan computed view.

### ⚠️ REVIEW DECISION 5
**Kode jenken X = Lainnya** adalah simplifikasi saya. Sample data sebenarnya punya banyak kode jenken (M, N, dll). **Apakah perlu seed lengkap semua kode jenken?**

---

### 3.4 `gold.dim_layanan`

**Purpose**: master jenis layanan Samsat (Pendaftaran Ulang, Mutasi, dll).

Schema simple, akan auto-populate saat transaksi data masuk. Belum di-seed di pilot karena registry_fact tidak butuh layanan.

---

## 4. Fact Tables

### 4.1 `gold.registry_fact` — TABEL UTAMA

**Purpose**: satu row = satu kendaraan terdaftar. Ini source of truth untuk segmentasi.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `vehicle_id` | BIGINT, PK | ID dari source CSV (kolom `id`) |
| `nopol_masked` | TEXT | Nomor polisi (sudah di-mask di source) |
| `kabupaten_id` | INT, FK | Kabupaten registrasi |
| `upt_id` | INT, FK | UPT yang menangani |
| `kode_jenken` | TEXT, FK | Jenis kendaraan |
| **`sd_notice`** | **DATE** | **Tanggal jatuh tempo STNK — sumber utama segmentasi** |
| **`tanggal_transaksi`** | **DATE, NULLABLE** | **Tanggal transaksi terakhir; NULL = tidak pernah transact** |
| **`thn_buat`** | **INT** | **Tahun pembuatan kendaraan** |
| **`no_hp_masked`** | **TEXT, NULLABLE** | **Nomor HP (untuk derive `has_phone`)** |
| `merek_kendaraan`, `tipe`, `bahan_bakar`, `warna_plat` | TEXT | Vehicle attributes |
| `kecamatan`, `kelurahan` | TEXT | Geographic detail |
| `loaded_at` | TIMESTAMPTZ | Lineage |
| `source_period` | TEXT | Period dari batch (e.g., "2025-04") |

**Indexes**:
- `idx_registry_kabupaten` (kabupaten_id)
- `idx_registry_jenken` (kode_jenken)
- `idx_registry_sd_notice` (sd_notice)

**Bold columns** = kunci untuk segmentasi. Empat ini menentukan klasifikasi segmen lewat view `registry_segmented`.

### ⚠️ REVIEW DECISION 6
**Saya tidak include `batch_id` sebagai kolom** di pilot. Production phase wajib include FK ke `batch_manifest` untuk full lineage. **Apakah perlu sudah ada di pilot?**

Pro pilot: lebih simple, satu kolom less
Pro tidak skip: lineage clear dari hari pertama, mudah debug "data ini dari batch mana"

Saya cenderung add `batch_id UUID REFERENCES public.batch_manifest(batch_id)` — minor cost, big debug benefit.

---

### 4.2 `gold.transaksi_fact`

**Purpose**: satu row = satu transaksi pembayaran. Untuk modeling revenue.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `transaksi_id` | BIGINT, PK | |
| `paid_on` | TIMESTAMPTZ NOT NULL | |
| `vehicle_bucket` | TEXT | Masked nopol bucket (untuk crosswalk) |
| `kabupaten_id` | INT, FK | |
| `upt_id` | INT, FK | |
| `kode_jenken` | TEXT, FK | |
| `id_layanan` | INT, FK | |
| `pokok_pkb`, `tunggakan_pokok_pkb`, `pokok_bbnkb`, `pokok_swdkllj`, `tunggakan_pokok_swdkllj`, `denda_swdkllj`, `tunggakan_denda_swdkllj` | NUMERIC(12,0) | Revenue components |
| `total_amount` | NUMERIC(12,0) | Sum of components |
| `loaded_at` | TIMESTAMPTZ | |

**Indexes**:
- `idx_transaksi_paid_on` (paid_on)
- `idx_transaksi_kabupaten` (kabupaten_id)

### ⚠️ REVIEW DECISION 7
**Apakah `transaksi_fact` perlu di-load di pilot atau cukup `registry_fact` saja?**

- **Kalau pilot focus = segmentasi + treatment recommendation**: cukup registry_fact. Avg PKB sudah di-store di dim_jenken.
- **Kalau pilot juga cover revenue analysis**: perlu transaksi_fact untuk monthly trends, source mix, dll.

Saya cenderung load registry first (Day 3), transaksi optional (Day 4-5 kalau time-allows).

---

## 5. Derived View — `gold_plus.registry_segmented`

**Ini jantung framework v1.4.** View ini meng-compute segmen on-the-fly dari `registry_fact`.

### 5.1 Logic flow

```
INPUT: registry_fact (raw)
   │
   ▼
Compute derived attributes:
   - durasi_tunggakan_days = '2025-05-01' - sd_notice
   - has_payment_history = (tanggal_transaksi IS NOT NULL)
   - usia_kendaraan = 2025 - thn_buat
   - has_phone = (no_hp_masked IS NOT NULL AND <> '')
   │
   ▼
Apply 7-segment classification (priority order):
   1. NOT has_payment_history AND usia ≤ 15           → S1
   2. NOT has_payment_history AND usia > 15            → S2
   3. sd_notice IS NULL OR durasi ≤ 0                  → H1
   4. durasi BETWEEN 1 AND 90                          → K1
   5. durasi BETWEEN 91 AND 365                        → O1
   6. durasi BETWEEN 366 AND 730                       → M1
   7. durasi BETWEEN 731 AND 1825                      → M2
   8. durasi > 1825 AND usia < 20                      → M2
   9. durasi > 1825 AND usia ≥ 20                      → S2 (reklasifikasi)
   │
   ▼
OUTPUT: registry_segmented (registry_fact + derived columns + segmen_kepatuhan)
```

### 5.2 Output columns (additions to registry_fact)

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `reference_date` | DATE | Constant '2025-05-01' (untuk transparency) |
| `durasi_tunggakan_days` | INT | Hari sejak sd_notice (negatif = belum lewat) |
| `has_payment_history` | BOOLEAN | Pernah transact? |
| `usia_kendaraan` | INT | Tahun usia per ref date |
| `has_phone` | BOOLEAN | Punya nomor HP terdaftar? |
| **`segmen_kepatuhan`** | **TEXT** | **H1 / K1 / O1 / M1 / M2 / S1 / S2** |

### 5.3 Decision: VIEW vs MATERIALIZED VIEW vs COLUMN

| Opsi | Pros | Cons |
|------|------|------|
| **VIEW** (current pilot) | Always fresh, simple, no refresh | Slower for complex queries (re-compute every time) |
| MATERIALIZED VIEW | Fast queries | Stale data, perlu refresh schedule |
| **STORED COLUMN** in registry_fact | Fastest queries | Re-compute on every insert/update; logic update = full re-load |

**Saya pilih VIEW** untuk pilot karena:
- Logic akan iterate (mungkin perlu adjust threshold)
- 428K rows tidak besar untuk Postgres
- Update logic = `CREATE OR REPLACE VIEW` saja, no data migration

**Production phase**: bisa graduate ke materialized view kalau query frequency tinggi.

### ⚠️ REVIEW DECISION 8
**Apakah pilihan VIEW (vs MV/column) OK?**

### ⚠️ REVIEW DECISION 9 — Threshold M2 vs S2 di durasi >5 tahun

Logic saat ini:
- `durasi > 1825 AND usia < 20` → M2
- `durasi > 1825 AND usia >= 20` → S2 (reklasifikasi sebagai hantu)

**Apakah threshold usia 20 tahun sudah benar?** Framework v1.4 menyebut "kurang dari 20 tahun" — saya interpretasi sebagai `usia < 20`. Tapi ada ambiguitas: apakah kendaraan **tepat** 20 tahun masuk M2 atau S2?

---

## 6. Materialized Views (Aggregates)

### 6.1 `gold_plus.agg_segmen_kabupaten`

**Purpose**: pre-compute distribusi per (segmen × kabupaten) — Sheet 2 framework v1.4.

| Kolom | Tipe | Sumber |
|-------|------|--------|
| `segmen_kepatuhan` | TEXT | dari registry_segmented |
| `tipologi_wilayah` | TEXT | dari dim_kabupaten |
| `nama_kabupaten` | TEXT | dari dim_kabupaten |
| `n_kendaraan` | INT | COUNT(*) |
| `pct_motor` | FLOAT | dari dim_jenken.is_motor |
| `pct_punya_hp` | FLOAT | dari has_phone |
| `rata_pkb_per_kendaraan` | NUMERIC | AVG dim_jenken.est_pkb_per_kendaraan |
| `total_potensi_pkb` | NUMERIC | SUM dim_jenken.est_pkb_per_kendaraan |
| `rata_hari_tunggakan` | INT | AVG durasi_tunggakan_days |

**Index**: `(segmen_kepatuhan, nama_kabupaten)` UNIQUE.

**Refresh**: daily 04:00 via pg_cron.

### 6.2 `gold_plus.agg_segmen_jenken`

**Purpose**: pre-compute distribusi per (segmen × jenis kendaraan) — Sheet 7 framework v1.4.

Similar structure dengan agg_segmen_kabupaten tapi grouped by jenken.

### ⚠️ REVIEW DECISION 10
**Refresh frequency materialized view**: saya set daily 04:00. Pilot trigger via `make process-month` mostly monthly batch. **Apakah daily refresh berlebihan?**

Alternatif:
- Skip pg_cron, refresh manual saat batch upload (di Python loader)
- Refresh on-demand via Edge Function trigger

---

## 7. Reference Tables (Schema `ref`)

### 7.1 `ref.segmen` — 7 segmen definitions

Seed table dengan: kode, nama, warna, kelas_pyramid, durasi_tunggakan, profil_perilaku, posisi_pyramid_djp.

7 baris pasti sesuai framework v1.4 Sheet 1.

### 7.2 `ref.treatment_lookup` — strategi per segmen

PK = segmen_kode (FK ke ref.segmen). Berisi:
- tujuan_strategis
- kanal_utama
- pesan_personalisasi
- kebijakan_amnesti
- aksi_utama
- perkiraan_konversi

7 baris dari Sheet 3.

### 7.3 `ref.program_sadar` — 9 program SADAR

Schema:

| Kolom | Tipe |
|-------|------|
| `program_id` | SERIAL PK |
| `nama` | TEXT |
| `deskripsi` | TEXT |
| `segmen_sasaran` | TEXT[] (array of segmen codes) |
| `pemangku_kepentingan` | TEXT[] |
| `tipologi_wilayah` | TEXT[] |

### ⚠️ REVIEW DECISION 11
**Pakai array `TEXT[]` untuk many-to-many** (program × segmen). Alternatif: junction table `program_segmen`. Saya pilih array karena:
- Pilot scope kecil (9 programs × 5-7 segmen each)
- Simpler query: `WHERE 'M2' = ANY(segmen_sasaran)` atau `WHERE segmen_sasaran @> ARRAY['M2']`
- Postgres support indexing array via GIN

Production phase: kalau M2M jadi kompleks, refactor ke junction.

### 7.4 `ref.raci_matrix` — RACI per aksi kunci

Satu row per (segmen × aksi). Kolom:

| Kolom | Tipe |
|-------|------|
| `raci_id` | SERIAL PK |
| `segmen_kode` | TEXT FK |
| `aksi_kunci` | TEXT |
| `jasa_raharja`, `bapenda`, `samsat`, `polri`, `kelurahan`, `vendor_ti` | TEXT (R/A/C/I/NULL) dengan CHECK constraint |

Seed: 30+ aksi dari Sheet 4.

### ⚠️ REVIEW DECISION 12
**Stakeholder hardcoded sebagai 6 kolom**. Trade-off vs design alternatif:
- (a) **6 kolom** (current) — simpler query, fixed schema
- (b) **Junction table** `raci_matrix` × `stakeholder` — flexible, bisa add stakeholder later

Saya pilih (a) karena 6 stakeholder ini fix di framework. Kalau berubah, kolom add-able.

### 7.5 `ref.revenue_scenario`

Pre-computed angka dari Sheet 6 (Konservatif/Moderat/Optimis × 5 segmen target).

---

## 8. Galen KB Tables (Schema `kb`)

### 8.1 `kb.reference_docs` — RAG storage

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID PK | |
| `source` | TEXT | e.g., 'framework_v1.4', 'paper_saptono_khozen', 'se-24-pj-2019' |
| `chunk_text` | TEXT | Chunk size ~500-1000 tokens |
| `chunk_metadata` | JSONB | Tambahan metadata |
| `embedding` | VECTOR(1536) | OpenAI text-embedding-3-small dim |
| `created_at` | TIMESTAMPTZ | |

**Index**: HNSW pada embedding untuk fast similarity search.

### 8.2 `kb.few_shot` — Q→reasoning→answer examples

Untuk in-context learning Galen specialist.

| Kolom | Tipe |
|-------|------|
| `id` | UUID PK |
| `category` | TEXT (e.g., 'segment_summary', 'treatment_rec') |
| `question` | TEXT |
| `reasoning` | TEXT (chain-of-thought) |
| `expected_answer` | TEXT |
| `embedding` | VECTOR(1536) |

### ⚠️ REVIEW DECISION 13
**Apakah pgvector/RAG perlu di pilot?** Alternatif:
- (a) **Pakai pgvector + RAG** (current) — Galen specialist bisa retrieve relevant context
- (b) **Skip RAG, system prompt static** — paste paper excerpt + framework langsung di prompt. Lebih simple, no embedding cost.

Pilot pragmatic answer:
- (a) kalau punya OpenAI API budget (~$5-10 untuk embedding semua docs)
- (b) kalau benar-benar minimum viable. Hilangkan ~6 jam setup, $0 cost.

Saya cenderung (a) karena framework v1.4 banyak nuance yang RAG handle better daripada compressed prompt.

---

## 9. System Tables (Schema `public`)

### 9.1 `public.batch_manifest`

| Kolom | Tipe |
|-------|------|
| `batch_id` | UUID PK |
| `source_file_name` | TEXT |
| `source_period` | TEXT |
| `raw_md5_checksum` | TEXT |
| `raw_row_count`, `loaded_row_count` | INT |
| `loaded_at` | TIMESTAMPTZ |
| `status` | TEXT (pending/loaded/failed/rolled_back) |
| `notes` | TEXT |

**Note**: Saat ini schema minimal. Production wajib expand dengan:
- `processed_by` (user/service account)
- `transform_git_commit`
- `failed_tests` (JSONB)
- `cleansed_md5_checksum`

### 9.2 `public.classify_vehicle_segment()` RPC

```sql
SELECT public.classify_vehicle_segment(
  '2024-01-15'::DATE,  -- sd_notice
  '2023-01-10'::DATE,  -- tanggal_transaksi
  2018                  -- thn_buat
);
-- Returns: 'M1'
```

Ad-hoc lookup function. Bisa dipanggil dari Galen Edge Functions atau Supabase Studio.

---

## 10. ERD-Style Relationship Diagram

```
                  ref.segmen (7 rows)
                       │ kode
       ┌───────────────┼─────────────────────┐
       │               │                     │
       ▼               ▼                     ▼
 treatment_lookup   raci_matrix      revenue_scenario
  (7 rows)          (30+ rows)       (15 rows)


 dim_kabupaten ◄───┐  dim_upt ◄───┐  dim_jenken ◄───┐  dim_layanan ◄───┐
 (14 rows)         │  (1+ rows)   │  (8 rows)       │  (auto)         │
                   │              │                  │                 │
                   │              │                  │                 │
                   │              │                  │                 │
            ┌──────┴──────────────┴──────────────────┘                 │
            │                                                          │
            ▼                                                          │
    gold.registry_fact (~428K rows)                                    │
            │                                                          │
            ▼                                                          │
    gold_plus.registry_segmented (VIEW)                                │
            │                                                          │
            ├──► gold_plus.agg_segmen_kabupaten (MV, ~98 rows)         │
            │                                                          │
            └──► gold_plus.agg_segmen_jenken (MV, ~56 rows)            │
                                                                       │
                                                                       │
    gold.transaksi_fact ◄──────────────────────────────────────────────┘
       (optional pilot, ~685K rows)


    public.batch_manifest (audit)
            │
            └──── tracks load events from local Python loader


    kb.reference_docs (RAG, pgvector)        kb.few_shot (training)
            │                                          │
            └─────────► Galen Specialist ◄─────────────┘
```

---

## 11. Indexes & Performance

| Index | Table | Purpose |
|-------|-------|---------|
| `idx_registry_kabupaten` | registry_fact | Filter by kabupaten |
| `idx_registry_jenken` | registry_fact | Filter by jenis kendaraan |
| `idx_registry_sd_notice` | registry_fact | Date range queries (segmentation) |
| `idx_transaksi_paid_on` | transaksi_fact | Time-series queries |
| `idx_transaksi_kabupaten` | transaksi_fact | Geographic filter |
| `idx_agg_segmen_kab` | agg_segmen_kabupaten (MV) | UNIQUE on join |
| `idx_agg_segmen_jen` | agg_segmen_jenken (MV) | UNIQUE on join |
| HNSW on embedding | kb.reference_docs | Vector similarity search |
| HNSW on embedding | kb.few_shot | Vector similarity search |

### ⚠️ REVIEW DECISION 14
**Indexes sudah cukup untuk pilot scope?**

Untuk 428K rows + monthly batch, indexes ini saja sudah cukup. Production scale (millions of rows) perlu:
- Composite indexes (e.g., `(segmen, kabupaten, paid_on)`)
- Partial indexes untuk hot queries
- Partitioning by year/month

---

## 12. Permissions & RLS

### 12.1 Pilot stance: RLS deferred

Saya **TIDAK enable RLS** di pilot. Akses pakai service role untuk semua. Reason:
- Pilot scope = internal demo, no end-user
- Setup RLS proper = 1-2 hari yang bisa dipakai untuk yang lain
- Service role bypass RLS anyway

### ⚠️ REVIEW DECISION 15
**Apakah ini OK?** Risk: kalau pilot accidentally exposed (anon key bocor), data terbuka. Mitigation:
- Treat anon key sebagai sensitive untuk pilot
- Tidak embed anon key di public client (kalau ada UI demo)
- Production phase langsung enable RLS dari day 1

### 12.2 Production stance (post-pilot)

RLS plan untuk production:
```sql
-- Galen specialist: aggregate-only access
CREATE POLICY galen_aggregates ON gold_plus.agg_segmen_kabupaten FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('galen_specialist', 'analyst'));

-- Data engineer: full access
CREATE POLICY de_full_access ON gold.registry_fact FOR ALL
  USING (auth.jwt() ->> 'role' IN ('data_engineer', 'admin'));

-- PII protection: nopol_masked, no_hp_masked NEVER exposed to non-admin
-- (column-level masking via VIEW with admin bypass)
```

---

## 13. Open Questions for User Review

Summary semua decision points yang minta review:

| # | Topic | Saya pilih | Alternatives | Comment |
|---|-------|-----------|--------------|---------|
| 1 | Schema split (5 schemas) | YES | Single `public` | OK? |
| 2 | Tipologi single/multi | Single | Multi-tipologi | Sampit confusion |
| 3 | dim_upt di pilot | Keep | Skip | |
| 4 | Avg PKB stored vs computed | Stored | Computed | |
| 5 | Seed full kode jenken | Partial | All | Need original list |
| 6 | batch_id di registry_fact | Skip | Add | Saya pikir add |
| 7 | transaksi_fact di pilot | Optional Day 4-5 | Mandatory Day 3 | |
| 8 | VIEW vs MV vs column | VIEW | MV / Column | |
| 9 | Threshold usia M2/S2 | <20 | ≤20 / 21+ | Ambiguity from framework |
| 10 | MV refresh daily | Daily | On batch trigger | |
| 11 | Many-to-many sebagai array | Array | Junction | |
| 12 | RACI 6 stakeholder columns | 6 columns | Junction | |
| 13 | pgvector/RAG di pilot | Yes | Static prompt | Cost ~$5-10 |
| 14 | Indexes coverage | Basic | Composite | OK pilot |
| 15 | RLS deferred | Deferred | Enable now | OK pilot |

---

## 14. Validation Queries

After running 01_schema.sql + 02_reference_data.sql + load:

```sql
-- 1. Schema present
SELECT schema_name FROM information_schema.schemata
WHERE schema_name IN ('gold','gold_plus','ref','kb');

-- 2. Tables present
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('gold','gold_plus','ref','kb','public')
ORDER BY 1, 2;

-- 3. Reference data loaded
SELECT COUNT(*) FROM ref.segmen;            -- expect 7
SELECT COUNT(*) FROM ref.treatment_lookup;  -- expect 7
SELECT COUNT(*) FROM ref.program_sadar;     -- expect 9
SELECT COUNT(*) FROM ref.raci_matrix;       -- expect 30+

-- 4. Test classification function
SELECT public.classify_vehicle_segment('2024-01-15'::DATE, '2023-01-10'::DATE, 2018);
-- expect 'M1'

-- 5. Verify segment distribution after data load
SELECT segmen_kepatuhan, COUNT(*) AS n,
       ROUND(COUNT(*)::NUMERIC * 100 / SUM(COUNT(*)) OVER (), 2) AS pct
FROM gold_plus.registry_segmented
GROUP BY segmen_kepatuhan
ORDER BY segmen_kepatuhan;

-- Expected match Sheet 2:
-- H1: 107,967 (25.23%)
-- K1:  33,789 ( 7.90%)
-- O1:  32,916 ( 7.69%)
-- M1:  25,039 ( 5.85%)
-- M2: 140,966 (32.94%)
-- S1:  12,756 ( 2.98%)
-- S2:  74,544 (17.42%)
-- TOTAL: 427,977
```

---

## 15. Migration Path to Production

| Component | Pilot | Production |
|-----------|-------|-----------|
| Bronze layer | Skip (CSV in laptop) | Supabase Storage + manifest |
| Silver layer | Inline cleansing in Python | dbt-core models |
| Gold schema | Current ✓ | Add SCD type 2 for taxonomy |
| Indexes | Basic | Composite + partial |
| RLS | Off | Enabled with proper roles |
| batch_manifest | Minimal | Full lineage (git commit, tests) |
| Refresh | pg_cron daily | Triggered by batch landing |
| Backup | None | Weekly pg_dump + restore test |
| Monitoring | None | Grafana + Sentry |
| Eval harness | Manual | CI weekly run |

---

## Appendix — File Cross-Reference

| File ini menjelaskan | File implementasi |
|----------------------|-------------------|
| Section 3 (dim tables) + 4 (fact) | `01_schema.sql` lines ~22-90 |
| Section 5 (registry_segmented view) | `01_schema.sql` lines ~95-145 |
| Section 6 (materialized views) | `01_schema.sql` lines ~150-200 |
| Section 7 (reference tables) | `01_schema.sql` lines ~205-275 (DDL only); seed di `02_reference_data.sql` |
| Section 8 (KB tables) | `01_schema.sql` lines ~310-360 |
| Section 9.1 (batch_manifest) | `01_schema.sql` lines ~280-300 |
| Section 9.2 (RPC function) | `01_schema.sql` lines ~365-395 |

---

*Schema review v1.0 · 30 April 2026 · ready untuk feedback*

# JR Pilot — Step-by-Step Implementation Guide
> 2-week sprint playbook untuk membangun Galen specialist berbasis framework PKB Micro-Segmentation v1.4.
>
> **Prerequisites confirmed**:
> - Hybrid approach (segmen FK + denormalized treatment text)
> - 3 input files: Data Dictionary, Palangka_Raya, Transaksi_2025
> - Reference date: 2025-05-01
> - Single fact table (no staging)
> - pgvector untuk KB
> - Service role untuk pilot (no RLS)

---

## Pre-flight Checklist

### Decisions Locked

- [x] Pendekatan: compute di Python local, Supabase = serving layer
- [x] Schema: `gold.registry_enriched` (FACT) + `gold.transaksi_fact` + `gold.dim_*` + `gold_plus.agg_*` + `ref.*` + `kb.*`
- [x] Hybrid: segmen sebagai kolom + treatment text **denormalized** di registry_enriched
- [x] Avg PKB di `dim_jenken` populated dari aggregate Transaksi_2025 (bukan magic number)
- [x] Data dictionary → embed ke `kb.reference_docs`
- [x] One-shot load, no incremental refresh

### Required Accounts

| Account | Purpose | Cost (pilot) |
|---------|---------|--------------|
| Supabase project | Database + serving | Free tier OK ($0) |
| OpenAI API | Embeddings untuk pgvector | ~$5-10 |
| Galen platform | Specialist runtime | (sudah ada) |

### Required Files

```
local_workspace/
├── pilot_starter_pack/         # akan di-update di guide ini
├── inputs/
│   ├── JR_Data_Dictionary.xlsx
│   ├── Palangka_Raya.csv
│   └── Transaksi_2025.csv
├── treatment_v1.4.yaml         # config dari framework
├── .env                        # credentials
└── outputs/                    # cleansed parquet untuk audit
    ├── enriched_registry.parquet
    ├── transaksi_aggregated.parquet
    └── verification_report.txt
```

### Environment Variables (.env)

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
SUPABASE_DB_PORT=6543
SUPABASE_DB_USER=postgres.your_project_ref
SUPABASE_DB_PASSWORD=...
SUPABASE_DB_NAME=postgres
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...

# OpenAI (untuk pgvector embeddings)
OPENAI_API_KEY=sk-...

# Reference date (single source of truth)
PILOT_REFERENCE_DATE=2025-05-01
```

### Python Dependencies

```bash
pip install pandas==2.* psycopg2-binary openpyxl pyarrow openai==1.* python-dotenv pyyaml
```

---

## Week 1: Data Foundation

### Day 1 — Supabase Setup & Pre-flight (4 hours)

**Goal**: Supabase project ready, extensions installed, schemas created, environment connected.

**Steps**:

**1.1** Buat Supabase project di https://supabase.com → "New project"
- Region: `Southeast Asia (Singapore)` untuk latency optimal dari Indonesia
- Pricing tier: Free (cukup untuk pilot 685K rows)

**1.2** Catat credentials dari Settings → API:
- Project URL → `SUPABASE_URL`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
- `anon` key → `SUPABASE_ANON_KEY`

**1.3** Catat DB credentials dari Settings → Database:
- Host (gunakan **pooler**, port 6543) → `SUPABASE_DB_HOST`
- User format `postgres.your_project_ref` → `SUPABASE_DB_USER`
- Password (set saat create project) → `SUPABASE_DB_PASSWORD`

**1.4** Save semua ke `.env` file di local workspace.

**1.5** Test connection:
```bash
psql "postgresql://${SUPABASE_DB_USER}:${SUPABASE_DB_PASSWORD}@${SUPABASE_DB_HOST}:6543/postgres?sslmode=require" \
  -c "SELECT version();"
```

**1.6** Install extensions di Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;       -- pgvector untuk RAG
CREATE EXTENSION IF NOT EXISTS pg_cron;      -- optional: scheduled refresh
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;  -- optional: query monitoring
```

**1.7** Create schemas:
```sql
CREATE SCHEMA IF NOT EXISTS gold;
CREATE SCHEMA IF NOT EXISTS gold_plus;
CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS kb;

COMMENT ON SCHEMA gold IS 'Fact + dim tables (cleansed + classified data)';
COMMENT ON SCHEMA gold_plus IS 'Materialized aggregate views';
COMMENT ON SCHEMA ref IS 'Reference / lookup data dari framework v1.4';
COMMENT ON SCHEMA kb IS 'Galen specialist knowledge base';
```

**Verify**:
```sql
-- Extensions
SELECT extname FROM pg_extension WHERE extname IN ('vector','pg_cron');
-- Expected: 2 rows (atau 1 kalau pg_cron tidak available di free tier — OK)

-- Schemas
SELECT schema_name FROM information_schema.schemata
WHERE schema_name IN ('gold','gold_plus','ref','kb');
-- Expected: 4 rows
```

✅ **Done criteria**: connection works, 4 schemas exist, vector extension installed.

**Troubleshoot**:
- Connection refused → check pooler port 6543 (NOT 5432)
- pg_cron unavailable → skip, akan refresh manual
- Permission denied → pakai service role connection string, bukan anon

---

### Day 2 — Schema DDL + Reference Data (8 hours)

**Goal**: Semua tables created dengan reference data ter-load. Schema match hybrid approach.

**2.1** Run `01_schema.sql` (HYBRID VERSION — saya akan provide updated file):

Highlights perubahan dari versi sebelumnya:
- `gold.registry_enriched` punya kolom **denormalized treatment**: `treatment_kanal_utama`, `treatment_kebijakan_amnesti`, `treatment_aksi_utama`, `treatment_perkiraan_konversi`
- TIDAK ADA `gold_plus.registry_segmented` VIEW — segmen sudah pre-computed di Python
- TIDAK ADA `public.classify_vehicle_segment()` RPC
- `dim_jenken.est_pkb_per_kendaraan` initially NULL — akan di-populate Day 3 dari aggregate Transaksi

```sql
-- Excerpt registry_enriched (the FACT table)
CREATE TABLE gold.registry_enriched (
  vehicle_id BIGINT PRIMARY KEY,
  nopol_masked TEXT,
  kabupaten_id INT REFERENCES gold.dim_kabupaten(kabupaten_id),
  upt_id INT REFERENCES gold.dim_upt(upt_id),
  kode_jenken TEXT REFERENCES gold.dim_jenken(kode_jenken),

  -- Source columns
  sd_notice DATE,
  tanggal_transaksi DATE,
  thn_buat INT,
  no_hp_masked TEXT,
  merek_kendaraan TEXT,
  tipe TEXT,
  bahan_bakar TEXT,
  warna_plat TEXT,
  kecamatan TEXT,
  kelurahan TEXT,

  -- Computed segmentation (pre-computed in Python)
  durasi_tunggakan_days INT,
  has_payment_history BOOLEAN,
  usia_kendaraan INT,
  has_phone BOOLEAN,
  segmen_kepatuhan TEXT REFERENCES ref.segmen(kode),  -- FK + denormalized

  -- Denormalized treatment (untuk fast read tanpa JOIN)
  treatment_kanal_utama TEXT,
  treatment_kebijakan_amnesti TEXT,
  treatment_aksi_utama TEXT,
  treatment_perkiraan_konversi TEXT,

  -- Estimated PKB (populated from Transaksi aggregate)
  est_pkb_per_kendaraan NUMERIC(12,0),

  -- Lineage
  loaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_period TEXT,
  batch_id UUID REFERENCES public.batch_manifest(batch_id)
);

CREATE INDEX idx_registry_segmen ON gold.registry_enriched(segmen_kepatuhan);
CREATE INDEX idx_registry_kabupaten ON gold.registry_enriched(kabupaten_id);
CREATE INDEX idx_registry_jenken ON gold.registry_enriched(kode_jenken);
CREATE INDEX idx_registry_sd_notice ON gold.registry_enriched(sd_notice);
```

**2.2** Run `02_reference_data.sql` (sama seperti sebelumnya — seed `ref.segmen`, `ref.treatment_lookup`, `ref.program_sadar`, `ref.raci_matrix`, `ref.revenue_scenario`).

**2.3** Buat config file `treatment_v1.4.yaml` di local workspace untuk Python loader (single-source-of-truth treatment yang akan di-denormalize):

```yaml
reference_date: "2025-05-01"
segments:
  H1:
    nama: "Patuh Aktif"
    treatment_kanal_utama: "WhatsApp otomatis"
    treatment_kebijakan_amnesti: "TIDAK ADA AMNESTI - retensi via loyalty"
    treatment_aksi_utama: "Pengingat ramah 30/14/7 hari sebelum jatuh tempo"
    treatment_perkiraan_konversi: "85-95%"
  K1:
    nama: "Baru Lewat Jatuh Tempo"
    treatment_kanal_utama: "WhatsApp + SMS cadangan"
    treatment_kebijakan_amnesti: "TIDAK ADA AMNESTI - denda <90 hari masih kecil"
    treatment_aksi_utama: "WhatsApp minggu 1, hari 30, hari 60, SMS hari 45"
    treatment_perkiraan_konversi: "60-75%"
  # ... O1, M1, M2, S1, S2 (lengkap di file Day 2 pack)
```

**Verify**:
```sql
SELECT COUNT(*) FROM ref.segmen;            -- 7
SELECT COUNT(*) FROM ref.treatment_lookup;  -- 7
SELECT COUNT(*) FROM ref.program_sadar;     -- 9
SELECT COUNT(*) FROM ref.raci_matrix;       -- 30+

-- Tables exist
SELECT table_schema, table_name FROM information_schema.tables
WHERE table_schema IN ('gold','gold_plus','ref','kb','public')
ORDER BY 1, 2;
```

✅ **Done criteria**: 7 segmen, 7 treatment, 9 programs, 30+ RACI rows. All tables created.

**Troubleshoot**:
- FK violation saat seed → pastikan urutan: ref.segmen DULU, baru treatment_lookup
- Schema not found → re-check Day 1.7

---

### Day 3 — Load Data: Klasifikasi + Rekomendasi (8 hours)

**Goal**: All 3 files processed. Registry enriched + segmented + treatment denormalized + uploaded.

> **⭐ Day 3 adalah inti pilot** — di sinilah klasifikasi 7-segmen dan rekomendasi treatment terjadi (rule-based di Python). Setelah Day 3 selesai, Supabase sudah punya data yang ready-to-serve untuk Galen.

#### 3.0 Critical Sequence (dependency order)

```
1. JR_Data_Dictionary.xlsx → kb.reference_docs (embedding)
2. Transaksi_2025.csv     → aggregate avg PKB per jenken → upsert dim_jenken
3. Palangka_Raya.csv      → cleanse + classify + enrich treatment + upsert registry_enriched
                            (butuh dim_jenken sudah populated dari step 2)
4. (Optional) Transaksi_2025.csv → load raw ke transaksi_fact
```

#### 3.1 Run the Loader

```bash
cd /local/workspace/
python pilot_starter_pack/11_load_pilot.py \
  --dictionary "inputs/JR_Data_Dictionary.xlsx" \
  --transaksi  "inputs/Transaksi_2025.csv" \
  --registry   "inputs/Palangka_Raya.csv" \
  --treatment-config "pilot_starter_pack/treatment_v1.4.yaml" \
  --output-dir "outputs/" \
  --reference-date "2025-05-01"
```

#### 3.2 Klasifikasi: function `classify_segment()`

**Lokasi**: `11_load_pilot.py` line ~225, dipanggil di Phase 3.3.

**Logic**: rule-based, priority-ordered sesuai framework v1.4. Diaplikasikan ke setiap row registry via `df.apply()`:

```python
def classify_segment(row) -> str:
    """7-segment classification per framework v1.4."""
    sd_days = row["durasi_tunggakan_days"]    # 2025-05-01 - sd_notice
    has_hist = row["has_payment_history"]      # tanggal_transaksi NOT NULL
    usia = row["usia_kendaraan"]               # 2025 - thn_buat

    # Out-of-pyramid (priority — never transacted)
    if not has_hist:
        if pd.notna(usia) and usia <= 15: return "S1"   # tangan-kedua tanpa balik nama
        elif pd.notna(usia) and usia > 15: return "S2"  # likely tidak ada fisik

    # In-pyramid: based on durasi tunggakan
    if pd.isna(sd_days) or sd_days <= 0:    return "H1"  # belum jatuh tempo
    if 1 <= sd_days <= 90:                   return "K1"  # baru lewat
    if 91 <= sd_days <= 365:                 return "O1"  # mulai mengabaikan
    if 366 <= sd_days <= 730:                return "M1"  # tidak patuh pasif (1-2 thn)
    if 731 <= sd_days <= 1825:               return "M2"  # tidak patuh kronis (2-5 thn)

    # Edge case: tunggakan >5 thn — reklasifikasi based on usia kendaraan
    if sd_days > 1825:
        if pd.notna(usia) and usia < 20: return "M2"
        else:                             return "S2"  # tunggakan kronis + kendaraan tua = ghost

    return "unclassified"

# Apply ke seluruh dataframe
df["segmen_kepatuhan"] = df.apply(classify_segment, axis=1)
```

**Output**: kolom `segmen_kepatuhan` ter-fill dengan H1/K1/O1/M1/M2/S1/S2 untuk setiap kendaraan.

#### 3.3 Rekomendasi Treatment: function `enrich_treatment()`

**Lokasi**: `11_load_pilot.py` line ~280, dipanggil di Phase 3.4.

**Logic**: pure lookup dari `treatment_v1.4.yaml` (single source of truth dari framework Sheet 3). **Bukan AI/LLM** — hanya map segmen → treatment text yang sudah pre-defined.

```python
def enrich_treatment(df: pd.DataFrame, treatment_config: dict) -> pd.DataFrame:
    """Lookup treatment per segmen → denormalize ke 4 kolom di setiap row."""
    segments_cfg = treatment_config["segments"]

    # Build flat lookup dicts (segmen_kode → text)
    kanal = {k: v.get("treatment_kanal_utama","").strip() for k,v in segments_cfg.items()}
    amnesti = {k: v.get("treatment_kebijakan_amnesti","").strip() for k,v in segments_cfg.items()}
    aksi = {k: v.get("treatment_aksi_utama","").strip() for k,v in segments_cfg.items()}
    konv = {k: v.get("treatment_perkiraan_konversi","").strip() for k,v in segments_cfg.items()}

    df["treatment_kanal_utama"] = df["segmen_kepatuhan"].map(kanal)
    df["treatment_kebijakan_amnesti"] = df["segmen_kepatuhan"].map(amnesti)
    df["treatment_aksi_utama"] = df["segmen_kepatuhan"].map(aksi)
    df["treatment_perkiraan_konversi"] = df["segmen_kepatuhan"].map(konv)

    return df

# Apply
treatment_config = yaml.safe_load(open("treatment_v1.4.yaml"))
df = enrich_treatment(df, treatment_config)
```

**Output**: 4 kolom treatment ter-fill di setiap row. Dengan 428K rows × 7 segmen, treatment text repeats banyak — tapi storage cost negligible dan AI query 1-tabel super simple (no JOIN).

#### 3.4 Sample Output Per Row

Setelah Phase 3 selesai, satu row di `enriched_registry.parquet` (dan `gold.registry_enriched`) tampak:

```python
{
  "vehicle_id": 12345, "nopol_masked": "KH****AB",
  "kabupaten_id": 6271, "kode_jenken": "R",
  "sd_notice": date(2024,1,15),
  "tanggal_transaksi": date(2023,1,10),
  "thn_buat": 2018, "no_hp_masked": "**********8",

  # Derived
  "durasi_tunggakan_days": 472, "has_payment_history": True,
  "usia_kendaraan": 7, "has_phone": True,

  # Classification result
  "segmen_kepatuhan": "M1",

  # Treatment lookup (denormalized)
  "treatment_kanal_utama": "WhatsApp + surat fisik + SAMSAT Keliling",
  "treatment_kebijakan_amnesti": "AMNESTI PARSIAL - pengurangan denda 50-75%...",
  "treatment_aksi_utama": "Personalisasi denda + Duta Pajak (Hayak Bahayau)...",
  "treatment_perkiraan_konversi": "25-40%",

  # Reference (lookup dari dim_jenken)
  "est_pkb_per_kendaraan": 122712,

  # Lineage
  "loaded_at": datetime, "batch_id": "abc-123-..."
}
```

#### 3.5 Phase Breakdown (apa yang script print di terminal)

```
[Phase 1/5] Reading & embedding data dictionary...
  → 70 chunks extracted dari dictionary
  → Embedding via OpenAI text-embedding-3-small...
  ✓ 70 chunks inserted ke kb.reference_docs

[Phase 2/5] Computing transaksi aggregates...
  → 685,751 transaksi rows
  → 685,749 transaksi dengan pokok_pkb > 0
  Avg PKB per kode_jenken:
  Kode   Jenis                      Avg PKB     N Trx
  R      SEPEDA MOTOR               122,712     516,725
  C      MINIBUS                  1,284,741     100,975
  F      PICK UP                  1,301,059      33,906
  [...]
  ✓ dim_jenken populated

[Phase 3/5] Loading registry (cleanse + classify + enrich + upload)...
  → 427,977 raw rows from Palangka_Raya.csv (md5=...)
  → Cleansing 427,977 rows... Filtered SAMSAT PALANGKARAYA only: 427,977 → 409,690
  → Deriving columns (durasi, has_history, usia, has_phone)...
  → Classifying 7-segment per framework v1.4...

  Segment distribution:
  Segmen   Actual  Expected   Diff %  ✓
  H1      107,xxx 107,967     +x.xx%  ✓
  K1       33,xxx  33,789     +x.xx%  ✓
  [...]

  → Enriching treatment columns dari treatment_v1.4.yaml...
  → Mapping est_pkb_per_kendaraan dari dim_jenken...
  → Saved enriched data ke outputs/enriched_registry.parquet
  → Inserting batch manifest... batch_id = abc-123-...
  → Bulk uploading 409,690 rows ke gold.registry_enriched...
  ✓ 409,690 records loaded

[Phase 4/5] Loading raw transaksi to gold.transaksi_fact... (optional, can skip)
  ✓ 685,751 transaksi loaded

[Phase 5/5] Verification + refresh materialized views...
  → ✓ gold_plus.agg_segmen_kabupaten
  → ✓ gold_plus.agg_segmen_jenken
  Running verification queries...

VERIFICATION REPORT
====================
Total rows: 409,690 / Expected: 427,977 / Diff: -18,287 (filtered SAMSAT PALANGKARAYA)
Segmen   Actual    Expected   Diff%   Phone%  Treat ✓
  H1    107,xxx   107,967    +x.xx%  99.99%      1  ✓
  [...]
OVERALL: ✓ PASS

✓ PILOT DATA LOADED SUCCESSFULLY
```

#### 3.6 Inspect Output BEFORE moving on (CRITICAL)

```bash
# Quick spot check
python -c "
import pandas as pd
df = pd.read_parquet('outputs/enriched_registry.parquet')
print('Shape:', df.shape)
print('\\nSegment distribution:')
print(df['segmen_kepatuhan'].value_counts())
print('\\nSample M1 row:')
sample = df[df['segmen_kepatuhan']=='M1'].iloc[0]
print(f'  durasi_tunggakan: {sample.durasi_tunggakan_days} hari')
print(f'  treatment_kanal: {sample.treatment_kanal_utama[:60]}...')
print(f'  treatment_amnesti: {sample.treatment_kebijakan_amnesti[:60]}...')
"
```

**Verify** (di Supabase SQL Editor):
```sql
-- 1. Total rows + segment distribution match
SELECT segmen_kepatuhan, COUNT(*) AS n,
       ROUND(COUNT(*)::NUMERIC * 100 / SUM(COUNT(*)) OVER (), 2) AS pct
FROM gold.registry_enriched
GROUP BY segmen_kepatuhan ORDER BY 1;

-- 2. Treatment denormalized (1 distinct treatment per segmen)
SELECT segmen_kepatuhan,
       COUNT(DISTINCT treatment_kanal_utama) AS n_unique_kanal,
       COUNT(DISTINCT treatment_kebijakan_amnesti) AS n_unique_amnesti
FROM gold.registry_enriched GROUP BY 1 ORDER BY 1;
-- Expected: semua = 1 (1 treatment text per segmen)

-- 3. Sample treatment text per segmen
SELECT DISTINCT segmen_kepatuhan, treatment_kanal_utama
FROM gold.registry_enriched ORDER BY 1;

-- 4. dim_jenken populated dari Transaksi aggregate
SELECT kode_jenken, jenis_kendaraan, est_pkb_per_kendaraan
FROM gold.dim_jenken ORDER BY est_pkb_per_kendaraan DESC;
```

**3.2** Inspect output files BEFORE moving on:
```bash
# Spot check enriched data
python -c "
import pandas as pd
df = pd.read_parquet('outputs/enriched_registry.parquet')
print('Shape:', df.shape)
print('Columns:', list(df.columns))
print('\\nSegment distribution:')
print(df['segmen_kepatuhan'].value_counts())
print('\\nSample row:')
print(df.iloc[0].to_dict())
"
```

**Verify** (di Supabase SQL Editor):
```sql
-- 1. Total rows
SELECT COUNT(*) FROM gold.registry_enriched;
-- Expected: ~427,977

-- 2. Segment distribution match Sheet 2
SELECT segmen_kepatuhan, COUNT(*) AS n,
       ROUND(COUNT(*)::NUMERIC * 100 / SUM(COUNT(*)) OVER (), 2) AS pct
FROM gold.registry_enriched
GROUP BY segmen_kepatuhan
ORDER BY segmen_kepatuhan;
-- Expected (from Sheet 2):
-- H1: 107,967 (25.23%)
-- K1:  33,789 ( 7.90%)
-- O1:  32,916 ( 7.69%)
-- M1:  25,039 ( 5.85%)
-- M2: 140,966 (32.94%)
-- S1:  12,756 ( 2.98%)
-- S2:  74,544 (17.42%)

-- 3. Avg PKB di dim_jenken populated
SELECT kode_jenken, jenis_kendaraan, est_pkb_per_kendaraan
FROM gold.dim_jenken ORDER BY kode_jenken;
-- Expected: all kode populated dengan angka realistic

-- 4. Treatment denormalized
SELECT segmen_kepatuhan, treatment_kanal_utama, COUNT(*)
FROM gold.registry_enriched
WHERE segmen_kepatuhan = 'M2'
GROUP BY 1, 2;
-- Expected: 1 row dengan kanal_utama "WhatsApp (71% terjangkau)..."

-- 5. Phone availability per segmen
SELECT segmen_kepatuhan,
       ROUND(AVG(CASE WHEN has_phone THEN 1.0 ELSE 0.0 END)::NUMERIC, 4) AS pct_punya_hp
FROM gold.registry_enriched GROUP BY 1 ORDER BY 1;
-- Expected (Sheet 2):
-- H1: 0.9999, K1: 0.9999, O1: 0.9998, M1: 0.9991,
-- M2: 0.7108, S1: 0.0159, S2: 0.1924
```

✅ **Done criteria**: 427,977 rows ter-load, distribusi ±5% dari expected, treatment_kanal_utama populated, has_phone match.

**Troubleshoot**:
- Distribusi off >10% → ada bug di classification logic. Check `outputs/enriched_registry.parquet` dengan inspector script
- has_phone semua FALSE → check parsing `no_hp_masked` (might be filtering "" too aggressive)
- Upload gagal mid-way → batch_manifest akan show status='failed'. Re-run script (idempotent dengan ON CONFLICT)
- Konfirmasi dari Anda: kalau distribusi off di kabupaten lain (selain PR), harap diketahui — pilot ini PR-only

---

### Day 4 — Materialized Views + Verification (4 hours)

**Goal**: Pre-aggregates ready untuk Galen Edge Functions. End-to-end verification.

**4.1** Refresh MVs:
```sql
REFRESH MATERIALIZED VIEW gold_plus.agg_segmen_kabupaten;
REFRESH MATERIALIZED VIEW gold_plus.agg_segmen_jenken;
-- Optional: kalau load transaksi_fact juga (Phase 4 loader)
-- REFRESH MATERIALIZED VIEW gold_plus.agg_transaksi_monthly_kab;
```

**4.2** Setup pg_cron schedule (kalau available di tier):
```sql
SELECT cron.schedule(
  'refresh-mv-daily', '0 4 * * *',
  $$
    REFRESH MATERIALIZED VIEW gold_plus.agg_segmen_kabupaten;
    REFRESH MATERIALIZED VIEW gold_plus.agg_segmen_jenken;
  $$
);
```
Kalau tidak available, skip — pilot one-shot tidak butuh refresh otomatis.

**4.3** Run full verification suite:
```sql
-- Sanity 1: Volume per segmen sesuai Sheet 2
SELECT segmen_kepatuhan, n_kendaraan
FROM gold_plus.agg_segmen_kabupaten
WHERE nama_kabupaten = 'PALANGKA RAYA'
ORDER BY segmen_kepatuhan;

-- Sanity 2: Total potensi PKB sesuai Sheet 2
SELECT segmen_kepatuhan, total_potensi_pkb
FROM gold_plus.agg_segmen_kabupaten
WHERE nama_kabupaten = 'PALANGKA RAYA'
ORDER BY segmen_kepatuhan;
-- Expected (kira-kira):
-- K1: ~Rp 18.0 M
-- O1: ~Rp 14.3 M
-- M1: ~Rp 9.8 M
-- M2: ~Rp 33.9 M
-- S1: ~Rp 2.0 M
-- S2: ~Rp 19.3 M

-- Sanity 3: Composition jenken match Sheet 7
SELECT segmen_kepatuhan, jenis_kendaraan, jumlah, ROUND(pct_volume * 100, 2) AS pct
FROM gold_plus.agg_segmen_jenken
WHERE segmen_kepatuhan = 'M2'
ORDER BY jumlah DESC;
-- Expected M2: SEPEDA MOTOR ~90.9%, MINIBUS ~3.5%, PICK UP ~3.0%
```

✅ **Done criteria**: 7 segmen × 1 kabupaten = 7 rows; total potensi PKB match Sheet 2 ±5%.

**Troubleshoot**:
- MV refresh slow → normal untuk first-time, ~10-30 detik untuk 428K rows
- Total potensi PKB jauh berbeda → check apakah dim_jenken.est_pkb_per_kendaraan populated benar dari Day 3 Phase 2

---

### Day 5 — Knowledge Base Loading (8 hours)

**Goal**: Galen KB ready dengan reference docs + few-shot examples.

**5.1** Buat script `12_embed_kb.py`:

```python
# 12_embed_kb.py — embed reference docs ke pgvector
import os, json, openai, psycopg2
from psycopg2.extras import execute_values
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

def chunk_text(text, max_chars=1000, overlap=200):
    """Sliding window chunker."""
    chunks = []
    i = 0
    while i < len(text):
        chunks.append(text[i:i+max_chars])
        i += max_chars - overlap
    return chunks

def embed(text):
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return resp.data[0].embedding  # 1536-dim

def main():
    # Sources to embed
    sources = [
        ("framework_v1.4_kerangka", "framework_v1.4_kerangka_segmentasi.md"),
        ("framework_v1.4_strategi", "framework_v1.4_strategi_program_sadar.md"),
        ("framework_v1.4_raci", "framework_v1.4_raci.md"),
        ("paper_saptono_khozen", "saptono_khozen_2021.txt"),
        # data_dictionary sudah di-embed di Day 3 Phase 1
    ]

    conn = psycopg2.connect(...)  # from .env
    cur = conn.cursor()

    for source_label, filepath in sources:
        with open(filepath) as f:
            text = f.read()
        chunks = chunk_text(text)
        rows = []
        for chunk in chunks:
            emb = embed(chunk)
            rows.append((source_label, chunk, json.dumps({}), emb))

        execute_values(cur,
            "INSERT INTO kb.reference_docs (source, chunk_text, chunk_metadata, embedding) VALUES %s",
            rows
        )
        conn.commit()
        print(f"✓ {source_label}: {len(chunks)} chunks embedded")

    cur.close(); conn.close()

if __name__ == "__main__":
    main()
```

**5.2** Generate framework v1.4 docs sebagai markdown (saya akan provide):
- `framework_v1.4_kerangka_segmentasi.md` (dari Sheet 1)
- `framework_v1.4_strategi_program_sadar.md` (dari Sheet 3)
- `framework_v1.4_raci.md` (dari Sheet 4)

**5.3** Run embedding:
```bash
python pilot_starter_pack/12_embed_kb.py
# Total cost: ~$0.50-1.00 untuk semua reference docs
```

**5.4** Load few-shot examples ke `kb.few_shot`:
```python
# 13_load_few_shot.py
import json, psycopg2
from psycopg2.extras import execute_values

conn = psycopg2.connect(...)
cur = conn.cursor()

with open("pilot_starter_pack/04_galen_few_shot.jsonl") as f:
    examples = [json.loads(line) for line in f]

# Embed questions for similarity search
from openai import OpenAI
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

rows = []
for ex in examples:
    emb = client.embeddings.create(
        model="text-embedding-3-small",
        input=ex["question"]
    ).data[0].embedding
    rows.append((
        ex.get("category"),
        ex["question"],
        ex.get("reasoning",""),
        ex["expected_answer"],
        emb
    ))

execute_values(cur,
    "INSERT INTO kb.few_shot (category, question, reasoning, expected_answer, embedding) VALUES %s",
    rows
)
conn.commit()
print(f"✓ {len(rows)} few-shot examples loaded")
```

**Verify**:
```sql
-- 1. KB populated
SELECT source, COUNT(*) FROM kb.reference_docs GROUP BY source;
-- Expected: data_dictionary (~70), framework_v1.4_* (~50-100 each), paper (~50)

SELECT COUNT(*) FROM kb.few_shot;
-- Expected: 15

-- 2. Test similarity search
WITH query_embedding AS (
  -- Replace dengan actual embedding dari OpenAI API call
  SELECT '[your_1536_dim_vector]'::vector AS emb
)
SELECT source, chunk_text, 1 - (embedding <=> q.emb) AS similarity
FROM kb.reference_docs, query_embedding q
ORDER BY embedding <=> q.emb LIMIT 5;
```

Atau test via Python:
```python
import openai, psycopg2
client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])

query = "amnesti efektif untuk segmen apa"
emb = client.embeddings.create(model="text-embedding-3-small", input=query).data[0].embedding

conn = psycopg2.connect(...)
cur = conn.cursor()
cur.execute("""
  SELECT source, chunk_text, 1 - (embedding <=> %s::vector) AS sim
  FROM kb.reference_docs ORDER BY embedding <=> %s::vector LIMIT 3
""", (emb, emb))
for source, text, sim in cur.fetchall():
    print(f"[{sim:.3f}] {source}: {text[:200]}...")
```

✅ **Done criteria**: 200+ chunks embedded, similarity search returns relevant results untuk query test.

**Troubleshoot**:
- OpenAI rate limit → batch insert dengan `time.sleep(0.1)` antar chunk
- Vector dimension mismatch → confirm `text-embedding-3-small` = 1536 dim, schema also 1536
- Similarity scores semua di bawah 0.5 → embedding mungkin tidak appropriate; coba `text-embedding-3-large` (3072 dim, tapi update schema)

---

## Week 2: Galen + Demo

### Day 6 — Edge Functions Deploy (4 hours)

**Goal**: 3 Edge Functions live (classify_segment di-skip karena segmen pre-computed).

**6.1** Install Supabase CLI:
```bash
npm install -g supabase
supabase login
supabase link --project-ref your_project_ref
```

**6.2** Deploy 3 functions (UPDATED versions — saya akan provide):

```bash
# Functions yang relevant untuk hybrid approach:
supabase functions deploy treatment_recommend
supabase functions deploy segment_summary
supabase functions deploy revenue_projection

# classify_segment di-skip karena tidak diperlukan
# (classification sudah di-Python, hasil di-store di kolom)
```

**Catatan perubahan dari sebelumnya**:
- `treatment_recommend.ts` jadi simpler — query langsung `gold.registry_enriched` (treatment text sudah di kolom), no JOIN ke ref.treatment_lookup needed
- Atau alternatively: query `ref.treatment_lookup` directly kalau request hanya butuh segmen (tanpa filter spesifik kendaraan)

**6.3** Test setiap function:
```bash
ANON_KEY=$SUPABASE_ANON_KEY
URL=$SUPABASE_URL/functions/v1

# Test treatment_recommend
curl -X POST "$URL/treatment_recommend" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"segmen_kode": "M2", "kabupaten": "PALANGKA RAYA"}' | jq

# Test segment_summary
curl -X POST "$URL/segment_summary" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | jq

# Test revenue_projection
curl -X POST "$URL/revenue_projection" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scenario": "Konservatif"}' | jq
```

**Verify**: setiap call return valid JSON dengan field expected, latency <2 detik.

✅ **Done criteria**: 3 Edge Functions deployed dan tested.

**Troubleshoot**:
- Cold start latency tinggi (5-10s first call) → normal, akan stabil setelah warm
- Auth error → check anon key di header
- Schema not found → Edge Function auth role harus bisa SELECT dari schema target

---

### Day 7 — Galen Specialist Configuration (8 hours)

**Goal**: Galen specialist live di platform, bisa answer queries via tools.

**7.1** Di Galen platform, create new specialist "JR PKB Kalteng":

**7.2** Paste system prompt dari `03_galen_system_prompt.md` (dengan minor update untuk hybrid approach):
- Tambahkan note: "segmen sudah pre-computed di kolom registry_enriched.segmen_kepatuhan, jadi tidak perlu compute on-the-fly"
- Treatment text sudah denormalized di kolom — Galen bisa query langsung tanpa lookup

**7.3** Embed top 7 few-shot examples inline dari `04_galen_few_shot.jsonl`:
- Pilih yang paling diverse: segment summary, treatment rec, S1/S2 distinction, amnesty policy, RACI, revenue projection, anti-pattern

**7.4** Wire tools (Edge Functions sebagai callable):
```yaml
tools:
  - name: get_treatment_recommendation
    endpoint: $SUPABASE_URL/functions/v1/treatment_recommend
    args: { segmen_kode: string, kabupaten: string? }

  - name: get_segment_summary
    endpoint: $SUPABASE_URL/functions/v1/segment_summary
    args: { kabupaten: string?, segmen: string?, group_by: enum }

  - name: get_revenue_projection
    endpoint: $SUPABASE_URL/functions/v1/revenue_projection
    args: { scenario: string?, custom_konversi: object? }

  - name: search_kb_docs
    endpoint: $SUPABASE_URL/rest/v1/rpc/search_docs
    args: { query_embedding: vector, match_count: int }
```

**7.5** Set tone & output format:
- Bahasa: Indonesia (mixed dengan English untuk istilah teknis)
- Format: TL;DR + breakdown table + caveat + action konkret
- Max length: 500 words per response

**7.6** Test 5 baseline queries:
1. "Berapa kendaraan di segmen M2?"
2. "Treatment apa untuk M1?"
3. "Bedanya S1 dan S2?"
4. "Berapa potensi pendapatan konservatif?"
5. "Boleh kirim WhatsApp ke S2?"

**Verify**: Galen jawab semua dengan segmen context, panggil tools yang appropriate, no anti-pattern.

✅ **Done criteria**: 5/5 baseline queries answered correctly.

---

### Day 8 — Test & Iterate (8 hours)

**Goal**: ≥80% accuracy on 15-query eval set.

**8.1** Run all 15 queries dari `04_galen_few_shot.jsonl`. Untuk setiap query:
- Catat actual response
- Score against expected_answer
- Identify failure mode (wrong segmen, missing context, hallucination, anti-pattern)

**8.2** Common failure modes & fixes:

| Failure | Fix |
|---------|-----|
| Galen jawab tanpa segmen context | Strengthen system prompt rule #1 dengan contoh konkret |
| Salah klasifikasi S1 vs S2 | Tambahkan dedicated few-shot untuk S1/S2 distinction |
| Lupa amnesti tidak blanket | Tambahkan anti-pattern check di prompt |
| Hallucinate angka | Force tool call: "Selalu panggil get_segment_summary untuk angka" |
| Lupa caveat data limitation | Tambahkan "Selalu sebutkan: data PR scope only" |

**8.3** Iterate prompt + few-shot:
- Update system prompt berdasarkan failure modes
- Add 3-5 more few-shot examples untuk edge cases
- Re-test full 15 queries
- Repeat until ≥80% pass

**8.4** Document final eval results:
```
eval_results_d8.txt
=====================
Date: 2026-05-XX
Queries tested: 15
Passed: 13
Failed: 2 (Q12 hub industri scope, Q15 budget allocation)
Pass rate: 86.7%
✓ MEETS PILOT CRITERIA (≥80%)
```

✅ **Done criteria**: ≥12/15 queries pass + documented eval report.

**Troubleshoot**:
- Pass rate <80% setelah 2 iterasi → review whether prompt sudah specific enough; might need to add more constrained tool definitions
- Galen consistently fail tertentu segmen → add specific decision rule in prompt
- Tool calls timeout → check Edge Function latency; tambahkan timeout config

---

### Day 9 — Demo Preparation (8 hours)

**Goal**: Demo materials ready, tested, scheduled.

**9.1** Pilih 5 demo queries yang showcase value:

**Query 1 — Strategic distribution**
"Bagaimana distribusi compliance kita di Palangka Raya, dan segmen mana yang harus kita prioritaskan?"

→ Showcases: framework understanding, distribution numbers, prioritization rationale

**Query 2 — Treatment differentiation**
"Beri saya perbandingan treatment untuk M1 vs M2. Kenapa berbeda?"

→ Showcases: amnesti differentiation logic, anti-blanket policy

**Query 3 — Hidden opportunity**
"Apa beda S1 dan S2? Mana yang punya potensi revenue lebih besar?"

→ Showcases: out-of-pyramid analysis, BBNKB lever, S1 compounding value

**Query 4 — Revenue projection what-if**
"Kalau kita bisa konversi 25% segmen M2, berapa tambahan revenue?"

→ Showcases: tool use (revenue_projection), framework calibration

**Query 5 — Operational handoff**
"Saya mau jalankan kampanye amnesti M2. Siapa stakeholder yang harus terlibat dan apa peran masing-masing?"

→ Showcases: RACI lookup, ecosystem awareness

**9.2** Slide deck 5-slide outline:
1. **Problem** — data ada tapi belum actionable. Manual analysis lambat.
2. **Solution** — Galen specialist dengan framework v1.4 sebagai mental model
3. **Demo live** — 5 queries di atas
4. **Results** — accuracy 86.7%, latency <5s, demo-able
5. **What's next** — production phase 8-10 weeks, target M2 amnesty pilot

**9.3** Backup plan kalau live fails:
- Screenshot semua 5 query responses untuk fallback
- Pre-recorded video walkthrough (5 menit)
- Print-out treatment lookup sebagai handout

**9.4** Schedule dengan stakeholders:
- Email invite minimal 24 jam advance
- Calendar block 60 menit (40 demo + 20 Q&A)
- Send pre-read: 1-page exec summary

**9.5** Final dry run dengan 1 colleague:
- Run 5 queries live
- Time each (target <30s end-to-end)
- Adjust pacing

✅ **Done criteria**: slides ready, 5 queries dry-run passed, stakeholder calendar locked.

---

### Day 10 — Stakeholder Demo (4 hours)

**Goal**: Demo executed, decision captured, next phase planned.

**10.1** Pre-demo (1 hour before):
- Verify Supabase services up
- Verify Edge Functions warm (call each once)
- Verify Galen platform accessible
- Open all 5 backup screenshots dalam tab terpisah

**10.2** Demo sequence (40 menit):
- 5 menit: Problem & solution intro (slide 1-2)
- 25 menit: Live demo 5 queries (Slide 3) — tiap query 4-5 menit
- 5 menit: Results & metrics (Slide 4)
- 5 menit: What's next (Slide 5)

**10.3** Q&A (20 menit):
- Anticipate questions:
  - "Berapa cost?" → ~$30/bulan Supabase + LLM cost variable
  - "Bisa untuk kabupaten lain?" → Yes, perlu data ingest (not yet in pilot)
  - "Bisa integrate dengan WhatsApp Gateway?" → Edge Function bisa, perlu vendor TI
  - "Kapan production-ready?" → 8-10 weeks post-pilot

**10.4** Capture feedback dalam dokumen:
- Decision: green-light / iterate / pivot
- Concerns raised
- Feature requests
- Stakeholder yang vocal supporting / blocking

**10.5** Plan next phase berdasarkan outcome:

**Kalau green-light** → start production phase planning:
- Bronze + Silver layer dengan dbt
- RLS policies + PII protection
- Multi-environment setup
- Monitoring + eval CI
- Extend ke Hub Industri + Hinterland data

**Kalau iterate** → identify specific gaps:
- Quality issues → strengthen KB
- Scope issues → narrow pilot
- Integration issues → focus pada specific stakeholder

**Kalau pivot** → understand failure mode:
- Data not actionable → re-think framework
- Stakeholder not engaged → re-think value prop
- Tech complexity too high → simplify architecture

✅ **Done criteria**: demo completed, decision documented, next-step plan agreed.

---

## Appendix A — File Inventory (After Implementation)

```
pilot_starter_pack/
├── 00_implementation_guide.md        ← this file
├── 01_schema.sql                     ← UPDATED hybrid version
├── 01_schema_review.md               ← UPDATED dengan hybrid notes
├── 02_reference_data.sql             ← (no change)
├── 03_galen_system_prompt.md         ← UPDATED minor (mention pre-computed)
├── 04_galen_few_shot.jsonl           ← (no change)
├── 05_galen_treatment_lookup.json    ← (no change, sebagai reference)
├── 06_galen_decision_rules.yaml      ← (no change)
├── 07_edge_function_classify_segment.ts  ← DEPRECATED (not deployed)
├── 08_edge_function_treatment_recommend.ts  ← UPDATED simpler
├── 09_edge_function_segment_summary.ts  ← (no change)
├── 10_edge_function_revenue_projection.ts  ← (no change)
├── 11_load_pilot.py                  ← UPDATED hybrid + 3-files
├── 12_embed_kb.py                    ← NEW (Day 5)
├── 13_load_few_shot.py               ← NEW (Day 5)
├── README.md                         ← UPDATED reference

local_workspace/
├── treatment_v1.4.yaml               ← NEW (Day 2 config)
├── inputs/
│   ├── JR_Data_Dictionary.xlsx
│   ├── Palangka_Raya.csv
│   └── Transaksi_2025.csv
├── outputs/                          ← Python loader output
│   ├── enriched_registry.parquet
│   ├── transaksi_aggregated.parquet
│   └── verification_report.txt
└── .env                              ← credentials
```

---

## Appendix B — Common Issues & Recovery

| Issue | Symptom | Recovery |
|-------|---------|----------|
| Schema apply error | `relation already exists` | Drop schema + re-create, atau pakai `IF NOT EXISTS` |
| Connection pool exhausted | `too many connections` | Use Supabase pooler port 6543, bukan 5432 |
| Embedding rate limit | OpenAI 429 error | Add `time.sleep(0.1)` between calls, atau batch |
| Vector mismatch | `expected vector(1536), got vector(3072)` | Pakai consistent embedding model. Default: text-embedding-3-small (1536) |
| Segment distribution off | Counts way different from Sheet 2 | Check classification logic di Python: ref date, type casting, edge cases |
| MV refresh slow | >60 detik | Add CONCURRENTLY (perlu unique index), atau pakai non-concurrent untuk one-shot |
| Galen tool timeout | Edge Function returns 504 | Optimize Edge Function query, add limit clauses |
| Few-shot tidak load | `column embedding is not nullable` | Embed dulu sebelum insert (kb.few_shot.embedding NOT NULL) |

---

## Appendix C — Files Saya Akan Generate Berikutnya

Setelah Anda confirm guide ini, saya akan rewrite/generate:

**WAJIB update** (sesuai hybrid + 3-files):
1. `01_schema.sql` — drop registry_segmented VIEW, tambah denormalized treatment columns di registry_enriched, hilangkan classify_vehicle_segment RPC
2. `01_schema_review.md` — refresh sesuai schema baru
3. `11_load_pilot.py` — extend dengan Phase 1 (dictionary), Phase 2 (transaksi aggregate), Phase 3 (registry dengan denormalize), Phase 4 (optional raw transaksi), Phase 5 (verify)
4. `08_edge_function_treatment_recommend.ts` — simplifikasi, query langsung registry_enriched
5. `03_galen_system_prompt.md` — minor update mention pre-computed columns
6. `README.md` — update flow + file list

**FILE BARU**:
7. `treatment_v1.4.yaml` — config single-source-of-truth untuk Python loader
8. `12_embed_kb.py` — embedding script (Day 5)
9. `13_load_few_shot.py` — few-shot loader script (Day 5)
10. `framework_v1.4_kerangka_segmentasi.md` — markdown export Sheet 1
11. `framework_v1.4_strategi_program_sadar.md` — markdown export Sheet 3
12. `framework_v1.4_raci.md` — markdown export Sheet 4

**DEPRECATED** (tetap ada di folder tapi tidak deployed):
- `07_edge_function_classify_segment.ts` — tidak diperlukan (segmen pre-computed)

---

## Quick Start Reference

```bash
# Setup (one-time)
psql ... < 01_schema.sql
psql ... < 02_reference_data.sql

# Load (Day 3)
python 11_load_pilot.py \
  --dictionary inputs/JR_Data_Dictionary.xlsx \
  --transaksi  inputs/Transaksi_2025.csv \
  --registry   inputs/Palangka_Raya.csv \
  --treatment-config treatment_v1.4.yaml \
  --output-dir outputs/

# KB embedding (Day 5)
python 12_embed_kb.py
python 13_load_few_shot.py

# Edge Functions deploy (Day 6)
supabase functions deploy treatment_recommend
supabase functions deploy segment_summary
supabase functions deploy revenue_projection

# Demo (Day 10)
# (Galen platform UI)
```

---

## Decision: Lanjut Generate Files?

Guide ini self-contained — Anda bisa baca ini sambil saya generate file-file di Appendix C.

**Konfirmasi: lanjut generate semua updated files?**

Estimasi waktu generate:
- 6 file UPDATE: ~30 menit
- 3 file BARU (script Python): ~30 menit
- 3 file BARU (markdown framework export): ~20 menit
- Total: ~80 menit kerjanya

Atau Anda mau review guide dulu sebelum saya proceed ke generate?

---

*Implementation guide v1.0 · pilot 2-week sprint · ready untuk eksekusi.*

# CSV Files untuk Supabase Import

11 CSV files yang ready di-import ke Supabase project Anda. Generated dari sumber yang sama dengan `supabase_setup_full.sql`.

## File Inventory

| # | File | Target Table | Rows | Notes |
|---|------|--------------|------|-------|
| 01 | `01_dim_kabupaten.csv` | `gold.dim_kabupaten` | 14 | Master kabupaten Kalteng + tipologi |
| 02 | `02_dim_upt.csv` | `gold.dim_upt` | 2 | PR seed only (auto-grow saat data masuk) |
| 03 | `03_dim_jenken.csv` | `gold.dim_jenken` | 8 | Jenis kendaraan + avg PKB dari Sheet 7 |
| 04 | `04_dim_layanan.csv` | `gold.dim_layanan` | 23 | 23 service types Samsat |
| 05 | `05_ref_segmen.csv` | `ref.segmen` | 7 | 7 segmen definitions per framework v1.4 |
| 06 | `06_ref_treatment_lookup.csv` | `ref.treatment_lookup` | 7 | Treatment per segmen (Sheet 3) |
| 07 | `07_ref_program_sadar.csv` | `ref.program_sadar` | 9 | 9 SADAR programs (Sheet 5) |
| 08 | `08_ref_raci_matrix.csv` | `ref.raci_matrix` | 47 | RACI per aksi kunci (Sheet 4) |
| 09 | `09_ref_revenue_scenario.csv` | `ref.revenue_scenario` | 15 | 5 segmen × 3 skenario (Sheet 6) |
| 10 | `10_kb_reference_docs.csv` | `kb.reference_docs` | 48 | Framework chunks (NO embedding column) |
| 11 | `11_kb_few_shot.csv` | `kb.few_shot` | 15 | Q→reasoning→answer (NO embedding column) |

**IMPORT ORDER MATTERS** karena ada FK dependencies. Ikuti urutan numerik di nama file (01 → 11).

---

## Format Specification

- **Encoding**: UTF-8
- **Delimiter**: comma (`,`)
- **Quote char**: double-quote (`"`)
- **Quoting**: ALL fields quoted (untuk safety dengan multi-line text)
- **Line terminator**: `\n` (Unix-style)
- **Boolean**: `TRUE` / `FALSE`
- **Array fields** (di program_sadar): Postgres array literal format `{H1,K1,O1}` (curly braces, comma-separated)
- **JSON fields** (chunk_metadata): JSON string sebagai TEXT — Supabase akan auto-cast ke JSONB

---

## Method 1: Supabase Studio (UI Import)

Paling mudah untuk pilot — drag-and-drop di browser.

### Steps

1. **Setup tables dulu** (run `supabase_setup_full.sql` di SQL Editor)

2. **Open Supabase Studio** → project Anda → **Table Editor**

3. **Per CSV file, ikuti urutan 01 → 11**:
   - Pilih schema yang sesuai (gold/ref/kb) dari dropdown atas
   - Klik tabel target
   - Klik tombol **"Insert"** → **"Import data via CSV"**
   - Drag file CSV atau klik "Browse files"
   - Studio akan auto-detect columns
   - **Match columns** → pastikan setiap kolom CSV sesuai kolom tabel
   - Klik **"Import data"**

4. **Untuk file dengan FK dependencies**, urutan import wajib:
   - Pertama: `dim_kabupaten` (no FK)
   - Lalu: `dim_upt` (FK ke kabupaten)
   - Lalu: `dim_jenken`, `dim_layanan` (no FK)
   - Lalu: `ref_segmen` (no FK)
   - Lalu: `ref_treatment_lookup`, `ref_raci_matrix`, `ref_revenue_scenario` (FK ke segmen)
   - Lalu: `ref_program_sadar` (no FK)
   - Lalu: `kb_reference_docs`, `kb_few_shot` (no FK, embedding NULL)

### Catatan Khusus untuk Studio UI

- **Boolean**: Studio kadang strict — kalau gagal, ubah `TRUE`/`FALSE` jadi `t`/`f`
- **Array fields** (`segmen_sasaran`, dll): Studio mungkin tidak handle Postgres array literal otomatis. Kalau gagal, gunakan Method 2 (psql COPY) untuk file yang ada array.
- **chunk_metadata** (JSONB): Studio biasanya OK menerima string JSON.

---

## Method 2: psql COPY (Direct via Connection)

Lebih reliable untuk multi-line text + array fields. Recommended untuk power users.

### Setup

```bash
# Set connection string (dari Supabase Dashboard → Settings → Database)
export SUPABASE_DB_URL="postgresql://postgres.xxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
```

### Run COPY commands

```bash
cd csv_for_supabase/

# 1. dim_kabupaten
psql "$SUPABASE_DB_URL" -c "\copy gold.dim_kabupaten FROM '01_dim_kabupaten.csv' WITH (FORMAT CSV, HEADER, QUOTE '\"');"

# 2. dim_upt
psql "$SUPABASE_DB_URL" -c "\copy gold.dim_upt FROM '02_dim_upt.csv' WITH (FORMAT CSV, HEADER, QUOTE '\"');"

# 3. dim_jenken
psql "$SUPABASE_DB_URL" -c "\copy gold.dim_jenken FROM '03_dim_jenken.csv' WITH (FORMAT CSV, HEADER, QUOTE '\"');"

# 4. dim_layanan
psql "$SUPABASE_DB_URL" -c "\copy gold.dim_layanan FROM '04_dim_layanan.csv' WITH (FORMAT CSV, HEADER, QUOTE '\"');"

# 5. ref.segmen
psql "$SUPABASE_DB_URL" -c "\copy ref.segmen FROM '05_ref_segmen.csv' WITH (FORMAT CSV, HEADER, QUOTE '\"');"

# 6. ref.treatment_lookup
psql "$SUPABASE_DB_URL" -c "\copy ref.treatment_lookup FROM '06_ref_treatment_lookup.csv' WITH (FORMAT CSV, HEADER, QUOTE '\"');"

# 7. ref.program_sadar (with array fields — Postgres handles {a,b,c} format)
psql "$SUPABASE_DB_URL" -c "\copy ref.program_sadar FROM '07_ref_program_sadar.csv' WITH (FORMAT CSV, HEADER, QUOTE '\"');"

# 8. ref.raci_matrix
psql "$SUPABASE_DB_URL" -c "\copy ref.raci_matrix FROM '08_ref_raci_matrix.csv' WITH (FORMAT CSV, HEADER, QUOTE '\"');"

# 9. ref.revenue_scenario
psql "$SUPABASE_DB_URL" -c "\copy ref.revenue_scenario FROM '09_ref_revenue_scenario.csv' WITH (FORMAT CSV, HEADER, QUOTE '\"');"

# 10. kb.reference_docs (NO embedding column — populated later by embed_kb.py)
psql "$SUPABASE_DB_URL" -c "\copy kb.reference_docs (source, category, chunk_text, chunk_metadata) FROM '10_kb_reference_docs.csv' WITH (FORMAT CSV, HEADER, QUOTE '\"');"

# 11. kb.few_shot (NO embedding column)
psql "$SUPABASE_DB_URL" -c "\copy kb.few_shot (category, question, reasoning, expected_answer, approved) FROM '11_kb_few_shot.csv' WITH (FORMAT CSV, HEADER, QUOTE '\"');"
```

### One-liner script

```bash
#!/bin/bash
# import_all.sh
set -e
cd csv_for_supabase/

for f in 01_dim_kabupaten.csv 02_dim_upt.csv 03_dim_jenken.csv 04_dim_layanan.csv \
         05_ref_segmen.csv 06_ref_treatment_lookup.csv 07_ref_program_sadar.csv \
         08_ref_raci_matrix.csv 09_ref_revenue_scenario.csv; do
    table=$(echo "$f" | sed -E 's/^[0-9]+_(.+)\.csv$/\1/')
    schema=$(echo "$table" | cut -d_ -f1)
    table_name=$(echo "$table" | cut -d_ -f2-)
    full_table="${schema}.${table_name}"
    echo "Loading $full_table from $f..."
    psql "$SUPABASE_DB_URL" -c "\copy $full_table FROM '$f' WITH (FORMAT CSV, HEADER, QUOTE '\"');"
done

# KB tables — explicit column list (no embedding)
psql "$SUPABASE_DB_URL" -c "\copy kb.reference_docs (source, category, chunk_text, chunk_metadata) FROM '10_kb_reference_docs.csv' WITH (FORMAT CSV, HEADER, QUOTE '\"');"
psql "$SUPABASE_DB_URL" -c "\copy kb.few_shot (category, question, reasoning, expected_answer, approved) FROM '11_kb_few_shot.csv' WITH (FORMAT CSV, HEADER, QUOTE '\"');"

echo "✓ All CSVs imported"
```

---

## Verification After Import

Run di Supabase SQL Editor:

```sql
-- Reference data
SELECT COUNT(*) AS segmen      FROM ref.segmen;            -- expect 7
SELECT COUNT(*) AS treatment   FROM ref.treatment_lookup;  -- expect 7
SELECT COUNT(*) AS programs    FROM ref.program_sadar;     -- expect 9
SELECT COUNT(*) AS raci        FROM ref.raci_matrix;       -- expect 47
SELECT COUNT(*) AS scenarios   FROM ref.revenue_scenario;  -- expect 15

-- Dimensions
SELECT COUNT(*) AS kabupaten   FROM gold.dim_kabupaten;    -- expect 14
SELECT COUNT(*) AS upt         FROM gold.dim_upt;          -- expect 2
SELECT COUNT(*) AS jenken      FROM gold.dim_jenken;       -- expect 8
SELECT COUNT(*) AS layanan     FROM gold.dim_layanan;      -- expect 23

-- KB (without embeddings yet)
SELECT COUNT(*) AS docs        FROM kb.reference_docs;     -- expect 48
SELECT COUNT(*) AS few_shot    FROM kb.few_shot;           -- expect 15
SELECT COUNT(*) AS docs_with_emb FROM kb.reference_docs WHERE embedding IS NOT NULL; -- expect 0 (akan populated by embed_kb.py)

-- Sanity check: tipologi distribution
SELECT tipologi_wilayah, COUNT(*) FROM gold.dim_kabupaten GROUP BY 1;
-- Pusat Urban: 4, Hub Industri: 2, Wilayah Hinterland: 8

-- Sanity check: segmen di treatment_lookup match dengan ref.segmen
SELECT s.kode, s.nama, t.kanal_utama
FROM ref.segmen s
LEFT JOIN ref.treatment_lookup t ON t.segmen_kode = s.kode
ORDER BY s.kode;
-- Expected: 7 rows, semua dengan kanal_utama populated
```

---

## After CSV Import: Run Embedding

KB CSVs (10 + 11) di-import tanpa embedding column. Run embedding step:

```bash
# Set env vars
export OPENAI_API_KEY=sk-...
export SUPABASE_DB_HOST=...
export SUPABASE_DB_USER=...
export SUPABASE_DB_PASSWORD=...

# Run embedding (will UPDATE existing rows dengan embedding)
cd ../  # back to pilot_starter_pack/
python embed_kb.py --reset  # --reset truncates existing rows + re-inserts dengan embedding

# OR alternatively, embed dengan UPDATE (kalau mau preserve existing rows):
# Edit embed_kb.py untuk pakai UPDATE WHERE id = ... pattern
```

**Expected cost**: ~$0.01 untuk full embedding (text-embedding-3-small).

---

## Regenerate CSVs

Kalau ada perubahan di reference data atau treatment text:

```bash
cd csv_for_supabase/
python _generate_csvs.py
# Regenerates all 11 CSVs from source data hardcoded di script
```

---

## Troubleshooting

### "violates foreign key constraint"
- Pastikan urutan import correct (lihat IMPORT ORDER di atas)
- Kalau pakai Studio UI, import file dengan FK target dulu (e.g., `ref.segmen` sebelum `ref.treatment_lookup`)

### "could not parse array element: ..."
- Studio UI mungkin tidak handle `{H1,K1,O1}` format. Pakai Method 2 (psql COPY) untuk file 07.
- Atau edit CSV manual: ubah array dari `{H1,K1,O1}` ke `["H1","K1","O1"]` (JSON format) — lalu di SQL UPDATE jadi array

### "value too long for type character varying"
- Tidak akan terjadi karena schema pakai TEXT. Kalau iya, check schema di Supabase.

### Multi-line text di treatment_lookup tidak ter-parse
- Quote dipakai sudah `QUOTE_ALL`, harus work
- Kalau gagal: pakai psql Method 2 yang lebih robust

### "duplicate key value violates unique constraint"
- Table sudah punya data — TRUNCATE dulu atau gunakan `ON CONFLICT` clause
- Untuk re-load clean: `TRUNCATE table_name CASCADE;` di SQL editor

---

## File Structure Summary

```
pilot_starter_pack/
├── supabase_setup_full.sql         # DDL + reference seed (alternative ke CSV)
├── kb_chunks_to_embed.jsonl        # Source untuk kb_reference_docs.csv
├── 04_galen_few_shot.jsonl         # Source untuk kb_few_shot.csv
├── embed_kb.py                     # Run AFTER CSV import untuk populate embedding
└── csv_for_supabase/               # ← THIS FOLDER
    ├── README.md                   # this file
    ├── _generate_csvs.py           # regenerator
    ├── 01_dim_kabupaten.csv
    ├── 02_dim_upt.csv
    ├── 03_dim_jenken.csv
    ├── 04_dim_layanan.csv
    ├── 05_ref_segmen.csv
    ├── 06_ref_treatment_lookup.csv
    ├── 07_ref_program_sadar.csv
    ├── 08_ref_raci_matrix.csv
    ├── 09_ref_revenue_scenario.csv
    ├── 10_kb_reference_docs.csv    # NO embedding column
    └── 11_kb_few_shot.csv          # NO embedding column
```

---

## Two-Approach Decision

You have TWO ways untuk supply data ke Supabase:

| Approach | Use Case |
|----------|----------|
| **A) Run `supabase_setup_full.sql`** | Single command, semua DDL + seed data sekaligus. **Recommended kalau project Anda baru.** |
| **B) Use these CSVs** | Kalau prefer Studio UI drag-and-drop, atau ingin inspect/edit data sebelum import. |

**Note**: KEDUANYA produce hasil yang sama. Pilih salah satu, jangan dua-duanya (akan duplicate data).

Untuk KB embedding: tetap pakai `embed_kb.py` setelah CSV import (atau setelah SQL run).

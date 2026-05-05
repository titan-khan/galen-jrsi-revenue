# JR Pilot Starter Pack
> Translation dari **PKB Micro Segmentation PalangkaRaya v1.4** menjadi runnable code/config untuk Supabase + Galen.
>
> **Ready untuk 2-week sprint pilot.**

---

## Apa Isi Starter Pack Ini?

11 file, dikelompokkan jadi 4 layer sesuai pilot architecture:

```
pilot_starter_pack/
│
├─ README.md                                   ← you are here
│
├─ Layer 1: Database (Supabase Postgres)
│  ├─ 01_schema.sql                            ← schemas, tables, views, functions, indexes
│  └─ 02_reference_data.sql                    ← seed data: 7 segmen, treatment, RACI, programs
│
├─ Layer 2: Galen Knowledge Base
│  ├─ 03_galen_system_prompt.md                ← compressed framework v1.4 → agent prompt
│  ├─ 04_galen_few_shot.jsonl                  ← 15 Q→reasoning→answer examples
│  ├─ 05_galen_treatment_lookup.json           ← 7 segmen × full treatment metadata
│  └─ 06_galen_decision_rules.yaml             ← classification, amnesty, channel rules + anti-patterns
│
├─ Layer 3: Edge Functions (Supabase Deno)
│  ├─ 07_edge_function_classify_segment.ts     ← input vehicle data → segmen kode
│  ├─ 08_edge_function_treatment_recommend.ts  ← input segmen → treatment + RACI + programs
│  ├─ 09_edge_function_segment_summary.ts      ← aggregate stats per segmen
│  └─ 10_edge_function_revenue_projection.ts   ← what-if simulator
│
└─ Layer 4: Loader (Local Python)
   └─ 11_load_pilot.py                         ← end-to-end CSV → Supabase Gold
```

---

## Arsitektur Recap

```
┌─────────────────────────┐    HANDOFF     ┌─────────────────────────────────┐
│  LOCAL (Python)         │   ─────────►    │  SUPABASE                       │
│                         │                 │                                 │
│  Stage 1-2:             │                 │  Stage 3-6:                     │
│  ① Read CSV             │                 │  ③ gold.registry_fact           │
│  ② Cleanse + classify   │                 │  ④ gold_plus.* (CRM, agg MVs)  │
│     dengan logic v1.4   │                 │  ⑤ Postgres views + Edge Func   │
│                         │                 │  ⑥ kb.* (pgvector + few_shot)   │
│  → 11_load_pilot.py     │                 │                                 │
└─────────────────────────┘                 └─────────────────────────────────┘
                                                        │
                                                        ▼
                                                 GALEN SPECIALIST
```

---

## Quick Start (2-week sprint)

### Prerequisites
- Supabase project (free tier OK untuk pilot)
- Python 3.10+ dengan `pip install pandas psycopg2-binary`
- Sample data: `Palangka_Raya.csv` + `Transaksi_2025.csv`
- (Optional) OpenAI API key untuk pgvector embedding

### Week 1: Data Foundation

**Day 1 — Setup Supabase**
```bash
# Buat project di https://supabase.com
# Catat: URL, Service Role Key, DB Password

# Set environment
export SUPABASE_DB_HOST="aws-0-ap-southeast-1.pooler.supabase.com"
export SUPABASE_DB_USER="postgres.your_project_ref"
export SUPABASE_DB_PASSWORD="..."
```

**Day 2 — Apply Schema**
```bash
# Di Supabase SQL Editor, run berurutan:
# 1. 01_schema.sql      (extensions, schemas, tables, views, functions)
# 2. 02_reference_data.sql  (seed treatment lookup, RACI, programs)
```

✅ **Checkpoint**: query `SELECT * FROM ref.segmen ORDER BY kode` → 7 baris.

**Day 3 — Load Data**
```bash
python 11_load_pilot.py \
  --registry /path/to/Palangka_Raya.csv \
  --source-period 2025-04
```

✅ **Checkpoint**: distribusi segmen match expected:
- H1: 107,967 ± 5%
- K1: 33,789 ± 5%
- O1: 32,916 ± 5%
- M1: 25,039 ± 5%
- M2: 140,966 ± 5%
- S1: 12,756 ± 5%
- S2: 74,544 ± 5%

(Loader akan print verifikasi otomatis di akhir.)

**Day 4 — CRM Scoring + Aggregates**
Sudah otomatis dari schema (view `registry_segmented` + materialized views). Tinggal verify:
```sql
SELECT segmen_kepatuhan, COUNT(*) FROM gold_plus.registry_segmented GROUP BY 1;
SELECT * FROM gold_plus.agg_segmen_kabupaten ORDER BY segmen_kepatuhan;
```

**Day 5 — Galen Knowledge Base**
- Embed `03_galen_system_prompt.md` → `kb.reference_docs` via pgvector
- Insert `04_galen_few_shot.jsonl` rows → `kb.few_shot`
- (Optional) Embed paper Saptono & Khozen + framework v1.4 sebagai reference docs

### Week 2: Galen + Demo

**Day 6-7 — Deploy Edge Functions**
```bash
# Per file:
supabase functions deploy classify_segment
supabase functions deploy treatment_recommend
supabase functions deploy segment_summary
supabase functions deploy revenue_projection
```

✅ **Checkpoint**: test call → semua return valid JSON.

**Day 8 — Configure Galen**
- Paste `03_galen_system_prompt.md` sebagai system prompt
- Embed 5-7 best few-shot dari `04_galen_few_shot.jsonl` inline
- Wire 4 Edge Function tools

**Day 9 — Test 10-15 Queries**
Pakai pertanyaan dari `04_galen_few_shot.jsonl` sebagai test set.

✅ **Checkpoint**: 80%+ jawaban benar dengan segmen context, anti-pattern terhindar.

**Day 10 — Demo**
- 5 demo questions yang showcase value
- Stakeholder presentation
- Decision: green-light production phase (8-10 weeks) atau iterate pilot

---

## Critical Design Decisions

### 1. Reference Date: 2025-05-01
Hardcoded di SQL function + Python loader + framework. Untuk update reference date di production, perlu refactor jadi parameter (bukan magic constant).

### 2. Skip Bronze + Silver layers
Sample data sudah tahu structure-nya dari EDA. Cleansing logic inline di `11_load_pilot.py`. Production phase nanti baru pisahkan jadi proper Bronze/Silver dengan dbt.

### 3. Filter SAMSAT PALANGKARAYA only
`Palangka_Raya.csv` sebenarnya gabungan dua source (per Data Assessment Report kemarin). Loader filter ke yang `nama_upt = 'SAMSAT PALANGKARAYA'` saja untuk konsistensi schema.

### 4. Data masih PR scope only
Hub Industri + Hinterland: framework strategy ada di reference data, tapi belum ada angka kuantitatif. Setiap response Galen yang diluar PR akan disclose limitation ini otomatis (lihat `caveats` di Edge Functions).

### 5. RLS off untuk pilot
Service role untuk semua. Pilot scope = internal demo. Production phase wajib aktifkan RLS untuk PII protection.

### 6. No backup/DR
Pilot data bisa re-load dari CSV original. Production wajib backup strategy.

---

## Verification Commands

Setelah load:
```sql
-- 1. Total registry rows
SELECT COUNT(*) FROM gold.registry_fact;
-- Expected: ~427,977 (after SAMSAT PALANGKARAYA filter)

-- 2. Segment distribution match Sheet 2
SELECT segmen_kepatuhan, COUNT(*) AS n,
       ROUND(COUNT(*)::NUMERIC * 100 / SUM(COUNT(*)) OVER (), 2) AS pct
FROM gold_plus.registry_segmented
GROUP BY segmen_kepatuhan
ORDER BY segmen_kepatuhan;

-- 3. Phone availability per segmen (Sheet 2 verify)
SELECT segmen_kepatuhan, ROUND(AVG(CASE WHEN has_phone THEN 1 ELSE 0 END)::NUMERIC, 4) AS pct_punya_hp
FROM gold_plus.registry_segmented
GROUP BY segmen_kepatuhan
ORDER BY segmen_kepatuhan;
-- Expected per Sheet 2:
--   H1: 0.9999, K1: 0.9999, O1: 0.9998, M1: 0.9991,
--   M2: 0.7108, S1: 0.0159, S2: 0.1924

-- 4. Treatment lookup
SELECT segmen_kode, kanal_utama, perkiraan_konversi
FROM ref.treatment_lookup ORDER BY segmen_kode;

-- 5. Test classification function
SELECT public.classify_vehicle_segment(
  '2024-01-15'::DATE,  -- sd_notice
  '2023-01-10'::DATE,  -- tanggal_transaksi
  2018                  -- thn_buat
);
-- Expected: 'M1'
```

Test Edge Functions:
```bash
# Replace with your actual project URL + anon key
SUPABASE_URL="https://xxx.supabase.co"
ANON_KEY="..."

# 1. classify_segment
curl -X POST "$SUPABASE_URL/functions/v1/classify_segment" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sd_notice": "2024-01-15", "tanggal_transaksi": "2023-01-10", "thn_buat": 2018}'
# Expected: {"segmen_kode": "M1", ...}

# 2. treatment_recommend
curl -X POST "$SUPABASE_URL/functions/v1/treatment_recommend" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"segmen_kode": "M2", "kabupaten": "PALANGKA RAYA"}'

# 3. segment_summary
curl -X POST "$SUPABASE_URL/functions/v1/segment_summary" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# 4. revenue_projection
curl -X POST "$SUPABASE_URL/functions/v1/revenue_projection" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scenario": "Konservatif"}'
# Expected: total ~Rp 23.5 M, 60K kendaraan terkonversi
```

---

## Pilot Success Criteria

✅ **Pass**:
- All 4 Edge Functions return valid JSON
- Segment distribution match Sheet 2 expected (±5%)
- Galen specialist correctly answer ≥80% dari 15 test queries
- Stakeholder demo dapat dilakukan live
- Decision green-light untuk production phase

❌ **Fail signals**:
- Segment counts off >10% from expected → ada bug klasifikasi
- Galen hallucinate atau anti-pattern (kirim kampanye ke S2, dll) → KB tidak cukup constrain
- Latency > 10s untuk standard query → Edge Functions perlu optimization

---

## Promotion Path → Production

Setelah pilot lulus, yang langsung di-promote:
- ✅ `01_schema.sql` (jadi production schema dengan addition: SCD type 2, RLS)
- ✅ `02_reference_data.sql` (treatment lookup, RACI, programs)
- ✅ `03_galen_system_prompt.md` → expand untuk lebih banyak query patterns
- ✅ `04_galen_few_shot.jsonl` → expand dari 15 ke 100+
- ✅ Edge Functions logic (08, 09, 10) → tambah caching + RLS
- ✅ `05_galen_treatment_lookup.json` (jadi seed reference table)

Yang harus di-buildback untuk production:
- ⚠️ Bronze + Silver layer dengan dbt (dari `11_load_pilot.py` saat ini)
- ⚠️ RLS policies untuk PII protection (service role → role-based)
- ⚠️ batch_manifest schema lengkap dengan `git_commit`, `processed_by`, `failed_tests`
- ⚠️ Eval harness automation (CI/CD)
- ⚠️ Monitoring dashboards
- ⚠️ Backup + DR strategy
- ⚠️ Data untuk Hub Industri + Hinterland (extend pipeline)

---

## File Reference Quick Index

| File | Purpose | Run Where |
|------|---------|-----------|
| `01_schema.sql` | Database structure | Supabase SQL Editor (one-time) |
| `02_reference_data.sql` | Seed lookups | Supabase SQL Editor (one-time) |
| `03_galen_system_prompt.md` | Galen agent prompt | Galen platform config |
| `04_galen_few_shot.jsonl` | Training examples | Insert ke `kb.few_shot` table |
| `05_galen_treatment_lookup.json` | Treatment metadata | Reference / can also seed `ref.treatment_lookup` |
| `06_galen_decision_rules.yaml` | Decision logic | Galen platform config / KB |
| `07-10_edge_function_*.ts` | Backend services | `supabase functions deploy` |
| `11_load_pilot.py` | Data loader | Local laptop / CI |

---

## References

- **Source framework**: PKB Micro Segmentation PalangkaRaya v1.4
- **Theoretical basis**: Saptono & Khozen (2021) — Compliance Risk Management
- **OECD CRM Guide** (2004)
- **DJP SE-24/PJ/2019** — pyramid kepatuhan implementation
- **Reference date**: 2025-05-01

---

*Pilot starter pack v1.0 · 30 April 2026 · siap untuk 2-week sprint.*

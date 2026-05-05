# PRD — JR Pilot Data Pipeline Web Tool (`jr-pilot`)

| Field | Value |
|-------|-------|
| **Document version** | 2.0 |
| **Status** | Ready for implementation |
| **Author** | Senior Solution Architect |
| **Last updated** | 2026-05-04 |
| **Target executor** | Claude Code (AI coding agent) |
| **Interface** | Streamlit web app (browser-based, runs locally) |
| **Estimated build time** | 2-3 days (1 day extra untuk UI vs CLI baseline) |

---

## 1. TL;DR

Build a **Streamlit web app** `jr-pilot` yang otomatisasi seluruh data pipeline pilot Jasa Raharja — dari upload 3 input files (Data Dictionary, Palangka_Raya registry, Transaksi 2025) sampai data siap-konsumsi oleh Galen specialist di Supabase, dengan **simple browser UI**.

**User experience**:
1. Buka browser → `http://localhost:8501` (Streamlit local)
2. Upload 3 file (drag-and-drop atau file picker)
3. Set reference date + skip flags (optional)
4. Klik "Run Pipeline"
5. Lihat progress real-time per phase
6. Lihat hasil: verification report, segment distribution chart, sample data preview
7. Download output (parquet, verification report) dari UI

**Yang harus tool ini lakukan**:
1. Web UI untuk upload 3 file (multi-format: xlsx + csv)
2. Read & validate uploaded files
3. Cleanse + segment 7 kategori per framework v1.4 (rule-based, classify di Python)
4. Recommend treatment per segmen (lookup dari YAML config)
5. Embed reference docs ke pgvector (knowledge base)
6. Upload semua ke Supabase (gold + ref + kb schemas)
7. Verify match expected distribution
8. Display output di UI (charts, tables, downloadable artifacts)

**Yang tool ini BUKAN**:
- Production-grade pipeline (no incremental, no SCD, no dbt)
- Real-time processing (one-shot batch)
- Multi-environment (single Supabase project)
- Backup/DR (pilot data dapat re-load dari CSV)
- Multi-tenant web app (single user / pilot demo)
- Authentication / RBAC (lokal-only, internal use)

---

## 2. Problem Statement

**Current state**: Data Jasa Raharja Kalteng 2025 ada dalam bentuk 3 file mentah (xlsx + 2 csv) yang belum di-segment, belum di-treat, dan belum bisa di-konsumsi oleh AI agent (Galen specialist).

**Pain points**:
- Manual analysis lambat (sample analysis EDA + segmentation framework butuh ~2 minggu)
- Hasil analysis tidak reproducible (notebooks ad-hoc)
- Galen specialist tidak punya data structured untuk reasoning
- Tidak ada single source of truth untuk treatment recommendation
- Tidak ada lineage untuk debug "data X dari mana"

**Solution**: CLI tool yang menjalankan full pipeline dalam satu command, dengan output:
- Cleaned + segmented data di Supabase
- Treatment recommendations denormalized per row
- Knowledge base embedded (pgvector)
- Audit artifacts untuk verification
- Lineage tracking minimal (batch_manifest)

**Target outcome**: Pilot 2-week sprint dapat di-execute dengan reliability tinggi. New data engineer onboarding mudah ("baca PRD ini, run command, done").

---

## 3. Background & Context

### 3.1 Framework Reference

Tool implements **PKB Micro Segmentation Palangka Raya v1.4** framework:
- **Sumbu kepatuhan**: 7 segmen (H1, K1, O1, M1, M2, S1, S2)
- **Sumbu wilayah**: 3 tipologi (Pusat Urban, Hub Industri, Wilayah Hinterland)
- **Reference date**: 2025-05-01 (untuk perhitungan durasi tunggakan)
- **Scope pilot**: Pusat Urban — Palangka Raya saja (data tersedia)

Existing reference files (already in workspace `/pilot_starter_pack/`):
- `treatment_v1.4.yaml` — single source of truth untuk treatment per segmen
- `01_schema.sql` — Supabase DDL (existing, mungkin perlu update)
- `02_reference_data.sql` — seed reference tables
- `03_galen_system_prompt.md` — Galen agent prompt
- `04_galen_few_shot.jsonl` — 15 Q→reasoning→answer examples

### 3.2 Architectural Decisions (locked)

| Decision | Rationale |
|----------|-----------|
| Compute (classify + recommend) di Python local | Iterabilitas tinggi, output verifiable, no SQL deploy cycle |
| Supabase = serving layer only | AI tinggal SELECT, no logic embedded di SQL |
| Hybrid storage | Segmen sebagai stored column + treatment text denormalized → AI query 1 tabel, no JOIN |
| One-shot semantics | No incremental refresh, full reload acceptable |
| Service role untuk pilot | RLS deferred ke production phase |
| pgvector built-in Supabase | No separate Pinecone, lower complexity |

### 3.3 Data Volumes

| Source | Rows | Size |
|--------|------|------|
| JR_Data_Dictionary.xlsx | ~70 fields × 2 sheets | 13 KB |
| Palangka_Raya.csv (after filter SAMSAT PALANGKARAYA) | ~409,690 rows | 165 MB |
| Transaksi_2025.csv | 685,751 rows | 271 MB |

---

## 4. Goals & Non-Goals

### 4.1 Goals

| ID | Goal | Measurement |
|----|------|-------------|
| G1 | End-to-end automation | Single command (`jr-pilot load`) selesai dalam <10 menit |
| G2 | Reproducibility | Re-run dengan input sama → output identik (idempotent) |
| G3 | Verification built-in | Distribution actual match Sheet 2 ±5% (auto-checked) |
| G4 | Audit artifacts | Local parquet + JSON report saved untuk inspection |
| G5 | Lineage tracking | Setiap row di Supabase punya `batch_id` FK ke manifest |
| G6 | Galen-ready output | Data + KB ter-load lengkap, Edge Functions dapat consume |
| G7 | Iteration-friendly | Update treatment YAML → re-run → propagate ke Supabase |
| G8 | Self-documenting | `jr-pilot --help` lengkap, error messages descriptive |

### 4.2 Non-Goals

- ❌ Production-grade pipeline (no Bronze/Silver layer, no dbt, no SCD)
- ❌ Multi-environment (dev/staging/prod) — single Supabase project
- ❌ Real-time processing — pure batch one-shot
- ❌ Multi-region data — only Palangka Raya
- ❌ Hub Industri / Hinterland data extension — kerangka saja
- ❌ Authorization beyond service role — RLS deferred
- ❌ UI dashboard — CLI only
- ❌ Automatic retry on Supabase outage — manual retry acceptable
- ❌ Data masking/anonymization — sudah di-mask di source

---

## 5. Users & Personas

### 5.1 Primary: Data Engineer

- **Goal**: Run pipeline reliably untuk pilot demo Day 3, troubleshoot kalau gagal
- **Skill level**: Intermediate Python + SQL, familiar dengan dataframe operations
- **Pain point sekarang**: Notebooks ad-hoc, manual debug, no verification automation
- **Dengan tool ini**: One command, automatic verification, clear error messages

### 5.2 Secondary: Galen Specialist (downstream)

- **Goal**: Query segmen + treatment data untuk answer stakeholder questions
- **Interaction**: Tidak langsung pakai tool, tapi consume hasilnya via Edge Functions
- **Requirement dari tool**: Data lengkap, ter-segment, treatment denormalized, KB embedded

### 5.3 Tertiary: Stakeholder (audit)

- **Goal**: Verify "data April 2026 itu darimana, kapan masuk"
- **Interaction**: Query `public.batch_manifest` di Supabase
- **Requirement dari tool**: Manifest entry per batch dengan checksum + row count

---

## 6. User Stories

```
US-1 (DE):
  Sebagai data engineer
  Saya ingin menjalankan pipeline dengan satu command
  Sehingga pilot demo siap dalam <10 menit setelah file masuk

US-2 (DE):
  Sebagai data engineer
  Saya ingin tool ini fail fast dengan error message yang jelas
  Sehingga saya tahu PERSIS apa yang harus di-fix

US-3 (DE):
  Sebagai data engineer
  Saya ingin output parquet yang bisa di-inspect SEBELUM upload
  Sehingga saya bisa catch bug klasifikasi sebelum data masuk Supabase

US-4 (DE):
  Sebagai data engineer
  Saya ingin re-run aman (idempotent)
  Sehingga kalau gagal di tengah, tinggal re-run tanpa duplicate data

US-5 (Galen via DE):
  Sebagai consumer (Galen specialist)
  Saya ingin data di registry_enriched lengkap dengan segmen + treatment
  Sehingga saya bisa answer dengan 1 SELECT query, no JOIN

US-6 (DE):
  Sebagai data engineer
  Saya ingin update treatment text via edit YAML + re-run
  Sehingga iterate cepat tanpa SQL migration

US-7 (Stakeholder):
  Sebagai stakeholder/auditor
  Saya ingin tahu setiap batch yang masuk: kapan, dari file mana, checksum
  Sehingga saya bisa trace lineage data tertentu

US-8 (DE):
  Sebagai data engineer
  Saya ingin tool memberikan verification report
  Sehingga saya tahu pasti distribusi match Sheet 2 atau ada anomaly
```

---

## 7. Functional Requirements

### 7.1 Core Pipeline

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F1 | Read & validate 3 input files | Reject kalau file missing kolom expected; print row counts |
| F2 | Cleanse Palangka_Raya.csv | Trim whitespace, parse YYYY-MM-DD dates, filter SAMSAT PALANGKARAYA |
| F3 | Cleanse Transaksi_2025.csv | Parse DD/MM/YYYY HH:MM dates, types coerced |
| F4 | Compute derived columns | `durasi_tunggakan_days`, `has_payment_history`, `usia_kendaraan`, `has_phone` |
| F5 | Classify 7 segmen (rule-based) | Distribution match Sheet 2 ±5% per segmen |
| F6 | Lookup treatment dari YAML | 4 kolom treatment denormalized per row, 1 unique value per segmen |
| F7 | Aggregate Transaksi → avg PKB | Per `kode_jenken`, populate `dim_jenken.est_pkb_per_kendaraan` |
| F8 | Embed Data Dictionary ke pgvector | Setiap row dictionary jadi separate chunk dengan OpenAI embedding |
| F9 | Bulk upload ke Supabase (transactional) | All-or-nothing per phase; on conflict update |
| F10 | Refresh materialized views | `agg_segmen_kabupaten`, `agg_segmen_jenken` |

### 7.2 Verification & Reporting

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F11 | Save audit parquet pre-upload | `outputs/enriched_registry.parquet` + `outputs/transaksi_aggregated.parquet` |
| F12 | Generate verification report | `outputs/verification_report.txt` dengan side-by-side actual vs expected |
| F13 | Insert batch_manifest entries | Per phase upload, dengan status `uploading` → `loaded`/`failed` |
| F14 | Print progress log | Phase-level + step-level messages dengan ✓/⚠/✗ markers |
| F15 | Exit code | 0 = success, 1 = input error, 2 = verification fail, 3 = upload fail |

### 7.3 UI & UX

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F16 | Streamlit app launches via single command | `streamlit run app.py` → opens browser tab |
| F17 | Multi-file upload widget | Drag-and-drop atau picker untuk 3 files (xlsx + csv) |
| F18 | File validation di UI | Reject upload kalau wrong format / kolom missing dengan inline error |
| F19 | Configuration panel | Reference date picker, skip flags toggles, .env status indicator |
| F20 | Run button + live progress | Button disabled saat running, progress bar + status messages per phase |
| F21 | Output display | Verification table, segment distribution chart, sample preview, download buttons |
| F22 | Status sidebar | Show recent batch_manifest entries + Supabase connection status |
| F23 | Reset / clear button | Clear uploaded files + outputs untuk fresh run |

### 7.4 Knowledge Base

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F21 | Embed framework v1.4 docs | Markdown files dari Sheet 1, 3, 4 → kb.reference_docs |
| F22 | Embed paper Saptono & Khozen | PDF text extracted → chunked → embedded |
| F23 | Load few_shot examples | JSONL → kb.few_shot dengan question embedding |
| F24 | RAG search smoke test | Query "amnesti efektif" → return ≥3 relevant chunks |

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Full pipeline runtime | <10 menit | end-to-end pada laptop modern (M1+, 16GB RAM) |
| Phase 1 (KB embedding) | <5 menit | ~70 chunks × OpenAI rate limit |
| Phase 2 (Transaksi aggregate) | <2 menit | 685K rows aggregate |
| Phase 3 (Registry process + upload) | <5 menit | 410K rows classify + bulk upload |
| Phase 4 (Optional raw transaksi) | <5 menit | 685K rows bulk insert |
| Phase 5 (Verify + MV refresh) | <30 detik | aggregates ringan |

### 8.2 Reliability

- Idempotent: re-run dengan input sama produces same final state (no duplicates)
- Transactional: kalau Phase 3 gagal di tengah upload, NO partial state di registry_enriched
- Recoverable: kalau OpenAI rate limit, exponential backoff (max 5 retry)
- Observable: progress log per step, error stack trace pada failure

### 8.3 Compatibility

- Python 3.10+
- macOS / Linux (tidak perlu Windows)
- Supabase pooler port 6543 (free tier compatible)

### 8.4 Security

- Credentials only via .env file (never hardcoded)
- .env in .gitignore
- No PII printed di log (sudah di-mask di source)
- Service role key sebagai SUPABASE_SERVICE_ROLE_KEY (treat as secret)

---

## 9. Technical Architecture

### 9.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INPUT (local files)                         │
│                                                                     │
│   inputs/JR_Data_Dictionary.xlsx                                    │
│   inputs/Palangka_Raya.csv                                          │
│   inputs/Transaksi_2025.csv                                         │
│   pilot_starter_pack/treatment_v1.4.yaml                            │
│   .env (Supabase + OpenAI credentials)                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      jr-pilot CLI tool                              │
│                                                                     │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌──────┐  │
│   │ Phase 1 │──▶│ Phase 2 │──▶│ Phase 3 │──▶│ Phase 4 │──▶│ P 5  │  │
│   │         │   │         │   │         │   │         │   │      │  │
│   │ KB      │   │ Transx  │   │ Registry│   │ Raw trx │   │ Verif│  │
│   │ embed   │   │ aggreg. │   │ process │   │(opt.)   │   │      │  │
│   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └──────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          OUTPUT (2 sides)                           │
│                                                                     │
│   LOCAL (audit):                    SUPABASE (serving):             │
│   ─ outputs/                        ─ gold.dim_jenken               │
│     ├── enriched_registry.parquet   ─ gold.registry_enriched        │
│     ├── transaksi_aggregated.parq   ─ gold.transaksi_fact (opt)     │
│     ├── verification_report.txt     ─ gold_plus.agg_* (refreshed)   │
│     └── run_log.json                ─ ref.* (already seeded)        │
│                                     ─ kb.reference_docs (embedded)  │
│                                     ─ kb.few_shot (loaded)          │
│                                     ─ public.batch_manifest         │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Tech Stack

| Layer | Choice | Reasoning |
|-------|--------|-----------|
| Language | Python 3.10+ | Standard for data processing, ecosystem mature |
| **Web UI framework** | **Streamlit** | Pure Python, file uploader native, charts built-in, single-file app, perfect untuk pilot/demo. Alternatif Gradio juga OK. |
| DataFrame | `pandas` | De facto standard |
| Database driver | `psycopg2-binary` | Standard for Postgres |
| Excel reader | `openpyxl` | Native Python, no Java dep |
| Config | `PyYAML` | Standard |
| Embeddings | `openai==1.*` | Direct API, no abstraction layer |
| Env loading | `python-dotenv` | Standard |
| Output format | `pyarrow` (parquet) | Fast read/write, column-store |
| Charts | `plotly` (optional) atau Streamlit native `st.bar_chart` | Plotly untuk interactive segment distribution; native sufficient untuk pilot |
| Testing | `pytest` | Standard |

```bash
# Pinned dependencies
streamlit==1.36.*           # UI framework
pandas==2.2.*
psycopg2-binary==2.9.*
openpyxl==3.1.*
PyYAML==6.0.*
openai==1.*
python-dotenv==1.*
pyarrow==15.*
plotly==5.*                 # optional, untuk charts
pytest==8.*
```

**Why Streamlit (vs alternatives)**:
- ✅ Pure Python — no JS/HTML/CSS to write
- ✅ File upload widget built-in (`st.file_uploader`)
- ✅ Progress bar built-in (`st.progress`, `st.status`)
- ✅ DataFrame display built-in (`st.dataframe`)
- ✅ Charts built-in (`st.bar_chart`, plus plotly support)
- ✅ Download button built-in (`st.download_button`)
- ✅ Single command launch (`streamlit run app.py`)
- ✅ Auto-reload on code change (dev experience)
- ✅ Can deploy ke Streamlit Cloud (free tier) kalau perlu remote demo

---

## 10. UI Specification (Streamlit Web App)

### 10.1 Launch

```bash
# Single command starts local web server + opens browser
streamlit run app.py

# Output:
#   You can now view your Streamlit app in your browser.
#   Local URL: http://localhost:8501
#   Network URL: http://192.168.x.x:8501
```

### 10.2 Page Layout (Wireframe ASCII)

```
┌────────────────────────────────────────────────────────────────────────┐
│  🛡 JR Pilot — Data Pipeline                          [Sidebar toggle] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌── ① UPLOAD INPUT FILES ───────────────────────────────────────┐    │
│  │                                                                │    │
│  │  📂 Data Dictionary (.xlsx)                                    │    │
│  │  ┌─────────────────────────────────────────────────────┐       │    │
│  │  │  Drag & drop file here, or click to browse          │       │    │
│  │  │                                                     │       │    │
│  │  │  ✓ JR_Data_Dictionary.xlsx (13 KB)                  │       │    │
│  │  └─────────────────────────────────────────────────────┘       │    │
│  │                                                                │    │
│  │  📂 Registry Palangka Raya (.csv)                              │    │
│  │  ┌─────────────────────────────────────────────────────┐       │    │
│  │  │  ✓ Palangka_Raya.csv (165 MB)                       │       │    │
│  │  └─────────────────────────────────────────────────────┘       │    │
│  │                                                                │    │
│  │  📂 Transaksi 2025 (.csv)                                      │    │
│  │  ┌─────────────────────────────────────────────────────┐       │    │
│  │  │  ✓ Transaksi_2025.csv (271 MB)                      │       │    │
│  │  └─────────────────────────────────────────────────────┘       │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  ┌── ② CONFIGURATION ───────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  Reference date:  [2025-05-01 📅]                                │  │
│  │                                                                  │  │
│  │  Skip phases:                                                    │  │
│  │   ☐ Skip dictionary embedding                                    │  │
│  │   ☐ Skip raw transaksi upload                                    │  │
│  │   ☐ Skip MV refresh                                              │  │
│  │                                                                  │  │
│  │  Treatment config: pilot_starter_pack/treatment_v1.4.yaml ✓      │  │
│  │  Supabase status:  ✅ Connected (us-southeast-1)                 │  │
│  │  OpenAI API:       ✅ Key valid                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  [▶ Run Pipeline]   (disabled until 3 files uploaded)          │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  ┌── ③ PROGRESS (visible during run) ──────────────────────────────┐   │
│  │                                                                 │   │
│  │  [████████████░░░░░░░░] 60% — Phase 3/5: Classifying segments  │   │
│  │                                                                 │   │
│  │  ✓ Phase 1/5: Dictionary embedded (70 chunks, 18s)              │   │
│  │  ✓ Phase 2/5: Transaksi aggregated (685K rows, 45s)             │   │
│  │  ⏳ Phase 3/5: Registry processing... (currently classifying)   │   │
│  │  ⏸ Phase 4/5: Raw transaksi upload (queued)                     │   │
│  │  ⏸ Phase 5/5: Verification (queued)                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌── ④ RESULTS (visible after success) ────────────────────────────┐   │
│  │                                                                 │   │
│  │  ✅ Pipeline complete in 6m 23s                                 │   │
│  │                                                                 │   │
│  │  📊 Segment Distribution                                        │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │   M2 ████████████████████████████████ 140,966 (33%)      │   │   │
│  │  │   H1 ████████████████████████ 107,967 (25%)              │   │   │
│  │  │   S2 █████████████████ 74,544 (17%)                      │   │   │
│  │  │   K1 ████████ 33,789 (8%)                                │   │   │
│  │  │   O1 ████████ 32,916 (8%)                                │   │   │
│  │  │   M1 █████ 25,039 (6%)                                   │   │   │
│  │  │   S1 ███ 12,756 (3%)                                     │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  📋 Verification Report (vs framework v1.4 Sheet 2)             │   │
│  │  ┌──────┬──────────┬──────────┬────────┬─────────┐             │   │
│  │  │ Seg  │ Actual   │ Expected │ Diff%  │ Status  │             │   │
│  │  ├──────┼──────────┼──────────┼────────┼─────────┤             │   │
│  │  │ H1   │ 103,234  │ 107,967  │ -4.38% │ ✓ PASS  │             │   │
│  │  │ K1   │  32,567  │  33,789  │ -3.62% │ ✓ PASS  │             │   │
│  │  │ ...  │   ...    │   ...    │  ...   │   ...   │             │   │
│  │  └──────┴──────────┴──────────┴────────┴─────────┘             │   │
│  │                                                                 │   │
│  │  🔍 Sample Enriched Data (first 10 rows)                        │   │
│  │  ┌─────┬──────────┬─────────┬─────────────────────────────┐     │   │
│  │  │ id  │ segmen   │ has_phn │ treatment_kanal_utama       │     │   │
│  │  ├─────┼──────────┼─────────┼─────────────────────────────┤     │   │
│  │  │ 1   │ M1       │ ✓       │ WhatsApp + surat fisik...   │     │   │
│  │  │ 2   │ K1       │ ✓       │ WhatsApp + SMS cadangan     │     │   │
│  │  │ ... │   ...    │   ...   │           ...               │     │   │
│  │  └─────┴──────────┴─────────┴─────────────────────────────┘     │   │
│  │                                                                 │   │
│  │  📥 Downloads                                                   │   │
│  │  [⬇ enriched_registry.parquet]  [⬇ verification_report.txt]    │   │
│  │  [⬇ transaksi_aggregated.parquet]  [⬇ run_log.json]            │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│ ┌─ SIDEBAR ──────────────────────┐                                     │
│ │  📊 Recent Batches             │                                     │
│ │                                │                                     │
│ │  🟢 Reg #abc-123  2m ago       │                                     │
│ │     409,690 rows · loaded      │                                     │
│ │                                │                                     │
│ │  🟢 Trx #def-456  3m ago       │                                     │
│ │     685,751 rows · loaded      │                                     │
│ │                                │                                     │
│ │  🟢 KB  #ghi-789  4m ago       │                                     │
│ │     270 chunks · loaded        │                                     │
│ │                                │                                     │
│ │  ─────────────────────         │                                     │
│ │                                │                                     │
│ │  ⚙️ Settings                    │                                     │
│ │  [🔄 Reset all]                 │                                     │
│ │  [📋 View logs]                 │                                     │
│ │  [🧪 Run smoke test]            │                                     │
│ └────────────────────────────────┘                                     │
└────────────────────────────────────────────────────────────────────────┘
```

### 10.3 UI Components Detailed

#### 10.3.1 Upload Section
- Three `st.file_uploader` widgets (Dictionary xlsx, Registry csv, Transaksi csv)
- Show ✓ filename + size after upload
- Show ❌ inline error kalau format wrong atau kolom missing
- Files stored in Streamlit session state (NO disk write — process from memory)

#### 10.3.2 Configuration Section
- `st.date_input("Reference date", value=date(2025, 5, 1))`
- `st.checkbox` × 3 untuk skip phases
- `st.expander` untuk advanced options (batch size, retry count)
- Connection status indicators (✅ Supabase, ✅ OpenAI) — auto-tested on page load

#### 10.3.3 Run + Progress Section
- `st.button("▶ Run Pipeline", type="primary", disabled=not_all_uploaded)`
- Saat clicked: switch ke `st.status("Running...", expanded=True)` container
- Progress bar overall + per-phase status messages
- Real-time log streaming via `st.empty()` placeholder yang di-update
- Cancel button (gracefully terminate, mark batch_manifest as 'cancelled')

#### 10.3.4 Results Section
- `st.success` banner dengan total runtime
- `st.bar_chart(distribution)` untuk segment distribution
- `st.dataframe(verification_df)` untuk verification table dengan styling (✓/✗ icons)
- `st.dataframe(sample_enriched.head(10))` untuk sample preview
- `st.download_button` × 4 untuk download outputs (parquet + txt + json)
- `st.expander("Show full log")` untuk debug trace kalau perlu

#### 10.3.5 Sidebar
- Recent batch_manifest entries (auto-fetch dari Supabase, refresh per 30s)
- Connection health indicators
- Settings: Reset state, View logs, Run smoke test
- Link ke Supabase Studio + framework v1.4 doc

### 10.4 State Management

Streamlit app must handle:
- Files uploaded → store di `st.session_state.uploaded_files`
- Run in progress → block re-run via `st.session_state.is_running`
- Run complete → display results, persist sampai user click "Reset"
- Connection failure → show error banner, disable run button
- Page refresh → preserve uploaded files (Streamlit session state default)

### 10.5 Error Handling di UI

| Error Type | UI Behavior |
|------------|-------------|
| Wrong file format | Inline `st.error` di file uploader, file rejected |
| Missing required column | `st.error` modal dengan list of missing columns |
| Supabase connection fail | Banner top of page, run button disabled |
| OpenAI rate limit | Toast notification, auto-retry 3x dengan progress |
| Distribution mismatch >5% | `st.warning` dengan link to inspect parquet, prompt continue/abort |
| Mid-pipeline crash | `st.error` dengan stack trace expander + recovery hint |

### 10.6 Sample User Flow

```
1. Engineer launches: streamlit run app.py
   → Browser opens http://localhost:8501

2. Page loads:
   - Connection check: ✅ Supabase, ✅ OpenAI (auto-test on load)
   - Sidebar shows last 3 batch_manifest entries
   - Run button DISABLED (no files yet)

3. Engineer drags JR_Data_Dictionary.xlsx → upload area
   - Validation: ✓ xlsx format, has 2 sheets
   - Display: "✓ JR_Data_Dictionary.xlsx (13 KB)"

4. Engineer drags Palangka_Raya.csv → upload area
   - Validation: ✓ has all required columns
   - Display: "✓ Palangka_Raya.csv (165 MB)"

5. Engineer drags Transaksi_2025.csv → upload area
   - Validation: ✓ has all required columns
   - Display: "✓ Transaksi_2025.csv (271 MB)"
   - Run button now ENABLED

6. Engineer leaves config defaults (ref date 2025-05-01, no skip)

7. Engineer clicks "▶ Run Pipeline"
   - Button greyed out, label changes to "Running..."
   - Status panel appears, expanded by default
   - Live progress streams:
     [10%] Phase 1: Embedding dictionary... (chunk 23/70)
     [25%] Phase 2: Aggregating transaksi...
     [55%] Phase 3: Classifying registry... (390K rows processed)
     [85%] Phase 4: Loading raw transaksi...
     [95%] Phase 5: Verifying...
     [100%] ✅ Complete

8. Results panel renders:
   - Banner: "✅ Pipeline complete in 6m 23s"
   - Bar chart: segment distribution
   - Verification table: 7/7 PASS
   - Sample data preview
   - 4 download buttons

9. Engineer clicks "⬇ enriched_registry.parquet"
   - Browser saves file untuk inspection / sharing

10. Engineer can re-run dengan settings berbeda atau reset
```

---

## 11. Input Specifications

### 11.1 `JR_Data_Dictionary.xlsx`

- 2 sheets: "Data Transaksi Kendaraan 2025" + "Data Kendaraan"
- Each sheet: header row dengan kolom `Nama Field`, `Tipe Data`, `Panjang Data`, `Keterangan`
- Used for: Galen KB context (column meanings, allowed values)

**Tool behavior**: parse both sheets, generate one chunk per field row, embed via OpenAI.

### 11.2 `Palangka_Raya.csv`

- Encoding: UTF-8
- Delimiter: comma
- Quote: double-quote
- Date format: `YYYY-MM-DD`

**Required columns** (validation will fail if missing):
```
id, nopol_masked, kode_upt, nama_upt, tanggal_transaksi, sd_notice,
kode_jenis_kendaraan, jenis_kendaraan, tipe, tipe_alias, merek_kendaraan, cyl,
no_rangka_masked, no_mesin_masked, bahan_bakar, thn_buat, warna_plat,
kd_guna, kd_jrm, nama_masked, ktp_masked, no_hp_masked, alamat_masked, kecamatan
```

**Tool behavior**:
- Filter `nama_upt = 'SAMSAT PALANGKARAYA'` only (skip two-source merge)
- Trim string whitespace
- Parse `sd_notice`, `tanggal_transaksi` as DATE
- Cast `thn_buat` as INT
- Compute `durasi_tunggakan_days`, `has_payment_history`, `usia_kendaraan`, `has_phone`
- Classify segmen (see Section 12)
- Enrich treatment (see Section 12)

### 11.3 `Transaksi_2025.csv`

- Encoding: UTF-8
- Delimiter: comma
- Date format: `DD/MM/YYYY HH:MM`
- 685,751 rows expected

**Required columns** (subset, full list in 02_reference_data.sql):
```
id, source_name, nomor_polisi_masked, id_layanan, nama_layanan,
kabupaten_id, nama_kabupaten, upt_id, upt_nama, paid_on,
masa_pajak_mulai, masa_pajak_sampai, pokok_pkb, tunggakan_pokok_pkb,
pokok_bbnkb, opsen_pokok_pkb, opsen_pokok_bbnkb, pokok_swdkllj,
tunggakan_pokok_swdkllj, denda_swdkllj, tunggakan_denda_swdkllj,
kode_jenken, jenis_kendaraan, ...
```

**Tool behavior**:
- Phase 2: aggregate `AVG(pokok_pkb)` per `kode_jenken` → upsert `dim_jenken.est_pkb_per_kendaraan`
- Phase 4 (optional): raw load to `gold.transaksi_fact`

### 11.4 `treatment_v1.4.yaml`

(Already exists at `pilot_starter_pack/treatment_v1.4.yaml`)

**Schema**:
```yaml
metadata:
  framework_version: "1.4"
  reference_date: "2025-05-01"

segments:
  H1: { nama, treatment_kanal_utama, treatment_kebijakan_amnesti,
        treatment_aksi_utama, treatment_perkiraan_konversi }
  K1: { ... }
  ...
  S2: { ... }

verification:
  expected_segments: [H1, K1, O1, M1, M2, S1, S2]
```

### 11.5 Environment Variables (`.env`)

```bash
# Required
SUPABASE_DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
SUPABASE_DB_USER=postgres.your_project_ref
SUPABASE_DB_PASSWORD=xxx
SUPABASE_DB_PORT=6543
SUPABASE_DB_NAME=postgres
OPENAI_API_KEY=sk-...

# Optional (for non-DB operations)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
```

---

## 12. Critical Algorithms

### 12.1 Segment Classification Function

**Location**: `jr_pilot/classify.py::classify_segment(row) -> str`

**Logic** (priority-ordered, first match wins):

```python
def classify_segment(row) -> str:
    sd_days = row["durasi_tunggakan_days"]
    has_hist = row["has_payment_history"]
    usia = row["usia_kendaraan"]

    # Out-of-pyramid (priority 1-2)
    if not has_hist:
        if pd.notna(usia) and usia <= 15: return "S1"
        elif pd.notna(usia) and usia > 15: return "S2"

    # In-pyramid (priority 3-7)
    if pd.isna(sd_days) or sd_days <= 0:    return "H1"
    if 1 <= sd_days <= 90:                   return "K1"
    if 91 <= sd_days <= 365:                 return "O1"
    if 366 <= sd_days <= 730:                return "M1"
    if 731 <= sd_days <= 1825:               return "M2"

    # Edge case: tunggakan >5 thn
    if sd_days > 1825:
        if pd.notna(usia) and usia < 20: return "M2"
        else:                             return "S2"  # reklasifikasi ghost

    return "unclassified"
```

**Tests required** (in `tests/test_classify.py`):
```python
def test_h1_belum_jatuh_tempo():
    row = {"durasi_tunggakan_days": -10, "has_payment_history": True, "usia_kendaraan": 5}
    assert classify_segment(row) == "H1"

def test_k1_baru_lewat():
    row = {"durasi_tunggakan_days": 45, "has_payment_history": True, "usia_kendaraan": 7}
    assert classify_segment(row) == "K1"

def test_s1_belum_terdaftar():
    row = {"durasi_tunggakan_days": 100, "has_payment_history": False, "usia_kendaraan": 10}
    assert classify_segment(row) == "S1"

def test_s2_kendaraan_hantu():
    row = {"durasi_tunggakan_days": None, "has_payment_history": False, "usia_kendaraan": 22}
    assert classify_segment(row) == "S2"

def test_m2_reklasifikasi_ke_s2():
    # Tunggakan 6 tahun + usia 25 tahun → reklasifikasi ke S2
    row = {"durasi_tunggakan_days": 2200, "has_payment_history": True, "usia_kendaraan": 25}
    assert classify_segment(row) == "S2"

def test_m2_tetap_kalau_usia_muda():
    # Tunggakan 6 tahun tapi usia 18 tahun → tetap M2
    row = {"durasi_tunggakan_days": 2200, "has_payment_history": True, "usia_kendaraan": 18}
    assert classify_segment(row) == "M2"
```

### 12.2 Treatment Enrichment Function

**Location**: `jr_pilot/treatment.py::enrich_treatment(df, config) -> df`

**Logic** — pure lookup, no AI:

```python
def enrich_treatment(df: pd.DataFrame, config: dict) -> pd.DataFrame:
    segments_cfg = config["segments"]

    # Build flat lookup dicts
    fields = ["treatment_kanal_utama", "treatment_kebijakan_amnesti",
              "treatment_aksi_utama", "treatment_perkiraan_konversi"]
    lookups = {
        f: {seg: cfg.get(f, "").strip() for seg, cfg in segments_cfg.items()}
        for f in fields
    }

    # Apply
    for f in fields:
        df[f] = df["segmen_kepatuhan"].map(lookups[f]).fillna("")

    return df
```

**Tests required**:
```python
def test_enrich_m2():
    df = pd.DataFrame({"segmen_kepatuhan": ["M2"]})
    config = {"segments": {"M2": {"treatment_kanal_utama": "WhatsApp..."}}}
    result = enrich_treatment(df, config)
    assert "WhatsApp" in result["treatment_kanal_utama"].iloc[0]

def test_enrich_unknown_segment():
    df = pd.DataFrame({"segmen_kepatuhan": ["UNKNOWN"]})
    config = {"segments": {"M2": {"treatment_kanal_utama": "x"}}}
    result = enrich_treatment(df, config)
    assert result["treatment_kanal_utama"].iloc[0] == ""
```

### 12.3 Verification Function

**Location**: `jr_pilot/verify.py::verify_distribution(actual, expected, tolerance=0.05) -> bool`

```python
EXPECTED_DISTRIBUTION = {
    "H1": 107967, "K1": 33789, "O1": 32916, "M1": 25039,
    "M2": 140966, "S1": 12756, "S2": 74544,
}

def verify_distribution(actual: dict, expected: dict = EXPECTED_DISTRIBUTION,
                         tolerance: float = 0.05) -> tuple[bool, list[dict]]:
    """
    Compare actual segment counts vs expected.
    Returns (all_pass, details_per_segment).
    """
    results = []
    all_pass = True
    for seg, exp_count in expected.items():
        act_count = actual.get(seg, 0)
        diff_pct = abs(act_count - exp_count) / exp_count if exp_count else 0
        passed = diff_pct <= tolerance
        if not passed:
            all_pass = False
        results.append({
            "segmen": seg,
            "actual": act_count,
            "expected": exp_count,
            "diff_pct": round(diff_pct * 100, 2),
            "passed": passed,
        })
    return all_pass, results
```

---

## 13. Output Specifications

### 13.1 Local Output (`outputs/`)

```
outputs/
├── enriched_registry.parquet        # Phase 3 output (pre-upload audit)
├── transaksi_aggregated.parquet     # Phase 2 output (avg PKB per jenken)
├── verification_report.txt          # Phase 5 output (text report)
├── run_log.json                     # Run metadata (start/end time, args, batch_ids)
└── debug/                           # Optional --verbose mode
    ├── classification_traces.csv    # 100 sample rows dengan classification debug
    └── upload_errors.json           # Per-row upload errors (if any)
```

### 13.2 Supabase Output

**`gold.registry_enriched`** (target: 409,690 rows after SAMSAT PALANGKARAYA filter)

Columns: vehicle_id, nopol_masked, kabupaten_id, kode_jenken, sd_notice,
tanggal_transaksi, thn_buat, no_hp_masked, merek_kendaraan, tipe, bahan_bakar,
warna_plat, kecamatan, kelurahan,
**durasi_tunggakan_days, has_payment_history, usia_kendaraan, has_phone,**
**segmen_kepatuhan, treatment_kanal_utama, treatment_kebijakan_amnesti,**
**treatment_aksi_utama, treatment_perkiraan_konversi, est_pkb_per_kendaraan,**
batch_id, loaded_at, source_period

**`gold.dim_jenken`** (target: 8 rows + auto-detected from data)

Columns: kode_jenken, jenis_kendaraan, is_motor, **est_pkb_per_kendaraan** (populated from Phase 2)

**`gold.transaksi_fact`** (target: 685,751 rows, optional)

**`kb.reference_docs`** (target: ~70 chunks dari dictionary + ~150 chunks dari framework + ~50 chunks dari paper = ~270 chunks)

**`kb.few_shot`** (target: 15 entries dengan question embeddings)

**`public.batch_manifest`** (one entry per phase upload)

**`gold_plus.agg_segmen_kabupaten`** + **`gold_plus.agg_segmen_jenken`** (refreshed)

---

## 14. File Structure (Implementation Recommendation)

```
jr-pilot/                              # repo root
├── README.md                          # quickstart
├── PRD_jr_pilot_tool.md               # this PRD
├── pyproject.toml                     # pip install -e . support
├── .env.example                       # template
├── .gitignore                         # ignore .env, outputs/, *.parquet, .streamlit/secrets.toml
│
├── app.py                             # ⭐ STREAMLIT ENTRY POINT (run: streamlit run app.py)
│
├── ui/                                # Streamlit UI components
│   ├── __init__.py
│   ├── upload.py                      # File upload widgets + validation
│   ├── config.py                      # Configuration panel
│   ├── progress.py                    # Run + progress display
│   ├── results.py                     # Results display (charts, tables, downloads)
│   ├── sidebar.py                     # Recent batches + settings
│   └── styles.py                      # Custom CSS / theming
│
├── jr_pilot/                          # core package (UI-agnostic, also testable)
│   ├── __init__.py
│   ├── config.py                      # load .env + treatment YAML
│   ├── db.py                          # psycopg2 connection helper
│   ├── manifest.py                    # batch_manifest CRUD
│   │
│   ├── phases/
│   │   ├── __init__.py
│   │   ├── phase1_kb_embed.py         # KB embedding via OpenAI
│   │   ├── phase2_transaksi_agg.py    # Aggregate Transaksi
│   │   ├── phase3_registry.py         # Cleanse + classify + enrich + upload
│   │   ├── phase4_transaksi_raw.py    # (Optional) raw load
│   │   └── phase5_verify.py           # Verify + MV refresh
│   │
│   ├── classify.py                    # classify_segment()
│   ├── treatment.py                   # enrich_treatment()
│   ├── verify.py                      # verify_distribution()
│   ├── pipeline.py                    # Orchestrator: run_pipeline(files, config, callback)
│   │                                  #   ↑ key: callback untuk emit progress events ke UI
│   │
│   └── reference/
│       ├── EXPECTED_DISTRIBUTION.json
│       └── EXPECTED_PHONE_PCT.json
│
├── tests/
│   ├── conftest.py                    # pytest fixtures
│   ├── test_classify.py               # 6+ tests
│   ├── test_treatment.py              # 4+ tests
│   ├── test_verify.py                 # tests
│   ├── test_phase2.py                 # mock-based
│   ├── test_phase3.py                 # mock-based
│   ├── test_pipeline.py               # integration test pipeline orchestrator
│   ├── test_ui_upload.py              # Streamlit AppTest framework
│   └── fixtures/
│       ├── sample_dictionary.xlsx     # 10 fields
│       ├── sample_registry.csv        # 100 rows representative
│       └── sample_transaksi.csv       # 100 rows representative
│
├── .streamlit/
│   ├── config.toml                    # theme, page config
│   └── secrets.toml.example           # template (gitignored real one)
│
├── pilot_starter_pack/                # symlink atau copy dari workspace
│   ├── 01_schema.sql
│   ├── 02_reference_data.sql
│   ├── treatment_v1.4.yaml
│   └── reference_docs/                # Markdown framework v1.4 exports
│       ├── framework_v1.4_kerangka.md
│       ├── framework_v1.4_strategi.md
│       ├── framework_v1.4_raci.md
│       └── saptono_khozen_2021.txt
│
└── outputs/                           # gitignored, app saves here untuk download
    └── (timestamped run outputs)
```

**Key separation of concerns**:
- `jr_pilot/` — pure logic, no Streamlit dependency. Testable headless. Pipeline orchestrator (`pipeline.py`) accepts a `progress_callback(phase, step, percent)` so UI dapat hook in.
- `ui/` + `app.py` — Streamlit-specific, calls into `jr_pilot/` modules.

This separation memungkinkan future:
- CLI variant kalau diperlukan (cukup tambah `cli.py` yang juga calls `jr_pilot.pipeline`)
- API backend (FastAPI wrapper around same `jr_pilot.pipeline`)
- Notebook usage (`from jr_pilot.pipeline import run_pipeline`)

---

## 15. Error Handling & Recovery

### 15.1 Categories of Errors

| Category | Examples | Tool Behavior |
|----------|----------|---------------|
| **Input validation** | Missing file, wrong schema, missing kolom required | Exit 1 with descriptive message, no Supabase touch |
| **Connection error** | Supabase down, wrong credentials, network drop | Exit 3, message dengan recovery hint ("retry, or check VPN") |
| **Data quality** | Distribution mismatch >5%, NaN dalam required columns | Exit 2, save partial parquet for inspection, NO upload |
| **API error** | OpenAI rate limit, quota exceeded | Retry with exponential backoff (max 5x), then fail with clear message |
| **Partial upload failure** | Postgres constraint violation mid-batch | Rollback transaction, mark batch_manifest as `failed` dengan error detail |

### 15.2 Specific Error Messages (must match this format)

```python
# Input validation
"❌ Input file not found: inputs/Palangka_Raya.csv"
"❌ Required column missing in registry: 'sd_notice'"
"❌ treatment_v1.4.yaml missing segment: M2"

# Connection
"❌ Cannot connect to Supabase: timeout after 30s"
"   Hint: check SUPABASE_DB_HOST in .env, or retry in 1 minute"
"❌ Supabase auth failed: wrong password"
"   Hint: verify SUPABASE_DB_PASSWORD"

# Data quality
"⚠️  Segment distribution mismatch:"
"     M2: actual 200,000 vs expected 140,966 (diff +42%)"
"     This exceeds tolerance ±5%. Investigation needed."
"     enriched_registry.parquet saved untuk inspection."
"   Hint: check classification logic in jr_pilot/classify.py"

# API
"⏳ OpenAI rate limit hit, backing off 30s..."
"   Retry 2/5..."

# Partial upload
"❌ Bulk insert failed at row ~150,000:"
"   psycopg2.errors.NotNullViolation: null value in column 'segmen_kepatuhan'"
"   Transaction rolled back. batch_manifest marked 'failed'."
"   Hint: check classify_segment edge cases for 'unclassified' rows"
```

### 15.3 Recovery Procedures

| Scenario | Action |
|----------|--------|
| Pipeline failed Phase 3 | Re-run with `--skip-dictionary --skip-transaksi-raw` (skip already-done phases) |
| Distribution mismatch | Inspect `outputs/enriched_registry.parquet`, check classify rules, fix YAML/code, re-run |
| Want to start fresh | `jr-pilot reset --confirm` (drops + re-creates registry_enriched + dim_jenken) |
| Supabase project rotated | Update .env, re-run from scratch |
| Treatment text typo | Edit YAML, re-run with `--skip-dictionary --skip-transaksi-raw --skip-mv-refresh` (Phase 3 only) |

---

## 16. Testing Requirements

### 16.1 Unit Tests (must pass before considering tool done)

```bash
pytest tests/ -v
# Expected: 20+ tests, all passing
```

Coverage targets:
- `classify_segment()`: ≥6 tests (one per output segment)
- `enrich_treatment()`: ≥4 tests (happy path + edge cases)
- `verify_distribution()`: ≥3 tests (pass, fail, partial)
- `cleanse_registry()`: ≥3 tests (whitespace, dates, filter)
- `derive_columns()`: ≥3 tests (durasi calculation, has_phone, usia)

### 16.2 Integration Test (smoke)

```bash
# Use sample fixtures (100 rows each)
jr-pilot load \
  --dictionary tests/fixtures/sample_dictionary.xlsx \
  --transaksi  tests/fixtures/sample_transaksi.csv \
  --registry   tests/fixtures/sample_registry.csv \
  --treatment-config pilot_starter_pack/treatment_v1.4.yaml \
  --output-dir tests/outputs/

# Expected: <30 seconds runtime, all phases complete, verification PASS
```

### 16.3 Manual Verification (after first real run)

```sql
-- Run di Supabase SQL Editor
SELECT segmen_kepatuhan, COUNT(*) FROM gold.registry_enriched GROUP BY 1 ORDER BY 1;
-- Expected: 7 rows, distribution match Sheet 2 ±5%

SELECT segmen_kepatuhan, COUNT(DISTINCT treatment_kanal_utama)
FROM gold.registry_enriched GROUP BY 1;
-- Expected: each = 1 (treatment denormalized)

SELECT COUNT(*) FROM kb.reference_docs;
-- Expected: ≥200

SELECT COUNT(*) FROM public.batch_manifest WHERE status = 'loaded';
-- Expected: 2-3 (per phase upload)
```

---

## 17. Acceptance Criteria

Tool dianggap **DONE** kalau semua hal berikut TRUE:

### 17.1 Setup & Launch
- [ ] AC1: `pip install -r requirements.txt` succeeds in fresh venv
- [ ] AC2: `streamlit run app.py` opens browser tab di http://localhost:8501 dalam <5 detik
- [ ] AC3: `.env.example` provided, app shows clear error kalau .env missing/invalid

### 17.2 UI Functionality
- [ ] AC4: Upload widget accepts xlsx + csv, rejects other formats dengan inline error
- [ ] AC5: Upload widget validates required columns, rejects file dengan kolom missing
- [ ] AC6: Run button DISABLED sampai 3 files ter-upload + connection OK
- [ ] AC7: Progress bar updates real-time during run, status messages match per phase
- [ ] AC8: Cancel button gracefully terminates run, marks batch_manifest 'cancelled'
- [ ] AC9: Results section renders charts + tables + download buttons setelah success
- [ ] AC10: Sidebar shows last 3-5 batch_manifest entries dari Supabase
- [ ] AC11: Page handles refresh gracefully (preserves uploaded files via session state)

### 17.3 Pipeline Correctness
- [ ] AC12: Full pipeline selesai dalam <10 menit pada laptop modern
- [ ] AC13: `outputs/enriched_registry.parquet` ada dan punya 23+ kolom (incl. segmen + treatment denormalized)
- [ ] AC14: Distribution actual vs expected match ±5% per segmen
- [ ] AC15: `gold.registry_enriched` di Supabase punya >400K rows dengan all segmen + treatment populated
- [ ] AC16: `gold.dim_jenken.est_pkb_per_kendaraan` populated dari aggregate Transaksi
- [ ] AC17: `kb.reference_docs` punya ≥200 chunks
- [ ] AC18: `kb.few_shot` punya 15 entries dengan embeddings
- [ ] AC19: `public.batch_manifest` punya entries dengan status='loaded'
- [ ] AC20: Materialized views refreshed dan return 7 rows (per segmen Palangka Raya)

### 17.4 Iteration & Reliability
- [ ] AC21: Re-run kedua kali (idempotent) tidak menambah duplicate
- [ ] AC22: Edit treatment_v1.4.yaml + re-upload registry → re-run → registry_enriched.treatment_kanal_utama updated
- [ ] AC23: All unit tests pass (`pytest tests/`)
- [ ] AC24: Error scenarios (missing input, wrong creds, OpenAI rate limit) shown in UI dengan recovery hint
- [ ] AC25: README.md punya quickstart yang dapat di-eksekusi mentah-mentah

---

## 18. Implementation Plan (Suggested Order)

**Phase A: Foundation (Day 1 morning)**
1. Repo scaffold (pyproject.toml, package structure, .gitignore, .env.example)
2. `jr_pilot/config.py` (load .env, validate, treatment YAML parser)
3. `jr_pilot/db.py` (psycopg2 connection helper, retry logic)
4. `jr_pilot/manifest.py` (batch_manifest CRUD)

**Phase B: Core algorithms (Day 1 afternoon)**
5. `jr_pilot/classify.py` (with 6+ unit tests)
6. `jr_pilot/treatment.py` (with 4+ unit tests)
7. `jr_pilot/verify.py` (with 3+ unit tests)
8. Run `pytest tests/` — all green

**Phase C: Phase modules (Day 2 morning)**
9. `jr_pilot/phases/phase2_transaksi_agg.py`
10. `jr_pilot/phases/phase3_registry.py`
11. `jr_pilot/phases/phase5_verify.py`
12. `jr_pilot/phases/phase1_kb_embed.py`
13. `jr_pilot/phases/phase4_transaksi_raw.py`

**Phase D: Pipeline orchestrator (Day 2 afternoon)**
14. `jr_pilot/pipeline.py` — `run_pipeline(files, config, progress_callback)` yang glue all phases
15. End-to-end test headless dengan fixtures (no UI dulu)
16. Real run dengan actual data via temporary CLI wrapper, verify distribution

**Phase E: Streamlit UI (Day 3 morning)**
17. `app.py` skeleton (page config, layout)
18. `ui/upload.py` — file upload widgets + validation
19. `ui/config.py` — config panel
20. `ui/progress.py` — progress display dengan callback hook ke pipeline
21. `ui/results.py` — charts, tables, download buttons
22. `ui/sidebar.py` — recent batches + connection status

**Phase F: Integration & polish (Day 3 afternoon)**
23. End-to-end UI flow test (manual)
24. Error message refinement (user-friendly format)
25. Streamlit theming + CSS polish
26. README.md + quickstart
27. Run all 25 acceptance criteria checks
28. Smoke test dengan fixtures via Streamlit AppTest framework

**Phase G: Demo prep (optional, Day 3 end)**
29. Screen recording 3-min demo
30. Sample data set anonymized untuk demo public
31. Deploy ke Streamlit Cloud (kalau perlu remote demo)

---

## 19. Out of Scope (Explicitly NOT building)

| Feature | Reason | When to add |
|---------|--------|-------------|
| Bronze + Silver layer | Pilot one-shot, no incremental | Production phase |
| dbt models | Python sufficient for one-shot | Production phase |
| RLS policies | Service role acceptable for pilot | Production phase |
| Multi-environment (dev/staging/prod) | Single Supabase project | Production phase |
| Backup + restore | Pilot data dapat re-load dari CSV | Production phase |
| Monitoring + alerting | Manual check sufficient | Production phase |
| CI/CD untuk dbt | No dbt | Production phase |
| Hub Industri data | Belum tersedia | Future phase |
| Hinterland data | Belum tersedia | Future phase |
| Real-time streaming | Pure batch | Out of pilot scope |
| Multi-tenant | Single project | Out of pilot scope |
| WebSocket / GraphQL | PostgREST + Edge sufficient | Out of pilot scope |

---

## 20. Open Questions

| ID | Question | Owner | Default if no answer |
|----|----------|-------|----------------------|
| OQ1 | Pakai `argparse` atau `click`? | Implementer | argparse (zero deps) |
| OQ2 | Embedding model: `text-embedding-3-small` (1536) atau `-large` (3072)? | Tech lead | 3-small ($0.02/1M tokens) |
| OQ3 | Retry strategy untuk OpenAI rate limit? | Implementer | Exponential backoff, 5x max |
| OQ4 | `jr-pilot reset` minta confirm prompt atau dangerous flag? | Tech lead | Both: prompt by default, `--force` to skip |
| OQ5 | Verification tolerance ±5% atau ±10%? | Tech lead | ±5% (strict) |
| OQ6 | Phase 4 (raw transaksi) default skip atau default include? | Tech lead | Default include (kalau ingin Galen jawab revenue queries detail) |
| OQ7 | Output parquet compression: snappy, zstd, none? | Implementer | snappy (fast, balanced) |
| OQ8 | Logging library: stdlib `logging` atau `rich`? | Implementer | `rich` (pretty progress bars) |

---

## 21. Appendix — References

### 21.1 Existing Files (in workspace)

Located at `/Users/alkhantitan/Downloads/JR Pendapatan Sample/Data Onboarding JS/pilot_starter_pack/`:

- `treatment_v1.4.yaml` — config file (DON'T re-create, just consume)
- `01_schema.sql` — Supabase DDL (reference only — Claude Code may need to update for hybrid columns)
- `02_reference_data.sql` — seed data
- `03_galen_system_prompt.md` — Galen prompt (downstream consumer)
- `04_galen_few_shot.jsonl` — 15 examples for kb.few_shot
- `00_implementation_guide.md` — broader context

### 21.2 Source Data Files

Located at `/Users/alkhantitan/Downloads/JR Pendapatan Sample/`:

- `JR_Data_Dictionary.xlsx`
- `Palangka_Raya.csv`
- `Transaksi_2025.csv`

### 21.3 Framework Documentation

- `PKB Micro Segmentation PalangkaRaya v1.4.xlsx` — original framework dengan 7 sheets
- Saptono & Khozen (2021) — paper academic basis (PDF in uploads)

### 21.4 Sample Expected Output Format

`outputs/verification_report.txt` (sample):

```
======================================================================
VERIFICATION REPORT
======================================================================
Generated: 2026-05-04 14:32:18
Reference date: 2025-05-01
Total rows in registry_enriched: 409,690
Expected total (Sheet 2): 427,977
Diff: -18,287 (filtered SAMSAT PALANGKARAYA only)

Segmen   Actual    Expected   Diff%   Phone%  Treat ✓
  H1    103,234   107,967    -4.38%  99.99%      1  ✓
  K1     32,567    33,789    -3.62%  99.99%      1  ✓
  O1     31,876    32,916    -3.16%  99.98%      1  ✓
  M1     24,250    25,039    -3.15%  99.91%      1  ✓
  M2    134,820   140,966    -4.36%  71.08%      1  ✓
  S1     12,200    12,756    -4.36%   1.59%      1  ✓
  S2     70,743    74,544    -5.10%  19.24%      1  ⚠
                                                       (just over tolerance)

OVERALL: ✓ PASS (6/7 within ±5%, S2 at 5.10% — acceptable for pilot)

Generated artifacts:
- outputs/enriched_registry.parquet (61.2 MB)
- outputs/transaksi_aggregated.parquet (3.4 KB)
- outputs/run_log.json (2.1 KB)

Batch IDs:
- abc-123-...  (Phase 3 registry upload)
- def-456-...  (Phase 4 transaksi upload)
```

---

## 22. Definition of Done (Final Checklist)

Sebelum tool dianggap shippable:

- [ ] Repo structured per Section 14
- [ ] `pip install -e .` succeeds
- [ ] All commands listed di Section 10 work
- [ ] All unit tests pass (Section 16.1)
- [ ] Integration smoke test passes (Section 16.2)
- [ ] All 16 acceptance criteria green (Section 17)
- [ ] README.md complete dengan quickstart
- [ ] `.env.example` provided
- [ ] Error messages match format di Section 15.2
- [ ] No hardcoded credentials anywhere
- [ ] License declared (recommendation: MIT untuk pilot)

---

## 23. Appendix — Sample Quickstart (for README.md)

```markdown
# jr-pilot — Data Pipeline Web App

End-to-end data pipeline tool untuk Jasa Raharja Kalimantan Tengah pilot.
**Streamlit web app** — upload files via browser, lihat hasil interaktif.

## Quickstart

```bash
# 1. Clone & install
git clone <repo>
cd jr-pilot
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. Setup credentials
cp .env.example .env
# Edit .env dengan Supabase + OpenAI credentials

# 3. Setup Supabase schema (run sekali — bisa via UI atau psql langsung)
psql "$SUPABASE_DB_URL" < pilot_starter_pack/01_schema.sql
psql "$SUPABASE_DB_URL" < pilot_starter_pack/02_reference_data.sql

# 4. Launch web app
streamlit run app.py

# Browser auto-opens http://localhost:8501
```

## Using the App

1. **Open** http://localhost:8501 di browser
2. **Verify connection** — sidebar shows ✅ Supabase + ✅ OpenAI
3. **Upload 3 files** dengan drag-and-drop:
   - `JR_Data_Dictionary.xlsx`
   - `Palangka_Raya.csv` (registry)
   - `Transaksi_2025.csv`
4. **Configure** — set reference date (default 2025-05-01), pilih skip flags kalau perlu
5. **Click "▶ Run Pipeline"**
6. **Watch progress** — real-time per phase
7. **Inspect results** — segment distribution chart, verification report, sample data
8. **Download outputs** kalau perlu (parquet, txt report)

Expected runtime: ~5-10 menit (depending on OpenAI API speed untuk dictionary embedding).

## Iterate on Treatment Text

```bash
# Edit treatment YAML
vim pilot_starter_pack/treatment_v1.4.yaml

# Re-launch app (atau Streamlit auto-reloads kalau Anda restart)
streamlit run app.py

# Di UI:
#   1. Re-upload registry file (atau gunakan cached dari session)
#   2. Check "Skip dictionary embedding" + "Skip raw transaksi"
#   3. Run Pipeline → only Phase 3 runs ulang dengan treatment baru
```

## Troubleshoot

### "Supabase connection failed"
- Sidebar indicator akan red ❌
- Check .env credentials, especially `SUPABASE_DB_HOST` (harus pakai pooler port 6543)
- Test manual: `psql "$SUPABASE_DB_URL" -c "SELECT 1;"`

### "OpenAI API key invalid"
- Check `.env` `OPENAI_API_KEY=sk-...`
- Test: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`

### Distribution mismatch >5%
- Banner kuning di Results section
- Click "Inspect parquet" link untuk download `enriched_registry.parquet`
- Open di Pandas / DuckDB untuk debug:
  ```python
  import pandas as pd
  df = pd.read_parquet('outputs/enriched_registry.parquet')
  print(df['segmen_kepatuhan'].value_counts())
  print(df[df['segmen_kepatuhan'] == 'unclassified'].head())
  ```

### Run too slow (>15 minutes)
- Skip "Phase 4: Raw Transaksi Load" via checkbox kalau tidak butuh raw transaksi
- Skip "Phase 1: Dictionary Embedding" kalau sudah pernah di-embed sebelumnya
- Phase 3 (registry classify + upload) ~3-5 menit untuk 410K rows — normal

## Headless / Programmatic Use

Pipeline juga bisa di-run tanpa UI (untuk CI atau notebook):

```python
from jr_pilot.pipeline import run_pipeline
from pathlib import Path

result = run_pipeline(
    dictionary_path=Path("inputs/JR_Data_Dictionary.xlsx"),
    transaksi_path=Path("inputs/Transaksi_2025.csv"),
    registry_path=Path("inputs/Palangka_Raya.csv"),
    treatment_config_path=Path("pilot_starter_pack/treatment_v1.4.yaml"),
    output_dir=Path("outputs/"),
    skip_dictionary=False,
    skip_transaksi_raw=False,
    progress_callback=lambda phase, step, pct: print(f"[{pct}%] {phase}: {step}"),
)

print(result.success)
print(result.distribution)  # dict {segmen: count}
print(result.batch_ids)     # list of batch_id UUIDs
```
```

---

*PRD v2.0 · UI-first (Streamlit) · Ready for handoff ke Claude Code · 2026-05-04*

## Changelog from v1.0

- ✅ Replaced CLI interface dengan Streamlit web app spec
- ✅ Added wireframe ASCII untuk UI layout
- ✅ Added UI components detailed (upload, config, progress, results, sidebar)
- ✅ Added user flow walkthrough (10 steps)
- ✅ Updated tech stack (added Streamlit, plotly)
- ✅ Updated file structure (added `app.py` + `ui/` folder, removed `cli.py`)
- ✅ Updated acceptance criteria (4 categories: Setup, UI, Pipeline, Iteration)
- ✅ Updated implementation plan (added Phase E for UI, Phase F for integration)
- ✅ Kept core logic (classify, treatment, phases) identical — same `jr_pilot/` package
- ✅ Maintained headless usage option (pipeline.run_pipeline() callable from notebook/script)

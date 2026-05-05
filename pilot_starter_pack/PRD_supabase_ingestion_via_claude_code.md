# PRD — Supabase Ingestion via Claude Code (Governance + Knowledge Layer)

**Project:** JR PKB Pilot — Palangka Raya, Kalimantan Tengah
**Document type:** Product Requirements Document (developer-facing)
**Version:** 2.0 (scope: governance + KB only)
**Effective date:** 2026-05-05
**Audience:** Claude Code agent (autonomous executor) + Pilot Lead (operator)

---

## 1. Scope Clarification

### 1.1 What this PRD covers

Ingestion **governance + knowledge layer** ke Supabase via Claude Code:

- **Reference dimensions** (`ref` schema) — small static lookups (segmen, treatment, kabupaten, jenken, dll).
- **Knowledge base** (`kb` schema) — framework v1.4 chunks + paper Saptono & Khozen + few-shot examples + L3/L4/L6 context model entries, all embedded ke pgvector.
- **Metadata + governance** (`meta` schema) — table_metadata, metric_certification (27 metrik), table_certification, column_metadata + 5 RPCs.

### 1.2 What this PRD does NOT cover

**Raw data ingestion sengaja di-EXCLUDE** dari PRD ini:

- ❌ `gold.registry_enriched` (427.977 rows) — ditangani terpisah oleh process `11_load_pilot.py` + bulk COPY.
- ❌ `gold.transaksi_fact` — belum di-ingest untuk pilot scope (L4-DATA-005).
- ❌ `gold_plus.*` materialized views — tergantung ke gold tables, refresh setelah raw data masuk.

**Catatan:** DDL untuk `gold` dan `gold_plus` tetap diapply (schemas + tabel kosong dibuat) supaya `meta.table_metadata` punya target valid untuk reference. Tabel `gold.*` stay empty sampai raw data ingestion process dijalankan terpisah.

### 1.3 Goal

Setelah PRD ini dieksekusi, Galen specialist agent punya:

1. Schema governance (`meta`) — bisa lookup confidence, cert level, ownership.
2. Reference data (`ref`) — bisa join ke 7 segmen, treatment rules, dll.
3. Embedded knowledge base (`kb`) — bisa retrieve framework + tribal knowledge via pgvector.
4. Empty placeholder gold/gold_plus — siap di-populate raw data terpisah.

### 1.4 Success definition

Pilot dianggap "Galen-ready (governance + KB layer)" ketika:

1. 5 schema dibuat: `gold`, `gold_plus`, `ref`, `kb`, `meta` (gold/gold_plus boleh kosong).
2. 9 tabel ter-populate: 5 di `ref`, 2 di `kb`, 4 di `meta` = 11 tables (+ 2 empty gold/gold_plus tables for FK validity).
3. ≥80 KB chunks ter-embed di pgvector (40 framework + 5-15 few-shot + ~30 context model).
4. Semua 5 RPC functions di `meta` callable.
5. Sanity verification queries pass.
6. Ingestion report generated.

---

## 2. Why Claude Code (bukan UI manual atau Python script)?

| Pendekatan | Pro | Kontra |
|---|---|---|
| Supabase Studio UI manual | Visual | Lambat, error-prone, no audit trail |
| Custom Python script | Reproducible | Brittle, butuh maintenance |
| **Claude Code + Supabase MCP** | Adaptive, self-verifying, audit trail | Butuh setup MCP awal |

Claude Code unggul karena:
- Native **Supabase MCP tools** (`apply_migration`, `execute_sql`, `list_tables`, dll).
- **Read context** dari L1-L6 + metadata docs untuk decision-making.
- **Error-recovery loop** — kalau migration gagal, diagnose + retry.
- **Transparent log** untuk audit pilot lead.

---

## 3. Personas

### 3.1 Operator (Pilot Lead)

**Profile:** Non-developer power user dengan akses Supabase project.

**Workflow:**
1. Setup Supabase project (sudah ada).
2. Set environment variables (Section 4.1).
3. Buka terminal, `cd pilot_starter_pack/`.
4. Jalankan `claude` (Claude Code).
5. Beri prompt: *"Baca PRD_supabase_ingestion_via_claude_code.md dan jalankan ingestion governance + KB layer ke Supabase."*
6. Approve cost confirmations bila diminta.
7. Review final report.

### 3.2 Claude Code Agent

**Required tools:**
- File: `Read`, `Glob`, `Grep`, `Bash`
- Supabase MCP (`mcp__supabase__*`):
  - `list_organizations`, `list_projects`, `get_project`
  - `apply_migration`, `execute_sql`
  - `list_tables`, `list_extensions`, `list_migrations`
  - `get_advisors`, `get_logs`
  - `confirm_cost`

**Behavior contract:**
- **Idempotent:** Re-run aman, no duplicate.
- **Verbose:** Log setiap tool call + result snippet.
- **Cost-aware:** `confirm_cost` sebelum operasi billable.
- **Verification-first:** Sanity query setelah setiap fase.

---

## 4. Prerequisites (Operator Responsibility)

### 4.1 Environment variables

```bash
# Supabase project credentials
export SUPABASE_PROJECT_REF="abc123def"
export SUPABASE_DB_HOST="aws-0-region.pooler.supabase.com"
export SUPABASE_DB_PORT="6543"
export SUPABASE_DB_USER="postgres.abc123def"
export SUPABASE_DB_PASSWORD="<from Supabase Studio Settings>"
export SUPABASE_DB_NAME="postgres"

# OpenAI (untuk KB embedding)
export OPENAI_API_KEY="sk-..."

# Optional: Supabase Access Token untuk MCP
export SUPABASE_ACCESS_TOKEN="<personal access token>"
```

### 4.2 Supabase project state

- Project status `ACTIVE_HEALTHY`.
- `pgvector` extension installable.
- Free tier sufficient (governance + KB pakai disk minimal).

### 4.3 Required files

```
pilot_starter_pack/
├── supabase_setup_full.sql                              [DDL — gold/gold_plus/ref/kb]
├── metadata/supabase_metadata_ddl.sql                   [DDL — meta]
│
├── csv_for_supabase/01_dim_kabupaten.csv                [seed]
├── csv_for_supabase/02_dim_upt.csv
├── csv_for_supabase/03_dim_jenken.csv
├── csv_for_supabase/04_dim_layanan.csv
├── csv_for_supabase/05_ref_segmen.csv
├── csv_for_supabase/06_ref_treatment_lookup.csv
├── csv_for_supabase/07_ref_program_sadar.csv
├── csv_for_supabase/08_ref_raci_matrix.csv
├── csv_for_supabase/09_ref_revenue_scenario.csv
├── csv_for_supabase/10_kb_reference_docs.csv            [optional shortcut]
├── csv_for_supabase/11_kb_few_shot.csv                  [optional shortcut]
│
├── metadata/csv_for_supabase/01_table_metadata.csv      [14 rows]
├── metadata/csv_for_supabase/02_metric_certification.csv[27 rows]
├── metadata/csv_for_supabase/03_table_certification.csv [14 rows]
├── metadata/csv_for_supabase/04_column_metadata.csv     [25 rows]
│
├── kb_chunks_to_embed.jsonl                             [40 KB framework chunks]
├── 04_galen_few_shot.jsonl                              [15 Q&A bootstrap]
├── embed_kb.py                                          [embedding helper]
│
├── context_model/L1_schema_metadata.md                  [optional KB source]
├── context_model/L2_curated_definitions.yaml            [optional KB source]
├── context_model/L3_formula_lineage.json                [optional KB source]
├── context_model/L4_tribal_knowledge.md                 [optional KB source]
├── context_model/L6_golden_queries.sql                  [optional KB source]
└── context_model/L5_learning_memory.jsonl               [seed; stays on disk for pilot]
```

**File NOT needed** (excluded from this PRD):
- `enriched_registry.csv` (raw data, separate ingestion)

---

## 5. Ingestion Phases

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 1: Pre-flight Checks                                              │
│  Phase 2: Apply DDLs (5 schemas + all tables + RPCs)                    │
│  Phase 3: Seed Reference Data (9 CSVs → ref schema)                     │
│  Phase 4: Seed Metadata (4 CSVs → meta schema)                          │
│  Phase 5: Embed Knowledge Base (kb_chunks + few_shot)                   │
│  Phase 6: Embed Context Model Layers (L3/L4/L6 → kb.reference_docs)     │
│  Phase 7: Verify + RPC Smoke Tests                                      │
│  Phase 8: Generate Ingestion Report                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

Total estimated duration: **~3 menit**.

---

### Phase 1 — Pre-flight Checks

**Goal:** Validate environment, file integrity, and Supabase connectivity.

**Steps:**

1. **Environment check:**
   ```bash
   for v in SUPABASE_PROJECT_REF SUPABASE_DB_HOST SUPABASE_DB_USER SUPABASE_DB_PASSWORD OPENAI_API_KEY; do
       [ -z "${!v}" ] && echo "MISSING: $v" || echo "OK: $v"
   done
   ```

2. **File integrity (focused on PRD scope):**
   - Use `Glob` to confirm DDLs, all 13 small CSVs, JSONL files, context_model files.
   - **Do NOT** check `enriched_registry.csv` — out of scope.

3. **Supabase connectivity:**
   - `mcp__supabase__list_projects` — confirm `SUPABASE_PROJECT_REF` exists.
   - `mcp__supabase__get_project` — confirm `ACTIVE_HEALTHY`.
   - `mcp__supabase__list_extensions` — verify `pgvector` available/installable.

4. **Existing state check (idempotency):**
   - `mcp__supabase__list_tables(schemas=["ref","kb","meta"])`.
   - If any populated → **PROMPT OPERATOR**: "(R)esume / (T)runcate-and-reload / (A)bort?"

**Success:** All checks PASS. Print `✓ Phase 1 complete.`

---

### Phase 2 — Apply DDLs

**Goal:** Create all 5 schemas dengan tabel + RPCs. `gold` dan `gold_plus` tables dibuat **empty** (akan di-populate process raw data ingestion terpisah).

**Steps:**

1. **Read DDL files:**
   - `supabase_setup_full.sql` (gold/gold_plus/ref/kb).
   - `metadata/supabase_metadata_ddl.sql` (meta).

2. **Apply main DDL:**
   ```
   mcp__supabase__apply_migration(
       project_id=$SUPABASE_PROJECT_REF,
       name="pilot_setup_main",
       query=<contents of supabase_setup_full.sql>
   )
   ```

3. **Apply metadata DDL:**
   ```
   mcp__supabase__apply_migration(
       project_id=$SUPABASE_PROJECT_REF,
       name="pilot_setup_metadata",
       query=<contents of metadata/supabase_metadata_ddl.sql>
   )
   ```

4. **Verify schemas + RPCs:**
   ```sql
   -- 5 schemas exist
   SELECT schema_name FROM information_schema.schemata
   WHERE schema_name IN ('gold','gold_plus','ref','kb','meta');

   -- pgvector enabled
   SELECT extname FROM pg_extension WHERE extname = 'vector';

   -- meta RPCs
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'meta';
   -- Expected: get_metric, get_table_status, list_gold_metrics,
   --           confidence_for_metric, list_stale_metrics, touch_updated_at
   ```

5. **Document empty state of gold/gold_plus:**
   - Log a clear note: "Tables in gold/gold_plus created but EMPTY. Populate via separate raw data ingestion process."

**Success:**
- 2 migrations registered.
- 5 schemas exist.
- pgvector enabled.
- ≥6 RPCs in meta.

---

### Phase 3 — Seed Reference Data

**Goal:** Load 9 small reference CSVs ke `ref` dan `kb` schemas (total ≤200 rows).

**Order (FK dependency):**

| # | CSV | Target | Expected rows |
|---|---|---|---|
| 1 | `csv_for_supabase/01_dim_kabupaten.csv` | `ref.dim_kabupaten` | ~30 |
| 2 | `csv_for_supabase/02_dim_upt.csv` | `ref.dim_upt` | ~5 |
| 3 | `csv_for_supabase/03_dim_jenken.csv` | `ref.dim_jenken` | ~30 |
| 4 | `csv_for_supabase/04_dim_layanan.csv` | `ref.dim_layanan` | ~5 |
| 5 | `csv_for_supabase/05_ref_segmen.csv` | `ref.dim_segmen` | 7 |
| 6 | `csv_for_supabase/06_ref_treatment_lookup.csv` | `ref.treatment_rules` | 7 |
| 7 | `csv_for_supabase/07_ref_program_sadar.csv` | `ref.program_sadar` | ~5 |
| 8 | `csv_for_supabase/08_ref_raci_matrix.csv` | `ref.raci_matrix` | ~10 |
| 9 | `csv_for_supabase/09_ref_revenue_scenario.csv` | `ref.revenue_scenario` | ~5 |

**Per-CSV procedure:**

1. Read first 5 lines (sanity peek).
2. Generate INSERT batches via `Bash` Python helper (handles array `{...}` and JSONB `[...]` columns).
3. Execute via `mcp__supabase__execute_sql`.
4. Verify row count.

**Edge cases:**
- Array columns (`{val1,val2}`): pakai sebagaimana adanya.
- JSONB: wrap dengan `'<json>'::jsonb`.
- NULL: empty cell → SQL `NULL`.

**Success:** All 9 tables row count matches expected.

---

### Phase 4 — Seed Metadata

**Goal:** Load 4 CSVs governance ke `meta` schema (total 80 rows).

**Order (FK dependency):**

| # | CSV | Target | Expected rows |
|---|---|---|---|
| 1 | `metadata/csv_for_supabase/01_table_metadata.csv` | `meta.table_metadata` | 14 |
| 2 | `metadata/csv_for_supabase/02_metric_certification.csv` | `meta.metric_certification` | 27 |
| 3 | `metadata/csv_for_supabase/03_table_certification.csv` | `meta.table_certification` | 14 |
| 4 | `metadata/csv_for_supabase/04_column_metadata.csv` | `meta.column_metadata` | 25 |

**Per-CSV procedure:** Same as Phase 3.

**Verification queries:**

```sql
-- Cert level distribution
SELECT certification_level, COUNT(*)
FROM meta.metric_certification
GROUP BY certification_level;
-- Expected: gold 7, silver 8, bronze 12

-- Domain distribution
SELECT business_domain, COUNT(*)
FROM meta.metric_certification
GROUP BY business_domain;
-- Expected: compliance 8, revenue 6, swdkllj 3, treatment 3, demographic 4, operational 3

-- Slug uniqueness
SELECT metric_slug, COUNT(*)
FROM meta.metric_certification
GROUP BY metric_slug HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Cross-reference integrity (metric → tabel)
SELECT mc.metric_id
FROM meta.metric_certification mc
WHERE NOT EXISTS (
    SELECT 1 FROM meta.table_metadata tm
    WHERE tm.table_id = ANY(mc.source_tables)
);
-- Expected: 0 rows (all metrics reference real tables)
```

**Success:** All 4 tables row count matches expected. Verifications pass.

---

### Phase 5 — Embed Knowledge Base

**Goal:** Populate `kb.reference_docs` (framework + paper) and `kb.few_shot` via OpenAI embeddings.

**Steps:**

1. **Verify OpenAI access:**
   ```bash
   curl -s https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY" | head
   ```

2. **Run embed_kb.py:**
   ```bash
   cd pilot_starter_pack/
   python embed_kb.py --reset
   ```

   Cost estimate: <$0.01 (per docstring di embed_kb.py).

3. **Verify embeddings:**
   ```sql
   SELECT source, COUNT(*) FROM kb.reference_docs GROUP BY source;
   -- Expected: framework_v1.4 ~30, paper_saptono_khozen ~10

   SELECT COUNT(*) FROM kb.few_shot;
   -- Expected: 5-15
   ```

4. **Test similarity search:**
   ```sql
   SELECT source, category, LEFT(chunk_text, 80) AS preview,
          embedding <-> (SELECT embedding FROM kb.reference_docs LIMIT 1) AS distance
   FROM kb.reference_docs
   ORDER BY distance LIMIT 5;
   ```

**Success:**
- ≥30 rows in `kb.reference_docs`.
- ≥5 rows in `kb.few_shot`.
- Similarity search returns ranked results.

---

### Phase 6 — Embed Context Model Layers

**Goal:** Embed L3 (lineage), L4 (tribal knowledge), L6 (golden queries) sebagai **additional KB sources** untuk Galen retrieval. Layer L1 + L2 disengaja TIDAK di-embed (selalu inline di system prompt).

**Why this phase exists:** L4 entries dan L6 query descriptions sangat valuable untuk RAG retrieval — mereka jawab "kenapa" dan "best practice" yang tidak ada di framework chunks.

**Sub-phases:**

#### 6a — Embed L3 lineage (per node)

```bash
python <<'EOF'
import json, os
from openai import OpenAI
import psycopg2
from psycopg2.extras import execute_values

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
conn = psycopg2.connect(...)  # standard env vars

with open("context_model/L3_formula_lineage.json") as f:
    lineage = json.load(f)

rows = []
for node in lineage["nodes"]:
    text = f"""[L3 Lineage Node]
Node ID: {node['node_id']}
Type: {node.get('node_type','')}
Description: {node.get('description','')}
Formula: {node.get('formula','')}
Upstream: {', '.join(node.get('upstream', []))}
Downstream: {', '.join(node.get('downstream', []))}
Governance: {node.get('governance','')}
Edge cases: {' | '.join(node.get('edge_cases', []))}
"""
    emb = client.embeddings.create(model="text-embedding-3-small", input=text).data[0].embedding
    rows.append(("L3_lineage", node["node_id"], text, json.dumps(node), emb))

with conn.cursor() as cur:
    execute_values(cur,
        """INSERT INTO kb.reference_docs (source, category, chunk_text, chunk_metadata, embedding)
           VALUES %s""",
        rows,
        template="(%s, %s, %s, %s::jsonb, %s::vector)")
conn.commit()
print(f"Inserted {len(rows)} L3 lineage chunks")
EOF
```

Expected: ~30 chunks.

#### 6b — Embed L4 tribal knowledge (per entry)

Parse `context_model/L4_tribal_knowledge.md` per `### L4-{CAT}-{NNN}` heading. Each section = 1 chunk.

```bash
python <<'EOF'
import re, json, os
from openai import OpenAI
import psycopg2
from psycopg2.extras import execute_values

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
conn = psycopg2.connect(...)

with open("context_model/L4_tribal_knowledge.md") as f:
    md = f.read()

# Match each "### L4-{CAT}-{NNN} — {title}" through next "### " or "---"
pattern = r'### (L4-[A-Z]+-\d+) — (.+?)\n(.*?)(?=\n### |\n---|\Z)'
entries = re.findall(pattern, md, re.DOTALL)

rows = []
for entry_id, title, body in entries:
    chunk_text = f"[L4 Tribal Knowledge] {entry_id} — {title}\n\n{body.strip()}"
    emb = client.embeddings.create(model="text-embedding-3-small", input=chunk_text).data[0].embedding
    metadata = {"entry_id": entry_id, "title": title.strip()}
    rows.append(("L4_tribal_knowledge", entry_id.split('-')[1].lower(), chunk_text, json.dumps(metadata), emb))

with conn.cursor() as cur:
    execute_values(cur,
        """INSERT INTO kb.reference_docs (source, category, chunk_text, chunk_metadata, embedding) VALUES %s""",
        rows,
        template="(%s, %s, %s, %s::jsonb, %s::vector)")
conn.commit()
print(f"Inserted {len(rows)} L4 tribal knowledge chunks")
EOF
```

Expected: ~30 chunks.

#### 6c — Embed L6 golden queries (per query)

Parse `context_model/L6_golden_queries.sql` per `-- Q-{CAT}-{NNN}` header.

```bash
python <<'EOF'
import re, json, os
from openai import OpenAI
import psycopg2
from psycopg2.extras import execute_values

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
conn = psycopg2.connect(...)

with open("context_model/L6_golden_queries.sql") as f:
    sql = f.read()

# Match "-- Q-{CAT}-{NNN} [TRUST] {description}\n{SQL}" up to next "-- Q-" or "-- ===" or EOF
pattern = r'-- (Q-[A-Z]+-\d+) \[(\w+)\] (.+?)\n([\s\S]*?)(?=\n-- Q-|\n-- ====|\Z)'
queries = re.findall(pattern, sql)

rows = []
for query_id, trust, desc, query_body in queries:
    chunk_text = f"""[L6 Golden Query] {query_id} [{trust}]
Description: {desc.strip()}

SQL:
{query_body.strip()}
"""
    emb = client.embeddings.create(model="text-embedding-3-small", input=chunk_text).data[0].embedding
    metadata = {"query_id": query_id, "trust": trust, "description": desc.strip()}
    rows.append(("L6_golden_queries", query_id.split('-')[1].lower(), chunk_text, json.dumps(metadata), emb))

with conn.cursor() as cur:
    execute_values(cur,
        """INSERT INTO kb.reference_docs (source, category, chunk_text, chunk_metadata, embedding) VALUES %s""",
        rows,
        template="(%s, %s, %s, %s::jsonb, %s::vector)")
conn.commit()
print(f"Inserted {len(rows)} L6 golden query chunks")
EOF
```

Expected: ~18 chunks.

**Verification:**

```sql
SELECT source, COUNT(*) FROM kb.reference_docs GROUP BY source ORDER BY 1;
-- Expected:
--   framework_v1.4         ~30
--   paper_saptono_khozen   ~10
--   L3_lineage             ~30
--   L4_tribal_knowledge    ~30
--   L6_golden_queries      ~18
-- TOTAL: ~118 chunks
```

**Cost estimate:** ~$0.02 total for L3/L4/L6 embeddings.

**Success:** Total `kb.reference_docs` rows ≥80, distribution across 5 sources.

---

### Phase 7 — Verify + RPC Smoke Tests

**Goal:** Final validation against L6 health checks dan RPC functions.

**Steps:**

1. **Run schema-level validation:**
   ```sql
   -- All 5 schemas
   SELECT schema_name FROM information_schema.schemata
   WHERE schema_name IN ('gold','gold_plus','ref','kb','meta');
   -- Expected: 5 rows

   -- Tables in each schema
   SELECT table_schema, COUNT(*)
   FROM information_schema.tables
   WHERE table_schema IN ('gold','gold_plus','ref','kb','meta')
   GROUP BY table_schema;
   ```

2. **Validate ref + kb + meta row counts:**
   ```sql
   SELECT 'ref.dim_segmen' AS table_name, COUNT(*) FROM ref.dim_segmen
   UNION ALL SELECT 'ref.treatment_rules', COUNT(*) FROM ref.treatment_rules
   UNION ALL SELECT 'kb.reference_docs', COUNT(*) FROM kb.reference_docs
   UNION ALL SELECT 'kb.few_shot', COUNT(*) FROM kb.few_shot
   UNION ALL SELECT 'meta.table_metadata', COUNT(*) FROM meta.table_metadata
   UNION ALL SELECT 'meta.metric_certification', COUNT(*) FROM meta.metric_certification
   UNION ALL SELECT 'meta.table_certification', COUNT(*) FROM meta.table_certification
   UNION ALL SELECT 'meta.column_metadata', COUNT(*) FROM meta.column_metadata;
   ```

3. **Confirm gold/gold_plus EMPTY (expected):**
   ```sql
   SELECT 'gold.registry_enriched' AS t, COUNT(*) FROM gold.registry_enriched
   UNION ALL SELECT 'gold.transaksi_fact', COUNT(*) FROM gold.transaksi_fact;
   -- Expected both: 0 (raw data ingestion separate)
   ```

4. **RPC smoke tests:**
   ```sql
   -- List gold-certified metrics (expected 7)
   SELECT * FROM meta.list_gold_metrics();

   -- Lookup by metric_id
   SELECT meta.confidence_for_metric('M-COMPL-001');  -- 0.98

   -- Lookup by metric_slug (new dual-lookup)
   SELECT meta.confidence_for_metric('distribusi_kendaraan_per_segmen');  -- 0.98

   -- Full metric metadata
   SELECT * FROM meta.get_metric('total_potensi_pkb');

   -- Table status
   SELECT * FROM meta.get_table_status('gold.registry_enriched');
   -- Returns row even though table empty (metadata describes future state)

   -- Stale metrics check
   SELECT * FROM meta.list_stale_metrics(30);
   ```

5. **KB similarity search test:**
   ```sql
   -- Pick one chunk, find 3 most similar
   WITH q AS (
       SELECT embedding FROM kb.reference_docs
       WHERE source = 'L4_tribal_knowledge' LIMIT 1
   )
   SELECT source, category, LEFT(chunk_text, 80),
          embedding <-> (SELECT embedding FROM q) AS distance
   FROM kb.reference_docs
   ORDER BY distance LIMIT 3;
   ```

6. **Advisor checks:**
   ```
   mcp__supabase__get_advisors(project_id=$SUPABASE_PROJECT_REF, type="security")
   mcp__supabase__get_advisors(project_id=$SUPABASE_PROJECT_REF, type="performance")
   ```

**Success:**
- All row counts match expected.
- 5 RPCs respond correctly.
- KB similarity search returns ranked results.
- No CRITICAL advisors.

---

### Phase 8 — Generate Ingestion Report

**Goal:** Produce auditable ingestion report.

**Steps:**

1. **Collect statistics** dari all phases.
2. **Write report file** ke `pilot_starter_pack/ingestion_reports/report_<YYYYMMDD_HHMMSS>.md`.
3. **Surface summary** ke operator chat.

**Sample summary:**

```
✓ Governance + KB layer berhasil di-ingest ke Supabase.

Schemas:    gold, gold_plus, ref, kb, meta (5/5)
Tables:     11 populated (9 ref + 2 kb + 4 meta) + 2 empty (gold/gold_plus)
KB chunks:  ~118 total (40 framework + 10 paper + ~30 L3 + ~30 L4 + ~18 L6)
Cert summary: Gold 7, Silver 8, Bronze 12 (27 metrics)
RPCs:       5 functions tested ✓

Validation: ✓ All sanity checks passed
Advisors:   ⚠ 0 critical, 2 informational

Empty tables (expected): gold.registry_enriched, gold.transaksi_fact
  → Populate via separate raw data ingestion process.

Report: ingestion_reports/report_20260505_143022.md
Duration: ~3 menit total

Next steps:
  1. Run raw data ingestion (registry_enriched 427K rows) terpisah.
  2. Refresh gold_plus.* materialized views setelah raw data masuk.
  3. Configure Galen specialist agent untuk gunakan Supabase RPCs.
```

---

## 6. Acceptance Criteria

The ingestion is **ACCEPTED** when ALL ini TRUE:

### 6.1 Schema-level (8 criteria)
- [ ] **AC-S1** All 5 schemas exist: `gold`, `gold_plus`, `ref`, `kb`, `meta`.
- [ ] **AC-S2** `pgvector` extension enabled.
- [ ] **AC-S3** All migrations registered (≥2).
- [ ] **AC-S4** `meta` schema has ≥6 RPCs.
- [ ] **AC-S5** All 9 `ref.*` tables exist.
- [ ] **AC-S6** All 2 `kb.*` tables exist.
- [ ] **AC-S7** All 4 `meta.*` tables exist.
- [ ] **AC-S8** `gold.*` and `gold_plus.*` tables exist (empty OK).

### 6.2 Data-level (10 criteria)
- [ ] **AC-D1** `ref.dim_segmen` row count = 7.
- [ ] **AC-D2** `ref.treatment_rules` row count = 7.
- [ ] **AC-D3** `ref.dim_jenken` row count ≥ 25.
- [ ] **AC-D4** `meta.table_metadata` row count = 14.
- [ ] **AC-D5** `meta.metric_certification` row count = 27.
- [ ] **AC-D6** `meta.table_certification` row count = 14.
- [ ] **AC-D7** `meta.column_metadata` row count = 25.
- [ ] **AC-D8** `kb.reference_docs` row count ≥ 80 (after Phase 6).
- [ ] **AC-D9** `kb.few_shot` row count ≥ 5.
- [ ] **AC-D10** `gold.registry_enriched` row count = 0 (expected empty).

### 6.3 Validation-level (5 criteria)
- [ ] **AC-V1** Cert level distribution: gold 7, silver 8, bronze 12.
- [ ] **AC-V2** Domain distribution: compliance 8, revenue 6, swdkllj 3, treatment 3, demographic 4, operational 3.
- [ ] **AC-V3** All metric_slugs unique.
- [ ] **AC-V4** RPC smoke tests pass (5/5).
- [ ] **AC-V5** KB similarity search returns ranked results.

### 6.4 Reporting-level (3 criteria)
- [ ] **AC-R1** Ingestion report written to `ingestion_reports/`.
- [ ] **AC-R2** Operator chat summary printed dengan row counts + cert distribution.
- [ ] **AC-R3** Migration names recorded di `mcp__supabase__list_migrations`.

**Total: 26 acceptance criteria** across 4 categories.

---

## 7. Error Handling & Idempotency

### 7.1 Error categories

| Category | Example | Handling |
|---|---|---|
| Pre-flight | Missing env var | Halt, ask operator |
| DDL apply | SQL syntax | Log, halt |
| CSV load | FK violation | Log row, diagnose |
| Embedding | OpenAI rate limit | Backoff (already in embed_kb.py) |
| Validation | Row count mismatch | Surface diff, halt |
| Advisors | Critical security | Surface, ask operator |

### 7.2 Idempotency rules

- DDLs: `CREATE ... IF NOT EXISTS` — safe re-apply.
- CSV loads: detect existing rows via PK; on (R)esume, skip.
- KB embedding: use `--reset` flag or `--skip-*` selective.

### 7.3 Rollback

```sql
-- Full rollback (governance + KB only)
BEGIN;
DROP SCHEMA meta CASCADE;
DROP SCHEMA kb CASCADE;
DROP SCHEMA ref CASCADE;
-- Note: leave gold/gold_plus alone if raw data ingestion already ran
COMMIT;
```

After rollback, re-run from Phase 1.

---

## 8. Expected Row Counts (Reference)

| Schema | Table | Expected | Source |
|---|---|---|---|
| ref | dim_kabupaten | ~30 | seed CSV |
| ref | dim_upt | ~5 | seed CSV |
| ref | dim_jenken | ~30 | seed CSV |
| ref | dim_layanan | ~5 | seed CSV |
| ref | dim_segmen | 7 | seed CSV |
| ref | treatment_rules | 7 | seed CSV |
| ref | program_sadar | ~5 | seed CSV |
| ref | raci_matrix | ~10 | seed CSV |
| ref | revenue_scenario | ~5 | seed CSV |
| kb | reference_docs | ~118 (40+10+30+30+18) | embedded |
| kb | few_shot | ~5-15 | embedded |
| meta | table_metadata | 14 | seed CSV |
| meta | metric_certification | 27 | seed CSV |
| meta | table_certification | 14 | seed CSV |
| meta | column_metadata | 25 | seed CSV |
| gold | registry_enriched | **0 (placeholder)** | NOT ingested by this PRD |
| gold | transaksi_fact | **0 (placeholder)** | NOT ingested by this PRD |
| gold_plus | * | **0 (placeholder)** | refreshed after raw data |

**Total rows ingested by this PRD:** ~280 + ~125 KB chunks = **~405 records + embeddings**.

---

## 9. Operator Runbook (TL;DR)

```bash
# 1. Set env vars (one-time)
export SUPABASE_PROJECT_REF=...
export SUPABASE_DB_HOST=...
export SUPABASE_DB_USER=...
export SUPABASE_DB_PASSWORD=...
export OPENAI_API_KEY=...

# 2. cd to pilot folder
cd /path/to/pilot_starter_pack

# 3. Start Claude Code
claude

# 4. Prompt:
#    "Baca PRD_supabase_ingestion_via_claude_code.md. Jalankan semua 8 fase
#     ingestion governance + KB layer ke Supabase. Note: raw data ingestion
#     OUT OF SCOPE — gold/gold_plus tables boleh empty."

# 5. Approve cost confirmations as prompted

# 6. Review final report at ingestion_reports/report_*.md
```

---

## 10. Sample Claude Code Prompts

### 10.1 Full ingestion (cold start)
```
Baca PRD_supabase_ingestion_via_claude_code.md.

Jalankan governance + KB layer ingestion ke Supabase project ku.
Skip raw data ingestion — gold/gold_plus tables boleh empty.
Verbose log setiap step. Stop untuk konfirmasi cost atau CRITICAL error.
```

### 10.2 KB-only refresh
```
Truncate dan re-embed semua kb.reference_docs (Phase 5 + 6).
Tidak usah ubah ref/meta. Report kalau selesai.
```

### 10.3 Metadata-only update
```
Reload meta.metric_certification dan meta.table_metadata dari CSV terbaru.
Truncate dulu, lalu reload (Phase 4 saja). Verify row count + cert distribution.
```

### 10.4 Sanity check (read-only)
```
Jangan ubah apa-apa. Cek health Supabase:
- Schema status, RPC availability, row counts
- KB embedding distribution
- Cert level distribution
Hasilkan laporan health.
```

---

## 11. Risk & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Wrong project (apply to prod) | Low | High | Phase 1 prompts confirm project ref |
| OpenAI key expired | Medium | Medium | Phase 1 validates with test call |
| Migration apply fails halfway | Low | High | DDL idempotent, can re-run |
| Cost overrun (OpenAI embedding) | Very Low | Low | Estimated ~$0.03; flag if >100K tokens |
| FK violation di metadata CSV | Low | Medium | Phase 4 strict order |
| Slug collision di metric_certification | Very Low | Medium | UNIQUE constraint catches it |

---

## 12. Out-of-Scope (Future Work)

**Within this pilot:**
- ❌ Raw data ingestion (`gold.registry_enriched` 427K rows) — separate PRD/process.
- ❌ Materialized view refresh (`gold_plus.*`) — depends on raw data.
- ❌ `kb.learning_memory` table — L5 stays as JSONL on disk for pilot.

**Beyond pilot:**
- Galen agent prompt deployment.
- Edge functions deployment (per `PRD_jr_pilot_tool.md`).
- RLS multi-tenant.
- Scheduled refresh cron.
- Multi-region replication.

---

## 13. References

- Pilot tool PRD (Streamlit): `PRD_jr_pilot_tool.md`
- Schema docs: `context_model/L1_schema_metadata.md`
- Metric definitions: `context_model/L2_curated_definitions.yaml`
- Lineage: `context_model/L3_formula_lineage.md/.json`
- Tribal knowledge: `context_model/L4_tribal_knowledge.md`
- Golden queries: `context_model/L6_golden_queries.sql`
- Metric certification: `metadata/metric_certification.md`
- Table certification: `metadata/table_certification.md`
- Existing helper: `embed_kb.py`

---

## 14. Sign-off

| Role | Name | Date |
|---|---|---|
| Pilot Lead (Author) | _____ | 2026-05-05 |
| Data Engineering Reviewer | _____ | _____ |
| Compliance Review (governance metadata) | _____ | _____ |

**Approval gate:** PRD ini harus di-acknowledge sebelum Claude Code proceed dengan Phase 2 (DDL apply).

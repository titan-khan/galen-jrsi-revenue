# Context Model — Galen Specialist Agent

**Project:** JR PKB Pilot — Palangka Raya, Kalimantan Tengah
**Framework:** PKB Micro Segmentation v1.4 (Saptono & Khozen, 2021)
**Reference date:** 2025-05-01
**Last updated:** 2026-05-05

---

## What This Is

Context Model adalah **6-layer knowledge system** yang Galen agent pakai sebagai foundation untuk menjawab pertanyaan tentang JR PKB pilot. Inspired by OpenAI's internal data agent architecture (Galen Technical Design Document Section 3.2).

Tiap layer punya peran berbeda:

```
┌───────────────────────────────────────────────────────────────┐
│  L6 — Golden Queries           Verified SQL library          │
│  L5 — Learning Memory          Live interaction journal      │
│  L4 — Tribal Knowledge         Why decisions were made       │
│  L3 — Formula Lineage          Provenance DAG                │
│  L2 — Curated Definitions      Metric & rule definitions     │
│  L1 — Schema Metadata          Table & column inventory      │
└───────────────────────────────────────────────────────────────┘
```

The lower layers (L1, L2) are **stable, factual**. The middle layers (L3, L4) are **curated, governance-driven**. The upper layers (L5, L6) are **dynamic, growing**.

---

## File Inventory

| Layer | File(s) | Format | Purpose |
|---|---|---|---|
| L1 | `L1_schema_metadata.md` | Markdown | All tables, columns, PK/FK, row counts |
| L2 | `L2_curated_definitions.yaml` | YAML | Metrics, formulas, classification rules |
| L3 | `L3_formula_lineage.md` + `.json` | Markdown + JSON | Upstream→downstream DAG |
| L4 | `L4_tribal_knowledge.md` | Markdown | Tribal knowledge, anti-patterns, caveats |
| L5 | `L5_learning_memory.md` + `.jsonl` | Markdown + JSONL | Live learning journal |
| L6 | `L6_golden_queries.md` + `.sql` | Markdown + SQL | Verified query library |

---

## Quick Start: How Galen Loads Each Layer

### Layer ingestion order (at agent startup)

```
1. L1 (schema_metadata.md)        → System prompt context (always-on)
2. L2 (curated_definitions.yaml)  → System prompt context (always-on)
3. L3 (formula_lineage.json)      → Embedded into RAG store + on-demand traversal
4. L4 (tribal_knowledge.md)       → Chunked + embedded → semantic retrieval per query
5. L5 (learning_memory.jsonl)     → Embedded → top-K similar past queries
6. L6 (golden_queries.sql)        → Indexed by intent → first-line query response
```

### Runtime per-query flow

```
User query
    │
    ▼
[1] Intent classification ──→ match L6 golden query?
    │                          ├─ YES → execute, return with trust badge
    │                          └─ NO  → continue
    ▼
[2] Retrieve relevant L4 entries (top 5 by tag + semantic match)
    │
    ▼
[3] Retrieve relevant L5 past interactions (top 3 similar queries)
    │
    ▼
[4] Construct answer using L1 (schema) + L2 (metrics) + retrieved context
    │
    ▼
[5] Validate against L4 anti-patterns
    │
    ▼
[6] Use L3 to explain provenance if user asks "kenapa angkanya segini?"
    │
    ▼
[7] Log interaction to L5 (event_type based on outcome)
```

---

## How to Build the Context Model from Scratch

If you onboard a new pilot or new region, repeat this process:

### Step 1 — Build L1 (Schema Metadata)
- Inventory all tables in your Supabase schemas (gold, gold_plus, ref, kb, public).
- For each table: name, columns, types, PK/FK, row count, distribution stats (NULL%, top values).
- Use `pg_catalog` introspection + manual annotation untuk business meaning.

### Step 2 — Build L2 (Curated Definitions)
- For each business metric, document: formula, unit, validation range, source.
- Codify classification rules (e.g., 7-segmen logic) sebagai YAML.
- Include decision rules (e.g., "if amnesti_eligible AND has_phone → kanal=WA").

### Step 3 — Build L3 (Formula Lineage)
- Trace setiap derived column atau metric kembali ke raw source.
- Build DAG dengan node + edges. Validate no cycles.
- Document edge cases (NULL handling, division by zero).

### Step 4 — Curate L4 (Tribal Knowledge)
- Workshop dengan domain expert: capture rules of thumb yang tidak ada di code.
- Categorize: SEGMEN, TREATMENT, DATA, REGULASI, OPS, METRIC, PILOT.
- Document anti-patterns (apa yang JANGAN dilakukan).

### Step 5 — Bootstrap L5 (Learning Memory)
- Seed dengan 5-10 hypothetical or historical interactions.
- Tag dengan event_type yang sesuai.
- Establish review workflow (weekly review cadence).

### Step 6 — Compile L6 (Golden Queries)
- Identify top 15-20 user intents.
- Write + verify SQL untuk each.
- Tag dengan trust level (VERIFIED / REVIEWED / DRAFT).
- Test against actual data, manual validate result.

### Step 7 — Master ingestion
- Embed L3.json, L4.md, L5.jsonl, L6.sql ke Supabase pgvector via `embed_kb.py`.
- Configure Galen agent dengan system prompt yang loads L1 + L2 always.
- Set up retrieval RPC yang search L3+L4+L5+L6 per query.

---

## Maintenance Cadence

| Layer | Review frequency | Trigger for update |
|---|---|---|
| L1 | Per schema change | Migration deployed |
| L2 | Per framework revision | Framework v1.5+ |
| L3 | Per derived column change | New metric added |
| L4 | Bi-weekly during pilot | New tribal rule learned |
| L5 | Weekly | Append-only log review |
| L6 | Bi-weekly | New verified query, retire deprecated |

---

## Validation Checklist

Before declaring "Galen-ready":

- [ ] All tables in L1 have row count + at least 3 sample columns documented.
- [ ] All L2 metrics have formula + unit + governance source.
- [ ] L3 DAG validates: no cycles, all metrics traceable to raw.
- [ ] L4 has minimum 20 entries spanning all 7 categories.
- [ ] L5 has minimum 5 seed entries with diverse event_types.
- [ ] L6 has minimum 15 verified queries across all 7 categories.
- [ ] Master `embed_kb.py` script can ingest all layers without error.
- [ ] Galen agent passes 5 sample user queries (e.g., "berapa K1?", "apakah amnesti otomatis?", "kenapa angkanya begitu?").

---

## Integration with Pilot Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ DATA INGESTION (one-shot)                                       │
│   3 input files (Dictionary + Transaksi + Palangka_Raya.xlsx)  │
│         ▼                                                        │
│   Streamlit upload → Python loader → pre-computed CSVs         │
│         ▼                                                        │
│   Supabase ingestion (CSVs into gold/gold_plus/ref schemas)    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ CONTEXT MODEL (this directory)                                  │
│   L1 (schema)  + L2 (metrics) ←  static, curated                │
│   L3 (lineage) + L4 (tribal)  ←  governance-driven              │
│   L5 (memory)  + L6 (queries) ←  growing, learning              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ GALEN SPECIALIST AGENT                                          │
│   System prompt: L1+L2 inlined                                  │
│   RAG retrieval: L3+L4+L5+L6 via pgvector                      │
│   PostgREST RPC: read-only SQL execution                       │
│   Output: chat answer + (optional) chart + provenance trace    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                       User (Pilot Lead, Field Officers)
```

---

## Linkage to Other Pilot Artifacts

| Context Model file | Linked to |
|---|---|
| `L1_schema_metadata.md` | `supabase_setup_full.sql`, `csv_for_supabase/` |
| `L2_curated_definitions.yaml` | `treatment_v1.4.yaml`, `11_load_pilot.py` |
| `L3_formula_lineage.json` | `11_load_pilot.py` (classification function) |
| `L4_tribal_knowledge.md` | `kb_chunks_to_embed.jsonl` (some entries cross-listed) |
| `L5_learning_memory.jsonl` | Galen agent runtime logs |
| `L6_golden_queries.sql` | Galen RPC call layer |

---

## Embedding Recipe (for RAG)

Use `../embed_kb.py` to embed L3, L4, L5, L6 into `kb.reference_docs` and `kb.few_shot`:

```bash
# Embed everything
python ../embed_kb.py --reset

# Verify
psql $SUPABASE_DB_URL -c "SELECT source, COUNT(*) FROM kb.reference_docs GROUP BY source"
```

Recommended chunk strategy:
- L3 JSON: 1 node = 1 chunk
- L4 MD: 1 entry = 1 chunk (~200 tokens)
- L5 JSONL: 1 event = 1 chunk
- L6 SQL: 1 query (with description) = 1 chunk

---

## FAQ

**Q: Apakah saya perlu populate semua 6 layer sebelum start pilot?**
A: L1, L2, L6 wajib (foundation). L3, L4 strongly recommended (akurasi). L5 bisa start kosong + grow organic.

**Q: Bagaimana kalau framework v1.4 berubah?**
A: Update L2 (rules), L3 (lineage), L4 (rationale), L6 (queries jika filter berubah). L1 unchanged unless schema change.

**Q: Bagaimana cara verify Galen actually using the context?**
A: Tambahkan logging di Galen prompt untuk surface "I used L4-SEGMEN-001 because..." di every answer. Audit weekly.

**Q: Bisa pilot expand ke daerah lain pakai context model ini?**
A: Pakai sebagai template. L1 (schema same), L2 (re-validate distribution), L3 (mostly same), L4 (re-curate per-daerah), L5 (start fresh), L6 (re-verify SQL).

**Q: Apa yang membedakan L4 dengan L5?**
A: L4 = curated, stable (revisi bi-weekly). L5 = live, append-only (revisi setiap session). Pattern di L5 yang recurring → promote ke L4.

---

## Roadmap (Post-Pilot)

When pilot graduates to production:

1. **L0 — Source schema** (raw Bronze tables, currently skipped in pilot).
2. **L7 — Decision logs** (audit trail of high-stakes recommendations).
3. **L1-L6 versioning** — git-tracked, with semantic version bumps per framework revision.
4. **Multi-pilot federation** — L1-L6 per region, with shared L4 patterns.
5. **Auto-promotion pipeline** — L5 events → L4 candidates → human review → L4 commit.

---

## Acknowledgments

This 6-layer model is inspired by:
- OpenAI's Galen Technical Design Document (Section 3.2 Six-Layer Context Model).
- Saptono & Khozen (2021) — CRM framework foundation.
- Pilot operational discussions with JR team — practical knowledge that filled L4.

Built untuk JR PKB Pilot Palangka Raya, May 2026.

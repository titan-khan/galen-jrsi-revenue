# Metadata CSV Seed Files — JR PKB Pilot

**Last updated:** 2026-05-05
**Target schema:** `meta` (Supabase governance layer)
**Run order required:** Yes (FK dependencies)

---

## Files in This Directory

| Order | File | Target Table | Rows | Purpose |
|---|---|---|---|---|
| 1 | `01_table_metadata.csv` | `meta.table_metadata` | 14 | Inventory of all tables consumed by Galen |
| 2 | `02_metric_certification.csv` | `meta.metric_certification` | 27 | Defined metrics with certification level |
| 3 | `03_table_certification.csv` | `meta.table_certification` | 14 | Certification record per table (Bronze/Silver/Gold) |
| 4 | `04_column_metadata.csv` | `meta.column_metadata` | 25 | Column-level metadata sample |

---

## Prerequisites

Before importing CSVs:

1. Run `supabase_setup_full.sql` to create gold/gold_plus/ref/kb schemas.
2. Run `metadata/supabase_metadata_ddl.sql` to create the `meta` schema.
3. Verify schema exists:
   ```sql
   SELECT * FROM information_schema.schemata WHERE schema_name = 'meta';
   ```

---

## Import Methods

### Method 1: Supabase Studio UI (recommended for pilot)

1. Login Supabase Studio.
2. Go to **Table Editor** → select `meta` schema.
3. For each table:
   - Click on table name.
   - Click "Insert" dropdown → "Import data from CSV".
   - Upload the corresponding CSV file.
   - Map columns (auto-detect biasanya benar).
   - Click "Import".
4. Verify row count matches expected.

### Method 2: psql COPY (faster for large datasets)

```bash
# Set connection string from Supabase Studio → Settings → Database
export SUPABASE_DB_URL="postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres"

# Import in dependency order
psql $SUPABASE_DB_URL -c "\\COPY meta.table_metadata FROM '01_table_metadata.csv' CSV HEADER"
psql $SUPABASE_DB_URL -c "\\COPY meta.metric_certification FROM '02_metric_certification.csv' CSV HEADER"
psql $SUPABASE_DB_URL -c "\\COPY meta.table_certification FROM '03_table_certification.csv' CSV HEADER"
psql $SUPABASE_DB_URL -c "\\COPY meta.column_metadata FROM '04_column_metadata.csv' CSV HEADER"
```

### Method 3: Python script (for automation/CI)

```python
import psycopg2
import csv

conn = psycopg2.connect(SUPABASE_DB_URL)
cur = conn.cursor()

for filename, table in [
    ("01_table_metadata.csv", "meta.table_metadata"),
    ("02_metric_certification.csv", "meta.metric_certification"),
    ("03_table_certification.csv", "meta.table_certification"),
    ("04_column_metadata.csv", "meta.column_metadata"),
]:
    with open(filename) as f:
        cur.copy_expert(
            f"COPY {table} FROM STDIN WITH CSV HEADER",
            f
        )
    conn.commit()
    print(f"Imported {table}")

conn.close()
```

---

## Column Notes

### Array columns

CSVs encode array columns as PostgreSQL array literals: `{val1,val2,val3}`.

Example in CSV:
```
primary_key_columns
{nopol}

source_tables
{gold.registry_enriched,ref.dim_jenken}
```

These map to `TEXT[]` in PostgreSQL.

### JSONB columns

CSVs encode JSONB as standard JSON strings:
```
foreign_keys
[{"column":"kode_jenken","references_table":"ref.dim_jenken","references_column":"kode_jenken"}]
```

PostgreSQL parses this on import (column declared as `JSONB`).

### Boolean columns

Use `TRUE`/`FALSE` (uppercase) for clarity. PostgreSQL also accepts `t`/`f`, `1`/`0`.

### Date columns

ISO format: `YYYY-MM-DD` (e.g., `2026-05-05`).

---

## Validation After Import

```sql
-- 1. Row counts
SELECT 'table_metadata' AS table_name, COUNT(*) FROM meta.table_metadata
UNION ALL SELECT 'metric_certification', COUNT(*) FROM meta.metric_certification
UNION ALL SELECT 'table_certification', COUNT(*) FROM meta.table_certification
UNION ALL SELECT 'column_metadata', COUNT(*) FROM meta.column_metadata;

-- Expected: 14, 27, 14, 25

-- 2. Cert level distribution
SELECT certification_level, COUNT(*) FROM meta.metric_certification
GROUP BY certification_level;
-- Expected: gold 7, silver 8, bronze 12

-- 3. Test RPC functions (lookup by metric_id OR metric_slug)
SELECT * FROM meta.list_gold_metrics() LIMIT 5;
SELECT meta.confidence_for_metric('M-COMPL-001');                   -- 0.98 (by ID)
SELECT meta.confidence_for_metric('distribusi_kendaraan_per_segmen'); -- 0.98 (by slug)
SELECT * FROM meta.get_metric('total_potensi_pkb');                 -- full metadata
SELECT * FROM meta.get_table_status('gold.registry_enriched');

-- 4. Cross-reference integrity
SELECT mc.metric_id
FROM meta.metric_certification mc
WHERE NOT EXISTS (
    SELECT 1 FROM meta.table_metadata tm
    WHERE tm.table_id = ANY(mc.source_tables)
);
-- Expected: 0 rows (or specific known issues)
```

---

## Re-import / Reset

If you need to wipe and reload:

```sql
-- Order matters (FK dependencies)
TRUNCATE meta.column_metadata CASCADE;
TRUNCATE meta.table_certification CASCADE;
TRUNCATE meta.metric_certification CASCADE;
TRUNCATE meta.table_metadata CASCADE;
```

Then re-run import.

---

## Maintenance Workflow

### Adding a new metric
1. Define in `02_metric_certification.csv` (or insert directly via SQL).
2. Update `metric_certification.md` document.
3. Update `L2_curated_definitions.yaml` if Galen-facing.

### Promoting cert level (Bronze → Silver)
1. Update `certification_level` column.
2. Set `last_validated_at` to today.
3. Add `validation_evidence` link.
4. Update `meta.table_certification` with new cert_id record.

### Deprecating a metric
1. Set `deprecated = TRUE`.
2. Set `deprecated_reason`.
3. If replaced, set `superseded_by` to new metric_id.
4. Do NOT delete (audit trail).

---

## Integration with Galen

After import, Galen can:

1. **Surface confidence per metric:**
   ```sql
   SELECT meta.confidence_for_metric('M-REV-001');
   -- Returns 0.80
   ```

2. **Filter to Gold-certified only:**
   ```sql
   SELECT * FROM meta.list_gold_metrics();
   ```

3. **Check freshness:**
   ```sql
   SELECT * FROM meta.list_stale_metrics(30);
   ```

4. **Get table cert status:**
   ```sql
   SELECT * FROM meta.get_table_status('gold.registry_enriched');
   ```

---

## Linkage to Context Model

| Metadata file | Context Model layer |
|---|---|
| `01_table_metadata.csv` | L1 Schema Metadata (operational view) |
| `02_metric_certification.csv` | L2 Curated Definitions (governance view) |
| `03_table_certification.csv` | L1 + L4 (data quality + tribal knowledge) |
| `04_column_metadata.csv` | L1 (column-level granularity) |

---

## Related Documents

- `metadata/table_certification.md` — Certification process narrative
- `metadata/metric_certification.md` — Per-metric definitions narrative
- `metadata/supabase_metadata_ddl.sql` — DDL for `meta` schema
- `context_model/L1_schema_metadata.md` — Schema inventory
- `context_model/L2_curated_definitions.yaml` — Metric formal definitions

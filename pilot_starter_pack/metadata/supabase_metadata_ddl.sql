-- =============================================================================
-- META SCHEMA DDL — JR PKB Pilot Palangka Raya
-- =============================================================================
-- Schema: meta
-- Purpose: Data governance layer — metadata, table certification, metric
--          certification. Galen specialist queries these tables to surface
--          trust badges, ownership, freshness, and validation status.
--
-- Run order:
--   1. supabase_setup_full.sql   (creates gold, gold_plus, ref, kb schemas)
--   2. supabase_metadata_ddl.sql (THIS FILE — creates meta schema)
--   3. CSV imports per metadata/csv_for_supabase/
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS meta;
COMMENT ON SCHEMA meta IS 'Data governance: metadata, table certification, metric certification';


-- =============================================================================
-- 1) meta.table_metadata
-- =============================================================================
-- Inventory of every physical/logical table that Galen consumes. Includes
-- ownership, freshness SLA, source system, and lineage pointers.

CREATE TABLE IF NOT EXISTS meta.table_metadata (
    table_id              TEXT PRIMARY KEY,                  -- e.g., 'gold.registry_enriched'
    schema_name           TEXT NOT NULL,                     -- gold | gold_plus | ref | kb | meta
    table_name            TEXT NOT NULL,
    table_type            TEXT NOT NULL,                     -- fact | dimension | reference | knowledge_base | view | materialized_view
    description           TEXT NOT NULL,
    business_domain       TEXT NOT NULL,                     -- compliance | revenue | swdkllj | treatment | reference | knowledge_base
    grain                 TEXT NOT NULL,                     -- e.g., '1 row = 1 kendaraan', '1 row = 1 transaksi'
    primary_key_columns   TEXT[] NOT NULL,
    foreign_keys          JSONB,                             -- [{column, references_table, references_column}, ...]
    row_count_estimated   BIGINT,                            -- snapshot at certification time
    refresh_cadence       TEXT NOT NULL,                     -- one_shot | daily | weekly | monthly | event_driven
    source_system         TEXT NOT NULL,                     -- xlsx_upload | derived_python | seed_yaml
    upstream_tables       TEXT[],                            -- list of table_ids that feed this table
    downstream_consumers  TEXT[],                            -- list of metric_ids or table_ids that consume this
    owner_team            TEXT NOT NULL,
    owner_contact         TEXT,
    sensitivity_level     TEXT NOT NULL DEFAULT 'internal',  -- public | internal | restricted | pii
    pii_columns           TEXT[],                            -- columns containing personally identifiable info
    retention_policy      TEXT,                              -- e.g., 'pilot_only', '7_years', 'indefinite'
    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_table_metadata_schema   ON meta.table_metadata (schema_name);
CREATE INDEX IF NOT EXISTS idx_table_metadata_domain   ON meta.table_metadata (business_domain);
CREATE INDEX IF NOT EXISTS idx_table_metadata_owner    ON meta.table_metadata (owner_team);

COMMENT ON TABLE meta.table_metadata IS 'Inventory of all tables consumed by Galen with ownership, lineage, and SLA';


-- =============================================================================
-- 2) meta.table_certification
-- =============================================================================
-- Certification status per table. Galen surfaces "this answer comes from a
-- Gold-certified table" badges. Auditors can query certification history.

CREATE TABLE IF NOT EXISTS meta.table_certification (
    cert_id               TEXT PRIMARY KEY,                  -- e.g., 'CERT-TBL-2026-001'
    table_id              TEXT NOT NULL REFERENCES meta.table_metadata(table_id),
    certification_level   TEXT NOT NULL,                     -- bronze | silver | gold
    certified_at          DATE NOT NULL,
    certified_by          TEXT NOT NULL,                     -- person/role
    valid_until           DATE,                              -- NULL = perpetual until next change
    schema_validated      BOOLEAN NOT NULL DEFAULT FALSE,    -- columns match L1 inventory
    pk_validated          BOOLEAN NOT NULL DEFAULT FALSE,    -- PK uniqueness verified
    fk_validated          BOOLEAN NOT NULL DEFAULT FALSE,    -- FK integrity verified
    null_check_passed     BOOLEAN NOT NULL DEFAULT FALSE,    -- required columns no NULL
    range_check_passed    BOOLEAN NOT NULL DEFAULT FALSE,    -- numeric/date in expected range
    distribution_check    BOOLEAN NOT NULL DEFAULT FALSE,    -- distribution matches reference (e.g., framework v1.4)
    freshness_check       BOOLEAN NOT NULL DEFAULT FALSE,    -- data within refresh SLA
    pii_redacted          BOOLEAN NOT NULL DEFAULT FALSE,    -- PII columns properly handled
    documented            BOOLEAN NOT NULL DEFAULT FALSE,    -- has L1 entry
    sample_validated      BOOLEAN NOT NULL DEFAULT FALSE,    -- spot-check sample rows manually
    issues_found          JSONB,                             -- [{type, severity, description, mitigation}]
    evidence_link         TEXT,                              -- pointer to test report, notebook, screenshot
    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_table_cert_table_id ON meta.table_certification (table_id);
CREATE INDEX IF NOT EXISTS idx_table_cert_level    ON meta.table_certification (certification_level);
CREATE INDEX IF NOT EXISTS idx_table_cert_date     ON meta.table_certification (certified_at DESC);

COMMENT ON TABLE meta.table_certification IS 'Per-table certification record (Bronze/Silver/Gold) with audit trail';


-- =============================================================================
-- 3) meta.metric_certification
-- =============================================================================
-- Certification status per metric. Foundation for Galen's confidence scoring.

CREATE TABLE IF NOT EXISTS meta.metric_certification (
    metric_id              TEXT PRIMARY KEY,                 -- e.g., 'M-COMPL-001'
    metric_name            TEXT NOT NULL,                    -- friendly display: "Distribusi Kendaraan per Segmen"
    metric_slug            TEXT NOT NULL UNIQUE,             -- snake_case code reference: "distribusi_kendaraan_per_segmen"
    business_domain        TEXT NOT NULL,                    -- compliance | revenue | swdkllj | treatment | demographic | operational
    metric_type            TEXT NOT NULL,                    -- count | percentage | ratio | currency | duration | composite
    formula                TEXT NOT NULL,                    -- SQL or Python expression
    formula_language       TEXT NOT NULL DEFAULT 'sql',      -- sql | python | hybrid
    unit                   TEXT,                             -- IDR | days | %  | count | etc
    granularity            TEXT NOT NULL,                    -- per_segmen | per_kendaraan | overall | per_wilayah
    source_tables          TEXT[] NOT NULL,                  -- references meta.table_metadata.table_id
    source_columns         TEXT[] NOT NULL,                  -- raw columns this metric depends on
    upstream_metrics       TEXT[],                           -- other metric_ids this depends on
    governance_source      TEXT NOT NULL,                    -- framework_v1.4 | business_assumption | derived_runtime | regulatory
    governance_reference   TEXT,                             -- e.g., 'PKB Micro Segmentation v1.4 Sheet 2'
    valid_range_min        NUMERIC,                          -- expected min value (sanity check)
    valid_range_max        NUMERIC,                          -- expected max value
    null_handling          TEXT,                             -- e.g., 'exclude', 'treat_as_zero', 'propagate'
    edge_cases             TEXT[],                           -- known edge cases / quirks
    certification_level    TEXT NOT NULL,                    -- bronze | silver | gold
    certified_at           DATE NOT NULL,
    certified_by           TEXT NOT NULL,
    last_validated_at      DATE,
    validation_method      TEXT,                             -- e.g., 'manual_spot_check', 'cross_reference_xlsx'
    validation_evidence    TEXT,                             -- pointer / notebook / file
    confidence_score       NUMERIC(3,2),                     -- 0.00 - 1.00
    review_cadence         TEXT NOT NULL DEFAULT 'monthly',  -- weekly | monthly | quarterly | on_change
    owner_team             TEXT NOT NULL,
    owner_contact          TEXT,
    deprecated             BOOLEAN NOT NULL DEFAULT FALSE,
    deprecated_reason      TEXT,
    superseded_by          TEXT,                             -- metric_id that replaces this one
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metric_cert_domain ON meta.metric_certification (business_domain);
CREATE INDEX IF NOT EXISTS idx_metric_cert_level  ON meta.metric_certification (certification_level);
CREATE INDEX IF NOT EXISTS idx_metric_cert_active ON meta.metric_certification (deprecated) WHERE deprecated = FALSE;
CREATE INDEX IF NOT EXISTS idx_metric_cert_slug   ON meta.metric_certification (metric_slug);

COMMENT ON TABLE meta.metric_certification IS 'Per-metric certification (Bronze/Silver/Gold) — Galen confidence foundation';


-- =============================================================================
-- 4) meta.column_metadata (optional, granular column-level metadata)
-- =============================================================================
CREATE TABLE IF NOT EXISTS meta.column_metadata (
    column_id          TEXT PRIMARY KEY,                     -- e.g., 'gold.registry_enriched.segmen_kepatuhan'
    table_id           TEXT NOT NULL REFERENCES meta.table_metadata(table_id),
    column_name        TEXT NOT NULL,
    data_type          TEXT NOT NULL,
    is_pk              BOOLEAN NOT NULL DEFAULT FALSE,
    is_fk              BOOLEAN NOT NULL DEFAULT FALSE,
    fk_references      TEXT,                                 -- target_table.target_column
    is_nullable        BOOLEAN NOT NULL DEFAULT TRUE,
    description        TEXT NOT NULL,
    business_meaning   TEXT,                                 -- semantic meaning beyond technical type
    valid_values       TEXT[],                               -- enum-like constraints
    sample_values      TEXT[],                               -- 3-5 example values
    pct_null           NUMERIC(5,2),                         -- observed NULL %
    cardinality        BIGINT,                               -- distinct count
    sensitivity_level  TEXT NOT NULL DEFAULT 'internal',
    derivation_source  TEXT,                                 -- 'raw' or formula if derived
    last_profiled_at   DATE,
    notes              TEXT
);

CREATE INDEX IF NOT EXISTS idx_column_metadata_table ON meta.column_metadata (table_id);


-- =============================================================================
-- 5) RPC functions for Galen
-- =============================================================================

-- Get metric definition + certification by metric_id OR metric_slug
CREATE OR REPLACE FUNCTION meta.get_metric(p_lookup TEXT)
RETURNS TABLE (
    metric_id TEXT,
    metric_name TEXT,
    metric_slug TEXT,
    business_domain TEXT,
    formula TEXT,
    unit TEXT,
    certification_level TEXT,
    confidence_score NUMERIC,
    governance_source TEXT,
    deprecated BOOLEAN
) LANGUAGE sql STABLE AS $$
    SELECT metric_id, metric_name, metric_slug, business_domain, formula, unit,
           certification_level, confidence_score, governance_source, deprecated
    FROM meta.metric_certification
    WHERE metric_id = p_lookup OR metric_slug = p_lookup;
$$;

-- Get table metadata + latest certification
CREATE OR REPLACE FUNCTION meta.get_table_status(p_table_id TEXT)
RETURNS TABLE (
    table_id TEXT,
    description TEXT,
    grain TEXT,
    refresh_cadence TEXT,
    row_count_estimated BIGINT,
    certification_level TEXT,
    certified_at DATE,
    certified_by TEXT
) LANGUAGE sql STABLE AS $$
    SELECT
        tm.table_id,
        tm.description,
        tm.grain,
        tm.refresh_cadence,
        tm.row_count_estimated,
        tc.certification_level,
        tc.certified_at,
        tc.certified_by
    FROM meta.table_metadata tm
    LEFT JOIN LATERAL (
        SELECT certification_level, certified_at, certified_by
        FROM meta.table_certification
        WHERE table_id = tm.table_id
        ORDER BY certified_at DESC
        LIMIT 1
    ) tc ON TRUE
    WHERE tm.table_id = p_table_id;
$$;

-- List all gold-certified metrics (Galen's most trusted)
CREATE OR REPLACE FUNCTION meta.list_gold_metrics()
RETURNS TABLE (
    metric_id TEXT,
    metric_name TEXT,
    metric_slug TEXT,
    business_domain TEXT,
    formula TEXT,
    unit TEXT
) LANGUAGE sql STABLE AS $$
    SELECT metric_id, metric_name, metric_slug, business_domain, formula, unit
    FROM meta.metric_certification
    WHERE certification_level = 'gold' AND deprecated = FALSE
    ORDER BY business_domain, metric_id;
$$;

-- Confidence score lookup (used in chat preamble: "I'm 90% confident...")
-- Accepts metric_id OR metric_slug
CREATE OR REPLACE FUNCTION meta.confidence_for_metric(p_lookup TEXT)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
    SELECT confidence_score FROM meta.metric_certification
    WHERE metric_id = p_lookup OR metric_slug = p_lookup;
$$;

-- Audit: list all metrics that haven't been validated in 30+ days
CREATE OR REPLACE FUNCTION meta.list_stale_metrics(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    metric_id TEXT,
    metric_name TEXT,
    last_validated_at DATE,
    days_since_validation INTEGER
) LANGUAGE sql STABLE AS $$
    SELECT
        metric_id,
        metric_name,
        last_validated_at,
        (CURRENT_DATE - last_validated_at)::INTEGER AS days_since_validation
    FROM meta.metric_certification
    WHERE deprecated = FALSE
      AND (last_validated_at IS NULL OR last_validated_at < CURRENT_DATE - p_days)
    ORDER BY last_validated_at ASC NULLS FIRST;
$$;


-- =============================================================================
-- 6) Trigger to auto-update updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION meta.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_table_metadata_touch ON meta.table_metadata;
CREATE TRIGGER trg_table_metadata_touch
    BEFORE UPDATE ON meta.table_metadata
    FOR EACH ROW EXECUTE FUNCTION meta.touch_updated_at();

DROP TRIGGER IF EXISTS trg_metric_cert_touch ON meta.metric_certification;
CREATE TRIGGER trg_metric_cert_touch
    BEFORE UPDATE ON meta.metric_certification
    FOR EACH ROW EXECUTE FUNCTION meta.touch_updated_at();


-- =============================================================================
-- 7) Read-only role for Galen
-- =============================================================================
-- Galen specialist agent uses anon/service role. For pilot, public read OK.
-- For production, create dedicated role:
--   CREATE ROLE galen_reader;
--   GRANT USAGE ON SCHEMA meta TO galen_reader;
--   GRANT SELECT ON ALL TABLES IN SCHEMA meta TO galen_reader;

-- For pilot — allow anon read:
GRANT USAGE ON SCHEMA meta TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA meta TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA meta TO anon, authenticated;


-- =============================================================================
-- DONE
-- =============================================================================
-- Next step: Load CSV seed data
--   COPY meta.table_metadata FROM '/path/01_table_metadata.csv' CSV HEADER;
--   COPY meta.metric_certification FROM '/path/02_metric_certification.csv' CSV HEADER;
--   COPY meta.table_certification FROM '/path/03_table_certification.csv' CSV HEADER;
--   COPY meta.column_metadata FROM '/path/04_column_metadata.csv' CSV HEADER;

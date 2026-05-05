#!/usr/bin/env python3
"""Convert metadata CSVs to Postgres INSERT statements.
Output: stdout — one big multi-row INSERT per table, ready for MCP execute_sql.
"""
import csv
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

# Per-table column types. Anything not listed defaults to TEXT.
SCHEMAS = {
    "meta.table_metadata": {
        "csv": "01_table_metadata.csv",
        "types": {
            "primary_key_columns": "TEXT[]",
            "foreign_keys": "JSONB",
            "row_count_estimated": "BIGINT",
            "upstream_tables": "TEXT[]",
            "downstream_consumers": "TEXT[]",
            "pii_columns": "TEXT[]",
        },
        "conflict_key": "table_id",
    },
    "meta.metric_certification": {
        "csv": "02_metric_certification.csv",
        "types": {
            "source_tables": "TEXT[]",
            "source_columns": "TEXT[]",
            "upstream_metrics": "TEXT[]",
            "valid_range_min": "NUMERIC",
            "valid_range_max": "NUMERIC",
            "edge_cases": "TEXT[]",
            "certified_at": "DATE",
            "last_validated_at": "DATE",
            "confidence_score": "NUMERIC",
            "deprecated": "BOOLEAN",
        },
        "conflict_key": "metric_id",
    },
    "meta.table_certification": {
        "csv": "03_table_certification.csv",
        "types": {
            "certified_at": "DATE",
            "valid_until": "DATE",
            "schema_validated": "BOOLEAN",
            "pk_validated": "BOOLEAN",
            "fk_validated": "BOOLEAN",
            "null_check_passed": "BOOLEAN",
            "range_check_passed": "BOOLEAN",
            "distribution_check": "BOOLEAN",
            "freshness_check": "BOOLEAN",
            "pii_redacted": "BOOLEAN",
            "documented": "BOOLEAN",
            "sample_validated": "BOOLEAN",
            "issues_found": "JSONB",
        },
        "conflict_key": "cert_id",
    },
    "meta.column_metadata": {
        "csv": "04_column_metadata.csv",
        "types": {
            "is_pk": "BOOLEAN",
            "is_fk": "BOOLEAN",
            "is_nullable": "BOOLEAN",
            "valid_values": "TEXT[]",
            "sample_values": "TEXT[]",
            "pct_null": "NUMERIC",
            "cardinality": "BIGINT",
            "last_profiled_at": "DATE",
        },
        "conflict_key": "column_id",
    },
}


def quote_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def render_value(raw: str, col_type: str) -> str:
    if raw == "" or raw is None:
        return "NULL"
    t = col_type.upper()
    if t == "TEXT[]":
        # Postgres array literal: {val1,val2,...}
        return f"{quote_str(raw)}::TEXT[]"
    if t == "JSONB":
        return f"{quote_str(raw)}::JSONB"
    if t == "BOOLEAN":
        v = raw.strip().lower()
        if v in ("true", "t", "1", "yes"):
            return "TRUE"
        if v in ("false", "f", "0", "no"):
            return "FALSE"
        return "NULL"
    if t in ("BIGINT", "INT", "INTEGER", "NUMERIC"):
        return raw.strip()
    if t == "DATE":
        return f"{quote_str(raw)}::DATE"
    # Default TEXT
    return quote_str(raw)


def build_insert(table: str, spec: dict) -> str:
    csv_path = HERE / spec["csv"]
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        cols = reader.fieldnames
        types = spec["types"]
        rows = []
        for row in reader:
            vals = [render_value(row[c], types.get(c, "TEXT")) for c in cols]
            rows.append("(" + ", ".join(vals) + ")")
    cols_sql = ", ".join(cols)
    values_sql = ",\n".join(rows)
    update_set = ",\n  ".join(
        f"{c} = EXCLUDED.{c}" for c in cols if c != spec["conflict_key"]
    )
    return (
        f"INSERT INTO {table} ({cols_sql}) VALUES\n"
        f"{values_sql}\n"
        f"ON CONFLICT ({spec['conflict_key']}) DO UPDATE SET\n  {update_set};\n"
    )


def main() -> None:
    target = sys.argv[1] if len(sys.argv) > 1 else None
    if target and target in SCHEMAS:
        sys.stdout.write(build_insert(target, SCHEMAS[target]))
        return
    for table, spec in SCHEMAS.items():
        sys.stdout.write(f"-- {table}\n")
        sys.stdout.write(build_insert(table, spec))
        sys.stdout.write("\n")


if __name__ == "__main__":
    main()

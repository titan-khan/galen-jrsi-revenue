import type {
  ColumnMapping,
  TargetColumn,
  TargetTableDefinition,
  TargetTableName,
  ValidationResult,
} from '@/types/dataConnector';
import { TARGET_TABLES, getInsertableColumns } from '@/data/targetTableRegistry';

// ---------------------------------------------------------------------------
// 1. Auto-suggest target table
// ---------------------------------------------------------------------------

export interface TableSuggestion {
  table: TargetTableName;
  confidence: number;
}

const FILE_NAME_HINTS: Record<string, TargetTableName[]> = {
  booking: ['fact_revenue'],
  revenue: ['fact_revenue', 'fact_vehicle_revenue'],
  order: ['fact_revenue'],
  trip: ['fact_trip'],
  ticket: ['fact_ticket_sales'],
  vehicle_revenue: ['fact_vehicle_revenue'],
  nps: ['fact_nps_response_raw', 'fact_nps_response'],
  survey: ['fact_nps_response_raw'],
  driver_log: ['fact_driver_log'],
  driver: ['dim_driver', 'fact_driver_log'],
  funnel: ['fact_funnel'],
  session: ['fact_funnel'],
  station: ['dim_station'],
  route: ['dim_route'],
  customer: ['dim_customer'],
  fleet: ['dim_fleet'],
  vehicle: ['dim_vehicle', 'fact_vehicle_revenue'],
  time: ['dim_time'],
  calendar: ['dim_time'],
};

/**
 * Suggest the best target table based on filename + CSV headers.
 * Returns sorted by confidence descending.
 */
export function suggestTargetTable(
  csvHeaders: string[],
  fileName: string,
): TableSuggestion[] {
  const normalizedHeaders = csvHeaders.map((h) =>
    h.toLowerCase().replace(/[\s-]/g, '_').replace(/[^a-z0-9_]/g, ''),
  );
  const normalizedFileName = fileName.toLowerCase().replace(/\.csv$/i, '').replace(/[\s-]/g, '_');

  const scores = new Map<TargetTableName, number>();

  // Score from filename keywords
  for (const [keyword, tables] of Object.entries(FILE_NAME_HINTS)) {
    if (normalizedFileName.includes(keyword)) {
      for (const t of tables) {
        scores.set(t, (scores.get(t) ?? 0) + 0.3);
      }
    }
  }

  // Score from column-name overlap
  for (const [tableName, tableDef] of Object.entries(TARGET_TABLES)) {
    const insertable = getInsertableColumns(tableDef);
    const targetColNames = new Set(insertable.map((c) => c.name));
    let matchCount = 0;
    for (const header of normalizedHeaders) {
      if (targetColNames.has(header)) matchCount++;
    }
    if (insertable.length > 0) {
      const overlapScore = matchCount / insertable.length;
      scores.set(
        tableName as TargetTableName,
        (scores.get(tableName as TargetTableName) ?? 0) + overlapScore * 0.7,
      );
    }
  }

  // Convert to sorted list
  const suggestions: TableSuggestion[] = [];
  for (const [table, confidence] of scores.entries()) {
    if (confidence > 0.05) {
      suggestions.push({ table, confidence: Math.min(confidence, 1) });
    }
  }
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return suggestions;
}

// ---------------------------------------------------------------------------
// 2. Auto-map CSV columns to target table columns
// ---------------------------------------------------------------------------

/**
 * Auto-suggest column mappings by comparing CSV headers to target column names.
 * Uses multi-pass fuzzy matching: exact → substring → word overlap.
 */
export function autoMapColumns(
  csvHeaders: string[],
  targetTable: TargetTableDefinition,
): ColumnMapping[] {
  const insertable = getInsertableColumns(targetTable);
  const usedTargetCols = new Set<string>();

  return csvHeaders.map((csvCol) => {
    const normalized = csvCol
      .toLowerCase()
      .replace(/[\s-]/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    // Pass 1: Exact match
    let match = insertable.find(
      (tc) => tc.name === normalized && !usedTargetCols.has(tc.name),
    );

    // Pass 2: Substring containment
    if (!match) {
      match = insertable.find(
        (tc) =>
          !usedTargetCols.has(tc.name) &&
          (tc.name.includes(normalized) || normalized.includes(tc.name)),
      );
    }

    // Pass 3: Word overlap (≥60%)
    if (!match) {
      const csvWords = normalized.split('_').filter(Boolean);
      match = insertable.find((tc) => {
        if (usedTargetCols.has(tc.name)) return false;
        const targetWords = tc.name.split('_');
        const overlap = csvWords.filter((w) => targetWords.includes(w));
        return overlap.length >= Math.ceil(targetWords.length * 0.6);
      });
    }

    if (match) {
      usedTargetCols.add(match.name);
      return {
        csvColumn: csvCol,
        targetColumn: match.name,
        transform: inferTransform(match),
      };
    }

    return { csvColumn: csvCol, targetColumn: null, transform: 'none' as const };
  });
}

function inferTransform(targetCol: TargetColumn): ColumnMapping['transform'] {
  switch (targetCol.type) {
    case 'number':
      return 'to_number';
    case 'date':
      return 'to_date';
    case 'timestamp':
      return 'to_timestamp';
    case 'boolean':
      return 'to_boolean';
    default:
      return 'none';
  }
}

// ---------------------------------------------------------------------------
// 3. Validate mapping
// ---------------------------------------------------------------------------

/**
 * Validate the current column mapping against the target table's constraints.
 * Returns validation results (errors block progression, warnings/info do not).
 */
export function validateMapping(
  mappings: ColumnMapping[],
  targetTable: TargetTableDefinition,
  sampleRows: string[][],
  csvHeaders: string[],
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const insertable = getInsertableColumns(targetTable);
  const mappedTargetCols = new Set(
    mappings.filter((m) => m.targetColumn).map((m) => m.targetColumn!),
  );

  // Check required columns are mapped
  for (const col of insertable) {
    if (col.required && !mappedTargetCols.has(col.name)) {
      results.push({
        severity: 'error',
        column: col.name,
        message: `Required column "${col.name}" is not mapped to any CSV column.`,
      });
    }
  }

  // FK warnings
  for (const mapping of mappings) {
    if (!mapping.targetColumn) continue;
    const targetCol = insertable.find((c) => c.name === mapping.targetColumn);
    if (targetCol?.isForeignKey) {
      results.push({
        severity: 'warning',
        column: targetCol.name,
        message: `"${targetCol.name}" references ${targetCol.referencedTable}.${targetCol.referencedColumn} — values must exist in that table.`,
      });
    }
  }

  // FK dependency guidance
  if (targetTable.fkDependencies.length > 0) {
    const depNames = targetTable.fkDependencies
      .map((d) => TARGET_TABLES[d]?.displayName ?? d)
      .join(', ');
    results.push({
      severity: 'info',
      message: `This table depends on: ${depNames}. Ensure those tables have data first.`,
    });
  }

  // Sample data type coercion checks
  for (const mapping of mappings) {
    if (!mapping.targetColumn || mapping.transform === 'none') continue;
    const csvIdx = csvHeaders.indexOf(mapping.csvColumn);
    if (csvIdx === -1) continue;

    const sampleVals = sampleRows
      .slice(0, 20)
      .map((r) => r[csvIdx])
      .filter((v) => v !== undefined && v !== '');
    if (sampleVals.length === 0) continue;

    const failCount = sampleVals.filter(
      (v) => !canCoerce(v, mapping.transform),
    ).length;

    if (failCount > 0) {
      const pct = Math.round((failCount / sampleVals.length) * 100);
      results.push({
        severity: failCount > sampleVals.length * 0.5 ? 'error' : 'warning',
        column: mapping.csvColumn,
        message: `${failCount}/${sampleVals.length} sample values (${pct}%) in "${mapping.csvColumn}" cannot be converted to ${mapping.transform.replace('to_', '')}.`,
      });
    }
  }

  // Unmapped columns info
  const unmapped = mappings.filter((m) => !m.targetColumn);
  if (unmapped.length > 0) {
    results.push({
      severity: 'info',
      message: `${unmapped.length} CSV column(s) are not mapped and will be ignored: ${unmapped.map((m) => m.csvColumn).join(', ')}`,
    });
  }

  return results;
}

function canCoerce(value: string, transform: string): boolean {
  switch (transform) {
    case 'to_number':
      return !isNaN(Number(value));
    case 'to_boolean':
      return ['true', 'false', '1', '0', 'yes', 'no'].includes(
        value.toLowerCase(),
      );
    case 'to_date':
    case 'to_timestamp':
      return !isNaN(Date.parse(value));
    default:
      return true;
  }
}

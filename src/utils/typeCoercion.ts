import type { ColumnMapping } from '@/types/dataConnector';

/**
 * Convert a raw CSV row (all strings) into a typed object based on column mappings.
 * Keys are TARGET column names; values are coerced to the appropriate JS/JSON types.
 */
export function coerceRow(
  rawRow: string[],
  csvHeaders: string[],
  mappings: ColumnMapping[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    if (!mapping.targetColumn) continue;

    const csvIdx = csvHeaders.indexOf(mapping.csvColumn);
    if (csvIdx === -1) continue;

    const rawValue = rawRow[csvIdx];

    // Null / empty → null
    if (rawValue === '' || rawValue === undefined || rawValue === null) {
      result[mapping.targetColumn] = null;
      continue;
    }

    result[mapping.targetColumn] = coerceValue(rawValue, mapping.transform);
  }

  return result;
}

function coerceValue(value: string, transform: ColumnMapping['transform']): unknown {
  switch (transform) {
    case 'to_number': {
      const num = Number(value);
      return isNaN(num) ? null : num;
    }
    case 'to_boolean': {
      const lower = value.toLowerCase();
      if (['true', '1', 'yes'].includes(lower)) return true;
      if (['false', '0', 'no'].includes(lower)) return false;
      return null;
    }
    case 'to_date': {
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      // Return ISO date string (YYYY-MM-DD)
      return d.toISOString().split('T')[0];
    }
    case 'to_timestamp': {
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    }
    case 'none':
    default:
      return value;
  }
}

/**
 * Batch-coerce all rows.
 */
export function coerceAllRows(
  rawRows: string[][],
  csvHeaders: string[],
  mappings: ColumnMapping[],
): Record<string, unknown>[] {
  return rawRows.map((row) => coerceRow(row, csvHeaders, mappings));
}

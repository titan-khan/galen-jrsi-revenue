import type { DetectedColumn, ColumnType, ColumnRole, DataSourceSchema, MetricSuggestion } from '@/types/dataConnector';

/**
 * Parse a CSV file and auto-detect schema.
 * Runs entirely client-side via FileReader.
 */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function detectColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter((v) => v !== '' && v != null);
  if (nonEmpty.length === 0) return 'string';

  // Check boolean
  const boolValues = new Set(['true', 'false', '1', '0', 'yes', 'no']);
  const boolCount = nonEmpty.filter((v) => boolValues.has(v.toLowerCase())).length;
  if (boolCount / nonEmpty.length > 0.9) return 'boolean';

  // Check date
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // 2026-01-01
    /^\d{2}\/\d{2}\/\d{4}/, // 01/01/2026
    /^\d{2}-\d{2}-\d{4}/, // 01-01-2026
  ];
  const dateCount = nonEmpty.filter((v) =>
    datePatterns.some((p) => p.test(v))
  ).length;
  if (dateCount / nonEmpty.length > 0.8) return 'date';

  // Check numeric
  const numCount = nonEmpty.filter((v) => !isNaN(Number(v))).length;
  if (numCount / nonEmpty.length > 0.9) return 'numeric';

  return 'string';
}

function detectColumnRole(name: string, type: ColumnType, values: string[]): ColumnRole {
  const nameLower = name.toLowerCase().replace(/[_-]/g, ' ');

  // Date patterns
  const datePatterns = ['date', 'time', 'timestamp', 'period', 'month', 'day', 'year'];
  if (type === 'date' || datePatterns.some((p) => nameLower.includes(p))) {
    return 'date';
  }

  // Metric patterns
  const metricPatterns = [
    'score', 'rate', 'count', 'total', 'amount', 'revenue',
    'on time', 'otp', 'nps', 'satisfaction', 'delay', 'cost',
    'margin', 'profit', 'conversion', 'churn', 'price',
  ];
  if ((type === 'boolean' || type === 'numeric') && metricPatterns.some((p) => nameLower.includes(p))) {
    return 'metric';
  }

  // Dimension patterns
  const dimensionPatterns = [
    'id', 'name', 'type', 'category', 'region', 'route',
    'driver', 'vehicle', 'channel', 'segment', 'status', 'group',
  ];
  if (type === 'string' && dimensionPatterns.some((p) => nameLower.includes(p))) {
    return 'dimension';
  }

  // High cardinality string = identifier
  if (type === 'string') {
    const uniqueCount = new Set(values).size;
    if (uniqueCount > values.length * 0.8) return 'identifier';
    return 'dimension';
  }

  // Numeric but not a clear metric
  if (type === 'numeric') return 'secondary_metric';

  return 'dimension';
}

function calculateConfidence(type: ColumnType, role: ColumnRole, nullRatio: number): number {
  let base = 0.7;
  if (role === 'date' && type === 'date') base += 0.2;
  if (role === 'metric' && (type === 'boolean' || type === 'numeric')) base += 0.15;
  if (role === 'dimension' && type === 'string') base += 0.1;
  if (nullRatio < 0.01) base += 0.08;
  return Math.min(base, 0.99);
}

export function detectSchema(headers: string[], rows: string[][]): DataSourceSchema {
  const sampleSize = Math.min(rows.length, 100);
  const sampleRows = rows.slice(0, sampleSize);

  const columns: DetectedColumn[] = headers.map((header, colIndex) => {
    const values = sampleRows.map((row) => row[colIndex] || '');
    const allValues = rows.map((row) => row[colIndex] || '');

    const type = detectColumnType(values);
    const role = detectColumnRole(header, type, allValues);
    const nullCount = allValues.filter((v) => v === '' || v == null).length;
    const uniqueCount = new Set(allValues.filter((v) => v !== '')).size;
    const confidence = calculateConfidence(type, role, nullCount / Math.max(allValues.length, 1));

    return {
      name: header,
      type,
      role,
      confidence,
      sampleValues: values.filter((v) => v !== '').slice(0, 5),
      nullCount,
      uniqueCount,
    };
  });

  // Detect date range
  const dateCol = columns.find((c) => c.role === 'date');
  let dateRange: { start: string; end: string } | undefined;
  if (dateCol) {
    const colIndex = headers.indexOf(dateCol.name);
    const dateValues = rows
      .map((row) => row[colIndex])
      .filter((v) => v && v !== '')
      .sort();
    if (dateValues.length > 0) {
      dateRange = { start: dateValues[0], end: dateValues[dateValues.length - 1] };
    }
  }

  return {
    columns,
    rowCount: rows.length,
    columnCount: headers.length,
    dateRange,
  };
}

export function calculateQualityScore(schema: DataSourceSchema, totalRows: number): number {
  if (schema.columns.length === 0 || totalRows === 0) return 0;

  const scores = schema.columns.map((col) => {
    const nullRatio = col.nullCount / totalRows;
    return 1 - nullRatio;
  });

  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return Math.round(avgScore * 100);
}

export function suggestMetrics(schema: DataSourceSchema): MetricSuggestion[] {
  const columnNames = schema.columns.map((c) => c.name.toLowerCase()).join(' ');
  const suggestions: MetricSuggestion[] = [];

  const patterns: Array<{ keywords: string[]; useCase: string; metricName: string }> = [
    { keywords: ['on_time', 'otp', 'punctual', 'delay', 'late'], useCase: 'otp', metricName: 'On-Time Performance (OTP)' },
    { keywords: ['nps', 'promoter', 'detractor', 'satisfaction'], useCase: 'nps', metricName: 'Net Promoter Score (NPS)' },
    { keywords: ['revenue', 'sales', 'amount', 'transaction'], useCase: 'revenue', metricName: 'Revenue' },
    { keywords: ['conversion', 'funnel', 'booking', 'purchase'], useCase: 'conversion', metricName: 'Conversion Rate' },
  ];

  for (const pattern of patterns) {
    const matchCount = pattern.keywords.filter((kw) => columnNames.includes(kw)).length;
    if (matchCount > 0) {
      suggestions.push({
        useCase: pattern.useCase,
        metricName: pattern.metricName,
        confidence: Math.min(0.5 + matchCount * 0.15, 0.95),
      });
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

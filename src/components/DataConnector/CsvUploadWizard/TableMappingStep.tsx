import { useMemo } from 'react';
import { Lightbulb, Check, AlertTriangle, X, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type {
  ColumnMapping,
  TargetTableName,
  DetectedColumn,
} from '@/types/dataConnector';
import { TARGET_TABLES, getTargetTableOptions, getInsertableColumns } from '@/data/targetTableRegistry';
import type { TableSuggestion } from '@/utils/columnMapper';

// Re-export for convenience (suggestTargetTable returns this)
export type { TableSuggestion };

const TRANSFORM_LABELS: Record<ColumnMapping['transform'], string> = {
  none: 'Text',
  to_number: 'Number',
  to_date: 'Date',
  to_boolean: 'Boolean',
  to_timestamp: 'Timestamp',
};

const TRANSFORM_COLORS: Record<ColumnMapping['transform'], string> = {
  none: 'bg-muted text-muted-foreground',
  to_number: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  to_date: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  to_boolean: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  to_timestamp: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

interface TableMappingStepProps {
  csvHeaders: string[];
  sampleRows: string[][];
  detectedColumns: DetectedColumn[];
  selectedTable: TargetTableName | null;
  mappings: ColumnMapping[];
  tableSuggestions: { table: TargetTableName; confidence: number }[];
  onTableSelect: (table: TargetTableName) => void;
  onMappingChange: (csvColumn: string, targetColumn: string | null) => void;
}

export function TableMappingStep({
  csvHeaders,
  sampleRows,
  detectedColumns,
  selectedTable,
  mappings,
  tableSuggestions,
  onTableSelect,
  onMappingChange,
}: TableMappingStepProps) {
  const tableOptions = useMemo(() => getTargetTableOptions(), []);

  const topSuggestion = tableSuggestions[0];
  const showSuggestion = topSuggestion && topSuggestion.confidence >= 0.15 && !selectedTable;

  const selectedTableDef = selectedTable ? TARGET_TABLES[selectedTable] : null;
  const insertableColumns = selectedTableDef
    ? getInsertableColumns(selectedTableDef)
    : [];

  // Build set of already-mapped target columns (to avoid double-mapping)
  const mappedTargetCols = new Set(
    mappings.filter((m) => m.targetColumn).map((m) => m.targetColumn!),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium mb-1">Map to Target Table</h2>
        <p className="text-xs text-muted-foreground">
          Select the database table where your CSV data should be imported, then map each column.
        </p>
      </div>

      {/* Auto-suggestion banner */}
      {showSuggestion && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
          <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              This looks like{' '}
              <span className="font-semibold">
                {TARGET_TABLES[topSuggestion.table].displayName}
              </span>{' '}
              data
            </p>
            <p className="text-[11px] text-blue-600/70 dark:text-blue-400/60 mt-0.5">
              Confidence: {Math.round(topSuggestion.confidence * 100)}%
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTableSelect(topSuggestion.table)}
            className="text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline shrink-0"
          >
            Use this →
          </button>
        </div>
      )}

      {/* Target table selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium">Target Table</label>
        <Select
          value={selectedTable ?? ''}
          onValueChange={(val) => onTableSelect(val as TargetTableName)}
        >
          <SelectTrigger className="h-9 text-[13px]">
            <SelectValue placeholder="Select a target table…" />
          </SelectTrigger>
          <SelectContent>
            {tableOptions.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel className="text-[11px] font-semibold text-muted-foreground">
                  {group.label}
                </SelectLabel>
                {group.tables.map((t) => (
                  <SelectItem key={t.name} value={t.name} className="text-[12px]">
                    <span className="flex items-center gap-2">
                      {t.displayName}
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 font-normal"
                      >
                        {getInsertableColumns(t).length} cols
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Column mapping grid */}
      {selectedTableDef && mappings.length > 0 && (
        <div className="space-y-3">
          {/* Auto-PK info */}
          {selectedTableDef.autoGeneratePk && (
            <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-md">
              Primary key <span className="font-mono">{selectedTableDef.primaryKey}</span> is auto-generated — no mapping needed.
            </div>
          )}

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[11px] font-semibold w-[160px]">
                    CSV Column
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold w-[40px]">
                    →
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold w-[180px]">
                    Target Column
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold w-[80px]">
                    Transform
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold">
                    Samples
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold w-[40px] text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => {
                  const csvIdx = csvHeaders.indexOf(mapping.csvColumn);
                  const detected = detectedColumns[csvIdx];
                  const samples = sampleRows
                    .slice(0, 3)
                    .map((row) => row[csvIdx])
                    .filter((v) => v !== undefined && v !== '');

                  const targetCol = mapping.targetColumn
                    ? insertableColumns.find((c) => c.name === mapping.targetColumn)
                    : null;

                  return (
                    <MappingRow
                      key={mapping.csvColumn}
                      mapping={mapping}
                      samples={samples}
                      detected={detected}
                      targetCol={targetCol}
                      insertableColumns={insertableColumns}
                      mappedTargetCols={mappedTargetCols}
                      onMappingChange={onMappingChange}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function MappingRow({
  mapping,
  samples,
  detected,
  targetCol,
  insertableColumns,
  mappedTargetCols,
  onMappingChange,
}: {
  mapping: ColumnMapping;
  samples: string[];
  detected: DetectedColumn | undefined;
  targetCol: ReturnType<typeof getInsertableColumns>[number] | null | undefined;
  insertableColumns: ReturnType<typeof getInsertableColumns>;
  mappedTargetCols: Set<string>;
  onMappingChange: (csvColumn: string, targetColumn: string | null) => void;
}) {
  const isMapped = !!mapping.targetColumn;
  const isFk = targetCol?.isForeignKey ?? false;

  return (
    <TableRow>
      {/* CSV column name */}
      <TableCell className="text-xs font-medium font-mono">
        {mapping.csvColumn}
      </TableCell>

      {/* Arrow */}
      <TableCell className="text-center text-muted-foreground text-[11px]">
        →
      </TableCell>

      {/* Target column selector */}
      <TableCell>
        <Select
          value={mapping.targetColumn ?? '__unmapped__'}
          onValueChange={(val) =>
            onMappingChange(
              mapping.csvColumn,
              val === '__unmapped__' ? null : val,
            )
          }
        >
          <SelectTrigger className="h-7 text-[11px] w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unmapped__" className="text-[11px] text-muted-foreground">
              — Unmapped —
            </SelectItem>
            {insertableColumns.map((col) => {
              const alreadyUsed =
                mappedTargetCols.has(col.name) &&
                col.name !== mapping.targetColumn;
              return (
                <SelectItem
                  key={col.name}
                  value={col.name}
                  className={cn('text-[11px]', alreadyUsed && 'opacity-40')}
                  disabled={alreadyUsed}
                >
                  <span className="flex items-center gap-1.5">
                    {col.name}
                    {col.required && (
                      <span className="text-red-500 text-[9px]">*</span>
                    )}
                    {col.isForeignKey && (
                      <Link2 className="h-3 w-3 text-amber-500" />
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Transform badge */}
      <TableCell>
        {isMapped && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-medium px-2 py-0.5 border-0',
              TRANSFORM_COLORS[mapping.transform],
            )}
          >
            {TRANSFORM_LABELS[mapping.transform]}
          </Badge>
        )}
      </TableCell>

      {/* Sample values */}
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap">
          {samples.slice(0, 3).map((val, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-[10px] font-normal px-1.5 py-0 max-w-[80px] truncate"
            >
              {val}
            </Badge>
          ))}
        </div>
      </TableCell>

      {/* Status */}
      <TableCell className="text-center">
        {isMapped && !isFk && (
          <Check className="h-3.5 w-3.5 text-emerald-600 mx-auto" />
        )}
        {isMapped && isFk && (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mx-auto" />
        )}
        {!isMapped && (
          <X className="h-3.5 w-3.5 text-muted-foreground/50 mx-auto" />
        )}
      </TableCell>
    </TableRow>
  );
}

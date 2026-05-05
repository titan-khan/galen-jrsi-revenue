import { Lightbulb } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
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
import type { DataSourceSchema, DetectedColumn, ColumnType, ColumnRole, MetricSuggestion } from '@/types/dataConnector';

const ROLE_LABELS: Record<ColumnRole, { label: string; color: string }> = {
  date: { label: 'Date', color: 'text-blue-600' },
  metric: { label: 'Metric', color: 'text-emerald-600' },
  secondary_metric: { label: 'Secondary', color: 'text-teal-600' },
  dimension: { label: 'Dimension', color: 'text-purple-600' },
  identifier: { label: 'Identifier', color: 'text-amber-600' },
  ignore: { label: 'Ignore', color: 'text-muted-foreground' },
};

const TYPE_OPTIONS: { value: ColumnType; label: string }[] = [
  { value: 'string', label: 'Text' },
  { value: 'numeric', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
];

const ROLE_OPTIONS: { value: ColumnRole; label: string }[] = [
  { value: 'date', label: 'Date Column' },
  { value: 'metric', label: 'Metric' },
  { value: 'secondary_metric', label: 'Secondary Metric' },
  { value: 'dimension', label: 'Dimension' },
  { value: 'identifier', label: 'Identifier' },
  { value: 'ignore', label: 'Ignore' },
];

interface SchemaReviewStepProps {
  schema: DataSourceSchema;
  qualityScore: number;
  metricSuggestions: MetricSuggestion[];
  onColumnChange: (colIndex: number, field: 'type' | 'role', value: string) => void;
}

export function SchemaReviewStep({
  schema,
  qualityScore,
  metricSuggestions,
  onColumnChange,
}: SchemaReviewStepProps) {
  const topSuggestion = metricSuggestions[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium mb-1">Review Detected Schema</h2>
        <p className="text-xs text-muted-foreground">
          We auto-detected your column types and roles. Adjust anything that doesn't look right.
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">
          {schema.rowCount.toLocaleString()} rows
        </span>
        <span className="text-border">·</span>
        <span>{schema.columnCount} columns</span>
        {schema.dateRange && (
          <>
            <span className="text-border">·</span>
            <span>{schema.dateRange.start} – {schema.dateRange.end}</span>
          </>
        )}
      </div>

      {/* Quality score */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
        <span className="text-xs text-muted-foreground">Data Quality</span>
        <Progress value={qualityScore} className="h-2 flex-1 max-w-[200px]" />
        <span className={cn(
          'text-xs font-semibold',
          qualityScore >= 90 ? 'text-emerald-600' :
          qualityScore >= 70 ? 'text-amber-600' : 'text-red-600',
        )}>
          {qualityScore}/100
        </span>
      </div>

      {/* Metric suggestion */}
      {topSuggestion && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
          <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              This looks like {topSuggestion.metricName} data
            </p>
            <p className="text-[11px] text-blue-600/70 dark:text-blue-400/60 mt-0.5">
              Confidence: {Math.round(topSuggestion.confidence * 100)}%
            </p>
          </div>
        </div>
      )}

      {/* Schema table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-[11px] font-semibold w-[160px]">Column</TableHead>
              <TableHead className="text-[11px] font-semibold w-[120px]">Type</TableHead>
              <TableHead className="text-[11px] font-semibold w-[140px]">Role</TableHead>
              <TableHead className="text-[11px] font-semibold">Samples</TableHead>
              <TableHead className="text-[11px] font-semibold text-right w-[60px]">Nulls</TableHead>
              <TableHead className="text-[11px] font-semibold text-right w-[70px]">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schema.columns.map((col, index) => (
              <SchemaRow
                key={col.name}
                column={col}
                totalRows={schema.rowCount}
                onTypeChange={(value) => onColumnChange(index, 'type', value)}
                onRoleChange={(value) => onColumnChange(index, 'role', value)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SchemaRow({
  column,
  totalRows,
  onTypeChange,
  onRoleChange,
}: {
  column: DetectedColumn;
  totalRows: number;
  onTypeChange: (value: string) => void;
  onRoleChange: (value: string) => void;
}) {
  const roleStyle = ROLE_LABELS[column.role];
  const nullPct = totalRows > 0 ? ((column.nullCount / totalRows) * 100).toFixed(1) : '0';

  return (
    <TableRow>
      <TableCell className="text-xs font-medium">{column.name}</TableCell>
      <TableCell>
        <Select value={column.type} onValueChange={onTypeChange}>
          <SelectTrigger className="h-7 text-[11px] w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-[11px]">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={column.role} onValueChange={onRoleChange}>
          <SelectTrigger className="h-7 text-[11px] w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-[11px]">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap">
          {column.sampleValues.slice(0, 3).map((val, i) => (
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
      <TableCell className="text-right">
        <span className={cn(
          'text-[11px]',
          column.nullCount === 0 ? 'text-emerald-600' : 'text-muted-foreground',
        )}>
          {column.nullCount === 0 ? '0' : `${nullPct}%`}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <span className={cn(
          'text-[11px] font-medium',
          column.confidence >= 0.9 ? 'text-emerald-600' :
          column.confidence >= 0.7 ? 'text-amber-600' : 'text-red-500',
        )}>
          {Math.round(column.confidence * 100)}%
        </span>
      </TableCell>
    </TableRow>
  );
}

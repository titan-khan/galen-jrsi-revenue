import { AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
  TargetTableDefinition,
  ValidationResult,
} from '@/types/dataConnector';

const TRANSFORM_LABELS: Record<ColumnMapping['transform'], string> = {
  none: 'Text',
  to_number: 'Number',
  to_date: 'Date',
  to_boolean: 'Boolean',
  to_timestamp: 'Timestamp',
};

interface MappingReviewStepProps {
  targetTable: TargetTableDefinition;
  mappings: ColumnMapping[];
  validationResults: ValidationResult[];
  qualityScore: number;
  rowCount: number;
}

export function MappingReviewStep({
  targetTable,
  mappings,
  validationResults,
  qualityScore,
  rowCount,
}: MappingReviewStepProps) {
  const mapped = mappings.filter((m) => m.targetColumn);
  const unmapped = mappings.filter((m) => !m.targetColumn);
  const errors = validationResults.filter((r) => r.severity === 'error');
  const warnings = validationResults.filter((r) => r.severity === 'warning');
  const infos = validationResults.filter((r) => r.severity === 'info');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium mb-1">Review Mapping</h2>
        <p className="text-xs text-muted-foreground">
          Review the column mappings and validation results before importing.
        </p>
      </div>

      {/* Target table header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Target:</span>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] font-semibold px-2 py-0.5 border-0',
            targetTable.category === 'fact'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          )}
        >
          {targetTable.displayName}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          ({targetTable.name})
        </span>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">
          {rowCount.toLocaleString()} rows
        </span>
        <span className="text-border">·</span>
        <span>{mapped.length} mapped columns</span>
        {unmapped.length > 0 && (
          <>
            <span className="text-border">·</span>
            <span>{unmapped.length} unmapped</span>
          </>
        )}
      </div>

      {/* Quality score */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
        <span className="text-xs text-muted-foreground">Data Quality</span>
        <Progress value={qualityScore} className="h-2 flex-1 max-w-[200px]" />
        <span
          className={cn(
            'text-xs font-semibold',
            qualityScore >= 90
              ? 'text-emerald-600'
              : qualityScore >= 70
                ? 'text-amber-600'
                : 'text-red-600',
          )}
        >
          {qualityScore}/100
        </span>
      </div>

      {/* Validation results */}
      {validationResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Validation ({errors.length} errors, {warnings.length} warnings)
          </p>

          {errors.map((r, i) => (
            <ValidationMessage key={`e-${i}`} result={r} />
          ))}
          {warnings.map((r, i) => (
            <ValidationMessage key={`w-${i}`} result={r} />
          ))}
          {infos.map((r, i) => (
            <ValidationMessage key={`i-${i}`} result={r} />
          ))}
        </div>
      )}

      {/* Mapping summary table */}
      {mapped.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Column Mapping Summary
          </p>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[11px] font-semibold">
                    CSV Column
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold w-[30px]" />
                  <TableHead className="text-[11px] font-semibold">
                    Target Column
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold w-[80px]">
                    Transform
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapped.map((m) => (
                  <TableRow key={m.csvColumn}>
                    <TableCell className="text-[11px] font-mono">
                      {m.csvColumn}
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="text-[11px] font-mono font-medium">
                      {m.targetColumn}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-normal px-1.5 py-0"
                      >
                        {TRANSFORM_LABELS[m.transform]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Unmapped columns */}
      {unmapped.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Unmapped Columns (will be ignored)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unmapped.map((m) => (
              <Badge
                key={m.csvColumn}
                variant="outline"
                className="text-[10px] font-normal px-2 py-0.5 text-muted-foreground"
              >
                {m.csvColumn}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ValidationMessage({ result }: { result: ValidationResult }) {
  const config = {
    error: {
      icon: AlertCircle,
      bg: 'bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      iconColor: 'text-red-500',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      iconColor: 'text-amber-500',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      iconColor: 'text-blue-500',
    },
  }[result.severity];

  const Icon = config.icon;

  return (
    <div className={cn('flex items-start gap-2 p-2.5 rounded-lg border', config.bg)}>
      <Icon className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', config.iconColor)} />
      <p className={cn('text-[11px]', config.text)}>{result.message}</p>
    </div>
  );
}

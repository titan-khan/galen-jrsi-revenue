import { FileText, Check, Database } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { DataSourceSchema } from '@/types/dataConnector';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ConfirmStepProps {
  fileName: string;
  fileSize: number;
  schema: DataSourceSchema;
  qualityScore: number;
  dataSourceName: string;
  onNameChange: (name: string) => void;
  targetTableName?: string;
  targetTableDisplayName?: string;
  targetTableCategory?: 'fact' | 'dimension';
  mappedColumnCount?: number;
}

export function ConfirmStep({
  fileName,
  fileSize,
  schema,
  qualityScore,
  dataSourceName,
  onNameChange,
  targetTableName,
  targetTableDisplayName,
  targetTableCategory,
  mappedColumnCount,
}: ConfirmStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium mb-1">Confirm & Import</h2>
        <p className="text-xs text-muted-foreground">
          Review the summary below and give your data source a name.
        </p>
      </div>

      {/* Data source name */}
      <div className="space-y-2">
        <Label htmlFor="ds-name" className="text-xs font-medium">
          Data Source Name
        </Label>
        <Input
          id="ds-name"
          value={dataSourceName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., Trip Data Jan 2026"
          className="h-9 text-[13px]"
        />
      </div>

      {/* File summary card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                <span>{formatFileSize(fileSize)}</span>
                <span className="text-border">·</span>
                <span>{schema.rowCount.toLocaleString()} rows</span>
                {mappedColumnCount !== undefined && (
                  <>
                    <span className="text-border">·</span>
                    <span>{mappedColumnCount} mapped columns</span>
                  </>
                )}
                {schema.dateRange && (
                  <>
                    <span className="text-border">·</span>
                    <span>
                      {schema.dateRange.start} – {schema.dateRange.end}
                    </span>
                  </>
                )}
              </div>

              {/* Quality */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px] text-muted-foreground">Quality</span>
                <Progress
                  value={qualityScore}
                  className="h-1.5 flex-1 max-w-[160px]"
                />
                <span
                  className={cn(
                    'text-[11px] font-semibold',
                    qualityScore >= 90
                      ? 'text-emerald-600'
                      : qualityScore >= 70
                        ? 'text-amber-600'
                        : 'text-red-600',
                  )}
                >
                  {qualityScore}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target table info */}
      {targetTableName && targetTableDisplayName && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{targetTableDisplayName}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] font-semibold px-1.5 py-0 border-0',
                      targetTableCategory === 'fact'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                    )}
                  >
                    {targetTableCategory === 'fact' ? 'Fact' : 'Dimension'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  {targetTableName}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready confirmation */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30">
        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          {targetTableName
            ? `Ready to import ${schema.rowCount.toLocaleString()} rows into ${targetTableName}. Click "Import Data" to proceed.`
            : 'Ready to import. Click "Import Data" to add this data source to your workspace.'}
        </p>
      </div>
    </div>
  );
}

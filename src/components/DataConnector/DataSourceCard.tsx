import { FileSpreadsheet, MoreHorizontal, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DataSource } from '@/types/dataConnector';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DataSourceCardProps {
  dataSource: DataSource;
  onRemove: (id: string) => void;
}

export function DataSourceCard({ dataSource, onRemove }: DataSourceCardProps) {
  const statusStyles = {
    active: { label: 'Active', dotColor: 'bg-emerald-500' },
    processing: { label: 'Processing', dotColor: 'bg-blue-500' },
    error: { label: 'Error', dotColor: 'bg-red-500' },
  };

  const status = statusStyles[dataSource.status];

  return (
    <div className="group rounded-xl border border-border bg-card p-5 flex flex-col transition-all duration-200 hover:shadow-sm">
      {/* Top row: icon + status + actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', status.dotColor)} />
            <span className="text-[11px] font-medium text-muted-foreground">
              {status.label}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive text-xs"
              onClick={() => onRemove(dataSource.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Name */}
      <h3 className="text-[13px] font-semibold text-foreground mb-0.5 truncate">
        {dataSource.name}
      </h3>

      {/* File info */}
      <p className="text-[11px] text-muted-foreground/70 mb-3">
        {dataSource.fileName} · {formatFileSize(dataSource.fileSize)}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
        <span>{dataSource.rowCount.toLocaleString()} rows</span>
        <span className="text-border">·</span>
        <span>{dataSource.columnCount} columns</span>
        {dataSource.dateRange && (
          <>
            <span className="text-border">·</span>
            <span>{dataSource.dateRange.start} – {dataSource.dateRange.end}</span>
          </>
        )}
      </div>

      {/* Quality score */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] text-muted-foreground/70">Quality</span>
        <Progress value={dataSource.qualityScore} className="h-1.5 flex-1" />
        <span className="text-[11px] font-medium text-muted-foreground">
          {dataSource.qualityScore}%
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 mt-auto">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">CSV</Badge>
        <span className="text-border">·</span>
        <span>
          {formatDistanceToNow(new Date(dataSource.uploadedAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

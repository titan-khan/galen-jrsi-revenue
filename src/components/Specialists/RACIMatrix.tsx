// =============================================================================
// RACI Matrix UI — full table, compact row summary, and legend
// =============================================================================

import { Users2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  RACI_AGENCIES,
  AGENCY_SHORT,
  AGENCY_LABEL,
  RACI_ROLE_LABEL,
  summarizeRACIRow,
  type RACIRole,
  type RACIRow,
  type SegmenInfo,
} from '@/services/raciService';

// ─── Role styling ────────────────────────────────────────────────────

const ROLE_STYLE: Record<RACIRole, { bg: string; text: string; border: string; label: string }> = {
  R: {
    bg: 'bg-blue-500/15 hover:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-500/30',
    label: 'R',
  },
  A: {
    bg: 'bg-amber-500/20 hover:bg-amber-500/25',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/40',
    label: 'A',
  },
  C: {
    bg: 'bg-muted/50 hover:bg-muted',
    text: 'text-muted-foreground/80',
    border: 'border-border',
    label: 'C',
  },
  I: {
    bg: 'bg-transparent hover:bg-muted/30',
    text: 'text-muted-foreground/60',
    border: 'border-dashed border-border',
    label: 'I',
  },
};

// ─── Role pill (for table cells) ─────────────────────────────────────

function RoleBadge({ role }: { role: RACIRole }) {
  const s = ROLE_STYLE[role];
  return (
    <span
      title={RACI_ROLE_LABEL[role]}
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-semibold border tabular-nums',
        s.bg,
        s.text,
        s.border,
      )}
    >
      {s.label}
    </span>
  );
}

// ─── Legend ──────────────────────────────────────────────────────────

export function RACILegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center flex-wrap gap-2.5 text-[11px] text-muted-foreground/70', className)}>
      {(['R', 'A', 'C', 'I'] as RACIRole[]).map((role) => (
        <span key={role} className="inline-flex items-center gap-1">
          <RoleBadge role={role} />
          <span>{RACI_ROLE_LABEL[role]}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Full matrix table (used on Overview tab) ───────────────────────

interface RACIMatrixTableProps {
  rows: RACIRow[];
  segmen?: SegmenInfo;
  /** Optional row to highlight (e.g. the recommendation currently selected) */
  highlightedRowId?: number;
  className?: string;
}

export function RACIMatrixTable({
  rows,
  segmen,
  highlightedRowId,
  className,
}: RACIMatrixTableProps) {
  if (rows.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed border-border p-4 text-center', className)}>
        <p className="text-sm text-muted-foreground">
          Tidak ada matriks RACI untuk segmen ini.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border bg-card overflow-hidden', className)}>
      <div className="px-4 py-3 border-b border-border bg-muted/15 flex items-center gap-2 flex-wrap">
        <Users2 className="h-4 w-4 text-muted-foreground/60" />
        <span className="text-sm font-semibold text-foreground">Matriks RACI Antar-Instansi</span>
        {segmen && (
          <Badge variant="outline" className="text-[11px] font-medium h-5 px-2 ml-auto bg-background/60">
            {segmen.kode} — {segmen.nama}
          </Badge>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-semibold w-[44%] min-w-[280px]">
                Aksi Kunci
              </TableHead>
              {RACI_AGENCIES.map((a) => (
                <TableHead
                  key={a}
                  className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-semibold text-center px-1.5"
                  title={AGENCY_LABEL[a]}
                >
                  {AGENCY_SHORT[a]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  'transition-colors',
                  highlightedRowId === row.id && 'bg-primary/[0.04] hover:bg-primary/[0.06]',
                )}
              >
                <TableCell className="text-[13px] text-foreground/85 leading-snug py-2.5 align-top">
                  {row.aksiKunci}
                </TableCell>
                {RACI_AGENCIES.map((a) => {
                  const role = row.assignments[a];
                  return (
                    <TableCell key={a} className="text-center px-1.5 py-2.5 align-top">
                      {role ? <RoleBadge role={role} /> : <span className="text-muted-foreground/25">—</span>}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="px-4 py-2.5 border-t border-border/60 bg-muted/10">
        <RACILegend />
      </div>
    </div>
  );
}

// ─── Compact summary (used in recommendation detail panel) ──────────

export function RACIRowSummary({ row, className }: { row: RACIRow; className?: string }) {
  const summary = summarizeRACIRow(row);
  return (
    <div className={cn('rounded-md border border-border/50 bg-muted/15 p-3 space-y-2', className)}>
      <div className="flex items-center gap-1.5">
        <Users2 className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
          RACI Antar-Instansi
        </span>
      </div>
      <p className="text-[12px] text-muted-foreground/70 italic leading-snug">
        Aksi referensi: {row.aksiKunci}
      </p>
      <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
        {(['R', 'A', 'C', 'I'] as RACIRole[]).map((role) => {
          const agencies = summary[role];
          if (agencies.length === 0) return null;
          return (
            <div key={role} className="flex items-start gap-1.5 text-[12px]">
              <RoleBadge role={role} />
              <span className="text-foreground/85 leading-snug">
                {agencies.join(', ')}
              </span>
            </div>
          );
        })}
      </div>
      <RACILegend className="pt-1.5 border-t border-border/40" />
    </div>
  );
}

import { Calendar, Layers, ArrowLeftRight, CameraIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface PeriodFilters {
  period: string;
  segment: string;
  comparison: string;
}

interface PeriodSelectorRowProps {
  filters: PeriodFilters;
  onFiltersChange: (filters: PeriodFilters) => void;
}

// PKB pilot data is a single snapshot (no time-series yet). When JRSI legacy is off,
// suppress the misleading time/segment/comparison dropdowns and show a transparent
// snapshot badge instead. Avoids "UI lying about temporality" — full audit context.
const PKB_SNAPSHOT_DATE = '2026-05-05';
const PKB_SNAPSHOT_LOCATION = 'Palangka Raya';

// Actual data range: Jan 2025 – Jan 2026 (13 months)
const PERIODS = [
  { value: 'jan-2026', label: 'Jan 2026' },
  { value: 'dec-2025', label: 'Dec 2025' },
  { value: 'nov-2025', label: 'Nov 2025' },
  { value: 'oct-2025', label: 'Oct 2025' },
  { value: 'sep-2025', label: 'Sep 2025' },
  { value: 'aug-2025', label: 'Aug 2025' },
  { value: 'jul-2025', label: 'Jul 2025' },
  { value: 'jun-2025', label: 'Jun 2025' },
  { value: 'may-2025', label: 'May 2025' },
  { value: 'apr-2025', label: 'Apr 2025' },
  { value: 'mar-2025', label: 'Mar 2025' },
  { value: 'feb-2025', label: 'Feb 2025' },
  { value: 'jan-2025', label: 'Jan 2025' },
];

// Match actual dim_client (CLT001–CLT003 active, CLT004–CLT005 have 0 orders)
const SEGMENTS = [
  { value: 'all', label: 'All Clients' },
  { value: 'CLT001', label: 'CLT001 – Premium Beauty' },
  { value: 'CLT002', label: 'CLT002 – Health Supplements' },
  { value: 'CLT003', label: 'CLT003 – Gourmet Foods' },
];

const COMPARISONS = [
  { value: 'previous', label: 'vs Previous Period' },
  { value: 'yoy', label: 'vs Same Period Last Year' },
  { value: 'none', label: 'No Comparison' },
];

export function PeriodSelectorRow({ filters, onFiltersChange }: PeriodSelectorRowProps) {
  const enableJrsiLegacy = import.meta.env.VITE_ENABLE_JRSI_LEGACY === 'true';

  // Snapshot-only mode for PKB pilot — replaces misleading time-series controls
  // until gold.transaksi_fact is ingested and we have real period-over-period data.
  if (!enableJrsiLegacy) {
    return (
      <div className="flex items-center gap-2 flex-wrap text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1">
          <CameraIcon className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span className="font-medium text-foreground/90">Snapshot {PKB_SNAPSHOT_DATE}</span>
          <span className="text-muted-foreground/70">· {PKB_SNAPSHOT_LOCATION}</span>
        </span>
        <span className="text-muted-foreground/60">
          Time-series akan aktif setelah <code className="px-1 py-0.5 rounded bg-muted/60 text-[11px]">gold.transaksi_fact</code> di-ingest.
        </span>
      </div>
    );
  }

  const update = (key: keyof PeriodFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Period */}
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
        <Select value={filters.period} onValueChange={(v) => update('period', v)}>
          <SelectTrigger className="h-9 w-[140px] text-[13px] px-2.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-[13px]">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Segment */}
      <div className="flex items-center gap-1.5">
        <Layers className="h-3.5 w-3.5 text-muted-foreground/60" />
        <Select value={filters.segment} onValueChange={(v) => update('segment', v)}>
          <SelectTrigger className="h-9 w-[210px] text-[13px] px-2.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEGMENTS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-[13px]">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Comparison */}
      <div className="flex items-center gap-1.5">
        <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        <Select value={filters.comparison} onValueChange={(v) => update('comparison', v)}>
          <SelectTrigger className="h-9 w-[200px] text-[13px] px-2.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPARISONS.map((c) => (
              <SelectItem key={c.value} value={c.value} className="text-[13px]">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

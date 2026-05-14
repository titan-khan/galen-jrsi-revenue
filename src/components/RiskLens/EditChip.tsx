import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChipTone } from '@/data/briefData';

interface EditChipProps {
  label: string;
  tone?: ChipTone;
  suggested?: boolean;
  onRemove?: () => void;
}

const TONE: Record<ChipTone, string> = {
  default: 'border-foreground text-foreground bg-background',
  destructive: 'border-destructive/60 text-destructive bg-destructive/5',
  amber: 'border-amber-500/60 text-amber-700 bg-amber-500/5',
  primary: 'border-primary/60 text-primary bg-primary/5',
  emerald: 'border-emerald-500/60 text-emerald-700 bg-emerald-500/5',
};

export function EditChip({ label, tone = 'default', suggested = false, onRemove }: EditChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border pl-2.5 pr-1 py-0.5 text-xs font-medium',
        TONE[tone],
        suggested && 'border-dashed italic font-normal opacity-90',
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="inline-grid h-4 w-4 place-items-center rounded-full border border-current text-[9px] hover:bg-current/10"
        aria-label={`remove ${label}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

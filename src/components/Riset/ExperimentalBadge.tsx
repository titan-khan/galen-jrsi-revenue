import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExperimentalBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function ExperimentalBadge({ className, size = 'sm' }: ExperimentalBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 font-medium text-amber-700',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        className,
      )}
    >
      <FlaskConical className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      Tahap awal
    </span>
  );
}

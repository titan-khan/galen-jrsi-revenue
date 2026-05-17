import { cn } from '@/lib/utils';
import type { Confidence } from '@/data/risetData';

interface ConfidenceSegmentsProps {
  level: Confidence;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const FILLED_SEGMENTS: Record<Confidence, number> = {
  tinggi: 3,
  sedang: 2,
  rendah: 1,
};

const LABEL: Record<Confidence, string> = {
  tinggi: 'Tinggi',
  sedang: 'Sedang',
  rendah: 'Rendah',
};

export function ConfidenceSegments({
  level,
  size = 'sm',
  showLabel = true,
  className,
}: ConfidenceSegmentsProps) {
  const filled = FILLED_SEGMENTS[level];
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex gap-0.5 overflow-hidden rounded-sm',
          size === 'sm' ? 'h-[5px] w-[60px]' : 'h-[6px] w-[70px]',
        )}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'flex-1 rounded-[1px]',
              i < filled ? 'bg-slate-900' : 'bg-slate-200',
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-foreground">{LABEL[level]}</span>
      )}
    </div>
  );
}

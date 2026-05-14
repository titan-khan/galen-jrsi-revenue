import { cn } from '@/lib/utils';

type Health = 'Healthy' | 'Warning' | 'Down';

const STYLES: Record<Health, { dot: string; text: string }> = {
  Healthy: { dot: 'bg-emerald-500', text: 'text-emerald-700' },
  Warning: { dot: 'bg-amber-500', text: 'text-amber-700' },
  Down: { dot: 'bg-destructive', text: 'text-destructive' },
};

export function HealthDot({ status, className }: { status: Health; className?: string }) {
  const s = STYLES[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', s.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {status}
    </span>
  );
}

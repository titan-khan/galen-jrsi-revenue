import { cn } from '@/lib/utils';

type Tone = 'primary' | 'amber' | 'destructive' | 'muted';

const RING: Record<Tone, string> = {
  primary: 'border-primary/60 bg-primary/5',
  amber: 'border-amber-500/60 bg-amber-500/10',
  destructive: 'border-destructive/60 bg-destructive/10',
  muted: 'border-border bg-background',
};

const LABEL_COLOR: Record<Tone, string> = {
  primary: 'text-primary',
  amber: 'text-amber-700',
  destructive: 'text-destructive',
  muted: 'text-foreground',
};

interface DiscoveryNodeProps {
  label: string;
  sub: string;
  tone?: Tone;
  big?: boolean;
}

export function DiscoveryNode({ label, sub, tone = 'muted', big = false }: DiscoveryNodeProps) {
  return (
    <div
      className={cn(
        'rounded-md border-2 text-center',
        big ? 'min-w-[180px] px-4 py-3' : 'min-w-[140px] px-3 py-2',
        RING[tone],
      )}
    >
      <div className={cn('font-semibold', big ? 'text-sm' : 'text-xs', LABEL_COLOR[tone])}>
        {label}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

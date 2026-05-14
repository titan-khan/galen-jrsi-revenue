import { Check, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadinessCheck } from '@/data/briefData';

const STATE: Record<
  ReadinessCheck['state'],
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  ok: { icon: Check, color: 'text-emerald-600' },
  warn: { icon: AlertTriangle, color: 'text-amber-600' },
  fail: { icon: X, color: 'text-destructive' },
};

export function ReadyRow({ check }: { check: ReadinessCheck }) {
  const { icon: Icon, color } = STATE[check.state];
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', color)} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold leading-tight">{check.label}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{check.detail}</p>
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
import { DOMAIN_CONFIGS } from '@/contexts/SpecialistsContext';
import type { SpecialistDomain } from '@/types/specialist';

interface SpecialistTagProps {
  handle: string;
  domain: SpecialistDomain;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'text-[11px] px-2 py-0.5 rounded-md',
  md: 'text-xs px-2.5 py-0.5 rounded-md',
} as const;

export function SpecialistTag({ handle, domain, size = 'sm', className }: SpecialistTagProps) {
  const config = DOMAIN_CONFIGS.find((d) => d.id === domain);

  const bgClass = config?.bgClass ?? 'bg-muted';
  const colorClass = config?.colorClass ?? 'text-muted-foreground';

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium shrink-0',
        bgClass,
        colorClass,
        SIZE_CLASSES[size],
        className,
      )}
    >
      @{handle}
    </span>
  );
}

import { Link } from 'react-router-dom';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertTone = 'destructive' | 'amber' | 'emerald';

interface NavTileProps {
  to?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  category: string;
  title: string;
  description: string;
  chips?: string[];
  alert?: { tone: AlertTone; label: string };
  footer?: string;
  emphasis?: boolean;
}

const ALERT_TONE: Record<AlertTone, string> = {
  destructive: 'text-destructive',
  amber: 'text-amber-600',
  emerald: 'text-emerald-600',
};

export function NavTile({
  to,
  onClick,
  icon,
  category,
  title,
  description,
  chips,
  alert,
  footer,
  emphasis = false,
}: NavTileProps) {
  const inner = (
    <div
      className={cn(
        'group relative h-full rounded-xl border border-border bg-card p-5 flex flex-col',
        'transition-all duration-200 cursor-pointer',
        'hover:shadow-sm hover:bg-accent/30',
        emphasis && 'border-primary/30',
      )}
    >
      {/* Top row: icon + category label + ChevronRight (fades in on hover) */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
          <span className="text-[11px] font-medium tracking-wide">{category}</span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
      </div>

      {/* Title — fixed single line */}
      <h3 className="mb-1 text-[13px] font-semibold text-foreground leading-tight truncate">
        {title}
      </h3>

      {/* Description — fixed 2-line height so content below stays aligned */}
      <p className="mb-3 min-h-[2.5rem] text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
        {description}
      </p>

      {/* Chips — fixed single-row slot */}
      <div className="mb-3 h-5">
        {chips && chips.length > 0 && (
          <div className="flex h-5 items-center gap-1.5 overflow-hidden">
            {chips.slice(0, 3).map((c) => (
              <span
                key={c}
                className="min-w-0 truncate rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/70"
              >
                {c}
              </span>
            ))}
            {chips.length > 3 && (
              <span className="shrink-0 text-[10px] text-muted-foreground/40">
                +{chips.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Alert row — fixed slot */}
      <div className="mb-3 h-4">
        {alert && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11px] font-medium',
              ALERT_TONE[alert.tone],
            )}
          >
            <AlertCircle className="h-3 w-3" />
            {alert.label}
          </span>
        )}
      </div>

      {/* Footer — mt-auto pushes to bottom, matches SpecialistCardNew rhythm */}
      <div className="mt-auto flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
        {footer ?? ''}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {inner}
      </button>
    );
  }
  return inner;
}

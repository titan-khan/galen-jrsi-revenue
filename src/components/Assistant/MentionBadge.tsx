import { BarChart3, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MentionBadgeProps {
  name: string;
  type: 'metric' | 'specialist';
  variant?: 'default' | 'inline';
}

const TYPE_STYLES = {
  metric: { icon: BarChart3, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  specialist: { icon: Users, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
};

export function MentionBadge({ name, type, variant = 'default' }: MentionBadgeProps) {
  const { icon: Icon, color } = TYPE_STYLES[type];

  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-sm font-medium', color)}>
        <Icon className="h-3 w-3" />
        <span>{name}</span>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium', color)}>
      <Icon className="h-3 w-3" />
      <span>@{name}</span>
    </span>
  );
}

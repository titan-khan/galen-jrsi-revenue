import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpecialistTag } from '@/components/ui/specialist-tag';
import type { SpecialistDomain } from '@/types/specialist';

interface CompactCardProps {
  title: string;
  subtitle?: string;
  handle?: string;
  domain?: SpecialistDomain;
  timestamp?: string;
  icon?: React.ReactNode;
  href: string;
}

export const CompactCard = memo(function CompactCard({
  title,
  subtitle,
  handle,
  domain,
  timestamp,
  icon,
  href,
}: CompactCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(href)}
      className="p-3 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all text-left group"
    >
      <div className="flex items-start gap-2">
        {icon && (
          <div className="text-primary shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {title}
          </p>
          {handle && domain ? (
            <div className="mt-1">
              <SpecialistTag handle={handle} domain={domain} size="sm" />
            </div>
          ) : subtitle ? (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {timestamp && (
        <p className="text-xs text-muted-foreground mt-2">
          {timestamp}
        </p>
      )}
    </button>
  );
});

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SpecialistTag } from '@/components/ui/specialist-tag';
import { cn } from '@/lib/utils';
import type { SpecialistDomain } from '@/types/specialist';

interface SimpleListItemProps {
  title: string;
  description?: string;
  specialistName?: string;
  domain?: SpecialistDomain;
  timestamp?: string;
  severity?: 'critical' | 'high' | 'medium' | 'normal';
  ctaLabel?: string;
  href: string;
  onClick?: () => void;
}

export const SimpleListItem = memo(function SimpleListItem({
  title,
  description,
  specialistName,
  domain,
  timestamp,
  severity = 'normal',
  ctaLabel = 'View',
  href,
  onClick,
}: SimpleListItemProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(href);
  };

  return (
    <div 
      className="w-full flex items-center gap-3 py-3 px-3 hover:bg-accent/50 transition-colors group cursor-pointer"
      onClick={handleClick}
    >
      {/* Severity dot */}
      {severity && severity !== 'normal' && (
        <span className={cn(
          'h-2 w-2 rounded-full shrink-0',
          severity === 'critical' && 'bg-red-500',
          severity === 'high' && 'bg-amber-500',
          severity === 'medium' && 'bg-blue-500',
        )} />
      )}

      {/* Handle tag — domain-colored */}
      {specialistName && domain && (
        <SpecialistTag
          handle={specialistName.replace(/^@/, '')}
          domain={domain}
          size="sm"
        />
      )}

      <span className="flex-1 text-sm text-foreground truncate min-w-0">
        {title}
      </span>

      <Button
        variant="outline"
        size="sm"
        className="shrink-0 h-7 text-xs px-3"
        onClick={handleButtonClick}
      >
        {ctaLabel}
      </Button>

      {timestamp && (
        <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
          {timestamp}
        </span>
      )}
    </div>
  );
});

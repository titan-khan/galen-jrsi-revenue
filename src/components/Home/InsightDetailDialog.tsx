import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpecialistTag } from '@/components/ui/specialist-tag';
import { AlertTriangle, TrendingUp, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { SpecialistDomain } from '@/types/specialist';

interface InsightDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'insight' | 'recommendation';
  title: string;
  description?: string;
  specialistName?: string;
  domain?: SpecialistDomain;
  severity?: 'critical' | 'high' | 'medium' | 'normal';
  timestamp?: string;
  href: string;
  ctaLabel?: string;
}

export function InsightDetailDialog({
  open,
  onOpenChange,
  type,
  title,
  description,
  specialistName,
  domain,
  severity = 'normal',
  timestamp,
  href,
  ctaLabel = 'View',
}: InsightDetailDialogProps) {
  const navigate = useNavigate();

  const handleNavigate = () => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3 mb-2">
            {type === 'insight' ? (
              <AlertTriangle className={cn(
                'h-5 w-5 shrink-0 mt-0.5',
                severity === 'critical' && 'text-red-500',
                severity === 'high' && 'text-amber-500',
                severity === 'medium' && 'text-blue-500',
                severity === 'normal' && 'text-muted-foreground',
              )} />
            ) : (
              <TrendingUp className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {specialistName && domain && (
                  <SpecialistTag
                    handle={specialistName.replace(/^@/, '')}
                    domain={domain}
                    size="sm"
                  />
                )}
                {severity && severity !== 'normal' && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-medium h-5 px-1.5',
                      severity === 'critical' && 'text-red-600 bg-red-500/8 border-transparent',
                      severity === 'high' && 'text-amber-600 bg-amber-500/8 border-transparent',
                      severity === 'medium' && 'text-blue-600 bg-blue-500/8 border-transparent',
                    )}
                  >
                    {severity}
                  </Badge>
                )}
                {timestamp && (
                  <span className="text-xs text-muted-foreground">
                    {timestamp}
                  </span>
                )}
              </div>
              <DialogTitle className="text-base font-semibold text-foreground leading-snug">
                {title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {description && (
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {description}
          </DialogDescription>
        )}

        <div className="flex items-center justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            size="sm"
            onClick={handleNavigate}
            className="gap-1.5"
          >
            {ctaLabel}
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

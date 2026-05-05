import { X, Lightbulb, Zap, BarChart3, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { InsightItem, InsightType } from '@/types/insight';

const typeConfig: Record<InsightType, { icon: typeof Lightbulb; label: string; color: string }> = {
  'key-insight': {
    icon: Lightbulb,
    label: 'Insight',
    color: 'text-amber-500 bg-amber-500/10',
  },
  action: {
    icon: Zap,
    label: 'Action',
    color: 'text-blue-500 bg-blue-500/10',
  },
  chart: {
    icon: BarChart3,
    label: 'Chart',
    color: 'text-emerald-500 bg-emerald-500/10',
  },
};

interface InsightCardProps {
  insight: InsightItem;
  onRemove?: (id: string) => void;
  onClick?: (id: string) => void;
  onEdit?: (insight: InsightItem) => void;
  /** Show checkbox for report builder mode */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function InsightCard({
  insight,
  onRemove,
  onClick,
  onEdit,
  selectable,
  selected,
  onToggleSelect,
}: InsightCardProps) {
  const config = typeConfig[insight.type];
  const Icon = config.icon;
  // Manual note: created by user (no source message) and explicitly not auto-detected
  const isManualNote = insight.autoDetected === false && !insight.sourceMessageId;

  return (
    <div
      className={cn(
        'group relative flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors cursor-pointer',
        'hover:bg-muted/50',
        selected && 'border-primary/40 bg-primary/5'
      )}
      onClick={() => {
        if (selectable) onToggleSelect?.(insight.id);
        else onClick?.(insight.id);
      }}
    >
      {/* Checkbox for report builder */}
      {selectable && (
        <div className="flex items-center pt-0.5">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(insight.id)}
            className="h-3.5 w-3.5 rounded border-muted-foreground/30"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Type icon */}
      <div className={cn('flex-shrink-0 rounded-md p-1.5', config.color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">
          {insight.title}
        </p>
        {insight.description && (
          <div 
            className="text-xs text-muted-foreground mt-0.5 line-clamp-2 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: insight.description }}
          />
        )}
      </div>

      {/* Action buttons */}
      {!selectable && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {/* Edit button for manual notes */}
          {isManualNote && onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(insight);
              }}
              title="Edit note"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
          
          {/* Remove button */}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(insight.id);
              }}
              title="Remove"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

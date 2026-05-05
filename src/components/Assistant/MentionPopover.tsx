import { useEffect, useState, useCallback, useMemo } from 'react';
import { BarChart3, Search, Users } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { MentionableEntity } from '@/types/assistant';

// Domain label formatting
const DOMAIN_LABELS: Record<string, string> = {
  'supply-chain': 'Supply Chain',
  'commercial': 'Commercial',
  'customer': 'Customer',
  'finance': 'Finance',
  'revenue': 'Revenue',
  'customers': 'Customers',
  'operations': 'Operations',
  'product': 'Product',
};

const DOMAIN_COLORS: Record<string, { text: string; bg: string }> = {
  'supply-chain': { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  'commercial': { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  'customer': { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  'finance': { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  'revenue': { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  'customers': { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  'operations': { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  'product': { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
};

const TYPE_CONFIG = {
  metric: { icon: BarChart3, label: 'Metric', colorClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-500/10' },
  specialist: { icon: Users, label: 'Specialist', colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-500/10' },
};

interface MentionPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entities: MentionableEntity[];
  onSelect: (entity: MentionableEntity) => void;
  searchQuery: string;
  anchorRef: React.RefObject<HTMLElement>;
}

export function MentionPopover({
  open,
  onOpenChange,
  entities,
  onSelect,
  searchQuery,
  anchorRef
}: MentionPopoverProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredEntities = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return entities;
    return entities.filter((e) => {
      const nameMatch = e.name.toLowerCase().includes(query);
      const domainMatch = e.domain ? DOMAIN_LABELS[e.domain]?.toLowerCase().includes(query) : false;
      const descMatch = e.description?.toLowerCase().includes(query);
      return nameMatch || domainMatch || descMatch;
    });
  }, [searchQuery, entities]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredEntities.length, searchQuery]);

  const metrics = filteredEntities.filter((e) => e.type === 'metric');
  const specialists = filteredEntities.filter((e) => e.type === 'specialist');

  // Flatten for keyboard navigation
  const allFiltered = [...metrics, ...specialists];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < allFiltered.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : allFiltered.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        if (allFiltered[highlightedIndex]) {
          e.preventDefault();
          onSelect(allFiltered[highlightedIndex]);
        }
        break;
    }
  }, [open, allFiltered, highlightedIndex, onSelect]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderEntity = (entity: MentionableEntity, globalIdx: number) => {
    const config = TYPE_CONFIG[entity.type];
    const Icon = config.icon;
    const domainLabel = entity.domain ? DOMAIN_LABELS[entity.domain] || entity.domain : null;
    const domainColor = entity.domain ? DOMAIN_COLORS[entity.domain] : null;

    return (
      <CommandItem
        key={entity.id}
        onSelect={() => onSelect(entity)}
        className={cn(
          'gap-3 cursor-pointer rounded-md',
          highlightedIndex === globalIdx && 'bg-accent'
        )}
      >
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-md shrink-0', config.bgClass)}>
          <Icon className={cn('h-4 w-4', config.colorClass)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{entity.name}</p>
            {domainLabel && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
                domainColor?.bg || 'bg-muted',
                domainColor?.text || 'text-muted-foreground'
              )}>
                {domainLabel}
              </span>
            )}
          </div>
          {entity.description && (
            <p className="text-xs text-muted-foreground truncate">{entity.description}</p>
          )}
          {!entity.description && (
            <p className="text-xs text-muted-foreground">{config.label}</p>
          )}
        </div>
      </CommandItem>
    );
  };

  // Calculate global indices for each group
  let indexOffset = 0;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <span ref={anchorRef as React.RefObject<HTMLSpanElement>} />
      </PopoverAnchor>
      <PopoverContent
        className="w-[360px] p-0 bg-popover border shadow-lg"
        align="start"
        side="top"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <Command className="bg-transparent">
          {/* Search header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              @{searchQuery || 'Search metrics or specialists...'}
            </span>
          </div>

          <CommandList className="max-h-[320px]">
            {allFiltered.length === 0 ? (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                No matches found
              </CommandEmpty>
            ) : (
              <>
                {metrics.length > 0 && (
                  <CommandGroup heading={`Metrics (${metrics.length})`} className="px-2">
                    {metrics.map((entity, idx) => {
                      const globalIdx = idx;
                      return renderEntity(entity, globalIdx);
                    })}
                  </CommandGroup>
                )}
                {(() => { indexOffset = metrics.length; return null; })()}
                {specialists.length > 0 && (
                  <CommandGroup heading={`Specialists (${specialists.length})`} className="px-2">
                    {specialists.map((entity, idx) => {
                      const globalIdx = indexOffset + idx;
                      return renderEntity(entity, globalIdx);
                    })}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>

          {/* Footer hint */}
          <div className="px-3 py-2 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">↑↓</kbd>
              {' '}navigate{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd>
              {' '}select{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Esc</kbd>
              {' '}dismiss
            </p>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

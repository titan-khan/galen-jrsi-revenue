import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  getDimensionsForBusinessView,
  getDimensionLabel,
} from '@/data/pkbRegistry';
import type { BusinessView } from '@/types/specialist';

interface DimensionChipsProps {
  label: string;
  sublabel?: string;
  businessView: BusinessView | null;
  dimensions: string[];
  onChange: (dimensions: string[]) => void;
}

export const DimensionChips = ({
  label,
  sublabel,
  businessView,
  dimensions,
  onChange,
}: DimensionChipsProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAdding) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAdding(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isAdding]);

  const available = useMemo(
    () => getDimensionsForBusinessView(businessView),
    [businessView],
  );

  const selected = new Set(dimensions);
  const suggestions = available.filter(
    (d) =>
      !selected.has(d.id) &&
      (search === '' ||
        d.label.toLowerCase().includes(search.toLowerCase()) ||
        d.id.toLowerCase().includes(search.toLowerCase())),
  );

  const handleRemove = (id: string) => {
    onChange(dimensions.filter((d) => d !== id));
  };

  const handleSelect = (id: string) => {
    if (selected.has(id)) return;
    onChange([...dimensions, id]);
    setSearch('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsAdding(false);
      setSearch('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {dimensions.map((id) => {
          const def = available.find((d) => d.id === id);
          const labelText = def?.label ?? getDimensionLabel(id);
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400"
            >
              {labelText}
              <button
                type="button"
                onClick={() => handleRemove(id)}
                className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${labelText}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}

        <div className="relative" ref={dropdownRef}>
          {isAdding ? (
            <div>
              <div className="flex items-center gap-1 border rounded-lg bg-background px-2 h-8">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search dimensions..."
                  className="border-0 h-auto p-0 text-sm focus-visible:ring-0 shadow-none w-44"
                  autoFocus
                />
              </div>
              <div className="absolute z-50 top-full mt-1 left-0 w-72 max-h-56 overflow-y-auto rounded-lg border bg-popover shadow-md">
                {suggestions.length > 0 ? (
                  suggestions.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleSelect(d.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{d.label}</span>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0 uppercase">
                        {d.dataType}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    {available.length === 0
                      ? 'Select a business view to see dimensions'
                      : 'No matching dimensions'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              disabled={available.length === 0}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border border-dashed transition-colors',
                available.length === 0
                  ? 'border-muted-foreground/20 text-muted-foreground/40 cursor-not-allowed'
                  : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

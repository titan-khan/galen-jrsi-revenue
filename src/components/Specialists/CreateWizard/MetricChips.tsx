import { useState, useRef, useEffect } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MetricConfig } from '@/types/specialist';
import { metricsData } from '@/data/metricsData';

// Build a list of all available metric names from metricsData (the DB metrics catalog)
const ALL_DB_METRICS: { id: string; name: string; domain?: string }[] = metricsData.map((m) => ({
  id: m.id,
  name: m.name,
  domain: m.domain,
}));

interface MetricChipsProps {
  label: string;
  sublabel?: string;
  metrics: MetricConfig[];
  onChange: (metrics: MetricConfig[]) => void;
  accentColor?: string;
}

export const MetricChips = ({
  label,
  sublabel,
  metrics,
  onChange,
  accentColor = 'bg-primary/10 text-primary',
}: MetricChipsProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
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

  const handleRemove = (id: string) => {
    onChange(metrics.filter((m) => m.id !== id));
  };

  const handleSelectMetric = (item: { id: string; name: string }) => {
    // Don't add duplicates
    if (metrics.some((m) => m.name === item.name)) return;
    const metric: MetricConfig = {
      id: item.id,
      name: item.name,
      isCustom: false,
    };
    onChange([...metrics, metric]);
    setSearch('');
    setIsAdding(false);
  };

  const handleAddCustom = () => {
    if (!search.trim()) return;
    // Don't add duplicates
    if (metrics.some((m) => m.name.toLowerCase() === search.trim().toLowerCase())) return;
    const metric: MetricConfig = {
      id: `custom-${Date.now()}`,
      name: search.trim(),
      isCustom: true,
    };
    onChange([...metrics, metric]);
    setSearch('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustom();
    }
    if (e.key === 'Escape') {
      setIsAdding(false);
      setSearch('');
    }
  };

  // Filter suggestions: exclude already-selected, match search query
  const selectedNames = new Set(metrics.map((m) => m.name.toLowerCase()));
  const suggestions = ALL_DB_METRICS.filter(
    (m) =>
      !selectedNames.has(m.name.toLowerCase()) &&
      (search === '' || m.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {sublabel && (
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {metrics.map((metric) => (
          <span
            key={metric.id}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
              metric.isCustom
                ? 'bg-muted text-foreground border border-dashed border-muted-foreground/30'
                : accentColor,
            )}
          >
            {metric.name}
            <button
              onClick={() => handleRemove(metric.id)}
              className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Add button / Dropdown */}
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
                  placeholder="Search metrics..."
                  className="border-0 h-auto p-0 text-sm focus-visible:ring-0 shadow-none w-36"
                  autoFocus
                />
              </div>

              {/* Dropdown list */}
              <div className="absolute z-50 top-full mt-1 left-0 w-64 max-h-48 overflow-y-auto rounded-lg border bg-popover shadow-md">
                {suggestions.length > 0 ? (
                  suggestions.slice(0, 12).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectMetric(item)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{item.name}</span>
                      {item.domain && (
                        <span className="text-[10px] text-muted-foreground/60 shrink-0">
                          {item.domain}
                        </span>
                      )}
                    </button>
                  ))
                ) : search.trim() ? (
                  <button
                    onClick={handleAddCustom}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors text-primary"
                  >
                    <Plus className="h-3.5 w-3.5 inline mr-1.5" />
                    Add "{search.trim()}" as custom
                  </button>
                ) : (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No metrics available</p>
                )}

                {/* Always show custom add option if search has text and there are suggestions */}
                {search.trim() && suggestions.length > 0 && !suggestions.some(s => s.name.toLowerCase() === search.toLowerCase()) && (
                  <div className="border-t">
                    <button
                      onClick={handleAddCustom}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors text-muted-foreground"
                    >
                      <Plus className="h-3.5 w-3.5 inline mr-1.5" />
                      Add "{search.trim()}" as custom
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-muted-foreground border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:text-foreground transition-colors"
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

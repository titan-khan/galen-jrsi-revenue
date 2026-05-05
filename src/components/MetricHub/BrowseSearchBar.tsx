import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MetricDomain } from '@/types/metric';

interface BrowseSearchBarProps {
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  categories: MetricDomain[];
}

export function BrowseSearchBar({
  onSearchChange,
  onCategoryChange,
  categories,
}: BrowseSearchBarProps) {
  const [query, setQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, onSearchChange]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search input */}
      <div className="relative flex-1 max-w-[480px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          placeholder="Search metrics by name, description, or domain..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-9 text-[13px]"
        />
      </div>

      {/* Category filter */}
      <Select defaultValue="all" onValueChange={onCategoryChange}>
        <SelectTrigger className="h-9 w-[160px] text-[13px] border-border bg-background px-2.5">
          <SelectValue placeholder="All Domains" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-[13px]">
            All Domains
          </SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat} className="text-[13px]">
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

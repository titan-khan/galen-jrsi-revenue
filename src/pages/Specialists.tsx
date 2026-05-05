import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowUpDown, SlidersHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSpecialists } from '@/contexts/SpecialistsContext';
import { SpecialistCardNew } from '@/components/Specialists/SpecialistCardNew';
import { useSpecialistSummaries } from '@/hooks/useSpecialistSummaries';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { SpecialistDomain, SpecialistStatus } from '@/types/specialist';

type StatusFilter = 'all' | SpecialistStatus;
type DomainFilter = 'all' | SpecialistDomain;
type SortOption = 'recent' | 'name' | 'newest' | 'issues';

const DOMAIN_LABELS: Record<SpecialistDomain, string> = {
  'supply-chain': 'Operations',
  commercial: 'Revenue',
  customer: 'Customer',
  finance: 'Finance',
};

const Specialists = () => {
  const navigate = useNavigate();
  const { specialists, isLoading } = useSpecialists();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Batch-fetch summaries for all specialists
  const specialistIds = useMemo(() => specialists.map((s) => s.id), [specialists]);
  const { summaries } = useSpecialistSummaries(specialistIds);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...specialists];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.handle.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Domain filter
    if (domainFilter !== 'all') {
      result = result.filter((s) => s.domain === domainFilter);
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => {
          const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
          const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
          return bTime - aTime;
        });
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'issues': {
        result.sort((a, b) => {
          const aSum = summaries[a.id];
          const bSum = summaries[b.id];
          const aScore = (aSum?.criticalInsights || 0) * 3 + (aSum?.highInsights || 0) * 2 + (aSum?.pendingActions || 0);
          const bScore = (bSum?.criticalInsights || 0) * 3 + (bSum?.highInsights || 0) * 2 + (bSum?.pendingActions || 0);
          return bScore - aScore;
        });
        break;
      }
    }

    return result;
  }, [specialists, searchQuery, statusFilter, domainFilter, sortBy, summaries]);

  // Status counts
  const counts = useMemo(() => {
    const c = { total: specialists.length, active: 0, paused: 0 };
    specialists.forEach((s) => {
      if (s.status === 'active') c.active++;
      else if (s.status === 'paused') c.paused++;
    });
    return c;
  }, [specialists]);

  // Unique domains present
  const availableDomains = useMemo(() => {
    const domains = new Set(specialists.map((s) => s.domain));
    return Array.from(domains).sort() as SpecialistDomain[];
  }, [specialists]);

  const hasActiveFilters = statusFilter !== 'all' || domainFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-border bg-background">
        <h1 className="text-xl font-semibold text-foreground mb-1">Spesialis</h1>
        <p className="text-[13px] text-muted-foreground/70">
          Agen AI yang memantau operasi keselamatan jalan dan santunan 24/7
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          {/* Search + Filters + New */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari spesialis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-[13px]"
              />
            </div>

            {/* Status pills */}
            <div className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5">
              {(['all', 'active', 'paused'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-3 py-1 rounded-md text-[11px] font-medium transition-all',
                    statusFilter === s
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground/80',
                  )}
                >
                  {s === 'all' ? 'Semua' : s === 'active' ? 'Aktif' : 'Dijeda'}
                </button>
              ))}
            </div>

            {/* Domain filter */}
            {availableDomains.length > 1 && (
              <Select
                value={domainFilter}
                onValueChange={(v) => setDomainFilter(v as DomainFilter)}
              >
                <SelectTrigger className="h-9 w-auto min-w-[120px] text-[12px] gap-1.5">
                  <SlidersHorizontal className="h-3 w-3 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[12px]">Semua Domain</SelectItem>
                  {availableDomains.map((d) => (
                    <SelectItem key={d} value={d} className="text-[12px]">
                      {DOMAIN_LABELS[d] || d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Sort */}
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
              <SelectTrigger className="h-9 w-auto min-w-[140px] text-[12px] gap-1.5">
                <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent" className="text-[12px]">Aktif Terbaru</SelectItem>
                <SelectItem value="newest" className="text-[12px]">Paling Baru</SelectItem>
                <SelectItem value="name" className="text-[12px]">Nama A–Z</SelectItem>
                <SelectItem value="issues" className="text-[12px]">Paling Banyak Isu</SelectItem>
              </SelectContent>
            </Select>

            {/* New Specialist */}
            <Button
              size="sm"
              className="h-9 gap-1.5 text-[13px] ml-auto"
              onClick={() => navigate('/specialists/new')}
            >
              <Plus className="h-3.5 w-3.5" />
              Spesialis Baru
            </Button>
          </div>

          {/* Status bar */}
          {!isLoading && (
            <div className="flex items-center gap-4 mb-5 text-xs text-muted-foreground/60">
              <span className="font-medium text-foreground/80">
                {hasActiveFilters ? `${filtered.length} dari ${counts.total}` : `${counts.total} Total`}
              </span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {counts.active} Aktif
              </span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                {counts.paused} Dijeda
              </span>
            </div>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-[170px] rounded-xl" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((specialist) => (
                <SpecialistCardNew
                  key={specialist.id}
                  specialist={specialist}
                  summary={summaries[specialist.id]}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              {hasActiveFilters ? (
                <>
                  <Search className="h-10 w-10 text-muted-foreground/15 mb-3" />
                  <p className="text-[13px] text-muted-foreground/60 mb-2">
                    Tidak ada spesialis yang cocok dengan filter
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setDomainFilter('all');
                    }}
                  >
                    Hapus filter
                  </Button>
                </>
              ) : (
                <>
                  <Users className="h-10 w-10 text-muted-foreground/15 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground/70 mb-1">
                    Belum ada spesialis
                  </p>
                  <p className="text-xs text-muted-foreground/50 mb-4 max-w-xs text-center">
                    Spesialis adalah agen AI yang terus memantau metrik Anda, mendeteksi anomali, dan memberi rekomendasi tindakan.
                  </p>
                  <Button
                    size="sm"
                    className="gap-1.5 text-[13px]"
                    onClick={() => navigate('/specialists/new')}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Buat spesialis pertama Anda
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Specialists;

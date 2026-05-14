import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { WORKLIST_STATS } from '@/data/riskLensData';

interface RiskLensShellProps {
  children: React.ReactNode;
}

const TABS = [
  { id: 'worklist', label: 'Worklist', href: '/research/risk-lens' },
  { id: 'sources', label: 'Sources', href: '/research/risk-lens/pipeline' },
  { id: 'cost', label: 'Cost', href: '/research/risk-lens/pipeline/cost' },
  { id: 'trace', label: 'Trace', href: '/research/risk-lens/pipeline/signal-trace' },
  { id: 'discovery', label: 'Discovery', href: '/research/risk-lens/pipeline/discovery' },
] as const;

function matchesTab(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // Sources tab also owns the per-connector detail route
  if (
    href === '/research/risk-lens/pipeline' &&
    pathname.startsWith('/research/risk-lens/pipeline/connector/')
  ) {
    return true;
  }
  return false;
}

export function RiskLensShell({ children }: RiskLensShellProps) {
  const { pathname } = useLocation();
  const activeId = TABS.find((t) => matchesTab(pathname, t.href))?.id ?? 'worklist';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="flex items-center gap-2 text-xs">
          <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-1 -ml-2">
            <Link to="/research">
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Research
            </Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">Risk Lens</span>
        </div>
      </div>

      {/* Page header + tabs */}
      <div className="border-b border-border bg-background px-6 pt-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Risk Lens · Jasa Raharja</h1>
          <span className="text-xs text-muted-foreground">
            Tier 2 · partial · Last refresh {WORKLIST_STATS.lastRefresh}
          </span>
        </div>
        <nav className="-mb-px flex gap-1" role="tablist" aria-label="Risk Lens sections">
          {TABS.map((tab) => {
            const active = tab.id === activeId;
            return (
              <Link
                key={tab.id}
                to={tab.href}
                role="tab"
                aria-selected={active}
                className={cn(
                  'inline-flex items-center border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}

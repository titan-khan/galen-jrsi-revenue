import { Database, Table } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PKB_DATA_SOURCES, type PkbTableCategory } from '@/data/pkbRegistry';

interface DataSourceEvidenceProps {
  content: string;
  className?: string;
}

interface DataSource {
  table: string;
  displayName: string;
  description: string;
  category: 'fact' | 'dimension' | 'metadata' | 'agent';
}

// Map PKB registry category → DataSourceEvidence display category.
// Knowledge / governance / reference are all visually grouped as "metadata"
// chips in this component (the existing UI only renders 4 categories).
function mapCategory(c: PkbTableCategory): DataSource['category'] {
  if (c === 'fact') return 'fact';
  if (c === 'dimension') return 'dimension';
  return 'metadata'; // reference / governance / knowledge
}

// Build TABLE_MAPPINGS from the single PKB registry — DataSourceEvidence,
// SpecialistsContext, and the assistant edge function all reference the same
// canonical list of tables, so adding a new table only requires updating
// PKB_DATA_SOURCES.
const TABLE_MAPPINGS: Record<string, Omit<DataSource, 'table'>> =
  Object.fromEntries(
    PKB_DATA_SOURCES.map((d) => [
      d.table,
      {
        displayName: d.displayName,
        description: d.description,
        category: mapCategory(d.category),
      },
    ]),
  );

// Detect tables referenced in the content (explicit table names only — no broad keyword fallback)
function detectDataSources(content: string): DataSource[] {
  const sources: DataSource[] = [];
  const seenTables = new Set<string>();

  for (const [table, info] of Object.entries(TABLE_MAPPINGS)) {
    // Match the qualified name "schema.table" (escape the dot) or the display name
    const escapedTable = table.replace(/\./g, '\\.');
    const patterns = [
      new RegExp(`\\b${escapedTable}\\b`, 'i'),
      new RegExp(`\\b${info.displayName}\\b`, 'i'),
    ];

    const hasMatch = patterns.some((pattern) => pattern.test(content));

    if (hasMatch && !seenTables.has(table)) {
      sources.push({ table, ...info });
      seenTables.add(table);
    }
  }

  return sources;
}

export function DataSourceEvidence({ content, className }: DataSourceEvidenceProps) {
  const sources = detectDataSources(content);

  if (sources.length === 0) {
    return null;
  }

  // Group sources by category
  const groupedSources = sources.reduce((acc, source) => {
    if (!acc[source.category]) {
      acc[source.category] = [];
    }
    acc[source.category].push(source);
    return acc;
  }, {} as Record<string, DataSource[]>);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Database className="h-3 w-3" />
        <span className="font-medium">Data Sources:</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {/* Fact Tables */}
        {groupedSources.fact?.map((source) => (
          <TooltipProvider key={source.table}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-help',
                    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25'
                  )}
                >
                  <Table className="h-3 w-3" />
                  <span>{source.displayName}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{source.displayName}</p>
                  <p className="text-xs text-muted-foreground">{source.description}</p>
                  <p className="text-xs font-mono text-muted-foreground">Table: {source.table}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {/* Dimension Tables */}
        {groupedSources.dimension?.map((source) => (
          <TooltipProvider key={source.table}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-help',
                    'bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25'
                  )}
                >
                  <Table className="h-3 w-3" />
                  <span>{source.displayName}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{source.displayName}</p>
                  <p className="text-xs text-muted-foreground">{source.description}</p>
                  <p className="text-xs font-mono text-muted-foreground">Table: {source.table}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {/* Agent Tables */}
        {groupedSources.agent?.map((source) => (
          <TooltipProvider key={source.table}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-help',
                    'bg-purple-500/15 text-purple-700 dark:text-purple-400 hover:bg-purple-500/25'
                  )}
                >
                  <Table className="h-3 w-3" />
                  <span>{source.displayName}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{source.displayName}</p>
                  <p className="text-xs text-muted-foreground">{source.description}</p>
                  <p className="text-xs font-mono text-muted-foreground">Table: {source.table}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {/* Metadata Tables */}
        {groupedSources.metadata?.map((source) => (
          <TooltipProvider key={source.table}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-help',
                    'bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25'
                  )}
                >
                  <Table className="h-3 w-3" />
                  <span>{source.displayName}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{source.displayName}</p>
                  <p className="text-xs text-muted-foreground">{source.description}</p>
                  <p className="text-xs font-mono text-muted-foreground">Table: {source.table}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

      </div>
    </div>
  );
}

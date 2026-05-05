import { Database, Table } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

// Mapping tabel database ke nama yang user-friendly (JRSI)
const TABLE_MAPPINGS: Record<string, Omit<DataSource, 'table'>> = {
  // Fact Tables
  'jrsi irsms example': {
    displayName: 'IRSMS Kecelakaan',
    description: 'Data kecelakaan lalu lintas IRSMS — 317 records, Kalimantan Tengah',
    category: 'fact',
  },
  'kecelakaan': {
    displayName: 'IRSMS Kecelakaan',
    description: 'Data kecelakaan lalu lintas IRSMS',
    category: 'fact',
  },

  // Metadata Tables
  'metric_definitions': {
    displayName: 'Metric Definitions',
    description: '31 metrik JRSI — accident overview, financial, vehicle, TRL, 4M, data quality',
    category: 'metadata',
  },
  'workspaces': {
    displayName: 'Workspaces',
    description: 'Workspace configuration — JRSI, KPR Banking',
    category: 'metadata',
  },

  // Agent Tables
  'agents': {
    displayName: 'Specialists',
    description: 'AI specialists untuk monitoring kecelakaan',
    category: 'agent',
  },
  'agent_runs': {
    displayName: 'Agent Runs',
    description: 'Riwayat eksekusi specialist',
    category: 'agent',
  },
};

// Deteksi tabel yang disebutkan dalam konten
function detectDataSources(content: string): DataSource[] {
  const sources: DataSource[] = [];
  const seenTables = new Set<string>();

  // Cari referensi tabel dalam konten
  for (const [table, info] of Object.entries(TABLE_MAPPINGS)) {
    // Cek apakah tabel disebutkan secara eksplisit atau implisit
    const patterns = [
      new RegExp(`\\b${table}\\b`, 'i'), // Nama tabel eksplisit
      new RegExp(`\\b${info.displayName}\\b`, 'i'), // Display name
    ];

    // Tambahan pattern untuk deteksi kontekstual (JRSI)
    const contextPatterns: Record<string, RegExp[]> = {
      'jrsi irsms example': [/kecelakaan|laka|korban|meninggal|luka|fatalitas|severity|tabrak|kendaraan|sepeda motor|kabupaten|kecamatan|provinsi|palangka|kalteng|santunan|klaim|cluster|blackspot|trl|4m|man|machine|medium|method|cause/i],
      'kecelakaan': [/kecelakaan|accident|laka lantas|korban|MD|LL/i],
      'metric_definitions': [/metric|metrik|definition|formula|dashboard/i],
      'agents': [/specialist|agent|monitor|analys/i],
    };

    const hasMatch = patterns.some((pattern) => pattern.test(content));
    const hasContext = contextPatterns[table]?.some((pattern) => pattern.test(content));

    if ((hasMatch || hasContext) && !seenTables.has(table)) {
      sources.push({
        table,
        ...info,
      });
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

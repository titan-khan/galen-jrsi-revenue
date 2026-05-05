import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDataConnector } from '@/contexts/DataConnectorContext';
import { ConnectorCard } from '@/components/DataConnector/ConnectorCard';
import { DataSourceCard } from '@/components/DataConnector/DataSourceCard';
import { connectorDefinitions, connectorCategories } from '@/data/connectorData';
import { cn } from '@/lib/utils';
import type { ConnectorCategory } from '@/types/dataConnector';

const DataConnector = () => {
  const navigate = useNavigate();
  const { dataSources, removeDataSource } = useDataConnector();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ConnectorCategory>('all');

  const filteredConnectors = useMemo(() => {
    let result = [...connectorDefinitions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter((c) => c.category === categoryFilter);
    }

    // Sort: available first, then coming soon
    result.sort((a, b) => {
      if (a.status === 'available' && b.status !== 'available') return -1;
      if (a.status !== 'available' && b.status === 'available') return 1;
      return 0;
    });

    return result;
  }, [searchQuery, categoryFilter]);

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-border bg-background">
        <h1 className="text-xl font-semibold text-foreground mb-1">Data Connector</h1>
        <p className="text-[13px] text-muted-foreground/70">
          Connect your data sources to start analyzing metrics
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          {/* Search + Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search connectors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-[13px]"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5">
              {connectorCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={cn(
                    'px-3 py-1 rounded-md text-[11px] font-medium transition-all',
                    categoryFilter === cat.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground/80',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Connector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {filteredConnectors.map((connector) => (
              <ConnectorCard key={connector.id} connector={connector} />
            ))}
          </div>

          {filteredConnectors.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Search className="h-10 w-10 text-muted-foreground/15 mb-3" />
              <p className="text-[13px] text-muted-foreground/60 mb-2">
                No connectors match your search
              </p>
              <Button
                variant="link"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                }}
              >
                Clear filters
              </Button>
            </div>
          )}

          {/* Separator */}
          <div className="border-t border-border my-2" />

          {/* Data Sources Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Your Data Sources</h2>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  Uploaded datasets ready for analysis
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-[12px]"
                onClick={() => navigate('/data-connector/csv-upload')}
              >
                <Plus className="h-3 w-3" />
                Upload CSV
              </Button>
            </div>

            {dataSources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dataSources.map((source) => (
                  <DataSourceCard
                    key={source.id}
                    dataSource={source}
                    onRemove={removeDataSource}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-border bg-muted/20">
                <Database className="h-10 w-10 text-muted-foreground/15 mb-3" />
                <p className="text-sm font-medium text-muted-foreground/70 mb-1">
                  No data sources yet
                </p>
                <p className="text-xs text-muted-foreground/50 mb-4 max-w-xs text-center">
                  Upload a CSV file to import your data and start tracking metrics.
                </p>
                <Button
                  size="sm"
                  className="gap-1.5 text-[13px]"
                  onClick={() => navigate('/data-connector/csv-upload')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Upload your first dataset
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataConnector;

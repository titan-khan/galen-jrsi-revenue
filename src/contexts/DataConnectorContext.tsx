import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { DataSource, ColumnMapping } from '@/types/dataConnector';
import {
  fetchDataSources as fetchFromSupabase,
  createDataSource as createInSupabase,
  createDataSourceWithTargetTable as createWithTarget,
  deleteDataSource as deleteFromSupabase,
} from '@/services/dataConnectorService';

interface DataConnectorContextValue {
  dataSources: DataSource[];
  addDataSource: (
    source: Omit<DataSource, 'id' | 'uploadedAt'>,
    rows: Record<string, string>[],
  ) => Promise<void>;
  addDataSourceToTable: (
    source: Omit<DataSource, 'id' | 'uploadedAt'> & {
      targetTable: string;
      columnMappings: ColumnMapping[];
    },
    rows: Record<string, unknown>[],
  ) => Promise<void>;
  removeDataSource: (id: string) => Promise<void>;
  isLoading: boolean;
  isSubmitting: boolean;
}

const DataConnectorContext = createContext<DataConnectorContextValue | undefined>(undefined);

export function DataConnectorProvider({ children }: { children: ReactNode }) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data sources from Supabase on mount
  useEffect(() => {
    fetchFromSupabase()
      .then(setDataSources)
      .catch((err) => console.error('Failed to load data sources:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const addDataSource = useCallback(
    async (source: Omit<DataSource, 'id' | 'uploadedAt'>, rows: Record<string, string>[]) => {
      setIsSubmitting(true);
      try {
        await createInSupabase(source, rows);
        const updated = await fetchFromSupabase();
        setDataSources(updated);
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const addDataSourceToTable = useCallback(
    async (
      source: Omit<DataSource, 'id' | 'uploadedAt'> & {
        targetTable: string;
        columnMappings: ColumnMapping[];
      },
      rows: Record<string, unknown>[],
    ) => {
      setIsSubmitting(true);
      try {
        await createWithTarget(source, rows);
        const updated = await fetchFromSupabase();
        setDataSources(updated);
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const removeDataSource = useCallback(async (id: string) => {
    await deleteFromSupabase(id);
    setDataSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <DataConnectorContext.Provider
      value={{
        dataSources,
        addDataSource,
        addDataSourceToTable,
        removeDataSource,
        isLoading,
        isSubmitting,
      }}
    >
      {children}
    </DataConnectorContext.Provider>
  );
}

export function useDataConnector() {
  const context = useContext(DataConnectorContext);
  if (!context) {
    throw new Error('useDataConnector must be used within a DataConnectorProvider');
  }
  return context;
}

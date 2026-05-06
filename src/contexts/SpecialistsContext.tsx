import { createContext, useContext, useRef, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Operations Center context - manages specialists state
import {
  Specialist,
  SpecialistTemplate,
  DomainConfig,
  TeamPerformance,
  BusinessViewConfig,
  UseCase,
} from '@/types/specialist';
import {
  fetchSpecialists as fetchSpecialistsFromDb,
  createSpecialist as createSpecialistInDb,
  updateSpecialistDb,
  deleteAgentDb,
} from '@/services/agentsService';
import { cacheKeys } from '@/lib/cacheKeys';
import { QUERY_CONFIGS } from '@/lib/queryClient';
import { ContextErrorBoundary } from '@/components/ErrorBoundaries';
// PKB pilot registry — single source of truth for templates, business views,
// use cases, segments, and the data-source catalog.
import {
  PKB_DOMAIN_CONFIGS,
  PKB_BUSINESS_VIEW_CONFIGS,
  PKB_USE_CASE_CATALOG,
  PKB_SPECIALIST_TEMPLATES,
} from '@/data/pkbRegistry';

// Domain configurations — sourced from the PKB registry. Re-exported under
// the legacy name so existing consumers keep working unchanged.
export const DOMAIN_CONFIGS: DomainConfig[] = PKB_DOMAIN_CONFIGS;

// Specialist templates — sourced from the PKB registry. Re-exported under
// the legacy name so existing consumers keep working unchanged.
export const SPECIALIST_TEMPLATES: SpecialistTemplate[] = PKB_SPECIALIST_TEMPLATES;

// Business view configs — sourced from the PKB registry.
export const BUSINESS_VIEW_CONFIGS: BusinessViewConfig[] = PKB_BUSINESS_VIEW_CONFIGS;

// Use case catalog — sourced from the PKB registry.
export const USE_CASE_CATALOG: UseCase[] = PKB_USE_CASE_CATALOG;

interface SpecialistsContextType {
  specialists: Specialist[];
  templates: SpecialistTemplate[];
  domainConfigs: DomainConfig[];
  businessViewConfigs: BusinessViewConfig[];
  useCaseCatalog: UseCase[];
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  addSpecialist: (specialist: Omit<Specialist, 'id' | 'createdAt'>) => Promise<string>;
  updateSpecialist: (id: string, updates: Partial<Specialist>) => Promise<void>;
  deleteSpecialist: (id: string) => Promise<void>;
  getSpecialistById: (id: string) => Specialist | undefined;
  getTemplateById: (id: string) => SpecialistTemplate | undefined;
  getDomainConfig: (domain: string) => DomainConfig | undefined;
  getTeamPerformance: () => TeamPerformance;
  refetch: () => Promise<void>;
}

const SpecialistsContext = createContext<SpecialistsContextType | undefined>(undefined);

export function SpecialistsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const pendingSpecialistsRef = useRef<Specialist[]>([]);

  // Use React Query for fetching specialists
  const {
    data: specialists = [],
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: cacheKeys.specialists.list(),
    queryFn: fetchSpecialistsFromDb,
    ...QUERY_CONFIGS.specialists.list,
    // Keep previous data while fetching new data (SWR pattern - Requirement 2.1, 2.2)
    placeholderData: (previousData) => previousData,
  });

  // Track if background revalidation is happening (SWR pattern)
  const isValidating = isFetching && !isLoading;

  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load specialists') : null;

  // Mutation for adding a specialist
  const addMutation = useMutation({
    mutationFn: async (specialistData: Omit<Specialist, 'id' | 'createdAt'>) => {
      const newId = await createSpecialistInDb(specialistData);
      return {
        ...specialistData,
        id: newId,
        createdAt: new Date().toISOString(),
      } as Specialist;
    },
    onMutate: async (specialistData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cacheKeys.specialists.list() });

      // Snapshot previous value
      const previousSpecialists = queryClient.getQueryData<Specialist[]>(cacheKeys.specialists.list());

      // Optimistically update with temporary ID
      const tempId = `temp-${Date.now()}`;
      const optimisticSpecialist: Specialist = {
        ...specialistData,
        id: tempId,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Specialist[]>(
        cacheKeys.specialists.list(),
        (old = []) => [optimisticSpecialist, ...old]
      );

      pendingSpecialistsRef.current = [...pendingSpecialistsRef.current, optimisticSpecialist];

      return { previousSpecialists, tempId };
    },
    onSuccess: (newSpecialist, _variables, context) => {
      // Replace temp specialist with real one
      queryClient.setQueryData<Specialist[]>(
        cacheKeys.specialists.list(),
        (old = []) => old.map(s => s.id === context?.tempId ? newSpecialist : s)
      );

      // Update pending ref
      pendingSpecialistsRef.current = pendingSpecialistsRef.current.filter(
        s => s.id !== context?.tempId
      );

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: cacheKeys.specialists.all });
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousSpecialists) {
        queryClient.setQueryData(cacheKeys.specialists.list(), context.previousSpecialists);
      }
      pendingSpecialistsRef.current = pendingSpecialistsRef.current.filter(
        s => s.id !== context?.tempId
      );
    },
  });

  // Mutation for updating a specialist
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Specialist> }) => {
      await updateSpecialistDb(id, updates);
      return { id, updates };
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cacheKeys.specialists.list() });
      await queryClient.cancelQueries({ queryKey: cacheKeys.specialists.detail(id) });

      // Snapshot previous values
      const previousList = queryClient.getQueryData<Specialist[]>(cacheKeys.specialists.list());
      const previousDetail = queryClient.getQueryData<Specialist>(cacheKeys.specialists.detail(id));

      // Optimistically update list
      queryClient.setQueryData<Specialist[]>(
        cacheKeys.specialists.list(),
        (old = []) => old.map(s => s.id === id ? { ...s, ...updates } : s)
      );

      // Optimistically update detail if cached
      if (previousDetail) {
        queryClient.setQueryData(
          cacheKeys.specialists.detail(id),
          { ...previousDetail, ...updates }
        );
      }

      return { previousList, previousDetail, id };
    },
    onSuccess: (_data, { id }) => {
      // Invalidate related queries to refetch fresh data
      // Use wildcard pattern to invalidate all specialist-related caches
      queryClient.invalidateQueries({ queryKey: cacheKeys.specialists.all });
      
      // Also invalidate home data cache as it may depend on specialist data
      queryClient.invalidateQueries({ queryKey: cacheKeys.home.all });
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(cacheKeys.specialists.list(), context.previousList);
      }
      if (context?.previousDetail && context?.id) {
        queryClient.setQueryData(cacheKeys.specialists.detail(context.id), context.previousDetail);
      }
    },
  });

  // Mutation for deleting a specialist
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteAgentDb(id);
      return id;
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cacheKeys.specialists.list() });

      // Snapshot previous value
      const previousSpecialists = queryClient.getQueryData<Specialist[]>(cacheKeys.specialists.list());

      // Optimistically remove from list
      queryClient.setQueryData<Specialist[]>(
        cacheKeys.specialists.list(),
        (old = []) => old.filter(s => s.id !== id)
      );

      return { previousSpecialists, id };
    },
    onSuccess: (_data, id) => {
      // Invalidate related queries using wildcard pattern
      // This invalidates all specialist caches (list, detail, runs)
      queryClient.invalidateQueries({ queryKey: cacheKeys.specialists.all });
      
      // Also invalidate home data cache as it may depend on specialist data
      queryClient.invalidateQueries({ queryKey: cacheKeys.home.all });
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousSpecialists) {
        queryClient.setQueryData(cacheKeys.specialists.list(), context.previousSpecialists);
      }
    },
  });

  // Wrapper functions to maintain existing API
  const addSpecialist = async (specialistData: Omit<Specialist, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const newSpecialist = await addMutation.mutateAsync(specialistData);
      return newSpecialist.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create specialist';
      console.error('[SpecialistsContext] Failed to create specialist:', err);
      throw new Error(message);
    }
  };

  const updateSpecialist = async (id: string, updates: Partial<Specialist>): Promise<void> => {
    try {
      await updateMutation.mutateAsync({ id, updates });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update specialist';
      console.error('[SpecialistsContext] Failed to update specialist:', err);
      throw new Error(message);
    }
  };

  const deleteSpecialist = async (id: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error('[SpecialistsContext] Failed to delete specialist:', err);
      throw err;
    }
  };

  const getSpecialistById = (id: string) => {
    const fromState = specialists.find((s) => s.id === id);
    if (fromState) return fromState;
    return pendingSpecialistsRef.current.find((s) => s.id === id);
  };

  const getTemplateById = (id: string) => SPECIALIST_TEMPLATES.find((t) => t.id === id);

  const getDomainConfig = (domain: string) => DOMAIN_CONFIGS.find((d) => d.id === domain);

  const getTeamPerformance = (): TeamPerformance => {
    if (specialists.length === 0) {
      return { totalSpecialists: 0, activeSpecialists: 0, insightsGenerated: 0, actionsRecommended: 0, approvalRate: 0, valueDelivered: 0, pendingApprovals: 0 };
    }
    const active = specialists.filter(s => s.status === 'active');

    return {
      totalSpecialists: specialists.length,
      activeSpecialists: active.length,
      insightsGenerated: specialists.reduce((sum, s) => sum + s.performance.insightsGenerated, 0),
      actionsRecommended: specialists.reduce((sum, s) => sum + s.performance.actionsRecommended, 0),
      approvalRate: specialists.length > 0 ? Math.round(specialists.reduce((sum, s) => sum + s.performance.approvalRate, 0) / specialists.length) : 0,
      valueDelivered: specialists.reduce((sum, s) => sum + s.performance.valueDelivered, 0),
      pendingApprovals: 0, // Now tracked via agent_recommendations table
    };
  };

  // Wrapper for refetch to maintain existing API
  const handleRefetch = async () => {
    await refetch();
  };

  return (
    <ContextErrorBoundary
      contextName="Specialists"
      onReset={handleRefetch}
      fallbackRoute="/"
    >
      <SpecialistsContext.Provider
        value={{
          specialists,
          templates: SPECIALIST_TEMPLATES,
          domainConfigs: DOMAIN_CONFIGS,
          businessViewConfigs: BUSINESS_VIEW_CONFIGS,
          useCaseCatalog: USE_CASE_CATALOG,
          isLoading,
          isValidating,
          error,
          addSpecialist,
          updateSpecialist,
          deleteSpecialist,
          getSpecialistById,
          getTemplateById,
          getDomainConfig,
          getTeamPerformance,
          refetch: handleRefetch,
        }}
      >
        {children}
      </SpecialistsContext.Provider>
    </ContextErrorBoundary>
  );
}

export function useSpecialists() {
  const context = useContext(SpecialistsContext);
  if (!context) {
    throw new Error('useSpecialists must be used within a SpecialistsProvider');
  }
  return context;
}

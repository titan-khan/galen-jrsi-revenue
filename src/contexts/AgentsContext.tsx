import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { Agent, AgentTemplate } from '@/types/agent';
import {
  fetchAgents as fetchAgentsFromDb,
  createAgent as createAgentInDb,
  updateAgentDb,
  deleteAgentDb,
} from '@/services/agentsService';

// Enterprise-focused agent templates (static UI config, not stored in DB)
const AGENT_TEMPLATES: AgentTemplate[] = [
  // Product
  {
    id: 'template-product-returns',
    name: 'Product Returns Analyst',
    description: 'Monitors product return rates and identifies quality issues driving returns.',
    icon: 'PackageX',
    category: 'product',
    useCase: 'Quality Monitoring',
  },
  {
    id: 'template-conversion-funnel',
    name: 'Conversion Funnel Analyst',
    description: 'Tracks conversion metrics and suggests improvements to reduce drop-offs.',
    icon: 'TrendingUp',
    category: 'product',
    useCase: 'Funnel Optimization',
  },
  // Revenue
  {
    id: 'template-revenue-optimization',
    name: 'Revenue Optimization',
    description: 'Analyzes revenue metrics to identify growth opportunities and revenue leaks.',
    icon: 'DollarSign',
    category: 'revenue',
    useCase: 'Revenue Growth',
  },
  {
    id: 'template-margin-monitor',
    name: 'Profit Margin Monitor',
    description: 'Tracks profit margins and alerts when margins contract unexpectedly.',
    icon: 'TrendingDown',
    category: 'revenue',
    useCase: 'Margin Protection',
  },
  // Operations
  {
    id: 'template-anomaly-detective',
    name: 'Metric Anomaly Detective',
    description: 'Monitors metrics for anomalies and identifies root causes automatically.',
    icon: 'Search',
    category: 'operations',
    useCase: 'Anomaly Detection',
  },
  {
    id: 'template-cost-efficiency',
    name: 'Cost Efficiency Monitor',
    description: 'Monitors cost-related metrics and identifies savings opportunities.',
    icon: 'Calculator',
    category: 'operations',
    useCase: 'Cost Optimization',
  },
  {
    id: 'template-fulfillment',
    name: 'Operational Excellence',
    description: 'Monitors fulfillment, SLA compliance, and operational metrics.',
    icon: 'Clock',
    category: 'operations',
    useCase: 'SLA Compliance',
  },
  {
    id: 'template-digital-onboarding',
    name: 'Digital Onboarding Strategist',
    description: 'Analyzes customer onboarding friction points and provides strategic business cases for investment decisions using VRIO, BCG, and simulation frameworks.',
    icon: 'Briefcase',
    category: 'operations',
    useCase: 'Strategic Advisory',
  },
  {
    id: 'template-porter-five-forces',
    name: 'Competitive Forces Analyst',
    description: 'Analyzes industry dynamics using Porter\'s Five Forces to identify competitive threats and opportunities.',
    icon: 'Shield',
    category: 'operations',
    useCase: 'Competitive Strategy',
  },
  {
    id: 'template-swot-analysis',
    name: 'Strategic Position Analyzer',
    description: 'Performs comprehensive SWOT analysis to identify strategic strengths, weaknesses, opportunities, and threats.',
    icon: 'Target',
    category: 'operations',
    useCase: 'Strategic Planning',
  },
  // Risk
  {
    id: 'template-customer-health',
    name: 'Customer Health Sentinel',
    description: 'Tracks NPS, retention, and churn indicators to predict customer risk.',
    icon: 'HeartPulse',
    category: 'risk',
    useCase: 'Churn Prevention',
  },
  {
    id: 'template-compliance',
    name: 'Compliance Monitor',
    description: 'Monitors metrics for regulatory thresholds and compliance risks.',
    icon: 'Shield',
    category: 'risk',
    useCase: 'Regulatory Compliance',
  },
];

interface AgentsContextType {
  agents: Agent[];
  templates: AgentTemplate[];
  isLoading: boolean;
  error: string | null;
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt'>) => Promise<string>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  getAgentById: (id: string) => Agent | undefined;
  getTemplateById: (id: string) => AgentTemplate | undefined;
  refetch: () => Promise<void>;
}

const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export function AgentsProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pendingAgentsRef = useRef<Agent[]>([]);

  // Fetch agents from database on mount
  const loadAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchAgentsFromDb();
      setAgents(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load agents';
      setError(message);
      console.error('[AgentsContext] Failed to load agents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Clean up pending agents that are now in state
  useEffect(() => {
    pendingAgentsRef.current = pendingAgentsRef.current.filter(
      (pending) => !agents.some((a) => a.id === pending.id)
    );
  }, [agents]);

  const addAgent = async (agentData: Omit<Agent, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const newId = await createAgentInDb(agentData);
      const newAgent: Agent = {
        ...agentData,
        id: newId,
        createdAt: new Date().toISOString(),
      };
      // Store in ref immediately for instant access
      pendingAgentsRef.current = [...pendingAgentsRef.current, newAgent];
      // Update state
      setAgents((prev) => [newAgent, ...prev]);
      return newId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create agent';
      console.error('[AgentsContext] Failed to create agent:', err);
      throw new Error(message);
    }
  };

  const updateAgent = async (id: string, updates: Partial<Agent>): Promise<void> => {
    // Optimistic update
    const prevAgents = agents;
    setAgents((prev) =>
      prev.map((agent) => (agent.id === id ? { ...agent, ...updates } : agent))
    );

    try {
      await updateAgentDb(id, updates);
    } catch (err) {
      // Rollback on failure
      setAgents(prevAgents);
      const message = err instanceof Error ? err.message : 'Failed to update agent';
      console.error('[AgentsContext] Failed to update agent:', err);
      throw new Error(message);
    }
  };

  const deleteAgent = async (id: string): Promise<void> => {
    // Optimistic delete
    const prevAgents = agents;
    setAgents((prev) => prev.filter((agent) => agent.id !== id));

    try {
      await deleteAgentDb(id);
    } catch (err) {
      // Rollback on failure
      setAgents(prevAgents);
      const message = err instanceof Error ? err.message : 'Failed to delete agent';
      console.error('[AgentsContext] Failed to delete agent:', err);
      throw new Error(message);
    }
  };

  const getAgentById = (id: string) => {
    // Check state first
    const fromState = agents.find((a) => a.id === id);
    if (fromState) return fromState;
    // Fallback to pending ref for newly created agents
    return pendingAgentsRef.current.find((a) => a.id === id);
  };

  const getTemplateById = (id: string) => AGENT_TEMPLATES.find((t) => t.id === id);

  return (
    <AgentsContext.Provider
      value={{
        agents,
        templates: AGENT_TEMPLATES,
        isLoading,
        error,
        addAgent,
        updateAgent,
        deleteAgent,
        getAgentById,
        getTemplateById,
        refetch: loadAgents,
      }}
    >
      {children}
    </AgentsContext.Provider>
  );
}

export function useAgents() {
  const context = useContext(AgentsContext);
  if (!context) {
    throw new Error('useAgents must be used within an AgentsProvider');
  }
  return context;
}

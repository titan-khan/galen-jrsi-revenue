// =============================================================================
// Agents Service — CRUD operations for agents and specialists
// Handles camelCase ↔ snake_case transformation between TS types and DB
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Agent, AgentPhase, AgentStatus, AgentCategory } from '@/types/agent';
import type {
  Specialist,
  SpecialistDomain,
  SpecialistStatus,
  MonitoringScope,
  MonitoringRule,
  SpecialistPerformance,
} from '@/types/specialist';
import { requestDeduplicator } from '@/lib/requestDeduplicator';
import { cacheKeys, serializeKey } from '@/lib/cacheKeys';

// ─── DB Row Type ─────────────────────────────────────────────────────

interface AgentDbRow {
  id: string;
  entity_type: string;
  name: string;
  description: string | null;
  goal: string | null;
  template_id: string | null;
  category: string;
  status: string;
  current_phase: string | null;
  monitored_metric_ids: string[] | null;
  time_range: string | null;
  schedule: Record<string, unknown> | null;
  current_plan: Record<string, unknown> | null;
  skill_chain: Record<string, unknown> | null;
  skill_ids: string[] | null;
  anomaly_threshold: number | null;
  total_runs: number | null;
  trust_score: number | null;
  last_run_at: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  // New columns
  handle: string | null;
  domain: string | null;
  specialist_config: Record<string, unknown> | null;
  success_rate: number | null;
  actions_count: number | null;
  consecutive_successes: number | null;
  next_run_at: string | null;
  is_monitoring: boolean | null;
  last_anomaly_check: string | null;
  last_active_at: string | null;
  last_insight_at: string | null;
  auto_approved_action_types: string[] | null;
}

// ─── Row → Agent Mapping ────────────────────────────────────────────

function agentFromDbRow(row: AgentDbRow): Agent {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    goal: row.goal || undefined,
    templateId: row.template_id || '',
    category: (row.category || 'operations') as AgentCategory,
    status: (row.status || 'draft') as AgentStatus,
    createdBy: row.created_by || 'system',
    createdAt: row.created_at || new Date().toISOString(),
    lastRunAt: row.last_run_at || undefined,
    successRate: row.success_rate ?? undefined,
    actionsCount: row.actions_count ?? undefined,
    currentPhase: (row.current_phase || 'idle') as AgentPhase,
    currentPlan: row.current_plan as Agent['currentPlan'],
    monitoredMetrics: row.monitored_metric_ids
      ? row.monitored_metric_ids.map((id) => ({ metricId: id }))
      : undefined,
    timeRange: row.time_range as Agent['timeRange'],
    schedule: row.schedule as Agent['schedule'],
    nextRunAt: row.next_run_at || undefined,
    isMonitoring: row.is_monitoring ?? undefined,
    lastAnomalyCheck: row.last_anomaly_check || undefined,
    anomalyThreshold: row.anomaly_threshold ?? undefined,
    totalRuns: row.total_runs ?? undefined,
    consecutiveSuccesses: row.consecutive_successes ?? undefined,
    trustScore: row.trust_score ?? undefined,
    autoApprovedActionTypes: row.auto_approved_action_types || undefined,
  };
}

function agentToDbRow(
  agent: Partial<Agent> & { name?: string }
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (agent.name !== undefined) row.name = agent.name;
  if (agent.description !== undefined) row.description = agent.description;
  if (agent.goal !== undefined) row.goal = agent.goal;
  if (agent.templateId !== undefined) row.template_id = agent.templateId;
  if (agent.category !== undefined) row.category = agent.category;
  if (agent.status !== undefined) row.status = agent.status;
  if (agent.currentPhase !== undefined) row.current_phase = agent.currentPhase;
  if (agent.currentPlan !== undefined) row.current_plan = agent.currentPlan;
  if (agent.monitoredMetrics !== undefined) {
    row.monitored_metric_ids = agent.monitoredMetrics?.map((m) => m.metricId) || [];
  }
  if (agent.timeRange !== undefined) row.time_range = agent.timeRange;
  if (agent.schedule !== undefined) row.schedule = agent.schedule;
  if (agent.nextRunAt !== undefined) row.next_run_at = agent.nextRunAt;
  if (agent.isMonitoring !== undefined) row.is_monitoring = agent.isMonitoring;
  if (agent.lastAnomalyCheck !== undefined) row.last_anomaly_check = agent.lastAnomalyCheck;
  if (agent.anomalyThreshold !== undefined) row.anomaly_threshold = agent.anomalyThreshold;
  if (agent.totalRuns !== undefined) row.total_runs = agent.totalRuns;
  if (agent.consecutiveSuccesses !== undefined) row.consecutive_successes = agent.consecutiveSuccesses;
  if (agent.trustScore !== undefined) row.trust_score = agent.trustScore;
  if (agent.successRate !== undefined) row.success_rate = agent.successRate;
  if (agent.actionsCount !== undefined) row.actions_count = agent.actionsCount;
  if (agent.autoApprovedActionTypes !== undefined) row.auto_approved_action_types = agent.autoApprovedActionTypes;
  if (agent.lastRunAt !== undefined) row.last_run_at = agent.lastRunAt;
  if (agent.createdBy !== undefined) row.created_by = agent.createdBy;

  row.entity_type = 'agent';

  return row;
}

// ─── Row → Specialist Mapping ───────────────────────────────────────

function specialistFromDbRow(row: AgentDbRow): Specialist {
  const config = (row.specialist_config || {}) as {
    monitoringScope?: MonitoringScope;
    monitoringRules?: MonitoringRule[];
    performance?: SpecialistPerformance;
    metrics?: { id: string; name: string; isCustom?: boolean }[];
    drivers?: { id: string; name: string; isCustom?: boolean }[];
    businessView?: string;
    useCaseId?: string;
    knowledgeBase?: { files: unknown[]; instructions: string };
    notifications?: Record<string, unknown>;
  };

  return {
    id: row.id,
    name: row.name,
    handle: row.handle || '',
    description: row.description || '',
    domain: (row.domain || 'supply-chain') as SpecialistDomain,
    templateId: row.template_id || '',
    status: (row.status || 'paused') as SpecialistStatus,
    monitoringScope: config.monitoringScope || {
      dataSources: [],
      refreshRate: 'daily',
      metrics: [],
    },
    monitoringRules: config.monitoringRules || [],
    performance: config.performance || {
      insightsGenerated: 0,
      actionsRecommended: 0,
      actionsApproved: 0,
      falsePositiveRate: 0,
      valueDelivered: 0,
      approvalRate: 0,
    },
    // Restore creation wizard fields from specialist_config
    metrics: config.metrics as Specialist['metrics'],
    drivers: config.drivers as Specialist['drivers'],
    businessView: config.businessView as Specialist['businessView'],
    useCaseId: config.useCaseId,
    knowledgeBase: config.knowledgeBase as Specialist['knowledgeBase'],
    notifications: config.notifications as Specialist['notifications'],
    createdAt: row.created_at || new Date().toISOString(),
    createdBy: row.created_by || 'system',
    lastActiveAt: row.last_active_at || undefined,
    lastInsightAt: row.last_insight_at || undefined,
  };
}

function specialistToDbRow(
  specialist: Partial<Specialist> & { name?: string }
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (specialist.name !== undefined) row.name = specialist.name;
  if (specialist.description !== undefined) row.description = specialist.description;
  if (specialist.handle !== undefined) row.handle = specialist.handle;
  if (specialist.domain !== undefined) row.domain = specialist.domain;
  if (specialist.templateId !== undefined) row.template_id = specialist.templateId;
  if (specialist.status !== undefined) row.status = specialist.status;
  if (specialist.lastActiveAt !== undefined) row.last_active_at = specialist.lastActiveAt;
  if (specialist.lastInsightAt !== undefined) row.last_insight_at = specialist.lastInsightAt;
  if (specialist.createdBy !== undefined) row.created_by = specialist.createdBy;

  // Pack specialist-only fields into JSONB
  const hasSpecialistConfig =
    specialist.monitoringScope !== undefined ||
    specialist.monitoringRules !== undefined ||
    specialist.performance !== undefined ||
    specialist.metrics !== undefined ||
    specialist.drivers !== undefined ||
    specialist.businessView !== undefined ||
    specialist.useCaseId !== undefined ||
    specialist.knowledgeBase !== undefined ||
    specialist.notifications !== undefined;
  if (hasSpecialistConfig) {
    row.specialist_config = {
      ...(specialist.monitoringScope && { monitoringScope: specialist.monitoringScope }),
      ...(specialist.monitoringRules && { monitoringRules: specialist.monitoringRules }),
      ...(specialist.performance && { performance: specialist.performance }),
      ...(specialist.metrics && { metrics: specialist.metrics }),
      ...(specialist.drivers && { drivers: specialist.drivers }),
      ...(specialist.businessView && { businessView: specialist.businessView }),
      ...(specialist.useCaseId && { useCaseId: specialist.useCaseId }),
      ...(specialist.knowledgeBase && { knowledgeBase: specialist.knowledgeBase }),
      ...(specialist.notifications && { notifications: specialist.notifications }),
    };
  }

  // Map domain → category for the unified table
  if (specialist.domain !== undefined) {
    const domainToCategoryMap: Record<string, string> = {
      'supply-chain': 'operations',
      commercial: 'revenue',
      customer: 'risk',
      finance: 'revenue',
    };
    row.category = domainToCategoryMap[specialist.domain] || 'operations';
  }

  row.entity_type = 'specialist';

  return row;
}

// ─── Agent CRUD ─────────────────────────────────────────────────────

export async function fetchAgents(): Promise<Agent[]> {
  const key = serializeKey(['agents', 'list']);
  
  return requestDeduplicator.dedupe(key, async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('entity_type', 'agent')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch agents: ${error.message}`);
    return (data || []).map((row) => agentFromDbRow(row as unknown as AgentDbRow));
  });
}

export async function fetchAgentById(id: string): Promise<Agent | null> {
  const key = serializeKey(['agents', 'detail', id]);
  
  return requestDeduplicator.dedupe(key, async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .eq('entity_type', 'agent')
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch agent: ${error.message}`);
    if (!data) return null;
    return agentFromDbRow(data as unknown as AgentDbRow);
  });
}

export async function createAgent(
  agentData: Omit<Agent, 'id' | 'createdAt'>
): Promise<string> {
  const row = agentToDbRow(agentData);
  row.created_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('agents')
    .insert(row)
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create agent: ${error.message}`);
  return data.id;
}

export async function updateAgentDb(
  id: string,
  updates: Partial<Agent>
): Promise<void> {
  const row = agentToDbRow(updates);
  delete row.entity_type; // Don't change entity type on update
  row.updated_at = new Date().toISOString();

  const { error } = await supabase.from('agents').update(row).eq('id', id);
  if (error) throw new Error(`Failed to update agent: ${error.message}`);
}

export async function deleteAgentDb(id: string): Promise<void> {
  const { error } = await supabase.from('agents').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete agent: ${error.message}`);
}

// ─── Specialist CRUD ────────────────────────────────────────────────

// Active workspace ID — TODO: make dynamic via workspace context
const ACTIVE_WORKSPACE_ID = '32ef0116-97ea-4f39-ad9b-9a978862b9a2'; // JRSI

export async function fetchSpecialists(): Promise<Specialist[]> {
  const key = serializeKey(cacheKeys.specialists.list());

  return requestDeduplicator.dedupe(key, async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('entity_type', 'specialist')
      .eq('workspace_id', ACTIVE_WORKSPACE_ID)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch specialists: ${error.message}`);
    return (data || []).map((row) => specialistFromDbRow(row as unknown as AgentDbRow));
  });
}

export async function fetchSpecialistById(id: string): Promise<Specialist | null> {
  const key = serializeKey(cacheKeys.specialists.detail(id));
  
  return requestDeduplicator.dedupe(key, async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .eq('entity_type', 'specialist')
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch specialist: ${error.message}`);
    if (!data) return null;
    return specialistFromDbRow(data as unknown as AgentDbRow);
  });
}

export async function createSpecialist(
  specialistData: Omit<Specialist, 'id' | 'createdAt'>
): Promise<string> {
  const row = specialistToDbRow(specialistData);
  row.created_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('agents')
    .insert({ ...row, workspace_id: ACTIVE_WORKSPACE_ID })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create specialist: ${error.message}`);
  return data.id;
}

export async function updateSpecialistDb(
  id: string,
  updates: Partial<Specialist>
): Promise<void> {
  const row = specialistToDbRow(updates);
  delete row.entity_type; // Don't change entity type on update
  row.updated_at = new Date().toISOString();

  // If updating specialist_config fields, merge with existing config to avoid data loss
  if (row.specialist_config) {
    const { data: existing } = await supabase
      .from('agents')
      .select('specialist_config')
      .eq('id', id)
      .single();

    if (existing?.specialist_config) {
      row.specialist_config = {
        ...(existing.specialist_config as Record<string, unknown>),
        ...(row.specialist_config as Record<string, unknown>),
      };
    }
  }

  const { error } = await supabase.from('agents').update(row).eq('id', id);
  if (error) throw new Error(`Failed to update specialist: ${error.message}`);
}

// ─── Generic fetch (any entity type) ────────────────────────────────

export async function fetchAnyById(id: string): Promise<Agent | Specialist | null> {
  const key = serializeKey(['agents', 'any', id]);
  
  return requestDeduplicator.dedupe(key, async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch entity: ${error.message}`);
    if (!data) return null;

    const row = data as unknown as AgentDbRow;
    if (row.entity_type === 'specialist') {
      return specialistFromDbRow(row);
    }
    return agentFromDbRow(row);
  });
}

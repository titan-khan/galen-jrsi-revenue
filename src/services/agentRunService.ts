// =============================================================================
// Agent Run Service — Run lifecycle management
// Tracks agent execution runs in the agent_runs table
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { AgentRun } from '@/types/agent';

// ─── DB Row Type ─────────────────────────────────────────────────────

interface RunDbRow {
  id: string;
  agent_id: string | null;
  status: string;
  trigger: string | null;
  started_at: string | null;
  completed_at: string | null;
  plan: Record<string, unknown> | null;
  findings: Record<string, unknown> | null;
  recommendations: Record<string, unknown> | null;
  skill_outputs: Record<string, unknown> | null;
  error_message: string | null;
}

// ─── Row ↔ AgentRun Mapping ─────────────────────────────────────────

function runFromDbRow(row: RunDbRow): AgentRun {
  const findings = row.findings as Record<string, unknown> | null;
  return {
    id: row.id,
    agentId: row.agent_id || '',
    startedAt: row.started_at || new Date().toISOString(),
    completedAt: row.completed_at || undefined,
    status: (row.status || 'running') as AgentRun['status'],
    trigger: (row.trigger || 'manual') as AgentRun['trigger'],
    summary: (findings?.summary as string) || undefined,
    findingsCount: (findings?.count as number) || undefined,
    actionsExecuted: (findings?.actionsExecuted as number) || undefined,
    anomaliesDetected: (findings?.anomaliesDetected as number) || undefined,
  };
}

// ─── Create Run ─────────────────────────────────────────────────────

export async function createRun(
  agentId: string,
  trigger: 'scheduled' | 'manual' | 'anomaly-detected' = 'manual'
): Promise<string> {
  const { data, error } = await supabase
    .from('agent_runs')
    .insert({
      agent_id: agentId,
      status: 'running',
      trigger,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create run: ${error.message}`);
  return data.id;
}

// ─── Update Run ─────────────────────────────────────────────────────

export async function updateRun(
  runId: string,
  updates: {
    status?: AgentRun['status'];
    findings?: Record<string, unknown>;
    recommendations?: Record<string, unknown>;
    skillOutputs?: Record<string, unknown>;
    errorMessage?: string;
  }
): Promise<void> {
  const row: Record<string, unknown> = {};

  if (updates.status !== undefined) row.status = updates.status;
  if (updates.findings !== undefined) row.findings = updates.findings;
  if (updates.recommendations !== undefined) row.recommendations = updates.recommendations;
  if (updates.skillOutputs !== undefined) row.skill_outputs = updates.skillOutputs;
  if (updates.errorMessage !== undefined) row.error_message = updates.errorMessage;

  const { error } = await supabase.from('agent_runs').update(row).eq('id', runId);
  if (error) throw new Error(`Failed to update run: ${error.message}`);
}

// ─── Complete Run ───────────────────────────────────────────────────

export async function completeRun(
  runId: string,
  summary: string,
  findings: Record<string, unknown>,
  recommendations: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('agent_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      findings: { ...findings, summary },
      recommendations,
    })
    .eq('id', runId);

  if (error) throw new Error(`Failed to complete run: ${error.message}`);
}

// ─── Fail Run ───────────────────────────────────────────────────────

export async function failRun(runId: string, errorMessage: string): Promise<void> {
  const { error } = await supabase
    .from('agent_runs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', runId);

  if (error) throw new Error(`Failed to mark run as failed: ${error.message}`);
}

// ─── Get Run History ────────────────────────────────────────────────

export async function getRunHistory(
  agentId: string,
  limit: number = 20
): Promise<AgentRun[]> {
  const { data, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('agent_id', agentId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch run history: ${error.message}`);
  return (data || []).map((row) => runFromDbRow(row as unknown as RunDbRow));
}

// ─── Get Latest Run ─────────────────────────────────────────────────

export async function getLatestRun(agentId: string): Promise<AgentRun | null> {
  const { data, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('agent_id', agentId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch latest run: ${error.message}`);
  if (!data) return null;
  return runFromDbRow(data as unknown as RunDbRow);
}

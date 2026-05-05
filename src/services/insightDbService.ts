// =============================================================================
// INSIGHT & REPORT DATABASE SERVICE
// Persists saved insights and reports to Supabase
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  InsightItem,
  Report,
  ReportContent,
  ReportGap,
  ReportFormat,
  ReportStatus,
  ReportGenerationStatus,
} from '@/types/insight';

// ─── Insight Persistence ────────────────────────────────────────

/** Load all saved insights grouped by conversation ID */
export async function loadAllInsights(): Promise<Record<string, InsightItem[]>> {
  const { data, error } = await supabase
    .from('saved_insights')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[insightDbService] Failed to load insights:', error.message);
    return {};
  }

  const grouped: Record<string, InsightItem[]> = {};
  for (const row of data) {
    const item: InsightItem = {
      id: row.id,
      type: row.type as InsightItem['type'],
      title: row.title,
      description: row.description ?? undefined,
      sourceMessageId: row.source_message_id,
      chartConfig: row.chart_config as Record<string, unknown> | undefined,
      createdAt: row.created_at,
      autoDetected: row.auto_detected,
    };
    const convId = row.conversation_id;
    if (!grouped[convId]) grouped[convId] = [];
    grouped[convId].push(item);
  }

  return grouped;
}

/** Save a single insight to the database (upsert: insert or update if exists) */
export async function saveInsight(
  conversationId: string,
  insight: InsightItem
): Promise<void> {
  const { error } = await supabase.from('saved_insights').upsert({
    id: insight.id,
    conversation_id: conversationId,
    type: insight.type,
    title: insight.title,
    description: insight.description ?? null,
    source_message_id: insight.sourceMessageId,
    chart_config: insight.chartConfig ?? null,
    auto_detected: insight.autoDetected,
    created_at: insight.createdAt,
  }, {
    onConflict: 'id'
  });

  if (error) {
    console.error('[insightDbService] Failed to save insight:', error.message);
  }
}

/** Delete a single insight from the database */
export async function deleteInsight(insightId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_insights')
    .delete()
    .eq('id', insightId);

  if (error) {
    console.error('[insightDbService] Failed to delete insight:', error.message);
  }
}

/** Delete all insights for a conversation */
export async function deleteInsightsByConversation(
  conversationId: string
): Promise<void> {
  const { error } = await supabase
    .from('saved_insights')
    .delete()
    .eq('conversation_id', conversationId);

  if (error) {
    console.error('[insightDbService] Failed to clear insights:', error.message);
  }
}

// ─── Report Persistence ─────────────────────────────────────────

/** Load all saved reports */
export async function loadAllReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('saved_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[insightDbService] Failed to load reports:', error.message);
    return [];
  }

  return data.map(reportFromDbRow);
}

/** Save a new report to the database */
export async function saveReport(report: Report): Promise<void> {
  const { error } = await supabase.from('saved_reports').insert({
    id: report.id,
    title: report.title,
    conversation_id: report.conversationId,
    included_insight_ids: report.includedInsightIds,
    insights_snapshot: JSON.parse(JSON.stringify(report.insights)),
    format: report.format,
    status: report.status,
    gaps: JSON.parse(JSON.stringify(report.gaps)),
    content: report.content ? JSON.parse(JSON.stringify(report.content)) : null,
    generation_status: report.generationStatus ?? 'idle',
    generation_error: report.generationError ?? null,
    created_at: report.createdAt,
  });

  if (error) {
    console.error('[insightDbService] Failed to save report:', error.message);
  }
}

/** Update a report's generation status and content */
export async function updateReportInDb(
  reportId: string,
  updates: {
    generationStatus?: ReportGenerationStatus;
    content?: ReportContent;
    generationError?: string;
    status?: ReportStatus;
    title?: string;
    updatedAt?: string;
  }
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};
  
  if (updates.generationStatus !== undefined) {
    dbUpdates.generation_status = updates.generationStatus;
  }
  if (updates.content !== undefined) {
    dbUpdates.content = JSON.parse(JSON.stringify(updates.content));
  }
  if (updates.generationError !== undefined) {
    dbUpdates.generation_error = updates.generationError;
  }
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
  }
  if (updates.title !== undefined) {
    dbUpdates.title = updates.title;
  }
  if (updates.updatedAt !== undefined) {
    dbUpdates.updated_at = updates.updatedAt;
  }

  const { error } = await supabase
    .from('saved_reports')
    .update(dbUpdates)
    .eq('id', reportId);

  if (error) {
    console.error('[insightDbService] Failed to update report:', error.message);
  }
}

/** Delete a report from the database */
export async function deleteReportFromDb(reportId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_reports')
    .delete()
    .eq('id', reportId);

  if (error) {
    console.error('[insightDbService] Failed to delete report:', error.message);
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function reportFromDbRow(row: {
  id: string;
  title: string;
  conversation_id: string;
  included_insight_ids: string[];
  insights_snapshot: unknown;
  format: string;
  status: string;
  gaps: unknown;
  content: unknown;
  generation_status: string;
  generation_error: string | null;
  created_at: string;
  updated_at?: string | null;
}): Report {
  return {
    id: row.id,
    title: row.title,
    conversationId: row.conversation_id,
    includedInsightIds: row.included_insight_ids,
    insights: row.insights_snapshot as InsightItem[],
    format: row.format as ReportFormat,
    status: row.status as ReportStatus,
    gaps: row.gaps as ReportGap[],
    content: row.content as ReportContent | undefined,
    generationStatus: row.generation_status as ReportGenerationStatus,
    generationError: row.generation_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

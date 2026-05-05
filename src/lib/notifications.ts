import { supabase } from '@/integrations/supabase/client';
import { NotificationType } from '@/types/notification';

export interface CreateNotificationParams {
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(params: CreateNotificationParams) {
  const { error } = await supabase.from('notifications').insert({
    user_id: params.user_id,
    notification_type: params.notification_type,
    title: params.title,
    message: params.message,
    link: params.link,
    metadata: params.metadata || {},
    read: false,
  });

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Helper functions for common notification types
export async function notifyAgentAlert(userId: string, agentName: string, message: string, link?: string) {
  return createNotification({
    user_id: userId,
    notification_type: 'agent_alert',
    title: `Alert from ${agentName}`,
    message,
    link,
  });
}

export async function notifyReportReady(userId: string, reportName: string, link?: string) {
  return createNotification({
    user_id: userId,
    notification_type: 'report_ready',
    title: 'Report Ready',
    message: `Your report "${reportName}" is ready to view`,
    link,
  });
}

export async function notifyMetricThreshold(userId: string, metricName: string, message: string, link?: string) {
  return createNotification({
    user_id: userId,
    notification_type: 'metric_threshold',
    title: `Metric Alert: ${metricName}`,
    message,
    link,
  });
}

export async function notifyDataQuality(userId: string, message: string, link?: string) {
  return createNotification({
    user_id: userId,
    notification_type: 'data_quality',
    title: 'Data Quality Issue',
    message,
    link,
  });
}

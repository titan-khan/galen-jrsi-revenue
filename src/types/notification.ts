export type NotificationType =
  | "skill_request_status"
  | "skill_request_comment"
  | "agent_alert"
  | "usage_warning"
  | "system"
  | "recommendation"
  | "report_ready"
  | "data_quality"
  | "metric_threshold";

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
}

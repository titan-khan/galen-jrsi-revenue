export type AuditAction = 
  | 'created' 
  | 'approved' 
  | 'dismissed' 
  | 'escalated' 
  | 'implemented' 
  | 'measured'
  | 'tracked';

export type AuditTargetType = 'recommendation' | 'risk' | 'action';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  targetId: string;
  targetType: AuditTargetType;
  targetTitle: string;
  userId: string;
  userName: string;
  reason?: string;
  previousStatus?: string;
  newStatus?: string;
  metadata?: Record<string, unknown>;
}

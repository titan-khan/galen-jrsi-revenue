import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { AuditLogEntry, AuditAction, AuditTargetType } from '@/types/audit';

interface LogActionParams {
  action: AuditAction;
  targetId: string;
  targetType: AuditTargetType;
  targetTitle: string;
  reason?: string;
  previousStatus?: string;
  newStatus?: string;
  metadata?: Record<string, unknown>;
}

interface AuditContextType {
  auditLog: AuditLogEntry[];
  logAction: (params: LogActionParams) => void;
  getAuditLog: (targetId: string) => AuditLogEntry[];
  getRecentActions: (limit?: number) => AuditLogEntry[];
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

const STORAGE_KEY = 'command-center-audit-log';

export function AuditProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage only - no demo data
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Persist entries to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auditLog));
  }, [auditLog]);

  const logAction = useCallback((params: LogActionParams) => {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: 'user-current', // In production, get from auth context
      userName: 'Current User',
      ...params,
    };
    setAuditLog((prev) => [entry, ...prev]);
  }, []);

  const getAuditLog = useCallback(
    (targetId: string) => {
      return auditLog
        .filter((entry) => entry.targetId === targetId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },
    [auditLog]
  );

  const getRecentActions = useCallback(
    (limit = 10) => {
      return auditLog
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    },
    [auditLog]
  );

  return (
    <AuditContext.Provider
      value={{
        auditLog,
        logAction,
        getAuditLog,
        getRecentActions,
      }}
    >
      {children}
    </AuditContext.Provider>
  );
}

export function useAudit() {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
}

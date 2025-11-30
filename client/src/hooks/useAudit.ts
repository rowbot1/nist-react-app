/**
 * Audit Hook
 *
 * React Query hooks for audit logs - tracking changes, viewing history,
 * and monitoring user activity across the application.
 */

import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const AUDIT_QUERY_KEY = 'audit';

// Types
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
export type AuditEntityType = 'Product' | 'System' | 'Assessment' | 'Framework' | 'Evidence' | 'Baseline' | 'User';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  entityName: string | null;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  changedFields: string[] | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  timestamp: string;
}

export interface AuditLogQueryResult {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditQueryParams {
  entityType?: AuditEntityType;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ActivitySummary {
  totalEvents: number;
  byAction: Record<AuditAction, number>;
  byEntityType: Record<AuditEntityType, number>;
  byUser: Array<{
    userId: string;
    userName: string;
    eventCount: number;
  }>;
  byDay: Array<{
    date: string;
    count: number;
  }>;
}

// Query audit logs with filters
export function useAuditLogs(params: AuditQueryParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.entityType) searchParams.set('entityType', params.entityType);
  if (params.entityId) searchParams.set('entityId', params.entityId);
  if (params.userId) searchParams.set('userId', params.userId);
  if (params.action) searchParams.set('action', params.action);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  return useQuery<AuditLogQueryResult>({
    queryKey: [AUDIT_QUERY_KEY, params],
    queryFn: async () => {
      const { data } = await api.get(`/audit?${searchParams.toString()}`);
      return data.data;
    },
  });
}

// Get audit history for a specific entity
export function useEntityAuditHistory(
  entityType: AuditEntityType | undefined,
  entityId: string | undefined
) {
  return useQuery<AuditLogQueryResult>({
    queryKey: [AUDIT_QUERY_KEY, 'entity', entityType, entityId],
    queryFn: async () => {
      const { data } = await api.get(`/audit/entity/${entityType}/${entityId}`);
      return data.data;
    },
    enabled: !!entityType && !!entityId,
  });
}

// Get current user's activity
export function useMyActivity(limit?: number) {
  return useQuery<AuditLogQueryResult>({
    queryKey: [AUDIT_QUERY_KEY, 'my-activity', limit],
    queryFn: async () => {
      const params = limit ? `?limit=${limit}` : '';
      const { data } = await api.get(`/audit/my-activity${params}`);
      return data.data;
    },
  });
}

// Get specific user's activity
export function useUserActivity(userId: string | undefined, limit?: number) {
  return useQuery<AuditLogQueryResult>({
    queryKey: [AUDIT_QUERY_KEY, 'user', userId, limit],
    queryFn: async () => {
      const params = limit ? `?limit=${limit}` : '';
      const { data } = await api.get(`/audit/user/${userId}${params}`);
      return data.data;
    },
    enabled: !!userId,
  });
}

// Get recent activity (for dashboard widgets)
export function useRecentActivity(limit = 10) {
  return useQuery<AuditLog[]>({
    queryKey: [AUDIT_QUERY_KEY, 'recent', limit],
    queryFn: async () => {
      const { data } = await api.get(`/audit/recent?limit=${limit}`);
      return data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Get activity summary
export function useActivitySummary(startDate?: string, endDate?: string) {
  return useQuery<ActivitySummary>({
    queryKey: [AUDIT_QUERY_KEY, 'summary', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const { data } = await api.get(`/audit/summary?${params.toString()}`);
      return data.data;
    },
  });
}

// Helper to format audit action for display
export function formatAuditAction(action: AuditAction): string {
  const actionLabels: Record<AuditAction, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    VIEW: 'Viewed',
    EXPORT: 'Exported',
    LOGIN: 'Logged in',
    LOGOUT: 'Logged out',
  };
  return actionLabels[action] || action;
}

// Helper to get action color
export function getAuditActionColor(action: AuditAction): 'success' | 'info' | 'warning' | 'error' | 'default' {
  const actionColors: Record<AuditAction, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
    CREATE: 'success',
    UPDATE: 'info',
    DELETE: 'error',
    VIEW: 'default',
    EXPORT: 'warning',
    LOGIN: 'success',
    LOGOUT: 'default',
  };
  return actionColors[action] || 'default';
}

// Helper to format changed fields for display
export function formatChangedFields(
  changedFields: string[] | null,
  previousValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): Array<{ field: string; from: string; to: string }> {
  if (!changedFields || !previousValue || !newValue) return [];

  return changedFields.map((field) => ({
    field,
    from: String(previousValue[field] ?? '(empty)'),
    to: String(newValue[field] ?? '(empty)'),
  }));
}

// Helper to get entity icon name
export function getEntityIcon(entityType: AuditEntityType): string {
  const icons: Record<AuditEntityType, string> = {
    Product: 'inventory',
    System: 'computer',
    Assessment: 'assessment',
    Framework: 'account_tree',
    Evidence: 'description',
    Baseline: 'rule',
    User: 'person',
  };
  return icons[entityType] || 'article';
}

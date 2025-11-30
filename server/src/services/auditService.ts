import { prisma } from '../prisma';
import { Request } from 'express';



export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
export type AuditEntityType = 'Product' | 'System' | 'Assessment' | 'Framework' | 'Evidence' | 'Baseline' | 'User';

export interface AuditContext {
  userId: string;
  userName: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditLogInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  changedFields?: string[];
  details?: Record<string, unknown>;
}

/**
 * Extract audit context from Express request
 */
export function getAuditContext(req: Request & { user?: { id: string; name: string; email: string } }): AuditContext | null {
  if (!req.user) {
    return null;
  }

  return {
    userId: req.user.id,
    userName: req.user.name,
    userEmail: req.user.email,
    ipAddress: req.ip || req.headers['x-forwarded-for'] as string || undefined,
    userAgent: req.headers['user-agent'] || undefined,
    sessionId: undefined, // Can be extended to support sessions
  };
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  context: AuditContext,
  input: AuditLogInput
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        userName: context.userName,
        userEmail: context.userEmail,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        previousValue: input.previousValue ? JSON.stringify(input.previousValue) : null,
        newValue: input.newValue ? JSON.stringify(input.newValue) : null,
        changedFields: input.changedFields ? JSON.stringify(input.changedFields) : null,
        details: input.details ? JSON.stringify(input.details) : null,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Helper to calculate changed fields between two objects
 */
export function getChangedFields(
  previous: Record<string, unknown>,
  current: Record<string, unknown>
): string[] {
  const changedFields: string[] = [];
  const allKeys = Array.from(new Set([...Object.keys(previous), ...Object.keys(current)]));

  for (const key of allKeys) {
    // Skip internal fields
    if (['createdAt', 'updatedAt', 'id'].includes(key)) continue;

    const prevValue = JSON.stringify(previous[key]);
    const currValue = JSON.stringify(current[key]);

    if (prevValue !== currValue) {
      changedFields.push(key);
    }
  }

  return changedFields;
}

/**
 * Convenience wrapper for logging from a request
 */
export async function logAuditFromRequest(
  req: Request & { user?: { id: string; name: string; email: string } },
  input: AuditLogInput
): Promise<void> {
  const context = getAuditContext(req);
  if (!context) {
    console.warn('Cannot create audit log: No user context available');
    return;
  }
  await createAuditLog(context, input);
}

/**
 * Query audit logs with filtering
 */
export interface AuditLogQuery {
  entityType?: AuditEntityType;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export async function queryAuditLogs(query: AuditLogQuery) {
  const where: Record<string, unknown> = {};

  if (query.entityType) where.entityType = query.entityType;
  if (query.entityId) where.entityId = query.entityId;
  if (query.userId) where.userId = query.userId;
  if (query.action) where.action = query.action;

  if (query.startDate || query.endDate) {
    where.timestamp = {};
    if (query.startDate) (where.timestamp as Record<string, Date>).gte = query.startDate;
    if (query.endDate) (where.timestamp as Record<string, Date>).lte = query.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: query.limit || 50,
      skip: query.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map(log => ({
      ...log,
      previousValue: log.previousValue ? JSON.parse(log.previousValue) : null,
      newValue: log.newValue ? JSON.parse(log.newValue) : null,
      changedFields: log.changedFields ? JSON.parse(log.changedFields) : null,
      details: log.details ? JSON.parse(log.details) : null,
    })),
    total,
    limit: query.limit || 50,
    offset: query.offset || 0,
  };
}

/**
 * Get audit history for a specific entity
 */
export async function getEntityAuditHistory(entityType: AuditEntityType, entityId: string) {
  return queryAuditLogs({ entityType, entityId, limit: 100 });
}

/**
 * Get recent activity for a user
 */
export async function getUserActivity(userId: string, limit = 50) {
  return queryAuditLogs({ userId, limit });
}

/**
 * Get system-wide activity summary
 */
export async function getActivitySummary(startDate: Date, endDate: Date) {
  const logs = await prisma.auditLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      action: true,
      entityType: true,
      userId: true,
      userName: true,
      timestamp: true,
    },
  });

  // Group by action
  const byAction: Record<string, number> = {};
  // Group by entity type
  const byEntityType: Record<string, number> = {};
  // Group by user
  const byUser: Record<string, { name: string; count: number }> = {};
  // Group by day
  const byDay: Record<string, number> = {};

  for (const log of logs) {
    // By action
    byAction[log.action] = (byAction[log.action] || 0) + 1;

    // By entity type
    byEntityType[log.entityType] = (byEntityType[log.entityType] || 0) + 1;

    // By user
    if (!byUser[log.userId]) {
      byUser[log.userId] = { name: log.userName, count: 0 };
    }
    byUser[log.userId].count++;

    // By day
    const day = log.timestamp.toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  }

  return {
    totalEvents: logs.length,
    byAction,
    byEntityType,
    byUser: Object.entries(byUser).map(([userId, data]) => ({
      userId,
      userName: data.name,
      eventCount: data.count,
    })),
    byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })),
  };
}

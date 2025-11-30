import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import {
  queryAuditLogs,
  getEntityAuditHistory,
  getUserActivity,
  getActivitySummary,
  AuditAction,
  AuditEntityType,
} from '../services/auditService';

const router = Router();

// All audit routes require authentication
router.use(authMiddleware);

/**
 * GET /api/audit
 * Query audit logs with filters
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      entityType,
      entityId,
      userId,
      action,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    const result = await queryAuditLogs({
      entityType: entityType as AuditEntityType | undefined,
      entityId: entityId as string | undefined,
      userId: userId as string | undefined,
      action: action as AuditAction | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json({ data: result });
  } catch (error) {
    console.error('Error querying audit logs:', error);
    res.status(500).json({ error: 'Failed to query audit logs' });
  }
});

/**
 * GET /api/audit/entity/:entityType/:entityId
 * Get audit history for a specific entity
 */
router.get('/entity/:entityType/:entityId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { entityType, entityId } = req.params;

    // Validate entity type
    const validEntityTypes: AuditEntityType[] = [
      'Product', 'System', 'Assessment', 'Framework', 'Evidence', 'Baseline', 'User'
    ];

    if (!validEntityTypes.includes(entityType as AuditEntityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const result = await getEntityAuditHistory(entityType as AuditEntityType, entityId);
    res.json({ data: result });
  } catch (error) {
    console.error('Error fetching entity audit history:', error);
    res.status(500).json({ error: 'Failed to fetch audit history' });
  }
});

/**
 * GET /api/audit/user/:userId
 * Get activity for a specific user
 */
router.get('/user/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    const result = await getUserActivity(
      userId,
      limit ? parseInt(limit as string, 10) : 50
    );

    res.json({ data: result });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

/**
 * GET /api/audit/my-activity
 * Get current user's activity
 */
router.get('/my-activity', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit } = req.query;

    const result = await getUserActivity(
      userId,
      limit ? parseInt(limit as string, 10) : 50
    );

    res.json({ data: result });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch your activity' });
  }
});

/**
 * GET /api/audit/summary
 * Get activity summary for a date range
 */
router.get('/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 30 days if not specified
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate
      ? new Date(startDate as string)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await getActivitySummary(start, end);
    res.json({ data: result });
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({ error: 'Failed to fetch activity summary' });
  }
});

/**
 * GET /api/audit/recent
 * Get recent activity across all entities (dashboard widget)
 */
router.get('/recent', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit } = req.query;

    const result = await queryAuditLogs({
      limit: limit ? parseInt(limit as string, 10) : 10,
    });

    res.json({ data: result.logs });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

export default router;

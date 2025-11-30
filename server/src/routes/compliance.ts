/**
 * Compliance Routes
 *
 * Provides hierarchical compliance data with scoping support.
 * GET /api/compliance/rollup - Main endpoint for scoped compliance
 * POST /api/compliance/recalculate - Recalculate all cached scores
 */

import { Router, Request, Response } from 'express';
import { complianceCalculationService, ScopeType } from '../services/complianceCalculation.service';

const router = Router();

// Extend Request to include user (from auth middleware)
interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; name: string; role: string };
}

/**
 * GET /api/compliance/rollup
 *
 * Get hierarchical compliance data scoped to an organizational level.
 *
 * Query params:
 *   - scopeType: 'cc' | 'framework' | 'product' | 'system' (optional - null for global)
 *   - scopeId: UUID of the scoped entity (required if scopeType is set)
 */
router.get('/rollup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { scopeType, scopeId } = req.query;

    // Validate scope params
    const validScopeTypes = ['cc', 'framework', 'product', 'system'];
    const parsedScopeType = scopeType && validScopeTypes.includes(scopeType as string)
      ? (scopeType as ScopeType)
      : null;
    const parsedScopeId = scopeId ? (scopeId as string) : null;

    // If scopeType is provided, scopeId is required
    if (parsedScopeType && !parsedScopeId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'scopeId is required when scopeType is specified'
      });
    }

    const result = await complianceCalculationService.getHierarchicalCompliance(
      parsedScopeType,
      parsedScopeId
    );

    res.json(result);
  } catch (error: any) {
    console.error('[Compliance Rollup Error]', error);

    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch compliance data'
    });
  }
});

/**
 * GET /api/compliance/capability-centres/:id
 *
 * Convenience endpoint for capability centre compliance.
 */
router.get('/capability-centres/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await complianceCalculationService.getHierarchicalCompliance('cc', req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error('[CC Compliance Error]', error);
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: 'Not Found', message: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch compliance data' });
  }
});

/**
 * GET /api/compliance/frameworks/:id
 *
 * Convenience endpoint for framework compliance.
 */
router.get('/frameworks/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await complianceCalculationService.getHierarchicalCompliance('framework', req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error('[Framework Compliance Error]', error);
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: 'Not Found', message: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch compliance data' });
  }
});

/**
 * GET /api/compliance/products/:id
 *
 * Convenience endpoint for product compliance.
 */
router.get('/products/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await complianceCalculationService.getHierarchicalCompliance('product', req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error('[Product Compliance Error]', error);
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: 'Not Found', message: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch compliance data' });
  }
});

/**
 * GET /api/compliance/systems/:id
 *
 * Convenience endpoint for system compliance.
 */
router.get('/systems/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await complianceCalculationService.getHierarchicalCompliance('system', req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error('[System Compliance Error]', error);
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: 'Not Found', message: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch compliance data' });
  }
});

/**
 * POST /api/compliance/recalculate
 *
 * Recalculate all cached compliance scores. Admin only.
 * Use for initial backfill or cache repair.
 */
router.post('/recalculate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Optional: Add admin role check here
    // if (req.user?.role !== 'ADMIN') {
    //   return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    // }

    await complianceCalculationService.recalculateAll();

    res.json({
      success: true,
      message: 'All compliance scores have been recalculated'
    });
  } catch (error: any) {
    console.error('[Recalculate Error]', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to recalculate compliance scores'
    });
  }
});

/**
 * POST /api/compliance/invalidate/:assessmentId
 *
 * Manually trigger cache invalidation for a specific assessment.
 * Useful for debugging or manual corrections.
 */
router.post('/invalidate/:assessmentId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await complianceCalculationService.invalidateHierarchy(req.params.assessmentId);

    res.json({
      success: true,
      message: 'Hierarchy cache invalidated for assessment'
    });
  } catch (error: any) {
    console.error('[Invalidate Error]', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to invalidate cache'
    });
  }
});

export default router;

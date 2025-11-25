import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createSystemSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  criticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  environment: z.enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION', 'TEST']).optional(),
  dataClassification: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']).optional(),
  productId: z.string().uuid()
});

const updateSystemSchema = createSystemSchema.partial().omit({ productId: true });

// Helper function to verify product ownership
async function verifyProductOwnership(productId: string, userId: string): Promise<boolean> {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      userId: userId
    }
  });
  return !!product;
}

// Helper function to verify system ownership through product
async function verifySystemOwnership(systemId: string, userId: string): Promise<boolean> {
  const system = await prisma.system.findFirst({
    where: {
      id: systemId,
      product: {
        userId: userId
      }
    }
  });
  return !!system;
}

// GET /api/systems - List all systems (with filtering)
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { productId, criticality, environment } = req.query;

    const where: any = {
      product: {
        userId: req.user!.id
      }
    };

    if (productId) {
      where.productId = productId as string;
    }
    if (criticality) {
      where.criticality = criticality as string;
    }
    if (environment) {
      where.environment = environment as string;
    }

    const systems = await prisma.system.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            type: true,
            criticality: true
          }
        },
        _count: {
          select: {
            assessments: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Calculate compliance metrics for each system
    const systemsWithMetrics = await Promise.all(
      systems.map(async (system) => {
        const totalAssessments = await prisma.complianceAssessment.count({
          where: { systemId: system.id }
        });

        const completedAssessments = await prisma.complianceAssessment.count({
          where: {
            systemId: system.id,
            status: { not: 'NOT_ASSESSED' }
          }
        });

        const compliantAssessments = await prisma.complianceAssessment.count({
          where: {
            systemId: system.id,
            status: 'COMPLIANT'
          }
        });

        const completionRate = totalAssessments > 0 ? (completedAssessments / totalAssessments) * 100 : 0;
        const complianceScore = completedAssessments > 0 ? (compliantAssessments / completedAssessments) * 100 : 0;

        return {
          ...system,
          metrics: {
            totalAssessments,
            completedAssessments,
            compliantAssessments,
            completionRate: Math.round(completionRate),
            complianceScore: Math.round(complianceScore)
          }
        };
      })
    );

    res.json({
      systems: systemsWithMetrics,
      total: systemsWithMetrics.length
    });
  } catch (error) {
    console.error('Error fetching systems:', error);
    res.status(500).json({ error: 'Failed to fetch systems' });
  }
});

// GET /api/systems/:id - Get single system with assessments
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const hasAccess = await verifySystemOwnership(req.params.id, req.user!.id);

    if (!hasAccess) {
      return res.status(404).json({ error: 'System not found' });
    }

    const system = await prisma.system.findUnique({
      where: { id: req.params.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            type: true,
            criticality: true
          }
        },
        assessments: {
          orderBy: { subcategoryId: 'asc' }
        }
      }
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    // Calculate compliance metrics
    const totalAssessments = system.assessments.length;
    const completedAssessments = system.assessments.filter(a => a.status !== 'NOT_ASSESSED').length;
    const compliantAssessments = system.assessments.filter(a => a.status === 'COMPLIANT').length;
    const partiallyCompliantAssessments = system.assessments.filter(a => a.status === 'PARTIALLY_COMPLIANT').length;
    const nonCompliantAssessments = system.assessments.filter(a => a.status === 'NON_COMPLIANT').length;

    const completionRate = totalAssessments > 0 ? (completedAssessments / totalAssessments) * 100 : 0;
    const complianceScore = completedAssessments > 0 ? (compliantAssessments / completedAssessments) * 100 : 0;

    res.json({
      ...system,
      metrics: {
        totalAssessments,
        completedAssessments,
        compliantAssessments,
        partiallyCompliantAssessments,
        nonCompliantAssessments,
        completionRate: Math.round(completionRate),
        complianceScore: Math.round(complianceScore)
      }
    });
  } catch (error) {
    console.error('Error fetching system:', error);
    res.status(500).json({ error: 'Failed to fetch system' });
  }
});

// POST /api/systems - Create system
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = createSystemSchema.parse(req.body);

    // Verify product ownership
    const hasAccess = await verifyProductOwnership(validatedData.productId, req.user!.id);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this product'
      });
    }

    const system = await prisma.system.create({
      data: validatedData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        _count: {
          select: {
            assessments: true
          }
        }
      }
    });

    res.status(201).json(system);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    console.error('Error creating system:', error);
    res.status(500).json({ error: 'Failed to create system' });
  }
});

// PUT /api/systems/:id - Update system
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = updateSystemSchema.parse(req.body);

    // Verify ownership
    const hasAccess = await verifySystemOwnership(req.params.id, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'System not found' });
    }

    const system = await prisma.system.update({
      where: { id: req.params.id },
      data: validatedData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        _count: {
          select: {
            assessments: true
          }
        }
      }
    });

    res.json(system);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    console.error('Error updating system:', error);
    res.status(500).json({ error: 'Failed to update system' });
  }
});

// DELETE /api/systems/:id - Delete system (cascade assessments)
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    // Verify ownership
    const hasAccess = await verifySystemOwnership(req.params.id, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'System not found' });
    }

    // Cascade delete is handled by Prisma schema (onDelete: Cascade)
    await prisma.system.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting system:', error);
    res.status(500).json({ error: 'Failed to delete system' });
  }
});

// GET /api/systems/:id/assessments - Get all assessments for a system
router.get('/:id/assessments', async (req: AuthenticatedRequest, res) => {
  try {
    // Verify ownership
    const hasAccess = await verifySystemOwnership(req.params.id, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'System not found' });
    }

    const assessments = await prisma.complianceAssessment.findMany({
      where: { systemId: req.params.id },
      orderBy: { subcategoryId: 'asc' }
    });

    // Group by status for summary
    const statusSummary = {
      NOT_ASSESSED: assessments.filter(a => a.status === 'NOT_ASSESSED').length,
      COMPLIANT: assessments.filter(a => a.status === 'COMPLIANT').length,
      PARTIALLY_COMPLIANT: assessments.filter(a => a.status === 'PARTIALLY_COMPLIANT').length,
      NON_COMPLIANT: assessments.filter(a => a.status === 'NON_COMPLIANT').length,
      NOT_APPLICABLE: assessments.filter(a => a.status === 'NOT_APPLICABLE').length
    };

    res.json({
      assessments,
      total: assessments.length,
      summary: statusSummary
    });
  } catch (error) {
    console.error('Error fetching system assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

export default router;

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createAssessmentSchema = z.object({
  subcategoryId: z.string().min(1),
  status: z.enum(['NOT_ASSESSED', 'COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE']),
  details: z.string().optional(),
  assessor: z.string().optional(),
  assessedDate: z.string().datetime().optional(),
  evidence: z.string().optional(), // JSON string
  remediationPlan: z.string().optional(),
  systemId: z.string().uuid()
});

const updateAssessmentSchema = createAssessmentSchema.partial().omit({ systemId: true });

const bulkUpdateSchema = z.object({
  assessments: z.array(z.object({
    id: z.string().uuid(),
    status: z.enum(['NOT_ASSESSED', 'COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE']).optional(),
    details: z.string().optional(),
    assessor: z.string().optional(),
    assessedDate: z.string().datetime().optional(),
    evidence: z.string().optional(),
    remediationPlan: z.string().optional()
  }))
});

// Helper function to verify assessment ownership through system->product
async function verifyAssessmentOwnership(assessmentId: string, userId: string): Promise<boolean> {
  const assessment = await prisma.complianceAssessment.findFirst({
    where: {
      id: assessmentId,
      system: {
        product: {
          userId: userId
        }
      }
    }
  });
  return !!assessment;
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

// GET /api/assessments - List all assessments (filter by systemId, productId, status)
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { systemId, productId, status } = req.query;

    const where: any = {
      system: {
        product: {
          userId: req.user!.id
        }
      }
    };

    if (systemId) {
      where.systemId = systemId as string;
    }
    if (productId) {
      where.system.productId = productId as string;
    }
    if (status) {
      where.status = status as string;
    }

    const assessments = await prisma.complianceAssessment.findMany({
      where,
      include: {
        system: {
          select: {
            id: true,
            name: true,
            productId: true,
            product: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { system: { name: 'asc' } },
        { subcategoryId: 'asc' }
      ]
    });

    // Calculate summary statistics
    const summary = {
      total: assessments.length,
      NOT_ASSESSED: assessments.filter(a => a.status === 'NOT_ASSESSED').length,
      COMPLIANT: assessments.filter(a => a.status === 'COMPLIANT').length,
      PARTIALLY_COMPLIANT: assessments.filter(a => a.status === 'PARTIALLY_COMPLIANT').length,
      NON_COMPLIANT: assessments.filter(a => a.status === 'NON_COMPLIANT').length,
      NOT_APPLICABLE: assessments.filter(a => a.status === 'NOT_APPLICABLE').length
    };

    res.json({
      assessments,
      summary
    });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// GET /api/assessments/:id - Get single assessment with details
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const hasAccess = await verifyAssessmentOwnership(req.params.id, req.user!.id);

    if (!hasAccess) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = await prisma.complianceAssessment.findUnique({
      where: { id: req.params.id },
      include: {
        system: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                type: true,
                criticality: true
              }
            }
          }
        }
      }
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Parse evidence if it's a JSON string
    let parsedEvidence = null;
    if (assessment.evidence) {
      try {
        parsedEvidence = JSON.parse(assessment.evidence);
      } catch (e) {
        parsedEvidence = assessment.evidence;
      }
    }

    res.json({
      ...assessment,
      evidence: parsedEvidence
    });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

// POST /api/assessments - Create assessment
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = createAssessmentSchema.parse(req.body);

    // Verify system ownership
    const hasAccess = await verifySystemOwnership(validatedData.systemId, req.user!.id);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this system'
      });
    }

    // Convert assessedDate string to Date if provided
    const data: any = { ...validatedData };
    if (data.assessedDate) {
      data.assessedDate = new Date(data.assessedDate);
    }

    const assessment = await prisma.complianceAssessment.create({
      data,
      include: {
        system: {
          select: {
            id: true,
            name: true,
            product: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(assessment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    console.error('Error creating assessment:', error);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
});

// PUT /api/assessments/:id - Update assessment
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = updateAssessmentSchema.parse(req.body);

    // Verify ownership
    const hasAccess = await verifyAssessmentOwnership(req.params.id, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Convert assessedDate string to Date if provided
    const data: any = { ...validatedData };
    if (data.assessedDate) {
      data.assessedDate = new Date(data.assessedDate);
    }

    const assessment = await prisma.complianceAssessment.update({
      where: { id: req.params.id },
      data,
      include: {
        system: {
          select: {
            id: true,
            name: true,
            product: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    res.json(assessment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    console.error('Error updating assessment:', error);
    res.status(500).json({ error: 'Failed to update assessment' });
  }
});

// DELETE /api/assessments/:id - Delete assessment
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    // Verify ownership
    const hasAccess = await verifyAssessmentOwnership(req.params.id, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    await prisma.complianceAssessment.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting assessment:', error);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

// POST /api/assessments/bulk - Bulk update assessments
router.post('/bulk', async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = bulkUpdateSchema.parse(req.body);

    // Verify ownership of all assessments
    const ownershipChecks = await Promise.all(
      validatedData.assessments.map(a => verifyAssessmentOwnership(a.id, req.user!.id))
    );

    if (ownershipChecks.some(check => !check)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to one or more assessments'
      });
    }

    // Perform bulk updates
    const updates = await Promise.all(
      validatedData.assessments.map(async (assessment) => {
        const { id, ...updateData } = assessment;

        // Convert assessedDate string to Date if provided
        const data: any = { ...updateData };
        if (data.assessedDate) {
          data.assessedDate = new Date(data.assessedDate);
        }

        return prisma.complianceAssessment.update({
          where: { id },
          data
        });
      })
    );

    res.json({
      message: 'Bulk update successful',
      updated: updates.length,
      assessments: updates
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    console.error('Error bulk updating assessments:', error);
    res.status(500).json({ error: 'Failed to bulk update assessments' });
  }
});

// GET /api/assessments/matrix/:productId - Get assessment matrix (systems x controls)
router.get('/matrix/:productId', async (req: AuthenticatedRequest, res) => {
  try {
    // Verify product ownership
    const hasAccess = await verifyProductOwnership(req.params.productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get all systems for the product
    const systems = await prisma.system.findMany({
      where: { productId: req.params.productId },
      select: {
        id: true,
        name: true,
        criticality: true,
        environment: true
      },
      orderBy: { name: 'asc' }
    });

    // Get all assessments for these systems
    const assessments = await prisma.complianceAssessment.findMany({
      where: {
        systemId: {
          in: systems.map(s => s.id)
        }
      },
      select: {
        id: true,
        systemId: true,
        subcategoryId: true,
        status: true,
        assessedDate: true
      }
    });

    // Get CSF baseline for the product
    const baseline = await prisma.cSFBaseline.findMany({
      where: {
        productId: req.params.productId,
        applicable: true
      },
      select: {
        subcategoryId: true,
        categoryLevel: true
      }
    });

    // Get all CSF controls to create complete matrix
    const controls = await prisma.cSFControl.findMany({
      select: {
        id: true,
        functionId: true,
        categoryId: true,
        title: true
      },
      orderBy: { id: 'asc' }
    });

    // Build matrix: rows = controls, columns = systems
    const matrix = controls
      .filter(control => baseline.some(b => b.subcategoryId === control.id))
      .map(control => {
        const baselineItem = baseline.find(b => b.subcategoryId === control.id);
        const systemAssessments = systems.map(system => {
          const assessment = assessments.find(
            a => a.systemId === system.id && a.subcategoryId === control.id
          );
          return {
            systemId: system.id,
            systemName: system.name,
            status: assessment?.status || 'NOT_ASSESSED',
            assessmentId: assessment?.id || null,
            assessedDate: assessment?.assessedDate || null
          };
        });

        return {
          controlId: control.id,
          functionId: control.functionId,
          categoryId: control.categoryId,
          title: control.title,
          categoryLevel: baselineItem?.categoryLevel || 'SHOULD_HAVE',
          systems: systemAssessments
        };
      });

    // Calculate summary statistics
    const totalControls = matrix.length;
    const totalCells = totalControls * systems.length;
    const assessedCells = assessments.length;
    const compliantCells = assessments.filter(a => a.status === 'COMPLIANT').length;

    res.json({
      matrix,
      systems,
      summary: {
        totalControls,
        totalSystems: systems.length,
        totalCells,
        assessedCells,
        compliantCells,
        completionRate: totalCells > 0 ? Math.round((assessedCells / totalCells) * 100) : 0,
        complianceRate: assessedCells > 0 ? Math.round((compliantCells / assessedCells) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching assessment matrix:', error);
    res.status(500).json({ error: 'Failed to fetch assessment matrix' });
  }
});

export default router;

import express from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { logAuditFromRequest, getChangedFields } from '../services/auditService';
import { complianceCalculationService } from '../services/complianceCalculation.service';

const router = express.Router();


// Status mapping from frontend format to database format
const STATUS_MAP: Record<string, string> = {
  'Implemented': 'Implemented',
  'Partially Implemented': 'Partially Implemented',
  'Not Implemented': 'Not Implemented',
  'Not Assessed': 'Not Assessed',
  'Not Applicable': 'Not Applicable',
  // Also accept legacy/alternate formats
  'COMPLIANT': 'Implemented',
  'PARTIALLY_COMPLIANT': 'Partially Implemented',
  'NON_COMPLIANT': 'Not Implemented',
  'NOT_ASSESSED': 'Not Assessed',
  'NOT_APPLICABLE': 'Not Applicable',
};

// Validation schemas - accept both frontend and legacy formats
const statusValues = [
  'Implemented', 'Partially Implemented', 'Not Implemented', 'Not Assessed', 'Not Applicable',
  'COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'NOT_ASSESSED', 'NOT_APPLICABLE'
] as const;

const createAssessmentSchema = z.object({
  subcategoryId: z.string().min(1),
  status: z.enum(statusValues).transform(s => STATUS_MAP[s] || s),
  details: z.string().optional(),
  assessor: z.string().optional(),
  assessedDate: z.string().datetime().optional(),
  evidence: z.string().optional(), // JSON string
  remediationPlan: z.string().optional(),
  systemId: z.string().uuid()
});

const updateAssessmentSchema = z.object({
  subcategoryId: z.string().min(1).optional(),
  status: z.enum(statusValues).transform(s => STATUS_MAP[s] || s).optional(),
  details: z.string().optional(),
  implementationNotes: z.string().optional(),
  assessor: z.string().optional(),
  assessedDate: z.string().datetime().optional(),
  evidence: z.string().optional(),
  remediationPlan: z.string().optional(),
  riskLevel: z.string().optional(),
  targetDate: z.string().optional(),
});

const bulkUpdateSchema = z.object({
  assessments: z.array(z.object({
    id: z.string().uuid(),
    status: z.enum(statusValues).transform(s => STATUS_MAP[s] || s).optional(),
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
    if (assessment.legacyEvidence) {
      try {
        parsedEvidence = JSON.parse(assessment.legacyEvidence);
      } catch (e) {
        parsedEvidence = assessment.legacyEvidence;
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
    // Map 'evidence' to 'legacyEvidence' for Prisma (field is @map("evidence") in schema)
    if (data.evidence !== undefined) {
      data.legacyEvidence = data.evidence;
      delete data.evidence;
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

    // Invalidate cached compliance scores up the hierarchy
    await complianceCalculationService.invalidateHierarchy(assessment.id);

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

    // Verify ownership and get previous state for audit
    const previousAssessment = await prisma.complianceAssessment.findFirst({
      where: {
        id: req.params.id,
        system: {
          product: {
            userId: req.user!.id
          }
        }
      },
      include: {
        system: {
          select: {
            name: true,
            product: { select: { name: true } }
          }
        }
      }
    });

    if (!previousAssessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Convert assessedDate string to Date if provided
    const data: any = { ...validatedData };
    if (data.assessedDate) {
      data.assessedDate = new Date(data.assessedDate);
    }
    // Map 'evidence' to 'legacyEvidence' for Prisma (field is @map("evidence") in schema)
    if (data.evidence !== undefined) {
      data.legacyEvidence = data.evidence;
      delete data.evidence;
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

    // Audit log: Assessment updated (critical for compliance tracking)
    const changedFields = getChangedFields(
      previousAssessment as unknown as Record<string, unknown>,
      assessment as unknown as Record<string, unknown>
    );

    await logAuditFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Assessment',
      entityId: req.params.id,
      entityName: `${assessment.subcategoryId} - ${assessment.system.name}`,
      previousValue: {
        status: previousAssessment.status,
        details: previousAssessment.details,
        assessor: previousAssessment.assessor,
      },
      newValue: {
        status: assessment.status,
        details: assessment.details,
        assessor: assessment.assessor,
      },
      changedFields,
      details: {
        subcategoryId: assessment.subcategoryId,
        systemId: assessment.systemId,
        systemName: assessment.system.name,
        productName: assessment.system.product.name,
      },
    });

    // Invalidate cached compliance scores up the hierarchy
    await complianceCalculationService.invalidateHierarchy(assessment.id);

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
    // Verify ownership and get system info for cache invalidation
    const assessment = await prisma.complianceAssessment.findFirst({
      where: {
        id: req.params.id,
        system: { product: { userId: req.user!.id } }
      },
      select: { id: true, systemId: true }
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Store systemId before deletion for cache invalidation
    const systemId = assessment.systemId;

    await prisma.complianceAssessment.delete({
      where: { id: req.params.id }
    });

    // Invalidate cached compliance scores for the system's hierarchy
    await complianceCalculationService.invalidateSystemHierarchy(systemId);

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

        // Map status to database format
        if (data.status) {
          data.status = STATUS_MAP[data.status] || data.status;
        }

        // Map evidence to legacyEvidence for Prisma
        if (data.evidence !== undefined) {
          data.legacyEvidence = data.evidence;
          delete data.evidence;
        }

        return prisma.complianceAssessment.update({
          where: { id },
          data
        });
      })
    );

    // Invalidate cached compliance scores for all affected assessments
    const assessmentIds = validatedData.assessments.map(a => a.id);
    await complianceCalculationService.invalidateBulk(assessmentIds);

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

import express, { Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

const router = express.Router();


// Validation schemas
const templateDataSchema = z.record(z.object({
  status: z.enum(['NOT_ASSESSED', 'COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE']),
  details: z.string().optional(),
  evidenceNotes: z.string().optional(),
}));

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  systemType: z.string().optional(),
  templateData: templateDataSchema,
  isShared: z.boolean().default(false),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  systemType: z.string().optional(),
  templateData: templateDataSchema.optional(),
  isShared: z.boolean().optional(),
});

const applyTemplateSchema = z.object({
  templateId: z.string().uuid('Invalid template ID'),
  systemId: z.string().uuid('Invalid system ID'),
  overwriteExisting: z.boolean().default(false),
});

// GET /api/templates - List templates (user's own + shared)
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { systemType, sharedOnly, myOnly } = req.query;

    const whereClause: any = {
      OR: [
        { createdById: req.user!.id },
        { isShared: true },
      ],
    };

    if (sharedOnly === 'true') {
      whereClause.OR = [{ isShared: true }];
    }

    if (myOnly === 'true') {
      whereClause.OR = [{ createdById: req.user!.id }];
    }

    if (systemType) {
      whereClause.systemType = systemType as string;
    }

    const templates = await prisma.assessmentTemplate.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });

    // Parse templateData for each template
    const enhancedTemplates = templates.map((template) => ({
      ...template,
      templateData: JSON.parse(template.templateData),
      controlCount: Object.keys(JSON.parse(template.templateData)).length,
      isOwner: template.createdById === req.user!.id,
    }));

    res.json(enhancedTemplates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/templates/:id - Get single template
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const template = await prisma.assessmentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check access (owner or shared)
    if (template.createdById !== req.user!.id && !template.isShared) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      ...template,
      templateData: JSON.parse(template.templateData),
      isOwner: template.createdById === req.user!.id,
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST /api/templates - Create a new template
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = createTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { name, description, systemType, templateData, isShared } = validation.data;

    const template = await prisma.assessmentTemplate.create({
      data: {
        name,
        description,
        systemType,
        templateData: JSON.stringify(templateData),
        isShared,
        createdById: req.user!.id,
      },
    });

    res.status(201).json({
      ...template,
      templateData: JSON.parse(template.templateData),
      isOwner: true,
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// POST /api/templates/from-system/:systemId - Create template from existing system assessments
router.post('/from-system/:systemId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { systemId } = req.params;
    const { name, description, isShared } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    // Verify system access
    const system = await prisma.system.findFirst({
      where: {
        id: systemId,
        product: {
          userId: req.user!.id,
        },
      },
      include: {
        assessments: true,
      },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    // Build template data from assessments
    const templateData: Record<string, any> = {};
    for (const assessment of system.assessments) {
      templateData[assessment.subcategoryId] = {
        status: assessment.status,
        details: assessment.details || undefined,
        evidenceNotes: assessment.legacyEvidence ? 'Evidence attached' : undefined,
      };
    }

    const template = await prisma.assessmentTemplate.create({
      data: {
        name,
        description,
        systemType: system.environment,
        templateData: JSON.stringify(templateData),
        isShared: isShared || false,
        createdById: req.user!.id,
      },
    });

    res.status(201).json({
      ...template,
      templateData: JSON.parse(template.templateData),
      controlCount: Object.keys(templateData).length,
      isOwner: true,
    });
  } catch (error) {
    console.error('Error creating template from system:', error);
    res.status(500).json({ error: 'Failed to create template from system' });
  }
});

// POST /api/templates/apply - Apply template to a system
router.post('/apply', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = applyTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { templateId, systemId, overwriteExisting } = validation.data;

    // Verify template access
    const template = await prisma.assessmentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.createdById !== req.user!.id && !template.isShared) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Verify system access
    const system = await prisma.system.findFirst({
      where: {
        id: systemId,
        product: {
          userId: req.user!.id,
        },
      },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    const templateData = JSON.parse(template.templateData);
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
    };

    // Apply template in transaction
    await prisma.$transaction(async (tx) => {
      for (const [subcategoryId, data] of Object.entries(templateData)) {
        const assessmentData = data as { status: string; details?: string; evidenceNotes?: string };

        // Check if assessment exists
        const existing = await tx.complianceAssessment.findUnique({
          where: {
            systemId_subcategoryId: {
              systemId,
              subcategoryId,
            },
          },
        });

        if (existing) {
          if (overwriteExisting) {
            await tx.complianceAssessment.update({
              where: { id: existing.id },
              data: {
                status: assessmentData.status,
                details: assessmentData.details || existing.details,
              },
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          await tx.complianceAssessment.create({
            data: {
              systemId,
              subcategoryId,
              status: assessmentData.status,
              details: assessmentData.details,
            },
          });
          results.created++;
        }
      }
    });

    res.json({
      message: `Template applied: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
      results,
    });
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

// POST /api/templates/copy-assessments - Copy assessments between systems
router.post('/copy-assessments', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sourceSystemId, targetSystemId, overwriteExisting, subcategoryIds } = req.body;

    if (!sourceSystemId || !targetSystemId) {
      return res.status(400).json({ error: 'sourceSystemId and targetSystemId are required' });
    }

    // Verify both systems exist and user owns them
    const [sourceSystem, targetSystem] = await Promise.all([
      prisma.system.findFirst({
        where: {
          id: sourceSystemId,
          product: { userId: req.user!.id },
        },
        include: { assessments: true },
      }),
      prisma.system.findFirst({
        where: {
          id: targetSystemId,
          product: { userId: req.user!.id },
        },
      }),
    ]);

    if (!sourceSystem) {
      return res.status(404).json({ error: 'Source system not found' });
    }

    if (!targetSystem) {
      return res.status(404).json({ error: 'Target system not found' });
    }

    // Filter assessments if subcategoryIds provided
    let assessmentsToCopy = sourceSystem.assessments;
    if (subcategoryIds && Array.isArray(subcategoryIds)) {
      assessmentsToCopy = assessmentsToCopy.filter((a) =>
        subcategoryIds.includes(a.subcategoryId)
      );
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
    };

    // Copy assessments in transaction
    await prisma.$transaction(async (tx) => {
      for (const assessment of assessmentsToCopy) {
        const existing = await tx.complianceAssessment.findUnique({
          where: {
            systemId_subcategoryId: {
              systemId: targetSystemId,
              subcategoryId: assessment.subcategoryId,
            },
          },
        });

        if (existing) {
          if (overwriteExisting) {
            await tx.complianceAssessment.update({
              where: { id: existing.id },
              data: {
                status: assessment.status,
                details: assessment.details,
                assessor: assessment.assessor,
              },
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          await tx.complianceAssessment.create({
            data: {
              systemId: targetSystemId,
              subcategoryId: assessment.subcategoryId,
              status: assessment.status,
              details: assessment.details,
              assessor: assessment.assessor,
            },
          });
          results.created++;
        }
      }
    });

    res.json({
      message: `Assessments copied: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
      results,
    });
  } catch (error) {
    console.error('Error copying assessments:', error);
    res.status(500).json({ error: 'Failed to copy assessments' });
  }
});

// PUT /api/templates/:id - Update a template
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    // Verify ownership
    const existing = await prisma.assessmentTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'You can only edit your own templates' });
    }

    const { name, description, systemType, templateData, isShared } = validation.data;

    const template = await prisma.assessmentTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(systemType !== undefined && { systemType }),
        ...(templateData && { templateData: JSON.stringify(templateData) }),
        ...(isShared !== undefined && { isShared }),
      },
    });

    res.json({
      ...template,
      templateData: JSON.parse(template.templateData),
      isOwner: true,
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/templates/:id - Delete a template
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.assessmentTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'You can only delete your own templates' });
    }

    await prisma.assessmentTemplate.delete({
      where: { id },
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;

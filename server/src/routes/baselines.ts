import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();


// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/baselines/product/:productId
 * Get baseline for a specific product
 */
router.get('/product/:productId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = req.user!.id;

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get all baseline entries for this product
    const baselineEntries = await prisma.cSFBaseline.findMany({
      where: { productId },
      orderBy: { subcategoryId: 'asc' },
    });

    // Transform to expected format
    const controlIds = baselineEntries
      .filter(entry => entry.applicable)
      .map(entry => entry.subcategoryId);

    const baseline = {
      id: `baseline-${productId}`,
      productId,
      controlIds,
      entries: baselineEntries.map(entry => ({
        subcategoryId: entry.subcategoryId,
        applicable: entry.applicable,
        categoryLevel: entry.categoryLevel,
        justification: entry.justification,
      })),
      description: `CSF Baseline for ${product.name}`,
      createdBy: userId,
      createdAt: baselineEntries[0]?.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: baselineEntries[0]?.updatedAt?.toISOString() || new Date().toISOString(),
    };

    res.json({ data: baseline });
  } catch (error) {
    console.error('Error fetching baseline:', error);
    res.status(500).json({ error: 'Failed to fetch baseline' });
  }
});

/**
 * GET /api/baselines
 * Get all baselines (summary)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get all products with their baseline counts
    const products = await prisma.product.findMany({
      where: { userId },
      include: {
        csfBaseline: {
          where: { applicable: true },
          select: { subcategoryId: true },
        },
      },
    });

    const baselines = products.map(product => ({
      id: `baseline-${product.id}`,
      productId: product.id,
      productName: product.name,
      controlIds: product.csfBaseline.map(b => b.subcategoryId),
      controlCount: product.csfBaseline.length,
      createdBy: userId,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    }));

    res.json({ data: baselines });
  } catch (error) {
    console.error('Error fetching baselines:', error);
    res.status(500).json({ error: 'Failed to fetch baselines' });
  }
});

/**
 * POST /api/baselines
 * Create or update baseline for a product
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, controlIds, description } = req.body;
    const userId = req.user!.id;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete existing baseline entries
    await prisma.cSFBaseline.deleteMany({
      where: { productId },
    });

    // Create new baseline entries for each control
    if (controlIds && controlIds.length > 0) {
      await prisma.cSFBaseline.createMany({
        data: controlIds.map((subcategoryId: string) => ({
          productId,
          subcategoryId,
          applicable: true,
          categoryLevel: 'SHOULD_HAVE',
        })),
      });
    }

    // Fetch the created baseline
    const baselineEntries = await prisma.cSFBaseline.findMany({
      where: { productId },
      orderBy: { subcategoryId: 'asc' },
    });

    const baseline = {
      id: `baseline-${productId}`,
      productId,
      controlIds: baselineEntries.map(e => e.subcategoryId),
      description: description || `CSF Baseline for ${product.name}`,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.status(201).json({ data: baseline });
  } catch (error) {
    console.error('Error creating baseline:', error);
    res.status(500).json({ error: 'Failed to create baseline' });
  }
});

/**
 * PUT /api/baselines/product/:productId
 * Update baseline for a product
 */
router.put('/product/:productId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { controlIds, entries } = req.body;
    const userId = req.user!.id;

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If entries are provided, use them for detailed update
    if (entries && Array.isArray(entries)) {
      // Process each entry
      for (const entry of entries) {
        const existing = await prisma.cSFBaseline.findFirst({
          where: { productId, subcategoryId: entry.subcategoryId },
        });

        if (existing) {
          await prisma.cSFBaseline.update({
            where: { id: existing.id },
            data: {
              applicable: entry.applicable,
              categoryLevel: entry.categoryLevel || 'SHOULD_HAVE',
              justification: entry.justification,
            },
          });
        } else {
          await prisma.cSFBaseline.create({
            data: {
              productId,
              subcategoryId: entry.subcategoryId,
              applicable: entry.applicable,
              categoryLevel: entry.categoryLevel || 'SHOULD_HAVE',
              justification: entry.justification,
            },
          });
        }
      }
    } else if (controlIds && Array.isArray(controlIds)) {
      // Simple controlIds update - mark all as applicable
      // First, get existing entries
      const existingEntries = await prisma.cSFBaseline.findMany({
        where: { productId },
      });

      const existingSubcategoryIds = existingEntries.map(e => e.subcategoryId);

      // Mark existing entries as applicable/not applicable
      for (const entry of existingEntries) {
        const shouldBeApplicable = controlIds.includes(entry.subcategoryId);
        if (entry.applicable !== shouldBeApplicable) {
          await prisma.cSFBaseline.update({
            where: { id: entry.id },
            data: { applicable: shouldBeApplicable },
          });
        }
      }

      // Create new entries for controls not yet in the database
      const newControlIds = controlIds.filter(
        (id: string) => !existingSubcategoryIds.includes(id)
      );

      if (newControlIds.length > 0) {
        await prisma.cSFBaseline.createMany({
          data: newControlIds.map((subcategoryId: string) => ({
            productId,
            subcategoryId,
            applicable: true,
            categoryLevel: 'SHOULD_HAVE',
          })),
        });
      }
    }

    // Fetch updated baseline
    const baselineEntries = await prisma.cSFBaseline.findMany({
      where: { productId },
      orderBy: { subcategoryId: 'asc' },
    });

    const baseline = {
      id: `baseline-${productId}`,
      productId,
      controlIds: baselineEntries.filter(e => e.applicable).map(e => e.subcategoryId),
      entries: baselineEntries.map(entry => ({
        subcategoryId: entry.subcategoryId,
        applicable: entry.applicable,
        categoryLevel: entry.categoryLevel,
        justification: entry.justification,
      })),
      description: `CSF Baseline for ${product.name}`,
      createdBy: userId,
      createdAt: baselineEntries[0]?.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.json({ data: baseline });
  } catch (error) {
    console.error('Error updating baseline:', error);
    res.status(500).json({ error: 'Failed to update baseline' });
  }
});

/**
 * DELETE /api/baselines/product/:productId
 * Delete all baseline entries for a product
 */
router.delete('/product/:productId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = req.user!.id;

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete all baseline entries
    await prisma.cSFBaseline.deleteMany({
      where: { productId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting baseline:', error);
    res.status(500).json({ error: 'Failed to delete baseline' });
  }
});

/**
 * POST /api/baselines/product/:productId/apply-template
 * Apply a baseline template to a product and create assessments for all systems
 */
router.post('/product/:productId/apply-template', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { templateId, controlIds } = req.body;
    const userId = req.user!.id;

    // Verify product ownership and get systems
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
      include: {
        systems: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Define baseline templates
    const templates: Record<string, string[]> = {
      'standard-enterprise': [
        // GOVERN Function
        'GV.OC-01', 'GV.OC-02', 'GV.OC-03', 'GV.OC-04', 'GV.OC-05',
        'GV.RM-01', 'GV.RM-02', 'GV.RM-03', 'GV.RM-04', 'GV.RM-05', 'GV.RM-06', 'GV.RM-07',
        'GV.RR-01', 'GV.RR-02', 'GV.RR-03', 'GV.RR-04',
        'GV.PO-01', 'GV.PO-02',
        'GV.SC-01', 'GV.SC-02', 'GV.SC-03', 'GV.SC-04', 'GV.SC-05', 'GV.SC-06', 'GV.SC-07', 'GV.SC-08', 'GV.SC-09', 'GV.SC-10',
        // IDENTIFY Function
        'ID.AM-01', 'ID.AM-02', 'ID.AM-03', 'ID.AM-04', 'ID.AM-05', 'ID.AM-07', 'ID.AM-08',
        'ID.RA-01', 'ID.RA-02', 'ID.RA-03', 'ID.RA-04', 'ID.RA-05', 'ID.RA-06', 'ID.RA-07', 'ID.RA-08', 'ID.RA-09', 'ID.RA-10',
        'ID.IM-01', 'ID.IM-02', 'ID.IM-03', 'ID.IM-04',
        // PROTECT Function
        'PR.AA-01', 'PR.AA-02', 'PR.AA-03', 'PR.AA-04', 'PR.AA-05', 'PR.AA-06',
        'PR.AT-01', 'PR.AT-02',
        'PR.DS-01', 'PR.DS-02', 'PR.DS-10', 'PR.DS-11',
        'PR.PS-01', 'PR.PS-02', 'PR.PS-03', 'PR.PS-04', 'PR.PS-05', 'PR.PS-06',
        'PR.IR-01', 'PR.IR-02', 'PR.IR-03', 'PR.IR-04',
        // DETECT Function
        'DE.CM-01', 'DE.CM-02', 'DE.CM-03', 'DE.CM-06', 'DE.CM-09',
        'DE.AE-02', 'DE.AE-03', 'DE.AE-04', 'DE.AE-06', 'DE.AE-07', 'DE.AE-08',
        // RESPOND Function
        'RS.MA-01', 'RS.MA-02', 'RS.MA-03', 'RS.MA-04', 'RS.MA-05',
        'RS.AN-03', 'RS.AN-06', 'RS.AN-07', 'RS.AN-08',
        'RS.CO-02', 'RS.CO-03',
        'RS.MI-01', 'RS.MI-02',
        // RECOVER Function
        'RC.RP-01', 'RC.RP-02', 'RC.RP-03', 'RC.RP-04', 'RC.RP-05', 'RC.RP-06',
        'RC.CO-03', 'RC.CO-04',
      ],
      'minimal-startup': [
        'GV.OC-01', 'GV.RM-01', 'GV.RR-01',
        'ID.AM-01', 'ID.AM-02', 'ID.RA-01', 'ID.RA-02',
        'PR.AA-01', 'PR.AA-02', 'PR.DS-01', 'PR.DS-02',
        'DE.CM-01', 'DE.AE-02',
        'RS.MA-01', 'RS.AN-03',
        'RC.RP-01',
      ],
      'comprehensive': [
        // All 185 CSF 2.0 subcategories - fetch from database
      ],
    };

    // Get control IDs either from template or directly provided
    let selectedControlIds: string[] = [];

    if (controlIds && Array.isArray(controlIds) && controlIds.length > 0) {
      selectedControlIds = controlIds;
    } else if (templateId && templates[templateId]) {
      selectedControlIds = templates[templateId];
    } else if (templateId === 'comprehensive') {
      // Fetch all CSF controls from database
      const allControls = await prisma.cSFControl.findMany({
        select: { id: true },
      });
      selectedControlIds = allControls.map(c => c.id);
    } else {
      return res.status(400).json({
        error: 'Either templateId or controlIds must be provided',
        availableTemplates: Object.keys(templates),
      });
    }

    // Start transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete existing baseline entries for this product
      await tx.cSFBaseline.deleteMany({
        where: { productId },
      });

      // 2. Create new baseline entries
      await tx.cSFBaseline.createMany({
        data: selectedControlIds.map((subcategoryId: string) => ({
          productId,
          subcategoryId,
          applicable: true,
          categoryLevel: 'SHOULD_HAVE',
        })),
      });

      // 3. For each system under this product, create NOT_ASSESSED compliance assessments
      const systemAssessments: { systemId: string; subcategoryId: string; status: string }[] = [];

      for (const system of product.systems) {
        // Get existing assessments for this system
        const existingAssessments = await tx.complianceAssessment.findMany({
          where: { systemId: system.id },
          select: { subcategoryId: true },
        });
        const existingSubcategoryIds = new Set(existingAssessments.map(a => a.subcategoryId));

        // Create assessments only for controls that don't already have one
        for (const subcategoryId of selectedControlIds) {
          if (!existingSubcategoryIds.has(subcategoryId)) {
            systemAssessments.push({
              systemId: system.id,
              subcategoryId,
              status: 'NOT_ASSESSED',
            });
          }
        }
      }

      // Bulk create assessments (duplicates already filtered above)
      if (systemAssessments.length > 0) {
        await tx.complianceAssessment.createMany({
          data: systemAssessments,
        });
      }

      return {
        baselineControlsCount: selectedControlIds.length,
        systemsUpdated: product.systems.length,
        assessmentsCreated: systemAssessments.length,
      };
    });

    // Fetch the created baseline
    const baselineEntries = await prisma.cSFBaseline.findMany({
      where: { productId },
      orderBy: { subcategoryId: 'asc' },
    });

    res.status(201).json({
      data: {
        id: `baseline-${productId}`,
        productId,
        controlIds: baselineEntries.map(e => e.subcategoryId),
        templateId: templateId || 'custom',
        description: `CSF Baseline applied from ${templateId || 'custom'} template`,
        createdBy: userId,
        createdAt: new Date().toISOString(),
      },
      summary: {
        baselineControlsApplied: result.baselineControlsCount,
        systemsUpdated: result.systemsUpdated,
        assessmentsCreated: result.assessmentsCreated,
        message: `Applied ${result.baselineControlsCount} controls to product and created ${result.assessmentsCreated} assessments across ${result.systemsUpdated} systems`,
      },
    });
  } catch (error) {
    console.error('Error applying baseline template:', error);
    res.status(500).json({ error: 'Failed to apply baseline template' });
  }
});

/**
 * GET /api/baselines/templates
 * Get available baseline templates (global)
 */
router.get('/templates', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const templates = [
      {
        id: 'minimal-startup',
        name: 'Minimal Startup',
        description: 'Essential controls for early-stage startups (15 controls)',
        controlCount: 15,
        functions: ['GOVERN', 'IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER'],
      },
      {
        id: 'standard-enterprise',
        name: 'Standard Enterprise',
        description: 'Comprehensive controls for established organizations (85+ controls)',
        controlCount: 85,
        functions: ['GOVERN', 'IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER'],
      },
      {
        id: 'comprehensive',
        name: 'Comprehensive (All Controls)',
        description: 'All 185 NIST CSF 2.0 subcategories',
        controlCount: 185,
        functions: ['GOVERN', 'IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER'],
      },
    ];

    res.json({ data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// ============================================================================
// FRAMEWORK BASELINE TEMPLATES - Framework-specific reusable templates
// ============================================================================

/**
 * GET /api/baselines/framework/:frameworkId/templates
 * Get all baseline templates for a framework
 */
router.get('/framework/:frameworkId/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { frameworkId } = req.params;
    const userId = req.user!.id;

    // Verify framework access (via capability centre ownership)
    const framework = await prisma.framework.findFirst({
      where: {
        id: frameworkId,
        capabilityCentre: {
          userId,
        },
      },
    });

    if (!framework) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    const templates = await prisma.frameworkBaselineTemplate.findMany({
      where: { frameworkId },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    res.json({
      data: templates.map(t => ({
        ...t,
        templateData: JSON.parse(t.templateData),
        controlCount: JSON.parse(t.templateData).length,
      })),
    });
  } catch (error) {
    console.error('Error fetching framework templates:', error);
    res.status(500).json({ error: 'Failed to fetch framework templates' });
  }
});

/**
 * POST /api/baselines/framework/:frameworkId/templates
 * Create a new baseline template for a framework
 */
router.post('/framework/:frameworkId/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { frameworkId } = req.params;
    const { name, description, templateData, isDefault } = req.body;
    const userId = req.user!.id;

    if (!name || !templateData || !Array.isArray(templateData)) {
      return res.status(400).json({ error: 'name and templateData (array) are required' });
    }

    // Verify framework access
    const framework = await prisma.framework.findFirst({
      where: {
        id: frameworkId,
        capabilityCentre: {
          userId,
        },
      },
    });

    if (!framework) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    // If this is being set as default, unset other defaults
    if (isDefault) {
      await prisma.frameworkBaselineTemplate.updateMany({
        where: { frameworkId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.frameworkBaselineTemplate.create({
      data: {
        name,
        description,
        templateData: JSON.stringify(templateData),
        isDefault: isDefault || false,
        frameworkId,
      },
    });

    res.status(201).json({
      data: {
        ...template,
        templateData: JSON.parse(template.templateData),
        controlCount: templateData.length,
      },
    });
  } catch (error) {
    console.error('Error creating framework template:', error);
    res.status(500).json({ error: 'Failed to create framework template' });
  }
});

/**
 * PUT /api/baselines/framework/:frameworkId/templates/:templateId
 * Update a framework baseline template
 */
router.put('/framework/:frameworkId/templates/:templateId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { frameworkId, templateId } = req.params;
    const { name, description, templateData, isDefault } = req.body;
    const userId = req.user!.id;

    // Verify framework access
    const framework = await prisma.framework.findFirst({
      where: {
        id: frameworkId,
        capabilityCentre: {
          userId,
        },
      },
    });

    if (!framework) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    const existingTemplate = await prisma.frameworkBaselineTemplate.findFirst({
      where: { id: templateId, frameworkId },
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // If this is being set as default, unset other defaults
    if (isDefault) {
      await prisma.frameworkBaselineTemplate.updateMany({
        where: { frameworkId, isDefault: true, id: { not: templateId } },
        data: { isDefault: false },
      });
    }

    const template = await prisma.frameworkBaselineTemplate.update({
      where: { id: templateId },
      data: {
        name: name || existingTemplate.name,
        description: description !== undefined ? description : existingTemplate.description,
        templateData: templateData ? JSON.stringify(templateData) : existingTemplate.templateData,
        isDefault: isDefault !== undefined ? isDefault : existingTemplate.isDefault,
      },
    });

    res.json({
      data: {
        ...template,
        templateData: JSON.parse(template.templateData),
        controlCount: JSON.parse(template.templateData).length,
      },
    });
  } catch (error) {
    console.error('Error updating framework template:', error);
    res.status(500).json({ error: 'Failed to update framework template' });
  }
});

/**
 * DELETE /api/baselines/framework/:frameworkId/templates/:templateId
 * Delete a framework baseline template
 */
router.delete('/framework/:frameworkId/templates/:templateId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { frameworkId, templateId } = req.params;
    const userId = req.user!.id;

    // Verify framework access
    const framework = await prisma.framework.findFirst({
      where: {
        id: frameworkId,
        capabilityCentre: {
          userId,
        },
      },
    });

    if (!framework) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    const template = await prisma.frameworkBaselineTemplate.findFirst({
      where: { id: templateId, frameworkId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await prisma.frameworkBaselineTemplate.delete({
      where: { id: templateId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting framework template:', error);
    res.status(500).json({ error: 'Failed to delete framework template' });
  }
});

/**
 * POST /api/baselines/product/:productId/apply-framework-template
 * Apply a framework baseline template to a product
 */
router.post('/product/:productId/apply-framework-template', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { templateId } = req.body;
    const userId = req.user!.id;

    if (!templateId) {
      return res.status(400).json({ error: 'templateId is required' });
    }

    // Verify product ownership and get framework
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
      include: {
        framework: true,
        systems: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get the template
    const template = await prisma.frameworkBaselineTemplate.findFirst({
      where: { id: templateId, frameworkId: product.frameworkId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found in product\'s framework' });
    }

    const templateData = JSON.parse(template.templateData) as Array<{
      subcategoryId: string;
      applicable: boolean;
      categoryLevel: string;
      justification?: string;
    }>;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing baseline entries
      await tx.cSFBaseline.deleteMany({
        where: { productId },
      });

      // Create new baseline entries from template
      await tx.cSFBaseline.createMany({
        data: templateData.map(item => ({
          productId,
          subcategoryId: item.subcategoryId,
          applicable: item.applicable,
          categoryLevel: item.categoryLevel || 'SHOULD_HAVE',
          justification: item.justification,
        })),
      });

      // Create assessments for systems
      const applicableControlIds = templateData
        .filter(item => item.applicable)
        .map(item => item.subcategoryId);

      let assessmentsCreated = 0;

      for (const system of product.systems) {
        const existingAssessments = await tx.complianceAssessment.findMany({
          where: { systemId: system.id },
          select: { subcategoryId: true },
        });
        const existingIds = new Set(existingAssessments.map(a => a.subcategoryId));

        const newAssessments = applicableControlIds
          .filter(id => !existingIds.has(id))
          .map(subcategoryId => ({
            systemId: system.id,
            subcategoryId,
            status: 'NOT_ASSESSED',
          }));

        if (newAssessments.length > 0) {
          await tx.complianceAssessment.createMany({
            data: newAssessments,
          });
          assessmentsCreated += newAssessments.length;
        }
      }

      return {
        baselineControlsCount: templateData.length,
        applicableControlsCount: applicableControlIds.length,
        systemsUpdated: product.systems.length,
        assessmentsCreated,
      };
    });

    res.status(201).json({
      data: {
        productId,
        templateId,
        templateName: template.name,
      },
      summary: {
        ...result,
        message: `Applied "${template.name}" template: ${result.applicableControlsCount} applicable controls, ${result.assessmentsCreated} new assessments across ${result.systemsUpdated} systems`,
      },
    });
  } catch (error) {
    console.error('Error applying framework template:', error);
    res.status(500).json({ error: 'Failed to apply framework template' });
  }
});

/**
 * POST /api/baselines/framework/:frameworkId/templates/from-product/:productId
 * Create a framework template from an existing product's baseline
 */
router.post('/framework/:frameworkId/templates/from-product/:productId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { frameworkId, productId } = req.params;
    const { name, description, isDefault } = req.body;
    const userId = req.user!.id;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Verify framework access
    const framework = await prisma.framework.findFirst({
      where: {
        id: frameworkId,
        capabilityCentre: {
          userId,
        },
      },
    });

    if (!framework) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    // Verify product access and belongs to this framework
    const product = await prisma.product.findFirst({
      where: { id: productId, userId, frameworkId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or not in this framework' });
    }

    // Get product's baseline
    const baselineEntries = await prisma.cSFBaseline.findMany({
      where: { productId },
    });

    if (baselineEntries.length === 0) {
      return res.status(400).json({ error: 'Product has no baseline to create template from' });
    }

    const templateData = baselineEntries.map(entry => ({
      subcategoryId: entry.subcategoryId,
      applicable: entry.applicable,
      categoryLevel: entry.categoryLevel,
      justification: entry.justification,
    }));

    // If this is being set as default, unset other defaults
    if (isDefault) {
      await prisma.frameworkBaselineTemplate.updateMany({
        where: { frameworkId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.frameworkBaselineTemplate.create({
      data: {
        name,
        description: description || `Template created from ${product.name}`,
        templateData: JSON.stringify(templateData),
        isDefault: isDefault || false,
        frameworkId,
      },
    });

    res.status(201).json({
      data: {
        ...template,
        templateData: JSON.parse(template.templateData),
        controlCount: templateData.length,
        applicableCount: templateData.filter(t => t.applicable).length,
      },
    });
  } catch (error) {
    console.error('Error creating template from product:', error);
    res.status(500).json({ error: 'Failed to create template from product' });
  }
});

export default router;

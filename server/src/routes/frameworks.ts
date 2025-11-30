import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();


// Get all frameworks for the current user with product counts and compliance stats
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { capabilityCentreId } = req.query;

    // Get frameworks through capability centres owned by user
    const whereClause: any = {
      capabilityCentre: {
        userId,
      },
    };

    // Optional filter by capability centre
    if (capabilityCentreId) {
      whereClause.capabilityCentreId = capabilityCentreId as string;
    }

    const frameworks = await prisma.framework.findMany({
      where: whereClause,
      include: {
        capabilityCentre: true,
        products: {
          include: {
            csfBaseline: true,
            systems: {
              include: {
                assessments: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate compliance stats for each framework
    const frameworksWithStats = frameworks.map((framework) => {
      let totalAssessments = 0;
      let compliantCount = 0;
      let partialCount = 0;
      let nonCompliantCount = 0;
      let notAssessedCount = 0;
      let notApplicableCount = 0;
      let systemCount = 0;
      let controlCount = 0;

      framework.products.forEach((product) => {
        systemCount += product.systems.length;
        controlCount += (product as any).csfBaseline?.length || 0;
        product.systems.forEach((system) => {
          system.assessments.forEach((assessment) => {
            totalAssessments++;
            switch (assessment.status) {
              case 'COMPLIANT':
                compliantCount++;
                break;
              case 'PARTIALLY_COMPLIANT':
                partialCount++;
                break;
              case 'NON_COMPLIANT':
                nonCompliantCount++;
                break;
              case 'NOT_ASSESSED':
                notAssessedCount++;
                break;
              case 'NOT_APPLICABLE':
                notApplicableCount++;
                break;
            }
          });
        });
      });

      const assessedCount = totalAssessments - notAssessedCount - notApplicableCount;
      const complianceScore = assessedCount > 0
        ? Math.round(((compliantCount + partialCount * 0.5) / assessedCount) * 100)
        : 0;

      return {
        id: framework.id,
        name: framework.name,
        code: framework.code,
        description: framework.description,
        color: framework.color,
        icon: framework.icon,
        capabilityCentreId: framework.capabilityCentreId,
        capabilityCentre: framework.capabilityCentre,
        createdAt: framework.createdAt,
        updatedAt: framework.updatedAt,
        stats: {
          productCount: framework.products.length,
          systemCount,
          controlCount,
          totalAssessments,
          compliantCount,
          partialCount,
          nonCompliantCount,
          notAssessedCount,
          notApplicableCount,
          complianceScore,
        },
      };
    });

    res.json(frameworksWithStats);
  } catch (error) {
    console.error('Error fetching frameworks:', error);
    res.status(500).json({ error: 'Failed to fetch frameworks' });
  }
});

// Get a single framework by ID with full details
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const framework = await prisma.framework.findFirst({
      where: {
        id,
        capabilityCentre: {
          userId,
        },
      },
      include: {
        capabilityCentre: true,
        products: {
          include: {
            csfBaseline: true,
            systems: {
              include: {
                assessments: true,
              },
            },
          },
        },
      },
    });

    if (!framework) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    // Calculate compliance stats per product
    const productsWithStats = framework.products.map((product) => {
      let totalAssessments = 0;
      let compliantCount = 0;
      let partialCount = 0;
      let nonCompliantCount = 0;
      let notAssessedCount = 0;
      let notApplicableCount = 0;

      product.systems.forEach((system) => {
        system.assessments.forEach((assessment) => {
          totalAssessments++;
          switch (assessment.status) {
            case 'COMPLIANT':
              compliantCount++;
              break;
            case 'PARTIALLY_COMPLIANT':
              partialCount++;
              break;
            case 'NON_COMPLIANT':
              nonCompliantCount++;
              break;
            case 'NOT_ASSESSED':
              notAssessedCount++;
              break;
            case 'NOT_APPLICABLE':
              notApplicableCount++;
              break;
          }
        });
      });

      const assessedCount = totalAssessments - notAssessedCount - notApplicableCount;
      const complianceScore = assessedCount > 0
        ? Math.round(((compliantCount + partialCount * 0.5) / assessedCount) * 100)
        : 0;

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        type: product.type,
        criticality: product.criticality,
        systemCount: product.systems.length,
        controlCount: (product as any).csfBaseline?.length || 0,
        complianceScore,
        stats: {
          totalAssessments,
          implementedCount: compliantCount,
          partialCount,
          nonCompliantCount,
          notAssessedCount,
        },
      };
    });

    res.json({
      ...framework,
      products: productsWithStats,
    });
  } catch (error) {
    console.error('Error fetching framework:', error);
    res.status(500).json({ error: 'Failed to fetch framework' });
  }
});

// Create a new framework
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, description, color, icon, capabilityCentreId } = req.body;
    const userId = req.user!.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Framework name is required' });
    }

    if (!capabilityCentreId) {
      return res.status(400).json({ error: 'Capability centre ID is required' });
    }

    // Verify user owns the capability centre
    const capabilityCentre = await prisma.capabilityCentre.findFirst({
      where: { id: capabilityCentreId, userId },
    });

    if (!capabilityCentre) {
      return res.status(404).json({ error: 'Capability centre not found' });
    }

    const framework = await prisma.framework.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
        color: color || '#1976d2',
        icon: icon || 'Folder',
        capabilityCentreId,
      },
      include: {
        capabilityCentre: true,
      },
    });

    res.status(201).json(framework);
  } catch (error) {
    console.error('Error creating framework:', error);
    res.status(500).json({ error: 'Failed to create framework' });
  }
});

// Update a framework
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description, color, icon } = req.body;
    const userId = req.user!.id;

    // Verify ownership through capability centre
    const existing = await prisma.framework.findFirst({
      where: {
        id,
        capabilityCentre: {
          userId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    const framework = await prisma.framework.update({
      where: { id },
      data: {
        name: name?.trim() || existing.name,
        code: code?.trim() ?? existing.code,
        description: description?.trim() ?? existing.description,
        color: color || existing.color,
        icon: icon || existing.icon,
      },
      include: {
        capabilityCentre: true,
      },
    });

    res.json(framework);
  } catch (error) {
    console.error('Error updating framework:', error);
    res.status(500).json({ error: 'Failed to update framework' });
  }
});

// Delete a framework (products will have frameworkId set to null)
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify ownership through capability centre
    const existing = await prisma.framework.findFirst({
      where: {
        id,
        capabilityCentre: {
          userId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    await prisma.framework.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting framework:', error);
    res.status(500).json({ error: 'Failed to delete framework' });
  }
});

// Add a product to a framework
router.post('/:id/products/:productId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, productId } = req.params;
    const userId = req.user!.id;

    // Verify framework ownership through capability centre
    const framework = await prisma.framework.findFirst({
      where: {
        id,
        capabilityCentre: {
          userId,
        },
      },
    });

    if (!framework) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update product's framework
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { frameworkId: id },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error adding product to framework:', error);
    res.status(500).json({ error: 'Failed to add product to framework' });
  }
});

// Move a product to the Unassigned framework (products must always have a framework)
router.delete('/:id/products/:productId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, productId } = req.params;
    const userId = req.user!.id;

    // Verify framework ownership through capability centre
    const framework = await prisma.framework.findFirst({
      where: {
        id,
        capabilityCentre: {
          userId,
        },
      },
      include: {
        capabilityCentre: true,
      },
    });

    if (!framework) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    // Verify product belongs to this framework
    const product = await prisma.product.findFirst({
      where: { id: productId, userId, frameworkId: id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found in this framework' });
    }

    // Find or create the Unassigned framework for this capability centre
    let unassignedFramework = await prisma.framework.findFirst({
      where: {
        capabilityCentreId: framework.capabilityCentreId,
        isUnassigned: true,
      },
    });

    if (!unassignedFramework) {
      unassignedFramework = await prisma.framework.create({
        data: {
          name: 'Unassigned',
          description: 'Products not yet assigned to a specific framework',
          code: 'UNASSIGNED',
          color: '#9e9e9e',
          isUnassigned: true,
          capabilityCentreId: framework.capabilityCentreId,
        },
      });
    }

    // Move product to Unassigned framework
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { frameworkId: unassignedFramework.id },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error moving product to Unassigned:', error);
    res.status(500).json({ error: 'Failed to move product to Unassigned' });
  }
});

// Get aggregate compliance stats across all frameworks
router.get('/stats/overview', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get all products (both in frameworks and unassigned)
    const products = await prisma.product.findMany({
      where: { userId },
      include: {
        framework: true,
        systems: {
          include: {
            assessments: true,
          },
        },
      },
    });

    // Organize by framework
    const frameworkMap = new Map<string | null, {
      id: string | null;
      name: string;
      color: string | null;
      products: typeof products;
    }>();

    products.forEach((product) => {
      const fwId = product.frameworkId;
      if (!frameworkMap.has(fwId)) {
        frameworkMap.set(fwId, {
          id: fwId,
          name: product.framework?.name || 'Unassigned',
          color: product.framework?.color || '#9e9e9e',
          products: [],
        });
      }
      frameworkMap.get(fwId)!.products.push(product);
    });

    // Calculate stats per framework
    const overview = Array.from(frameworkMap.values()).map((fw) => {
      let totalAssessments = 0;
      let implementedCount = 0;
      let partialCount = 0;
      let notAssessedCount = 0;
      let notApplicableCount = 0;
      let systemCount = 0;

      fw.products.forEach((product) => {
        systemCount += product.systems.length;
        product.systems.forEach((system) => {
          system.assessments.forEach((assessment) => {
            totalAssessments++;
            switch (assessment.status) {
              case 'IMPLEMENTED':
                implementedCount++;
                break;
              case 'PARTIALLY_IMPLEMENTED':
                partialCount++;
                break;
              case 'NOT_ASSESSED':
                notAssessedCount++;
                break;
              case 'NOT_APPLICABLE':
                notApplicableCount++;
                break;
            }
          });
        });
      });

      const assessedCount = totalAssessments - notAssessedCount - notApplicableCount;
      const complianceScore = assessedCount > 0
        ? Math.round(((implementedCount + partialCount * 0.5) / assessedCount) * 100)
        : 0;

      return {
        frameworkId: fw.id,
        frameworkName: fw.name,
        frameworkColor: fw.color,
        productCount: fw.products.length,
        systemCount,
        complianceScore,
        stats: {
          totalAssessments,
          implementedCount,
          partialCount,
          notAssessedCount,
          notApplicableCount,
        },
      };
    });

    // Sort: frameworks first (by name), unassigned last
    overview.sort((a, b) => {
      if (a.frameworkId === null) return 1;
      if (b.frameworkId === null) return -1;
      return a.frameworkName.localeCompare(b.frameworkName);
    });

    // Calculate overall totals
    const totals = overview.reduce(
      (acc, fw) => ({
        totalProducts: acc.totalProducts + fw.productCount,
        totalSystems: acc.totalSystems + fw.systemCount,
        totalAssessments: acc.totalAssessments + fw.stats.totalAssessments,
        implementedCount: acc.implementedCount + fw.stats.implementedCount,
        partialCount: acc.partialCount + fw.stats.partialCount,
        notAssessedCount: acc.notAssessedCount + fw.stats.notAssessedCount,
        notApplicableCount: acc.notApplicableCount + fw.stats.notApplicableCount,
      }),
      {
        totalProducts: 0,
        totalSystems: 0,
        totalAssessments: 0,
        implementedCount: 0,
        partialCount: 0,
        notAssessedCount: 0,
        notApplicableCount: 0,
      }
    );

    const assessedTotal = totals.totalAssessments - totals.notAssessedCount - totals.notApplicableCount;
    const overallComplianceScore = assessedTotal > 0
      ? Math.round(((totals.implementedCount + totals.partialCount * 0.5) / assessedTotal) * 100)
      : 0;

    res.json({
      frameworks: overview,
      totals: {
        ...totals,
        overallComplianceScore,
        frameworkCount: overview.filter((f) => f.frameworkId !== null).length,
      },
    });
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
});

export default router;

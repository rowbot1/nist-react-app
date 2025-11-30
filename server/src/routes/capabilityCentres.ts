import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();


// Get all capability centres for the current user with hierarchy and compliance stats
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const capabilityCentres = await prisma.capabilityCentre.findMany({
      where: { userId },
      include: {
        frameworks: {
          include: {
            products: {
              include: {
                systems: {
                  include: {
                    assessments: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate compliance stats for each capability centre
    const capabilityCentresWithStats = capabilityCentres.map((cc) => {
      let totalAssessments = 0;
      let compliantCount = 0;
      let partialCount = 0;
      let nonCompliantCount = 0;
      let notAssessedCount = 0;
      let notApplicableCount = 0;
      let systemCount = 0;
      let productCount = 0;

      cc.frameworks.forEach((framework) => {
        productCount += framework.products.length;
        framework.products.forEach((product) => {
          systemCount += product.systems.length;
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
      });

      const assessedCount = totalAssessments - notAssessedCount - notApplicableCount;
      const complianceScore = assessedCount > 0
        ? Math.round(((compliantCount + partialCount * 0.5) / assessedCount) * 100)
        : 0;

      return {
        id: cc.id,
        name: cc.name,
        code: cc.code,
        description: cc.description,
        color: cc.color,
        icon: cc.icon,
        createdAt: cc.createdAt,
        updatedAt: cc.updatedAt,
        stats: {
          frameworkCount: cc.frameworks.length,
          productCount,
          systemCount,
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

    res.json(capabilityCentresWithStats);
  } catch (error) {
    console.error('Error fetching capability centres:', error);
    res.status(500).json({ error: 'Failed to fetch capability centres' });
  }
});

// Get a single capability centre by ID with full hierarchy
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const capabilityCentre = await prisma.capabilityCentre.findFirst({
      where: { id, userId },
      include: {
        frameworks: {
          include: {
            products: {
              include: {
                systems: {
                  include: {
                    assessments: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!capabilityCentre) {
      return res.status(404).json({ error: 'Capability centre not found' });
    }

    // Calculate compliance stats per framework
    const frameworksWithStats = capabilityCentre.frameworks.map((framework) => {
      let totalAssessments = 0;
      let compliantCount = 0;
      let partialCount = 0;
      let notAssessedCount = 0;
      let notApplicableCount = 0;
      let systemCount = 0;

      framework.products.forEach((product) => {
        systemCount += product.systems.length;
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
        productCount: framework.products.length,
        systemCount,
        complianceScore,
        stats: {
          totalAssessments,
          compliantCount,
          partialCount,
          notAssessedCount,
        },
      };
    });

    res.json({
      ...capabilityCentre,
      frameworks: frameworksWithStats,
    });
  } catch (error) {
    console.error('Error fetching capability centre:', error);
    res.status(500).json({ error: 'Failed to fetch capability centre' });
  }
});

// Create a new capability centre
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, description, color, icon } = req.body;
    const userId = req.user!.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Capability centre name is required' });
    }

    const capabilityCentre = await prisma.capabilityCentre.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
        color: color || '#1976d2',
        icon: icon || 'Business',
        userId,
      },
    });

    res.status(201).json(capabilityCentre);
  } catch (error) {
    console.error('Error creating capability centre:', error);
    res.status(500).json({ error: 'Failed to create capability centre' });
  }
});

// Update a capability centre
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description, color, icon } = req.body;
    const userId = req.user!.id;

    // Verify ownership
    const existing = await prisma.capabilityCentre.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Capability centre not found' });
    }

    const capabilityCentre = await prisma.capabilityCentre.update({
      where: { id },
      data: {
        name: name?.trim() || existing.name,
        code: code?.trim() ?? existing.code,
        description: description?.trim() ?? existing.description,
        color: color || existing.color,
        icon: icon || existing.icon,
      },
    });

    res.json(capabilityCentre);
  } catch (error) {
    console.error('Error updating capability centre:', error);
    res.status(500).json({ error: 'Failed to update capability centre' });
  }
});

// Delete a capability centre (cascades to frameworks)
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const existing = await prisma.capabilityCentre.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Capability centre not found' });
    }

    await prisma.capabilityCentre.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting capability centre:', error);
    res.status(500).json({ error: 'Failed to delete capability centre' });
  }
});

// Get the complete organizational hierarchy with compliance roll-up
router.get('/hierarchy/full', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const capabilityCentres = await prisma.capabilityCentre.findMany({
      where: { userId },
      include: {
        frameworks: {
          include: {
            products: {
              include: {
                systems: {
                  include: {
                    assessments: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build hierarchical structure with compliance at each level
    const hierarchy = capabilityCentres.map((cc) => {
      let ccTotalAssessments = 0;
      let ccCompliantCount = 0;
      let ccPartialCount = 0;
      let ccNonCompliantCount = 0;
      let ccNotAssessedCount = 0;

      const frameworksData = cc.frameworks.map((fw) => {
        let fwTotalAssessments = 0;
        let fwCompliantCount = 0;
        let fwPartialCount = 0;
        let fwNonCompliantCount = 0;
        let fwNotAssessedCount = 0;

        const productsData = fw.products.map((prod) => {
          let prodTotalAssessments = 0;
          let prodCompliantCount = 0;
          let prodPartialCount = 0;
          let prodNonCompliantCount = 0;
          let prodNotAssessedCount = 0;

          const systemsData = prod.systems.map((sys) => {
            let sysCompliantCount = 0;
            let sysPartialCount = 0;
            let sysNonCompliantCount = 0;
            let sysNotAssessedCount = 0;

            sys.assessments.forEach((a) => {
              switch (a.status) {
                case 'COMPLIANT':
                  sysCompliantCount++;
                  prodCompliantCount++;
                  fwCompliantCount++;
                  ccCompliantCount++;
                  break;
                case 'PARTIALLY_COMPLIANT':
                  sysPartialCount++;
                  prodPartialCount++;
                  fwPartialCount++;
                  ccPartialCount++;
                  break;
                case 'NON_COMPLIANT':
                  sysNonCompliantCount++;
                  prodNonCompliantCount++;
                  fwNonCompliantCount++;
                  ccNonCompliantCount++;
                  break;
                case 'NOT_ASSESSED':
                  sysNotAssessedCount++;
                  prodNotAssessedCount++;
                  fwNotAssessedCount++;
                  ccNotAssessedCount++;
                  break;
              }
            });

            const sysTotal = sys.assessments.length;
            const sysAssessed = sysTotal - sysNotAssessedCount;
            const sysScore = sysAssessed > 0
              ? Math.round(((sysCompliantCount + sysPartialCount * 0.5) / sysAssessed) * 100)
              : 0;

            prodTotalAssessments += sysTotal;
            fwTotalAssessments += sysTotal;
            ccTotalAssessments += sysTotal;

            return {
              id: sys.id,
              name: sys.name,
              criticality: sys.criticality,
              environment: sys.environment,
              complianceScore: sysScore,
              assessmentCount: sysTotal,
            };
          });

          const prodAssessed = prodTotalAssessments - prodNotAssessedCount;
          const prodScore = prodAssessed > 0
            ? Math.round(((prodCompliantCount + prodPartialCount * 0.5) / prodAssessed) * 100)
            : 0;

          return {
            id: prod.id,
            name: prod.name,
            type: prod.type,
            criticality: prod.criticality,
            complianceScore: prodScore,
            systemCount: prod.systems.length,
            systems: systemsData,
          };
        });

        const fwAssessed = fwTotalAssessments - fwNotAssessedCount;
        const fwScore = fwAssessed > 0
          ? Math.round(((fwCompliantCount + fwPartialCount * 0.5) / fwAssessed) * 100)
          : 0;

        return {
          id: fw.id,
          name: fw.name,
          code: fw.code,
          color: fw.color,
          icon: fw.icon,
          complianceScore: fwScore,
          productCount: fw.products.length,
          products: productsData,
        };
      });

      const ccAssessed = ccTotalAssessments - ccNotAssessedCount;
      const ccScore = ccAssessed > 0
        ? Math.round(((ccCompliantCount + ccPartialCount * 0.5) / ccAssessed) * 100)
        : 0;

      return {
        id: cc.id,
        name: cc.name,
        code: cc.code,
        color: cc.color,
        icon: cc.icon,
        complianceScore: ccScore,
        frameworkCount: cc.frameworks.length,
        frameworks: frameworksData,
      };
    });

    res.json(hierarchy);
  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy' });
  }
});

export default router;

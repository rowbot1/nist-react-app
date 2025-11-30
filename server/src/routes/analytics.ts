import express from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();


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

// Helper function to calculate compliance score
function calculateComplianceScore(assessments: any[]): number {
  const completed = assessments.filter(a => a.status !== 'NOT_ASSESSED' && a.status !== 'NOT_APPLICABLE');
  if (completed.length === 0) return 0;

  const weights = {
    COMPLIANT: 1.0,
    PARTIALLY_COMPLIANT: 0.5,
    NON_COMPLIANT: 0.0
  };

  const totalScore = completed.reduce((sum, a) => {
    return sum + (weights[a.status as keyof typeof weights] || 0);
  }, 0);

  return Math.round((totalScore / completed.length) * 100);
}

// GET /api/analytics/overview - Overall compliance metrics
router.get('/overview', async (req: AuthenticatedRequest, res) => {
  try {
    // Get all products for user
    const products = await prisma.product.findMany({
      where: { userId: req.user!.id },
      include: {
        systems: {
          include: {
            assessments: true
          }
        }
      }
    });

    // Calculate overall metrics
    const totalProducts = products.length;
    const totalSystems = products.reduce((sum, p) => sum + p.systems.length, 0);

    const allAssessments = products.flatMap(p =>
      p.systems.flatMap(s => s.assessments)
    );
    const totalAssessments = allAssessments.length;

    const completedAssessments = allAssessments.filter(
      a => a.status !== 'NOT_ASSESSED' && a.status !== 'NOT_APPLICABLE'
    ).length;

    const compliantAssessments = allAssessments.filter(a => a.status === 'COMPLIANT').length;

    const averageComplianceScore = calculateComplianceScore(allAssessments);
    const completionRate = totalAssessments > 0
      ? Math.round((completedAssessments / totalAssessments) * 100)
      : 0;

    // Status breakdown
    const statusBreakdown = {
      NOT_ASSESSED: allAssessments.filter(a => a.status === 'NOT_ASSESSED').length,
      COMPLIANT: allAssessments.filter(a => a.status === 'COMPLIANT').length,
      PARTIALLY_COMPLIANT: allAssessments.filter(a => a.status === 'PARTIALLY_COMPLIANT').length,
      NON_COMPLIANT: allAssessments.filter(a => a.status === 'NON_COMPLIANT').length,
      NOT_APPLICABLE: allAssessments.filter(a => a.status === 'NOT_APPLICABLE').length
    };

    // Product-level metrics
    const productMetrics = products.map(product => {
      const productAssessments = product.systems.flatMap(s => s.assessments);
      return {
        productId: product.id,
        productName: product.name,
        systemsCount: product.systems.length,
        assessmentsCount: productAssessments.length,
        complianceScore: calculateComplianceScore(productAssessments),
        completionRate: productAssessments.length > 0
          ? Math.round((productAssessments.filter(a => a.status !== 'NOT_ASSESSED').length / productAssessments.length) * 100)
          : 0
      };
    });

    res.json({
      overview: {
        totalProducts,
        totalSystems,
        totalAssessments,
        completedAssessments,
        compliantAssessments,
        averageComplianceScore,
        completionRate
      },
      statusBreakdown,
      productMetrics
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// GET /api/analytics/compliance/:productId - Product-level compliance breakdown by function/category
router.get('/compliance/:productId', async (req: AuthenticatedRequest, res) => {
  try {
    // Verify product ownership
    const hasAccess = await verifyProductOwnership(req.params.productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get product with systems and assessments
    const product = await prisma.product.findUnique({
      where: { id: req.params.productId },
      include: {
        systems: {
          include: {
            assessments: true
          }
        },
        csfBaseline: {
          where: { applicable: true }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get all CSF controls for mapping
    const controls = await prisma.cSFControl.findMany();
    const controlsMap = new Map(controls.map(c => [c.id, c]));

    // Get all assessments for the product
    const allAssessments = product.systems.flatMap(s => s.assessments);

    // Group assessments by CSF function
    const functionBreakdown = new Map<string, any>();

    allAssessments.forEach(assessment => {
      const control = controlsMap.get(assessment.subcategoryId);
      if (!control) return;

      if (!functionBreakdown.has(control.functionId)) {
        functionBreakdown.set(control.functionId, {
          functionId: control.functionId,
          assessments: [],
          categories: new Map<string, any>()
        });
      }

      const funcData = functionBreakdown.get(control.functionId)!;
      funcData.assessments.push(assessment);

      if (!funcData.categories.has(control.categoryId)) {
        funcData.categories.set(control.categoryId, {
          categoryId: control.categoryId,
          assessments: []
        });
      }

      funcData.categories.get(control.categoryId)!.assessments.push(assessment);
    });

    // Calculate metrics for each function and category
    const functionMetrics = Array.from(functionBreakdown.entries()).map(([functionId, data]) => {
      const categoryMetrics = Array.from(data.categories.entries() as IterableIterator<[string, any]>).map(([categoryId, catData]) => ({
        categoryId,
        total: catData.assessments.length,
        compliant: catData.assessments.filter((a: any) => a.status === 'COMPLIANT').length,
        partiallyCompliant: catData.assessments.filter((a: any) => a.status === 'PARTIALLY_COMPLIANT').length,
        nonCompliant: catData.assessments.filter((a: any) => a.status === 'NON_COMPLIANT').length,
        notAssessed: catData.assessments.filter((a: any) => a.status === 'NOT_ASSESSED').length,
        complianceScore: calculateComplianceScore(catData.assessments)
      }));

      return {
        functionId,
        total: data.assessments.length,
        compliant: data.assessments.filter((a: any) => a.status === 'COMPLIANT').length,
        partiallyCompliant: data.assessments.filter((a: any) => a.status === 'PARTIALLY_COMPLIANT').length,
        nonCompliant: data.assessments.filter((a: any) => a.status === 'NON_COMPLIANT').length,
        notAssessed: data.assessments.filter((a: any) => a.status === 'NOT_ASSESSED').length,
        complianceScore: calculateComplianceScore(data.assessments),
        categories: categoryMetrics
      };
    });

    // Overall product compliance
    const overallMetrics = {
      totalAssessments: allAssessments.length,
      complianceScore: calculateComplianceScore(allAssessments),
      completionRate: allAssessments.length > 0
        ? Math.round((allAssessments.filter(a => a.status !== 'NOT_ASSESSED').length / allAssessments.length) * 100)
        : 0
    };

    res.json({
      productId: product.id,
      productName: product.name,
      overall: overallMetrics,
      functions: functionMetrics
    });
  } catch (error) {
    console.error('Error fetching compliance breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch compliance breakdown' });
  }
});

// GET /api/analytics/trends - Compliance trend over time
router.get('/trends', async (req: AuthenticatedRequest, res) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Get all assessments for user's products within date range
    const assessments = await prisma.complianceAssessment.findMany({
      where: {
        system: {
          product: {
            userId: req.user!.id
          }
        },
        assessedDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { assessedDate: 'asc' }
    });

    // Group assessments by date
    const trendData = new Map<string, any>();

    assessments.forEach(assessment => {
      if (!assessment.assessedDate) return;

      const dateKey = assessment.assessedDate.toISOString().split('T')[0];

      if (!trendData.has(dateKey)) {
        trendData.set(dateKey, {
          date: dateKey,
          assessments: []
        });
      }

      trendData.get(dateKey)!.assessments.push(assessment);
    });

    // Calculate cumulative compliance score
    let cumulativeAssessments: any[] = [];
    const trends = Array.from(trendData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        cumulativeAssessments = [...cumulativeAssessments, ...data.assessments];

        return {
          date,
          totalAssessments: data.assessments.length,
          cumulativeTotal: cumulativeAssessments.length,
          complianceScore: calculateComplianceScore(data.assessments),
          cumulativeComplianceScore: calculateComplianceScore(cumulativeAssessments),
          compliant: data.assessments.filter((a: any) => a.status === 'COMPLIANT').length,
          partiallyCompliant: data.assessments.filter((a: any) => a.status === 'PARTIALLY_COMPLIANT').length,
          nonCompliant: data.assessments.filter((a: any) => a.status === 'NON_COMPLIANT').length
        };
      });

    res.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days: daysNum,
      trends
    });
  } catch (error) {
    console.error('Error fetching compliance trends:', error);
    res.status(500).json({ error: 'Failed to fetch compliance trends' });
  }
});

// GET /api/analytics/gaps/:productId - Gap analysis
router.get('/gaps/:productId', async (req: AuthenticatedRequest, res) => {
  try {
    // Verify product ownership
    const hasAccess = await verifyProductOwnership(req.params.productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get product with assessments
    const product = await prisma.product.findUnique({
      where: { id: req.params.productId },
      include: {
        systems: {
          include: {
            assessments: {
              where: {
                OR: [
                  { status: 'NON_COMPLIANT' },
                  { status: 'PARTIALLY_COMPLIANT' }
                ]
              }
            }
          }
        },
        csfBaseline: {
          where: { applicable: true }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get CSF control details
    const controls = await prisma.cSFControl.findMany();
    const controlsMap = new Map(controls.map(c => [c.id, c]));

    // Get NIST 800-53 mappings
    const mappings = await prisma.nIST80053Mapping.findMany();
    const mappingsMap = new Map<string, any[]>();
    mappings.forEach(m => {
      if (!mappingsMap.has(m.csfControlId)) {
        mappingsMap.set(m.csfControlId, []);
      }
      mappingsMap.get(m.csfControlId)!.push(m);
    });

    // Collect all gaps
    const gaps = product.systems.flatMap(system =>
      system.assessments.map(assessment => {
        const control = controlsMap.get(assessment.subcategoryId);
        const baseline = product.csfBaseline.find(b => b.subcategoryId === assessment.subcategoryId);
        const nistMappings = mappingsMap.get(assessment.subcategoryId) || [];

        return {
          assessmentId: assessment.id,
          systemId: system.id,
          systemName: system.name,
          subcategoryId: assessment.subcategoryId,
          controlTitle: control?.title || 'Unknown',
          functionId: control?.functionId || 'Unknown',
          categoryId: control?.categoryId || 'Unknown',
          status: assessment.status,
          categoryLevel: baseline?.categoryLevel || 'SHOULD_HAVE',
          details: assessment.details,
          remediationPlan: assessment.remediationPlan,
          assessedDate: assessment.assessedDate,
          nist80053Controls: nistMappings.map(m => ({
            controlId: m.nist80053Id,
            family: m.controlFamily,
            priority: m.priority
          })),
          priority: assessment.status === 'NON_COMPLIANT' ? 'HIGH' : 'MEDIUM'
        };
      })
    );

    // Sort by priority and category level
    const sortedGaps = gaps.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const levelOrder = { MUST_HAVE: 0, SHOULD_HAVE: 1 };

      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder];
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder];

      if (aPriority !== bPriority) return aPriority - bPriority;

      const aLevel = levelOrder[a.categoryLevel as keyof typeof levelOrder] || 1;
      const bLevel = levelOrder[b.categoryLevel as keyof typeof levelOrder] || 1;

      return aLevel - bLevel;
    });

    // Group by function for summary
    const gapsByFunction = new Map<string, any[]>();
    gaps.forEach(gap => {
      if (!gapsByFunction.has(gap.functionId)) {
        gapsByFunction.set(gap.functionId, []);
      }
      gapsByFunction.get(gap.functionId)!.push(gap);
    });

    const functionSummary = Array.from(gapsByFunction.entries()).map(([functionId, gaps]) => ({
      functionId,
      totalGaps: gaps.length,
      nonCompliant: gaps.filter(g => g.status === 'NON_COMPLIANT').length,
      partiallyCompliant: gaps.filter(g => g.status === 'PARTIALLY_COMPLIANT').length,
      mustHave: gaps.filter(g => g.categoryLevel === 'MUST_HAVE').length
    }));

    res.json({
      productId: product.id,
      productName: product.name,
      summary: {
        totalGaps: gaps.length,
        nonCompliant: gaps.filter(g => g.status === 'NON_COMPLIANT').length,
        partiallyCompliant: gaps.filter(g => g.status === 'PARTIALLY_COMPLIANT').length,
        mustHave: gaps.filter(g => g.categoryLevel === 'MUST_HAVE').length,
        shouldHave: gaps.filter(g => g.categoryLevel === 'SHOULD_HAVE').length
      },
      functionSummary,
      gaps: sortedGaps
    });
  } catch (error) {
    console.error('Error fetching gap analysis:', error);
    res.status(500).json({ error: 'Failed to fetch gap analysis' });
  }
});

// GET /api/analytics/functions - Compliance score by CSF function
router.get('/functions', async (req: AuthenticatedRequest, res) => {
  try {
    // Get all products for user
    const products = await prisma.product.findMany({
      where: { userId: req.user!.id },
      include: {
        systems: {
          include: {
            assessments: true
          }
        }
      }
    });

    // Get all CSF controls
    const controls = await prisma.cSFControl.findMany();
    const controlsMap = new Map(controls.map(c => [c.id, c]));

    // Aggregate all assessments
    const allAssessments = products.flatMap(p =>
      p.systems.flatMap(s => s.assessments)
    );

    // Group by function
    const functionData = new Map<string, any[]>();

    allAssessments.forEach(assessment => {
      const control = controlsMap.get(assessment.subcategoryId);
      if (!control) return;

      if (!functionData.has(control.functionId)) {
        functionData.set(control.functionId, []);
      }
      functionData.get(control.functionId)!.push(assessment);
    });

    // Calculate metrics for each function
    const functionMetrics = Array.from(functionData.entries()).map(([functionId, assessments]) => {
      const total = assessments.length;
      const completed = assessments.filter(a => a.status !== 'NOT_ASSESSED' && a.status !== 'NOT_APPLICABLE').length;

      return {
        functionId,
        functionName: getFunctionName(functionId),
        total,
        completed,
        compliant: assessments.filter(a => a.status === 'COMPLIANT').length,
        partiallyCompliant: assessments.filter(a => a.status === 'PARTIALLY_COMPLIANT').length,
        nonCompliant: assessments.filter(a => a.status === 'NON_COMPLIANT').length,
        notAssessed: assessments.filter(a => a.status === 'NOT_ASSESSED').length,
        complianceScore: calculateComplianceScore(assessments),
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    }).sort((a, b) => a.functionId.localeCompare(b.functionId));

    res.json({
      functions: functionMetrics,
      overall: {
        totalAssessments: allAssessments.length,
        complianceScore: calculateComplianceScore(allAssessments)
      }
    });
  } catch (error) {
    console.error('Error fetching function analytics:', error);
    res.status(500).json({ error: 'Failed to fetch function analytics' });
  }
});

// Helper function to get function name
function getFunctionName(functionId: string): string {
  const names: Record<string, string> = {
    'GV': 'Govern',
    'ID': 'Identify',
    'PR': 'Protect',
    'DE': 'Detect',
    'RS': 'Respond',
    'RC': 'Recover'
  };
  return names[functionId] || functionId;
}

export default router;

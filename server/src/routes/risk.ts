import express, { Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

const router = express.Router();


// Validation schemas
const riskConfigSchema = z.object({
  weights: z.object({
    controlCriticalityWeight: z.number().min(0).max(1),
    systemCriticalityWeight: z.number().min(0).max(1),
    dataClassificationWeight: z.number().min(0).max(1),
  }),
  customPriorities: z.record(z.number()).optional(),
});

// Helper to verify product ownership
async function verifyProductOwnership(productId: string, userId: string): Promise<boolean> {
  const product = await prisma.product.findFirst({
    where: { id: productId, userId },
  });
  return !!product;
}

// CSF Function priorities (default)
const DEFAULT_FUNCTION_PRIORITIES: Record<string, number> = {
  GV: 0.9,  // Govern - foundational
  ID: 0.85, // Identify - critical for understanding
  PR: 0.95, // Protect - highest priority
  DE: 0.8,  // Detect - important
  RS: 0.75, // Respond - reactive
  RC: 0.7,  // Recover - recovery focused
};

// GET /api/risk/config/:productId - Get risk configuration for a product
router.get('/config/:productId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;

    // Verify ownership
    const hasAccess = await verifyProductOwnership(productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const config = await prisma.riskConfig.findUnique({
      where: { productId },
    });

    if (!config) {
      // Return default config
      return res.json({
        productId,
        weights: {
          controlCriticalityWeight: 0.4,
          systemCriticalityWeight: 0.3,
          dataClassificationWeight: 0.3,
        },
        customPriorities: null,
        isDefault: true,
      });
    }

    res.json({
      ...config,
      weights: JSON.parse(config.weights),
      customPriorities: config.customPriorities ? JSON.parse(config.customPriorities) : null,
      isDefault: false,
    });
  } catch (error) {
    console.error('Error fetching risk config:', error);
    res.status(500).json({ error: 'Failed to fetch risk configuration' });
  }
});

// PUT /api/risk/config/:productId - Update risk configuration
router.put('/config/:productId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const validation = riskConfigSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    // Verify ownership
    const hasAccess = await verifyProductOwnership(productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { weights, customPriorities } = validation.data;

    // Validate weights sum to approximately 1
    const weightSum = weights.controlCriticalityWeight + weights.systemCriticalityWeight + weights.dataClassificationWeight;
    if (Math.abs(weightSum - 1) > 0.01) {
      return res.status(400).json({ error: 'Weights must sum to 1' });
    }

    const config = await prisma.riskConfig.upsert({
      where: { productId },
      update: {
        weights: JSON.stringify(weights),
        customPriorities: customPriorities ? JSON.stringify(customPriorities) : null,
      },
      create: {
        productId,
        weights: JSON.stringify(weights),
        customPriorities: customPriorities ? JSON.stringify(customPriorities) : null,
      },
    });

    res.json({
      ...config,
      weights: JSON.parse(config.weights),
      customPriorities: config.customPriorities ? JSON.parse(config.customPriorities) : null,
    });
  } catch (error) {
    console.error('Error updating risk config:', error);
    res.status(500).json({ error: 'Failed to update risk configuration' });
  }
});

// GET /api/risk/score/:productId - Calculate risk scores for all non-compliant controls
router.get('/score/:productId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { systemId } = req.query;

    // Verify ownership
    const hasAccess = await verifyProductOwnership(productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get product with all data
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        systems: {
          where: systemId ? { id: systemId as string } : undefined,
          include: {
            assessments: {
              where: {
                status: { in: ['NON_COMPLIANT', 'PARTIALLY_COMPLIANT'] },
              },
            },
          },
        },
        csfBaseline: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get risk config
    const riskConfig = await prisma.riskConfig.findUnique({
      where: { productId },
    });

    const weights = riskConfig ? JSON.parse(riskConfig.weights) : {
      controlCriticalityWeight: 0.4,
      systemCriticalityWeight: 0.3,
      dataClassificationWeight: 0.3,
    };

    const customPriorities = riskConfig?.customPriorities
      ? JSON.parse(riskConfig.customPriorities)
      : null;

    // Calculate scores
    const scores: any[] = [];
    for (const system of product.systems) {
      for (const assessment of system.assessments) {
        const score = calculateRiskScore(
          assessment,
          system,
          product.csfBaseline,
          weights,
          customPriorities
        );
        scores.push({
          systemId: system.id,
          systemName: system.name,
          controlId: assessment.subcategoryId,
          status: assessment.status,
          ...score,
        });
      }
    }

    // Sort by risk score descending
    scores.sort((a, b) => b.riskScore - a.riskScore);

    res.json({
      productId,
      systemCount: product.systems.length,
      totalRiskItems: scores.length,
      scores,
    });
  } catch (error) {
    console.error('Error calculating risk scores:', error);
    res.status(500).json({ error: 'Failed to calculate risk scores' });
  }
});

// GET /api/risk/heatmap/:productId - Get risk heat map data
router.get('/heatmap/:productId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;

    // Verify ownership
    const hasAccess = await verifyProductOwnership(productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get product with systems and assessments
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        systems: {
          include: {
            assessments: {
              where: {
                status: { in: ['NON_COMPLIANT', 'PARTIALLY_COMPLIANT'] },
              },
            },
          },
        },
        csfBaseline: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get risk config
    const riskConfig = await prisma.riskConfig.findUnique({
      where: { productId },
    });

    const weights = riskConfig ? JSON.parse(riskConfig.weights) : {
      controlCriticalityWeight: 0.4,
      systemCriticalityWeight: 0.3,
      dataClassificationWeight: 0.3,
    };

    // Build heat map: function x system
    const heatMap: Record<string, Record<string, { count: number; avgScore: number; maxScore: number }>> = {};
    const functionNames = ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'];

    // Initialize
    for (const func of functionNames) {
      heatMap[func] = {};
      for (const system of product.systems) {
        heatMap[func][system.name] = { count: 0, avgScore: 0, maxScore: 0 };
      }
    }

    // Populate
    for (const system of product.systems) {
      for (const assessment of system.assessments) {
        const func = assessment.subcategoryId.split('.')[0];
        if (heatMap[func] && heatMap[func][system.name]) {
          const score = calculateRiskScore(assessment, system, product.csfBaseline, weights, null);
          heatMap[func][system.name].count++;
          heatMap[func][system.name].avgScore += score.riskScore;
          heatMap[func][system.name].maxScore = Math.max(heatMap[func][system.name].maxScore, score.riskScore);
        }
      }
    }

    // Calculate averages
    for (const func of functionNames) {
      for (const system of product.systems) {
        if (heatMap[func][system.name].count > 0) {
          heatMap[func][system.name].avgScore = Math.round(
            heatMap[func][system.name].avgScore / heatMap[func][system.name].count
          );
        }
      }
    }

    // Also build function-only heat map
    const byFunction: Record<string, { count: number; totalScore: number; avgScore: number }> = {};
    for (const func of functionNames) {
      byFunction[func] = { count: 0, totalScore: 0, avgScore: 0 };
      for (const systemData of Object.values(heatMap[func])) {
        byFunction[func].count += systemData.count;
        byFunction[func].totalScore += systemData.avgScore * systemData.count;
      }
      if (byFunction[func].count > 0) {
        byFunction[func].avgScore = Math.round(byFunction[func].totalScore / byFunction[func].count);
      }
    }

    res.json({
      productId,
      systems: product.systems.map((s) => ({ id: s.id, name: s.name })),
      functions: functionNames,
      heatMap,
      byFunction,
    });
  } catch (error) {
    console.error('Error generating heat map:', error);
    res.status(500).json({ error: 'Failed to generate heat map' });
  }
});

// GET /api/risk/priorities/:productId - Get prioritized remediation recommendations
router.get('/priorities/:productId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { limit = 20 } = req.query;

    // Verify ownership
    const hasAccess = await verifyProductOwnership(productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get product with all data
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        systems: {
          include: {
            assessments: {
              where: {
                status: { in: ['NON_COMPLIANT', 'PARTIALLY_COMPLIANT'] },
              },
              include: {
                remediationTasks: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        csfBaseline: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get risk config
    const riskConfig = await prisma.riskConfig.findUnique({
      where: { productId },
    });

    const weights = riskConfig ? JSON.parse(riskConfig.weights) : {
      controlCriticalityWeight: 0.4,
      systemCriticalityWeight: 0.3,
      dataClassificationWeight: 0.3,
    };

    // Calculate priorities
    const priorities: any[] = [];
    for (const system of product.systems) {
      for (const assessment of system.assessments) {
        const score = calculateRiskScore(assessment, system, product.csfBaseline, weights, null);
        const hasTask = assessment.remediationTasks.length > 0;
        const taskStatus = hasTask ? assessment.remediationTasks[0].status : null;

        priorities.push({
          systemId: system.id,
          systemName: system.name,
          controlId: assessment.subcategoryId,
          status: assessment.status,
          riskScore: score.riskScore,
          riskLevel: score.riskLevel,
          hasRemediationTask: hasTask,
          taskStatus,
          recommendation: generateRecommendation(assessment, system, score),
          quickWin: isQuickWin(assessment, system, score),
        });
      }
    }

    // Sort by risk score descending
    priorities.sort((a, b) => b.riskScore - a.riskScore);

    // Identify quick wins (high impact, potentially low effort)
    const quickWins = priorities.filter((p) => p.quickWin).slice(0, 5);

    // Group by risk level
    const byRiskLevel = {
      CRITICAL: priorities.filter((p) => p.riskLevel === 'CRITICAL'),
      HIGH: priorities.filter((p) => p.riskLevel === 'HIGH'),
      MEDIUM: priorities.filter((p) => p.riskLevel === 'MEDIUM'),
      LOW: priorities.filter((p) => p.riskLevel === 'LOW'),
    };

    res.json({
      productId,
      totalItems: priorities.length,
      topPriorities: priorities.slice(0, Number(limit)),
      quickWins,
      byRiskLevel: {
        CRITICAL: byRiskLevel.CRITICAL.length,
        HIGH: byRiskLevel.HIGH.length,
        MEDIUM: byRiskLevel.MEDIUM.length,
        LOW: byRiskLevel.LOW.length,
      },
      criticalItems: byRiskLevel.CRITICAL,
    });
  } catch (error) {
    console.error('Error calculating priorities:', error);
    res.status(500).json({ error: 'Failed to calculate priorities' });
  }
});

// GET /api/risk/trends/:productId - Get risk trends over time
router.get('/trends/:productId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { days = 30 } = req.query;

    // Verify ownership
    const hasAccess = await verifyProductOwnership(productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    // Get audit logs for assessment status changes
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Assessment',
        action: 'UPDATE',
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Get product systems to filter relevant logs
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { systems: { select: { id: true } } },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const systemIds = new Set(product.systems.map((s) => s.id));

    // Build trend data
    const dailyData: Record<string, { improvements: number; regressions: number; netChange: number }> = {};

    for (const log of auditLogs) {
      try {
        if (log.changedFields && log.changedFields.includes('status')) {
          const details = log.details ? JSON.parse(log.details) : null;
          if (!details || !systemIds.has(details.systemId)) continue;

          const prev = log.previousValue ? JSON.parse(log.previousValue) : null;
          const next = log.newValue ? JSON.parse(log.newValue) : null;

          if (prev?.status && next?.status) {
            const dateKey = log.timestamp.toISOString().split('T')[0];
            if (!dailyData[dateKey]) {
              dailyData[dateKey] = { improvements: 0, regressions: 0, netChange: 0 };
            }

            const change = getStatusChangeDirection(prev.status, next.status);
            if (change > 0) {
              dailyData[dateKey].improvements++;
              dailyData[dateKey].netChange++;
            } else if (change < 0) {
              dailyData[dateKey].regressions++;
              dailyData[dateKey].netChange--;
            }
          }
        }
      } catch {
        // Skip malformed logs
      }
    }

    // Convert to array and fill gaps
    const trendData: any[] = [];
    const currentDate = new Date(startDate);
    const endDate = new Date();

    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      trendData.push({
        date: dateKey,
        ...(dailyData[dateKey] || { improvements: 0, regressions: 0, netChange: 0 }),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate cumulative trend
    let cumulative = 0;
    const cumulativeTrend = trendData.map((d) => {
      cumulative += d.netChange;
      return { date: d.date, cumulative };
    });

    res.json({
      productId,
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      summary: {
        totalImprovements: Object.values(dailyData).reduce((acc, d) => acc + d.improvements, 0),
        totalRegressions: Object.values(dailyData).reduce((acc, d) => acc + d.regressions, 0),
        netChange: cumulative,
        trend: cumulative > 0 ? 'IMPROVING' : cumulative < 0 ? 'DECLINING' : 'STABLE',
      },
      dailyData: trendData,
      cumulativeTrend,
    });
  } catch (error) {
    console.error('Error calculating risk trends:', error);
    res.status(500).json({ error: 'Failed to calculate risk trends' });
  }
});

// Helper functions
function calculateRiskScore(
  assessment: any,
  system: any,
  baselines: any[],
  weights: any,
  customPriorities: Record<string, number> | null
): { riskScore: number; riskLevel: string; factors: any } {
  const baseline = baselines.find((b) => b.subcategoryId === assessment.subcategoryId);
  const isMustHave = baseline?.categoryLevel === 'MUST_HAVE';

  // Control criticality
  let controlCriticality = isMustHave ? 1 : 0.5;

  // Check custom priority
  const func = assessment.subcategoryId.split('.')[0];
  if (customPriorities && customPriorities[assessment.subcategoryId]) {
    controlCriticality = customPriorities[assessment.subcategoryId];
  } else if (customPriorities && customPriorities[func]) {
    controlCriticality *= customPriorities[func];
  } else {
    // Apply function default priority
    controlCriticality *= DEFAULT_FUNCTION_PRIORITIES[func] || 0.7;
  }

  // System criticality
  const systemCriticalityScores: Record<string, number> = {
    CRITICAL: 1,
    HIGH: 0.75,
    MEDIUM: 0.5,
    LOW: 0.25,
  };
  const systemCriticality = systemCriticalityScores[system.criticality] || 0.5;

  // Data classification
  const dataClassScores: Record<string, number> = {
    RESTRICTED: 1,
    CONFIDENTIAL: 0.75,
    INTERNAL: 0.5,
    PUBLIC: 0.25,
  };
  const dataClass = dataClassScores[system.dataClassification] || 0.5;

  // Status multiplier
  const statusMultiplier = assessment.status === 'NON_COMPLIANT' ? 1 : 0.5;

  // Calculate weighted score
  const rawScore =
    controlCriticality * weights.controlCriticalityWeight +
    systemCriticality * weights.systemCriticalityWeight +
    dataClass * weights.dataClassificationWeight;

  const riskScore = Math.round(rawScore * statusMultiplier * 100);

  return {
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    factors: {
      controlCriticality: Math.round(controlCriticality * 100),
      systemCriticality: system.criticality,
      dataClassification: system.dataClassification,
      isMustHave,
      status: assessment.status,
    },
  };
}

function getRiskLevel(score: number): string {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

function generateRecommendation(assessment: any, system: any, score: any): string {
  const func = assessment.subcategoryId.split('.')[0];
  const functionNames: Record<string, string> = {
    GV: 'governance',
    ID: 'asset identification',
    PR: 'protection',
    DE: 'detection',
    RS: 'response',
    RC: 'recovery',
  };

  const funcName = functionNames[func] || 'security';
  const urgency = score.riskLevel === 'CRITICAL' ? 'immediately' :
    score.riskLevel === 'HIGH' ? 'as soon as possible' :
      score.riskLevel === 'MEDIUM' ? 'within the next sprint' : 'when resources permit';

  if (assessment.status === 'NON_COMPLIANT') {
    return `Implement ${funcName} control ${assessment.subcategoryId} for ${system.name} ${urgency}. This control is currently non-compliant on a ${system.criticality.toLowerCase()} criticality system.`;
  } else {
    return `Complete implementation of ${funcName} control ${assessment.subcategoryId} for ${system.name} ${urgency}. This control is partially compliant and needs attention.`;
  }
}

function isQuickWin(assessment: any, system: any, score: any): boolean {
  // Quick wins: partially compliant with medium-high score (easy to close the gap)
  if (assessment.status === 'PARTIALLY_COMPLIANT' && score.riskScore >= 40) {
    return true;
  }
  // Or: non-compliant on lower criticality systems (lower complexity)
  if (assessment.status === 'NON_COMPLIANT' &&
    system.criticality === 'LOW' &&
    score.riskScore >= 30) {
    return true;
  }
  return false;
}

function getStatusChangeDirection(oldStatus: string, newStatus: string): number {
  const statusOrder: Record<string, number> = {
    NOT_ASSESSED: 0,
    NON_COMPLIANT: 1,
    PARTIALLY_COMPLIANT: 2,
    COMPLIANT: 3,
    NOT_APPLICABLE: 3,
  };

  return (statusOrder[newStatus] || 0) - (statusOrder[oldStatus] || 0);
}

export default router;

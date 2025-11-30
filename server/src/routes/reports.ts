import express, { Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';

const router = express.Router();


// Validation schemas
const createReportSchema = z.object({
  name: z.string().min(1, 'Report name is required'),
  description: z.string().optional(),
  reportType: z.enum(['EXECUTIVE_SUMMARY', 'GAP_ANALYSIS', 'COMPLIANCE_PROGRESS', 'RISK_ASSESSMENT']),
  config: z.object({
    productIds: z.array(z.string().uuid()).optional(),
    systemIds: z.array(z.string().uuid()).optional(),
    dateRange: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    includeRemediationTasks: z.boolean().optional(),
    includeEvidence: z.boolean().optional(),
    functions: z.array(z.string()).optional(),
  }),
  isScheduled: z.boolean().default(false),
  schedule: z.string().optional(),
});

const updateReportSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  config: z.object({
    productIds: z.array(z.string().uuid()).optional(),
    systemIds: z.array(z.string().uuid()).optional(),
    dateRange: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    includeRemediationTasks: z.boolean().optional(),
    includeEvidence: z.boolean().optional(),
    functions: z.array(z.string()).optional(),
  }).optional(),
  isScheduled: z.boolean().optional(),
  schedule: z.string().optional(),
});

// Helper to verify product ownership
async function verifyProductOwnership(productId: string, userId: string): Promise<boolean> {
  const product = await prisma.product.findFirst({
    where: { id: productId, userId },
  });
  return !!product;
}

// GET /api/reports - List saved reports
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reportType } = req.query;

    const whereClause: any = {
      createdById: req.user!.id,
    };

    if (reportType) {
      whereClause.reportType = reportType as string;
    }

    const reports = await prisma.savedReport.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
    });

    res.json(reports.map((r) => ({
      ...r,
      config: JSON.parse(r.config),
    })));
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/:id - Get single report
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const report = await prisma.savedReport.findFirst({
      where: {
        id,
        createdById: req.user!.id,
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      ...report,
      config: JSON.parse(report.config),
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// POST /api/reports - Create a saved report configuration
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = createReportSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { name, description, reportType, config, isScheduled, schedule } = validation.data;

    const report = await prisma.savedReport.create({
      data: {
        name,
        description,
        reportType,
        config: JSON.stringify(config),
        isScheduled,
        schedule,
        createdById: req.user!.id,
      },
    });

    res.status(201).json({
      ...report,
      config: JSON.parse(report.config),
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// POST /api/reports/generate/executive-summary - Generate executive summary report
router.post('/generate/executive-summary', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, systemIds, format = 'json' } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

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
          where: systemIds ? { id: { in: systemIds } } : undefined,
          include: {
            assessments: true,
          },
        },
        framework: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Calculate compliance metrics
    const allAssessments = product.systems.flatMap((s) => s.assessments);
    const totalControls = allAssessments.length;
    const compliant = allAssessments.filter((a) => a.status === 'COMPLIANT').length;
    const partiallyCompliant = allAssessments.filter((a) => a.status === 'PARTIALLY_COMPLIANT').length;
    const nonCompliant = allAssessments.filter((a) => a.status === 'NON_COMPLIANT').length;
    const notAssessed = allAssessments.filter((a) => a.status === 'NOT_ASSESSED').length;
    const notApplicable = allAssessments.filter((a) => a.status === 'NOT_APPLICABLE').length;

    const complianceScore = totalControls > 0
      ? Math.round(((compliant + partiallyCompliant * 0.5) / (totalControls - notApplicable)) * 100)
      : 0;

    // Group by function
    const byFunction: Record<string, { total: number; compliant: number; partial: number; nonCompliant: number }> = {};
    for (const assessment of allAssessments) {
      const func = assessment.subcategoryId.split('.')[0];
      if (!byFunction[func]) {
        byFunction[func] = { total: 0, compliant: 0, partial: 0, nonCompliant: 0 };
      }
      byFunction[func].total++;
      if (assessment.status === 'COMPLIANT') byFunction[func].compliant++;
      if (assessment.status === 'PARTIALLY_COMPLIANT') byFunction[func].partial++;
      if (assessment.status === 'NON_COMPLIANT') byFunction[func].nonCompliant++;
    }

    // Get remediation tasks summary
    const tasks = await prisma.remediationTask.findMany({
      where: {
        assessment: {
          system: {
            productId,
          },
        },
      },
    });

    const tasksSummary = {
      total: tasks.length,
      open: tasks.filter((t) => t.status === 'OPEN').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      completed: tasks.filter((t) => t.status === 'COMPLETED').length,
      overdue: tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length,
    };

    const report = {
      generatedAt: new Date().toISOString(),
      product: {
        id: product.id,
        name: product.name,
        type: product.type,
        criticality: product.criticality,
        framework: product.framework?.name,
      },
      systemsIncluded: product.systems.length,
      complianceOverview: {
        totalControls,
        complianceScore,
        statusBreakdown: {
          compliant,
          partiallyCompliant,
          nonCompliant,
          notAssessed,
          notApplicable,
        },
      },
      byFunction,
      remediation: tasksSummary,
      recommendations: generateRecommendations(byFunction, tasksSummary),
    };

    if (format === 'html') {
      const html = generateExecutiveSummaryHTML(report);
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    res.json(report);
  } catch (error) {
    console.error('Error generating executive summary:', error);
    res.status(500).json({ error: 'Failed to generate executive summary' });
  }
});

// POST /api/reports/generate/gap-analysis - Generate gap analysis report
router.post('/generate/gap-analysis', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, systemIds, priorityThreshold = 'MEDIUM' } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

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
          where: systemIds ? { id: { in: systemIds } } : undefined,
          include: {
            assessments: {
              where: {
                status: { in: ['NON_COMPLIANT', 'PARTIALLY_COMPLIANT', 'NOT_ASSESSED'] },
              },
              include: {
                remediationTasks: true,
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

    // Build gap analysis
    const gaps: any[] = [];
    for (const system of product.systems) {
      for (const assessment of system.assessments) {
        // Check if this control is in baseline as MUST_HAVE
        const baseline = product.csfBaseline.find((b) => b.subcategoryId === assessment.subcategoryId);
        const isMustHave = baseline?.categoryLevel === 'MUST_HAVE';

        gaps.push({
          systemId: system.id,
          systemName: system.name,
          systemCriticality: system.criticality,
          controlId: assessment.subcategoryId,
          status: assessment.status,
          isMustHave,
          priority: calculateGapPriority(assessment.status, system.criticality, isMustHave),
          details: assessment.details,
          remediationPlan: assessment.remediationPlan,
          hasRemediationTask: assessment.remediationTasks.length > 0,
          taskStatus: assessment.remediationTasks[0]?.status,
        });
      }
    }

    // Sort by priority
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    gaps.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);

    // Filter by threshold
    const thresholdOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const filteredGaps = gaps.filter(
      (g) => thresholdOrder[g.priority as keyof typeof thresholdOrder] <= thresholdOrder[priorityThreshold as keyof typeof thresholdOrder]
    );

    // Summary by priority
    const byPriority = {
      CRITICAL: gaps.filter((g) => g.priority === 'CRITICAL').length,
      HIGH: gaps.filter((g) => g.priority === 'HIGH').length,
      MEDIUM: gaps.filter((g) => g.priority === 'MEDIUM').length,
      LOW: gaps.filter((g) => g.priority === 'LOW').length,
    };

    // Summary by status
    const byStatus = {
      NON_COMPLIANT: gaps.filter((g) => g.status === 'NON_COMPLIANT').length,
      PARTIALLY_COMPLIANT: gaps.filter((g) => g.status === 'PARTIALLY_COMPLIANT').length,
      NOT_ASSESSED: gaps.filter((g) => g.status === 'NOT_ASSESSED').length,
    };

    res.json({
      generatedAt: new Date().toISOString(),
      product: {
        id: product.id,
        name: product.name,
      },
      summary: {
        totalGaps: gaps.length,
        byPriority,
        byStatus,
        mustHaveGaps: gaps.filter((g) => g.isMustHave).length,
        withRemediationTasks: gaps.filter((g) => g.hasRemediationTask).length,
      },
      gaps: filteredGaps,
    });
  } catch (error) {
    console.error('Error generating gap analysis:', error);
    res.status(500).json({ error: 'Failed to generate gap analysis' });
  }
});

// POST /api/reports/generate/compliance-progress - Generate compliance progress report
router.post('/generate/compliance-progress', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, systemIds, dateRange } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

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
          where: systemIds ? { id: { in: systemIds } } : undefined,
          include: {
            assessments: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get audit logs for compliance changes
    const whereAudit: any = {
      entityType: 'Assessment',
      action: 'UPDATE',
    };

    if (dateRange?.start) {
      whereAudit.timestamp = { ...whereAudit.timestamp, gte: new Date(dateRange.start) };
    }
    if (dateRange?.end) {
      whereAudit.timestamp = { ...whereAudit.timestamp, lte: new Date(dateRange.end) };
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: whereAudit,
      orderBy: { timestamp: 'asc' },
    });

    // Filter to only assessments in this product
    const systemIdSet = new Set(product.systems.map((s) => s.id));
    const relevantLogs = auditLogs.filter((log) => {
      if (log.details) {
        try {
          const details = JSON.parse(log.details);
          return systemIdSet.has(details.systemId);
        } catch {
          return false;
        }
      }
      return false;
    });

    // Track status changes over time
    const statusChanges: any[] = [];
    for (const log of relevantLogs) {
      if (log.changedFields && log.changedFields.includes('status')) {
        try {
          const prev = log.previousValue ? JSON.parse(log.previousValue) : null;
          const next = log.newValue ? JSON.parse(log.newValue) : null;
          statusChanges.push({
            timestamp: log.timestamp,
            controlId: next?.subcategoryId || prev?.subcategoryId,
            previousStatus: prev?.status,
            newStatus: next?.status,
            changedBy: log.userName,
          });
        } catch {
          // Skip malformed logs
        }
      }
    }

    // Current state by system
    const systemProgress = product.systems.map((system) => {
      const assessments = system.assessments;
      const total = assessments.length;
      const compliant = assessments.filter((a) => a.status === 'COMPLIANT').length;
      const partial = assessments.filter((a) => a.status === 'PARTIALLY_COMPLIANT').length;
      const notApplicable = assessments.filter((a) => a.status === 'NOT_APPLICABLE').length;
      const applicable = total - notApplicable;

      return {
        systemId: system.id,
        systemName: system.name,
        totalControls: total,
        applicableControls: applicable,
        compliant,
        partiallyCompliant: partial,
        complianceScore: applicable > 0 ? Math.round(((compliant + partial * 0.5) / applicable) * 100) : 0,
      };
    });

    // Overall progress
    const totalCompliant = systemProgress.reduce((acc, s) => acc + s.compliant, 0);
    const totalPartial = systemProgress.reduce((acc, s) => acc + s.partiallyCompliant, 0);
    const totalApplicable = systemProgress.reduce((acc, s) => acc + s.applicableControls, 0);

    res.json({
      generatedAt: new Date().toISOString(),
      product: {
        id: product.id,
        name: product.name,
      },
      dateRange,
      overallProgress: {
        totalSystems: product.systems.length,
        totalApplicableControls: totalApplicable,
        compliant: totalCompliant,
        partiallyCompliant: totalPartial,
        overallComplianceScore: totalApplicable > 0 ? Math.round(((totalCompliant + totalPartial * 0.5) / totalApplicable) * 100) : 0,
      },
      systemProgress,
      recentChanges: statusChanges.slice(-50),
      changeCount: statusChanges.length,
    });
  } catch (error) {
    console.error('Error generating compliance progress:', error);
    res.status(500).json({ error: 'Failed to generate compliance progress' });
  }
});

// POST /api/reports/generate/risk-assessment - Generate risk assessment report
router.post('/generate/risk-assessment', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, systemIds } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

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
          where: systemIds ? { id: { in: systemIds } } : undefined,
          include: {
            assessments: {
              include: {
                remediationTasks: true,
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

    // Calculate risk for each non-compliant control
    const riskItems: any[] = [];
    for (const system of product.systems) {
      const systemCriticalityScore = getCriticalityScore(system.criticality);
      const dataClassScore = getDataClassificationScore(system.dataClassification);

      for (const assessment of system.assessments) {
        if (assessment.status === 'NON_COMPLIANT' || assessment.status === 'PARTIALLY_COMPLIANT') {
          const baseline = product.csfBaseline.find((b) => b.subcategoryId === assessment.subcategoryId);
          const controlCriticalityScore = baseline?.categoryLevel === 'MUST_HAVE' ? 1 : 0.5;
          const statusScore = assessment.status === 'NON_COMPLIANT' ? 1 : 0.5;

          const riskScore = (
            (controlCriticalityScore * weights.controlCriticalityWeight) +
            (systemCriticalityScore * weights.systemCriticalityWeight) +
            (dataClassScore * weights.dataClassificationWeight)
          ) * statusScore * 100;

          riskItems.push({
            systemId: system.id,
            systemName: system.name,
            controlId: assessment.subcategoryId,
            status: assessment.status,
            riskScore: Math.round(riskScore),
            riskLevel: getRiskLevel(riskScore),
            factors: {
              controlCriticality: baseline?.categoryLevel || 'SHOULD_HAVE',
              systemCriticality: system.criticality,
              dataClassification: system.dataClassification,
            },
            hasRemediation: assessment.remediationTasks.length > 0,
            remediationStatus: assessment.remediationTasks[0]?.status,
          });
        }
      }
    }

    // Sort by risk score
    riskItems.sort((a, b) => b.riskScore - a.riskScore);

    // Heat map data (function x criticality)
    const heatMap: Record<string, Record<string, number>> = {};
    for (const item of riskItems) {
      const func = item.controlId.split('.')[0];
      if (!heatMap[func]) {
        heatMap[func] = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
      }
      heatMap[func][item.riskLevel]++;
    }

    // Summary
    const summary = {
      totalRiskItems: riskItems.length,
      byLevel: {
        CRITICAL: riskItems.filter((r) => r.riskLevel === 'CRITICAL').length,
        HIGH: riskItems.filter((r) => r.riskLevel === 'HIGH').length,
        MEDIUM: riskItems.filter((r) => r.riskLevel === 'MEDIUM').length,
        LOW: riskItems.filter((r) => r.riskLevel === 'LOW').length,
      },
      averageRiskScore: riskItems.length > 0
        ? Math.round(riskItems.reduce((acc, r) => acc + r.riskScore, 0) / riskItems.length)
        : 0,
      withoutRemediation: riskItems.filter((r) => !r.hasRemediation).length,
    };

    res.json({
      generatedAt: new Date().toISOString(),
      product: {
        id: product.id,
        name: product.name,
        criticality: product.criticality,
      },
      weights,
      summary,
      heatMap,
      riskItems: riskItems.slice(0, 100), // Top 100 risk items
      topRisks: riskItems.slice(0, 10),
    });
  } catch (error) {
    console.error('Error generating risk assessment:', error);
    res.status(500).json({ error: 'Failed to generate risk assessment' });
  }
});

// PUT /api/reports/:id - Update saved report
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateReportSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    // Verify ownership
    const existing = await prisma.savedReport.findFirst({
      where: { id, createdById: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const { name, description, config, isScheduled, schedule } = validation.data;

    const report = await prisma.savedReport.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(config && { config: JSON.stringify(config) }),
        ...(isScheduled !== undefined && { isScheduled }),
        ...(schedule !== undefined && { schedule }),
      },
    });

    res.json({
      ...report,
      config: JSON.parse(report.config),
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// DELETE /api/reports/:id - Delete saved report
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.savedReport.findFirst({
      where: { id, createdById: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await prisma.savedReport.delete({ where: { id } });

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// Helper functions
function calculateGapPriority(status: string, systemCriticality: string, isMustHave: boolean): string {
  if (status === 'NON_COMPLIANT' && isMustHave && systemCriticality === 'CRITICAL') return 'CRITICAL';
  if (status === 'NON_COMPLIANT' && (isMustHave || systemCriticality === 'CRITICAL')) return 'HIGH';
  if (status === 'NON_COMPLIANT') return 'MEDIUM';
  if (status === 'PARTIALLY_COMPLIANT' && isMustHave) return 'MEDIUM';
  return 'LOW';
}

function getCriticalityScore(criticality: string): number {
  const scores: Record<string, number> = { CRITICAL: 1, HIGH: 0.75, MEDIUM: 0.5, LOW: 0.25 };
  return scores[criticality] || 0.5;
}

function getDataClassificationScore(classification: string): number {
  const scores: Record<string, number> = { RESTRICTED: 1, CONFIDENTIAL: 0.75, INTERNAL: 0.5, PUBLIC: 0.25 };
  return scores[classification] || 0.5;
}

function getRiskLevel(score: number): string {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

function generateRecommendations(byFunction: Record<string, any>, tasksSummary: any): string[] {
  const recommendations: string[] = [];

  // Check for functions with low compliance
  for (const [func, data] of Object.entries(byFunction)) {
    const complianceRate = data.total > 0 ? (data.compliant / data.total) * 100 : 0;
    if (complianceRate < 50) {
      recommendations.push(`Focus on ${func} function - currently at ${Math.round(complianceRate)}% compliance`);
    }
  }

  // Check for overdue tasks
  if (tasksSummary.overdue > 0) {
    recommendations.push(`Address ${tasksSummary.overdue} overdue remediation tasks immediately`);
  }

  // Check for stalled progress
  if (tasksSummary.inProgress > tasksSummary.completed && tasksSummary.inProgress > 5) {
    recommendations.push(`Review in-progress tasks (${tasksSummary.inProgress}) - consider if resources are blocked`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Compliance posture is healthy - continue regular assessments');
  }

  return recommendations;
}

function generateExecutiveSummaryHTML(report: any): string {
  const functionNames: Record<string, string> = {
    GV: 'Govern',
    ID: 'Identify',
    PR: 'Protect',
    DE: 'Detect',
    RS: 'Respond',
    RC: 'Recover',
  };

  let functionRows = '';
  for (const [func, data] of Object.entries(report.byFunction)) {
    const d = data as any;
    const rate = d.total > 0 ? Math.round((d.compliant / d.total) * 100) : 0;
    functionRows += `
      <tr>
        <td>${functionNames[func] || func}</td>
        <td>${d.total}</td>
        <td>${d.compliant}</td>
        <td>${d.partial}</td>
        <td>${d.nonCompliant}</td>
        <td>${rate}%</td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Executive Summary - ${report.product.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
    h2 { color: #2d3748; margin-top: 30px; }
    .header { display: flex; justify-content: space-between; align-items: center; }
    .score-card { background: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .score { font-size: 48px; font-weight: bold; color: ${report.complianceOverview.complianceScore >= 70 ? '#38a169' : report.complianceOverview.complianceScore >= 40 ? '#d69e2e' : '#e53e3e'}; }
    .score-label { font-size: 14px; color: #718096; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #edf2f7; font-weight: 600; }
    .status-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 20px 0; }
    .status-item { background: #f7fafc; padding: 15px; border-radius: 8px; text-align: center; }
    .status-value { font-size: 24px; font-weight: bold; }
    .compliant { color: #38a169; }
    .partial { color: #d69e2e; }
    .non-compliant { color: #e53e3e; }
    .not-assessed { color: #718096; }
    .recommendations { background: #fffbeb; border-left: 4px solid #d69e2e; padding: 15px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Executive Compliance Summary</h1>
    <div>Generated: ${new Date(report.generatedAt).toLocaleString()}</div>
  </div>

  <h2>Product: ${report.product.name}</h2>
  <p><strong>Type:</strong> ${report.product.type} | <strong>Criticality:</strong> ${report.product.criticality} | <strong>Framework:</strong> ${report.product.framework || 'N/A'}</p>
  <p><strong>Systems Assessed:</strong> ${report.systemsIncluded}</p>

  <div class="score-card">
    <div class="score">${report.complianceOverview.complianceScore}%</div>
    <div class="score-label">Overall Compliance Score</div>
  </div>

  <h2>Compliance Status Breakdown</h2>
  <div class="status-grid">
    <div class="status-item">
      <div class="status-value compliant">${report.complianceOverview.statusBreakdown.compliant}</div>
      <div>Compliant</div>
    </div>
    <div class="status-item">
      <div class="status-value partial">${report.complianceOverview.statusBreakdown.partiallyCompliant}</div>
      <div>Partial</div>
    </div>
    <div class="status-item">
      <div class="status-value non-compliant">${report.complianceOverview.statusBreakdown.nonCompliant}</div>
      <div>Non-Compliant</div>
    </div>
    <div class="status-item">
      <div class="status-value not-assessed">${report.complianceOverview.statusBreakdown.notAssessed}</div>
      <div>Not Assessed</div>
    </div>
    <div class="status-item">
      <div class="status-value">${report.complianceOverview.statusBreakdown.notApplicable}</div>
      <div>N/A</div>
    </div>
  </div>

  <h2>Compliance by Function</h2>
  <table>
    <tr>
      <th>Function</th>
      <th>Total</th>
      <th>Compliant</th>
      <th>Partial</th>
      <th>Non-Compliant</th>
      <th>Rate</th>
    </tr>
    ${functionRows}
  </table>

  <h2>Remediation Status</h2>
  <div class="status-grid">
    <div class="status-item">
      <div class="status-value">${report.remediation.total}</div>
      <div>Total Tasks</div>
    </div>
    <div class="status-item">
      <div class="status-value non-compliant">${report.remediation.open}</div>
      <div>Open</div>
    </div>
    <div class="status-item">
      <div class="status-value partial">${report.remediation.inProgress}</div>
      <div>In Progress</div>
    </div>
    <div class="status-item">
      <div class="status-value compliant">${report.remediation.completed}</div>
      <div>Completed</div>
    </div>
    <div class="status-item">
      <div class="status-value non-compliant">${report.remediation.overdue}</div>
      <div>Overdue</div>
    </div>
  </div>

  <h2>Recommendations</h2>
  <div class="recommendations">
    <ul>
      ${report.recommendations.map((r: string) => `<li>${r}</li>`).join('')}
    </ul>
  </div>

  <div class="footer">
    <p>This report was automatically generated by Posture. For questions, contact your compliance team.</p>
  </div>
</body>
</html>
  `;
}

export default router;

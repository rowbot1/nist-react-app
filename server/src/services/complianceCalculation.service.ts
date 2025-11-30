/**
 * ComplianceCalculationService
 *
 * Handles hierarchical compliance score calculations with:
 * - Bottom-up rollup: System → Product → Framework → Capability Centre
 * - Criticality weighting: HIGH systems weigh more than LOW
 * - Control category weighting: MUST_HAVE = 2x, SHOULD_HAVE = 1x
 * - Cache invalidation on assessment changes
 */

import { prisma } from '../prisma';



// Criticality weights for aggregation
const CRITICALITY_WEIGHTS: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

// Control category weights
const CONTROL_CATEGORY_WEIGHTS: Record<string, number> = {
  MUST_HAVE: 2,
  SHOULD_HAVE: 1,
};

// Status scores for compliance calculation
const STATUS_SCORES: Record<string, number> = {
  COMPLIANT: 1.0,
  PARTIAL: 0.5,
  PARTIALLY_COMPLIANT: 0.5,
  NON_COMPLIANT: 0.0,
  NOT_ASSESSED: 0, // excluded from calculation
  NOT_APPLICABLE: 0, // excluded from calculation
};

export interface ComplianceMetrics {
  complianceScore: number;
  totalAssessments: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
  notAssessedCount: number;
}

export interface FunctionBreakdown {
  functionCode: string;
  functionName: string;
  complianceScore: number;
  totalControls: number;
  assessedControls: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
}

export type ScopeType = 'cc' | 'framework' | 'product' | 'system';

export interface HierarchicalComplianceResult {
  scope: {
    type: ScopeType | null;
    id: string | null;
    name: string;
  };
  rollup: ComplianceMetrics;
  functions: FunctionBreakdown[];
  children?: Array<{
    type: ScopeType;
    id: string;
    name: string;
    complianceScore: number;
    criticality?: string;
  }>;
}

class ComplianceCalculationService {
  /**
   * Calculate compliance metrics from raw assessment data
   */
  private calculateMetrics(assessments: Array<{ status: string }>): ComplianceMetrics {
    const total = assessments.length;
    let compliant = 0;
    let partial = 0;
    let nonCompliant = 0;
    let notAssessed = 0;

    for (const a of assessments) {
      switch (a.status) {
        case 'COMPLIANT':
          compliant++;
          break;
        case 'PARTIAL':
        case 'PARTIALLY_COMPLIANT':
          partial++;
          break;
        case 'NON_COMPLIANT':
          nonCompliant++;
          break;
        case 'NOT_ASSESSED':
        case 'NOT_APPLICABLE':
          notAssessed++;
          break;
      }
    }

    const assessed = total - notAssessed;
    const score = assessed > 0
      ? Math.round(((compliant + partial * 0.5) / assessed) * 100)
      : 0;

    return {
      complianceScore: score,
      totalAssessments: total,
      compliantCount: compliant,
      partialCount: partial,
      nonCompliantCount: nonCompliant,
      notAssessedCount: notAssessed,
    };
  }

  /**
   * Calculate weighted compliance score considering control categories
   */
  private calculateWeightedSystemScore(
    assessments: Array<{ status: string; subcategoryId: string }>,
    baseline: Array<{ subcategoryId: string; categoryLevel: string }>
  ): ComplianceMetrics {
    const baselineMap = new Map(baseline.map(b => [b.subcategoryId, b.categoryLevel]));

    let weightedScore = 0;
    let totalWeight = 0;
    let compliant = 0;
    let partial = 0;
    let nonCompliant = 0;
    let notAssessed = 0;

    for (const a of assessments) {
      const categoryLevel = baselineMap.get(a.subcategoryId) || 'SHOULD_HAVE';
      const weight = CONTROL_CATEGORY_WEIGHTS[categoryLevel] || 1;

      if (a.status === 'NOT_ASSESSED' || a.status === 'NOT_APPLICABLE') {
        notAssessed++;
        continue;
      }

      totalWeight += weight;
      const statusScore = STATUS_SCORES[a.status] || 0;
      weightedScore += statusScore * weight;

      switch (a.status) {
        case 'COMPLIANT':
          compliant++;
          break;
        case 'PARTIAL':
        case 'PARTIALLY_COMPLIANT':
          partial++;
          break;
        case 'NON_COMPLIANT':
          nonCompliant++;
          break;
      }
    }

    const score = totalWeight > 0
      ? Math.round((weightedScore / totalWeight) * 100)
      : 0;

    return {
      complianceScore: score,
      totalAssessments: assessments.length,
      compliantCount: compliant,
      partialCount: partial,
      nonCompliantCount: nonCompliant,
      notAssessedCount: notAssessed,
    };
  }

  /**
   * Calculate and cache system compliance score
   */
  async calculateSystemCompliance(systemId: string): Promise<ComplianceMetrics> {
    const system = await prisma.system.findUnique({
      where: { id: systemId },
      include: {
        assessments: { select: { status: true, subcategoryId: true } },
        product: {
          include: {
            csfBaseline: { select: { subcategoryId: true, categoryLevel: true } }
          }
        }
      }
    });

    if (!system) {
      throw new Error(`System not found: ${systemId}`);
    }

    // Use weighted calculation if baseline exists
    const metrics = system.product.csfBaseline.length > 0
      ? this.calculateWeightedSystemScore(system.assessments, system.product.csfBaseline)
      : this.calculateMetrics(system.assessments);

    // Update cache
    await prisma.system.update({
      where: { id: systemId },
      data: {
        cachedComplianceScore: metrics.complianceScore,
        cachedTotalAssessments: metrics.totalAssessments,
        cachedCompliantCount: metrics.compliantCount,
        cachedPartialCount: metrics.partialCount,
        cachedNonCompliantCount: metrics.nonCompliantCount,
        cachedNotAssessedCount: metrics.notAssessedCount,
        scoreLastComputedAt: new Date(),
      }
    });

    return metrics;
  }

  /**
   * Calculate and cache product compliance (weighted by system criticality)
   */
  async calculateProductCompliance(productId: string): Promise<ComplianceMetrics> {
    const systems = await prisma.system.findMany({
      where: { productId },
      select: {
        id: true,
        criticality: true,
        cachedComplianceScore: true,
        cachedTotalAssessments: true,
        cachedCompliantCount: true,
        cachedPartialCount: true,
        cachedNonCompliantCount: true,
        cachedNotAssessedCount: true,
      }
    });

    if (systems.length === 0) {
      const emptyMetrics: ComplianceMetrics = {
        complianceScore: 0,
        totalAssessments: 0,
        compliantCount: 0,
        partialCount: 0,
        nonCompliantCount: 0,
        notAssessedCount: 0,
      };

      await prisma.product.update({
        where: { id: productId },
        data: {
          ...emptyMetrics,
          cachedComplianceScore: 0,
          cachedTotalAssessments: 0,
          cachedCompliantCount: 0,
          cachedPartialCount: 0,
          cachedNonCompliantCount: 0,
          cachedNotAssessedCount: 0,
          scoreLastComputedAt: new Date(),
        }
      });

      return emptyMetrics;
    }

    let weightedScore = 0;
    let totalWeight = 0;
    let totalAssessments = 0;
    let compliant = 0;
    let partial = 0;
    let nonCompliant = 0;
    let notAssessed = 0;

    for (const sys of systems) {
      const weight = CRITICALITY_WEIGHTS[sys.criticality] || 2;
      const score = sys.cachedComplianceScore || 0;

      weightedScore += score * weight;
      totalWeight += weight;
      totalAssessments += sys.cachedTotalAssessments || 0;
      compliant += sys.cachedCompliantCount || 0;
      partial += sys.cachedPartialCount || 0;
      nonCompliant += sys.cachedNonCompliantCount || 0;
      notAssessed += sys.cachedNotAssessedCount || 0;
    }

    const metrics: ComplianceMetrics = {
      complianceScore: totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0,
      totalAssessments,
      compliantCount: compliant,
      partialCount: partial,
      nonCompliantCount: nonCompliant,
      notAssessedCount: notAssessed,
    };

    await prisma.product.update({
      where: { id: productId },
      data: {
        cachedComplianceScore: metrics.complianceScore,
        cachedTotalAssessments: metrics.totalAssessments,
        cachedCompliantCount: metrics.compliantCount,
        cachedPartialCount: metrics.partialCount,
        cachedNonCompliantCount: metrics.nonCompliantCount,
        cachedNotAssessedCount: metrics.notAssessedCount,
        scoreLastComputedAt: new Date(),
      }
    });

    return metrics;
  }

  /**
   * Calculate and cache framework compliance (weighted by product criticality)
   */
  async calculateFrameworkCompliance(frameworkId: string): Promise<ComplianceMetrics> {
    const products = await prisma.product.findMany({
      where: { frameworkId },
      select: {
        id: true,
        criticality: true,
        cachedComplianceScore: true,
        cachedTotalAssessments: true,
        cachedCompliantCount: true,
        cachedPartialCount: true,
        cachedNonCompliantCount: true,
        cachedNotAssessedCount: true,
      }
    });

    if (products.length === 0) {
      const emptyMetrics: ComplianceMetrics = {
        complianceScore: 0,
        totalAssessments: 0,
        compliantCount: 0,
        partialCount: 0,
        nonCompliantCount: 0,
        notAssessedCount: 0,
      };

      await prisma.framework.update({
        where: { id: frameworkId },
        data: {
          cachedComplianceScore: 0,
          cachedTotalAssessments: 0,
          cachedCompliantCount: 0,
          cachedPartialCount: 0,
          cachedNonCompliantCount: 0,
          cachedNotAssessedCount: 0,
          scoreLastComputedAt: new Date(),
        }
      });

      return emptyMetrics;
    }

    let weightedScore = 0;
    let totalWeight = 0;
    let totalAssessments = 0;
    let compliant = 0;
    let partial = 0;
    let nonCompliant = 0;
    let notAssessed = 0;

    for (const prod of products) {
      const weight = CRITICALITY_WEIGHTS[prod.criticality] || 2;
      const score = prod.cachedComplianceScore || 0;

      weightedScore += score * weight;
      totalWeight += weight;
      totalAssessments += prod.cachedTotalAssessments || 0;
      compliant += prod.cachedCompliantCount || 0;
      partial += prod.cachedPartialCount || 0;
      nonCompliant += prod.cachedNonCompliantCount || 0;
      notAssessed += prod.cachedNotAssessedCount || 0;
    }

    const metrics: ComplianceMetrics = {
      complianceScore: totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0,
      totalAssessments,
      compliantCount: compliant,
      partialCount: partial,
      nonCompliantCount: nonCompliant,
      notAssessedCount: notAssessed,
    };

    await prisma.framework.update({
      where: { id: frameworkId },
      data: {
        cachedComplianceScore: metrics.complianceScore,
        cachedTotalAssessments: metrics.totalAssessments,
        cachedCompliantCount: metrics.compliantCount,
        cachedPartialCount: metrics.partialCount,
        cachedNonCompliantCount: metrics.nonCompliantCount,
        cachedNotAssessedCount: metrics.notAssessedCount,
        scoreLastComputedAt: new Date(),
      }
    });

    return metrics;
  }

  /**
   * Calculate and cache capability centre compliance (average of frameworks)
   */
  async calculateCapabilityCentreCompliance(ccId: string): Promise<ComplianceMetrics> {
    const frameworks = await prisma.framework.findMany({
      where: { capabilityCentreId: ccId },
      select: {
        id: true,
        cachedComplianceScore: true,
        cachedTotalAssessments: true,
        cachedCompliantCount: true,
        cachedPartialCount: true,
        cachedNonCompliantCount: true,
        cachedNotAssessedCount: true,
      }
    });

    if (frameworks.length === 0) {
      const emptyMetrics: ComplianceMetrics = {
        complianceScore: 0,
        totalAssessments: 0,
        compliantCount: 0,
        partialCount: 0,
        nonCompliantCount: 0,
        notAssessedCount: 0,
      };

      await prisma.capabilityCentre.update({
        where: { id: ccId },
        data: {
          cachedComplianceScore: 0,
          cachedTotalAssessments: 0,
          cachedCompliantCount: 0,
          cachedPartialCount: 0,
          cachedNonCompliantCount: 0,
          cachedNotAssessedCount: 0,
          scoreLastComputedAt: new Date(),
        }
      });

      return emptyMetrics;
    }

    // Simple average for capability centres
    let totalScore = 0;
    let totalAssessments = 0;
    let compliant = 0;
    let partial = 0;
    let nonCompliant = 0;
    let notAssessed = 0;

    for (const fw of frameworks) {
      totalScore += fw.cachedComplianceScore || 0;
      totalAssessments += fw.cachedTotalAssessments || 0;
      compliant += fw.cachedCompliantCount || 0;
      partial += fw.cachedPartialCount || 0;
      nonCompliant += fw.cachedNonCompliantCount || 0;
      notAssessed += fw.cachedNotAssessedCount || 0;
    }

    const metrics: ComplianceMetrics = {
      complianceScore: Math.round(totalScore / frameworks.length),
      totalAssessments,
      compliantCount: compliant,
      partialCount: partial,
      nonCompliantCount: nonCompliant,
      notAssessedCount: notAssessed,
    };

    await prisma.capabilityCentre.update({
      where: { id: ccId },
      data: {
        cachedComplianceScore: metrics.complianceScore,
        cachedTotalAssessments: metrics.totalAssessments,
        cachedCompliantCount: metrics.compliantCount,
        cachedPartialCount: metrics.partialCount,
        cachedNonCompliantCount: metrics.nonCompliantCount,
        cachedNotAssessedCount: metrics.notAssessedCount,
        scoreLastComputedAt: new Date(),
      }
    });

    return metrics;
  }

  /**
   * Invalidate and recompute the entire hierarchy for an assessment
   */
  async invalidateHierarchy(assessmentId: string): Promise<void> {
    const assessment = await prisma.complianceAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        system: {
          include: {
            product: {
              include: {
                framework: true
              }
            }
          }
        }
      }
    });

    if (!assessment) return;

    // Bottom-up recomputation
    await this.calculateSystemCompliance(assessment.system.id);
    await this.calculateProductCompliance(assessment.system.product.id);

    if (assessment.system.product.framework) {
      await this.calculateFrameworkCompliance(assessment.system.product.framework.id);
      await this.calculateCapabilityCentreCompliance(assessment.system.product.framework.capabilityCentreId);
    }
  }

  /**
   * Invalidate hierarchy starting from a system (used when assessment is deleted)
   */
  async invalidateSystemHierarchy(systemId: string): Promise<void> {
    const system = await prisma.system.findUnique({
      where: { id: systemId },
      include: {
        product: {
          include: {
            framework: true
          }
        }
      }
    });

    if (!system) return;

    // Bottom-up recomputation
    await this.calculateSystemCompliance(systemId);
    await this.calculateProductCompliance(system.product.id);

    if (system.product.framework) {
      await this.calculateFrameworkCompliance(system.product.framework.id);
      await this.calculateCapabilityCentreCompliance(system.product.framework.capabilityCentreId);
    }
  }

  /**
   * Bulk invalidation - optimized to avoid duplicate calculations
   */
  async invalidateBulk(assessmentIds: string[]): Promise<void> {
    const affectedSystems = new Set<string>();
    const affectedProducts = new Set<string>();
    const affectedFrameworks = new Set<string>();
    const affectedCCs = new Set<string>();

    // Collect all affected entities
    for (const id of assessmentIds) {
      const assessment = await prisma.complianceAssessment.findUnique({
        where: { id },
        select: {
          systemId: true,
          system: {
            select: {
              productId: true,
              product: {
                select: {
                  frameworkId: true,
                  framework: {
                    select: { capabilityCentreId: true }
                  }
                }
              }
            }
          }
        }
      });

      if (assessment) {
        affectedSystems.add(assessment.systemId);
        affectedProducts.add(assessment.system.productId);
        if (assessment.system.product.frameworkId) {
          affectedFrameworks.add(assessment.system.product.frameworkId);
          if (assessment.system.product.framework) {
            affectedCCs.add(assessment.system.product.framework.capabilityCentreId);
          }
        }
      }
    }

    // Recompute in order (bottom-up)
    for (const systemId of affectedSystems) {
      await this.calculateSystemCompliance(systemId);
    }
    for (const productId of affectedProducts) {
      await this.calculateProductCompliance(productId);
    }
    for (const frameworkId of affectedFrameworks) {
      await this.calculateFrameworkCompliance(frameworkId);
    }
    for (const ccId of affectedCCs) {
      await this.calculateCapabilityCentreCompliance(ccId);
    }
  }

  /**
   * Get scoped hierarchical compliance data
   */
  async getHierarchicalCompliance(
    scopeType: ScopeType | null,
    scopeId: string | null
  ): Promise<HierarchicalComplianceResult> {
    // Global scope - all organizations
    if (!scopeType || !scopeId) {
      return this.getGlobalCompliance();
    }

    switch (scopeType) {
      case 'cc':
        return this.getCapabilityCentreCompliance(scopeId);
      case 'framework':
        return this.getFrameworkScopedCompliance(scopeId);
      case 'product':
        return this.getProductScopedCompliance(scopeId);
      case 'system':
        return this.getSystemScopedCompliance(scopeId);
      default:
        return this.getGlobalCompliance();
    }
  }

  private async getGlobalCompliance(): Promise<HierarchicalComplianceResult> {
    const ccs = await prisma.capabilityCentre.findMany({
      select: {
        id: true,
        name: true,
        cachedComplianceScore: true,
        cachedTotalAssessments: true,
        cachedCompliantCount: true,
        cachedPartialCount: true,
        cachedNonCompliantCount: true,
        cachedNotAssessedCount: true,
      }
    });

    // Aggregate across all CCs
    let totalScore = 0;
    let totalAssessments = 0;
    let compliant = 0;
    let partial = 0;
    let nonCompliant = 0;
    let notAssessed = 0;

    for (const cc of ccs) {
      totalScore += cc.cachedComplianceScore || 0;
      totalAssessments += cc.cachedTotalAssessments || 0;
      compliant += cc.cachedCompliantCount || 0;
      partial += cc.cachedPartialCount || 0;
      nonCompliant += cc.cachedNonCompliantCount || 0;
      notAssessed += cc.cachedNotAssessedCount || 0;
    }

    const functions = await this.calculateFunctionBreakdown(null, null);

    return {
      scope: { type: null, id: null, name: 'All Organizations' },
      rollup: {
        complianceScore: ccs.length > 0 ? Math.round(totalScore / ccs.length) : 0,
        totalAssessments,
        compliantCount: compliant,
        partialCount: partial,
        nonCompliantCount: nonCompliant,
        notAssessedCount: notAssessed,
      },
      functions,
      children: ccs.map(cc => ({
        type: 'cc' as ScopeType,
        id: cc.id,
        name: cc.name,
        complianceScore: cc.cachedComplianceScore || 0,
      })),
    };
  }

  private async getCapabilityCentreCompliance(ccId: string): Promise<HierarchicalComplianceResult> {
    const cc = await prisma.capabilityCentre.findUnique({
      where: { id: ccId },
      include: {
        frameworks: {
          select: {
            id: true,
            name: true,
            cachedComplianceScore: true,
          }
        }
      }
    });

    if (!cc) {
      throw new Error(`Capability Centre not found: ${ccId}`);
    }

    const functions = await this.calculateFunctionBreakdown('cc', ccId);

    return {
      scope: { type: 'cc', id: ccId, name: cc.name },
      rollup: {
        complianceScore: cc.cachedComplianceScore || 0,
        totalAssessments: cc.cachedTotalAssessments || 0,
        compliantCount: cc.cachedCompliantCount || 0,
        partialCount: cc.cachedPartialCount || 0,
        nonCompliantCount: cc.cachedNonCompliantCount || 0,
        notAssessedCount: cc.cachedNotAssessedCount || 0,
      },
      functions,
      children: cc.frameworks.map(fw => ({
        type: 'framework' as ScopeType,
        id: fw.id,
        name: fw.name,
        complianceScore: fw.cachedComplianceScore || 0,
      })),
    };
  }

  private async getFrameworkScopedCompliance(frameworkId: string): Promise<HierarchicalComplianceResult> {
    const framework = await prisma.framework.findUnique({
      where: { id: frameworkId },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            criticality: true,
            cachedComplianceScore: true,
          }
        }
      }
    });

    if (!framework) {
      throw new Error(`Framework not found: ${frameworkId}`);
    }

    const functions = await this.calculateFunctionBreakdown('framework', frameworkId);

    return {
      scope: { type: 'framework', id: frameworkId, name: framework.name },
      rollup: {
        complianceScore: framework.cachedComplianceScore || 0,
        totalAssessments: framework.cachedTotalAssessments || 0,
        compliantCount: framework.cachedCompliantCount || 0,
        partialCount: framework.cachedPartialCount || 0,
        nonCompliantCount: framework.cachedNonCompliantCount || 0,
        notAssessedCount: framework.cachedNotAssessedCount || 0,
      },
      functions,
      children: framework.products.map(p => ({
        type: 'product' as ScopeType,
        id: p.id,
        name: p.name,
        complianceScore: p.cachedComplianceScore || 0,
        criticality: p.criticality,
      })),
    };
  }

  private async getProductScopedCompliance(productId: string): Promise<HierarchicalComplianceResult> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        systems: {
          select: {
            id: true,
            name: true,
            criticality: true,
            cachedComplianceScore: true,
          }
        }
      }
    });

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const functions = await this.calculateFunctionBreakdown('product', productId);

    return {
      scope: { type: 'product', id: productId, name: product.name },
      rollup: {
        complianceScore: product.cachedComplianceScore || 0,
        totalAssessments: product.cachedTotalAssessments || 0,
        compliantCount: product.cachedCompliantCount || 0,
        partialCount: product.cachedPartialCount || 0,
        nonCompliantCount: product.cachedNonCompliantCount || 0,
        notAssessedCount: product.cachedNotAssessedCount || 0,
      },
      functions,
      children: product.systems.map(s => ({
        type: 'system' as ScopeType,
        id: s.id,
        name: s.name,
        complianceScore: s.cachedComplianceScore || 0,
        criticality: s.criticality,
      })),
    };
  }

  private async getSystemScopedCompliance(systemId: string): Promise<HierarchicalComplianceResult> {
    const system = await prisma.system.findUnique({
      where: { id: systemId },
    });

    if (!system) {
      throw new Error(`System not found: ${systemId}`);
    }

    const functions = await this.calculateFunctionBreakdown('system', systemId);

    return {
      scope: { type: 'system', id: systemId, name: system.name },
      rollup: {
        complianceScore: system.cachedComplianceScore || 0,
        totalAssessments: system.cachedTotalAssessments || 0,
        compliantCount: system.cachedCompliantCount || 0,
        partialCount: system.cachedPartialCount || 0,
        nonCompliantCount: system.cachedNonCompliantCount || 0,
        notAssessedCount: system.cachedNotAssessedCount || 0,
      },
      functions,
    };
  }

  /**
   * Calculate CSF function breakdown for a given scope
   */
  private async calculateFunctionBreakdown(
    scopeType: ScopeType | null,
    scopeId: string | null
  ): Promise<FunctionBreakdown[]> {
    // Build where clause based on scope
    let systemIds: string[] = [];

    if (!scopeType || !scopeId) {
      // Global - get all systems
      const systems = await prisma.system.findMany({ select: { id: true } });
      systemIds = systems.map(s => s.id);
    } else {
      switch (scopeType) {
        case 'system':
          systemIds = [scopeId];
          break;
        case 'product': {
          const systems = await prisma.system.findMany({
            where: { productId: scopeId },
            select: { id: true }
          });
          systemIds = systems.map(s => s.id);
          break;
        }
        case 'framework': {
          const systems = await prisma.system.findMany({
            where: { product: { frameworkId: scopeId } },
            select: { id: true }
          });
          systemIds = systems.map(s => s.id);
          break;
        }
        case 'cc': {
          const systems = await prisma.system.findMany({
            where: { product: { framework: { capabilityCentreId: scopeId } } },
            select: { id: true }
          });
          systemIds = systems.map(s => s.id);
          break;
        }
      }
    }

    if (systemIds.length === 0) {
      return [];
    }

    // Get assessments for these systems
    const assessments = await prisma.complianceAssessment.findMany({
      where: { systemId: { in: systemIds } },
      select: { subcategoryId: true, status: true }
    });

    // Get CSF controls for function mapping
    const controls = await prisma.cSFControl.findMany({
      select: { id: true, functionId: true }
    });

    const controlToFunction = new Map(controls.map(c => [c.id, c.functionId]));

    // CSF function definitions
    const FUNCTIONS: Record<string, string> = {
      GV: 'Govern',
      ID: 'Identify',
      PR: 'Protect',
      DE: 'Detect',
      RS: 'Respond',
      RC: 'Recover',
    };

    // Aggregate by function
    const functionStats: Record<string, { compliant: number; partial: number; nonCompliant: number; notAssessed: number; total: number }> = {};

    for (const funcCode of Object.keys(FUNCTIONS)) {
      functionStats[funcCode] = { compliant: 0, partial: 0, nonCompliant: 0, notAssessed: 0, total: 0 };
    }

    for (const a of assessments) {
      const funcCode = controlToFunction.get(a.subcategoryId) || a.subcategoryId.split('.')[0];
      if (!functionStats[funcCode]) continue;

      functionStats[funcCode].total++;

      switch (a.status) {
        case 'COMPLIANT':
          functionStats[funcCode].compliant++;
          break;
        case 'PARTIAL':
        case 'PARTIALLY_COMPLIANT':
          functionStats[funcCode].partial++;
          break;
        case 'NON_COMPLIANT':
          functionStats[funcCode].nonCompliant++;
          break;
        case 'NOT_ASSESSED':
        case 'NOT_APPLICABLE':
          functionStats[funcCode].notAssessed++;
          break;
      }
    }

    return Object.entries(functionStats).map(([funcCode, stats]) => {
      const assessed = stats.total - stats.notAssessed;
      const score = assessed > 0
        ? Math.round(((stats.compliant + stats.partial * 0.5) / assessed) * 100)
        : 0;

      return {
        functionCode: funcCode,
        functionName: FUNCTIONS[funcCode] || funcCode,
        complianceScore: score,
        totalControls: stats.total,
        assessedControls: assessed,
        compliantCount: stats.compliant,
        partialCount: stats.partial,
        nonCompliantCount: stats.nonCompliant,
      };
    });
  }

  /**
   * Recalculate all cached scores (for backfill or repair)
   */
  async recalculateAll(): Promise<void> {
    console.log('Starting full compliance cache recalculation...');

    // Get all systems and calculate bottom-up
    const systems = await prisma.system.findMany({ select: { id: true } });
    console.log(`Recalculating ${systems.length} systems...`);
    for (const sys of systems) {
      await this.calculateSystemCompliance(sys.id);
    }

    const products = await prisma.product.findMany({ select: { id: true } });
    console.log(`Recalculating ${products.length} products...`);
    for (const prod of products) {
      await this.calculateProductCompliance(prod.id);
    }

    const frameworks = await prisma.framework.findMany({ select: { id: true } });
    console.log(`Recalculating ${frameworks.length} frameworks...`);
    for (const fw of frameworks) {
      await this.calculateFrameworkCompliance(fw.id);
    }

    const ccs = await prisma.capabilityCentre.findMany({ select: { id: true } });
    console.log(`Recalculating ${ccs.length} capability centres...`);
    for (const cc of ccs) {
      await this.calculateCapabilityCentreCompliance(cc.id);
    }

    console.log('Full compliance cache recalculation complete.');
  }
}

export const complianceCalculationService = new ComplianceCalculationService();
export default complianceCalculationService;

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import PDFDocument from 'pdfkit';

const router = express.Router();
const prisma = new PrismaClient();

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

// GET /api/export/pdf/:productId - Generate PDF compliance report
router.get('/pdf/:productId', async (req: AuthenticatedRequest, res) => {
  try {
    // Verify product ownership
    const hasAccess = await verifyProductOwnership(req.params.productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get product with full data
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

    // Get CSF controls
    const controls = await prisma.cSFControl.findMany();
    const controlsMap = new Map(controls.map(c => [c.id, c]));

    // Calculate metrics
    const allAssessments = product.systems.flatMap(s => s.assessments);
    const complianceScore = calculateComplianceScore(allAssessments);

    const statusCounts = {
      COMPLIANT: allAssessments.filter(a => a.status === 'COMPLIANT').length,
      PARTIALLY_COMPLIANT: allAssessments.filter(a => a.status === 'PARTIALLY_COMPLIANT').length,
      NON_COMPLIANT: allAssessments.filter(a => a.status === 'NON_COMPLIANT').length,
      NOT_ASSESSED: allAssessments.filter(a => a.status === 'NOT_ASSESSED').length,
      NOT_APPLICABLE: allAssessments.filter(a => a.status === 'NOT_APPLICABLE').length
    };

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${product.name.replace(/[^a-z0-9]/gi, '-')}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Title
    doc.fontSize(24).font('Helvetica-Bold').text('NIST Compliance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(product.name, { align: 'center' });
    doc.moveDown();

    // Date
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Executive Summary
    doc.fontSize(14).font('Helvetica-Bold').text('Executive Summary');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Product Type: ${product.type}`);
    doc.text(`Criticality: ${product.criticality}`);
    doc.text(`Systems Assessed: ${product.systems.length}`);
    doc.text(`Total Assessments: ${allAssessments.length}`);
    doc.text(`Overall Compliance Score: ${complianceScore}%`);
    doc.moveDown(2);

    // Compliance Status Breakdown
    doc.fontSize(14).font('Helvetica-Bold').text('Compliance Status Breakdown');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Compliant: ${statusCounts.COMPLIANT} (${Math.round((statusCounts.COMPLIANT / allAssessments.length) * 100)}%)`);
    doc.text(`Partially Compliant: ${statusCounts.PARTIALLY_COMPLIANT} (${Math.round((statusCounts.PARTIALLY_COMPLIANT / allAssessments.length) * 100)}%)`);
    doc.text(`Non-Compliant: ${statusCounts.NON_COMPLIANT} (${Math.round((statusCounts.NON_COMPLIANT / allAssessments.length) * 100)}%)`);
    doc.text(`Not Assessed: ${statusCounts.NOT_ASSESSED} (${Math.round((statusCounts.NOT_ASSESSED / allAssessments.length) * 100)}%)`);
    doc.text(`Not Applicable: ${statusCounts.NOT_APPLICABLE} (${Math.round((statusCounts.NOT_APPLICABLE / allAssessments.length) * 100)}%)`);
    doc.moveDown(2);

    // Systems Summary
    doc.fontSize(14).font('Helvetica-Bold').text('Systems Summary');
    doc.moveDown(0.5);
    product.systems.forEach(system => {
      const systemScore = calculateComplianceScore(system.assessments);
      doc.fontSize(10).font('Helvetica-Bold').text(system.name);
      doc.fontSize(10).font('Helvetica');
      doc.text(`  Environment: ${system.environment}`);
      doc.text(`  Criticality: ${system.criticality}`);
      doc.text(`  Assessments: ${system.assessments.length}`);
      doc.text(`  Compliance Score: ${systemScore}%`);
      doc.moveDown(0.5);
    });

    // Add new page for detailed findings
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').text('Detailed Assessment Findings');
    doc.moveDown(1);

    // Non-compliant and partially compliant items
    const gaps = allAssessments.filter(a =>
      a.status === 'NON_COMPLIANT' || a.status === 'PARTIALLY_COMPLIANT'
    );

    if (gaps.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Items Requiring Attention:');
      doc.moveDown(0.5);

      gaps.slice(0, 20).forEach((assessment, index) => {
        const control = controlsMap.get(assessment.subcategoryId);
        const system = product.systems.find(s => s.id === assessment.systemId);

        doc.fontSize(10).font('Helvetica-Bold').text(`${index + 1}. ${control?.id || assessment.subcategoryId}`);
        doc.fontSize(9).font('Helvetica');
        doc.text(`   Status: ${assessment.status}`);
        doc.text(`   System: ${system?.name || 'Unknown'}`);
        doc.text(`   Control: ${control?.title || 'Unknown'}`, { width: 450 });
        if (assessment.details) {
          doc.text(`   Details: ${assessment.details.substring(0, 200)}...`, { width: 450 });
        }
        doc.moveDown(0.5);
      });

      if (gaps.length > 20) {
        doc.text(`... and ${gaps.length - 20} more items requiring attention`);
      }
    } else {
      doc.fontSize(10).font('Helvetica').text('No items requiring immediate attention.');
    }

    // Footer
    doc.fontSize(8).font('Helvetica').text(
      `NIST Compliance Report - Confidential - Page ${doc.bufferedPageRange().count}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

// GET /api/export/excel/:productId - Generate Excel assessment workbook
router.get('/excel/:productId', async (req: AuthenticatedRequest, res) => {
  try {
    // Verify product ownership
    const hasAccess = await verifyProductOwnership(req.params.productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get product with full data
    const product = await prisma.product.findUnique({
      where: { id: req.params.productId },
      include: {
        systems: {
          include: {
            assessments: true
          }
        },
        csfBaseline: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get CSF controls
    const controls = await prisma.cSFControl.findMany();
    const controlsMap = new Map(controls.map(c => [c.id, c]));

    // Generate CSV data (simplified Excel alternative for this implementation)
    const allAssessments = product.systems.flatMap(s =>
      s.assessments.map(a => ({
        system: s,
        assessment: a,
        control: controlsMap.get(a.subcategoryId)
      }))
    );

    // Create CSV content
    let csvContent = 'System,Environment,Control ID,Function,Category,Control Title,Status,Assessor,Assessed Date,Details,Remediation Plan\n';

    allAssessments.forEach(({ system, assessment, control }) => {
      const row = [
        system.name,
        system.environment,
        assessment.subcategoryId,
        control?.functionId || '',
        control?.categoryId || '',
        control?.title || '',
        assessment.status,
        assessment.assessor || '',
        assessment.assessedDate ? assessment.assessedDate.toISOString().split('T')[0] : '',
        (assessment.details || '').replace(/"/g, '""'),
        (assessment.remediationPlan || '').replace(/"/g, '""')
      ].map(val => `"${val}"`).join(',');

      csvContent += row + '\n';
    });

    // Set response headers for CSV (Excel can open CSV files)
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="compliance-assessment-${product.name.replace(/[^a-z0-9]/gi, '-')}.csv"`);

    res.send(csvContent);
  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

// GET /api/export/csv/:productId - Generate CSV data export
router.get('/csv/:productId', async (req: AuthenticatedRequest, res) => {
  try {
    // Verify product ownership
    const hasAccess = await verifyProductOwnership(req.params.productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get product with full data
    const product = await prisma.product.findUnique({
      where: { id: req.params.productId },
      include: {
        systems: {
          include: {
            assessments: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get CSF controls
    const controls = await prisma.cSFControl.findMany();
    const controlsMap = new Map(controls.map(c => [c.id, c]));

    // Create CSV content
    let csvContent = 'Product,System,System Environment,System Criticality,Control ID,Function,Category,Control Title,Status,Assessor,Assessed Date,Details,Remediation Plan\n';

    product.systems.forEach(system => {
      system.assessments.forEach(assessment => {
        const control = controlsMap.get(assessment.subcategoryId);

        const row = [
          product.name,
          system.name,
          system.environment,
          system.criticality,
          assessment.subcategoryId,
          control?.functionId || '',
          control?.categoryId || '',
          control?.title || '',
          assessment.status,
          assessment.assessor || '',
          assessment.assessedDate ? assessment.assessedDate.toISOString().split('T')[0] : '',
          (assessment.details || '').replace(/"/g, '""').substring(0, 500),
          (assessment.remediationPlan || '').replace(/"/g, '""').substring(0, 500)
        ].map(val => `"${val}"`).join(',');

        csvContent += row + '\n';
      });
    });

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="compliance-data-${product.name.replace(/[^a-z0-9]/gi, '-')}.csv"`);

    res.send(csvContent);
  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ error: 'Failed to generate CSV export' });
  }
});

// GET /api/export/json/:productId - Generate JSON data export
router.get('/json/:productId', async (req: AuthenticatedRequest, res) => {
  try {
    // Verify product ownership
    const hasAccess = await verifyProductOwnership(req.params.productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get product with full data
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

    // Get CSF controls
    const controls = await prisma.cSFControl.findMany();
    const controlsMap = new Map(controls.map(c => [c.id, c]));

    // Get NIST 800-53 mappings
    const mappings = await prisma.nIST80053Mapping.findMany();
    const mappingsMap = new Map<string, any[]>();
    mappings.forEach(m => {
      if (!mappingsMap.has(m.csfControlId)) {
        mappingsMap.set(m.csfControlId, []);
      }
      mappingsMap.get(m.csfControlId)!.push({
        nist80053Id: m.nist80053Id,
        controlFamily: m.controlFamily,
        priority: m.priority
      });
    });

    // Calculate metrics
    const allAssessments = product.systems.flatMap(s => s.assessments);
    const complianceScore = calculateComplianceScore(allAssessments);

    // Build comprehensive export data
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        exportedBy: req.user!.email,
        version: '2.0.0'
      },
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        type: product.type,
        criticality: product.criticality,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      },
      metrics: {
        totalSystems: product.systems.length,
        totalAssessments: allAssessments.length,
        complianceScore,
        statusBreakdown: {
          COMPLIANT: allAssessments.filter(a => a.status === 'COMPLIANT').length,
          PARTIALLY_COMPLIANT: allAssessments.filter(a => a.status === 'PARTIALLY_COMPLIANT').length,
          NON_COMPLIANT: allAssessments.filter(a => a.status === 'NON_COMPLIANT').length,
          NOT_ASSESSED: allAssessments.filter(a => a.status === 'NOT_ASSESSED').length,
          NOT_APPLICABLE: allAssessments.filter(a => a.status === 'NOT_APPLICABLE').length
        }
      },
      baseline: product.csfBaseline.map(b => ({
        subcategoryId: b.subcategoryId,
        applicable: b.applicable,
        categoryLevel: b.categoryLevel,
        justification: b.justification,
        control: {
          id: controlsMap.get(b.subcategoryId)?.id,
          title: controlsMap.get(b.subcategoryId)?.title,
          functionId: controlsMap.get(b.subcategoryId)?.functionId,
          categoryId: controlsMap.get(b.subcategoryId)?.categoryId
        }
      })),
      systems: product.systems.map(system => ({
        id: system.id,
        name: system.name,
        description: system.description,
        criticality: system.criticality,
        environment: system.environment,
        dataClassification: system.dataClassification,
        metrics: {
          totalAssessments: system.assessments.length,
          complianceScore: calculateComplianceScore(system.assessments)
        },
        assessments: system.assessments.map(assessment => {
          const control = controlsMap.get(assessment.subcategoryId);
          return {
            id: assessment.id,
            subcategoryId: assessment.subcategoryId,
            status: assessment.status,
            details: assessment.details,
            assessor: assessment.assessor,
            assessedDate: assessment.assessedDate,
            evidence: assessment.evidence ? JSON.parse(assessment.evidence) : null,
            remediationPlan: assessment.remediationPlan,
            control: {
              id: control?.id,
              title: control?.title,
              text: control?.text,
              functionId: control?.functionId,
              categoryId: control?.categoryId
            },
            nist80053Mappings: mappingsMap.get(assessment.subcategoryId) || []
          };
        })
      }))
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="compliance-export-${product.name.replace(/[^a-z0-9]/gi, '-')}.json"`);

    res.json(exportData);
  } catch (error) {
    console.error('Error generating JSON export:', error);
    res.status(500).json({ error: 'Failed to generate JSON export' });
  }
});

export default router;

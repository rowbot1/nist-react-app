import express from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { logAuditFromRequest, getChangedFields } from '../services/auditService';

const router = express.Router();


// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['WEB_APPLICATION', 'MOBILE_APPLICATION', 'INFRASTRUCTURE', 'CLOUD_SERVICE', 'API_SERVICE', 'DATABASE', 'NETWORK_DEVICE', 'SECURITY_TOOL', 'OTHER']).optional(),
  criticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  impactLevel: z.enum(['LOW', 'MODERATE', 'HIGH']).optional(), // FIPS 199 security categorization
  frameworkId: z.string().uuid(), // Products MUST belong to a framework
});

const updateProductSchema = createProductSchema.partial();

// GET /api/products - Get all products for user
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { userId: req.user!.id },
      include: {
        systems: {
          select: {
            id: true,
            name: true,
            criticality: true,
            _count: {
              select: { assessments: true }
            }
          }
        },
        csfBaseline: {
          where: { applicable: true },
          select: {
            subcategoryId: true,
            categoryLevel: true
          }
        },
        _count: {
          select: {
            systems: true,
            csfBaseline: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Calculate compliance metrics for each product
    const productsWithMetrics = await Promise.all(
      products.map(async (product) => {
        const totalAssessments = await prisma.complianceAssessment.count({
          where: {
            system: {
              productId: product.id
            }
          }
        });

        const completedAssessments = await prisma.complianceAssessment.count({
          where: {
            system: {
              productId: product.id
            },
            status: {
              not: 'NOT_ASSESSED'
            }
          }
        });

        const compliantAssessments = await prisma.complianceAssessment.count({
          where: {
            system: {
              productId: product.id
            },
            status: 'COMPLIANT'
          }
        });

        const completionRate = totalAssessments > 0 ? (completedAssessments / totalAssessments) * 100 : 0;
        const complianceScore = completedAssessments > 0 ? (compliantAssessments / completedAssessments) * 100 : 0;

        return {
          ...product,
          metrics: {
            totalAssessments,
            completedAssessments,
            compliantAssessments,
            completionRate: Math.round(completionRate),
            complianceScore: Math.round(complianceScore)
          }
        };
      })
    );

    res.json({
      products: productsWithMetrics,
      total: productsWithMetrics.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id - Get specific product
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      },
      include: {
        framework: {
          include: {
            capabilityCentre: {
              select: {
                id: true,
                name: true,
                code: true,
                color: true
              }
            }
          }
        },
        systems: {
          include: {
            assessments: {
              select: {
                subcategoryId: true,
                status: true,
                assessedDate: true
              }
            }
          }
        },
        csfBaseline: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products - Create new product
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = createProductSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        ...validatedData,
        userId: req.user!.id
      },
      include: {
        _count: {
          select: {
            systems: true,
            csfBaseline: true
          }
        }
      }
    });

    // Audit log: Product created
    await logAuditFromRequest(req, {
      action: 'CREATE',
      entityType: 'Product',
      entityId: product.id,
      entityName: product.name,
      newValue: { name: product.name, type: product.type, criticality: product.criticality, impactLevel: product.impactLevel },
    });

    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = updateProductSchema.parse(req.body);

    // Get previous state for audit
    const previousProduct = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });

    if (!previousProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await prisma.product.updateMany({
      where: {
        id: req.params.id,
        userId: req.user!.id
      },
      data: validatedData
    });

    if (product.count === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            systems: true,
            csfBaseline: true
          }
        }
      }
    });

    // Audit log: Product updated
    const changedFields = getChangedFields(
      previousProduct as Record<string, unknown>,
      updatedProduct as Record<string, unknown>
    );

    await logAuditFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Product',
      entityId: req.params.id,
      entityName: updatedProduct?.name || previousProduct.name,
      previousValue: { name: previousProduct.name, type: previousProduct.type, criticality: previousProduct.criticality, impactLevel: previousProduct.impactLevel },
      newValue: { name: updatedProduct?.name, type: updatedProduct?.type, criticality: updatedProduct?.criticality, impactLevel: updatedProduct?.impactLevel },
      changedFields,
    });

    res.json(updatedProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    // Get product info for audit before deletion
    const productToDelete = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });

    if (!productToDelete) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const deleted = await prisma.product.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Audit log: Product deleted
    await logAuditFromRequest(req, {
      action: 'DELETE',
      entityType: 'Product',
      entityId: req.params.id,
      entityName: productToDelete.name,
      previousValue: { name: productToDelete.name, type: productToDelete.type, criticality: productToDelete.criticality, impactLevel: productToDelete.impactLevel },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST /api/products/:id/csf-baseline - Update CSF baseline
router.post('/:id/csf-baseline', async (req: AuthenticatedRequest, res) => {
  try {
    const { baseline } = req.body;

    if (!Array.isArray(baseline)) {
      return res.status(400).json({ error: 'Baseline must be an array' });
    }

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete existing baseline
    await prisma.cSFBaseline.deleteMany({
      where: { productId: req.params.id }
    });

    // Create new baseline entries
    const baselineData = baseline.map((item: any) => ({
      productId: req.params.id,
      subcategoryId: item.subcategoryId,
      applicable: item.applicable,
      categoryLevel: item.categoryLevel || 'SHOULD_HAVE',
      justification: item.justification
    }));

    await prisma.cSFBaseline.createMany({
      data: baselineData
    });

    res.json({ message: 'CSF baseline updated successfully' });
  } catch (error) {
    console.error('Error updating CSF baseline:', error);
    res.status(500).json({ error: 'Failed to update CSF baseline' });
  }
});

export default router;
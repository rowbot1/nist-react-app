import express, { Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

const router = express.Router();


// Validation schemas
const createAssignmentSchema = z.object({
  controlPattern: z.string().min(1, 'Control pattern is required'),
  assigneeId: z.string().uuid('Invalid assignee ID'),
  productId: z.string().uuid('Invalid product ID'),
  systemId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const updateAssignmentSchema = z.object({
  controlPattern: z.string().min(1).optional(),
  assigneeId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const bulkAssignmentSchema = z.object({
  controlPatterns: z.array(z.string().min(1)),
  assigneeId: z.string().uuid('Invalid assignee ID'),
  productId: z.string().uuid('Invalid product ID'),
  systemId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

// Helper to verify product ownership
async function verifyProductOwnership(productId: string, userId: string): Promise<boolean> {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      userId: userId,
    },
  });
  return !!product;
}

// GET /api/assignments - List control assignments with filters
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, systemId, assigneeId, controlPattern } = req.query;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    // Verify ownership
    const hasAccess = await verifyProductOwnership(productId as string, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const whereClause: any = {
      productId: productId as string,
    };

    if (systemId) {
      whereClause.systemId = systemId as string;
    }

    if (assigneeId) {
      whereClause.assigneeId = assigneeId as string;
    }

    if (controlPattern) {
      whereClause.controlPattern = {
        contains: controlPattern as string,
      };
    }

    const assignments = await prisma.controlAssignment.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { controlPattern: 'asc' },
    });

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /api/assignments/by-control/:controlId - Find who owns a specific control
router.get('/by-control/:controlId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { controlId } = req.params;
    const { productId, systemId } = req.query;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    // Verify ownership
    const hasAccess = await verifyProductOwnership(productId as string, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find matching assignments (exact match or pattern match)
    // e.g., controlId = "PR.AC-01" should match "PR.AC-01", "PR.AC.*", "PR.*", "*"
    const possiblePatterns = generatePossiblePatterns(controlId);

    const whereClause: any = {
      productId: productId as string,
      controlPattern: {
        in: possiblePatterns,
      },
    };

    if (systemId) {
      whereClause.OR = [
        { systemId: systemId as string },
        { systemId: null }, // Product-wide assignments
      ];
    }

    const assignments = await prisma.controlAssignment.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { controlPattern: 'desc' }, // More specific patterns first
    });

    // Return most specific match
    const mostSpecific = assignments.length > 0 ? assignments[0] : null;

    res.json({
      controlId,
      assignment: mostSpecific,
      allMatches: assignments,
    });
  } catch (error) {
    console.error('Error finding control owner:', error);
    res.status(500).json({ error: 'Failed to find control owner' });
  }
});

// Helper to generate possible pattern matches for a control ID
function generatePossiblePatterns(controlId: string): string[] {
  const patterns = [controlId, '*'];

  // e.g., "PR.AC-01" -> ["PR.AC-01", "PR.AC.*", "PR.*", "*"]
  const parts = controlId.split('.');
  if (parts.length >= 2) {
    // Function + category wildcard (e.g., "PR.*")
    patterns.push(`${parts[0]}.*`);

    // Full category wildcard (e.g., "PR.AC.*")
    const categoryParts = parts[1].split('-');
    if (categoryParts.length === 2) {
      patterns.push(`${parts[0]}.${categoryParts[0]}.*`);
    } else {
      patterns.push(`${parts[0]}.${parts[1]}.*`);
    }
  }

  return patterns;
}

// GET /api/assignments/summary/:productId - Get assignment coverage summary
router.get('/summary/:productId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { systemId } = req.query;

    // Verify ownership
    const hasAccess = await verifyProductOwnership(productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const whereClause: any = {
      productId,
    };

    if (systemId) {
      whereClause.OR = [
        { systemId: systemId as string },
        { systemId: null },
      ];
    }

    // Get all assignments
    const assignments = await prisma.controlAssignment.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Group by assignee
    const byAssignee: Record<string, { assignee: any; patterns: string[]; count: number }> = {};
    for (const assignment of assignments) {
      if (!byAssignee[assignment.assigneeId]) {
        byAssignee[assignment.assigneeId] = {
          assignee: assignment.assignee,
          patterns: [],
          count: 0,
        };
      }
      byAssignee[assignment.assigneeId].patterns.push(assignment.controlPattern);
      byAssignee[assignment.assigneeId].count++;
    }

    // Group by function (first part of control pattern)
    const byFunction: Record<string, number> = {};
    for (const assignment of assignments) {
      const func = assignment.controlPattern.split('.')[0] || 'Other';
      byFunction[func] = (byFunction[func] || 0) + 1;
    }

    res.json({
      totalAssignments: assignments.length,
      byAssignee: Object.values(byAssignee),
      byFunction,
      assignments,
    });
  } catch (error) {
    console.error('Error fetching assignment summary:', error);
    res.status(500).json({ error: 'Failed to fetch assignment summary' });
  }
});

// GET /api/assignments/:id - Get single assignment
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.controlAssignment.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Verify ownership
    const hasAccess = await verifyProductOwnership(assignment.productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// POST /api/assignments - Create a new assignment
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = createAssignmentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { controlPattern, assigneeId, productId, systemId, notes } = validation.data;

    // Verify ownership
    const hasAccess = await verifyProductOwnership(productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Verify assignee exists
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
    });
    if (!assignee) {
      return res.status(404).json({ error: 'Assignee not found' });
    }

    // Verify system if provided
    if (systemId) {
      const system = await prisma.system.findFirst({
        where: {
          id: systemId,
          productId: productId,
        },
      });
      if (!system) {
        return res.status(404).json({ error: 'System not found' });
      }
    }

    const assignment = await prisma.controlAssignment.create({
      data: {
        controlPattern,
        assigneeId,
        productId,
        systemId: systemId || null,
        notes,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(assignment);
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Assignment already exists for this control pattern' });
    }
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// POST /api/assignments/bulk - Bulk create assignments
router.post('/bulk', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = bulkAssignmentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { controlPatterns, assigneeId, productId, systemId, notes } = validation.data;

    // Verify ownership
    const hasAccess = await verifyProductOwnership(productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Verify assignee exists
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
    });
    if (!assignee) {
      return res.status(404).json({ error: 'Assignee not found' });
    }

    // Create assignments in transaction
    const results = await prisma.$transaction(async (tx) => {
      const created = [];
      const skipped = [];

      for (const controlPattern of controlPatterns) {
        try {
          const assignment = await tx.controlAssignment.create({
            data: {
              controlPattern,
              assigneeId,
              productId,
              systemId: systemId || null,
              notes,
            },
            include: {
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });
          created.push(assignment);
        } catch (err: any) {
          if (err.code === 'P2002') {
            skipped.push(controlPattern);
          } else {
            throw err;
          }
        }
      }

      return { created, skipped };
    });

    res.status(201).json({
      message: `Created ${results.created.length} assignments, skipped ${results.skipped.length} duplicates`,
      created: results.created,
      skipped: results.skipped,
    });
  } catch (error) {
    console.error('Error creating bulk assignments:', error);
    res.status(500).json({ error: 'Failed to create assignments' });
  }
});

// PUT /api/assignments/:id - Update an assignment
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateAssignmentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    // Verify assignment exists and check ownership
    const existingAssignment = await prisma.controlAssignment.findUnique({
      where: { id },
    });

    if (!existingAssignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const hasAccess = await verifyProductOwnership(existingAssignment.productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const { controlPattern, assigneeId, notes } = validation.data;

    // Verify new assignee if provided
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
      });
      if (!assignee) {
        return res.status(404).json({ error: 'Assignee not found' });
      }
    }

    const assignment = await prisma.controlAssignment.update({
      where: { id },
      data: {
        ...(controlPattern && { controlPattern }),
        ...(assigneeId && { assigneeId }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json(assignment);
  } catch (error: any) {
    console.error('Error updating assignment:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Assignment already exists for this control pattern' });
    }
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// DELETE /api/assignments/:id - Delete an assignment
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify assignment exists and check ownership
    const existingAssignment = await prisma.controlAssignment.findUnique({
      where: { id },
    });

    if (!existingAssignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const hasAccess = await verifyProductOwnership(existingAssignment.productId, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await prisma.controlAssignment.delete({
      where: { id },
    });

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// GET /api/assignments/user/my-assignments - Get current user's assignments
router.get('/user/my-assignments', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.query;

    const whereClause: any = {
      assigneeId: req.user!.id,
    };

    if (productId) {
      whereClause.productId = productId as string;
    }

    const assignments = await prisma.controlAssignment.findMany({
      where: whereClause,
      orderBy: { controlPattern: 'asc' },
    });

    // Group by product
    const byProduct: Record<string, { productId: string; assignments: typeof assignments }> = {};
    for (const assignment of assignments) {
      if (!byProduct[assignment.productId]) {
        byProduct[assignment.productId] = {
          productId: assignment.productId,
          assignments: [],
        };
      }
      byProduct[assignment.productId].assignments.push(assignment);
    }

    res.json({
      totalAssignments: assignments.length,
      byProduct: Object.values(byProduct),
      assignments,
    });
  } catch (error) {
    console.error('Error fetching user assignments:', error);
    res.status(500).json({ error: 'Failed to fetch user assignments' });
  }
});

export default router;

import express from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { logAuditFromRequest } from '../services/auditService';

const router = express.Router();


// Validation schemas
const createTaskSchema = z.object({
  assessmentId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional(),
  externalTicketId: z.string().optional(),
  externalTicketUrl: z.string().url().optional(),
  estimatedHours: z.number().positive().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  externalTicketId: z.string().nullable().optional(),
  externalTicketUrl: z.string().url().nullable().optional(),
  estimatedHours: z.number().positive().nullable().optional(),
  percentComplete: z.number().min(0).max(100).optional(),
});

const taskUpdateSchema = z.object({
  content: z.string().min(1),
  newStatus: z.enum(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED']).optional(),
  hoursLogged: z.number().positive().optional(),
});

// Helper: Verify task ownership through assessment -> system -> product
async function verifyTaskAccess(taskId: string, userId: string) {
  return prisma.remediationTask.findFirst({
    where: {
      id: taskId,
      assessment: {
        system: {
          product: {
            userId,
          },
        },
      },
    },
    include: {
      assessment: {
        include: {
          system: {
            include: {
              product: true,
            },
          },
        },
      },
      assignee: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      updates: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
}

// GET /api/remediation - List all tasks with filters
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { status, priority, assigneeId, productId, systemId, overdue } = req.query;

    const where: any = {
      assessment: {
        system: {
          product: {
            userId,
          },
        },
      },
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (productId) where.assessment = { ...where.assessment, system: { ...where.assessment.system, productId } };
    if (systemId) where.assessment = { ...where.assessment, systemId };
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    }

    const tasks = await prisma.remediationTask.findMany({
      where,
      include: {
        assessment: {
          select: {
            id: true,
            subcategoryId: true,
            status: true,
            system: {
              select: {
                id: true,
                name: true,
                product: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        _count: {
          select: { updates: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });

    // Calculate summary stats
    const summary = {
      total: tasks.length,
      byStatus: {
        OPEN: tasks.filter(t => t.status === 'OPEN').length,
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        BLOCKED: tasks.filter(t => t.status === 'BLOCKED').length,
        COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
        CANCELLED: tasks.filter(t => t.status === 'CANCELLED').length,
      },
      overdue: tasks.filter(t =>
        t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        !['COMPLETED', 'CANCELLED'].includes(t.status)
      ).length,
      dueSoon: tasks.filter(t => {
        if (!t.dueDate || ['COMPLETED', 'CANCELLED'].includes(t.status)) return false;
        const due = new Date(t.dueDate);
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return due >= now && due <= weekFromNow;
      }).length,
    };

    res.json({ tasks, summary });
  } catch (error) {
    console.error('Error fetching remediation tasks:', error);
    res.status(500).json({ error: 'Failed to fetch remediation tasks' });
  }
});

// GET /api/remediation/dashboard - Dashboard data for remediation tracking
router.get('/dashboard', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const tasks = await prisma.remediationTask.findMany({
      where: {
        assessment: {
          system: {
            product: {
              userId,
            },
          },
        },
      },
      include: {
        assessment: {
          select: {
            subcategoryId: true,
            system: {
              select: {
                name: true,
                product: { select: { name: true } },
              },
            },
          },
        },
        assignee: {
          select: { id: true, name: true },
        },
      },
    });

    const now = new Date();

    // Overdue tasks
    const overdueTasks = tasks.filter(t =>
      t.dueDate &&
      new Date(t.dueDate) < now &&
      !['COMPLETED', 'CANCELLED'].includes(t.status)
    );

    // Due this week
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueThisWeek = tasks.filter(t => {
      if (!t.dueDate || ['COMPLETED', 'CANCELLED'].includes(t.status)) return false;
      const due = new Date(t.dueDate);
      return due >= now && due <= weekFromNow;
    });

    // By assignee
    const byAssignee: Record<string, { name: string; total: number; completed: number; overdue: number }> = {};
    tasks.forEach(t => {
      if (t.assignee) {
        if (!byAssignee[t.assignee.id]) {
          byAssignee[t.assignee.id] = { name: t.assignee.name, total: 0, completed: 0, overdue: 0 };
        }
        byAssignee[t.assignee.id].total++;
        if (t.status === 'COMPLETED') byAssignee[t.assignee.id].completed++;
        if (t.dueDate && new Date(t.dueDate) < now && !['COMPLETED', 'CANCELLED'].includes(t.status)) {
          byAssignee[t.assignee.id].overdue++;
        }
      }
    });

    // By priority
    const byPriority = {
      CRITICAL: tasks.filter(t => t.priority === 'CRITICAL' && !['COMPLETED', 'CANCELLED'].includes(t.status)).length,
      HIGH: tasks.filter(t => t.priority === 'HIGH' && !['COMPLETED', 'CANCELLED'].includes(t.status)).length,
      MEDIUM: tasks.filter(t => t.priority === 'MEDIUM' && !['COMPLETED', 'CANCELLED'].includes(t.status)).length,
      LOW: tasks.filter(t => t.priority === 'LOW' && !['COMPLETED', 'CANCELLED'].includes(t.status)).length,
    };

    // Recent completions (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentCompletions = tasks.filter(t =>
      t.status === 'COMPLETED' &&
      t.completedAt &&
      new Date(t.completedAt) >= thirtyDaysAgo
    ).length;

    res.json({
      summary: {
        total: tasks.length,
        open: tasks.filter(t => !['COMPLETED', 'CANCELLED'].includes(t.status)).length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        overdue: overdueTasks.length,
        dueThisWeek: dueThisWeek.length,
        recentCompletions,
      },
      overdueTasks: overdueTasks.slice(0, 10).map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
        assignee: t.assignee?.name,
        control: t.assessment.subcategoryId,
        system: t.assessment.system.name,
      })),
      dueThisWeek: dueThisWeek.slice(0, 10).map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
        assignee: t.assignee?.name,
        control: t.assessment.subcategoryId,
        system: t.assessment.system.name,
      })),
      byAssignee: Object.values(byAssignee),
      byPriority,
    });
  } catch (error) {
    console.error('Error fetching remediation dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch remediation dashboard' });
  }
});

// GET /api/remediation/:id - Get single task with details
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const task = await verifyTaskAccess(req.params.id, req.user!.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching remediation task:', error);
    res.status(500).json({ error: 'Failed to fetch remediation task' });
  }
});

// POST /api/remediation - Create new task
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const data = createTaskSchema.parse(req.body);

    // Verify access to assessment
    const assessment = await prisma.complianceAssessment.findFirst({
      where: {
        id: data.assessmentId,
        system: {
          product: {
            userId,
          },
        },
      },
      include: {
        system: {
          select: { name: true, product: { select: { name: true } } },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found or access denied' });
    }

    const task = await prisma.remediationTask.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assigneeId: data.assigneeId,
        externalTicketId: data.externalTicketId,
        externalTicketUrl: data.externalTicketUrl,
        estimatedHours: data.estimatedHours,
        assessmentId: data.assessmentId,
        createdById: userId,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        assessment: {
          select: {
            subcategoryId: true,
            system: {
              select: { name: true },
            },
          },
        },
      },
    });

    await logAuditFromRequest(req, {
      action: 'CREATE',
      entityType: 'Assessment',
      entityId: task.id,
      entityName: task.title,
      newValue: { title: task.title, priority: task.priority, status: task.status },
      details: {
        type: 'RemediationTask',
        assessmentId: data.assessmentId,
        controlId: assessment.subcategoryId,
      },
    });

    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating remediation task:', error);
    res.status(500).json({ error: 'Failed to create remediation task' });
  }
});

// PUT /api/remediation/:id - Update task
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const existing = await verifyTaskAccess(req.params.id, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const data = updateTaskSchema.parse(req.body);
    const updateData: any = { ...data };

    // Handle date conversion
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    // Auto-set completedAt when status changes to COMPLETED
    if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.percentComplete = 100;
    } else if (data.status && data.status !== 'COMPLETED' && existing.status === 'COMPLETED') {
      updateData.completedAt = null;
    }

    const task = await prisma.remediationTask.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        assessment: {
          select: {
            subcategoryId: true,
            system: {
              select: { name: true },
            },
          },
        },
      },
    });

    await logAuditFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Assessment',
      entityId: task.id,
      entityName: task.title,
      previousValue: { status: existing.status, priority: existing.priority },
      newValue: { status: task.status, priority: task.priority },
      details: { type: 'RemediationTask' },
    });

    res.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating remediation task:', error);
    res.status(500).json({ error: 'Failed to update remediation task' });
  }
});

// POST /api/remediation/:id/update - Add update/progress note to task
router.post('/:id/update', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const existing = await verifyTaskAccess(req.params.id, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const data = taskUpdateSchema.parse(req.body);

    // Create the update record
    const update = await prisma.taskUpdate.create({
      data: {
        taskId: req.params.id,
        content: data.content,
        oldStatus: data.newStatus ? existing.status : null,
        newStatus: data.newStatus || null,
        hoursLogged: data.hoursLogged,
        createdById: userId,
      },
    });

    // Update task if status changed or hours logged
    const taskUpdateData: any = {};
    if (data.newStatus) {
      taskUpdateData.status = data.newStatus;
      if (data.newStatus === 'COMPLETED') {
        taskUpdateData.completedAt = new Date();
        taskUpdateData.percentComplete = 100;
      }
    }
    if (data.hoursLogged) {
      taskUpdateData.actualHours = (existing.actualHours || 0) + data.hoursLogged;
    }

    if (Object.keys(taskUpdateData).length > 0) {
      await prisma.remediationTask.update({
        where: { id: req.params.id },
        data: taskUpdateData,
      });
    }

    res.status(201).json(update);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error adding task update:', error);
    res.status(500).json({ error: 'Failed to add task update' });
  }
});

// DELETE /api/remediation/:id - Delete task
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const existing = await verifyTaskAccess(req.params.id, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await prisma.remediationTask.delete({
      where: { id: req.params.id },
    });

    await logAuditFromRequest(req, {
      action: 'DELETE',
      entityType: 'Assessment',
      entityId: req.params.id,
      entityName: existing.title,
      previousValue: { title: existing.title, status: existing.status },
      details: { type: 'RemediationTask' },
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting remediation task:', error);
    res.status(500).json({ error: 'Failed to delete remediation task' });
  }
});

// GET /api/remediation/assessment/:assessmentId - Get all tasks for an assessment
router.get('/assessment/:assessmentId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Verify access to assessment
    const assessment = await prisma.complianceAssessment.findFirst({
      where: {
        id: req.params.assessmentId,
        system: {
          product: {
            userId,
          },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const tasks = await prisma.remediationTask.findMany({
      where: { assessmentId: req.params.assessmentId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        _count: {
          select: { updates: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ tasks, total: tasks.length });
  } catch (error) {
    console.error('Error fetching assessment tasks:', error);
    res.status(500).json({ error: 'Failed to fetch assessment tasks' });
  }
});

export default router;

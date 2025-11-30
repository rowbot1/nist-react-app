import express, { Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

const router = express.Router();


// Validation schemas
const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  assessmentId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  mentions: z.array(z.string().uuid()).optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  mentions: z.array(z.string().uuid()).optional(),
});

// Helper to verify user owns the assessment through product chain
async function verifyAssessmentAccess(assessmentId: string, userId: string): Promise<boolean> {
  const assessment = await prisma.complianceAssessment.findFirst({
    where: {
      id: assessmentId,
      system: {
        product: {
          userId: userId,
        },
      },
    },
  });
  return !!assessment;
}

// GET /api/comments - List comments for an assessment
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assessmentId, parentId } = req.query;

    if (!assessmentId) {
      return res.status(400).json({ error: 'assessmentId is required' });
    }

    // Verify access
    const hasAccess = await verifyAssessmentAccess(assessmentId as string, req.user!.id);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const whereClause: any = {
      assessmentId: assessmentId as string,
    };

    // If parentId is provided, get replies; otherwise get top-level comments
    if (parentId) {
      whereClause.parentId = parentId as string;
    } else {
      whereClause.parentId = null;
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse mentions and enhance with user info
    const enhancedComments = await Promise.all(
      comments.map(async (comment) => {
        let mentionedUsers: any[] = [];
        if (comment.mentions) {
          const mentionIds = JSON.parse(comment.mentions);
          mentionedUsers = await prisma.user.findMany({
            where: { id: { in: mentionIds } },
            select: { id: true, name: true, email: true },
          });
        }
        return {
          ...comment,
          mentionedUsers,
          replyCount: comment._count.replies,
        };
      })
    );

    res.json(enhancedComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// GET /api/comments/:id - Get single comment with thread
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parent: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        assessment: {
          select: {
            id: true,
            subcategoryId: true,
            system: {
              select: {
                id: true,
                name: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    userId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Verify access through assessment
    if (comment.assessment && comment.assessment.system.product.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Parse mentions
    let mentionedUsers: any[] = [];
    if (comment.mentions) {
      const mentionIds = JSON.parse(comment.mentions);
      mentionedUsers = await prisma.user.findMany({
        where: { id: { in: mentionIds } },
        select: { id: true, name: true, email: true },
      });
    }

    res.json({
      ...comment,
      mentionedUsers,
    });
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({ error: 'Failed to fetch comment' });
  }
});

// POST /api/comments - Create a new comment
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = createCommentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { content, assessmentId, parentId, mentions } = validation.data;

    // Must have either assessmentId or parentId
    if (!assessmentId && !parentId) {
      return res.status(400).json({ error: 'Either assessmentId or parentId is required' });
    }

    // If parentId is provided, get assessmentId from parent
    let finalAssessmentId = assessmentId;
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
      finalAssessmentId = parentComment.assessmentId || undefined;
    }

    // Verify access
    if (finalAssessmentId) {
      const hasAccess = await verifyAssessmentAccess(finalAssessmentId, req.user!.id);
      if (!hasAccess) {
        return res.status(404).json({ error: 'Assessment not found' });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        assessmentId: finalAssessmentId,
        parentId,
        authorId: req.user!.id,
        mentions: mentions ? JSON.stringify(mentions) : null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Parse mentions for response
    let mentionedUsers: any[] = [];
    if (mentions && mentions.length > 0) {
      mentionedUsers = await prisma.user.findMany({
        where: { id: { in: mentions } },
        select: { id: true, name: true, email: true },
      });
    }

    res.status(201).json({
      ...comment,
      mentionedUsers,
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// PUT /api/comments/:id - Update a comment
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateCommentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { content, mentions } = validation.data;

    // Verify comment exists and user is author
    const existingComment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existingComment.authorId !== req.user!.id) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: {
        content,
        mentions: mentions ? JSON.stringify(mentions) : existingComment.mentions,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Parse mentions for response
    let mentionedUsers: any[] = [];
    if (comment.mentions) {
      const mentionIds = JSON.parse(comment.mentions);
      mentionedUsers = await prisma.user.findMany({
        where: { id: { in: mentionIds } },
        select: { id: true, name: true, email: true },
      });
    }

    res.json({
      ...comment,
      mentionedUsers,
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// DELETE /api/comments/:id - Delete a comment
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify comment exists and user is author
    const existingComment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existingComment.authorId !== req.user!.id) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    // Delete comment (cascades to replies)
    await prisma.comment.delete({
      where: { id },
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// GET /api/comments/mentions/search - Search users for @mentions
router.get('/mentions/search', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search users by name or email
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 10,
    });

    res.json(users);
  } catch (error) {
    console.error('Error searching users for mentions:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// GET /api/comments/user/mentioned - Get comments where current user is mentioned
router.get('/user/mentioned', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Find all comments where user is mentioned
    const comments = await prisma.comment.findMany({
      where: {
        mentions: {
          contains: req.user!.id,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assessment: {
          select: {
            id: true,
            subcategoryId: true,
            system: {
              select: {
                id: true,
                name: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(comments);
  } catch (error) {
    console.error('Error fetching mentioned comments:', error);
    res.status(500).json({ error: 'Failed to fetch mentioned comments' });
  }
});

export default router;

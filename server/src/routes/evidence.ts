import express from 'express';
import multer from 'multer';
import * as path from 'path';
import * as os from 'os';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { storageService } from '../services/storage.service';

const router = express.Router();


// Configure multer for file uploads
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10, // Max 10 files per request
  },
});

// GET /api/evidence/assessment/:assessmentId - List all evidence for an assessment
router.get('/assessment/:assessmentId', async (req: AuthenticatedRequest, res) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user!.id;

    // Verify user has access to this assessment
    const assessment = await prisma.complianceAssessment.findFirst({
      where: {
        id: assessmentId,
        system: {
          product: {
            userId,
          },
        },
      },
      include: {
        evidenceFiles: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found or access denied' });
    }

    res.json({
      assessmentId,
      evidence: assessment.evidenceFiles,
      total: assessment.evidenceFiles.length,
    });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

// POST /api/evidence/upload/:assessmentId - Upload evidence file(s)
router.post('/upload/:assessmentId', upload.array('files', 10), async (req: AuthenticatedRequest, res) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user!.id;
    const files = req.files as Express.Multer.File[];
    const { description } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Verify user has access to this assessment
    const assessment = await prisma.complianceAssessment.findFirst({
      where: {
        id: assessmentId,
        system: {
          product: {
            userId,
          },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found or access denied' });
    }

    const uploadedEvidence = [];
    const errors = [];

    for (const file of files) {
      try {
        const storedFile = await storageService.saveFile(file, assessmentId);

        const evidence = await prisma.evidence.create({
          data: {
            assessmentId,
            fileName: storedFile.fileName,
            originalName: storedFile.originalName,
            mimeType: storedFile.mimeType,
            fileSize: storedFile.fileSize,
            storagePath: storedFile.storagePath,
            storageType: storedFile.storageType,
            description: description || null,
            uploadedBy: userId,
          },
        });

        uploadedEvidence.push(evidence);
      } catch (fileError: any) {
        errors.push({
          fileName: file.originalname,
          error: fileError.message,
        });
      }
    }

    if (uploadedEvidence.length === 0) {
      return res.status(400).json({
        error: 'All file uploads failed',
        details: errors,
      });
    }

    res.status(201).json({
      message: `Successfully uploaded ${uploadedEvidence.length} file(s)`,
      evidence: uploadedEvidence,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error uploading evidence:', error);
    res.status(500).json({ error: 'Failed to upload evidence' });
  }
});

// GET /api/evidence/:evidenceId - Get evidence metadata
router.get('/:evidenceId', async (req: AuthenticatedRequest, res) => {
  try {
    const { evidenceId } = req.params;
    const userId = req.user!.id;

    const evidence = await prisma.evidence.findFirst({
      where: {
        id: evidenceId,
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
            id: true,
            subcategoryId: true,
            status: true,
          },
        },
      },
    });

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found or access denied' });
    }

    res.json(evidence);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

// GET /api/evidence/:evidenceId/download - Download evidence file
router.get('/:evidenceId/download', async (req: AuthenticatedRequest, res) => {
  try {
    const { evidenceId } = req.params;
    const userId = req.user!.id;

    const evidence = await prisma.evidence.findFirst({
      where: {
        id: evidenceId,
        assessment: {
          system: {
            product: {
              userId,
            },
          },
        },
      },
    });

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found or access denied' });
    }

    const { stream, contentType } = await storageService.getFile(
      evidence.storagePath,
      evidence.storageType as 'local' | 's3'
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${evidence.originalName}"`);
    res.setHeader('Content-Length', evidence.fileSize);

    stream.pipe(res);
  } catch (error: any) {
    console.error('Error downloading evidence:', error);
    if (error.message === 'File not found') {
      return res.status(404).json({ error: 'File not found on storage' });
    }
    res.status(500).json({ error: 'Failed to download evidence' });
  }
});

// PUT /api/evidence/:evidenceId - Update evidence metadata (description)
router.put('/:evidenceId', async (req: AuthenticatedRequest, res) => {
  try {
    const { evidenceId } = req.params;
    const userId = req.user!.id;
    const { description } = req.body;

    // Verify access
    const existing = await prisma.evidence.findFirst({
      where: {
        id: evidenceId,
        assessment: {
          system: {
            product: {
              userId,
            },
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Evidence not found or access denied' });
    }

    const updated = await prisma.evidence.update({
      where: { id: evidenceId },
      data: { description },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating evidence:', error);
    res.status(500).json({ error: 'Failed to update evidence' });
  }
});

// DELETE /api/evidence/:evidenceId - Delete evidence
router.delete('/:evidenceId', async (req: AuthenticatedRequest, res) => {
  try {
    const { evidenceId } = req.params;
    const userId = req.user!.id;

    const evidence = await prisma.evidence.findFirst({
      where: {
        id: evidenceId,
        assessment: {
          system: {
            product: {
              userId,
            },
          },
        },
      },
    });

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found or access denied' });
    }

    // Delete file from storage
    try {
      await storageService.deleteFile(evidence.storagePath, evidence.storageType as 'local' | 's3');
    } catch (storageError) {
      console.warn('Failed to delete file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete database record
    await prisma.evidence.delete({
      where: { id: evidenceId },
    });

    res.json({ message: 'Evidence deleted successfully' });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({ error: 'Failed to delete evidence' });
  }
});

// GET /api/evidence/stats/system/:systemId - Get evidence statistics for a system
router.get('/stats/system/:systemId', async (req: AuthenticatedRequest, res) => {
  try {
    const { systemId } = req.params;
    const userId = req.user!.id;

    // Verify access
    const system = await prisma.system.findFirst({
      where: {
        id: systemId,
        product: {
          userId,
        },
      },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found or access denied' });
    }

    // Get all assessments with evidence counts
    const assessments = await prisma.complianceAssessment.findMany({
      where: { systemId },
      include: {
        evidenceFiles: {
          select: {
            id: true,
            fileSize: true,
            mimeType: true,
          },
        },
      },
    });

    const stats = {
      systemId,
      totalAssessments: assessments.length,
      assessmentsWithEvidence: assessments.filter(a => a.evidenceFiles.length > 0).length,
      totalEvidenceFiles: assessments.reduce((sum, a) => sum + a.evidenceFiles.length, 0),
      totalStorageBytes: assessments.reduce(
        (sum, a) => sum + a.evidenceFiles.reduce((s, e) => s + e.fileSize, 0),
        0
      ),
      byStatus: {
        COMPLIANT: assessments.filter(a => a.status === 'COMPLIANT' && a.evidenceFiles.length > 0).length,
        PARTIALLY_COMPLIANT: assessments.filter(a => a.status === 'PARTIALLY_COMPLIANT' && a.evidenceFiles.length > 0).length,
        NON_COMPLIANT: assessments.filter(a => a.status === 'NON_COMPLIANT').length,
        NOT_ASSESSED: assessments.filter(a => a.status === 'NOT_ASSESSED').length,
      },
      byFileType: {} as Record<string, number>,
    };

    // Count files by type
    assessments.forEach(a => {
      a.evidenceFiles.forEach(e => {
        const type = e.mimeType.split('/')[1] || 'unknown';
        stats.byFileType[type] = (stats.byFileType[type] || 0) + 1;
      });
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching evidence stats:', error);
    res.status(500).json({ error: 'Failed to fetch evidence statistics' });
  }
});

export default router;

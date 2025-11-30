import express from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();


// GET /api/csf/controls - Get all CSF controls
router.get('/controls', async (req: AuthenticatedRequest, res) => {
  try {
    const controls = await prisma.cSFControl.findMany({
      orderBy: { id: 'asc' }
    });

    // Parse JSON fields
    const parsedControls = controls.map(control => ({
      ...control,
      implementationExamples: control.implementationExamples ? JSON.parse(control.implementationExamples) : [],
      informativeReferences: control.informativeReferences ? JSON.parse(control.informativeReferences) : []
    }));

    res.json({
      controls: parsedControls,
      total: parsedControls.length
    });
  } catch (error) {
    console.error('Error fetching CSF controls:', error);
    res.status(500).json({ error: 'Failed to fetch CSF controls' });
  }
});

// GET /api/csf/functions - List all CSF functions
router.get('/functions', async (req: AuthenticatedRequest, res) => {
  try {
    const controls = await prisma.cSFControl.findMany({
      select: {
        functionId: true
      },
      distinct: ['functionId'],
      orderBy: { functionId: 'asc' }
    });

    // Map function IDs to full names and descriptions
    const functions = controls.map(c => {
      const funcData = getFunctionData(c.functionId);
      return {
        id: c.functionId,
        name: funcData.name,
        description: funcData.description
      };
    });

    res.json({
      functions,
      total: functions.length
    });
  } catch (error) {
    console.error('Error fetching CSF functions:', error);
    res.status(500).json({ error: 'Failed to fetch CSF functions' });
  }
});

// GET /api/csf/categories/:functionId - Get categories for a function
router.get('/categories/:functionId', async (req: AuthenticatedRequest, res) => {
  try {
    const { functionId } = req.params;

    const controls = await prisma.cSFControl.findMany({
      where: { functionId },
      select: {
        categoryId: true
      },
      distinct: ['categoryId'],
      orderBy: { categoryId: 'asc' }
    });

    // Get full category details
    const categories = controls.map(c => {
      const categoryData = getCategoryData(c.categoryId);
      return {
        id: c.categoryId,
        functionId,
        name: categoryData.name,
        description: categoryData.description
      };
    });

    res.json({
      functionId,
      categories,
      total: categories.length
    });
  } catch (error) {
    console.error('Error fetching CSF categories:', error);
    res.status(500).json({ error: 'Failed to fetch CSF categories' });
  }
});

// GET /api/csf/controls/:controlId - Get single control with details and 800-53 mappings
router.get('/controls/:controlId', async (req: AuthenticatedRequest, res) => {
  try {
    const { controlId } = req.params;

    const control = await prisma.cSFControl.findUnique({
      where: { id: controlId }
    });

    if (!control) {
      return res.status(404).json({ error: 'Control not found' });
    }

    // Get NIST 800-53 mappings
    const mappings = await prisma.nIST80053Mapping.findMany({
      where: { csfControlId: controlId },
      orderBy: { nist80053Id: 'asc' }
    });

    // Parse JSON fields
    const parsedControl = {
      ...control,
      implementationExamples: control.implementationExamples ? JSON.parse(control.implementationExamples) : [],
      informativeReferences: control.informativeReferences ? JSON.parse(control.informativeReferences) : [],
      nist80053Mappings: mappings.map(m => ({
        id: m.id,
        nist80053Id: m.nist80053Id,
        controlFamily: m.controlFamily,
        priority: m.priority
      }))
    };

    res.json(parsedControl);
  } catch (error) {
    console.error('Error fetching CSF control:', error);
    res.status(500).json({ error: 'Failed to fetch CSF control' });
  }
});

// GET /api/csf/search?q=term - Search controls by text
router.get('/search', async (req: AuthenticatedRequest, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        error: 'Missing search query',
        message: 'Please provide a search term using the "q" parameter'
      });
    }

    const searchTerm = q.trim().toLowerCase();

    // Search in multiple fields
    const controls = await prisma.cSFControl.findMany({
      orderBy: { id: 'asc' }
    });

    // Filter controls based on search term
    const matchingControls = controls.filter(control => {
      const searchableText = [
        control.id,
        control.title,
        control.text,
        control.functionId,
        control.categoryId
      ].join(' ').toLowerCase();

      return searchableText.includes(searchTerm);
    });

    // Parse JSON fields for matching controls
    const parsedControls = matchingControls.map(control => ({
      ...control,
      implementationExamples: control.implementationExamples ? JSON.parse(control.implementationExamples) : [],
      informativeReferences: control.informativeReferences ? JSON.parse(control.informativeReferences) : []
    }));

    res.json({
      query: q,
      controls: parsedControls,
      total: parsedControls.length
    });
  } catch (error) {
    console.error('Error searching CSF controls:', error);
    res.status(500).json({ error: 'Failed to search CSF controls' });
  }
});

// GET /api/csf/mappings/:controlId - Get NIST 800-53 mappings for a CSF control
router.get('/mappings/:controlId', async (req: AuthenticatedRequest, res) => {
  try {
    const { controlId } = req.params;

    // Verify control exists
    const control = await prisma.cSFControl.findUnique({
      where: { id: controlId },
      select: {
        id: true,
        title: true,
        functionId: true,
        categoryId: true
      }
    });

    if (!control) {
      return res.status(404).json({ error: 'Control not found' });
    }

    // Get all mappings for this control
    const mappings = await prisma.nIST80053Mapping.findMany({
      where: { csfControlId: controlId },
      orderBy: [
        { controlFamily: 'asc' },
        { nist80053Id: 'asc' }
      ]
    });

    // Group mappings by control family
    const mappingsByFamily = new Map<string, any[]>();
    mappings.forEach(m => {
      if (!mappingsByFamily.has(m.controlFamily)) {
        mappingsByFamily.set(m.controlFamily, []);
      }
      mappingsByFamily.get(m.controlFamily)!.push({
        id: m.id,
        nist80053Id: m.nist80053Id,
        priority: m.priority
      });
    });

    const familySummary = Array.from(mappingsByFamily.entries()).map(([family, controls]) => ({
      family,
      controlCount: controls.length,
      controls
    }));

    res.json({
      csfControl: control,
      totalMappings: mappings.length,
      mappings: mappings.map(m => ({
        id: m.id,
        nist80053Id: m.nist80053Id,
        controlFamily: m.controlFamily,
        priority: m.priority
      })),
      familySummary
    });
  } catch (error) {
    console.error('Error fetching control mappings:', error);
    res.status(500).json({ error: 'Failed to fetch control mappings' });
  }
});

// GET /api/csf/categories - Get all categories with control counts
router.get('/categories', async (req: AuthenticatedRequest, res) => {
  try {
    const controls = await prisma.cSFControl.findMany({
      select: {
        categoryId: true,
        functionId: true
      }
    });

    // Group by category
    const categoryMap = new Map<string, { functionId: string; count: number }>();
    controls.forEach(c => {
      if (!categoryMap.has(c.categoryId)) {
        categoryMap.set(c.categoryId, { functionId: c.functionId, count: 0 });
      }
      categoryMap.get(c.categoryId)!.count++;
    });

    const categories = Array.from(categoryMap.entries()).map(([categoryId, data]) => {
      const categoryData = getCategoryData(categoryId);
      return {
        id: categoryId,
        functionId: data.functionId,
        name: categoryData.name,
        description: categoryData.description,
        controlCount: data.count
      };
    }).sort((a, b) => a.id.localeCompare(b.id));

    res.json({
      categories,
      total: categories.length
    });
  } catch (error) {
    console.error('Error fetching CSF categories:', error);
    res.status(500).json({ error: 'Failed to fetch CSF categories' });
  }
});

// Helper function to get function data
function getFunctionData(functionId: string): { name: string; description: string } {
  const functions: Record<string, { name: string; description: string }> = {
    'GV': {
      name: 'Govern',
      description: 'The organization\'s cybersecurity risk management strategy, expectations, and policy are established, communicated, and monitored.'
    },
    'ID': {
      name: 'Identify',
      description: 'The organization\'s current cybersecurity risks are understood.'
    },
    'PR': {
      name: 'Protect',
      description: 'Safeguards to manage the organization\'s cybersecurity risks are used.'
    },
    'DE': {
      name: 'Detect',
      description: 'Possible cybersecurity attacks and compromises are found and analyzed.'
    },
    'RS': {
      name: 'Respond',
      description: 'Actions regarding a detected cybersecurity incident are taken.'
    },
    'RC': {
      name: 'Recover',
      description: 'Assets and operations affected by a cybersecurity incident are restored.'
    }
  };

  return functions[functionId] || { name: functionId, description: 'Unknown function' };
}

// Helper function to get category data (simplified - in production, this would be more comprehensive)
function getCategoryData(categoryId: string): { name: string; description: string } {
  const categories: Record<string, { name: string; description: string }> = {
    'GV.OC': { name: 'Organizational Context', description: 'Understanding organizational context and priorities' },
    'GV.RM': { name: 'Risk Management Strategy', description: 'Risk management strategy and governance' },
    'GV.RR': { name: 'Roles, Responsibilities, and Authorities', description: 'Cybersecurity roles and responsibilities' },
    'GV.PO': { name: 'Policy', description: 'Organizational policies and procedures' },
    'GV.OV': { name: 'Oversight', description: 'Cybersecurity oversight and accountability' },
    'GV.SC': { name: 'Cybersecurity Supply Chain Risk Management', description: 'Supply chain risk management' },
    'ID.AM': { name: 'Asset Management', description: 'Identification and management of assets' },
    'ID.RA': { name: 'Risk Assessment', description: 'Risk identification and assessment' },
    'ID.IM': { name: 'Improvement', description: 'Continuous improvement processes' },
    'PR.AA': { name: 'Identity Management, Authentication, and Access Control', description: 'Access control and authentication' },
    'PR.AT': { name: 'Awareness and Training', description: 'Security awareness and training' },
    'PR.DS': { name: 'Data Security', description: 'Data protection and privacy' },
    'PR.PS': { name: 'Platform Security', description: 'Platform and infrastructure security' },
    'PR.IR': { name: 'Technology Infrastructure Resilience', description: 'Infrastructure resilience and recovery' },
    'DE.CM': { name: 'Continuous Monitoring', description: 'Continuous security monitoring' },
    'DE.AE': { name: 'Adverse Event Analysis', description: 'Analysis of security events' },
    'RS.MA': { name: 'Incident Management', description: 'Incident response management' },
    'RS.AN': { name: 'Incident Analysis', description: 'Incident analysis and response' },
    'RS.MI': { name: 'Incident Mitigation', description: 'Incident mitigation activities' },
    'RC.RP': { name: 'Incident Recovery Plan Execution', description: 'Recovery planning and execution' },
    'RC.CO': { name: 'Incident Recovery Communication', description: 'Recovery communication' }
  };

  return categories[categoryId] || { name: categoryId, description: 'Category description' };
}

export default router;

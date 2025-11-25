import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Load NIST 800-53 Rev 5 data from JSON
interface NIST80053Enhancement {
  id: string;
  title: string;
  statement: string;
  guidance: string;
}

interface NIST80053Control {
  id: string;
  family: string;
  familyName: string;
  title: string;
  description: string;
  statement: string;
  guidance: string;
  priority: string;
  baselineImpact: string[];
  relatedControls: string[];
  enhancements: NIST80053Enhancement[];
}

interface ControlFamily {
  id: string;
  name: string;
  description: string;
}

interface NIST80053Data {
  metadata: {
    source: string;
    version: string;
    lastModified: string;
    generatedAt: string;
    totalControls: number;
    totalEnhancements: number;
  };
  families: ControlFamily[];
  controls: NIST80053Control[];
}

// Load data once at startup
let nist80053Data: NIST80053Data | null = null;

function loadNIST80053Data(): NIST80053Data {
  if (nist80053Data) {
    return nist80053Data;
  }

  const dataPath = path.join(__dirname, '../../data/nist-800-53-rev5.json');

  if (!fs.existsSync(dataPath)) {
    throw new Error('NIST 800-53 Rev 5 data file not found. Run: npx ts-node scripts/fetch-800-53-rev5.ts');
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  nist80053Data = JSON.parse(rawData);

  console.log(`[NIST 800-53] Loaded ${nist80053Data!.controls.length} controls with ${nist80053Data!.metadata.totalEnhancements} enhancements`);

  return nist80053Data!;
}

// GET /api/nist80053/metadata - Get catalog metadata
router.get('/metadata', (req: AuthenticatedRequest, res) => {
  try {
    const data = loadNIST80053Data();
    res.json(data.metadata);
  } catch (error) {
    console.error('Error loading NIST 800-53 metadata:', error);
    res.status(500).json({ error: 'Failed to load NIST 800-53 metadata' });
  }
});

// GET /api/nist80053/families - List all control families
router.get('/families', (req: AuthenticatedRequest, res) => {
  try {
    const data = loadNIST80053Data();

    // Add control counts per family
    const familiesWithCounts = data.families.map(family => {
      const familyControls = data.controls.filter(c => c.family === family.id);
      const enhancementCount = familyControls.reduce((sum, c) => sum + c.enhancements.length, 0);

      return {
        ...family,
        controlCount: familyControls.length,
        enhancementCount
      };
    });

    res.json({
      families: familiesWithCounts,
      total: familiesWithCounts.length
    });
  } catch (error) {
    console.error('Error fetching NIST 800-53 families:', error);
    res.status(500).json({ error: 'Failed to fetch control families' });
  }
});

// GET /api/nist80053/controls - Get all controls (with pagination and filtering)
router.get('/controls', (req: AuthenticatedRequest, res) => {
  try {
    const data = loadNIST80053Data();
    const {
      family,
      priority,
      limit = '50',
      offset = '0',
      includeEnhancements = 'false'
    } = req.query;

    let filteredControls = [...data.controls];

    // Filter by family
    if (family && typeof family === 'string') {
      filteredControls = filteredControls.filter(c => c.family === family.toUpperCase());
    }

    // Filter by priority
    if (priority && typeof priority === 'string') {
      filteredControls = filteredControls.filter(c => c.priority === priority.toUpperCase());
    }

    // Pagination
    const limitNum = Math.min(parseInt(limit as string) || 50, 500);
    const offsetNum = parseInt(offset as string) || 0;
    const paginatedControls = filteredControls.slice(offsetNum, offsetNum + limitNum);

    // Optionally strip enhancements for lighter payloads
    const processedControls = includeEnhancements === 'true'
      ? paginatedControls
      : paginatedControls.map(({ enhancements, ...rest }) => rest);

    res.json({
      controls: processedControls,
      total: filteredControls.length,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < filteredControls.length
      }
    });
  } catch (error) {
    console.error('Error fetching NIST 800-53 controls:', error);
    res.status(500).json({ error: 'Failed to fetch controls' });
  }
});

// GET /api/nist80053/controls/:controlId - Get single control with full details
router.get('/controls/:controlId', (req: AuthenticatedRequest, res) => {
  try {
    const data = loadNIST80053Data();
    const { controlId } = req.params;
    const normalizedId = controlId.toUpperCase();

    const control = data.controls.find(c => c.id === normalizedId);

    if (!control) {
      return res.status(404).json({ error: 'Control not found' });
    }

    res.json(control);
  } catch (error) {
    console.error('Error fetching NIST 800-53 control:', error);
    res.status(500).json({ error: 'Failed to fetch control' });
  }
});

// GET /api/nist80053/controls/:controlId/enhancements - Get enhancements for a control
router.get('/controls/:controlId/enhancements', (req: AuthenticatedRequest, res) => {
  try {
    const data = loadNIST80053Data();
    const { controlId } = req.params;
    const normalizedId = controlId.toUpperCase();

    const control = data.controls.find(c => c.id === normalizedId);

    if (!control) {
      return res.status(404).json({ error: 'Control not found' });
    }

    res.json({
      controlId: control.id,
      controlTitle: control.title,
      enhancements: control.enhancements,
      total: control.enhancements.length
    });
  } catch (error) {
    console.error('Error fetching control enhancements:', error);
    res.status(500).json({ error: 'Failed to fetch enhancements' });
  }
});

// GET /api/nist80053/families/:familyId/controls - Get all controls for a family
router.get('/families/:familyId/controls', (req: AuthenticatedRequest, res) => {
  try {
    const data = loadNIST80053Data();
    const { familyId } = req.params;
    const normalizedId = familyId.toUpperCase();

    const family = data.families.find(f => f.id === normalizedId);

    if (!family) {
      return res.status(404).json({ error: 'Control family not found' });
    }

    const familyControls = data.controls.filter(c => c.family === normalizedId);

    res.json({
      family,
      controls: familyControls,
      total: familyControls.length,
      totalEnhancements: familyControls.reduce((sum, c) => sum + c.enhancements.length, 0)
    });
  } catch (error) {
    console.error('Error fetching family controls:', error);
    res.status(500).json({ error: 'Failed to fetch family controls' });
  }
});

// GET /api/nist80053/search?q=term - Search controls
router.get('/search', (req: AuthenticatedRequest, res) => {
  try {
    const data = loadNIST80053Data();
    const { q, family, limit = '50' } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        error: 'Missing search query',
        message: 'Please provide a search term using the "q" parameter'
      });
    }

    const searchTerm = q.trim().toLowerCase();
    const limitNum = Math.min(parseInt(limit as string) || 50, 200);

    let results = data.controls.filter(control => {
      const searchableText = [
        control.id,
        control.title,
        control.description,
        control.statement,
        control.guidance,
        control.familyName
      ].join(' ').toLowerCase();

      return searchableText.includes(searchTerm);
    });

    // Optionally filter by family
    if (family && typeof family === 'string') {
      results = results.filter(c => c.family === family.toUpperCase());
    }

    // Strip enhancements for lighter search results
    const lightResults = results.slice(0, limitNum).map(({ enhancements, ...rest }) => ({
      ...rest,
      enhancementCount: enhancements.length
    }));

    res.json({
      query: q,
      controls: lightResults,
      total: results.length,
      showing: lightResults.length
    });
  } catch (error) {
    console.error('Error searching NIST 800-53:', error);
    res.status(500).json({ error: 'Failed to search controls' });
  }
});

// GET /api/nist80053/statistics - Get overall statistics
router.get('/statistics', (req: AuthenticatedRequest, res) => {
  try {
    const data = loadNIST80053Data();

    const stats = {
      source: data.metadata.source,
      version: data.metadata.version,
      lastUpdated: data.metadata.lastModified,
      totalControls: data.controls.length,
      totalEnhancements: data.metadata.totalEnhancements,
      totalFamilies: data.families.length,
      familyBreakdown: data.families.map(family => {
        const controls = data.controls.filter(c => c.family === family.id);
        return {
          id: family.id,
          name: family.name,
          controls: controls.length,
          enhancements: controls.reduce((sum, c) => sum + c.enhancements.length, 0)
        };
      }),
      priorityBreakdown: {
        P1: data.controls.filter(c => c.priority === 'P1').length,
        P2: data.controls.filter(c => c.priority === 'P2').length,
        P3: data.controls.filter(c => c.priority === 'P3').length
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;

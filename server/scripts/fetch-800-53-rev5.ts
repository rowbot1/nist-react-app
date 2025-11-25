/**
 * Script to fetch and transform NIST 800-53 Rev 5 data from OSCAL
 * Run with: npx ts-node scripts/fetch-800-53-rev5.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const OSCAL_URL = 'https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json';

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

interface NIST80053Enhancement {
  id: string;
  title: string;
  statement: string;
  guidance: string;
}

interface ControlFamily {
  id: string;
  name: string;
  description: string;
}

// Control family mapping
const FAMILY_NAMES: Record<string, string> = {
  'ac': 'Access Control',
  'at': 'Awareness and Training',
  'au': 'Audit and Accountability',
  'ca': 'Assessment, Authorization, and Monitoring',
  'cm': 'Configuration Management',
  'cp': 'Contingency Planning',
  'ia': 'Identification and Authentication',
  'ir': 'Incident Response',
  'ma': 'Maintenance',
  'mp': 'Media Protection',
  'pe': 'Physical and Environmental Protection',
  'pl': 'Planning',
  'pm': 'Program Management',
  'ps': 'Personnel Security',
  'pt': 'Personally Identifiable Information Processing and Transparency',
  'ra': 'Risk Assessment',
  'sa': 'System and Services Acquisition',
  'sc': 'System and Communications Protection',
  'si': 'System and Information Integrity',
  'sr': 'Supply Chain Risk Management',
};

// Priority/baseline mapping (simplified - would need full baseline profiles for accuracy)
const BASELINE_PRIORITIES: Record<string, string> = {
  'low': 'P3',
  'moderate': 'P2',
  'high': 'P1',
};

async function fetchOSCALCatalog(): Promise<any> {
  console.log('Fetching NIST 800-53 Rev 5 OSCAL catalog...');
  const response = await fetch(OSCAL_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function extractText(parts: any[], partName: string): string {
  if (!parts) return '';

  const part = parts.find((p: any) => p.name === partName);
  if (!part) return '';

  // Recursively extract prose from part and subparts
  let text = part.prose || '';
  if (part.parts) {
    const subTexts = part.parts
      .filter((p: any) => p.prose)
      .map((p: any) => `${p.props?.find((pr: any) => pr.name === 'label')?.value || ''} ${p.prose}`.trim());
    if (subTexts.length > 0) {
      text = text ? `${text}\n${subTexts.join('\n')}` : subTexts.join('\n');
    }
  }

  return text.trim();
}

function parseControl(control: any, familyId: string): NIST80053Control {
  const id = control.id.toUpperCase();
  const family = familyId.toUpperCase();

  // Extract statement
  const statement = extractText(control.parts, 'statement');

  // Extract guidance
  const guidance = extractText(control.parts, 'guidance');

  // Extract related controls from links
  const relatedControls: string[] = [];
  if (control.links) {
    control.links
      .filter((link: any) => link.rel === 'related')
      .forEach((link: any) => {
        const match = link.href.match(/#([a-z]+-\d+)/i);
        if (match) {
          relatedControls.push(match[1].toUpperCase());
        }
      });
  }

  // Parse enhancements
  const enhancements: NIST80053Enhancement[] = [];
  if (control.controls) {
    control.controls.forEach((enh: any) => {
      enhancements.push({
        id: enh.id.toUpperCase(),
        title: enh.title || '',
        statement: extractText(enh.parts, 'statement'),
        guidance: extractText(enh.parts, 'guidance'),
      });
    });
  }

  return {
    id,
    family,
    familyName: FAMILY_NAMES[familyId] || familyId.toUpperCase(),
    title: control.title || '',
    description: statement.split('\n')[0] || control.title || '', // First line as description
    statement,
    guidance,
    priority: 'P1', // Default - would need baseline profiles for accurate priority
    baselineImpact: [], // Would need to cross-reference with baseline profiles
    relatedControls,
    enhancements,
  };
}

async function main() {
  try {
    const catalog = await fetchOSCALCatalog();

    console.log('Catalog metadata:', {
      title: catalog.catalog.metadata.title,
      version: catalog.catalog.metadata.version,
      lastModified: catalog.catalog.metadata['last-modified'],
    });

    const controls: NIST80053Control[] = [];
    const families: ControlFamily[] = [];

    // Process each control family (group)
    for (const group of catalog.catalog.groups) {
      const familyId = group.id;

      families.push({
        id: familyId.toUpperCase(),
        name: FAMILY_NAMES[familyId] || group.title,
        description: group.title,
      });

      // Process controls in this family
      if (group.controls) {
        for (const control of group.controls) {
          controls.push(parseControl(control, familyId));
        }
      }
    }

    console.log(`Processed ${controls.length} controls across ${families.length} families`);

    // Calculate statistics
    const enhancementCount = controls.reduce((sum, c) => sum + c.enhancements.length, 0);
    console.log(`Total control enhancements: ${enhancementCount}`);

    // Write output files
    const outputDir = path.join(__dirname, '..', 'data');

    // Write comprehensive controls file
    const controlsOutput = {
      metadata: {
        source: 'NIST SP 800-53 Revision 5',
        version: catalog.catalog.metadata.version,
        lastModified: catalog.catalog.metadata['last-modified'],
        generatedAt: new Date().toISOString(),
        totalControls: controls.length,
        totalEnhancements: enhancementCount,
      },
      families,
      controls,
    };

    fs.writeFileSync(
      path.join(outputDir, 'nist-800-53-rev5.json'),
      JSON.stringify(controlsOutput, null, 2)
    );
    console.log('Written: nist-800-53-rev5.json');

    // Write simplified controls file (for backwards compatibility)
    const simplifiedControls = controls.map(c => ({
      id: c.id,
      family: c.family,
      title: c.title,
      description: c.description,
      priority: c.priority,
    }));

    fs.writeFileSync(
      path.join(outputDir, 'nist-800-53.json'),
      JSON.stringify({ controls: simplifiedControls }, null, 2)
    );
    console.log('Written: nist-800-53.json (simplified)');

    // Generate statistics
    console.log('\n--- Control Family Statistics ---');
    const familyStats = families.map(f => {
      const familyControls = controls.filter(c => c.family === f.id);
      const familyEnhancements = familyControls.reduce((sum, c) => sum + c.enhancements.length, 0);
      return {
        family: f.id,
        name: f.name,
        controls: familyControls.length,
        enhancements: familyEnhancements,
      };
    });

    familyStats.forEach(stat => {
      console.log(`${stat.family}: ${stat.controls} controls, ${stat.enhancements} enhancements`);
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

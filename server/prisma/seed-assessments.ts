import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Status distribution profiles
const PROFILES = {
  EXCELLENT: { COMPLIANT: 0.85, PARTIAL: 0.10, NON_COMPLIANT: 0.03, NOT_ASSESSED: 0.02 },
  GOOD: { COMPLIANT: 0.70, PARTIAL: 0.15, NON_COMPLIANT: 0.10, NOT_ASSESSED: 0.05 },
  MODERATE: { COMPLIANT: 0.50, PARTIAL: 0.25, NON_COMPLIANT: 0.15, NOT_ASSESSED: 0.10 },
  POOR: { COMPLIANT: 0.25, PARTIAL: 0.20, NON_COMPLIANT: 0.35, NOT_ASSESSED: 0.20 },
  CRITICAL: { COMPLIANT: 0.10, PARTIAL: 0.15, NON_COMPLIANT: 0.50, NOT_ASSESSED: 0.25 },
};

// Sample implementation details
const COMPLIANT_DETAILS = [
  'Fully implemented with documented procedures and regular testing.',
  'Control implemented and verified through recent audit.',
  'Automated monitoring in place with real-time alerting.',
  'Comprehensive policy implemented across all systems.',
  'Regular reviews conducted quarterly with documented evidence.',
];

const PARTIAL_DETAILS = [
  'Implemented but documentation needs updating.',
  'Control in place but not consistently applied across all systems.',
  'Manual process in place, automation planned for Q2.',
  'Policy exists but enforcement is inconsistent.',
  'Initial implementation complete, full rollout pending.',
];

const NON_COMPLIANT_DETAILS = [
  'Control not yet implemented. Remediation plan in development.',
  'Legacy systems do not support this control. Migration planned.',
  'Resource constraints have delayed implementation.',
  'Technical limitations identified. Alternative approach being evaluated.',
  'Gap identified in recent assessment. High priority for remediation.',
];

// Random helper
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Get status based on profile probabilities
function getStatusFromProfile(profile: typeof PROFILES.EXCELLENT): string {
  const rand = Math.random();
  let cumulative = 0;
  for (const [status, prob] of Object.entries(profile)) {
    cumulative += prob;
    if (rand <= cumulative) return status;
  }
  return 'NOT_ASSESSED';
}

// Get details based on status
function getDetails(status: string): string | null {
  switch (status) {
    case 'COMPLIANT':
      return pickRandom(COMPLIANT_DETAILS);
    case 'PARTIAL':
      return pickRandom(PARTIAL_DETAILS);
    case 'NON_COMPLIANT':
      return pickRandom(NON_COMPLIANT_DETAILS);
    default:
      return null;
  }
}

// Get random date in last 90 days
function getRandomDate(): Date {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 90);
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

// Assessor names
const ASSESSORS = [
  'John Smith',
  'Sarah Johnson',
  'Mike Williams',
  'Emily Brown',
  'David Miller',
  'Jessica Davis',
  'Robert Wilson',
  'Lisa Anderson',
];

async function main() {
  console.log('Creating Compliance Assessments for all Systems...');
  console.log('='.repeat(70));

  // Clear existing assessments
  console.log('Clearing existing assessments...');
  await prisma.complianceAssessment.deleteMany({});

  // Get all systems
  const systems = await prisma.system.findMany({
    include: {
      product: {
        include: {
          framework: {
            include: {
              capabilityCentre: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${systems.length} systems`);

  // Get all CSF controls
  const controls = await prisma.cSFControl.findMany();
  console.log(`Found ${controls.length} CSF controls`);

  if (controls.length === 0) {
    console.log('No CSF controls found! Please run the main seed first.');
    return;
  }

  // Assign profiles to systems based on their name/position
  const systemProfiles: { [systemName: string]: keyof typeof PROFILES } = {
    'System One': 'EXCELLENT',
    'System Two': 'GOOD',
    'System Three': 'MODERATE',
    'System Four': 'POOR',
  };

  let totalAssessments = 0;

  for (const system of systems) {
    const ccName = system.product?.framework?.capabilityCentre?.name || 'Unknown';
    const profileKey = systemProfiles[system.name] || 'MODERATE';
    const profile = PROFILES[profileKey];

    console.log(`\n${ccName} > ${system.name} (Profile: ${profileKey})`);

    // Select a subset of controls (30-60 random controls for variety)
    const numControls = 30 + Math.floor(Math.random() * 30);
    const shuffledControls = [...controls].sort(() => Math.random() - 0.5);
    const selectedControls = shuffledControls.slice(0, numControls);

    const assessments = [];
    let statusCounts = { COMPLIANT: 0, PARTIAL: 0, NON_COMPLIANT: 0, NOT_ASSESSED: 0 };

    for (const control of selectedControls) {
      const status = getStatusFromProfile(profile);
      statusCounts[status as keyof typeof statusCounts]++;

      assessments.push({
        subcategoryId: control.id,
        status,
        details: getDetails(status),
        assessor: status !== 'NOT_ASSESSED' ? pickRandom(ASSESSORS) : null,
        assessedDate: status !== 'NOT_ASSESSED' ? getRandomDate() : null,
        systemId: system.id,
      });
    }

    // Batch create assessments
    await prisma.complianceAssessment.createMany({
      data: assessments,
    });

    totalAssessments += assessments.length;
    console.log(`   Created ${assessments.length} assessments`);
    console.log(`   Status breakdown: COMPLIANT=${statusCounts.COMPLIANT}, PARTIAL=${statusCounts.PARTIAL}, NON_COMPLIANT=${statusCounts.NON_COMPLIANT}, NOT_ASSESSED=${statusCounts.NOT_ASSESSED}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Total assessments created: ${totalAssessments}`);
  console.log('\nSystem Compliance Profile Summary:');
  console.log('  - System One:   EXCELLENT (85% compliant)');
  console.log('  - System Two:   GOOD (70% compliant)');
  console.log('  - System Three: MODERATE (50% compliant)');
  console.log('  - System Four:  POOR (25% compliant)');
  console.log('\nThis distribution applies to all 4 regions (Ireland, England, Scotland, Wales)');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

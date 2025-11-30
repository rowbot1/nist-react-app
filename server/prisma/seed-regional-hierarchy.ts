import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Regional data structure
const REGIONS = [
  {
    name: 'Ireland',
    code: 'IRL',
    color: '#22c55e', // Green
    icon: 'Business',
  },
  {
    name: 'England',
    code: 'ENG',
    color: '#3b82f6', // Blue
    icon: 'Business',
  },
  {
    name: 'Scotland',
    code: 'SCO',
    color: '#8b5cf6', // Purple
    icon: 'Business',
  },
  {
    name: 'Wales',
    code: 'WAL',
    color: '#ef4444', // Red
    icon: 'Business',
  },
];

async function main() {
  console.log('🌍 Creating Regional Organizational Hierarchy...');
  console.log('='.repeat(70));

  // Get demo user
  const demoUser = await prisma.user.findUnique({
    where: { email: 'demo@posture.app' }
  });

  if (!demoUser) {
    console.log('❌ Demo user not found. Please run the main seed first: npx prisma db seed');
    process.exit(1);
  }

  console.log(`✅ Found demo user: ${demoUser.email}\n`);

  // Clear existing capability centres and cascade down
  console.log('🧹 Clearing existing capability centres...');
  await prisma.capabilityCentre.deleteMany({});

  for (const region of REGIONS) {
    console.log(`\n🏢 Creating Capability Centre: ${region.name}...`);

    // Create Capability Centre
    const cc = await prisma.capabilityCentre.create({
      data: {
        name: region.name,
        code: region.code,
        color: region.color,
        icon: region.icon,
        description: `${region.name} regional operations and infrastructure`,
        userId: demoUser.id,
      }
    });
    console.log(`   ✅ Created CC: ${cc.name} (${cc.code})`);

    // Create Framework 1
    const framework1 = await prisma.framework.create({
      data: {
        name: 'Framework 1',
        code: `${region.code}-FW1`,
        color: '#0ea5e9', // Sky blue
        icon: 'Cloud',
        description: `Framework 1 for ${region.name}`,
        capabilityCentreId: cc.id,
      }
    });
    console.log(`   ✅ Created Framework: ${framework1.name}`);

    // Create Product 1 (container for systems)
    const product1 = await prisma.product.create({
      data: {
        name: `${region.name} Product 1`,
        description: `Product 1 for ${region.name} operations`,
        type: 'INFRASTRUCTURE',
        criticality: 'HIGH',
        userId: demoUser.id,
        frameworkId: framework1.id,
      }
    });
    console.log(`   ✅ Created Product: ${product1.name}`);

    // Create Systems for Product 1
    const systemOne = await prisma.system.create({
      data: {
        name: 'System One',
        description: 'Primary system for business operations',
        criticality: 'HIGH',
        environment: 'PRODUCTION',
        dataClassification: 'INTERNAL',
        productId: product1.id,
      }
    });
    console.log(`      ✅ System: ${systemOne.name}`);

    const systemTwo = await prisma.system.create({
      data: {
        name: 'System Two',
        description: 'Secondary system for additional workloads',
        criticality: 'HIGH',
        environment: 'PRODUCTION',
        dataClassification: 'INTERNAL',
        productId: product1.id,
      }
    });
    console.log(`      ✅ System: ${systemTwo.name}`);

    // Create Framework 2
    const framework2 = await prisma.framework.create({
      data: {
        name: 'Framework 2',
        code: `${region.code}-FW2`,
        color: '#f97316', // Orange
        icon: 'Network',
        description: `Framework 2 for ${region.name}`,
        capabilityCentreId: cc.id,
      }
    });
    console.log(`   ✅ Created Framework: ${framework2.name}`);

    // Create Product 2 (container for systems)
    const product2 = await prisma.product.create({
      data: {
        name: `${region.name} Product 2`,
        description: `Product 2 for ${region.name}`,
        type: 'INFRASTRUCTURE',
        criticality: 'HIGH',
        userId: demoUser.id,
        frameworkId: framework2.id,
      }
    });
    console.log(`   ✅ Created Product: ${product2.name}`);

    // Create Systems for Product 2
    const systemThree = await prisma.system.create({
      data: {
        name: 'System Three',
        description: 'Primary system for Product 2',
        criticality: 'HIGH',
        environment: 'PRODUCTION',
        dataClassification: 'INTERNAL',
        productId: product2.id,
      }
    });
    console.log(`      ✅ System: ${systemThree.name}`);

    const systemFour = await prisma.system.create({
      data: {
        name: 'System Four',
        description: 'Secondary system for Product 2',
        criticality: 'HIGH',
        environment: 'PRODUCTION',
        dataClassification: 'INTERNAL',
        productId: product2.id,
      }
    });
    console.log(`      ✅ System: ${systemFour.name}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Regional hierarchy created successfully!');
  console.log('\nSummary:');
  console.log('  - 4 Capability Centres (Ireland, England, Scotland, Wales)');
  console.log('  - 8 Frameworks (Framework 1 + Framework 2 per CC)');
  console.log('  - 8 Products (Product 1 + Product 2 per CC)');
  console.log('  - 16 Systems (System One, System Two, System Three, System Four per CC)');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

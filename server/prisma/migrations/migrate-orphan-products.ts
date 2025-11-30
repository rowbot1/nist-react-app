/**
 * Migration: Require Framework for Products
 *
 * This script:
 * 1. Creates an "Unassigned" Framework for each Capability Centre
 * 2. Moves orphaned products (no frameworkId) to the appropriate Unassigned framework
 *
 * Run with: npx ts-node prisma/migrations/migrate-orphan-products.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateOrphanProducts() {
  console.log('Starting orphan product migration...\n');

  // Step 1: Find all capability centres
  const capabilityCentres = await prisma.capabilityCentre.findMany({
    include: {
      frameworks: true,
    },
  });

  console.log(`Found ${capabilityCentres.length} capability centres\n`);

  // Step 2: For each CC, ensure an "Unassigned" framework exists
  for (const cc of capabilityCentres) {
    const existingUnassigned = cc.frameworks.find(f => f.isUnassigned);

    if (!existingUnassigned) {
      console.log(`Creating "Unassigned" framework for CC: ${cc.name}`);
      await prisma.framework.create({
        data: {
          name: 'Unassigned',
          description: 'Products not yet assigned to a specific framework',
          code: 'UNASSIGNED',
          color: '#9e9e9e', // Grey
          isUnassigned: true,
          capabilityCentreId: cc.id,
        },
      });
    } else {
      console.log(`"Unassigned" framework already exists for CC: ${cc.name}`);
    }
  }

  // Step 3: Find all orphaned products (no frameworkId)
  const orphanedProducts = await prisma.product.findMany({
    where: {
      frameworkId: null,
    },
    include: {
      user: {
        include: {
          capabilityCentres: true,
        },
      },
    },
  });

  console.log(`\nFound ${orphanedProducts.length} orphaned products\n`);

  // Step 4: Move each orphaned product to an appropriate Unassigned framework
  for (const product of orphanedProducts) {
    // Find the user's first capability centre (or create one if they have none)
    let targetCC = product.user.capabilityCentres[0];

    if (!targetCC) {
      console.log(`User ${product.user.email} has no capability centre. Creating default...`);
      targetCC = await prisma.capabilityCentre.create({
        data: {
          name: 'Default',
          description: 'Auto-created capability centre',
          code: 'DEFAULT',
          color: '#2196f3',
          userId: product.user.id,
        },
      });

      // Also create Unassigned framework for this new CC
      await prisma.framework.create({
        data: {
          name: 'Unassigned',
          description: 'Products not yet assigned to a specific framework',
          code: 'UNASSIGNED',
          color: '#9e9e9e',
          isUnassigned: true,
          capabilityCentreId: targetCC.id,
        },
      });
    }

    // Find the Unassigned framework for this CC
    const unassignedFramework = await prisma.framework.findFirst({
      where: {
        capabilityCentreId: targetCC.id,
        isUnassigned: true,
      },
    });

    if (unassignedFramework) {
      console.log(`Moving product "${product.name}" to Unassigned framework in CC "${targetCC.name}"`);
      await prisma.product.update({
        where: { id: product.id },
        data: { frameworkId: unassignedFramework.id },
      });
    } else {
      console.error(`ERROR: No Unassigned framework found for CC "${targetCC.name}"`);
    }
  }

  console.log('\nMigration complete!');

  // Summary
  const remainingOrphans = await prisma.product.count({
    where: { frameworkId: null },
  });

  console.log(`\nSummary:`);
  console.log(`- Orphaned products remaining: ${remainingOrphans}`);

  if (remainingOrphans === 0) {
    console.log('\n✓ All products now have a framework assigned');
    console.log('You can now safely make frameworkId required in the schema');
  } else {
    console.log('\n⚠ Some products still have no framework. Please investigate.');
  }
}

migrateOrphanProducts()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

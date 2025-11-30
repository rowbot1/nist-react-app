import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

interface CSFElement {
  doc_identifier: string;
  element_identifier: string;
  element_type: string;
  text: string;
  title: string;
}

interface CSFDataStructure {
  response: {
    requestType: number;
    elements: {
      documents: any[];
      elements: CSFElement[];
    };
  };
}

interface NIST80053Control {
  id: string;
  family: string;
  title: string;
  description: string;
  priority: string;
}

interface NIST80053DataStructure {
  controls: NIST80053Control[];
  metadata: {
    source: string;
    total_controls: number;
    version: string;
  };
}

interface CSFMapping {
  csfControlId: string;
  nist80053Id: string;
  controlFamily: string;
  priority: string;
}

interface MappingsDataStructure {
  mappings: CSFMapping[];
  metadata: {
    source: string;
    total_mappings: number;
    unique_csf_controls: number;
    version: string;
  };
}

async function main() {
  console.log('🌱 Seeding database with complete NIST CSF 2.0 and 800-53 data...');
  console.log('=' .repeat(70));

  // ========================================================================
  // LOAD DATA FILES
  // ========================================================================

  console.log('\n📂 Loading data files...');

  const csfDataPath = path.join(__dirname, '../data/csf2_clean.json');
  const nist80053DataPath = path.join(__dirname, '../data/nist-800-53.json');
  const mappingsDataPath = path.join(__dirname, '../data/csf-800-53-mappings.json');

  let csfData: CSFDataStructure;
  let nist80053Data: NIST80053DataStructure;
  let mappingsData: MappingsDataStructure;

  try {
    const csfRawData = fs.readFileSync(csfDataPath, 'utf8');
    csfData = JSON.parse(csfRawData);
    console.log('✅ Loaded CSF 2.0 data');
  } catch (error) {
    console.error('❌ Could not load CSF data file:', error);
    throw new Error('CSF data file is required for seeding');
  }

  try {
    const nist80053RawData = fs.readFileSync(nist80053DataPath, 'utf8');
    nist80053Data = JSON.parse(nist80053RawData);
    console.log('✅ Loaded NIST 800-53 controls');
  } catch (error) {
    console.error('❌ Could not load NIST 800-53 data file:', error);
    throw new Error('NIST 800-53 data file is required for seeding');
  }

  try {
    const mappingsRawData = fs.readFileSync(mappingsDataPath, 'utf8');
    mappingsData = JSON.parse(mappingsRawData);
    console.log('✅ Loaded CSF-to-800-53 mappings');
  } catch (error) {
    console.error('❌ Could not load mappings data file:', error);
    throw new Error('Mappings data file is required for seeding');
  }

  // ========================================================================
  // CLEAR EXISTING DATA
  // ========================================================================

  console.log('\n🧹 Clearing existing data...');

  await prisma.complianceAssessment.deleteMany();
  await prisma.cSFBaseline.deleteMany();
  await prisma.system.deleteMany();
  await prisma.product.deleteMany();
  await prisma.framework.deleteMany();
  await prisma.capabilityCentre.deleteMany();
  await prisma.user.deleteMany();
  await prisma.nIST80053Mapping.deleteMany();
  await prisma.cSFControl.deleteMany();

  console.log('✅ Database cleared');

  // ========================================================================
  // PROCESS AND LOAD CSF 2.0 CONTROLS
  // ========================================================================

  console.log('\n📋 Processing CSF 2.0 controls...');

  const elements = csfData.response.elements.elements;

  // Extract all subcategories (note: there are duplicates, we need to deduplicate)
  const allSubcategories = elements.filter(e => e.element_type === 'subcategory');
  console.log(`   Found ${allSubcategories.length} subcategory elements (including duplicates)`);

  // Deduplicate subcategories - prefer entries with text content
  const subcategoryMap: { [key: string]: CSFElement } = {};
  allSubcategories.forEach(sub => {
    const id = sub.element_identifier;
    const hasText = sub.text && sub.text.trim();

    // Keep this entry if we don't have one yet, or if this one has text and the existing one doesn't
    if (!subcategoryMap[id] || (hasText && !subcategoryMap[id].text)) {
      subcategoryMap[id] = sub;
    }
  });

  const subcategories = Object.values(subcategoryMap);
  console.log(`   Deduplicated to ${subcategories.length} unique subcategories`);

  // Extract implementation examples and group by subcategory
  const implementationExamples = elements.filter(e => e.element_type === 'implementation_example');
  console.log(`   Found ${implementationExamples.length} implementation examples`);

  // Group implementation examples by subcategory
  const examplesBySubcategory: { [key: string]: any[] } = {};
  implementationExamples.forEach(example => {
    // Implementation example IDs are like "GV.OC-01.001" where parent is "GV.OC-01"
    const subcategoryId = example.element_identifier.split('.').slice(0, 2).join('.');
    if (!examplesBySubcategory[subcategoryId]) {
      examplesBySubcategory[subcategoryId] = [];
    }
    examplesBySubcategory[subcategoryId].push({
      id: example.element_identifier,
      text: example.text,
      title: example.title
    });
  });

  // Extract categories for metadata
  const categories = elements.filter(e => e.element_type === 'category');
  const categoryMap: { [key: string]: CSFElement } = {};
  categories.forEach(cat => {
    categoryMap[cat.element_identifier] = cat;
  });

  console.log('\n📝 Seeding CSF controls...');
  let controlsCreated = 0;
  let controlsFailed = 0;

  for (const subcategory of subcategories) {
    try {
      const subcategoryId = subcategory.element_identifier;
      const functionId = subcategoryId.split('.')[0];
      const categoryId = subcategoryId.split('.').slice(0, 2).join('.');

      // Get category title for better control titles
      const category = categoryMap[categoryId];
      const categoryTitle = category ? category.title : '';

      // Get implementation examples for this subcategory
      const examples = examplesBySubcategory[subcategoryId] || [];

      // Skip if no text (shouldn't happen after deduplication, but safety check)
      if (!subcategory.text || !subcategory.text.trim()) {
        console.warn(`   ⚠️  Skipping ${subcategoryId}: no text content`);
        continue;
      }

      await prisma.cSFControl.create({
        data: {
          id: subcategoryId,
          functionId: functionId,
          categoryId: categoryId,
          title: categoryTitle || subcategory.title || 'Control',
          text: subcategory.text,
          implementationExamples: JSON.stringify(examples),
          informativeReferences: JSON.stringify([])
        }
      });

      controlsCreated++;

      if (controlsCreated % 50 === 0) {
        console.log(`   Progress: ${controlsCreated}/${subcategories.length} controls created`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to create control ${subcategory.element_identifier}:`, error);
      controlsFailed++;
    }
  }

  console.log(`✅ Created ${controlsCreated} CSF controls`);
  if (controlsFailed > 0) {
    console.log(`   ⚠️  Failed to create ${controlsFailed} controls`);
  }

  // ========================================================================
  // LOAD NIST 800-53 MAPPINGS
  // ========================================================================

  console.log('\n🔗 Seeding NIST 800-53 mappings...');

  let mappingsCreated = 0;
  let mappingsFailed = 0;

  for (const mapping of mappingsData.mappings) {
    try {
      await prisma.nIST80053Mapping.create({
        data: {
          csfControlId: mapping.csfControlId,
          nist80053Id: mapping.nist80053Id,
          controlFamily: mapping.controlFamily,
          priority: mapping.priority
        }
      });
      mappingsCreated++;

      if (mappingsCreated % 50 === 0) {
        console.log(`   Progress: ${mappingsCreated}/${mappingsData.mappings.length} mappings created`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to create mapping ${mapping.csfControlId} -> ${mapping.nist80053Id}:`, error);
      mappingsFailed++;
    }
  }

  console.log(`✅ Created ${mappingsCreated} NIST 800-53 mappings`);
  if (mappingsFailed > 0) {
    console.log(`   ⚠️  Failed to create ${mappingsFailed} mappings`);
  }

  // ========================================================================
  // CREATE DEMO USER AND SAMPLE DATA
  // ========================================================================

  const demoEmail = process.env.DEMO_EMAIL || 'demo@posture.app';
  const demoPassword = process.env.DEMO_PASSWORD || 'demo123';
  let demoUser;
  if (process.env.NODE_ENV === 'production') {
    console.log('⏭️ Skipping demo user creation in production environment');
    // Create a placeholder admin to own seeded data without exposing credentials
    const seedOwnerPassword = await bcrypt.hash(randomUUID(), 12);
    demoUser = await prisma.user.create({
      data: {
        email: `seed-owner+${randomUUID()}@example.com`,
        name: 'Seed Owner',
        password: seedOwnerPassword,
        role: 'ADMIN'
      }
    });
  } else {
    console.log('\n👤 Creating demo user...');
    demoUser = await prisma.user.upsert({
      where: { email: demoEmail },
      update: {},
      create: {
        email: demoEmail,
        name: 'Demo User',
        password: await bcrypt.hash(demoPassword, 12),
        role: 'USER'
      }
    });
    console.log('✅ Demo user created');
  }

  // ========================================================================
  // CREATE CAPABILITY CENTRES
  // ========================================================================

  console.log('\n🏛️ Creating capability centres...');

  const capabilityCentres = [
    {
      name: 'Cloud Operations',
      code: 'CO',
      description: 'Cloud infrastructure and platform services',
      color: '#58a6ff',
      icon: 'Cloud',
      userId: demoUser.id
    },
    {
      name: 'Digital Services',
      code: 'DS',
      description: 'Customer-facing digital products and services',
      color: '#3fb950',
      icon: 'Devices',
      userId: demoUser.id
    },
    {
      name: 'Enterprise Data',
      code: 'ED',
      description: 'Data management and analytics platforms',
      color: '#a371f7',
      icon: 'Storage',
      userId: demoUser.id
    }
  ];

  const createdCapabilityCentres = [];
  for (const cc of capabilityCentres) {
    const created = await prisma.capabilityCentre.create({ data: cc });
    createdCapabilityCentres.push(created);
  }

  console.log(`✅ Created ${createdCapabilityCentres.length} capability centres`);

  // ========================================================================
  // CREATE FRAMEWORKS (within Capability Centres)
  // ========================================================================

  console.log('\n📁 Creating frameworks...');

  const frameworks = [
    // Cloud Operations frameworks
    {
      name: 'Infrastructure Services',
      code: 'IS',
      description: 'Core infrastructure and compute services',
      color: '#58a6ff',
      icon: 'Storage',
      capabilityCentreId: createdCapabilityCentres[0].id // Cloud Operations
    },
    {
      name: 'Platform Services',
      code: 'PS',
      description: 'Platform-as-a-Service offerings',
      color: '#79c0ff',
      icon: 'Cloud',
      capabilityCentreId: createdCapabilityCentres[0].id // Cloud Operations
    },
    // Digital Services frameworks
    {
      name: 'E-Commerce',
      code: 'EC',
      description: 'Online retail and commerce platforms',
      color: '#3fb950',
      icon: 'ShoppingCart',
      capabilityCentreId: createdCapabilityCentres[1].id // Digital Services
    },
    {
      name: 'Mobile Applications',
      code: 'MA',
      description: 'Mobile app portfolio',
      color: '#56d364',
      icon: 'PhoneIphone',
      capabilityCentreId: createdCapabilityCentres[1].id // Digital Services
    },
    // Enterprise Data frameworks
    {
      name: 'Data Warehousing',
      code: 'DW',
      description: 'Enterprise data warehouse and analytics',
      color: '#a371f7',
      icon: 'Analytics',
      capabilityCentreId: createdCapabilityCentres[2].id // Enterprise Data
    }
  ];

  const createdFrameworks = [];
  for (const fw of frameworks) {
    const created = await prisma.framework.create({ data: fw });
    createdFrameworks.push(created);
  }

  console.log(`✅ Created ${createdFrameworks.length} frameworks`);

  // ========================================================================
  // CREATE PRODUCTS (within Frameworks)
  // ========================================================================

  console.log('\n🏢 Creating products...');

  const products = [
    // E-Commerce framework products
    {
      name: 'E-Commerce Platform',
      description: 'Main customer-facing e-commerce web application with payment processing',
      type: 'WEB_APPLICATION',
      criticality: 'HIGH',
      userId: demoUser.id,
      frameworkId: createdFrameworks[2].id // E-Commerce
    },
    {
      name: 'Order Management System',
      description: 'Backend order processing and fulfillment system',
      type: 'WEB_APPLICATION',
      criticality: 'HIGH',
      userId: demoUser.id,
      frameworkId: createdFrameworks[2].id // E-Commerce
    },
    // Mobile Applications framework products
    {
      name: 'Customer Mobile App',
      description: 'iOS and Android customer-facing mobile application',
      type: 'MOBILE_APPLICATION',
      criticality: 'MEDIUM',
      userId: demoUser.id,
      frameworkId: createdFrameworks[3].id // Mobile Applications
    },
    // Infrastructure Services framework products
    {
      name: 'Kubernetes Platform',
      description: 'Container orchestration platform',
      type: 'INFRASTRUCTURE',
      criticality: 'CRITICAL',
      userId: demoUser.id,
      frameworkId: createdFrameworks[0].id // Infrastructure Services
    },
    // Data Warehousing framework products
    {
      name: 'Analytics Platform',
      description: 'Business intelligence and reporting platform',
      type: 'DATABASE',
      criticality: 'MEDIUM',
      userId: demoUser.id,
      frameworkId: createdFrameworks[4].id // Data Warehousing
    }
  ];

  const createdProducts = [];
  for (const product of products) {
    const created = await prisma.product.create({ data: product });
    createdProducts.push(created);
  }

  // Use first product (E-Commerce Platform) for baseline and assessments
  const sampleProduct = createdProducts[0];

  console.log(`✅ Created ${createdProducts.length} products`);

  // ========================================================================
  // CREATE SAMPLE SYSTEMS
  // ========================================================================

  console.log('\n💻 Creating sample systems...');

  const systems = [
    {
      name: 'Web Application Server',
      description: 'Frontend web server hosting the main application (React/Node.js)',
      criticality: 'HIGH' as const,
      environment: 'PRODUCTION' as const,
      dataClassification: 'CONFIDENTIAL' as const,
      productId: sampleProduct.id
    },
    {
      name: 'Database Server',
      description: 'Primary database storing customer and transaction data (PostgreSQL)',
      criticality: 'CRITICAL' as const,
      environment: 'PRODUCTION' as const,
      dataClassification: 'RESTRICTED' as const,
      productId: sampleProduct.id
    },
    {
      name: 'API Gateway',
      description: 'API gateway for external integrations and third-party services',
      criticality: 'HIGH' as const,
      environment: 'PRODUCTION' as const,
      dataClassification: 'INTERNAL' as const,
      productId: sampleProduct.id
    },
    {
      name: 'Payment Processing Service',
      description: 'Microservice handling payment transactions (PCI-DSS scope)',
      criticality: 'CRITICAL' as const,
      environment: 'PRODUCTION' as const,
      dataClassification: 'RESTRICTED' as const,
      productId: sampleProduct.id
    }
  ];

  const createdSystems = [];
  for (const system of systems) {
    const createdSystem = await prisma.system.create({ data: system });
    createdSystems.push(createdSystem);
  }

  console.log(`✅ Created ${createdSystems.length} sample systems`);

  // ========================================================================
  // CREATE COMPREHENSIVE CSF BASELINE
  // ========================================================================

  console.log('\n🎯 Creating comprehensive CSF baseline...');

  // Select a comprehensive set of baseline controls across all functions
  const baselineControlIds = [
    // GOVERN (GV) - 15 critical controls
    'GV.OC-01', 'GV.OC-02', 'GV.OC-03',
    'GV.RM-01', 'GV.RM-03', 'GV.RM-06',
    'GV.RR-01', 'GV.RR-02', 'GV.RR-03',
    'GV.PO-01', 'GV.OV-01', 'GV.OV-02',
    'GV.SC-01', 'GV.SC-02', 'GV.SC-06',

    // IDENTIFY (ID) - 15 critical controls
    'ID.AM-01', 'ID.AM-02', 'ID.AM-03', 'ID.AM-04',
    'ID.RA-01', 'ID.RA-02', 'ID.RA-03', 'ID.RA-05',
    'ID.BE-01', 'ID.BE-02', 'ID.BE-03',
    'ID.GV-01', 'ID.GV-02', 'ID.GV-03', 'ID.GV-04',

    // PROTECT (PR) - 20 critical controls
    'PR.AA-01', 'PR.AA-02', 'PR.AA-03', 'PR.AA-04',
    'PR.AC-01', 'PR.AC-02', 'PR.AC-03', 'PR.AC-04', 'PR.AC-05',
    'PR.AT-01', 'PR.AT-02',
    'PR.DS-01', 'PR.DS-02', 'PR.DS-04', 'PR.DS-08',
    'PR.IP-01', 'PR.IP-02', 'PR.IP-03', 'PR.IP-12',
    'PR.PT-01',

    // DETECT (DE) - 10 critical controls
    'DE.AE-01', 'DE.AE-02', 'DE.AE-03',
    'DE.CM-01', 'DE.CM-02', 'DE.CM-03', 'DE.CM-04',
    'DE.DP-01', 'DE.DP-04', 'DE.DP-05',

    // RESPOND (RS) - 10 critical controls
    'RS.RP-01',
    'RS.CO-01', 'RS.CO-02', 'RS.CO-03',
    'RS.AN-01', 'RS.AN-02', 'RS.AN-03',
    'RS.MI-01', 'RS.MI-02',
    'RS.IM-01',

    // RECOVER (RC) - 8 critical controls
    'RC.RP-01', 'RC.RP-02', 'RC.RP-03',
    'RC.IM-01', 'RC.IM-02',
    'RC.CO-01', 'RC.CO-02', 'RC.CO-03'
  ];

  let baselineCreated = 0;
  let baselineFailed = 0;

  for (const controlId of baselineControlIds) {
    try {
      // Determine category level based on control criticality
      const isCritical = ['GV.RM', 'ID.AM', 'ID.RA', 'PR.AA', 'PR.AC', 'PR.DS', 'DE.CM', 'RS.RP', 'RC.RP'].some(
        prefix => controlId.startsWith(prefix)
      );

      await prisma.cSFBaseline.create({
        data: {
          productId: sampleProduct.id,
          subcategoryId: controlId,
          applicable: true,
          categoryLevel: isCritical ? 'MUST_HAVE' : 'SHOULD_HAVE',
          justification: `Selected as part of comprehensive baseline security controls for ${sampleProduct.name}`
        }
      });
      baselineCreated++;
    } catch (error) {
      console.warn(`   ⚠️  Failed to create baseline for ${controlId}:`, error);
      baselineFailed++;
    }
  }

  console.log(`✅ Created ${baselineCreated} baseline controls`);
  if (baselineFailed > 0) {
    console.log(`   ⚠️  Failed to create ${baselineFailed} baseline controls`);
  }

  // ========================================================================
  // CREATE COMPREHENSIVE SAMPLE ASSESSMENTS
  // ========================================================================

  console.log('\n📊 Creating sample compliance assessments...');

  const statuses = ['COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'NOT_ASSESSED'];
  const assessors = ['Alice Johnson', 'Bob Smith', 'Carol Martinez', 'Demo User'];

  let assessmentsCreated = 0;
  let assessmentsFailed = 0;

  for (const system of createdSystems) {
    for (const controlId of baselineControlIds) {
      // Weight distribution: more compliant for high-criticality systems
      let statusWeights;
      if (system.criticality === 'CRITICAL') {
        statusWeights = [0.4, 0.3, 0.2, 0.1]; // 40% compliant, 30% partial, 20% non-compliant, 10% not assessed
      } else if (system.criticality === 'HIGH') {
        statusWeights = [0.3, 0.4, 0.2, 0.1]; // 30% compliant, 40% partial, 20% non-compliant, 10% not assessed
      } else {
        statusWeights = [0.25, 0.25, 0.25, 0.25]; // Equal distribution
      }

      const random = Math.random();
      let status;
      if (random < statusWeights[0]) {
        status = 'COMPLIANT';
      } else if (random < statusWeights[0] + statusWeights[1]) {
        status = 'PARTIALLY_COMPLIANT';
      } else if (random < statusWeights[0] + statusWeights[1] + statusWeights[2]) {
        status = 'NON_COMPLIANT';
      } else {
        status = 'NOT_ASSESSED';
      }

      const assessor = assessors[Math.floor(Math.random() * assessors.length)];
      const daysAgo = Math.floor(Math.random() * 90); // Random date within last 90 days
      const assessedDate = new Date();
      assessedDate.setDate(assessedDate.getDate() - daysAgo);

      let details = '';
      let evidence: string[] = [];
      let remediationPlan = null;

      if (status === 'COMPLIANT') {
        details = `${controlId} is fully implemented and operational on ${system.name}. All requirements met.`;
        evidence = ['Policy document reviewed', 'Configuration verified', 'Logs analyzed', 'Testing completed'];
      } else if (status === 'PARTIALLY_COMPLIANT') {
        details = `${controlId} is partially implemented on ${system.name}. Some gaps identified.`;
        evidence = ['Policy document reviewed', 'Partial implementation verified'];
        remediationPlan = 'Complete remaining control implementation within 60 days. Assign owner and track progress.';
      } else if (status === 'NON_COMPLIANT') {
        details = `${controlId} is not implemented on ${system.name}. Significant gaps exist.`;
        evidence = ['Gap analysis completed'];
        remediationPlan = 'Implement missing controls within 30 days. High priority remediation required.';
      } else {
        details = '';
        evidence = [];
      }

      try {
        await prisma.complianceAssessment.create({
          data: {
            systemId: system.id,
            subcategoryId: controlId,
            status: status as any,
            details: details,
            assessor: status === 'NOT_ASSESSED' ? null : assessor,
            assessedDate: status === 'NOT_ASSESSED' ? null : assessedDate,
            legacyEvidence: evidence.length > 0 ? JSON.stringify(evidence) : null,
            remediationPlan: remediationPlan
          }
        });
        assessmentsCreated++;
      } catch (error) {
        console.warn(`   ⚠️  Failed to create assessment for ${controlId} on ${system.id}:`, error);
        assessmentsFailed++;
      }
    }
  }

  console.log(`✅ Created ${assessmentsCreated} compliance assessments`);
  if (assessmentsFailed > 0) {
    console.log(`   ⚠️  Failed to create ${assessmentsFailed} assessments`);
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================

  console.log('\n' + '='.repeat(70));
  console.log('🎉 Database seeding completed successfully!');
  console.log('='.repeat(70));
  console.log('\n📊 Summary:');
  console.log(`   ✓ ${controlsCreated} CSF 2.0 controls (subcategories)`);
  console.log(`   ✓ ${mappingsCreated} CSF-to-800-53 mappings`);
  console.log(`   ✓ 1 demo user (demo@nistmapper.com / demo123)`);
  console.log(`   ✓ ${createdCapabilityCentres.length} capability centres`);
  console.log(`   ✓ ${createdFrameworks.length} frameworks`);
  console.log(`   ✓ ${createdProducts.length} products`);
  console.log(`   ✓ ${createdSystems.length} sample systems`);
  console.log(`   ✓ ${baselineCreated} baseline controls`);
  console.log(`   ✓ ${assessmentsCreated} compliance assessments`);
  console.log('\n📁 Organizational Hierarchy:');
  for (const cc of createdCapabilityCentres) {
    console.log(`   🏛️ ${cc.name} (${cc.code})`);
    const fws = createdFrameworks.filter(fw => fw.capabilityCentreId === cc.id);
    for (const fw of fws) {
      console.log(`      📁 ${fw.name} (${fw.code})`);
      const prods = createdProducts.filter(p => p.frameworkId === fw.id);
      for (const prod of prods) {
        console.log(`         🏢 ${prod.name}`);
      }
    }
  }
  console.log('\n🚀 Ready to start the application!');
  console.log('   Run: npm run dev');
  console.log('   Login: demo@nistmapper.com / demo123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('\n❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

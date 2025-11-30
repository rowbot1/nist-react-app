import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding additional demo products, systems, and assessments...');
  console.log('=' .repeat(70));

  // Get demo user
  const demoUser = await prisma.user.findUnique({
    where: { email: 'demo@nistmapper.com' }
  });

  if (!demoUser) {
    console.log('❌ Demo user not found. Please run the main seed first: npx prisma db seed');
    process.exit(1);
  }

  console.log(`✅ Found demo user: ${demoUser.email}`);

  // Get all available CSF controls for baselines
  const csfControls = await prisma.cSFControl.findMany({
    select: { id: true }
  });

  if (csfControls.length === 0) {
    console.log('❌ No CSF controls found. Please run the main seed first: npx prisma db seed');
    process.exit(1);
  }

  console.log(`✅ Found ${csfControls.length} CSF controls`);

  // ========================================================================
  // PRODUCT 2: Healthcare Claims Processing System
  // ========================================================================

  console.log('\n🏥 Creating Healthcare Claims Processing System...');

  const healthcareProduct = await prisma.product.create({
    data: {
      name: 'Healthcare Claims Processing',
      description: 'HIPAA-compliant claims processing system handling PHI for insurance partners. Requires strict access controls and audit logging.',
      type: 'API_SERVICE',
      criticality: 'CRITICAL',
      userId: demoUser.id
    }
  });

  const healthcareSystems = [
    {
      name: 'Claims API Gateway',
      description: 'RESTful API gateway for claims submission and status tracking',
      criticality: 'CRITICAL',
      environment: 'PRODUCTION',
      dataClassification: 'RESTRICTED',
      productId: healthcareProduct.id
    },
    {
      name: 'Claims Database Cluster',
      description: 'HA PostgreSQL cluster storing claims, member, and provider data',
      criticality: 'CRITICAL',
      environment: 'PRODUCTION',
      dataClassification: 'RESTRICTED',
      productId: healthcareProduct.id
    },
    {
      name: 'EDI Processing Engine',
      description: 'ANSI X12 837/835 EDI transaction processor',
      criticality: 'HIGH',
      environment: 'PRODUCTION',
      dataClassification: 'CONFIDENTIAL',
      productId: healthcareProduct.id
    },
    {
      name: 'Claims Admin Portal',
      description: 'Internal web portal for claims adjudication and management',
      criticality: 'HIGH',
      environment: 'PRODUCTION',
      dataClassification: 'CONFIDENTIAL',
      productId: healthcareProduct.id
    },
    {
      name: 'Audit & Compliance Logger',
      description: 'HIPAA audit logging service with tamper-evident storage',
      criticality: 'HIGH',
      environment: 'PRODUCTION',
      dataClassification: 'INTERNAL',
      productId: healthcareProduct.id
    }
  ];

  const createdHealthcareSystems = [];
  for (const system of healthcareSystems) {
    const created = await prisma.system.create({ data: system });
    createdHealthcareSystems.push(created);
  }

  console.log(`✅ Created ${createdHealthcareSystems.length} healthcare systems`);

  // Healthcare baseline - focus on privacy controls (HIPAA-aligned)
  const healthcareBaselineControls = [
    // GOVERN - Strong governance for healthcare
    'GV.OC-01', 'GV.OC-02', 'GV.OC-03', 'GV.OC-04',
    'GV.RM-01', 'GV.RM-02', 'GV.RM-03', 'GV.RM-04', 'GV.RM-05', 'GV.RM-06', 'GV.RM-07',
    'GV.RR-01', 'GV.RR-02', 'GV.RR-03', 'GV.RR-04',
    'GV.PO-01', 'GV.PO-02',
    'GV.OV-01', 'GV.OV-02', 'GV.OV-03',
    'GV.SC-01', 'GV.SC-02', 'GV.SC-03', 'GV.SC-04', 'GV.SC-05', 'GV.SC-06', 'GV.SC-07',

    // IDENTIFY - Comprehensive asset and risk management
    'ID.AM-01', 'ID.AM-02', 'ID.AM-03', 'ID.AM-04', 'ID.AM-05', 'ID.AM-07', 'ID.AM-08',
    'ID.RA-01', 'ID.RA-02', 'ID.RA-03', 'ID.RA-04', 'ID.RA-05', 'ID.RA-06', 'ID.RA-07',
    'ID.IM-01', 'ID.IM-02', 'ID.IM-03', 'ID.IM-04',

    // PROTECT - Heavy on access control and data protection
    'PR.AA-01', 'PR.AA-02', 'PR.AA-03', 'PR.AA-04', 'PR.AA-05', 'PR.AA-06',
    'PR.DS-01', 'PR.DS-02', 'PR.DS-10', 'PR.DS-11',
    'PR.PS-01', 'PR.PS-02', 'PR.PS-03', 'PR.PS-04', 'PR.PS-05', 'PR.PS-06',
    'PR.IR-01', 'PR.IR-02', 'PR.IR-03', 'PR.IR-04',

    // DETECT - Comprehensive monitoring
    'DE.CM-01', 'DE.CM-02', 'DE.CM-03', 'DE.CM-06', 'DE.CM-09',
    'DE.AE-02', 'DE.AE-03', 'DE.AE-04', 'DE.AE-06', 'DE.AE-07', 'DE.AE-08',

    // RESPOND - Full incident response
    'RS.MA-01', 'RS.MA-02', 'RS.MA-03', 'RS.MA-04', 'RS.MA-05',
    'RS.AN-03', 'RS.AN-06', 'RS.AN-07', 'RS.AN-08',
    'RS.CO-02', 'RS.CO-03',
    'RS.MI-01', 'RS.MI-02',

    // RECOVER - Business continuity
    'RC.RP-01', 'RC.RP-02', 'RC.RP-03', 'RC.RP-04', 'RC.RP-05', 'RC.RP-06',
    'RC.CO-03', 'RC.CO-04'
  ];

  // Filter to only existing controls
  const validHealthcareControls = healthcareBaselineControls.filter(
    id => csfControls.some(c => c.id === id)
  );

  for (const controlId of validHealthcareControls) {
    try {
      await prisma.cSFBaseline.create({
        data: {
          productId: healthcareProduct.id,
          subcategoryId: controlId,
          applicable: true,
          categoryLevel: controlId.includes('AA') || controlId.includes('DS') || controlId.includes('RM')
            ? 'MUST_HAVE' : 'SHOULD_HAVE',
          justification: `HIPAA compliance requirement for ${healthcareProduct.name}`
        }
      });
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log(`✅ Created ${validHealthcareControls.length} healthcare baseline controls`);

  // Create assessments for healthcare - higher compliance due to HIPAA requirements
  for (const system of createdHealthcareSystems) {
    for (const controlId of validHealthcareControls) {
      // Healthcare has higher compliance rates
      const random = Math.random();
      let status;
      if (random < 0.55) status = 'COMPLIANT';
      else if (random < 0.85) status = 'PARTIALLY_COMPLIANT';
      else if (random < 0.95) status = 'NON_COMPLIANT';
      else status = 'NOT_ASSESSED';

      const assessors = ['Dr. Sarah Chen (HIPAA Officer)', 'Mark Thompson (InfoSec)', 'Lisa Patel (Compliance)'];
      const assessor = assessors[Math.floor(Math.random() * assessors.length)];

      const daysAgo = Math.floor(Math.random() * 60);
      const assessedDate = new Date();
      assessedDate.setDate(assessedDate.getDate() - daysAgo);

      let details = '';
      let evidence: string[] = [];
      let remediationPlan = null;

      if (status === 'COMPLIANT') {
        details = `Control ${controlId} fully implemented with HIPAA compliance verification. Annual audit passed.`;
        evidence = ['HIPAA assessment report', 'Configuration compliance scan', 'Access review log', 'Training records'];
      } else if (status === 'PARTIALLY_COMPLIANT') {
        details = `Control ${controlId} partially implemented. Additional controls needed for full HIPAA compliance.`;
        evidence = ['Gap analysis report', 'Partial implementation evidence'];
        remediationPlan = 'Complete HIPAA remediation items within 30 days per compliance timeline.';
      } else if (status === 'NON_COMPLIANT') {
        details = `CRITICAL: Control ${controlId} not implemented. HIPAA compliance risk identified.`;
        evidence = ['Risk assessment finding'];
        remediationPlan = 'URGENT: Implement control within 14 days. Escalate to HIPAA Security Officer.';
      }

      try {
        await prisma.complianceAssessment.create({
          data: {
            systemId: system.id,
            subcategoryId: controlId,
            status,
            details,
            assessor: status === 'NOT_ASSESSED' ? null : assessor,
            assessedDate: status === 'NOT_ASSESSED' ? null : assessedDate,
            legacyEvidence: evidence.length > 0 ? JSON.stringify(evidence) : null,
            remediationPlan
          }
        });
      } catch (e) {
        // Skip duplicates
      }
    }
  }

  console.log(`✅ Created healthcare assessments`);

  // ========================================================================
  // PRODUCT 3: Internal Corporate Tools Suite
  // ========================================================================

  console.log('\n🏢 Creating Internal Corporate Tools Suite...');

  const corporateProduct = await prisma.product.create({
    data: {
      name: 'Internal Corporate Tools',
      description: 'Suite of internal applications including HR portal, expense management, and document collaboration. Lower criticality but broad employee access.',
      type: 'WEB_APPLICATION',
      criticality: 'MEDIUM',
      userId: demoUser.id
    }
  });

  const corporateSystems = [
    {
      name: 'HR Portal',
      description: 'Employee self-service portal for PTO, benefits, and performance reviews',
      criticality: 'MEDIUM',
      environment: 'PRODUCTION',
      dataClassification: 'CONFIDENTIAL',
      productId: corporateProduct.id
    },
    {
      name: 'Expense Management',
      description: 'Travel and expense reimbursement system',
      criticality: 'MEDIUM',
      environment: 'PRODUCTION',
      dataClassification: 'INTERNAL',
      productId: corporateProduct.id
    },
    {
      name: 'Document Collaboration',
      description: 'Internal wiki and document sharing platform',
      criticality: 'LOW',
      environment: 'PRODUCTION',
      dataClassification: 'INTERNAL',
      productId: corporateProduct.id
    }
  ];

  const createdCorporateSystems = [];
  for (const system of corporateSystems) {
    const created = await prisma.system.create({ data: system });
    createdCorporateSystems.push(created);
  }

  console.log(`✅ Created ${createdCorporateSystems.length} corporate systems`);

  // Corporate baseline - lighter baseline for internal tools
  const corporateBaselineControls = [
    // GOVERN - Basic governance
    'GV.OC-01', 'GV.OC-02',
    'GV.RM-01', 'GV.RM-03',
    'GV.RR-01', 'GV.RR-02',
    'GV.PO-01',
    'GV.OV-01',
    'GV.SC-01', 'GV.SC-02',

    // IDENTIFY - Core identification
    'ID.AM-01', 'ID.AM-02', 'ID.AM-03',
    'ID.RA-01', 'ID.RA-02', 'ID.RA-05',

    // PROTECT - Essential protections
    'PR.AA-01', 'PR.AA-02', 'PR.AA-03',
    'PR.DS-01', 'PR.DS-02',
    'PR.PS-01', 'PR.PS-02',
    'PR.IR-01',

    // DETECT - Basic monitoring
    'DE.CM-01', 'DE.CM-03',
    'DE.AE-02', 'DE.AE-03',

    // RESPOND - Core incident response
    'RS.MA-01', 'RS.MA-02',
    'RS.AN-03',
    'RS.CO-02',

    // RECOVER - Basic recovery
    'RC.RP-01', 'RC.RP-02'
  ];

  // Filter to only existing controls
  const validCorporateControls = corporateBaselineControls.filter(
    id => csfControls.some(c => c.id === id)
  );

  for (const controlId of validCorporateControls) {
    try {
      await prisma.cSFBaseline.create({
        data: {
          productId: corporateProduct.id,
          subcategoryId: controlId,
          applicable: true,
          categoryLevel: controlId.includes('AA') || controlId.includes('DS')
            ? 'MUST_HAVE' : 'SHOULD_HAVE',
          justification: `Corporate security baseline for ${corporateProduct.name}`
        }
      });
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log(`✅ Created ${validCorporateControls.length} corporate baseline controls`);

  // Create assessments for corporate - mixed compliance
  for (const system of createdCorporateSystems) {
    for (const controlId of validCorporateControls) {
      // Corporate has mixed compliance
      const random = Math.random();
      let status;
      if (random < 0.35) status = 'COMPLIANT';
      else if (random < 0.60) status = 'PARTIALLY_COMPLIANT';
      else if (random < 0.80) status = 'NON_COMPLIANT';
      else status = 'NOT_ASSESSED';

      const assessors = ['IT Security Team', 'Internal Audit', 'GRC Analyst'];
      const assessor = assessors[Math.floor(Math.random() * assessors.length)];

      const daysAgo = Math.floor(Math.random() * 120);
      const assessedDate = new Date();
      assessedDate.setDate(assessedDate.getDate() - daysAgo);

      let details = '';
      let evidence: string[] = [];
      let remediationPlan = null;

      if (status === 'COMPLIANT') {
        details = `${controlId} implemented per corporate security standards.`;
        evidence = ['Security scan results', 'Configuration review'];
      } else if (status === 'PARTIALLY_COMPLIANT') {
        details = `${controlId} partially implemented. Enhancement needed.`;
        evidence = ['Current state documentation'];
        remediationPlan = 'Address gaps in next quarterly security sprint.';
      } else if (status === 'NON_COMPLIANT') {
        details = `${controlId} not implemented. Added to security backlog.`;
        evidence = ['Gap documentation'];
        remediationPlan = 'Prioritize in Q2 security roadmap.';
      }

      try {
        await prisma.complianceAssessment.create({
          data: {
            systemId: system.id,
            subcategoryId: controlId,
            status,
            details,
            assessor: status === 'NOT_ASSESSED' ? null : assessor,
            assessedDate: status === 'NOT_ASSESSED' ? null : assessedDate,
            legacyEvidence: evidence.length > 0 ? JSON.stringify(evidence) : null,
            remediationPlan
          }
        });
      } catch (e) {
        // Skip duplicates
      }
    }
  }

  console.log(`✅ Created corporate assessments`);

  // ========================================================================
  // PRODUCT 4: Customer Mobile Banking App
  // ========================================================================

  console.log('\n📱 Creating Customer Mobile Banking App...');

  const bankingProduct = await prisma.product.create({
    data: {
      name: 'Mobile Banking Platform',
      description: 'Customer-facing mobile banking application with payment, transfer, and account management features. PCI-DSS and SOX compliance required.',
      type: 'MOBILE_APPLICATION',
      criticality: 'CRITICAL',
      userId: demoUser.id
    }
  });

  const bankingSystems = [
    {
      name: 'Mobile App Backend',
      description: 'Kubernetes-hosted API services for mobile app',
      criticality: 'CRITICAL',
      environment: 'PRODUCTION',
      dataClassification: 'RESTRICTED',
      productId: bankingProduct.id
    },
    {
      name: 'Authentication Service',
      description: 'OAuth2/OIDC identity provider with MFA support',
      criticality: 'CRITICAL',
      environment: 'PRODUCTION',
      dataClassification: 'RESTRICTED',
      productId: bankingProduct.id
    },
    {
      name: 'Transaction Processing Engine',
      description: 'Real-time transaction processing and fraud detection',
      criticality: 'CRITICAL',
      environment: 'PRODUCTION',
      dataClassification: 'RESTRICTED',
      productId: bankingProduct.id
    },
    {
      name: 'Customer Data Lake',
      description: 'Analytical data store for customer insights (anonymized)',
      criticality: 'HIGH',
      environment: 'PRODUCTION',
      dataClassification: 'CONFIDENTIAL',
      productId: bankingProduct.id
    },
    {
      name: 'Push Notification Service',
      description: 'FCM/APNS notification gateway',
      criticality: 'MEDIUM',
      environment: 'PRODUCTION',
      dataClassification: 'INTERNAL',
      productId: bankingProduct.id
    },
    {
      name: 'Staging Environment',
      description: 'Pre-production testing environment',
      criticality: 'LOW',
      environment: 'STAGING',
      dataClassification: 'INTERNAL',
      productId: bankingProduct.id
    }
  ];

  const createdBankingSystems = [];
  for (const system of bankingSystems) {
    const created = await prisma.system.create({ data: system });
    createdBankingSystems.push(created);
  }

  console.log(`✅ Created ${createdBankingSystems.length} banking systems`);

  // Banking baseline - comprehensive for financial services
  const bankingBaselineControls = [
    // GOVERN - Full governance
    'GV.OC-01', 'GV.OC-02', 'GV.OC-03', 'GV.OC-04', 'GV.OC-05',
    'GV.RM-01', 'GV.RM-02', 'GV.RM-03', 'GV.RM-04', 'GV.RM-05', 'GV.RM-06', 'GV.RM-07',
    'GV.RR-01', 'GV.RR-02', 'GV.RR-03', 'GV.RR-04',
    'GV.PO-01', 'GV.PO-02',
    'GV.OV-01', 'GV.OV-02', 'GV.OV-03',
    'GV.SC-01', 'GV.SC-02', 'GV.SC-03', 'GV.SC-04', 'GV.SC-05', 'GV.SC-06', 'GV.SC-07', 'GV.SC-08', 'GV.SC-09', 'GV.SC-10',

    // IDENTIFY - Comprehensive
    'ID.AM-01', 'ID.AM-02', 'ID.AM-03', 'ID.AM-04', 'ID.AM-05', 'ID.AM-07', 'ID.AM-08',
    'ID.RA-01', 'ID.RA-02', 'ID.RA-03', 'ID.RA-04', 'ID.RA-05', 'ID.RA-06', 'ID.RA-07', 'ID.RA-08', 'ID.RA-09', 'ID.RA-10',
    'ID.IM-01', 'ID.IM-02', 'ID.IM-03', 'ID.IM-04',

    // PROTECT - Maximum protection
    'PR.AA-01', 'PR.AA-02', 'PR.AA-03', 'PR.AA-04', 'PR.AA-05', 'PR.AA-06',
    'PR.DS-01', 'PR.DS-02', 'PR.DS-10', 'PR.DS-11',
    'PR.PS-01', 'PR.PS-02', 'PR.PS-03', 'PR.PS-04', 'PR.PS-05', 'PR.PS-06',
    'PR.IR-01', 'PR.IR-02', 'PR.IR-03', 'PR.IR-04',

    // DETECT - Full monitoring
    'DE.CM-01', 'DE.CM-02', 'DE.CM-03', 'DE.CM-06', 'DE.CM-09',
    'DE.AE-02', 'DE.AE-03', 'DE.AE-04', 'DE.AE-06', 'DE.AE-07', 'DE.AE-08',

    // RESPOND - Complete incident response
    'RS.MA-01', 'RS.MA-02', 'RS.MA-03', 'RS.MA-04', 'RS.MA-05',
    'RS.AN-03', 'RS.AN-06', 'RS.AN-07', 'RS.AN-08',
    'RS.CO-02', 'RS.CO-03',
    'RS.MI-01', 'RS.MI-02',

    // RECOVER - Full recovery
    'RC.RP-01', 'RC.RP-02', 'RC.RP-03', 'RC.RP-04', 'RC.RP-05', 'RC.RP-06',
    'RC.CO-03', 'RC.CO-04'
  ];

  // Filter to only existing controls
  const validBankingControls = bankingBaselineControls.filter(
    id => csfControls.some(c => c.id === id)
  );

  for (const controlId of validBankingControls) {
    try {
      await prisma.cSFBaseline.create({
        data: {
          productId: bankingProduct.id,
          subcategoryId: controlId,
          applicable: true,
          categoryLevel: controlId.includes('AA') || controlId.includes('DS') ||
            controlId.includes('RM') || controlId.includes('RA') ? 'MUST_HAVE' : 'SHOULD_HAVE',
          justification: `PCI-DSS and regulatory compliance for ${bankingProduct.name}`
        }
      });
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log(`✅ Created ${validBankingControls.length} banking baseline controls`);

  // Create assessments for banking - highest compliance requirements
  for (const system of createdBankingSystems) {
    for (const controlId of validBankingControls) {
      // Banking has highest compliance rates for production critical systems
      let statusWeights;
      if (system.criticality === 'CRITICAL') {
        statusWeights = [0.60, 0.25, 0.10, 0.05];
      } else if (system.criticality === 'HIGH') {
        statusWeights = [0.45, 0.35, 0.15, 0.05];
      } else {
        statusWeights = [0.30, 0.40, 0.20, 0.10];
      }

      const random = Math.random();
      let status;
      if (random < statusWeights[0]) status = 'COMPLIANT';
      else if (random < statusWeights[0] + statusWeights[1]) status = 'PARTIALLY_COMPLIANT';
      else if (random < statusWeights[0] + statusWeights[1] + statusWeights[2]) status = 'NON_COMPLIANT';
      else status = 'NOT_ASSESSED';

      const assessors = ['PCI QSA Auditor', 'Bank InfoSec', 'External Penetration Tester', 'Compliance Team'];
      const assessor = assessors[Math.floor(Math.random() * assessors.length)];

      const daysAgo = Math.floor(Math.random() * 45);
      const assessedDate = new Date();
      assessedDate.setDate(assessedDate.getDate() - daysAgo);

      let details = '';
      let evidence: string[] = [];
      let remediationPlan = null;

      if (status === 'COMPLIANT') {
        details = `${controlId} fully compliant per PCI-DSS v4.0 requirements. QSA validated.`;
        evidence = ['QSA assessment', 'Penetration test report', 'Configuration audit', 'Change management records'];
      } else if (status === 'PARTIALLY_COMPLIANT') {
        details = `${controlId} implemented with compensating controls. Full compliance pending.`;
        evidence = ['Compensating control documentation', 'Implementation plan'];
        remediationPlan = 'Complete full implementation before next QSA assessment.';
      } else if (status === 'NON_COMPLIANT') {
        details = `CRITICAL GAP: ${controlId} not meeting PCI-DSS requirements. Immediate action required.`;
        evidence = ['Gap analysis', 'Risk acceptance (temporary)'];
        remediationPlan = 'PRIORITY 1: Implement within 30 days. Daily status updates to CISO.';
      }

      try {
        await prisma.complianceAssessment.create({
          data: {
            systemId: system.id,
            subcategoryId: controlId,
            status,
            details,
            assessor: status === 'NOT_ASSESSED' ? null : assessor,
            assessedDate: status === 'NOT_ASSESSED' ? null : assessedDate,
            legacyEvidence: evidence.length > 0 ? JSON.stringify(evidence) : null,
            remediationPlan
          }
        });
      } catch (e) {
        // Skip duplicates
      }
    }
  }

  console.log(`✅ Created banking assessments`);

  // ========================================================================
  // SUMMARY
  // ========================================================================

  // Count totals
  const totalProducts = await prisma.product.count();
  const totalSystems = await prisma.system.count();
  const totalAssessments = await prisma.complianceAssessment.count();
  const totalBaselines = await prisma.cSFBaseline.count();

  console.log('\n' + '='.repeat(70));
  console.log('🎉 Demo data added successfully!');
  console.log('='.repeat(70));
  console.log('\n📊 Database Summary:');
  console.log(`   ✓ ${totalProducts} total products`);
  console.log(`   ✓ ${totalSystems} total systems`);
  console.log(`   ✓ ${totalBaselines} total baseline controls`);
  console.log(`   ✓ ${totalAssessments} total assessments`);
  console.log('\n🚀 Refresh the browser to see the new demo data!');
  console.log('');
}

main()
  .catch((e) => {
    console.error('\n❌ Error adding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

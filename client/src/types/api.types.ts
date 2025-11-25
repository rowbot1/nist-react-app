/**
 * TypeScript Type Definitions for NIST Compliance Assessment API
 *
 * Comprehensive type definitions for all API entities, requests, and responses.
 */

/**
 * Product Types
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  systemCount?: number;
  complianceScore?: number;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  type?: string;
  criticality?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  owner?: string;
}

/**
 * System Types
 */
export interface System {
  id: string;
  productId: string;
  name: string;
  description: string;
  environment: string;
  criticality: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
  assessmentCount?: number;
  complianceScore?: number;
  dataClassification?: string;
}

export interface CreateSystemInput {
  productId: string;
  name: string;
  description?: string;
  environment?: string;
  criticality?: string;
  dataClassification?: string;
}

export interface UpdateSystemInput {
  name?: string;
  description?: string;
  environment?: string;
  criticality?: string;
  dataClassification?: string;
}

/**
 * NIST CSF Types
 */
export interface CSFFunction {
  id: string;
  code: string;
  name: string;
  description: string;
  categories: CSFCategory[];
}

export interface CSFCategory {
  id: string;
  functionId: string;
  code: string;
  name: string;
  description: string;
  subcategories: CSFSubcategory[];
}

export interface CSFSubcategory {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description: string;
  implementationExamples: string[];
}

export interface CSFControl {
  id: string;
  subcategoryId: string;
  subcategoryCode: string;
  functionCode: string;
  functionName: string;
  categoryCode: string;
  categoryName: string;
  subcategoryName: string;
  description: string;
  implementationExamples: string[];
  nist80053Mappings: NIST80053Mapping[];
}

export interface NIST80053Mapping {
  id: string;
  controlId: string;
  controlFamily: string;
  controlName: string;
  priorityLevel: 'P0' | 'P1' | 'P2' | 'P3';
  description: string;
}

/**
 * Assessment Types
 */
export type ComplianceStatus =
  | 'Not Assessed'
  | 'Not Applicable'
  | 'Not Implemented'
  | 'Partially Implemented'
  | 'Implemented';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Assessment {
  id: string;
  productId: string;
  systemId: string;
  controlId: string;
  subcategoryCode: string;
  status: ComplianceStatus;
  implementationNotes: string;
  evidence: string;
  assessedBy: string;
  assessedDate: string;
  targetDate?: string;
  riskLevel?: RiskLevel;
  remediationPlan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentWithControl extends Assessment {
  control: CSFControl;
}

export interface CreateAssessmentInput {
  productId: string;
  systemId: string;
  controlId: string;
  status: ComplianceStatus;
  implementationNotes?: string;
  evidence?: string;
  targetDate?: string;
  riskLevel?: RiskLevel;
  remediationPlan?: string;
}

export interface UpdateAssessmentInput {
  status?: ComplianceStatus;
  implementationNotes?: string;
  evidence?: string;
  targetDate?: string;
  riskLevel?: RiskLevel;
  remediationPlan?: string;
}

export interface BulkUpdateAssessmentInput {
  assessmentIds: string[];
  updates: UpdateAssessmentInput;
}

/**
 * Assessment Matrix Types
 */
export interface AssessmentMatrixRow {
  controlId: string;
  subcategoryCode: string;
  functionCode: string;
  categoryCode: string;
  subcategoryName: string;
  systems: {
    [systemId: string]: {
      assessmentId?: string;
      status: ComplianceStatus;
      riskLevel?: RiskLevel;
      assessedDate?: string;
    };
  };
}

export interface AssessmentMatrix {
  productId: string;
  systems: System[];
  rows: AssessmentMatrixRow[];
}

/**
 * Baseline Types
 */
export interface ProductBaseline {
  id: string;
  productId: string;
  controlIds: string[];
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBaselineInput {
  productId: string;
  controlIds: string[];
  description?: string;
}

export interface UpdateBaselineInput {
  controlIds?: string[];
  description?: string;
}

/**
 * Analytics Types
 */
export interface AnalyticsOverview {
  totalProducts: number;
  totalSystems: number;
  totalAssessments: number;
  averageCompliance: number;
  complianceByStatus: {
    [key in ComplianceStatus]: number;
  };
  highRiskCount: number;
  criticalRiskCount: number;
}

export interface ProductComplianceMetrics {
  productId: string;
  productName: string;
  systemCount: number;
  totalControls: number;
  assessedControls: number;
  complianceScore: number;
  statusBreakdown: {
    [key in ComplianceStatus]: number;
  };
  riskBreakdown: {
    [key in RiskLevel]: number;
  };
  systemScores: {
    systemId: string;
    systemName: string;
    complianceScore: number;
  }[];
}

export interface ComplianceTrend {
  date: string;
  complianceScore: number;
  assessedControls: number;
  implementedControls: number;
}

export interface GapAnalysis {
  productId: string;
  totalGaps: number;
  criticalGaps: number;
  highRiskGaps: number;
  gaps: {
    controlId: string;
    subcategoryCode: string;
    subcategoryName: string;
    systemId: string;
    systemName: string;
    status: ComplianceStatus;
    riskLevel: RiskLevel;
    targetDate?: string;
    remediationPlan?: string;
  }[];
}

export interface FunctionCompliance {
  functionCode: string;
  functionName: string;
  totalControls: number;
  assessedControls: number;
  implementedControls: number;
  complianceScore: number;
  categories: {
    categoryCode: string;
    categoryName: string;
    totalControls: number;
    assessedControls: number;
    implementedControls: number;
    complianceScore: number;
  }[];
}

/**
 * Filter Types
 */
export interface AssessmentFilters {
  productId?: string;
  systemId?: string;
  status?: ComplianceStatus;
  riskLevel?: RiskLevel;
  functionCode?: string;
  categoryCode?: string;
  assessedBy?: string;
  assessedDateFrom?: string;
  assessedDateTo?: string;
}

export interface CSFSearchParams {
  query: string;
  functionCode?: string;
  categoryCode?: string;
}

/**
 * Pagination Types
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Evidence Types
 */
export interface Evidence {
  id: string;
  assessmentId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  storageType: 'local' | 's3';
  description?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface EvidenceUploadResponse {
  message: string;
  evidence: Evidence[];
  errors?: Array<{ fileName: string; error: string }>;
}

export interface EvidenceListResponse {
  assessmentId: string;
  evidence: Evidence[];
  total: number;
}

export interface EvidenceStats {
  systemId: string;
  totalAssessments: number;
  assessmentsWithEvidence: number;
  totalEvidenceFiles: number;
  totalStorageBytes: number;
  byStatus: {
    COMPLIANT: number;
    PARTIALLY_COMPLIANT: number;
    NON_COMPLIANT: number;
    NOT_ASSESSED: number;
  };
  byFileType: Record<string, number>;
}

/**
 * Centralized Type Definitions Index
 *
 * Export all TypeScript types for easy importing throughout the application.
 * Usage: import type { Product, Assessment } from '@/types'
 */

export type {
  // Product types
  Product,
  CreateProductInput,
  UpdateProductInput,

  // System types
  System,
  CreateSystemInput,
  UpdateSystemInput,

  // CSF types
  CSFFunction,
  CSFCategory,
  CSFSubcategory,
  CSFControl,
  NIST80053Mapping,

  // Assessment types
  ComplianceStatus,
  RiskLevel,
  Assessment,
  AssessmentWithControl,
  CreateAssessmentInput,
  UpdateAssessmentInput,
  BulkUpdateAssessmentInput,
  AssessmentMatrixRow,
  AssessmentMatrix,

  // Baseline types
  ProductBaseline,
  CreateBaselineInput,
  UpdateBaselineInput,

  // Analytics types
  AnalyticsOverview,
  ProductComplianceMetrics,
  ComplianceTrend,
  GapAnalysis,
  FunctionCompliance,

  // Filter types
  AssessmentFilters,
  CSFSearchParams,

  // Pagination types
  PaginationParams,
} from './api.types';

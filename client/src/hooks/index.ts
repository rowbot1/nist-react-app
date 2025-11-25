/**
 * Centralized Hooks Index
 *
 * Export all React Query hooks for easy importing throughout the application.
 * Usage: import { useProducts, useCSFControls } from '@/hooks'
 */

// Product hooks
export {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  productKeys,
} from './useProducts';

// System hooks
export {
  useSystems,
  useSystem,
  useCreateSystem,
  useUpdateSystem,
  useDeleteSystem,
  systemKeys,
} from './useSystems';

// Assessment hooks
export {
  useAssessments,
  useAssessment,
  useAssessmentMatrix,
  useUpdateAssessment,
  useCreateAssessment,
  useBulkUpdateAssessments,
  useDeleteAssessment,
  assessmentKeys,
} from './useAssessments';

// CSF hooks
export {
  useCSFFunctions,
  useCSFCategories,
  useCSFSubcategories,
  useCSFControls,
  useCSFControl,
  useCSFSearch,
  useCSFControlsByFunction,
  useCSFControlsByCategory,
  useCSFHierarchy,
  usePrefetchCSFData,
  csfKeys,
} from './useCSF';

// Analytics hooks
export {
  useAnalyticsOverview,
  useProductCompliance,
  useComplianceTrends,
  useGapAnalysis,
  useFunctionCompliance,
  useFunctionComplianceDetail,
  useComplianceStats,
  useRiskSummary,
  usePrefetchAnalytics,
  analyticsKeys,
} from './useAnalytics';

// Baseline hooks
export {
  useProductBaseline,
  useBaselines,
  useCreateBaseline,
  useUpdateBaseline,
  useDeleteBaseline,
  useBaselineControls,
  useHasBaseline,
  baselineKeys,
} from './useBaseline';

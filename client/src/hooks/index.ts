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

// Framework hooks
export {
  useFrameworks,
  useFramework,
  useFrameworkOverview,
  useCreateFramework,
  useUpdateFramework,
  useDeleteFramework,
  useAddProductToFramework,
  useRemoveProductFromFramework,
  frameworkKeys,
} from './useFrameworks';

// Capability Centre hooks
export {
  useCapabilityCentres,
  useCapabilityCentre,
  useOrganizationalHierarchy,
  useCreateCapabilityCentre,
  useUpdateCapabilityCentre,
  useDeleteCapabilityCentre,
  capabilityCentreKeys,
} from './useCapabilityCentres';

// Risk hooks
export {
  useRiskConfig,
  useUpdateRiskConfig,
  useRiskScore,
  useRiskHeatMap,
  useRiskPriorities,
  useRiskTrends,
  useRiskSummary as useRiskSummaryHook,
  riskKeys,
} from './useRisk';

// Re-export risk types
export type {
  RiskScore,
  RiskScoreWeights,
  FunctionRisk,
  HeatMapData,
  HeatMapCell,
  HeatMapCellControl,
  RiskPriority,
  RiskTrendPoint,
} from './useRisk';

// Responsive hooks
export {
  useResponsive,
  useBreakpoint,
  useMediaQuery,
  useMobileView,
  useSafeAreaInsets,
} from './useResponsive';

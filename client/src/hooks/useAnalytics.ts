/**
 * React Query Hooks for Analytics API
 *
 * Provides hooks for fetching compliance analytics, metrics, trends,
 * gap analysis, and function-level compliance data.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '../services/api';
import type {
  AnalyticsOverview,
  ProductComplianceMetrics,
  ComplianceTrend,
  GapAnalysis,
  FunctionCompliance,
} from '../types/api.types';

/**
 * Query Keys for React Query caching
 */
export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: () => [...analyticsKeys.all, 'overview'] as const,
  productCompliance: (productId: string) => [...analyticsKeys.all, 'product', productId] as const,
  trends: (days?: number) => [...analyticsKeys.all, 'trends', days] as const,
  gaps: (productId: string) => [...analyticsKeys.all, 'gaps', productId] as const,
  functions: () => [...analyticsKeys.all, 'functions'] as const,
  functionCompliance: (productId?: string) =>
    [...analyticsKeys.all, 'function-compliance', productId] as const,
};

/**
 * Server response structure for analytics overview
 */
interface ServerOverviewResponse {
  overview: {
    totalProducts: number;
    totalSystems: number;
    totalAssessments: number;
    completedAssessments: number;
    compliantAssessments: number;
    averageComplianceScore: number;
    completionRate: number;
  };
  statusBreakdown: {
    NOT_ASSESSED: number;
    COMPLIANT: number;
    PARTIALLY_COMPLIANT: number;
    NON_COMPLIANT: number;
    NOT_APPLICABLE: number;
  };
  productMetrics: Array<{
    productId: string;
    productName: string;
    systemsCount: number;
    assessmentsCount: number;
    complianceScore: number;
    completionRate: number;
  }>;
}

/**
 * Fetch overall analytics overview
 */
export const useAnalyticsOverview = (
  options?: Omit<UseQueryOptions<AnalyticsOverview, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<AnalyticsOverview, Error>({
    queryKey: analyticsKeys.overview(),
    queryFn: async () => {
      console.log('[useAnalyticsOverview] Fetching analytics overview...');
      const response = await api.get<ServerOverviewResponse>('/analytics/overview');
      console.log('[useAnalyticsOverview] Raw response:', response.data);

      // Transform server response to match client AnalyticsOverview type
      const serverData = response.data;
      const transformed: AnalyticsOverview = {
        totalProducts: serverData.overview.totalProducts,
        totalSystems: serverData.overview.totalSystems,
        totalAssessments: serverData.overview.totalAssessments,
        averageCompliance: serverData.overview.averageComplianceScore,
        complianceByStatus: {
          'Not Assessed': serverData.statusBreakdown.NOT_ASSESSED,
          'Not Applicable': serverData.statusBreakdown.NOT_APPLICABLE,
          'Not Implemented': serverData.statusBreakdown.NON_COMPLIANT,
          'Partially Implemented': serverData.statusBreakdown.PARTIALLY_COMPLIANT,
          'Implemented': serverData.statusBreakdown.COMPLIANT,
        },
        highRiskCount: 0, // Server doesn't track risk levels in overview
        criticalRiskCount: 0,
      };

      console.log('[useAnalyticsOverview] Transformed data:', transformed);
      return transformed;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
    ...options,
  });
};

/**
 * Fetch product-specific compliance metrics
 */
export const useProductCompliance = (
  productId: string,
  options?: Omit<UseQueryOptions<ProductComplianceMetrics, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<ProductComplianceMetrics, Error>({
    queryKey: analyticsKeys.productCompliance(productId),
    queryFn: async () => {
      console.log('[useProductCompliance] Fetching compliance for product:', productId);
      const response = await api.get<any>(`/analytics/compliance/${productId}`);
      console.log('[useProductCompliance] Raw response:', response.data);

      // Transform server response to match client type
      const serverData = response.data;
      const transformed: ProductComplianceMetrics = {
        productId: serverData.productId,
        productName: serverData.productName,
        systemCount: serverData.functions?.length || 0,
        totalControls: serverData.overall?.totalAssessments || 0,
        assessedControls: serverData.overall?.totalAssessments || 0,
        complianceScore: serverData.overall?.complianceScore || 0,
        statusBreakdown: {
          'Not Assessed': 0,
          'Not Applicable': 0,
          'Not Implemented': 0,
          'Partially Implemented': 0,
          'Implemented': 0,
        },
        riskBreakdown: {
          Low: 0,
          Medium: 0,
          High: 0,
          Critical: 0,
        },
        systemScores: [],
      };

      console.log('[useProductCompliance] Transformed data:', transformed);
      return transformed;
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Fetch compliance trends over time
 */
export const useComplianceTrends = (
  days: number = 30,
  options?: Omit<UseQueryOptions<ComplianceTrend[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<ComplianceTrend[], Error>({
    queryKey: analyticsKeys.trends(days),
    queryFn: async () => {
      console.log('[useComplianceTrends] Fetching trends for days:', days);
      const response = await api.get<any>(`/analytics/trends?days=${days}`);
      console.log('[useComplianceTrends] Raw response:', response.data);

      // Transform server response
      const trends = (response.data.trends || []).map((t: any) => ({
        date: t.date,
        complianceScore: t.cumulativeComplianceScore || t.complianceScore || 0,
        assessedControls: t.cumulativeTotal || t.totalAssessments || 0,
        implementedControls: t.compliant || 0,
      }));

      console.log('[useComplianceTrends] Transformed data:', trends);
      return trends;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Fetch gap analysis for a product
 */
export const useGapAnalysis = (
  productId: string,
  options?: Omit<UseQueryOptions<GapAnalysis, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<GapAnalysis, Error>({
    queryKey: analyticsKeys.gaps(productId),
    queryFn: async () => {
      console.log('[useGapAnalysis] Fetching gaps for product:', productId);
      const response = await api.get<any>(`/analytics/gaps/${productId}`);
      console.log('[useGapAnalysis] Raw response:', response.data);

      // Transform server response to match client type
      const serverData = response.data;
      const transformed: GapAnalysis = {
        productId: serverData.productId,
        totalGaps: serverData.summary?.totalGaps || 0,
        criticalGaps: 0, // Server doesn't track critical separately
        highRiskGaps: serverData.summary?.nonCompliant || 0,
        gaps: (serverData.gaps || []).map((g: any) => ({
          controlId: g.subcategoryId,
          subcategoryCode: g.subcategoryId,
          subcategoryName: g.controlTitle,
          systemId: g.systemId,
          systemName: g.systemName,
          status: mapServerStatus(g.status),
          riskLevel: g.priority === 'HIGH' ? 'High' as const : 'Medium' as const,
          targetDate: undefined,
          remediationPlan: g.remediationPlan,
        })),
      };

      console.log('[useGapAnalysis] Transformed data:', transformed);
      return transformed;
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

// Helper to map server status to client status
function mapServerStatus(serverStatus: string): import('../types/api.types').ComplianceStatus {
  const mapping: Record<string, import('../types/api.types').ComplianceStatus> = {
    'NOT_ASSESSED': 'Not Assessed',
    'NOT_APPLICABLE': 'Not Applicable',
    'NON_COMPLIANT': 'Not Implemented',
    'PARTIALLY_COMPLIANT': 'Partially Implemented',
    'COMPLIANT': 'Implemented',
  };
  return mapping[serverStatus] || 'Not Assessed';
}

/**
 * Fetch compliance by CSF function
 */
export const useFunctionCompliance = (
  productId?: string,
  options?: Omit<UseQueryOptions<FunctionCompliance[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<FunctionCompliance[], Error>({
    queryKey: analyticsKeys.functionCompliance(productId),
    queryFn: async () => {
      const url = productId
        ? `/analytics/functions?productId=${productId}`
        : '/analytics/functions';
      console.log('[useFunctionCompliance] Fetching function compliance:', url);
      const response = await api.get<any>(url);
      console.log('[useFunctionCompliance] Raw response:', response.data);

      // Transform server response to match client type
      const functions = (response.data.functions || []).map((f: any) => ({
        functionCode: f.functionId,
        functionName: f.functionName,
        totalControls: f.total,
        assessedControls: f.completed,
        implementedControls: f.compliant,
        complianceScore: f.complianceScore,
        categories: [],
      }));

      console.log('[useFunctionCompliance] Transformed data:', functions);
      return functions;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Fetch compliance by specific function
 */
export const useFunctionComplianceDetail = (
  functionCode: string,
  productId?: string,
  options?: Omit<UseQueryOptions<FunctionCompliance, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<FunctionCompliance, Error>({
    queryKey: [...analyticsKeys.functions(), functionCode, productId],
    queryFn: async () => {
      const url = productId
        ? `/analytics/functions/${functionCode}?productId=${productId}`
        : `/analytics/functions/${functionCode}`;
      console.log('[useFunctionComplianceDetail] Fetching:', url);
      const response = await api.get<any>(url);
      console.log('[useFunctionComplianceDetail] Raw response:', response.data);

      // Transform server response
      const data = response.data;
      const transformed: FunctionCompliance = {
        functionCode: data.functionId || functionCode,
        functionName: data.functionName || functionCode,
        totalControls: data.total || 0,
        assessedControls: data.completed || 0,
        implementedControls: data.compliant || 0,
        complianceScore: data.complianceScore || 0,
        categories: [],
      };

      console.log('[useFunctionComplianceDetail] Transformed data:', transformed);
      return transformed;
    },
    enabled: !!functionCode,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Custom hook to get compliance statistics
 */
export const useComplianceStats = (productId?: string) => {
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview({
    enabled: !productId,
  });

  const { data: productData, isLoading: productLoading } = useProductCompliance(
    productId || '',
    { enabled: !!productId }
  );

  const isLoading = productId ? productLoading : overviewLoading;

  if (productId && productData) {
    return {
      isLoading,
      totalControls: productData.totalControls,
      assessedControls: productData.assessedControls,
      complianceScore: productData.complianceScore,
      statusBreakdown: productData.statusBreakdown,
      riskBreakdown: productData.riskBreakdown,
    };
  }

  if (!productId && overview) {
    return {
      isLoading,
      totalControls: overview.totalAssessments,
      assessedControls: overview.totalAssessments,
      complianceScore: overview.averageCompliance,
      statusBreakdown: overview.complianceByStatus,
      riskBreakdown: {
        Low: 0,
        Medium: 0,
        High: overview.highRiskCount,
        Critical: overview.criticalRiskCount,
      },
    };
  }

  return {
    isLoading,
    totalControls: 0,
    assessedControls: 0,
    complianceScore: 0,
    statusBreakdown: undefined,
    riskBreakdown: undefined,
  };
};

/**
 * Custom hook to get risk summary
 */
export const useRiskSummary = (productId?: string) => {
  const { data: gaps, isLoading } = useGapAnalysis(productId || '', {
    enabled: !!productId,
  });

  if (!gaps) {
    return {
      isLoading,
      totalGaps: 0,
      criticalGaps: 0,
      highRiskGaps: 0,
      mediumRiskGaps: 0,
      lowRiskGaps: 0,
    };
  }

  const mediumRiskGaps = gaps.gaps.filter((g) => g.riskLevel === 'Medium').length;
  const lowRiskGaps = gaps.gaps.filter((g) => g.riskLevel === 'Low').length;

  return {
    isLoading,
    totalGaps: gaps.totalGaps,
    criticalGaps: gaps.criticalGaps,
    highRiskGaps: gaps.highRiskGaps,
    mediumRiskGaps,
    lowRiskGaps,
  };
};

/**
 * Custom hook to prefetch analytics data
 */
export const usePrefetchAnalytics = (productId?: string) => {
  const { data: overview } = useAnalyticsOverview({ enabled: !productId });
  const { data: productCompliance } = useProductCompliance(productId || '', {
    enabled: !!productId,
  });
  const { data: trends } = useComplianceTrends();

  return {
    isLoaded: !!overview || !!productCompliance,
    hasTrends: !!trends,
  };
};

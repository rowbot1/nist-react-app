/**
 * React Query Hook for Hierarchical Compliance API
 *
 * Provides hooks for fetching scoped compliance data with bottom-up rollup
 * from System -> Product -> Framework -> Capability Centre.
 *
 * Supports URL-based scope management for drill-down navigation.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import api from '../services/api';
import type {
  ScopeType,
  HierarchicalComplianceResponse,
  OrganizationalScope,
  buildParamsFromScope,
} from '../types/scope.types';

/**
 * Query Keys for React Query caching
 */
export const complianceKeys = {
  all: ['hierarchical-compliance'] as const,
  rollup: (scopeType: ScopeType | null, scopeId: string | null) =>
    [...complianceKeys.all, 'rollup', scopeType || 'global', scopeId || 'all'] as const,
  cc: (ccId: string) => [...complianceKeys.all, 'cc', ccId] as const,
  framework: (frameworkId: string) => [...complianceKeys.all, 'framework', frameworkId] as const,
  product: (productId: string) => [...complianceKeys.all, 'product', productId] as const,
  system: (systemId: string) => [...complianceKeys.all, 'system', systemId] as const,
};

/**
 * Main hook for scoped hierarchical compliance
 *
 * Fetches compliance rollup data for a given organizational scope.
 * Pass null for both params to get global (all organizations) data.
 *
 * @param scopeType - The type of scope ('cc' | 'framework' | 'product' | 'system' | null)
 * @param scopeId - The ID of the scoped entity (or null for global)
 * @param options - Additional React Query options
 */
export const useHierarchicalCompliance = (
  scopeType: ScopeType | null,
  scopeId: string | null,
  options?: Omit<UseQueryOptions<HierarchicalComplianceResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<HierarchicalComplianceResponse, Error>({
    queryKey: complianceKeys.rollup(scopeType, scopeId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (scopeType && scopeId) {
        params.set('scopeType', scopeType);
        params.set('scopeId', scopeId);
      }

      const url = params.toString()
        ? `/compliance/rollup?${params.toString()}`
        : '/compliance/rollup';

      console.log('[useHierarchicalCompliance] Fetching:', url);
      const response = await api.get<HierarchicalComplianceResponse>(url);
      console.log('[useHierarchicalCompliance] Response:', response.data);

      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    ...options,
  });
};

/**
 * Convenience hook for Capability Centre compliance
 */
export const useCapabilityCentreCompliance = (
  ccId: string,
  options?: Omit<UseQueryOptions<HierarchicalComplianceResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<HierarchicalComplianceResponse, Error>({
    queryKey: complianceKeys.cc(ccId),
    queryFn: async () => {
      console.log('[useCapabilityCentreCompliance] Fetching CC:', ccId);
      const response = await api.get<HierarchicalComplianceResponse>(
        `/compliance/capability-centres/${ccId}`
      );
      return response.data;
    },
    enabled: !!ccId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Convenience hook for Framework compliance
 */
export const useFrameworkCompliance = (
  frameworkId: string,
  options?: Omit<UseQueryOptions<HierarchicalComplianceResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<HierarchicalComplianceResponse, Error>({
    queryKey: complianceKeys.framework(frameworkId),
    queryFn: async () => {
      console.log('[useFrameworkCompliance] Fetching Framework:', frameworkId);
      const response = await api.get<HierarchicalComplianceResponse>(
        `/compliance/frameworks/${frameworkId}`
      );
      return response.data;
    },
    enabled: !!frameworkId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Convenience hook for Product compliance
 */
export const useProductHierarchicalCompliance = (
  productId: string,
  options?: Omit<UseQueryOptions<HierarchicalComplianceResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<HierarchicalComplianceResponse, Error>({
    queryKey: complianceKeys.product(productId),
    queryFn: async () => {
      console.log('[useProductHierarchicalCompliance] Fetching Product:', productId);
      const response = await api.get<HierarchicalComplianceResponse>(
        `/compliance/products/${productId}`
      );
      return response.data;
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Convenience hook for System compliance
 */
export const useSystemHierarchicalCompliance = (
  systemId: string,
  options?: Omit<UseQueryOptions<HierarchicalComplianceResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<HierarchicalComplianceResponse, Error>({
    queryKey: complianceKeys.system(systemId),
    queryFn: async () => {
      console.log('[useSystemHierarchicalCompliance] Fetching System:', systemId);
      const response = await api.get<HierarchicalComplianceResponse>(
        `/compliance/systems/${systemId}`
      );
      return response.data;
    },
    enabled: !!systemId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to recalculate all compliance scores (admin operation)
 *
 * Triggers a full recalculation of all cached compliance scores.
 * Use after bulk data imports or to repair inconsistent cache state.
 */
export const useRecalculateCompliance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('[useRecalculateCompliance] Triggering full recalculation...');
      const response = await api.post('/compliance/recalculate');
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all compliance queries to refresh data
      queryClient.invalidateQueries({ queryKey: complianceKeys.all });
      console.log('[useRecalculateCompliance] Cache invalidated, data will refresh');
    },
    onError: (error) => {
      console.error('[useRecalculateCompliance] Error:', error);
    },
  });
};

/**
 * Hook to manually invalidate hierarchy for a specific assessment
 */
export const useInvalidateHierarchy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string) => {
      console.log('[useInvalidateHierarchy] Invalidating for assessment:', assessmentId);
      const response = await api.post(`/compliance/invalidate/${assessmentId}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all compliance queries
      queryClient.invalidateQueries({ queryKey: complianceKeys.all });
    },
    onError: (error) => {
      console.error('[useInvalidateHierarchy] Error:', error);
    },
  });
};

/**
 * Custom hook that combines hierarchical compliance with scope state
 *
 * Returns both the compliance data and helpers for managing scope navigation.
 */
export const useScopedCompliance = (scope: OrganizationalScope) => {
  const { data, isLoading, error, refetch } = useHierarchicalCompliance(
    scope.type,
    scope.id
  );

  return {
    // Data
    data,
    rollup: data?.rollup,
    functions: data?.functions || [],
    children: data?.children || [],
    scopeName: data?.scope.name || 'All Organizations',

    // State
    isLoading,
    error,

    // Actions
    refetch,

    // Helpers
    hasChildren: (data?.children?.length || 0) > 0,
    isGlobalScope: !scope.type || !scope.id,
  };
};

/**
 * Hook to get just the function breakdown for the current scope
 *
 * Useful for heat maps and function-level visualizations.
 */
export const useScopedFunctionBreakdown = (
  scopeType: ScopeType | null,
  scopeId: string | null
) => {
  const { data, isLoading, error } = useHierarchicalCompliance(scopeType, scopeId);

  return {
    functions: data?.functions || [],
    isLoading,
    error,
  };
};

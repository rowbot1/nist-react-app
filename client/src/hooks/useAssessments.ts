/**
 * React Query Hooks for Assessments API
 *
 * Provides hooks for fetching, creating, updating assessments with filtering,
 * assessment matrix data, and bulk update capabilities.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import api, { getErrorMessage } from '../services/api';
import type {
  Assessment,
  AssessmentWithControl,
  AssessmentMatrix,
  AssessmentMatrixRow,
  CreateAssessmentInput,
  UpdateAssessmentInput,
  BulkUpdateAssessmentInput,
  AssessmentFilters,
  ComplianceStatus,
} from '../types/api.types';
import { productKeys } from './useProducts';
import { systemKeys } from './useSystems';

/**
 * Query Keys for React Query caching
 */
export const assessmentKeys = {
  all: ['assessments'] as const,
  lists: () => [...assessmentKeys.all, 'list'] as const,
  list: (filters?: AssessmentFilters) => [...assessmentKeys.lists(), filters] as const,
  details: () => [...assessmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...assessmentKeys.details(), id] as const,
  matrices: () => [...assessmentKeys.all, 'matrix'] as const,
  matrix: (productId: string) => [...assessmentKeys.matrices(), productId] as const,
};

/**
 * Server response for assessments list
 */
interface AssessmentsListResponse {
  assessments: any[];
  summary: {
    total: number;
    NOT_ASSESSED: number;
    COMPLIANT: number;
    PARTIALLY_COMPLIANT: number;
    NON_COMPLIANT: number;
    NOT_APPLICABLE: number;
  };
}

/**
 * Helper to map server status to client status
 */
function mapServerStatusToClient(serverStatus: string): ComplianceStatus {
  const mapping: Record<string, ComplianceStatus> = {
    'NOT_ASSESSED': 'Not Assessed',
    'NOT_APPLICABLE': 'Not Applicable',
    'NON_COMPLIANT': 'Not Implemented',
    'PARTIALLY_COMPLIANT': 'Partially Implemented',
    'COMPLIANT': 'Implemented',
  };
  return mapping[serverStatus] || 'Not Assessed';
}

/**
 * Fetch assessments with optional filtering
 */
export const useAssessments = (
  filters?: AssessmentFilters,
  options?: Omit<UseQueryOptions<Assessment[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<Assessment[], Error>({
    queryKey: assessmentKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      const url = `/assessments${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('[useAssessments] Fetching:', url);
      const response = await api.get<AssessmentsListResponse>(url);
      console.log('[useAssessments] Raw response:', response.data);

      // Transform server response to match client types
      const assessments = (response.data.assessments || []).map((a: any) => ({
        id: a.id,
        productId: a.system?.product?.id || a.system?.productId || '',
        systemId: a.systemId,
        controlId: a.subcategoryId,
        subcategoryCode: a.subcategoryId,
        status: mapServerStatusToClient(a.status),
        implementationNotes: a.details || '',
        evidence: a.evidence || '',
        assessedBy: a.assessor || '',
        assessedDate: a.assessedDate || '',
        targetDate: undefined,
        riskLevel: undefined,
        remediationPlan: a.remediationPlan || '',
        createdAt: a.createdAt || '',
        updatedAt: a.updatedAt || '',
      }));

      console.log('[useAssessments] Transformed:', assessments);
      return assessments;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent updates for assessments)
    ...options,
  });
};

/**
 * Fetch a single assessment by ID
 */
export const useAssessment = (
  id: string,
  options?: Omit<UseQueryOptions<AssessmentWithControl, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<AssessmentWithControl, Error>({
    queryKey: assessmentKeys.detail(id),
    queryFn: async () => {
      console.log('[useAssessment] Fetching assessment:', id);
      const response = await api.get<any>(`/assessments/${id}`);
      console.log('[useAssessment] Raw response:', response.data);

      // Transform server response
      const a = response.data;
      const transformed: AssessmentWithControl = {
        id: a.id,
        productId: a.system?.product?.id || a.system?.productId || '',
        systemId: a.systemId,
        controlId: a.subcategoryId,
        subcategoryCode: a.subcategoryId,
        status: mapServerStatusToClient(a.status),
        implementationNotes: a.details || '',
        evidence: a.evidence || '',
        assessedBy: a.assessor || '',
        assessedDate: a.assessedDate || '',
        targetDate: undefined,
        riskLevel: undefined,
        remediationPlan: a.remediationPlan || '',
        createdAt: a.createdAt || '',
        updatedAt: a.updatedAt || '',
        control: {} as any, // Will be populated if needed
      };

      console.log('[useAssessment] Transformed:', transformed);
      return transformed;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Server response for assessment matrix
 */
interface MatrixResponse {
  matrix: Array<{
    controlId: string;
    functionId: string;
    categoryId: string;
    title: string;
    categoryLevel: string;
    systems: Array<{
      systemId: string;
      systemName: string;
      status: string;
      assessmentId: string | null;
      assessedDate: string | null;
    }>;
  }>;
  systems: Array<{
    id: string;
    name: string;
    criticality: string;
    environment: string;
  }>;
  summary: {
    totalControls: number;
    totalSystems: number;
    totalCells: number;
    assessedCells: number;
    compliantCells: number;
    completionRate: number;
    complianceRate: number;
  };
}

/**
 * Fetch assessment matrix for a product
 */
export const useAssessmentMatrix = (
  productId: string,
  options?: Omit<UseQueryOptions<AssessmentMatrix, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<AssessmentMatrix, Error>({
    queryKey: assessmentKeys.matrix(productId),
    queryFn: async () => {
      console.log('[useAssessmentMatrix] Fetching matrix for product:', productId);
      const response = await api.get<MatrixResponse>(`/assessments/matrix/${productId}`);
      console.log('[useAssessmentMatrix] Raw response:', response.data);

      // Transform server response to match client AssessmentMatrix type
      const serverData = response.data;

      // Transform systems to match client System type
      const systems = serverData.systems.map((s) => ({
        id: s.id,
        productId: productId,
        name: s.name,
        description: '',
        environment: s.environment,
        criticality: s.criticality,
        createdAt: '',
        updatedAt: '',
      }));

      // Transform matrix rows to match AssessmentMatrixRow type
      const rows = serverData.matrix.map((row) => {
        // Build systems object as { [systemId]: assessment data }
        const systemsMap: AssessmentMatrixRow['systems'] = {};
        row.systems.forEach((sys) => {
          systemsMap[sys.systemId] = {
            assessmentId: sys.assessmentId || undefined,
            status: mapServerStatusToClient(sys.status),
            riskLevel: undefined,
            assessedDate: sys.assessedDate || undefined,
          };
        });

        return {
          controlId: row.controlId,
          subcategoryCode: row.controlId,
          functionCode: row.functionId,
          categoryCode: row.categoryId,
          subcategoryName: row.title,
          systems: systemsMap,
        };
      });

      const transformed: AssessmentMatrix = {
        productId,
        systems,
        rows,
      };

      console.log('[useAssessmentMatrix] Transformed:', transformed);
      return transformed;
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Helper to map client status to server status
 */
function mapClientStatusToServer(clientStatus: string): string {
  const mapping: Record<string, string> = {
    'Not Assessed': 'NOT_ASSESSED',
    'Not Applicable': 'NOT_APPLICABLE',
    'Not Implemented': 'NON_COMPLIANT',
    'Partially Implemented': 'PARTIALLY_COMPLIANT',
    'Implemented': 'COMPLIANT',
  };
  return mapping[clientStatus] || 'NOT_ASSESSED';
}

/**
 * Create a new assessment
 */
export const useCreateAssessment = (
  options?: UseMutationOptions<Assessment, Error, CreateAssessmentInput>
) => {
  const queryClient = useQueryClient();

  return useMutation<Assessment, Error, CreateAssessmentInput>({
    mutationFn: async (input: CreateAssessmentInput) => {
      console.log('[useCreateAssessment] Creating assessment:', input);
      // Transform client input to server format
      const serverInput = {
        subcategoryId: input.controlId,
        systemId: input.systemId,
        status: mapClientStatusToServer(input.status),
        details: input.implementationNotes,
        evidence: input.evidence,
        remediationPlan: input.remediationPlan,
      };
      const response = await api.post<any>('/assessments', serverInput);
      console.log('[useCreateAssessment] Response:', response.data);

      // Transform server response back to client format
      const a = response.data;
      return {
        id: a.id,
        productId: a.system?.product?.id || '',
        systemId: a.systemId,
        controlId: a.subcategoryId,
        subcategoryCode: a.subcategoryId,
        status: mapServerStatusToClient(a.status),
        implementationNotes: a.details || '',
        evidence: a.evidence || '',
        assessedBy: a.assessor || '',
        assessedDate: a.assessedDate || '',
        createdAt: a.createdAt || '',
        updatedAt: a.updatedAt || '',
      };
    },
    onSuccess: (newAssessment) => {
      // Invalidate assessment lists
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });

      // Invalidate matrix for the product
      queryClient.invalidateQueries({
        queryKey: assessmentKeys.matrix(newAssessment.productId),
      });

      // Invalidate product and system to update compliance scores
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(newAssessment.productId),
      });
      queryClient.invalidateQueries({
        queryKey: systemKeys.detail(newAssessment.systemId),
      });

      // Add to cache
      queryClient.setQueryData(assessmentKeys.detail(newAssessment.id), newAssessment);
    },
    onError: (error) => {
      console.error('Failed to create assessment:', getErrorMessage(error));
    },
    ...options,
  });
};

/**
 * Update an existing assessment
 */
export const useUpdateAssessment = (
  options?: UseMutationOptions<Assessment, Error, { id: string; updates: UpdateAssessmentInput }>
) => {
  const queryClient = useQueryClient();

  return useMutation<Assessment, Error, { id: string; updates: UpdateAssessmentInput }>({
    mutationFn: async ({ id, updates }) => {
      console.log('[useUpdateAssessment] Updating assessment:', id, updates);
      // Transform client input to server format
      const serverUpdates: any = {};
      if (updates.status) serverUpdates.status = mapClientStatusToServer(updates.status);
      if (updates.implementationNotes !== undefined) serverUpdates.details = updates.implementationNotes;
      if (updates.evidence !== undefined) serverUpdates.evidence = updates.evidence;
      if (updates.remediationPlan !== undefined) serverUpdates.remediationPlan = updates.remediationPlan;

      const response = await api.put<any>(`/assessments/${id}`, serverUpdates);
      console.log('[useUpdateAssessment] Response:', response.data);

      // Transform server response back to client format
      const a = response.data;
      return {
        id: a.id,
        productId: a.system?.product?.id || '',
        systemId: a.systemId,
        controlId: a.subcategoryId,
        subcategoryCode: a.subcategoryId,
        status: mapServerStatusToClient(a.status),
        implementationNotes: a.details || '',
        evidence: a.evidence || '',
        assessedBy: a.assessor || '',
        assessedDate: a.assessedDate || '',
        createdAt: a.createdAt || '',
        updatedAt: a.updatedAt || '',
      };
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: assessmentKeys.detail(id) });

      // Snapshot previous value
      const previousAssessment = queryClient.getQueryData<Assessment>(assessmentKeys.detail(id));

      // Optimistically update cache
      if (previousAssessment) {
        queryClient.setQueryData<Assessment>(assessmentKeys.detail(id), {
          ...previousAssessment,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousAssessment };
    },
    onSuccess: (updatedAssessment) => {
      // Update cache with server response
      queryClient.setQueryData(assessmentKeys.detail(updatedAssessment.id), updatedAssessment);

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });

      // Invalidate matrix
      queryClient.invalidateQueries({
        queryKey: assessmentKeys.matrix(updatedAssessment.productId),
      });

      // Invalidate product and system
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(updatedAssessment.productId),
      });
      queryClient.invalidateQueries({
        queryKey: systemKeys.detail(updatedAssessment.systemId),
      });
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousAssessment' in context && context.previousAssessment) {
        queryClient.setQueryData(assessmentKeys.detail(id), context.previousAssessment);
      }
      console.error('Failed to update assessment:', getErrorMessage(error));
    },
    ...options,
  });
};

/**
 * Bulk update multiple assessments
 */
export const useBulkUpdateAssessments = (
  options?: UseMutationOptions<Assessment[], Error, BulkUpdateAssessmentInput>
) => {
  const queryClient = useQueryClient();

  return useMutation<Assessment[], Error, BulkUpdateAssessmentInput>({
    mutationFn: async (input: BulkUpdateAssessmentInput) => {
      const response = await api.put<{ data: Assessment[] }>('/assessments/bulk', input);
      return response.data.data;
    },
    onSuccess: (updatedAssessments) => {
      // Update individual assessment caches
      updatedAssessments.forEach((assessment) => {
        queryClient.setQueryData(assessmentKeys.detail(assessment.id), assessment);

        // Invalidate related resources
        queryClient.invalidateQueries({
          queryKey: assessmentKeys.matrix(assessment.productId),
        });
        queryClient.invalidateQueries({
          queryKey: productKeys.detail(assessment.productId),
        });
        queryClient.invalidateQueries({
          queryKey: systemKeys.detail(assessment.systemId),
        });
      });

      // Invalidate all lists
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to bulk update assessments:', getErrorMessage(error));
    },
    ...options,
  });
};

/**
 * Delete an assessment
 */
export const useDeleteAssessment = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.delete(`/assessments/${id}`);
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: assessmentKeys.detail(id) });

      // Snapshot previous value
      const previousAssessment = queryClient.getQueryData<Assessment>(assessmentKeys.detail(id));

      // Optimistically remove from cache
      queryClient.removeQueries({ queryKey: assessmentKeys.detail(id) });

      return { previousAssessment };
    },
    onSuccess: (_, id, context) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });

      // If we have previous assessment data, invalidate related resources
      if (context && typeof context === 'object' && 'previousAssessment' in context && context.previousAssessment) {
        const prev = context.previousAssessment as Assessment;
        queryClient.invalidateQueries({
          queryKey: assessmentKeys.matrix(prev.productId),
        });
        queryClient.invalidateQueries({
          queryKey: productKeys.detail(prev.productId),
        });
        queryClient.invalidateQueries({
          queryKey: systemKeys.detail(prev.systemId),
        });
      }

      // Remove from cache
      queryClient.removeQueries({ queryKey: assessmentKeys.detail(id) });
    },
    onError: (error, id, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousAssessment' in context && context.previousAssessment) {
        queryClient.setQueryData(assessmentKeys.detail(id), context.previousAssessment);
      }
      console.error('Failed to delete assessment:', getErrorMessage(error));
    },
    ...options,
  });
};

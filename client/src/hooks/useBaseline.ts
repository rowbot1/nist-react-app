/**
 * React Query Hooks for Baseline API
 *
 * Provides hooks for fetching and managing product baselines,
 * which define the set of controls applicable to each product.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import api, { getErrorMessage } from '../services/api';
import type {
  ProductBaseline,
  CreateBaselineInput,
  UpdateBaselineInput,
} from '../types/api.types';
import { productKeys } from './useProducts';

/**
 * Query Keys for React Query caching
 */
export const baselineKeys = {
  all: ['baselines'] as const,
  lists: () => [...baselineKeys.all, 'list'] as const,
  details: () => [...baselineKeys.all, 'detail'] as const,
  detail: (productId: string) => [...baselineKeys.details(), productId] as const,
};

/**
 * Fetch product baseline by product ID
 */
export const useProductBaseline = (
  productId: string,
  options?: Omit<UseQueryOptions<ProductBaseline, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<ProductBaseline, Error>({
    queryKey: baselineKeys.detail(productId),
    queryFn: async () => {
      const response = await api.get<{ data: ProductBaseline }>(
        `/baselines/product/${productId}`
      );
      return response.data.data;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Fetch all baselines (admin use)
 */
export const useBaselines = (
  options?: Omit<UseQueryOptions<ProductBaseline[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<ProductBaseline[], Error>({
    queryKey: baselineKeys.lists(),
    queryFn: async () => {
      const response = await api.get<{ data: ProductBaseline[] }>('/baselines');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Create a new baseline for a product
 */
export const useCreateBaseline = (
  options?: UseMutationOptions<ProductBaseline, Error, CreateBaselineInput>
) => {
  const queryClient = useQueryClient();

  return useMutation<ProductBaseline, Error, CreateBaselineInput>({
    mutationFn: async (input: CreateBaselineInput) => {
      const response = await api.post<{ data: ProductBaseline }>('/baselines', input);
      return response.data.data;
    },
    onSuccess: (newBaseline) => {
      // Update cache for this product's baseline
      queryClient.setQueryData(
        baselineKeys.detail(newBaseline.productId),
        newBaseline
      );

      // Invalidate baselines list
      queryClient.invalidateQueries({ queryKey: baselineKeys.lists() });

      // Invalidate related product data
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(newBaseline.productId),
      });
    },
    onError: (error) => {
      console.error('Failed to create baseline:', getErrorMessage(error));
    },
    ...options,
  });
};

/**
 * Update an existing baseline
 */
export const useUpdateBaseline = (
  options?: UseMutationOptions<ProductBaseline, Error, { productId: string; updates: UpdateBaselineInput }>
) => {
  const queryClient = useQueryClient();

  return useMutation<ProductBaseline, Error, { productId: string; updates: UpdateBaselineInput }>({
    mutationFn: async ({ productId, updates }) => {
      const response = await api.put<{ data: ProductBaseline }>(
        `/baselines/product/${productId}`,
        updates
      );
      return response.data.data;
    },
    onMutate: async ({ productId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: baselineKeys.detail(productId) });

      // Snapshot previous value
      const previousBaseline = queryClient.getQueryData<ProductBaseline>(
        baselineKeys.detail(productId)
      );

      // Optimistically update cache
      if (previousBaseline) {
        queryClient.setQueryData<ProductBaseline>(baselineKeys.detail(productId), {
          ...previousBaseline,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousBaseline };
    },
    onSuccess: (updatedBaseline) => {
      // Update cache with server response
      queryClient.setQueryData(
        baselineKeys.detail(updatedBaseline.productId),
        updatedBaseline
      );

      // Invalidate baselines list
      queryClient.invalidateQueries({ queryKey: baselineKeys.lists() });

      // Invalidate related product data
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(updatedBaseline.productId),
      });
    },
    onError: (error, { productId }, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousBaseline' in context && context.previousBaseline) {
        queryClient.setQueryData(
          baselineKeys.detail(productId),
          context.previousBaseline
        );
      }
      console.error('Failed to update baseline:', getErrorMessage(error));
    },
    ...options,
  });
};

/**
 * Delete a baseline
 */
export const useDeleteBaseline = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (productId: string) => {
      await api.delete(`/baselines/product/${productId}`);
    },
    onMutate: async (productId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: baselineKeys.detail(productId) });

      // Snapshot previous value
      const previousBaseline = queryClient.getQueryData<ProductBaseline>(
        baselineKeys.detail(productId)
      );

      // Optimistically remove from cache
      queryClient.removeQueries({ queryKey: baselineKeys.detail(productId) });

      return { previousBaseline };
    },
    onSuccess: (_, productId) => {
      // Invalidate baselines list
      queryClient.invalidateQueries({ queryKey: baselineKeys.lists() });

      // Invalidate related product data
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });

      // Remove from cache
      queryClient.removeQueries({ queryKey: baselineKeys.detail(productId) });
    },
    onError: (error, productId, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousBaseline' in context && context.previousBaseline) {
        queryClient.setQueryData(
          baselineKeys.detail(productId),
          context.previousBaseline
        );
      }
      console.error('Failed to delete baseline:', getErrorMessage(error));
    },
    ...options,
  });
};

/**
 * Custom hook to manage baseline controls
 */
export const useBaselineControls = (productId: string) => {
  const { data: baseline, isLoading } = useProductBaseline(productId);
  const updateMutation = useUpdateBaseline();

  const addControl = async (controlId: string) => {
    if (!baseline) return;

    const controlIds = [...baseline.controlIds];
    if (!controlIds.includes(controlId)) {
      controlIds.push(controlId);
      await updateMutation.mutateAsync({
        productId,
        updates: { controlIds },
      });
    }
  };

  const removeControl = async (controlId: string) => {
    if (!baseline) return;

    const controlIds = baseline.controlIds.filter((id) => id !== controlId);
    await updateMutation.mutateAsync({
      productId,
      updates: { controlIds },
    });
  };

  const setControls = async (controlIds: string[]) => {
    await updateMutation.mutateAsync({
      productId,
      updates: { controlIds },
    });
  };

  const hasControl = (controlId: string) => {
    return baseline?.controlIds.includes(controlId) || false;
  };

  return {
    baseline,
    isLoading,
    controlIds: baseline?.controlIds || [],
    addControl,
    removeControl,
    setControls,
    hasControl,
    isUpdating: updateMutation.isPending,
  };
};

/**
 * Custom hook to check if baseline exists for a product
 */
export const useHasBaseline = (productId: string) => {
  const { data: baseline, isLoading } = useProductBaseline(productId);

  return {
    hasBaseline: !!baseline && (baseline.controlIds?.length || 0) > 0,
    isLoading,
    controlCount: baseline?.controlIds?.length || 0,
  };
};

/**
 * Baseline template interface
 */
export interface BaselineTemplate {
  id: string;
  name: string;
  description: string;
  controlCount: number;
  functions: string[];
}

/**
 * Fetch available baseline templates
 */
export const useBaselineTemplates = (
  options?: Omit<UseQueryOptions<BaselineTemplate[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<BaselineTemplate[], Error>({
    queryKey: [...baselineKeys.all, 'templates'] as const,
    queryFn: async () => {
      const response = await api.get<{ data: BaselineTemplate[] }>('/baselines/templates');
      return response.data.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - templates don't change often
    ...options,
  });
};

/**
 * Apply a baseline template to a product
 */
export interface ApplyTemplateInput {
  productId: string;
  templateId?: string;
  controlIds?: string[];
}

export interface ApplyTemplateResult {
  data: ProductBaseline;
  summary: {
    baselineControlsApplied: number;
    systemsUpdated: number;
    assessmentsCreated: number;
    message: string;
  };
}

export const useApplyBaselineTemplate = (
  options?: UseMutationOptions<ApplyTemplateResult, Error, ApplyTemplateInput>
) => {
  const queryClient = useQueryClient();

  return useMutation<ApplyTemplateResult, Error, ApplyTemplateInput>({
    mutationFn: async ({ productId, templateId, controlIds }) => {
      const response = await api.post<ApplyTemplateResult>(
        `/baselines/product/${productId}/apply-template`,
        { templateId, controlIds }
      );
      return response.data;
    },
    onSuccess: (result, { productId }) => {
      // Update baseline cache
      queryClient.setQueryData(baselineKeys.detail(productId), result.data);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: baselineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });

      // Invalidate assessments for this product's systems
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
    onError: (error) => {
      console.error('Failed to apply baseline template:', getErrorMessage(error));
    },
    ...options,
  });
};

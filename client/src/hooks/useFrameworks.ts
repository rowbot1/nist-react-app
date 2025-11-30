/**
 * useFrameworks Hook
 *
 * React Query hooks for managing Frameworks (business domain portfolios).
 * Provides CRUD operations and compliance stats aggregation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  Framework,
  CreateFrameworkInput,
  UpdateFrameworkInput,
  FrameworkOverviewResponse,
} from '../types/api.types';

// Query keys
export const frameworkKeys = {
  all: ['frameworks'] as const,
  lists: () => [...frameworkKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...frameworkKeys.lists(), filters] as const,
  details: () => [...frameworkKeys.all, 'detail'] as const,
  detail: (id: string) => [...frameworkKeys.details(), id] as const,
  overview: () => [...frameworkKeys.all, 'overview'] as const,
};

/**
 * Fetch all frameworks with stats, optionally filtered by capability centre
 */
export function useFrameworks(capabilityCentreId?: string) {
  return useQuery({
    queryKey: frameworkKeys.list({ capabilityCentreId }),
    queryFn: async (): Promise<Framework[]> => {
      const params = capabilityCentreId ? { capabilityCentreId } : {};
      const response = await api.get('/frameworks', { params });
      return response.data;
    },
  });
}

/**
 * Fetch a single framework by ID with full details
 */
export function useFramework(id: string | undefined) {
  return useQuery({
    queryKey: frameworkKeys.detail(id || ''),
    queryFn: async (): Promise<Framework> => {
      const response = await api.get(`/frameworks/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch framework overview stats (aggregate across all frameworks)
 */
export function useFrameworkOverview() {
  return useQuery({
    queryKey: frameworkKeys.overview(),
    queryFn: async (): Promise<FrameworkOverviewResponse> => {
      const response = await api.get('/frameworks/stats/overview');
      return response.data;
    },
  });
}

/**
 * Create a new framework
 */
export function useCreateFramework() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFrameworkInput): Promise<Framework> => {
      const response = await api.post('/frameworks', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: frameworkKeys.all });
    },
  });
}

/**
 * Update a framework
 */
export function useUpdateFramework() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateFrameworkInput;
    }): Promise<Framework> => {
      const response = await api.put(`/frameworks/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: frameworkKeys.all });
      queryClient.invalidateQueries({ queryKey: frameworkKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete a framework
 */
export function useDeleteFramework() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/frameworks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: frameworkKeys.all });
    },
  });
}

/**
 * Add a product to a framework
 */
export function useAddProductToFramework() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      frameworkId,
      productId,
    }: {
      frameworkId: string;
      productId: string;
    }): Promise<void> => {
      await api.post(`/frameworks/${frameworkId}/products/${productId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: frameworkKeys.all });
      queryClient.invalidateQueries({ queryKey: frameworkKeys.detail(variables.frameworkId) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Remove a product from a framework
 */
export function useRemoveProductFromFramework() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      frameworkId,
      productId,
    }: {
      frameworkId: string;
      productId: string;
    }): Promise<void> => {
      await api.delete(`/frameworks/${frameworkId}/products/${productId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: frameworkKeys.all });
      queryClient.invalidateQueries({ queryKey: frameworkKeys.detail(variables.frameworkId) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

const frameworkHooks = {
  useFrameworks,
  useFramework,
  useFrameworkOverview,
  useCreateFramework,
  useUpdateFramework,
  useDeleteFramework,
  useAddProductToFramework,
  useRemoveProductFromFramework,
};

export default frameworkHooks;

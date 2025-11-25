/**
 * React Query Hooks for Systems API
 *
 * Provides hooks for fetching, creating, updating, and deleting systems
 * with optional product filtering and proper cache management.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import api, { getErrorMessage } from '../services/api';
import type { System, CreateSystemInput, UpdateSystemInput } from '../types/api.types';
import { productKeys } from './useProducts';

/**
 * Query Keys for React Query caching
 */
export const systemKeys = {
  all: ['systems'] as const,
  lists: () => [...systemKeys.all, 'list'] as const,
  list: (filters?: { productId?: string }) => [...systemKeys.lists(), filters] as const,
  details: () => [...systemKeys.all, 'detail'] as const,
  detail: (id: string) => [...systemKeys.details(), id] as const,
};

/**
 * Fetch systems, optionally filtered by product
 */
export const useSystems = (
  productId?: string,
  options?: Omit<UseQueryOptions<System[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<System[], Error>({
    queryKey: systemKeys.list({ productId }),
    queryFn: async () => {
      const url = productId ? `/systems?productId=${productId}` : '/systems';
      const response = await api.get<{ systems: System[]; total: number }>(url);
      return response.data.systems;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Fetch a single system by ID
 */
export const useSystem = (
  id: string,
  options?: Omit<UseQueryOptions<System, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<System, Error>({
    queryKey: systemKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<System>(`/systems/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Create a new system
 */
export const useCreateSystem = (
  options?: UseMutationOptions<System, Error, CreateSystemInput>
) => {
  const queryClient = useQueryClient();

  return useMutation<System, Error, CreateSystemInput>({
    mutationFn: async (input: CreateSystemInput) => {
      const response = await api.post<System>('/systems', input);
      return response.data;
    },
    onSuccess: (newSystem) => {
      // Invalidate all system lists
      queryClient.invalidateQueries({ queryKey: systemKeys.lists() });

      // Invalidate product-specific system list
      queryClient.invalidateQueries({
        queryKey: systemKeys.list({ productId: newSystem.productId }),
      });

      // Invalidate parent product to update system count
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(newSystem.productId),
      });

      // Optimistically add to cache
      queryClient.setQueryData(systemKeys.detail(newSystem.id), newSystem);
    },
    onError: (error) => {
      console.error('Failed to create system:', getErrorMessage(error));
    },
    ...options,
  });
};

/**
 * Update an existing system
 */
export const useUpdateSystem = (
  options?: UseMutationOptions<System, Error, { id: string; updates: UpdateSystemInput }>
) => {
  const queryClient = useQueryClient();

  return useMutation<System, Error, { id: string; updates: UpdateSystemInput }>({
    mutationFn: async ({ id, updates }) => {
      const response = await api.put<System>(`/systems/${id}`, updates);
      return response.data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: systemKeys.detail(id) });

      // Snapshot previous value
      const previousSystem = queryClient.getQueryData<System>(systemKeys.detail(id));

      // Optimistically update cache
      if (previousSystem) {
        queryClient.setQueryData<System>(systemKeys.detail(id), {
          ...previousSystem,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousSystem };
    },
    onSuccess: (updatedSystem) => {
      // Update cache with server response
      queryClient.setQueryData(systemKeys.detail(updatedSystem.id), updatedSystem);

      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: systemKeys.lists() });

      // Invalidate product-specific list
      queryClient.invalidateQueries({
        queryKey: systemKeys.list({ productId: updatedSystem.productId }),
      });

      // Invalidate parent product
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(updatedSystem.productId),
      });
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousSystem' in context && context.previousSystem) {
        queryClient.setQueryData(systemKeys.detail(id), context.previousSystem);
      }
      console.error('Failed to update system:', getErrorMessage(error));
    },
    ...options,
  });
};

/**
 * Delete a system
 */
export const useDeleteSystem = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.delete(`/systems/${id}`);
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: systemKeys.detail(id) });

      // Snapshot previous value
      const previousSystem = queryClient.getQueryData<System>(systemKeys.detail(id));

      // Optimistically remove from cache
      queryClient.removeQueries({ queryKey: systemKeys.detail(id) });

      return { previousSystem };
    },
    onSuccess: (_, id, context) => {
      // Invalidate and refetch system lists
      queryClient.invalidateQueries({ queryKey: systemKeys.lists() });

      // If we have previous system data, invalidate its product
      if (context && typeof context === 'object' && 'previousSystem' in context && context.previousSystem) {
        const prev = context.previousSystem as System;
        queryClient.invalidateQueries({
          queryKey: productKeys.detail(prev.productId),
        });
        queryClient.invalidateQueries({
          queryKey: systemKeys.list({ productId: prev.productId }),
        });
      }

      // Remove from cache
      queryClient.removeQueries({ queryKey: systemKeys.detail(id) });
    },
    onError: (error, id, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousSystem' in context && context.previousSystem) {
        queryClient.setQueryData(systemKeys.detail(id), context.previousSystem);
      }
      console.error('Failed to delete system:', getErrorMessage(error));
    },
    ...options,
  });
};

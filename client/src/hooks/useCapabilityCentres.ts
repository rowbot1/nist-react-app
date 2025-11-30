/**
 * useCapabilityCentres Hook
 *
 * React Query hooks for managing Capability Centres (top-level organizational units).
 * Provides CRUD operations and organizational hierarchy management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  CapabilityCentre,
  CreateCapabilityCentreInput,
  UpdateCapabilityCentreInput,
  HierarchyCapabilityCentre,
} from '../types/api.types';

// Query keys
export const capabilityCentreKeys = {
  all: ['capabilityCentres'] as const,
  lists: () => [...capabilityCentreKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...capabilityCentreKeys.lists(), filters] as const,
  details: () => [...capabilityCentreKeys.all, 'detail'] as const,
  detail: (id: string) => [...capabilityCentreKeys.details(), id] as const,
  hierarchy: () => [...capabilityCentreKeys.all, 'hierarchy'] as const,
};

/**
 * Fetch all capability centres with stats
 */
export function useCapabilityCentres() {
  return useQuery({
    queryKey: capabilityCentreKeys.lists(),
    queryFn: async (): Promise<CapabilityCentre[]> => {
      const response = await api.get('/capability-centres');
      return response.data;
    },
  });
}

/**
 * Fetch a single capability centre by ID with full details
 */
export function useCapabilityCentre(id: string | undefined) {
  return useQuery({
    queryKey: capabilityCentreKeys.detail(id || ''),
    queryFn: async (): Promise<CapabilityCentre> => {
      const response = await api.get(`/capability-centres/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch the complete organizational hierarchy with compliance roll-up
 */
export function useOrganizationalHierarchy() {
  return useQuery({
    queryKey: capabilityCentreKeys.hierarchy(),
    queryFn: async (): Promise<HierarchyCapabilityCentre[]> => {
      const response = await api.get('/capability-centres/hierarchy/full');
      return response.data;
    },
  });
}

/**
 * Create a new capability centre
 */
export function useCreateCapabilityCentre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCapabilityCentreInput): Promise<CapabilityCentre> => {
      const response = await api.post('/capability-centres', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: capabilityCentreKeys.all });
    },
  });
}

/**
 * Update a capability centre
 */
export function useUpdateCapabilityCentre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCapabilityCentreInput;
    }): Promise<CapabilityCentre> => {
      const response = await api.put(`/capability-centres/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: capabilityCentreKeys.all });
      queryClient.invalidateQueries({ queryKey: capabilityCentreKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete a capability centre
 */
export function useDeleteCapabilityCentre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/capability-centres/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: capabilityCentreKeys.all });
      // Also invalidate frameworks since they may have been cascade deleted
      queryClient.invalidateQueries({ queryKey: ['frameworks'] });
    },
  });
}

const capabilityCentreHooks = {
  useCapabilityCentres,
  useCapabilityCentre,
  useOrganizationalHierarchy,
  useCreateCapabilityCentre,
  useUpdateCapabilityCentre,
  useDeleteCapabilityCentre,
};

export default capabilityCentreHooks;

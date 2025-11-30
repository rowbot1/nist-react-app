/**
 * Assignments Hook
 *
 * React Query hooks for control assignments - assigning team members
 * to be responsible for specific controls or control patterns.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const ASSIGNMENTS_QUERY_KEY = 'assignments';

// Types
export interface AssignmentAssignee {
  id: string;
  name: string;
  email: string;
}

export interface Assignment {
  id: string;
  controlPattern: string;
  assigneeId: string;
  assignee: AssignmentAssignee;
  productId: string;
  systemId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentInput {
  controlPattern: string;
  assigneeId: string;
  productId: string;
  systemId?: string;
  notes?: string;
}

export interface UpdateAssignmentInput {
  controlPattern?: string;
  assigneeId?: string;
  notes?: string;
}

export interface BulkAssignmentInput {
  controlPatterns: string[];
  assigneeId: string;
  productId: string;
  systemId?: string;
  notes?: string;
}

export interface AssignmentSummary {
  totalAssignments: number;
  byAssignee: Array<{
    assignee: AssignmentAssignee;
    patterns: string[];
    count: number;
  }>;
  byFunction: Record<string, number>;
  assignments: Assignment[];
}

export interface ControlAssignmentLookup {
  controlId: string;
  assignment: Assignment | null;
  allMatches: Assignment[];
}

export interface MyAssignments {
  totalAssignments: number;
  byProduct: Array<{
    productId: string;
    assignments: Assignment[];
  }>;
  assignments: Assignment[];
}

// Get all assignments for a product
export function useAssignments(
  productId: string | undefined,
  options?: {
    systemId?: string;
    assigneeId?: string;
    controlPattern?: string;
  }
) {
  return useQuery<Assignment[]>({
    queryKey: [ASSIGNMENTS_QUERY_KEY, productId, options],
    queryFn: async () => {
      const params: Record<string, string> = { productId: productId! };
      if (options?.systemId) params.systemId = options.systemId;
      if (options?.assigneeId) params.assigneeId = options.assigneeId;
      if (options?.controlPattern) params.controlPattern = options.controlPattern;

      const { data } = await api.get('/assignments', { params });
      return data;
    },
    enabled: !!productId,
  });
}

// Get assignment for a specific control
export function useControlAssignment(
  controlId: string | undefined,
  productId: string | undefined,
  systemId?: string
) {
  return useQuery<ControlAssignmentLookup>({
    queryKey: [ASSIGNMENTS_QUERY_KEY, 'control', controlId, productId, systemId],
    queryFn: async () => {
      const params: Record<string, string> = { productId: productId! };
      if (systemId) params.systemId = systemId;

      const { data } = await api.get(`/assignments/by-control/${controlId}`, { params });
      return data;
    },
    enabled: !!controlId && !!productId,
  });
}

// Get assignment summary for a product
export function useAssignmentSummary(productId: string | undefined, systemId?: string) {
  return useQuery<AssignmentSummary>({
    queryKey: [ASSIGNMENTS_QUERY_KEY, 'summary', productId, systemId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (systemId) params.systemId = systemId;

      const { data } = await api.get(`/assignments/summary/${productId}`, { params });
      return data;
    },
    enabled: !!productId,
  });
}

// Get current user's assignments
export function useMyAssignments(productId?: string) {
  return useQuery<MyAssignments>({
    queryKey: [ASSIGNMENTS_QUERY_KEY, 'user', 'my-assignments', productId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (productId) params.productId = productId;

      const { data } = await api.get('/assignments/user/my-assignments', { params });
      return data;
    },
  });
}

// Get single assignment
export function useAssignment(id: string | undefined) {
  return useQuery<Assignment>({
    queryKey: [ASSIGNMENTS_QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await api.get(`/assignments/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// Create a new assignment
export function useCreateAssignment() {
  const queryClient = useQueryClient();

  return useMutation<Assignment, Error, CreateAssignmentInput>({
    mutationFn: async (input) => {
      const { data } = await api.post('/assignments', input);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY] });
    },
  });
}

// Bulk create assignments
export function useBulkCreateAssignments() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; created: Assignment[]; skipped: string[] },
    Error,
    BulkAssignmentInput
  >({
    mutationFn: async (input) => {
      const { data } = await api.post('/assignments/bulk', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY] });
    },
  });
}

// Update an assignment
export function useUpdateAssignment() {
  const queryClient = useQueryClient();

  return useMutation<Assignment, Error, { id: string; updates: UpdateAssignmentInput }>({
    mutationFn: async ({ id, updates }) => {
      const { data } = await api.put(`/assignments/${id}`, updates);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY, data.id] });
    },
  });
}

// Delete an assignment
export function useDeleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY] });
    },
  });
}

// Get all users (for assignment dropdown)
export function useUsers(search?: string) {
  return useQuery<AssignmentAssignee[]>({
    queryKey: ['users', search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;

      const { data } = await api.get('/auth/users', { params });
      return data;
    },
  });
}

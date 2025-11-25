/**
 * React Query Hooks for Products API
 *
 * Provides hooks for fetching, creating, updating, and deleting products
 * with proper caching, loading states, and error handling.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import api, { getErrorMessage } from '../services/api';
import type { Product, CreateProductInput, UpdateProductInput } from '../types/api.types';

/**
 * Query Keys for React Query caching
 */
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

/**
 * Fetch all products
 */
export const useProducts = (
  options?: Omit<UseQueryOptions<Product[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<Product[], Error>({
    queryKey: productKeys.lists(),
    queryFn: async () => {
      console.log('[useProducts] Fetching all products...');
      const response = await api.get<{ products: Product[]; total: number }>('/products');
      console.log('[useProducts] Response:', response.data);
      return response.data.products;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Fetch a single product by ID
 */
export const useProduct = (
  id: string,
  options?: Omit<UseQueryOptions<Product, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<Product, Error>({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      console.log('[useProduct] Fetching product:', id);
      const response = await api.get<Product>(`/products/${id}`);
      console.log('[useProduct] Response:', response.data);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Create a new product
 */
export const useCreateProduct = (
  options?: UseMutationOptions<Product, Error, CreateProductInput>
) => {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, CreateProductInput>({
    mutationFn: async (input: CreateProductInput) => {
      console.log('[useCreateProduct] Creating product:', input);
      const response = await api.post<Product>('/products', input);
      console.log('[useCreateProduct] Response:', response.data);
      return response.data;
    },
    onSuccess: (newProduct) => {
      // Invalidate products list to refetch with new product
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });

      // Optimistically add to cache
      queryClient.setQueryData(productKeys.detail(newProduct.id), newProduct);
    },
    onError: (error) => {
      console.error('Failed to create product:', getErrorMessage(error));
    },
    ...options,
  });
};

/**
 * Update an existing product
 */
export const useUpdateProduct = (
  options?: UseMutationOptions<Product, Error, { id: string; updates: UpdateProductInput }>
) => {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, { id: string; updates: UpdateProductInput }>({
    mutationFn: async ({ id, updates }) => {
      console.log('[useUpdateProduct] Updating product:', id, updates);
      const response = await api.put<Product>(`/products/${id}`, updates);
      console.log('[useUpdateProduct] Response:', response.data);
      return response.data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: productKeys.detail(id) });

      // Snapshot previous value
      const previousProduct = queryClient.getQueryData<Product>(productKeys.detail(id));

      // Optimistically update cache
      if (previousProduct) {
        queryClient.setQueryData<Product>(productKeys.detail(id), {
          ...previousProduct,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousProduct };
    },
    onSuccess: (updatedProduct) => {
      // Update cache with server response
      queryClient.setQueryData(productKeys.detail(updatedProduct.id), updatedProduct);

      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousProduct' in context && context.previousProduct) {
        queryClient.setQueryData(productKeys.detail(id), context.previousProduct);
      }
      console.error('Failed to update product:', getErrorMessage(error));
    },
    ...options,
  });
};

/**
 * Delete a product
 */
export const useDeleteProduct = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: productKeys.detail(id) });

      // Snapshot previous value
      const previousProduct = queryClient.getQueryData<Product>(productKeys.detail(id));

      // Optimistically remove from cache
      queryClient.removeQueries({ queryKey: productKeys.detail(id) });

      return { previousProduct };
    },
    onSuccess: (_, id) => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });

      // Remove from cache
      queryClient.removeQueries({ queryKey: productKeys.detail(id) });
    },
    onError: (error, id, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousProduct' in context && context.previousProduct) {
        queryClient.setQueryData(productKeys.detail(id), context.previousProduct);
      }
      console.error('Failed to delete product:', getErrorMessage(error));
    },
    ...options,
  });
};

/**
 * React Query Hooks for NIST CSF API
 *
 * Provides hooks for fetching NIST Cybersecurity Framework functions,
 * categories, subcategories, controls, and 800-53 mappings with search.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '../services/api';
import type {
  CSFFunction,
  CSFCategory,
  CSFSubcategory,
  CSFControl,
  CSFSearchParams,
} from '../types/api.types';

/**
 * Query Keys for React Query caching
 */
export const csfKeys = {
  all: ['csf'] as const,
  functions: () => [...csfKeys.all, 'functions'] as const,
  categories: () => [...csfKeys.all, 'categories'] as const,
  category: (functionId: string) => [...csfKeys.categories(), functionId] as const,
  subcategories: () => [...csfKeys.all, 'subcategories'] as const,
  controls: () => [...csfKeys.all, 'controls'] as const,
  control: (id: string) => [...csfKeys.controls(), id] as const,
  search: (params: CSFSearchParams) => [...csfKeys.all, 'search', params] as const,
};

/**
 * Fetch all CSF functions
 */
export const useCSFFunctions = (
  options?: Omit<UseQueryOptions<CSFFunction[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<CSFFunction[], Error>({
    queryKey: csfKeys.functions(),
    queryFn: async () => {
      console.log('[useCSFFunctions] Fetching functions...');
      const response = await api.get<{ functions: any[]; total: number }>('/csf/functions');
      console.log('[useCSFFunctions] Raw response:', response.data);

      // Transform server response to match client type
      const functions = (response.data.functions || []).map((f: any) => ({
        id: f.id,
        code: f.id,
        name: f.name,
        description: f.description,
        categories: [],
      }));

      console.log('[useCSFFunctions] Transformed:', functions);
      return functions;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - CSF data changes infrequently
    ...options,
  });
};

/**
 * Fetch categories for a specific function
 */
export const useCSFCategories = (
  functionId?: string,
  options?: Omit<UseQueryOptions<CSFCategory[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<CSFCategory[], Error>({
    queryKey: csfKeys.category(functionId || 'all'),
    queryFn: async () => {
      const url = functionId
        ? `/csf/categories/${functionId}`
        : '/csf/categories';
      console.log('[useCSFCategories] Fetching:', url);
      const response = await api.get<{ categories: any[]; total: number }>(url);
      console.log('[useCSFCategories] Raw response:', response.data);

      // Transform server response to match client type
      const categories = (response.data.categories || []).map((c: any) => ({
        id: c.id,
        functionId: c.functionId,
        code: c.id,
        name: c.name,
        description: c.description,
        subcategories: [],
      }));

      console.log('[useCSFCategories] Transformed:', categories);
      return categories;
    },
    enabled: options?.enabled !== false, // Allow explicit disabling
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
};

/**
 * Fetch all subcategories
 */
export const useCSFSubcategories = (
  options?: Omit<UseQueryOptions<CSFSubcategory[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<CSFSubcategory[], Error>({
    queryKey: csfKeys.subcategories(),
    queryFn: async () => {
      // Note: Server doesn't have a direct subcategories endpoint, derive from controls
      console.log('[useCSFSubcategories] Fetching subcategories via controls...');
      const response = await api.get<{ controls: any[]; total: number }>('/csf/controls');
      console.log('[useCSFSubcategories] Raw response:', response.data);

      // Extract unique subcategories from controls
      const seen = new Set<string>();
      const subcategories: CSFSubcategory[] = [];

      (response.data.controls || []).forEach((c: any) => {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          subcategories.push({
            id: c.id,
            categoryId: c.categoryId,
            code: c.id,
            name: c.title,
            description: c.text || '',
            implementationExamples: c.implementationExamples || [],
          });
        }
      });

      console.log('[useCSFSubcategories] Transformed:', subcategories.length, 'items');
      return subcategories;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
};

/**
 * Fetch all CSF controls
 */
export const useCSFControls = (
  options?: Omit<UseQueryOptions<CSFControl[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<CSFControl[], Error>({
    queryKey: csfKeys.controls(),
    queryFn: async () => {
      console.log('[useCSFControls] Fetching controls...');
      const response = await api.get<{ controls: any[]; total: number }>('/csf/controls');
      console.log('[useCSFControls] Raw response:', response.data);

      // Transform server response to match client type
      const controls = (response.data.controls || []).map((c: any) => ({
        id: c.id,
        subcategoryId: c.id,
        subcategoryCode: c.id,
        functionCode: c.functionId,
        functionName: getFunctionName(c.functionId),
        categoryCode: c.categoryId,
        categoryName: getCategoryName(c.categoryId),
        subcategoryName: c.title,
        description: c.text || '',
        implementationExamples: c.implementationExamples || [],
        nist80053Mappings: [],
      }));

      console.log('[useCSFControls] Transformed:', controls.length, 'controls');
      return controls;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
};

// Helper to get function name from code
function getFunctionName(code: string): string {
  const names: Record<string, string> = {
    'GV': 'Govern',
    'ID': 'Identify',
    'PR': 'Protect',
    'DE': 'Detect',
    'RS': 'Respond',
    'RC': 'Recover',
  };
  return names[code] || code;
}

// Helper to get category name from code
function getCategoryName(code: string): string {
  const names: Record<string, string> = {
    'GV.OC': 'Organizational Context',
    'GV.RM': 'Risk Management Strategy',
    'GV.RR': 'Roles, Responsibilities, and Authorities',
    'GV.PO': 'Policy',
    'GV.OV': 'Oversight',
    'GV.SC': 'Cybersecurity Supply Chain Risk Management',
    'ID.AM': 'Asset Management',
    'ID.RA': 'Risk Assessment',
    'ID.IM': 'Improvement',
    'PR.AA': 'Identity Management, Authentication, and Access Control',
    'PR.AT': 'Awareness and Training',
    'PR.DS': 'Data Security',
    'PR.PS': 'Platform Security',
    'PR.IR': 'Technology Infrastructure Resilience',
    'DE.CM': 'Continuous Monitoring',
    'DE.AE': 'Adverse Event Analysis',
    'RS.MA': 'Incident Management',
    'RS.AN': 'Incident Analysis',
    'RS.MI': 'Incident Mitigation',
    'RC.RP': 'Incident Recovery Plan Execution',
    'RC.CO': 'Incident Recovery Communication',
  };
  return names[code] || code;
}

/**
 * Fetch a single CSF control by ID with NIST 800-53 mappings
 */
export const useCSFControl = (
  id: string,
  options?: Omit<UseQueryOptions<CSFControl, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<CSFControl, Error>({
    queryKey: csfKeys.control(id),
    queryFn: async () => {
      console.log('[useCSFControl] Fetching control:', id);
      const response = await api.get<any>(`/csf/controls/${id}`);
      console.log('[useCSFControl] Raw response:', response.data);

      const c = response.data;
      const control: CSFControl = {
        id: c.id,
        subcategoryId: c.id,
        subcategoryCode: c.id,
        functionCode: c.functionId,
        functionName: getFunctionName(c.functionId),
        categoryCode: c.categoryId,
        categoryName: getCategoryName(c.categoryId),
        subcategoryName: c.title,
        description: c.text || '',
        implementationExamples: c.implementationExamples || [],
        nist80053Mappings: (c.nist80053Mappings || []).map((m: any) => ({
          id: m.id,
          controlId: m.nist80053Id,
          controlFamily: m.controlFamily,
          controlName: m.nist80053Id,
          priorityLevel: m.priority || 'P1',
          description: '',
        })),
      };

      console.log('[useCSFControl] Transformed:', control);
      return control;
    },
    enabled: !!id,
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
};

/**
 * Search CSF controls
 */
export const useCSFSearch = (
  params: CSFSearchParams,
  options?: Omit<UseQueryOptions<CSFControl[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<CSFControl[], Error>({
    queryKey: csfKeys.search(params),
    queryFn: async () => {
      const url = `/csf/search?q=${encodeURIComponent(params.query)}`;
      console.log('[useCSFSearch] Searching:', url);
      const response = await api.get<{ controls: any[]; total: number }>(url);
      console.log('[useCSFSearch] Raw response:', response.data);

      // Transform server response
      const controls = (response.data.controls || []).map((c: any) => ({
        id: c.id,
        subcategoryId: c.id,
        subcategoryCode: c.id,
        functionCode: c.functionId,
        functionName: getFunctionName(c.functionId),
        categoryCode: c.categoryId,
        categoryName: getCategoryName(c.categoryId),
        subcategoryName: c.title,
        description: c.text || '',
        implementationExamples: c.implementationExamples || [],
        nist80053Mappings: [],
      }));

      // Filter by function/category if specified
      let filtered = controls;
      if (params.functionCode) {
        filtered = filtered.filter((c: CSFControl) => c.functionCode === params.functionCode);
      }
      if (params.categoryCode) {
        filtered = filtered.filter((c: CSFControl) => c.categoryCode === params.categoryCode);
      }

      console.log('[useCSFSearch] Transformed:', filtered.length, 'results');
      return filtered;
    },
    enabled: !!params.query || !!params.functionCode || !!params.categoryCode,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook to get controls grouped by function
 */
export const useCSFControlsByFunction = (
  options?: Omit<UseQueryOptions<Record<string, CSFControl[]>, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<Record<string, CSFControl[]>, Error>({
    queryKey: [...csfKeys.controls(), 'by-function'],
    queryFn: async () => {
      console.log('[useCSFControlsByFunction] Fetching controls...');
      const response = await api.get<{ controls: any[]; total: number }>('/csf/controls');
      console.log('[useCSFControlsByFunction] Raw response:', response.data);

      // Transform and group controls by function code
      const grouped: Record<string, CSFControl[]> = {};

      (response.data.controls || []).forEach((c: any) => {
        const funcCode = c.functionId;
        if (!grouped[funcCode]) {
          grouped[funcCode] = [];
        }
        grouped[funcCode].push({
          id: c.id,
          subcategoryId: c.id,
          subcategoryCode: c.id,
          functionCode: c.functionId,
          functionName: getFunctionName(c.functionId),
          categoryCode: c.categoryId,
          categoryName: getCategoryName(c.categoryId),
          subcategoryName: c.title,
          description: c.text || '',
          implementationExamples: c.implementationExamples || [],
          nist80053Mappings: [],
        });
      });

      console.log('[useCSFControlsByFunction] Grouped by', Object.keys(grouped).length, 'functions');
      return grouped;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
};

/**
 * Hook to get controls grouped by category
 */
export const useCSFControlsByCategory = (
  options?: Omit<UseQueryOptions<Record<string, CSFControl[]>, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<Record<string, CSFControl[]>, Error>({
    queryKey: [...csfKeys.controls(), 'by-category'],
    queryFn: async () => {
      console.log('[useCSFControlsByCategory] Fetching controls...');
      const response = await api.get<{ controls: any[]; total: number }>('/csf/controls');
      console.log('[useCSFControlsByCategory] Raw response:', response.data);

      // Transform and group controls by category code
      const grouped: Record<string, CSFControl[]> = {};

      (response.data.controls || []).forEach((c: any) => {
        const catCode = c.categoryId;
        if (!grouped[catCode]) {
          grouped[catCode] = [];
        }
        grouped[catCode].push({
          id: c.id,
          subcategoryId: c.id,
          subcategoryCode: c.id,
          functionCode: c.functionId,
          functionName: getFunctionName(c.functionId),
          categoryCode: c.categoryId,
          categoryName: getCategoryName(c.categoryId),
          subcategoryName: c.title,
          description: c.text || '',
          implementationExamples: c.implementationExamples || [],
          nist80053Mappings: [],
        });
      });

      console.log('[useCSFControlsByCategory] Grouped by', Object.keys(grouped).length, 'categories');
      return grouped;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
};

/**
 * Hook to get all CSF data in a hierarchical structure
 */
export const useCSFHierarchy = (
  options?: Omit<UseQueryOptions<CSFFunction[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<CSFFunction[], Error>({
    queryKey: [...csfKeys.all, 'hierarchy'],
    queryFn: async () => {
      console.log('[useCSFHierarchy] Building hierarchy from controls...');
      const response = await api.get<{ controls: any[]; total: number }>('/csf/controls');
      console.log('[useCSFHierarchy] Raw response:', response.data);

      // Build hierarchy from flat controls list
      const functionsMap: Record<string, CSFFunction> = {};

      (response.data.controls || []).forEach((c: any) => {
        const funcId = c.functionId;
        const catId = c.categoryId;

        if (!functionsMap[funcId]) {
          functionsMap[funcId] = {
            id: funcId,
            code: funcId,
            name: getFunctionName(funcId),
            description: '',
            categories: [],
          };
        }

        let category = functionsMap[funcId].categories.find((cat) => cat.id === catId);
        if (!category) {
          category = {
            id: catId,
            functionId: funcId,
            code: catId,
            name: getCategoryName(catId),
            description: '',
            subcategories: [],
          };
          functionsMap[funcId].categories.push(category);
        }

        category.subcategories.push({
          id: c.id,
          categoryId: catId,
          code: c.id,
          name: c.title,
          description: c.text || '',
          implementationExamples: c.implementationExamples || [],
        });
      });

      const hierarchy = Object.values(functionsMap).sort((a, b) => a.code.localeCompare(b.code));
      console.log('[useCSFHierarchy] Built hierarchy with', hierarchy.length, 'functions');
      return hierarchy;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
};

/**
 * Hook to prefetch CSF data for better performance
 */
export const usePrefetchCSFData = () => {
  const { data: functions } = useCSFFunctions();
  const { data: controls } = useCSFControls();

  return {
    isLoaded: !!functions && !!controls,
    functionsCount: functions?.length || 0,
    controlsCount: controls?.length || 0,
  };
};

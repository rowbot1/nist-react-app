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
 * Official NIST CSF 2.0 Function Order
 * Per NIST SP 800-53: Govern → Identify → Protect → Detect → Respond → Recover
 */
export const CSF_FUNCTION_ORDER: readonly string[] = ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'] as const;

/**
 * Sort function codes according to NIST CSF 2.0 official order
 */
export const sortByCSFOrder = <T extends { code: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const indexA = CSF_FUNCTION_ORDER.indexOf(a.code);
    const indexB = CSF_FUNCTION_ORDER.indexOf(b.code);
    // If code not in list, put at end
    const orderA = indexA === -1 ? 999 : indexA;
    const orderB = indexB === -1 ? 999 : indexB;
    return orderA - orderB;
  });
};

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

      // Sort functions in official NIST CSF 2.0 order: GV → ID → PR → DE → RS → RC
      const sortedFunctions = sortByCSFOrder(functions);

      console.log('[useCSFFunctions] Transformed and sorted:', sortedFunctions);
      return sortedFunctions;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - CSF data changes infrequently
    ...options,
  });
};

// Helper to extract category code from subcategory ID (e.g., "DE.AE-01" -> "DE.AE")
function extractCategoryCode(subcategoryId: string): string {
  const match = subcategoryId.match(/^([A-Z]{2}\.[A-Z]{2})/);
  return match ? match[1] : subcategoryId;
}

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
      // Derive categories from controls since server categoryId is incorrect
      console.log('[useCSFCategories] Deriving categories from controls...');
      const response = await api.get<{ controls: any[]; total: number }>('/csf/controls');

      // Extract unique categories from controls
      const seen = new Set<string>();
      const categories: CSFCategory[] = [];

      (response.data.controls || []).forEach((c: any) => {
        const catCode = extractCategoryCode(c.id);
        if (!seen.has(catCode) && (!functionId || c.functionId === functionId)) {
          seen.add(catCode);
          categories.push({
            id: catCode,
            functionId: c.functionId,
            code: catCode,
            name: getCategoryName(catCode),
            description: getCategoryDescription(catCode),
            subcategories: [],
          });
        }
      });

      // Sort by code
      categories.sort((a, b) => a.code.localeCompare(b.code));
      console.log('[useCSFCategories] Derived:', categories.length, 'categories');
      return categories;
    },
    enabled: options?.enabled !== false, // Allow explicit disabling
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
};

// Helper to truncate text for display
function truncateText(text: string, maxLength: number = 80): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

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
          // Extract proper categoryId from subcategory code (e.g., "DE.AE-01" -> "DE.AE")
          const categoryId = extractCategoryCode(c.id);
          // Use description text as name since title is just "Control"
          const name = truncateText(c.text || c.title, 100);

          subcategories.push({
            id: c.id,
            categoryId: categoryId,
            code: c.id,
            name: name,
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

// Category data with names and descriptions
const CATEGORY_DATA: Record<string, { name: string; description: string }> = {
  'GV.OC': { name: 'Organizational Context', description: 'Understanding organizational context and priorities' },
  'GV.RM': { name: 'Risk Management Strategy', description: 'Risk management strategy and governance' },
  'GV.RR': { name: 'Roles, Responsibilities, and Authorities', description: 'Cybersecurity roles and responsibilities' },
  'GV.PO': { name: 'Policy', description: 'Organizational policies and procedures' },
  'GV.OV': { name: 'Oversight', description: 'Cybersecurity oversight and accountability' },
  'GV.SC': { name: 'Cybersecurity Supply Chain Risk Management', description: 'Supply chain risk management' },
  'ID.AM': { name: 'Asset Management', description: 'Identification and management of assets' },
  'ID.RA': { name: 'Risk Assessment', description: 'Risk identification and assessment' },
  'ID.IM': { name: 'Improvement', description: 'Continuous improvement processes' },
  'PR.AA': { name: 'Identity Management, Authentication, and Access Control', description: 'Access control and authentication' },
  'PR.AT': { name: 'Awareness and Training', description: 'Security awareness and training' },
  'PR.DS': { name: 'Data Security', description: 'Data protection and privacy' },
  'PR.PS': { name: 'Platform Security', description: 'Platform and infrastructure security' },
  'PR.IR': { name: 'Technology Infrastructure Resilience', description: 'Infrastructure resilience and recovery' },
  'DE.CM': { name: 'Continuous Monitoring', description: 'Continuous security monitoring' },
  'DE.AE': { name: 'Adverse Event Analysis', description: 'Analysis of security events' },
  'RS.MA': { name: 'Incident Management', description: 'Incident response management' },
  'RS.AN': { name: 'Incident Analysis', description: 'Incident analysis and response' },
  'RS.CO': { name: 'Incident Response Reporting and Communication', description: 'Incident communication and coordination' },
  'RS.MI': { name: 'Incident Mitigation', description: 'Incident mitigation activities' },
  'RC.RP': { name: 'Incident Recovery Plan Execution', description: 'Recovery planning and execution' },
  'RC.CO': { name: 'Incident Recovery Communication', description: 'Recovery communication' },
};

// Helper to get category name from code
function getCategoryName(code: string): string {
  return CATEGORY_DATA[code]?.name || code;
}

// Helper to get category description from code
function getCategoryDescription(code: string): string {
  return CATEGORY_DATA[code]?.description || '';
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
        // Extract proper categoryId from subcategory code (e.g., "DE.AE-01" -> "DE.AE")
        const catId = extractCategoryCode(c.id);

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
            description: getCategoryDescription(catId),
            subcategories: [],
          };
          functionsMap[funcId].categories.push(category);
        }

        // Use description text as name since title is just "Control"
        const subcategoryName = truncateText(c.text || c.title, 100);

        category.subcategories.push({
          id: c.id,
          categoryId: catId,
          code: c.id,
          name: subcategoryName,
          description: c.text || '',
          implementationExamples: c.implementationExamples || [],
        });
      });

      // Sort functions in official NIST CSF 2.0 order: GV → ID → PR → DE → RS → RC
      const hierarchy = sortByCSFOrder(Object.values(functionsMap));
      console.log('[useCSFHierarchy] Built hierarchy with', hierarchy.length, 'functions (sorted)');
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

/**
 * NIST 800-53 Mapping types
 */
export interface NIST80053MappingDetail {
  id: string;
  nist80053Id: string;
  controlFamily: string;
  priority: string;
}

export interface NIST80053MappingResponse {
  csfControl: {
    id: string;
    title: string;
    text: string;
  };
  totalMappings: number;
  mappings: NIST80053MappingDetail[];
  familySummary: {
    family: string;
    controlCount: number;
    controls: NIST80053MappingDetail[];
  }[];
}

/**
 * Fetch NIST 800-53 mappings for a specific CSF control
 */
export const useCSFMappings = (
  controlId: string,
  options?: Omit<UseQueryOptions<NIST80053MappingResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<NIST80053MappingResponse, Error>({
    queryKey: [...csfKeys.controls(), 'mappings', controlId],
    queryFn: async () => {
      console.log('[useCSFMappings] Fetching mappings for:', controlId);
      const response = await api.get<NIST80053MappingResponse>(`/csf/mappings/${controlId}`);
      console.log('[useCSFMappings] Response:', response.data);
      return response.data;
    },
    enabled: !!controlId && options?.enabled !== false,
    staleTime: 30 * 60 * 1000, // 30 minutes - mappings don't change
    ...options,
  });
};

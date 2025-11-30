/**
 * React Query Hooks for Risk Scoring API
 *
 * Provides hooks for fetching risk scores, heat maps, priorities,
 * and trends from the risk scoring endpoints.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Risk Score Response Types
 */
export interface RiskScoreWeights {
  complianceWeight: number;
  coverageWeight: number;
  criticalityWeight: number;
  functionWeights: Record<string, number>;
}

export interface FunctionRisk {
  functionCode: string;
  functionName: string;
  score: number;
  weight: number;
  weightedScore: number;
  assessedControls: number;
  totalControls: number;
  complianceRate: number;
}

export interface RiskScore {
  productId: string;
  productName: string;
  overallRiskScore: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  complianceScore: number;
  coverageScore: number;
  criticalityMultiplier: number;
  functionRisks: FunctionRisk[];
  recommendations: string[];
  calculatedAt: string;
}

export interface HeatMapCellControl {
  id: string;
  subcategoryId: string;
  subcategoryName: string;
  status: string;
}

export interface HeatMapCell {
  functionCode: string;
  functionName: string;
  categoryCode: string;
  categoryName: string;
  riskScore: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  complianceRate: number;
  assessedCount: number;
  totalCount: number;
  compliantCount: number;
  controls?: HeatMapCellControl[];
}

export interface HeatMapData {
  productId: string;
  productName: string;
  cells: HeatMapCell[];
  summary: {
    overallRiskScore: number;
    riskLevel: string;
    criticalCells: number;
    highRiskCells: number;
    mediumRiskCells: number;
    lowRiskCells: number;
  };
}

export interface RiskPriority {
  rank: number;
  subcategoryId: string;
  subcategoryName: string;
  functionCode: string;
  categoryCode: string;
  currentStatus: string;
  riskScore: number;
  riskLevel: string;
  effort: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  affectedSystems: number;
  recommendation: string;
}

export interface RiskTrendPoint {
  date: string;
  riskScore: number;
  complianceScore: number;
  assessedControls: number;
}

/**
 * Query Keys for React Query caching
 */
export const riskKeys = {
  all: ['risk'] as const,
  config: (productId: string) => [...riskKeys.all, 'config', productId] as const,
  score: (productId: string) => [...riskKeys.all, 'score', productId] as const,
  heatmap: (productId: string) => [...riskKeys.all, 'heatmap', productId] as const,
  priorities: (productId: string) => [...riskKeys.all, 'priorities', productId] as const,
  trends: (productId: string) => [...riskKeys.all, 'trends', productId] as const,
};

/**
 * Fetch risk scoring configuration for a product
 */
export const useRiskConfig = (
  productId: string,
  options?: Omit<UseQueryOptions<RiskScoreWeights, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RiskScoreWeights, Error>({
    queryKey: riskKeys.config(productId),
    queryFn: async () => {
      const response = await api.get(`/risk/config/${productId}`);
      return response.data;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Update risk scoring configuration
 */
export const useUpdateRiskConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      config,
    }: {
      productId: string;
      config: Partial<RiskScoreWeights>;
    }) => {
      const response = await api.put(`/risk/config/${productId}`, config);
      return response.data;
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: riskKeys.config(productId) });
      queryClient.invalidateQueries({ queryKey: riskKeys.score(productId) });
      queryClient.invalidateQueries({ queryKey: riskKeys.heatmap(productId) });
    },
  });
};

/**
 * Fetch risk score for a product
 */
export const useRiskScore = (
  productId: string,
  options?: Omit<UseQueryOptions<RiskScore, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RiskScore, Error>({
    queryKey: riskKeys.score(productId),
    queryFn: async () => {
      const response = await api.get(`/risk/score/${productId}`);
      return response.data;
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Fetch risk heat map data for a product
 */
export const useRiskHeatMap = (
  productId: string,
  options?: Omit<UseQueryOptions<HeatMapData, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<HeatMapData, Error>({
    queryKey: riskKeys.heatmap(productId),
    queryFn: async () => {
      const response = await api.get(`/risk/heatmap/${productId}`);
      return response.data;
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Fetch prioritized risk recommendations
 */
export const useRiskPriorities = (
  productId: string,
  options?: Omit<UseQueryOptions<RiskPriority[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RiskPriority[], Error>({
    queryKey: riskKeys.priorities(productId),
    queryFn: async () => {
      const response = await api.get(`/risk/priorities/${productId}`);
      return response.data.priorities || [];
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Fetch risk score trends over time
 */
export const useRiskTrends = (
  productId: string,
  days: number = 30,
  options?: Omit<UseQueryOptions<RiskTrendPoint[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RiskTrendPoint[], Error>({
    queryKey: [...riskKeys.trends(productId), days],
    queryFn: async () => {
      const response = await api.get(`/risk/trends/${productId}?days=${days}`);
      return response.data.trends || [];
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Custom hook to get risk summary with derived data
 */
export const useRiskSummary = (productId: string) => {
  const { data: riskScore, isLoading: scoreLoading, error: scoreError } = useRiskScore(productId);
  const { data: priorities, isLoading: prioritiesLoading } = useRiskPriorities(productId);

  const isLoading = scoreLoading || prioritiesLoading;

  // Calculate quick wins (low effort, high impact items)
  const quickWins = priorities?.filter(
    (p) => p.effort === 'Low' && (p.impact === 'High' || p.impact === 'Medium')
  ).slice(0, 5) || [];

  // Get top risks (highest risk scores)
  const topRisks = priorities?.slice(0, 5) || [];

  return {
    isLoading,
    error: scoreError,
    riskScore: riskScore?.overallRiskScore || 0,
    riskLevel: riskScore?.riskLevel || 'Low',
    complianceScore: riskScore?.complianceScore || 0,
    coverageScore: riskScore?.coverageScore || 0,
    functionRisks: riskScore?.functionRisks || [],
    recommendations: riskScore?.recommendations || [],
    quickWins,
    topRisks,
    totalPriorities: priorities?.length || 0,
  };
};

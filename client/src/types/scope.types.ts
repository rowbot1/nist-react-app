/**
 * Scope Types for Hierarchical Compliance
 *
 * Defines types for organizational scope navigation and compliance data.
 */

export type ScopeType = 'cc' | 'framework' | 'product' | 'system';

export interface OrganizationalScope {
  type: ScopeType | null;
  id: string | null;
  label: string | null;
}

export interface ComplianceMetrics {
  complianceScore: number;
  totalAssessments: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
  notAssessedCount: number;
}

export interface FunctionBreakdown {
  functionCode: string;
  functionName: string;
  complianceScore: number;
  totalControls: number;
  assessedControls: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
}

export interface ChildScope {
  type: ScopeType;
  id: string;
  name: string;
  complianceScore: number;
  criticality?: string;
}

export interface HierarchicalComplianceResponse {
  scope: {
    type: ScopeType | null;
    id: string | null;
    name: string;
  };
  rollup: ComplianceMetrics;
  functions: FunctionBreakdown[];
  children?: ChildScope[];
}

// URL query parameter interface
export interface ScopeQueryParams {
  scope?: ScopeType;
  id?: string;
}

// Helper to build scope from query params
export function buildScopeFromParams(params: URLSearchParams): OrganizationalScope {
  const scope = params.get('scope') as ScopeType | null;
  const id = params.get('id');

  if (scope && id) {
    return { type: scope, id, label: null };
  }

  return { type: null, id: null, label: null };
}

// Helper to build query params from scope
export function buildParamsFromScope(scope: OrganizationalScope): URLSearchParams {
  const params = new URLSearchParams();

  if (scope.type && scope.id) {
    params.set('scope', scope.type);
    params.set('id', scope.id);
  }

  return params;
}

// Scope display names
export const SCOPE_LABELS: Record<ScopeType, string> = {
  cc: 'Capability Centre',
  framework: 'Framework',
  product: 'Product',
  system: 'System',
};

// Get human-readable scope path
export function getScopeLabel(scope: OrganizationalScope): string {
  if (!scope.type || !scope.id) {
    return 'All Organizations';
  }

  return scope.label || SCOPE_LABELS[scope.type];
}

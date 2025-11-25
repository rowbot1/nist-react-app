# React Query Hooks - API Integration Layer

Comprehensive React Query hooks for the NIST Compliance Assessment Tool, providing type-safe API integration with caching, loading states, and optimistic updates.

## Overview

This API integration layer uses **@tanstack/react-query** for efficient data fetching and state management with:

- ✅ Automatic caching and cache invalidation
- ✅ Loading and error states
- ✅ Optimistic updates for better UX
- ✅ Full TypeScript type safety
- ✅ Automatic retries and refetching
- ✅ Request deduplication

## Installation & Setup

The required dependencies are already installed. Ensure React Query is configured in your app:

```typescript
// In your App.tsx or main entry point
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## Available Hooks

### Products (`useProducts.ts`)

```typescript
import { useProducts, useProduct, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks';

// Fetch all products
const { data: products, isLoading, error } = useProducts();

// Fetch single product
const { data: product } = useProduct(productId);

// Create product
const createMutation = useCreateProduct();
await createMutation.mutateAsync({ name: 'New Product', description: '...', owner: 'user@example.com' });

// Update product
const updateMutation = useUpdateProduct();
await updateMutation.mutateAsync({ id: productId, updates: { name: 'Updated Name' } });

// Delete product
const deleteMutation = useDeleteProduct();
await deleteMutation.mutateAsync(productId);
```

### Systems (`useSystems.ts`)

```typescript
import { useSystems, useSystem, useCreateSystem, useUpdateSystem, useDeleteSystem } from '@/hooks';

// Fetch all systems (optionally filtered by product)
const { data: systems } = useSystems(productId);

// Fetch single system
const { data: system } = useSystem(systemId);

// Create system
const createMutation = useCreateSystem();
await createMutation.mutateAsync({
  productId: 'prod-123',
  name: 'Production System',
  environment: 'production',
  criticality: 'high',
  owner: 'user@example.com',
});

// Update system
const updateMutation = useUpdateSystem();
await updateMutation.mutateAsync({ id: systemId, updates: { criticality: 'critical' } });

// Delete system
const deleteMutation = useDeleteSystem();
await deleteMutation.mutateAsync(systemId);
```

### Assessments (`useAssessments.ts`)

```typescript
import {
  useAssessments,
  useAssessment,
  useAssessmentMatrix,
  useUpdateAssessment,
  useBulkUpdateAssessments
} from '@/hooks';

// Fetch assessments with filtering
const { data: assessments } = useAssessments({
  productId: 'prod-123',
  systemId: 'sys-456',
  status: 'Partially Implemented',
  riskLevel: 'High',
});

// Fetch single assessment
const { data: assessment } = useAssessment(assessmentId);

// Fetch assessment matrix for product
const { data: matrix } = useAssessmentMatrix(productId);

// Update assessment
const updateMutation = useUpdateAssessment();
await updateMutation.mutateAsync({
  id: assessmentId,
  updates: {
    status: 'Implemented',
    implementationNotes: 'Completed on 2024-01-15',
  },
});

// Bulk update assessments
const bulkUpdateMutation = useBulkUpdateAssessments();
await bulkUpdateMutation.mutateAsync({
  assessmentIds: ['id1', 'id2', 'id3'],
  updates: { riskLevel: 'Medium' },
});
```

### CSF Controls (`useCSF.ts`)

```typescript
import {
  useCSFFunctions,
  useCSFCategories,
  useCSFControls,
  useCSFControl,
  useCSFSearch
} from '@/hooks';

// Fetch all CSF functions
const { data: functions } = useCSFFunctions();

// Fetch categories for a function
const { data: categories } = useCSFCategories(functionId);

// Fetch all controls
const { data: controls } = useCSFControls();

// Fetch single control with 800-53 mappings
const { data: control } = useCSFControl(controlId);

// Search controls
const { data: searchResults } = useCSFSearch({
  query: 'authentication',
  functionCode: 'PR',
});

// Get controls grouped by function
const { data: controlsByFunction } = useCSFControlsByFunction();

// Get controls grouped by category
const { data: controlsByCategory } = useCSFControlsByCategory();

// Prefetch CSF data for performance
const { isLoaded, controlsCount } = usePrefetchCSFData();
```

### Analytics (`useAnalytics.ts`)

```typescript
import {
  useAnalyticsOverview,
  useProductCompliance,
  useComplianceTrends,
  useGapAnalysis,
  useFunctionCompliance,
  useComplianceStats,
  useRiskSummary,
} from '@/hooks';

// Overall analytics
const { data: overview } = useAnalyticsOverview();

// Product compliance metrics
const { data: compliance } = useProductCompliance(productId);

// Compliance trends (last 30 days by default)
const { data: trends } = useComplianceTrends(30);

// Gap analysis
const { data: gaps } = useGapAnalysis(productId);

// Function-level compliance
const { data: functionCompliance } = useFunctionCompliance(productId);

// Custom hooks for aggregated data
const stats = useComplianceStats(productId);
const riskSummary = useRiskSummary(productId);
```

### Baselines (`useBaseline.ts`)

```typescript
import {
  useProductBaseline,
  useCreateBaseline,
  useUpdateBaseline,
  useBaselineControls,
  useHasBaseline,
} from '@/hooks';

// Fetch product baseline
const { data: baseline } = useProductBaseline(productId);

// Create baseline
const createMutation = useCreateBaseline();
await createMutation.mutateAsync({
  productId: 'prod-123',
  controlIds: ['ctrl-1', 'ctrl-2', 'ctrl-3'],
  description: 'Production baseline',
});

// Update baseline
const updateMutation = useUpdateBaseline();
await updateMutation.mutateAsync({
  productId: 'prod-123',
  updates: { controlIds: ['ctrl-1', 'ctrl-2', 'ctrl-3', 'ctrl-4'] },
});

// Manage baseline controls
const {
  baseline,
  controlIds,
  addControl,
  removeControl,
  setControls,
  hasControl,
  isUpdating,
} = useBaselineControls(productId);

// Check if baseline exists
const { hasBaseline, controlCount } = useHasBaseline(productId);
```

## API Service Layer

The centralized API service is located at `src/services/api.ts`:

```typescript
import api from '@/services/api';

// All hooks use this pre-configured axios instance
// Features:
// - Automatic JWT token injection from localStorage
// - Base URL configuration (http://localhost:3001/api)
// - Request/response interceptors
// - Automatic 401 handling (redirects to login)
// - Error handling utilities
```

## Type Safety

All API types are defined in `src/types/api.types.ts` and exported via `src/types/index.ts`:

```typescript
import type {
  Product,
  System,
  Assessment,
  CSFControl,
  ComplianceStatus,
  RiskLevel
} from '@/types';
```

## Cache Management

React Query automatically manages cache with intelligent invalidation:

- **Products**: Invalidates on create/update/delete
- **Systems**: Invalidates related product cache
- **Assessments**: Invalidates matrix, product, and system caches
- **Analytics**: Auto-refetches every 5 minutes
- **CSF Data**: Long cache (30 minutes) - rarely changes

### Manual Cache Invalidation

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { productKeys, assessmentKeys } from '@/hooks';

const queryClient = useQueryClient();

// Invalidate specific queries
queryClient.invalidateQueries({ queryKey: productKeys.lists() });
queryClient.invalidateQueries({ queryKey: assessmentKeys.matrix(productId) });

// Refetch immediately
queryClient.refetchQueries({ queryKey: productKeys.detail(productId) });
```

## Error Handling

All hooks include comprehensive error handling:

```typescript
const { data, isLoading, error } = useProducts();

if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;

// Or with mutations
const mutation = useCreateProduct({
  onError: (error) => {
    console.error('Failed to create product:', error.message);
    // Show toast notification, etc.
  },
  onSuccess: (product) => {
    console.log('Created product:', product);
  },
});
```

## Optimistic Updates

Many mutation hooks include optimistic updates for instant UI feedback:

```typescript
const updateMutation = useUpdateProduct();

// UI updates immediately, then rolls back if server request fails
await updateMutation.mutateAsync({
  id: productId,
  updates: { name: 'New Name' },
});
```

## Best Practices

1. **Use query keys** - Always use the exported key factories for consistency
2. **Enable/disable queries** - Use `enabled` option to control when queries run
3. **Handle loading states** - Always check `isLoading` before rendering data
4. **Error boundaries** - Wrap components in error boundaries for graceful failures
5. **Stale time** - Configure appropriate `staleTime` based on data volatility
6. **Prefetching** - Use prefetch hooks for data needed soon
7. **Pagination** - Use React Query's pagination patterns for large datasets

## Performance Tips

- CSF data has long cache times (30 minutes) - rarely changes
- Assessment data has shorter cache (2 minutes) - frequently updated
- Use `usePrefetchCSFData()` on app startup for better initial load
- Analytics auto-refetch every 5 minutes to keep dashboards current
- Optimistic updates provide instant feedback while server processes

## Debugging

Install React Query DevTools for development:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

This provides:
- Query cache inspection
- Network request monitoring
- Cache invalidation debugging
- Performance metrics

## API Base URL

Configure via environment variable:

```bash
# .env
REACT_APP_API_URL=http://localhost:3001
```

Default: `http://localhost:3001/api`

## Authentication

Authentication token is managed via `localStorage`:

```typescript
// Login sets token
localStorage.setItem('token', authToken);

// API service automatically adds to requests
// Authorization: Bearer <token>

// 401 responses automatically clear token and redirect to login
```

## Further Reading

- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/react.html)
- [Axios Documentation](https://axios-http.com/docs/intro)

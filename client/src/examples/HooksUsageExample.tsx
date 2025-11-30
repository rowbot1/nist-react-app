/**
 * React Query Hooks Usage Examples
 *
 * Demonstrates how to use the API integration layer hooks
 * in React components with proper TypeScript typing.
 */

import React, { useState } from 'react';
import {
  useProducts,
  useProduct,
  useCreateProduct,
  useSystems,
  useAssessmentMatrix,
  useCSFControls,
  useProductCompliance,
  useGapAnalysis,
  useProductBaseline,
  useUpdateBaseline,
} from '../hooks';
import type { CreateProductInput, ComplianceStatus } from '../types';

/**
 * Example 1: Product List Component
 */
export const ProductListExample: React.FC = () => {
  const { data: products, isLoading, error } = useProducts();
  const createMutation = useCreateProduct();

  const handleCreateProduct = async () => {
    const newProduct: CreateProductInput = {
      name: 'New Product',
      description: 'Example product',
      type: 'WEB_APPLICATION',
      criticality: 'MEDIUM',
      frameworkId: 'replace-with-actual-framework-id', // Example - replace with real framework ID
    };

    try {
      const product = await createMutation.mutateAsync(newProduct);
      console.log('Created product:', product);
    } catch (err) {
      console.error('Failed to create product:', err);
    }
  };

  if (isLoading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Products</h2>
      <button onClick={handleCreateProduct} disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create Product'}
      </button>
      <ul>
        {products?.map((product) => (
          <li key={product.id}>
            {product.name} - {product.description}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Example 2: Product Detail Component
 */
export const ProductDetailExample: React.FC<{ productId: string }> = ({ productId }) => {
  const { data: product, isLoading } = useProduct(productId);
  const { data: systems } = useSystems(productId);
  const { data: compliance } = useProductCompliance(productId);
  const { data: gaps } = useGapAnalysis(productId);

  if (isLoading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div>
      <h2>{product.name}</h2>
      <p>{product.description}</p>

      <h3>Compliance Score: {compliance?.complianceScore.toFixed(1)}%</h3>

      <h3>Systems ({systems?.length || 0})</h3>
      <ul>
        {systems?.map((system) => (
          <li key={system.id}>
            {system.name} - {system.environment} ({system.criticality})
          </li>
        ))}
      </ul>

      <h3>Gaps ({gaps?.totalGaps || 0})</h3>
      <p>
        Critical: {gaps?.criticalGaps || 0} | High Risk: {gaps?.highRiskGaps || 0}
      </p>
    </div>
  );
};

/**
 * Example 3: Assessment Matrix Component
 */
export const AssessmentMatrixExample: React.FC<{ productId: string }> = ({ productId }) => {
  const { data: matrix, isLoading } = useAssessmentMatrix(productId);

  if (isLoading) return <div>Loading matrix...</div>;
  if (!matrix) return <div>No data</div>;

  return (
    <div>
      <h2>Assessment Matrix</h2>
      <table>
        <thead>
          <tr>
            <th>Control</th>
            {matrix.systems.map((system) => (
              <th key={system.id}>{system.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.controlId}>
              <td>
                {row.subcategoryCode} - {row.subcategoryName}
              </td>
              {matrix.systems.map((system) => {
                const assessment = row.systems[system.id];
                return (
                  <td
                    key={system.id}
                    style={{
                      backgroundColor: getStatusColor(assessment?.status),
                    }}
                  >
                    {assessment?.status || 'Not Assessed'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Example 4: CSF Controls Browser
 */
export const CSFControlsExample: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: controls, isLoading } = useCSFControls();

  const filteredControls = controls?.filter(
    (control) =>
      control.subcategoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      control.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <h2>NIST CSF Controls</h2>
      <input
        type="text"
        placeholder="Search controls..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <p>Found {filteredControls?.length || 0} controls</p>
          {filteredControls?.map((control) => (
            <div key={control.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
              <h3>
                {control.subcategoryCode} - {control.subcategoryName}
              </h3>
              <p>{control.description}</p>
              <p>
                <strong>Function:</strong> {control.functionCode} - {control.functionName}
              </p>
              <p>
                <strong>Category:</strong> {control.categoryCode} - {control.categoryName}
              </p>
              {control.nist80053Mappings.length > 0 && (
                <div>
                  <strong>NIST 800-53 Mappings:</strong>
                  <ul>
                    {control.nist80053Mappings.map((mapping) => (
                      <li key={mapping.id}>
                        {mapping.controlId} - {mapping.controlName} ({mapping.priorityLevel})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Example 5: Baseline Configuration Component
 */
export const BaselineConfigExample: React.FC<{ productId: string }> = ({ productId }) => {
  const { data: baseline, isLoading: baselineLoading } = useProductBaseline(productId);
  const { data: allControls, isLoading: controlsLoading } = useCSFControls();
  const updateMutation = useUpdateBaseline();

  const handleToggleControl = async (controlId: string) => {
    if (!baseline) return;

    const controlIds = baseline.controlIds.includes(controlId)
      ? baseline.controlIds.filter((id) => id !== controlId)
      : [...baseline.controlIds, controlId];

    await updateMutation.mutateAsync({
      productId,
      updates: { controlIds },
    });
  };

  if (baselineLoading || controlsLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Baseline Configuration</h2>
      <p>
        Selected Controls: {baseline?.controlIds.length || 0} / {allControls?.length || 0}
      </p>

      <div>
        {allControls?.map((control) => {
          const isSelected = baseline?.controlIds.includes(control.id) || false;
          return (
            <div key={control.id} style={{ padding: '5px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleControl(control.id)}
                  disabled={updateMutation.isPending}
                />
                {control.subcategoryCode} - {control.subcategoryName}
              </label>
            </div>
          );
        })}
      </div>

      {updateMutation.isPending && <div>Updating baseline...</div>}
    </div>
  );
};

/**
 * Example 6: Compliance Dashboard
 */
export const ComplianceDashboardExample: React.FC<{ productId: string }> = ({ productId }) => {
  const { data: compliance } = useProductCompliance(productId);
  const { data: gaps } = useGapAnalysis(productId);

  if (!compliance) return <div>Loading...</div>;

  return (
    <div>
      <h2>Compliance Dashboard</h2>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <h3>Overall Score</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
            {compliance.complianceScore.toFixed(1)}%
          </div>
        </div>

        <div>
          <h3>Progress</h3>
          <p>
            Assessed: {compliance.assessedControls} / {compliance.totalControls}
          </p>
          <p>Systems: {compliance.systemCount}</p>
        </div>

        <div>
          <h3>Status Breakdown</h3>
          <ul>
            {Object.entries(compliance.statusBreakdown).map(([status, count]) => (
              <li key={status}>
                {status}: {count}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Risk Breakdown</h3>
          <ul>
            {Object.entries(compliance.riskBreakdown).map(([level, count]) => (
              <li key={level}>
                {level}: {count}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h3>Top Gaps</h3>
        <ul>
          {gaps?.gaps.slice(0, 10).map((gap) => (
            <li key={`${gap.controlId}-${gap.systemId}`}>
              {gap.subcategoryCode} - {gap.subcategoryName} ({gap.systemName}) - {gap.riskLevel}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3>System Scores</h3>
        <ul>
          {compliance.systemScores.map((system) => (
            <li key={system.systemId}>
              {system.systemName}: {system.complianceScore.toFixed(1)}%
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/**
 * Helper function to get color based on compliance status
 */
function getStatusColor(status?: ComplianceStatus): string {
  switch (status) {
    case 'Implemented':
      return '#4caf50';
    case 'Partially Implemented':
      return '#ff9800';
    case 'Not Implemented':
      return '#f44336';
    case 'Not Applicable':
      return '#9e9e9e';
    case 'Not Assessed':
    default:
      return '#ffffff';
  }
}

/**
 * Example 7: Complete App Integration
 */
export const CompleteAppExample: React.FC = () => {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const { data: products } = useProducts();

  return (
    <div>
      <h1>NIST Compliance Assessment Tool</h1>

      <div>
        <h2>Select Product</h2>
        <select
          value={selectedProductId || ''}
          onChange={(e) => setSelectedProductId(e.target.value || null)}
        >
          <option value="">-- Select Product --</option>
          {products?.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProductId && (
        <>
          <ProductDetailExample productId={selectedProductId} />
          <ComplianceDashboardExample productId={selectedProductId} />
        </>
      )}

      <CSFControlsExample />
    </div>
  );
};

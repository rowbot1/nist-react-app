/**
 * OrganizationalHub - Hierarchy-first landing page
 *
 * Displays organization structure with drill-down navigation:
 * - /org -> All Capability Centres (Organization Overview)
 * - /org?scope=cc&id=X -> Single CC with its Frameworks
 * - /org?scope=framework&id=X -> Framework with its Products
 * - /org?scope=product&id=X -> Product with its Systems
 */

import React, { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  LinearProgress,
  IconButton,
  Button,
  Alert,
  Skeleton,
  Divider,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Folder as FolderIcon,
  Inventory as ProductIcon,
  Computer as SystemIcon,
  ArrowBack as BackIcon,
  ArrowForward as ArrowForwardIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Security as SecurityIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { useOrganizationalHierarchy } from '../hooks/useCapabilityCentres';
import {
  HierarchyCapabilityCentre,
  HierarchyFramework,
  HierarchyProduct,
  HierarchySystem,
} from '../types/api.types';

type ScopeType = 'org' | 'cc' | 'framework' | 'product';

interface ScopeInfo {
  type: ScopeType;
  id?: string;
  name?: string;
  parentPath: { type: ScopeType; id: string; name: string }[];
}

// Helper to get compliance color
const getComplianceColor = (score: number): 'success' | 'warning' | 'error' | 'info' => {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  if (score >= 40) return 'error';
  return 'info';
};

// Helper to get compliance label
const getComplianceLabel = (score: number): string => {
  if (score >= 80) return 'Compliant';
  if (score >= 60) return 'Needs Attention';
  if (score >= 40) return 'At Risk';
  return 'Critical';
};

// Capability Centre Card
const CapabilityCentreCard: React.FC<{
  cc: HierarchyCapabilityCentre;
  onClick: () => void;
}> = ({ cc, onClick }) => (
  <Card
    sx={{
      height: '100%',
      borderLeft: 4,
      borderLeftColor: cc.color || 'primary.main',
    }}
  >
    <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BusinessIcon sx={{ color: cc.color || 'primary.main' }} />
          <Typography variant="h6" noWrap>{cc.name}</Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">Compliance</Typography>
            <Typography variant="body2" fontWeight={600} color={`${getComplianceColor(cc.complianceScore)}.main`}>
              {cc.complianceScore}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={cc.complianceScore}
            color={getComplianceColor(cc.complianceScore)}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={`${cc.frameworkCount} Frameworks`}
            icon={<FolderIcon />}
          />
          <Chip
            size="small"
            label={`${cc.frameworks.reduce((sum, fw) => sum + fw.productCount, 0)} Products`}
            variant="outlined"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Typography variant="body2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            View <ArrowForwardIcon fontSize="small" />
          </Typography>
        </Box>
      </CardContent>
    </CardActionArea>
  </Card>
);

// Framework Card
const FrameworkCard: React.FC<{
  framework: HierarchyFramework;
  onClick: () => void;
}> = ({ framework, onClick }) => (
  <Card
    sx={{
      height: '100%',
      borderLeft: 4,
      borderLeftColor: framework.color || 'secondary.main',
    }}
  >
    <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FolderIcon sx={{ color: framework.color || 'secondary.main' }} />
          <Typography variant="h6" noWrap>{framework.name}</Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">Compliance</Typography>
            <Typography variant="body2" fontWeight={600} color={`${getComplianceColor(framework.complianceScore)}.main`}>
              {framework.complianceScore}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={framework.complianceScore}
            color={getComplianceColor(framework.complianceScore)}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={`${framework.productCount} Products`}
            icon={<ProductIcon />}
          />
          <Chip
            size="small"
            label={`${framework.products.reduce((sum, p) => sum + p.systemCount, 0)} Systems`}
            variant="outlined"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Typography variant="body2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            View <ArrowForwardIcon fontSize="small" />
          </Typography>
        </Box>
      </CardContent>
    </CardActionArea>
  </Card>
);

// Product Card
const ProductCard: React.FC<{
  product: HierarchyProduct;
  onView: () => void;
  onAssess: () => void;
  onConfigureBaseline: () => void;
  hasBaseline: boolean;
}> = ({ product, onView, onAssess, onConfigureBaseline, hasBaseline }) => (
  <Card sx={{ height: '100%', minWidth: 280 }}>
    <CardContent sx={{ p: 2.5 }}>
      {/* Header with name and criticality */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
        <ProductIcon color="primary" sx={{ mt: 0.25 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={600} noWrap title={product.name}>
            {product.name}
          </Typography>
          <Chip
            size="small"
            label={product.criticality}
            color={product.criticality === 'HIGH' || product.criticality === 'CRITICAL' ? 'error' : 'default'}
            sx={{ mt: 0.5 }}
          />
        </Box>
      </Box>

      {/* Compliance score */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">Compliance</Typography>
          <Typography variant="body2" fontWeight={600} color={`${getComplianceColor(product.complianceScore)}.main`}>
            {product.complianceScore}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={product.complianceScore}
          color={getComplianceColor(product.complianceScore)}
          sx={{ height: 8, borderRadius: 1 }}
        />
      </Box>

      {/* Status chips - stacked for better readability */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
        <Chip
          size="small"
          label={`${product.systemCount} System${product.systemCount !== 1 ? 's' : ''}`}
          icon={<SystemIcon />}
          sx={{ justifyContent: 'flex-start' }}
        />
        {hasBaseline ? (
          <Chip
            size="small"
            label="Baseline Configured"
            color="success"
            variant="outlined"
            icon={<CheckCircleIcon />}
            sx={{ justifyContent: 'flex-start' }}
          />
        ) : (
          <Chip
            size="small"
            label="No Baseline - Configure"
            color="warning"
            variant="outlined"
            icon={<WarningIcon />}
            onClick={onConfigureBaseline}
            sx={{ justifyContent: 'flex-start', cursor: 'pointer', '&:hover': { bgcolor: 'warning.light', color: 'warning.contrastText' } }}
          />
        )}
      </Box>

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" variant="outlined" onClick={onView} fullWidth>
          Details
        </Button>
        {product.systemCount > 0 && (
          <Button
            size="small"
            variant="contained"
            onClick={onAssess}
            startIcon={<PlayArrowIcon />}
            fullWidth
          >
            Assess
          </Button>
        )}
      </Box>
    </CardContent>
  </Card>
);

// System Card
const SystemCard: React.FC<{
  system: HierarchySystem;
  productId: string;
  onAssess: () => void;
}> = ({ system, productId, onAssess }) => {
  const assessed = system.assessmentCount > 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <SystemIcon color="primary" />
          <Typography variant="h6" noWrap sx={{ flex: 1 }}>{system.name}</Typography>
          <Chip
            size="small"
            label={system.environment}
            color={system.environment === 'PRODUCTION' ? 'error' : 'default'}
            variant="outlined"
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">Compliance</Typography>
            <Typography variant="body2" fontWeight={600} color={`${getComplianceColor(system.complianceScore)}.main`}>
              {system.complianceScore}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={system.complianceScore}
            color={getComplianceColor(system.complianceScore)}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            size="small"
            label={`${system.assessmentCount} Assessments`}
          />
          <Chip
            size="small"
            label={system.criticality}
            color={system.criticality === 'HIGH' || system.criticality === 'CRITICAL' ? 'error' : 'default'}
            variant="outlined"
          />
        </Box>

        <Button
          size="small"
          variant="contained"
          onClick={onAssess}
          startIcon={assessed ? <PlayArrowIcon /> : <SecurityIcon />}
          fullWidth
        >
          {assessed ? 'Continue Assessment' : 'Start Assessment'}
        </Button>
      </CardContent>
    </Card>
  );
};

// Product Assessment Dashboard - Shows assessment status across all systems
const ProductAssessmentDashboard: React.FC<{
  product: HierarchyProduct;
  productId: string;
  onNavigateAssess: (systemId: string) => void;
}> = ({ product, productId, onNavigateAssess }) => {
  // Calculate aggregate stats
  const stats = useMemo(() => {
    const totalSystems = product.systems.length;
    const assessedSystems = product.systems.filter(s => s.assessmentCount > 0).length;
    const totalAssessments = product.systems.reduce((sum, s) => sum + s.assessmentCount, 0);
    const avgCompliance = totalSystems > 0
      ? Math.round(product.systems.reduce((sum, s) => sum + s.complianceScore, 0) / totalSystems)
      : 0;

    // Find systems needing attention
    const unassessedSystems = product.systems.filter(s => s.assessmentCount === 0);
    const criticalSystems = product.systems.filter(s => s.complianceScore < 50 && s.assessmentCount > 0);

    return {
      totalSystems,
      assessedSystems,
      totalAssessments,
      avgCompliance,
      unassessedSystems,
      criticalSystems,
      completionRate: totalSystems > 0 ? Math.round((assessedSystems / totalSystems) * 100) : 0,
    };
  }, [product.systems]);

  if (product.systems.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
      <Typography variant="h6" gutterBottom fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SecurityIcon color="primary" />
        Assessment Overview
      </Typography>

      <Grid container spacing={3} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main" fontWeight={700}>
              {stats.completionRate}%
            </Typography>
            <Typography variant="body2" color="text.secondary">Systems Assessed</Typography>
            <Typography variant="caption" color="text.secondary">
              {stats.assessedSystems} of {stats.totalSystems}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color={`${getComplianceColor(stats.avgCompliance)}.main`} fontWeight={700}>
              {stats.avgCompliance}%
            </Typography>
            <Typography variant="body2" color="text.secondary">Avg Compliance</Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700}>
              {stats.totalAssessments}
            </Typography>
            <Typography variant="body2" color="text.secondary">Total Assessments</Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color={stats.criticalSystems.length > 0 ? 'error.main' : 'success.main'} fontWeight={700}>
              {stats.criticalSystems.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Critical Systems</Typography>
            <Typography variant="caption" color="text.secondary">
              &lt;50% compliance
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      {(stats.unassessedSystems.length > 0 || stats.criticalSystems.length > 0) && (
        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {stats.unassessedSystems.length > 0 && (
              <Button
                variant="contained"
                size="small"
                startIcon={<PlayArrowIcon />}
                onClick={() => onNavigateAssess(stats.unassessedSystems[0].id)}
              >
                Start: {stats.unassessedSystems[0].name}
              </Button>
            )}
            {stats.criticalSystems.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<WarningIcon />}
                onClick={() => onNavigateAssess(stats.criticalSystems[0].id)}
              >
                Review: {stats.criticalSystems[0].name} ({stats.criticalSystems[0].complianceScore}%)
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

// Types for attention items
interface AttentionProduct {
  id: string;
  name: string;
  ccName: string;
  frameworkName: string;
  systemCount: number;
}

interface AttentionSystem {
  id: string;
  name: string;
  productId: string;
  productName: string;
  ccName: string;
  complianceScore: number;
  environment: string;
}

type AttentionType = 'products-no-baseline' | 'systems-not-assessed' | 'systems-critical-gaps';

// Health Summary Component
const HealthSummary: React.FC<{
  hierarchy: HierarchyCapabilityCentre[];
  onNavigate: (path: string) => void;
}> = ({ hierarchy, onNavigate }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<AttentionType | null>(null);

  const stats = useMemo(() => {
    let totalCCs = hierarchy.length;
    let totalFrameworks = 0;
    let totalProducts = 0;
    let totalSystems = 0;
    let totalScore = 0;
    const productsWithoutBaseline: AttentionProduct[] = [];
    const systemsNeverAssessed: AttentionSystem[] = [];
    const systemsWithCriticalGaps: AttentionSystem[] = [];

    hierarchy.forEach(cc => {
      totalFrameworks += cc.frameworkCount;
      totalScore += cc.complianceScore;

      cc.frameworks.forEach(fw => {
        totalProducts += fw.productCount;

        fw.products.forEach(prod => {
          totalSystems += prod.systemCount;
          // Assume no baseline if compliance is 0 with systems
          if (prod.complianceScore === 0 && prod.systemCount > 0) {
            productsWithoutBaseline.push({
              id: prod.id,
              name: prod.name,
              ccName: cc.name,
              frameworkName: fw.name,
              systemCount: prod.systemCount,
            });
          }

          prod.systems.forEach(sys => {
            if (sys.assessmentCount === 0) {
              systemsNeverAssessed.push({
                id: sys.id,
                name: sys.name,
                productId: prod.id,
                productName: prod.name,
                ccName: cc.name,
                complianceScore: sys.complianceScore,
                environment: sys.environment,
              });
            }
            if (sys.complianceScore < 50) {
              systemsWithCriticalGaps.push({
                id: sys.id,
                name: sys.name,
                productId: prod.id,
                productName: prod.name,
                ccName: cc.name,
                complianceScore: sys.complianceScore,
                environment: sys.environment,
              });
            }
          });
        });
      });
    });

    const avgCompliance = totalCCs > 0 ? Math.round(totalScore / totalCCs) : 0;

    return {
      totalCCs,
      totalFrameworks,
      totalProducts,
      totalSystems,
      avgCompliance,
      productsWithoutBaseline,
      systemsNeverAssessed,
      systemsWithCriticalGaps,
    };
  }, [hierarchy]);

  const handleChipClick = (type: AttentionType) => {
    setSelectedType(type);
    setDialogOpen(true);
  };

  const getDialogTitle = () => {
    switch (selectedType) {
      case 'products-no-baseline':
        return `${stats.productsWithoutBaseline.length} Products Without Baseline`;
      case 'systems-not-assessed':
        return `${stats.systemsNeverAssessed.length} Systems Never Assessed`;
      case 'systems-critical-gaps':
        return `${stats.systemsWithCriticalGaps.length} Systems With Critical Gaps`;
      default:
        return '';
    }
  };

  return (
    <>
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Your Organization
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', mb: 2 }}>
          <Box>
            <Typography variant="h3" color={`${getComplianceColor(stats.avgCompliance)}.main`} fontWeight={700}>
              {stats.avgCompliance}%
            </Typography>
            <Typography variant="body2" color="text.secondary">Overall Compliance</Typography>
          </Box>

          <Divider orientation="vertical" flexItem />

          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6">{stats.totalCCs}</Typography>
              <Typography variant="body2" color="text.secondary">Capability Centres</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6">{stats.totalFrameworks}</Typography>
              <Typography variant="body2" color="text.secondary">Frameworks</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6">{stats.totalProducts}</Typography>
              <Typography variant="body2" color="text.secondary">Products</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6">{stats.totalSystems}</Typography>
              <Typography variant="body2" color="text.secondary">Systems</Typography>
            </Box>
          </Box>
        </Box>

        {(stats.productsWithoutBaseline.length > 0 || stats.systemsNeverAssessed.length > 0 || stats.systemsWithCriticalGaps.length > 0) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1 }}>
              Needs Attention
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {stats.productsWithoutBaseline.length > 0 && (
                <Chip
                  icon={<WarningIcon />}
                  label={`${stats.productsWithoutBaseline.length} products without baseline`}
                  color="warning"
                  size="small"
                  onClick={() => handleChipClick('products-no-baseline')}
                  sx={{ cursor: 'pointer', '&:hover': { transform: 'scale(1.02)' } }}
                />
              )}
              {stats.systemsNeverAssessed.length > 0 && (
                <Chip
                  icon={<WarningIcon />}
                  label={`${stats.systemsNeverAssessed.length} systems never assessed`}
                  color="warning"
                  size="small"
                  onClick={() => handleChipClick('systems-not-assessed')}
                  sx={{ cursor: 'pointer', '&:hover': { transform: 'scale(1.02)' } }}
                />
              )}
              {stats.systemsWithCriticalGaps.length > 0 && (
                <Chip
                  icon={<WarningIcon />}
                  label={`${stats.systemsWithCriticalGaps.length} systems with critical gaps`}
                  color="error"
                  size="small"
                  onClick={() => handleChipClick('systems-critical-gaps')}
                  sx={{ cursor: 'pointer', '&:hover': { transform: 'scale(1.02)' } }}
                />
              )}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Attention Items Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color={selectedType === 'systems-critical-gaps' ? 'error' : 'warning'} />
          {getDialogTitle()}
        </DialogTitle>
        <DialogContent>
          <List sx={{ pt: 0 }}>
            {selectedType === 'products-no-baseline' && stats.productsWithoutBaseline.map((product) => (
              <ListItem key={product.id} disablePadding>
                <ListItemButton onClick={() => { setDialogOpen(false); onNavigate(`/products/${product.id}/baseline`); }}>
                  <ListItemIcon>
                    <ProductIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={product.name}
                    secondary={`${product.ccName} → ${product.frameworkName} • ${product.systemCount} system${product.systemCount !== 1 ? 's' : ''}`}
                  />
                  <Button size="small" variant="outlined">
                    Configure
                  </Button>
                </ListItemButton>
              </ListItem>
            ))}
            {selectedType === 'systems-not-assessed' && stats.systemsNeverAssessed.map((system) => (
              <ListItem key={system.id} disablePadding>
                <ListItemButton onClick={() => { setDialogOpen(false); onNavigate(`/assess/${system.productId}/${system.id}`); }}>
                  <ListItemIcon>
                    <SystemIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={system.name}
                    secondary={`${system.ccName} → ${system.productName} • ${system.environment}`}
                  />
                  <Button size="small" variant="contained" startIcon={<PlayArrowIcon />}>
                    Assess
                  </Button>
                </ListItemButton>
              </ListItem>
            ))}
            {selectedType === 'systems-critical-gaps' && stats.systemsWithCriticalGaps.map((system) => (
              <ListItem key={system.id} disablePadding>
                <ListItemButton onClick={() => { setDialogOpen(false); onNavigate(`/assess/${system.productId}/${system.id}`); }}>
                  <ListItemIcon>
                    <SystemIcon color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary={system.name}
                    secondary={`${system.ccName} → ${system.productName} • ${system.complianceScore}% compliant`}
                  />
                  <Button size="small" variant="contained" color="error" startIcon={<PlayArrowIcon />}>
                    Review
                  </Button>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Main Component
const OrganizationalHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { data: hierarchy = [], isLoading, error } = useOrganizationalHierarchy();

  // Parse current scope from URL
  const scopeInfo = useMemo((): ScopeInfo => {
    const scope = searchParams.get('scope') as ScopeType | null;
    const id = searchParams.get('id');

    if (!scope || !id) {
      return { type: 'org', parentPath: [] };
    }

    // Find the item in hierarchy and build parent path
    const parentPath: ScopeInfo['parentPath'] = [];

    if (scope === 'cc') {
      const cc = hierarchy.find(c => c.id === id);
      return { type: 'cc', id, name: cc?.name, parentPath };
    }

    if (scope === 'framework') {
      for (const cc of hierarchy) {
        const fw = cc.frameworks.find(f => f.id === id);
        if (fw) {
          parentPath.push({ type: 'cc', id: cc.id, name: cc.name });
          return { type: 'framework', id, name: fw.name, parentPath };
        }
      }
    }

    if (scope === 'product') {
      for (const cc of hierarchy) {
        for (const fw of cc.frameworks) {
          const prod = fw.products.find(p => p.id === id);
          if (prod) {
            parentPath.push({ type: 'cc', id: cc.id, name: cc.name });
            parentPath.push({ type: 'framework', id: fw.id, name: fw.name });
            return { type: 'product', id, name: prod.name, parentPath };
          }
        }
      }
    }

    return { type: 'org', parentPath: [] };
  }, [searchParams, hierarchy]);

  // Get current scope data
  const scopeData = useMemo(() => {
    if (scopeInfo.type === 'org') {
      return { type: 'org', items: hierarchy };
    }

    if (scopeInfo.type === 'cc') {
      const cc = hierarchy.find(c => c.id === scopeInfo.id);
      return { type: 'cc', cc, items: cc?.frameworks || [] };
    }

    if (scopeInfo.type === 'framework') {
      for (const cc of hierarchy) {
        const fw = cc.frameworks.find(f => f.id === scopeInfo.id);
        if (fw) {
          return { type: 'framework', cc, framework: fw, items: fw.products || [] };
        }
      }
    }

    if (scopeInfo.type === 'product') {
      for (const cc of hierarchy) {
        for (const fw of cc.frameworks) {
          const prod = fw.products.find(p => p.id === scopeInfo.id);
          if (prod) {
            return { type: 'product', cc, framework: fw, product: prod, items: prod.systems || [] };
          }
        }
      }
    }

    return { type: 'org', items: hierarchy };
  }, [hierarchy, scopeInfo]);

  // Navigation helpers
  const navigateToScope = (type: ScopeType, id?: string) => {
    if (type === 'org') {
      setSearchParams({});
    } else if (id) {
      setSearchParams({ scope: type, id });
    }
  };

  const navigateBack = () => {
    if (scopeInfo.parentPath.length > 0) {
      const parent = scopeInfo.parentPath[scopeInfo.parentPath.length - 1];
      navigateToScope(parent.type, parent.id);
    } else {
      navigateToScope('org');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={150} sx={{ mb: 3, borderRadius: 2 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load organizational hierarchy. Please try again.
        </Alert>
      </Box>
    );
  }

  if (hierarchy.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <SecurityIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" gutterBottom>Welcome to Posture</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Get started by creating your first Capability Centre
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/settings')}
          startIcon={<BusinessIcon />}
        >
          Create Capability Centre
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      {scopeInfo.type !== 'org' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={navigateBack} size="small">
            <BackIcon />
          </IconButton>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigateToScope('org')}
              sx={{ cursor: 'pointer' }}
            >
              Organization
            </Link>
            {scopeInfo.parentPath.map((item, index) => (
              <Link
                key={item.id}
                component="button"
                variant="body2"
                onClick={() => navigateToScope(item.type, item.id)}
                sx={{ cursor: 'pointer' }}
              >
                {item.name}
              </Link>
            ))}
            <Typography color="text.primary">{scopeInfo.name}</Typography>
          </Breadcrumbs>
        </Box>
      )}

      {/* Health Summary - only at org level */}
      {scopeInfo.type === 'org' && <HealthSummary hierarchy={hierarchy} onNavigate={navigate} />}

      {/* Scope Header - when drilling down */}
      {scopeInfo.type !== 'org' && scopeData.type !== 'org' && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={600}>{scopeInfo.name}</Typography>
              <Typography color="text.secondary">
                {scopeData.type === 'cc' && `${(scopeData as any).cc?.frameworkCount || 0} Frameworks`}
                {scopeData.type === 'framework' && `${(scopeData as any).framework?.productCount || 0} Products`}
                {scopeData.type === 'product' && `${(scopeData as any).product?.systemCount || 0} Systems`}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {scopeData.type === 'cc' && (
                <Typography variant="h3" color={`${getComplianceColor((scopeData as any).cc?.complianceScore || 0)}.main`} fontWeight={700}>
                  {(scopeData as any).cc?.complianceScore || 0}%
                </Typography>
              )}
              {scopeData.type === 'framework' && (
                <Typography variant="h3" color={`${getComplianceColor((scopeData as any).framework?.complianceScore || 0)}.main`} fontWeight={700}>
                  {(scopeData as any).framework?.complianceScore || 0}%
                </Typography>
              )}
              {scopeData.type === 'product' && (
                <>
                  <Typography variant="h3" color={`${getComplianceColor((scopeData as any).product?.complianceScore || 0)}.main`} fontWeight={700}>
                    {(scopeData as any).product?.complianceScore || 0}%
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/products/${scopeInfo.id}/baseline`)}
                    startIcon={<SecurityIcon />}
                  >
                    Configure Baseline
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Paper>
      )}

      {/* Product Assessment Dashboard - only at product level */}
      {scopeInfo.type === 'product' && scopeData.type === 'product' && (scopeData as any).product && (
        <ProductAssessmentDashboard
          product={(scopeData as any).product}
          productId={scopeInfo.id!}
          onNavigateAssess={(systemId) => navigate(`/assess/${scopeInfo.id}/${systemId}`)}
        />
      )}

      {/* Content Grid */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        {scopeInfo.type === 'org' && 'Capability Centres'}
        {scopeInfo.type === 'cc' && 'Frameworks'}
        {scopeInfo.type === 'framework' && 'Products'}
        {scopeInfo.type === 'product' && 'Systems'}
      </Typography>

      <Grid container spacing={3}>
        {/* Org level - show CCs */}
        {scopeInfo.type === 'org' && hierarchy.map(cc => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={cc.id}>
            <CapabilityCentreCard
              cc={cc}
              onClick={() => navigateToScope('cc', cc.id)}
            />
          </Grid>
        ))}

        {/* CC level - show Frameworks */}
        {scopeInfo.type === 'cc' && scopeData.type === 'cc' && (scopeData as any).items.map((fw: HierarchyFramework) => (
          <Grid item xs={12} sm={6} md={4} key={fw.id}>
            <FrameworkCard
              framework={fw}
              onClick={() => navigateToScope('framework', fw.id)}
            />
          </Grid>
        ))}

        {/* Framework level - show Products */}
        {scopeInfo.type === 'framework' && scopeData.type === 'framework' && (scopeData as any).items.map((prod: HierarchyProduct) => (
          <Grid item xs={12} sm={6} md={4} key={prod.id}>
            <ProductCard
              product={prod}
              onView={() => navigate(`/products/${prod.id}`)}
              onAssess={() => {
                // Navigate to first system's assessment
                if (prod.systems.length > 0) {
                  navigate(`/assess/${prod.id}/${prod.systems[0].id}`);
                }
              }}
              onConfigureBaseline={() => navigate(`/products/${prod.id}/baseline`)}
              hasBaseline={prod.complianceScore > 0 || prod.systems.some(s => s.assessmentCount > 0)}
            />
          </Grid>
        ))}

        {/* Product level - show Systems */}
        {scopeInfo.type === 'product' && scopeData.type === 'product' && (scopeData as any).items.map((sys: HierarchySystem) => (
          <Grid item xs={12} sm={6} md={4} key={sys.id}>
            <SystemCard
              system={sys}
              productId={scopeInfo.id!}
              onAssess={() => navigate(`/assess/${scopeInfo.id}/${sys.id}`)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Empty state for drilling down */}
      {scopeInfo.type !== 'org' && (scopeData as any).items?.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {scopeInfo.type === 'cc' && 'No frameworks in this Capability Centre yet.'}
            {scopeInfo.type === 'framework' && 'No products in this Framework yet.'}
            {scopeInfo.type === 'product' && 'No systems in this Product yet.'}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default OrganizationalHub;

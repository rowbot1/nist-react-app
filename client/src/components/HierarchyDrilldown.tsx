/**
 * HierarchyDrilldown Component
 *
 * PRIMARY navigation through organizational hierarchy:
 * Capability Centre → Framework → Product → System
 *
 * Features:
 * - Prominent "You Are Here" location bar
 * - Clear visual affordances (arrows, "View X items")
 * - Colour-coded compliance cards
 * - Intuitive breadcrumb navigation
 * - Summary metrics for current level
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Breadcrumbs,
  Link,
  LinearProgress,
  Grid,
  Chip,
  Skeleton,
  useTheme,
  alpha,
  IconButton,
  Divider,
  Paper,
} from '@mui/material';
import {
  Business as CapabilityCentreIcon,
  Folder as FrameworkIcon,
  Inventory as ProductIcon,
  Computer as SystemIcon,
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
  ArrowBack as ArrowBackIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrganizationalHierarchy } from '../hooks';
import type { ScopeType, OrganizationalScope } from '../types/scope.types';

type DrilldownLevel = 'capability-centre' | 'framework' | 'product' | 'system';

interface DrilldownState {
  level: DrilldownLevel;
  selectedCapabilityCentreId: string | null;
  selectedFrameworkId: string | null;
  selectedProductId: string | null;
}

// Consistent accent color for all hierarchy levels (no color changes during navigation)
const HIERARCHY_ACCENT_COLOR = '#6366f1'; // Indigo - consistent across all levels

// Level metadata for display
const LEVEL_META: Record<DrilldownLevel, {
  icon: React.ReactElement;
  label: string;
  childLabel: string;
}> = {
  'capability-centre': {
    icon: <CapabilityCentreIcon />,
    label: 'Capability Centres',
    childLabel: 'frameworks',
  },
  'framework': {
    icon: <FrameworkIcon />,
    label: 'Frameworks',
    childLabel: 'products',
  },
  'product': {
    icon: <ProductIcon />,
    label: 'Products',
    childLabel: 'systems',
  },
  'system': {
    icon: <SystemIcon />,
    label: 'Systems',
    childLabel: 'assessments',
  },
};

const getComplianceColor = (score: number): string => {
  if (score >= 80) return '#3fb950'; // Green
  if (score >= 60) return '#58a6ff'; // Blue
  if (score >= 40) return '#d29922'; // Yellow/Orange
  return '#f85149'; // Red
};

const getComplianceLabel = (score: number): string => {
  if (score >= 80) return 'Compliant';
  if (score >= 60) return 'Mostly Compliant';
  if (score >= 40) return 'Partial';
  return 'Non-Compliant';
};

interface NavigationCardProps {
  name: string;
  code?: string;
  icon: React.ReactNode;
  complianceScore: number;
  count: number;
  countLabel: string;
  onClick: () => void;
  isSystem?: boolean;
}

const NavigationCard: React.FC<NavigationCardProps> = ({
  name,
  code,
  icon,
  complianceScore,
  count,
  countLabel,
  onClick,
  isSystem = false,
}) => {
  const theme = useTheme();
  const scoreColor = getComplianceColor(complianceScore);

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 0.2s ease',
        background: `linear-gradient(135deg, ${alpha(scoreColor, 0.12)} 0%, ${alpha(scoreColor, 0.04)} 100%)`,
        border: `1px solid ${alpha(scoreColor, 0.25)}`,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${alpha(scoreColor, 0.2)}`,
          border: `1px solid ${alpha(scoreColor, 0.5)}`,
          '& .drill-arrow': {
            transform: 'translateX(4px)',
            color: scoreColor,
          },
        },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2.5 }}>
          {/* Top row: Icon + Score */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: alpha(scoreColor, 0.15),
                color: scoreColor,
              }}
            >
              {icon}
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  color: scoreColor,
                  fontFamily: '"JetBrains Mono", monospace',
                  lineHeight: 1,
                  fontSize: '1.75rem',
                }}
              >
                {complianceScore}%
              </Typography>
              <Chip
                size="small"
                label={getComplianceLabel(complianceScore)}
                sx={{
                  mt: 0.5,
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: alpha(scoreColor, 0.15),
                  color: scoreColor,
                  border: `1px solid ${alpha(scoreColor, 0.3)}`,
                }}
              />
            </Box>
          </Box>

          {/* Name */}
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5, lineHeight: 1.3 }}>
            {name}
          </Typography>

          {/* Code badge */}
          {code && (
            <Chip
              size="small"
              label={code}
              sx={{
                alignSelf: 'flex-start',
                mb: 1,
                height: 20,
                fontSize: '0.65rem',
                bgcolor: alpha(theme.palette.text.primary, 0.06),
              }}
            />
          )}

          {/* Spacer */}
          <Box sx={{ flex: 1, minHeight: 8 }} />

          {/* Progress bar */}
          <LinearProgress
            variant="determinate"
            value={complianceScore}
            sx={{
              mb: 1.5,
              height: 6,
              borderRadius: 3,
              bgcolor: alpha(scoreColor, 0.15),
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                bgcolor: scoreColor,
              },
            }}
          />

          {/* Bottom row: Count + Arrow */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {count} {countLabel}
            </Typography>
            <Box
              className="drill-arrow"
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: 'text.disabled',
                transition: 'all 0.2s ease',
              }}
            >
              <Typography variant="caption" sx={{ mr: 0.5 }}>
                {isSystem ? 'View details' : 'Drill down'}
              </Typography>
              <ChevronRightIcon fontSize="small" />
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

interface HierarchyDrilldownProps {
  onScopeChange?: (scope: OrganizationalScope) => void;
  syncToUrl?: boolean;
}

const HierarchyDrilldown: React.FC<HierarchyDrilldownProps> = ({
  onScopeChange,
  syncToUrl = true,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: hierarchy, isLoading, error } = useOrganizationalHierarchy();

  const [state, setState] = useState<DrilldownState>({
    level: 'capability-centre',
    selectedCapabilityCentreId: null,
    selectedFrameworkId: null,
    selectedProductId: null,
  });

  // Sync state from URL params (handles browser back/forward)
  useEffect(() => {
    if (!syncToUrl || !hierarchy || hierarchy.length === 0) return;

    const scopeType = searchParams.get('scope') as ScopeType | null;
    const scopeId = searchParams.get('id');

    // No scope in URL = show all capability centres
    if (!scopeType || !scopeId) {
      setState((prev) => {
        // Only update if different to avoid loops
        if (prev.level === 'capability-centre' && !prev.selectedCapabilityCentreId) {
          return prev;
        }
        return {
          level: 'capability-centre',
          selectedCapabilityCentreId: null,
          selectedFrameworkId: null,
          selectedProductId: null,
        };
      });
      return;
    }

    // Find the entity in hierarchy and set appropriate state
    if (scopeType === 'cc') {
      const cc = hierarchy.find((c) => c.id === scopeId);
      if (cc) {
        setState((prev) => {
          if (prev.level === 'framework' && prev.selectedCapabilityCentreId === scopeId) {
            return prev;
          }
          return {
            level: 'framework',
            selectedCapabilityCentreId: scopeId,
            selectedFrameworkId: null,
            selectedProductId: null,
          };
        });
      }
    } else if (scopeType === 'framework') {
      // Find which CC contains this framework
      let found = false;
      for (const cc of hierarchy) {
        const framework = cc.frameworks.find((f) => f.id === scopeId);
        if (framework) {
          setState((prev) => {
            if (prev.level === 'product' && prev.selectedFrameworkId === scopeId) {
              return prev;
            }
            return {
              level: 'product',
              selectedCapabilityCentreId: cc.id,
              selectedFrameworkId: scopeId,
              selectedProductId: null,
            };
          });
          found = true;
          break;
        }
        if (found) break;
      }
    } else if (scopeType === 'product') {
      // Find which CC and framework contains this product
      outerLoop: for (const cc of hierarchy) {
        for (const framework of cc.frameworks) {
          const product = framework.products.find((p) => p.id === scopeId);
          if (product) {
            setState((prev) => {
              if (prev.level === 'system' && prev.selectedProductId === scopeId) {
                return prev;
              }
              return {
                level: 'system',
                selectedCapabilityCentreId: cc.id,
                selectedFrameworkId: framework.id,
                selectedProductId: scopeId,
              };
            });
            break outerLoop;
          }
        }
      }
    }
  }, [searchParams, hierarchy, syncToUrl]);

  const updateScope = useCallback((
    scopeType: ScopeType | null,
    scopeId: string | null,
    scopeLabel: string | null
  ) => {
    if (onScopeChange) {
      onScopeChange({ type: scopeType, id: scopeId, label: scopeLabel });
    }
    if (syncToUrl) {
      const newParams = new URLSearchParams(searchParams);
      if (scopeType && scopeId) {
        newParams.set('scope', scopeType);
        newParams.set('id', scopeId);
        if (scopeLabel) newParams.set('label', scopeLabel);
        else newParams.delete('label');
      } else {
        newParams.delete('scope');
        newParams.delete('id');
        newParams.delete('label');
      }
      setSearchParams(newParams);
    }
  }, [onScopeChange, syncToUrl, searchParams, setSearchParams]);

  // Current selections
  const currentCC = useMemo(() => {
    if (!hierarchy || !state.selectedCapabilityCentreId) return null;
    return hierarchy.find((cc) => cc.id === state.selectedCapabilityCentreId) || null;
  }, [hierarchy, state.selectedCapabilityCentreId]);

  const currentFramework = useMemo(() => {
    if (!currentCC || !state.selectedFrameworkId) return null;
    return currentCC.frameworks.find((f) => f.id === state.selectedFrameworkId) || null;
  }, [currentCC, state.selectedFrameworkId]);

  const currentProduct = useMemo(() => {
    if (!currentFramework || !state.selectedProductId) return null;
    return currentFramework.products.find((p) => p.id === state.selectedProductId) || null;
  }, [currentFramework, state.selectedProductId]);

  // Calculate current level metrics
  const currentMetrics = useMemo(() => {
    if (state.level === 'capability-centre' && hierarchy) {
      const totalScore = hierarchy.reduce((sum, cc) => sum + cc.complianceScore, 0);
      return {
        avgScore: hierarchy.length > 0 ? Math.round(totalScore / hierarchy.length) : 0,
        itemCount: hierarchy.length,
      };
    }
    if (state.level === 'framework' && currentCC) {
      const totalScore = currentCC.frameworks.reduce((sum, f) => sum + f.complianceScore, 0);
      return {
        avgScore: currentCC.frameworks.length > 0 ? Math.round(totalScore / currentCC.frameworks.length) : 0,
        itemCount: currentCC.frameworks.length,
      };
    }
    if (state.level === 'product' && currentFramework) {
      const totalScore = currentFramework.products.reduce((sum, p) => sum + p.complianceScore, 0);
      return {
        avgScore: currentFramework.products.length > 0 ? Math.round(totalScore / currentFramework.products.length) : 0,
        itemCount: currentFramework.products.length,
      };
    }
    if (state.level === 'system' && currentProduct) {
      const totalScore = currentProduct.systems.reduce((sum, s) => sum + s.complianceScore, 0);
      return {
        avgScore: currentProduct.systems.length > 0 ? Math.round(totalScore / currentProduct.systems.length) : 0,
        itemCount: currentProduct.systems.length,
      };
    }
    return { avgScore: 0, itemCount: 0 };
  }, [state.level, hierarchy, currentCC, currentFramework, currentProduct]);

  // Handlers
  const handleCapabilityCentreClick = useCallback((ccId: string, ccName: string) => {
    setState({ level: 'framework', selectedCapabilityCentreId: ccId, selectedFrameworkId: null, selectedProductId: null });
    updateScope('cc', ccId, ccName);
  }, [updateScope]);

  const handleFrameworkClick = useCallback((frameworkId: string, frameworkName: string) => {
    setState((prev) => ({ ...prev, level: 'product', selectedFrameworkId: frameworkId, selectedProductId: null }));
    updateScope('framework', frameworkId, frameworkName);
  }, [updateScope]);

  const handleProductClick = useCallback((productId: string, productName: string) => {
    setState((prev) => ({ ...prev, level: 'system', selectedProductId: productId }));
    updateScope('product', productId, productName);
  }, [updateScope]);

  const handleSystemClick = useCallback((systemId: string, _systemName: string) => {
    // Don't update URL scope - just navigate to system details page
    // This way browser back returns to the product level (showing systems)
    navigate(`/systems/${systemId}`);
  }, [navigate]);

  const handleBack = useCallback(() => {
    // Navigate UP the hierarchy: System → Product → Framework → CC (home)
    // The scope represents the PARENT container of what's currently being displayed
    switch (state.level) {
      case 'framework':
        // Currently showing frameworks in a CC, go back to showing all CCs
        setState({ level: 'capability-centre', selectedCapabilityCentreId: null, selectedFrameworkId: null, selectedProductId: null });
        updateScope(null, null, null);
        break;
      case 'product':
        // Currently showing products in a Framework, go back to showing frameworks in the CC
        setState((prev) => ({ ...prev, level: 'framework', selectedFrameworkId: null, selectedProductId: null }));
        if (currentCC) updateScope('cc', currentCC.id, currentCC.name);
        break;
      case 'system':
        // Currently showing systems in a Product, go back to showing products in the Framework
        setState((prev) => ({ ...prev, level: 'product', selectedProductId: null }));
        if (currentFramework) updateScope('framework', currentFramework.id, currentFramework.name);
        break;
    }
  }, [state.level, currentCC, currentFramework, updateScope]);

  const handleBreadcrumbClick = useCallback((level: DrilldownLevel) => {
    switch (level) {
      case 'capability-centre':
        setState({ level: 'capability-centre', selectedCapabilityCentreId: null, selectedFrameworkId: null, selectedProductId: null });
        updateScope(null, null, null);
        break;
      case 'framework':
        setState((prev) => ({ ...prev, level: 'framework', selectedFrameworkId: null, selectedProductId: null }));
        if (currentCC) updateScope('cc', currentCC.id, currentCC.name);
        break;
      case 'product':
        setState((prev) => ({ ...prev, level: 'product', selectedProductId: null }));
        if (currentFramework) updateScope('framework', currentFramework.id, currentFramework.name);
        break;
    }
  }, [currentCC, currentFramework, updateScope]);

  // Loading state
  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2, mb: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', bgcolor: alpha(theme.palette.error.main, 0.05) }}>
        <Typography color="error">Failed to load organizational hierarchy</Typography>
      </Paper>
    );
  }

  // Empty state
  if (!hierarchy || hierarchy.length === 0) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <CapabilityCentreIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" color="text.secondary" gutterBottom>
          No Capability Centres
        </Typography>
        <Typography variant="body1" color="text.disabled">
          Create capability centres to organize your frameworks and track compliance
        </Typography>
      </Paper>
    );
  }

  const levelMeta = LEVEL_META[state.level];
  const levelColor = HIERARCHY_ACCENT_COLOR; // Consistent color - no changes during navigation

  return (
    <Box>
      {/* ═══════════════════════════════════════════════════════════════════════
          LOCATION BAR - "You Are Here" - Always prominent at top
          ═══════════════════════════════════════════════════════════════════════ */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2.5,
          background: `linear-gradient(135deg, ${alpha(levelColor, 0.08)} 0%, ${alpha(levelColor, 0.02)} 100%)`,
          border: `1px solid ${alpha(levelColor, 0.2)}`,
          borderRadius: 2,
        }}
      >
        {/* Top: Back button + Breadcrumbs */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {state.level !== 'capability-centre' && (
            <IconButton
              size="small"
              onClick={handleBack}
              sx={{
                bgcolor: alpha(levelColor, 0.1),
                color: levelColor,
                '&:hover': { bgcolor: alpha(levelColor, 0.2) },
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}

          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" sx={{ color: alpha(theme.palette.text.primary, 0.3) }} />}
          >
            <Link
              component="button"
              onClick={() => handleBreadcrumbClick('capability-centre')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: state.level === 'capability-centre' ? levelColor : 'text.secondary',
                fontWeight: state.level === 'capability-centre' ? 600 : 400,
                textDecoration: 'none',
                fontSize: '0.875rem',
                '&:hover': { color: levelColor },
              }}
            >
              <HomeIcon sx={{ fontSize: 18 }} />
              All Centres
            </Link>

            {currentCC && (
              <Link
                component="button"
                onClick={() => handleBreadcrumbClick('framework')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: state.level === 'framework' ? levelColor : 'text.secondary',
                  fontWeight: state.level === 'framework' ? 600 : 400,
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  '&:hover': { color: levelColor },
                }}
              >
                <CapabilityCentreIcon sx={{ fontSize: 18 }} />
                {currentCC.name}
              </Link>
            )}

            {currentFramework && (
              <Link
                component="button"
                onClick={() => handleBreadcrumbClick('product')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: state.level === 'product' ? levelColor : 'text.secondary',
                  fontWeight: state.level === 'product' ? 600 : 400,
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  '&:hover': { color: levelColor },
                }}
              >
                <FrameworkIcon sx={{ fontSize: 18 }} />
                {currentFramework.name}
              </Link>
            )}

            {currentProduct && (
              <Typography
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: levelColor,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                <ProductIcon sx={{ fontSize: 18 }} />
                {currentProduct.name}
              </Typography>
            )}
          </Breadcrumbs>
        </Box>

        <Divider sx={{ my: 2, borderColor: alpha(levelColor, 0.15) }} />

        {/* Bottom: Current level title + Summary metrics */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: alpha(levelColor, 0.15),
                color: levelColor,
              }}
            >
              {levelMeta.icon}
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                {state.level === 'capability-centre' && 'All Capability Centres'}
                {state.level === 'framework' && `${currentCC?.name} - Frameworks`}
                {state.level === 'product' && `${currentFramework?.name} - Products`}
                {state.level === 'system' && `${currentProduct?.name} - Systems`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {state.level === 'capability-centre' && `${currentMetrics.itemCount} capability centres in your organization`}
                {state.level === 'framework' && `${currentMetrics.itemCount} frameworks in this capability centre`}
                {state.level === 'product' && `${currentMetrics.itemCount} products in this framework`}
                {state.level === 'system' && `${currentMetrics.itemCount} systems in this product`}
              </Typography>
            </Box>
          </Box>

          {/* Summary metrics */}
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: getComplianceColor(currentMetrics.avgScore) }}>
                <TrendingUpIcon fontSize="small" />
                <Typography variant="h5" fontWeight={700}>
                  {currentMetrics.avgScore}%
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Avg. Compliance
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: levelColor }}>
                <AssessmentIcon fontSize="small" />
                <Typography variant="h5" fontWeight={700}>
                  {currentMetrics.itemCount}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {levelMeta.childLabel.charAt(0).toUpperCase() + levelMeta.childLabel.slice(1)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ═══════════════════════════════════════════════════════════════════════
          NAVIGATION CARDS - Click to drill down
          ═══════════════════════════════════════════════════════════════════════ */}
      {state.level === 'capability-centre' && (
        <Grid container spacing={3}>
          {hierarchy.map((cc) => (
            <Grid item xs={12} sm={6} md={4} key={cc.id}>
              <NavigationCard
                name={cc.name}
                code={cc.code || undefined}
                icon={<CapabilityCentreIcon />}
                complianceScore={cc.complianceScore}
                count={cc.frameworkCount}
                countLabel="frameworks"
                onClick={() => handleCapabilityCentreClick(cc.id, cc.name)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {state.level === 'framework' && currentCC && (
        currentCC.frameworks.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
            <FrameworkIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No frameworks in this capability centre</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {currentCC.frameworks.map((framework) => (
              <Grid item xs={12} sm={6} md={4} key={framework.id}>
                <NavigationCard
                  name={framework.name}
                  code={framework.code || undefined}
                  icon={<FrameworkIcon />}
                  complianceScore={framework.complianceScore}
                  count={framework.productCount}
                  countLabel="products"
                  onClick={() => handleFrameworkClick(framework.id, framework.name)}
                />
              </Grid>
            ))}
          </Grid>
        )
      )}

      {state.level === 'product' && currentFramework && (
        currentFramework.products.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
            <ProductIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No products in this framework</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {currentFramework.products.map((product) => (
              <Grid item xs={12} sm={6} md={4} key={product.id}>
                <NavigationCard
                  name={product.name}
                  icon={<ProductIcon />}
                  complianceScore={product.complianceScore}
                  count={product.systemCount}
                  countLabel="systems"
                  onClick={() => handleProductClick(product.id, product.name)}
                />
              </Grid>
            ))}
          </Grid>
        )
      )}

      {state.level === 'system' && currentProduct && (
        currentProduct.systems.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
            <SystemIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No systems in this product</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {currentProduct.systems.map((system) => (
              <Grid item xs={12} sm={6} md={4} key={system.id}>
                <NavigationCard
                  name={system.name}
                  icon={<SystemIcon />}
                  complianceScore={system.complianceScore}
                  count={system.assessmentCount}
                  countLabel="assessments"
                  onClick={() => handleSystemClick(system.id, system.name)}
                  isSystem
                />
              </Grid>
            ))}
          </Grid>
        )
      )}
    </Box>
  );
};

export default HierarchyDrilldown;

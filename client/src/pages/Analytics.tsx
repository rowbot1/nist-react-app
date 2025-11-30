import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Tooltip,
  LinearProgress,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Collapse,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Error as ErrorIcon,
  Remove as StableIcon,
  Business as CCIcon,
  AccountTree as FrameworkIcon,
  Inventory as ProductIcon,
  Computer as SystemIcon,
} from '@mui/icons-material';
import { RiskHeatMap } from '../components/RiskHeatMap';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  useAnalyticsOverview,
  useComplianceTrends,
  useFunctionCompliance,
  useGapAnalysis,
  useProducts,
} from '../hooks';
import { useOrganizationalHierarchy } from '../hooks/useCapabilityCentres';
import type { ComplianceStatus, HierarchyCapabilityCentre, HierarchyFramework, HierarchyProduct, HierarchySystem } from '../types/api.types';
import { useNavigate } from 'react-router-dom';

// Color scheme for charts
const COLORS = {
  COMPLIANT: '#22c55e', // green-500
  PARTIALLY_COMPLIANT: '#f59e0b', // amber-500
  NON_COMPLIANT: '#ef4444', // red-500
  NOT_ASSESSED: '#6b7280', // gray-500
  NOT_APPLICABLE: '#d1d5db', // gray-300
  IMPLEMENTED: '#22c55e',
  'Partially Implemented': '#f59e0b',
  'Not Implemented': '#ef4444',
  'Not Assessed': '#6b7280',
  'Not Applicable': '#d1d5db',
};

// Helper to get compliance status indicator
const getComplianceIndicator = (score: number, assessmentCount?: number) => {
  if (assessmentCount === 0) return { icon: <StableIcon fontSize="small" />, color: '#6b7280', label: 'Not Assessed' };
  if (score >= 80) return { icon: <CheckCircleIcon fontSize="small" />, color: '#22c55e', label: 'Compliant' };
  if (score >= 60) return { icon: <WarningIcon fontSize="small" />, color: '#f59e0b', label: 'Partial' };
  return { icon: <ErrorIcon fontSize="small" />, color: '#ef4444', label: 'Needs Attention' };
};

// Hierarchical Row Component for expandable table
interface HierarchyRowProps {
  level: 'cc' | 'framework' | 'product' | 'system';
  data: HierarchyCapabilityCentre | HierarchyFramework | HierarchyProduct | HierarchySystem;
  depth: number;
  onNavigate?: (path: string) => void;
  productId?: string; // For system rows, to enable navigation to assessments
}

const HierarchyRow: React.FC<HierarchyRowProps & { children?: React.ReactNode }> = ({
  level,
  data,
  depth,
  onNavigate,
  productId,
  children
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = children !== undefined;

  const score = data.complianceScore || 0;
  const assessmentCount = 'assessmentCount' in data ? data.assessmentCount : undefined;
  const indicator = getComplianceIndicator(score, assessmentCount);

  const icons = {
    cc: <CCIcon sx={{ color: '#6366f1' }} />,
    framework: <FrameworkIcon sx={{ color: '#8b5cf6' }} />,
    product: <ProductIcon sx={{ color: '#0ea5e9' }} />,
    system: <SystemIcon sx={{ color: '#14b8a6' }} />,
  };

  const getSubtitle = () => {
    if (level === 'cc') {
      const cc = data as HierarchyCapabilityCentre;
      return `${cc.frameworkCount} frameworks`;
    }
    if (level === 'framework') {
      const fw = data as HierarchyFramework;
      return `${fw.productCount} products`;
    }
    if (level === 'product') {
      const prod = data as HierarchyProduct;
      return `${prod.systemCount} systems`;
    }
    if (level === 'system') {
      const sys = data as HierarchySystem;
      return `${sys.environment} - ${sys.criticality}`;
    }
    return '';
  };

  const isClickable = level === 'product' || level === 'system';

  const handleRowClick = () => {
    if (!onNavigate) return;
    if (level === 'product') {
      onNavigate(`/products/${data.id}`);
    } else if (level === 'system' && productId) {
      onNavigate(`/products/${productId}/assessments?systemId=${data.id}`);
    }
  };

  const handleSystemsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onNavigate) return;
    if (level === 'product') {
      onNavigate(`/products/${data.id}`);
    }
  };

  const handleAssessmentsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onNavigate) return;
    if (level === 'system' && productId) {
      onNavigate(`/products/${productId}/assessments?systemId=${data.id}`);
    }
  };

  return (
    <>
      <TableRow
        hover
        sx={{
          '& > td': { borderBottom: expanded ? 'none' : undefined },
          cursor: isClickable ? 'pointer' : 'default',
          bgcolor: depth === 0 ? 'grey.50' : depth === 1 ? 'grey.25' : 'transparent',
          '&:hover': isClickable ? { bgcolor: 'action.hover' } : {},
        }}
        onClick={isClickable ? handleRowClick : undefined}
      >
        <TableCell sx={{ pl: 2 + depth * 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {hasChildren && (
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            )}
            {!hasChildren && <Box sx={{ width: 28 }} />}
            {icons[level]}
            <Box>
              <Typography variant="body2" fontWeight={depth < 2 ? 'bold' : 'normal'}>
                {data.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getSubtitle()}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell align="center">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <Box sx={{ color: indicator.color }}>{indicator.icon}</Box>
            <Typography variant="body2" sx={{ color: indicator.color, fontWeight: 'bold' }}>
              {score}%
            </Typography>
          </Box>
        </TableCell>
        <TableCell align="center">
          <Chip
            label={indicator.label}
            size="small"
            sx={{
              bgcolor: `${indicator.color}20`,
              color: indicator.color,
              fontWeight: 'medium',
            }}
          />
        </TableCell>
        <TableCell align="right">
          {level === 'system' && (
            <Chip
              label={`${(data as HierarchySystem).assessmentCount} assessments`}
              size="small"
              variant="outlined"
              onClick={handleAssessmentsClick}
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' },
              }}
            />
          )}
          {level === 'product' && (
            <Chip
              label={`${(data as HierarchyProduct).systemCount} systems`}
              size="small"
              variant="outlined"
              onClick={handleSystemsClick}
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' },
              }}
            />
          )}
          {level === 'framework' && (
            <Typography variant="body2" color="text.secondary">
              {(data as HierarchyFramework).productCount} products
            </Typography>
          )}
          {level === 'cc' && (
            <Typography variant="body2" color="text.secondary">
              {(data as HierarchyCapabilityCentre).frameworkCount} frameworks
            </Typography>
          )}
        </TableCell>
      </TableRow>
      {hasChildren && (
        <TableRow>
          <TableCell colSpan={4} sx={{ p: 0, border: 0 }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Table size="small">
                <TableBody>{children}</TableBody>
              </Table>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<number>(30);
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [selectedCCId, setSelectedCCId] = useState<string>('all');
  const [heatmapDialogOpen, setHeatmapDialogOpen] = useState(false);
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{
    functionCode: string;
    categoryCode: string;
  } | null>(null);

  // Fetch data
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();
  const { data: trends, isLoading: trendsLoading } = useComplianceTrends(dateRange);
  const { data: functionCompliance, isLoading: functionLoading } = useFunctionCompliance(
    selectedProductId === 'all' ? undefined : selectedProductId
  );
  const { data: gaps } = useGapAnalysis(
    selectedProductId === 'all' ? '' : selectedProductId,
    { enabled: selectedProductId !== 'all' }
  );
  const { data: products } = useProducts();
  const { data: hierarchy, isLoading: hierarchyLoading } = useOrganizationalHierarchy();

  const isLoading = overviewLoading || trendsLoading || functionLoading || hierarchyLoading;

  // Handle CC filter change
  const handleCCChange = (event: SelectChangeEvent<string>) => {
    setSelectedCCId(event.target.value);
  };

  // Filter hierarchy based on selected CC
  const filteredHierarchy = useMemo(() => {
    if (!hierarchy) return [];
    if (selectedCCId === 'all') return hierarchy;
    return hierarchy.filter(cc => cc.id === selectedCCId);
  }, [hierarchy, selectedCCId]);

  // Handle date range change
  const handleDateRangeChange = (event: SelectChangeEvent<number>) => {
    setDateRange(event.target.value as number);
  };

  // Handle product filter change
  const handleProductChange = (event: SelectChangeEvent<string>) => {
    setSelectedProductId(event.target.value);
  };

  // Calculate trend from overview
  const complianceTrend = useMemo(() => {
    if (!trends || trends.length < 2) return 0;
    const latest = trends[trends.length - 1]?.complianceScore || 0;
    const previous = trends[trends.length - 2]?.complianceScore || 0;
    return latest - previous;
  }, [trends]);

  // Prepare radar chart data for Capability Centres
  const radarData = useMemo(() => {
    if (!hierarchy || hierarchy.length === 0) return [];
    return hierarchy.map((cc) => ({
      function: cc.name.length > 15 ? cc.name.substring(0, 15) + '...' : cc.name,
      fullName: cc.name,
      compliance: Math.round(cc.complianceScore || 0),
      fullMark: 100,
    }));
  }, [hierarchy]);

  // Prepare system status distribution by Capability Centre for stacked bar chart
  const ccStatusDistribution = useMemo(() => {
    if (!hierarchy || hierarchy.length === 0) return [];

    return hierarchy.map((cc) => {
      // Count systems by compliance level within this CC
      let compliant = 0;
      let partial = 0;
      let needsAttention = 0;
      let notAssessed = 0;

      cc.frameworks.forEach((framework) => {
        framework.products.forEach((product) => {
          product.systems.forEach((system) => {
            const score = system.complianceScore || 0;
            if (system.assessmentCount === 0) {
              notAssessed++;
            } else if (score >= 80) {
              compliant++;
            } else if (score >= 60) {
              partial++;
            } else {
              needsAttention++;
            }
          });
        });
      });

      const total = compliant + partial + needsAttention + notAssessed;

      return {
        name: cc.name.length > 20 ? cc.name.substring(0, 20) + '...' : cc.name,
        fullName: cc.name,
        Compliant: compliant,
        Partial: partial,
        'Needs Attention': needsAttention,
        'Not Assessed': notAssessed,
        total,
      };
    });
  }, [hierarchy]);

  // Prepare Framework compliance bar chart data - aggregate by framework NAME to combine same-named frameworks
  const frameworkComplianceData = useMemo(() => {
    if (!filteredHierarchy || filteredHierarchy.length === 0) return [];

    // Use a Map to aggregate frameworks by NAME (combining same-named frameworks across CCs)
    const frameworkMap = new Map<string, {
      name: string;
      fullName: string;
      scores: number[];
      ccNames: string[];
      productCount: number;
      systemCount: number;
    }>();

    filteredHierarchy.forEach((cc) => {
      cc.frameworks.forEach((fw) => {
        const key = fw.name.toLowerCase(); // Aggregate by name (case-insensitive)
        const existing = frameworkMap.get(key);
        if (existing) {
          // Aggregate: add score and CC name, sum products
          existing.scores.push(fw.complianceScore || 0);
          if (!existing.ccNames.includes(cc.name)) {
            existing.ccNames.push(cc.name);
          }
          existing.productCount += fw.productCount;
          // Count systems from products
          fw.products.forEach(p => {
            existing.systemCount += p.systemCount;
          });
        } else {
          let systemCount = 0;
          fw.products.forEach(p => {
            systemCount += p.systemCount;
          });
          frameworkMap.set(key, {
            name: fw.name.length > 18 ? fw.name.substring(0, 18) + '...' : fw.name,
            fullName: fw.name,
            scores: [fw.complianceScore || 0],
            ccNames: [cc.name],
            productCount: fw.productCount,
            systemCount,
          });
        }
      });
    });

    // Convert to array and calculate average score
    const frameworks = Array.from(frameworkMap.values()).map((fw) => ({
      name: fw.name,
      fullName: fw.fullName,
      score: Math.round(fw.scores.reduce((a, b) => a + b, 0) / fw.scores.length),
      ccName: fw.ccNames.length > 2
        ? `${fw.ccNames.slice(0, 2).join(', ')} +${fw.ccNames.length - 2} more`
        : fw.ccNames.join(', '),
      productCount: fw.productCount,
      systemCount: fw.systemCount,
    }));

    return frameworks.sort((a, b) => a.score - b.score); // Sort by score (lowest first)
  }, [filteredHierarchy]);

  // Compute "Attention Required" data - systems needing immediate attention
  const attentionRequired = useMemo(() => {
    if (!hierarchy || hierarchy.length === 0) {
      return {
        criticalSystems: [] as { name: string; score: number; ccName: string; frameworkName: string; productName: string; productId: string }[],
        unassessedSystems: [] as { name: string; ccName: string; frameworkName: string; productName: string; productId: string }[],
        decliningFrameworks: [] as { name: string; ccName: string; score: number }[],
        totalCritical: 0,
        totalUnassessed: 0,
      };
    }

    const criticalSystems: { name: string; score: number; ccName: string; frameworkName: string; productName: string; productId: string }[] = [];
    const unassessedSystems: { name: string; ccName: string; frameworkName: string; productName: string; productId: string }[] = [];

    hierarchy.forEach((cc) => {
      cc.frameworks.forEach((fw) => {
        fw.products.forEach((product) => {
          product.systems.forEach((system) => {
            if (system.assessmentCount === 0) {
              unassessedSystems.push({
                name: system.name,
                ccName: cc.name,
                frameworkName: fw.name,
                productName: product.name,
                productId: product.id,
              });
            } else if (system.complianceScore < 60) {
              criticalSystems.push({
                name: system.name,
                score: system.complianceScore,
                ccName: cc.name,
                frameworkName: fw.name,
                productName: product.name,
                productId: product.id,
              });
            }
          });
        });
      });
    });

    // Sort critical systems by score (worst first)
    criticalSystems.sort((a, b) => a.score - b.score);

    return {
      criticalSystems: criticalSystems.slice(0, 5), // Top 5 worst
      unassessedSystems: unassessedSystems.slice(0, 5), // Top 5 unassessed
      decliningFrameworks: [], // Would need historical data to compute
      totalCritical: criticalSystems.length,
      totalUnassessed: unassessedSystems.length,
    };
  }, [hierarchy]);

  // Prepare top gaps data
  const topGaps = useMemo(() => {
    if (!gaps || selectedProductId === 'all') return [];

    // Group gaps by control and count systems affected
    const gapMap = new Map<string, {
      controlId: string;
      subcategoryCode: string;
      subcategoryName: string;
      systemsAffected: Set<string>;
      riskLevel: string;
      statuses: ComplianceStatus[];
    }>();

    gaps.gaps.forEach((gap) => {
      const key = gap.subcategoryCode;
      if (!gapMap.has(key)) {
        gapMap.set(key, {
          controlId: gap.controlId,
          subcategoryCode: gap.subcategoryCode,
          subcategoryName: gap.subcategoryName,
          systemsAffected: new Set([gap.systemId]),
          riskLevel: gap.riskLevel,
          statuses: [gap.status],
        });
      } else {
        const existing = gapMap.get(key)!;
        existing.systemsAffected.add(gap.systemId);
        existing.statuses.push(gap.status);
      }
    });

    return Array.from(gapMap.values())
      .map((gap) => ({
        ...gap,
        systemsAffected: gap.systemsAffected.size,
        priority: gap.riskLevel === 'Critical' ? 1 : gap.riskLevel === 'High' ? 2 : gap.riskLevel === 'Medium' ? 3 : 4,
      }))
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 10);
  }, [gaps, selectedProductId]);

  // Export report handler
  const handleExportReport = () => {
    console.log('Exporting analytics report...');
    // TODO: Implement export functionality
  };

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }} align="center">
          Loading analytics data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Compliance Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Capability Centre</InputLabel>
            <Select value={selectedCCId} label="Capability Centre" onChange={handleCCChange}>
              <MenuItem value="all">All Capability Centres</MenuItem>
              {hierarchy?.map((cc) => (
                <MenuItem key={cc.id} value={cc.id}>
                  {cc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Date Range</InputLabel>
            <Select value={dateRange} label="Date Range" onChange={handleDateRangeChange}>
              <MenuItem value={30}>Last 30 days</MenuItem>
              <MenuItem value={90}>Last 90 days</MenuItem>
              <MenuItem value={365}>Last 1 year</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Product</InputLabel>
            <Select value={selectedProductId} label="Product" onChange={handleProductChange}>
              <MenuItem value="all">All Products</MenuItem>
              {products?.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportReport}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Overall Compliance Score */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Overall Compliance
                  </Typography>
                  <Typography variant="h3" component="div" fontWeight="bold">
                    {overview ? Math.round(overview.averageCompliance) : 0}%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    {complianceTrend >= 0 ? (
                      <TrendingUpIcon color="success" fontSize="small" />
                    ) : (
                      <TrendingDownIcon color="error" fontSize="small" />
                    )}
                    <Typography
                      variant="body2"
                      color={complianceTrend >= 0 ? 'success.main' : 'error.main'}
                      sx={{ ml: 0.5 }}
                    >
                      {Math.abs(complianceTrend).toFixed(1)}% vs last period
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Assessments */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Assessments
                  </Typography>
                  <Typography variant="h3" component="div" fontWeight="bold">
                    {overview?.totalAssessments || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Across {overview?.totalProducts || 0} products
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <AssessmentIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Critical Gaps */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Critical Gaps
                  </Typography>
                  <Typography variant="h3" component="div" fontWeight="bold">
                    {(overview?.criticalRiskCount || 0) + (overview?.highRiskCount || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {overview?.criticalRiskCount || 0} critical, {overview?.highRiskCount || 0} high
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <WarningIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Controls Coverage */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Controls Coverage
                  </Typography>
                  <Typography variant="h3" component="div" fontWeight="bold">
                    {overview?.totalAssessments || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    of {overview?.totalAssessments || 0} controls assessed
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <InfoIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Attention Required Section */}
      {(attentionRequired.totalCritical > 0 || attentionRequired.totalUnassessed > 0) && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Alert
              severity="warning"
              sx={{
                '& .MuiAlert-message': { width: '100%' },
                bgcolor: 'warning.light',
                border: '1px solid',
                borderColor: 'warning.main',
              }}
            >
              <AlertTitle sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                Attention Required
              </AlertTitle>
              <Grid container spacing={3}>
                {/* Critical Systems */}
                {attentionRequired.totalCritical > 0 && (
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <ErrorIcon color="error" />
                      <Typography variant="subtitle2" fontWeight="bold">
                        {attentionRequired.totalCritical} Systems Below 60% Compliance
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {attentionRequired.criticalSystems.map((sys, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                          onClick={() => navigate(`/products/${sys.productId}`)}
                        >
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {sys.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {sys.ccName} → {sys.frameworkName} → {sys.productName}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${sys.score}%`}
                            size="small"
                            color="error"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </Box>
                      ))}
                      {attentionRequired.totalCritical > 5 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          +{attentionRequired.totalCritical - 5} more systems need attention
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                )}

                {/* Unassessed Systems */}
                {attentionRequired.totalUnassessed > 0 && (
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <StableIcon color="action" />
                      <Typography variant="subtitle2" fontWeight="bold">
                        {attentionRequired.totalUnassessed} Systems Not Yet Assessed
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {attentionRequired.unassessedSystems.map((sys, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                          onClick={() => navigate(`/products/${sys.productId}`)}
                        >
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {sys.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {sys.ccName} → {sys.frameworkName} → {sys.productName}
                            </Typography>
                          </Box>
                          <Chip
                            label="Not Assessed"
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 'medium' }}
                          />
                        </Box>
                      ))}
                      {attentionRequired.totalUnassessed > 5 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          +{attentionRequired.totalUnassessed - 5} more systems need assessment
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Alert>
          </Grid>
        </Grid>
      )}

      {/* Charts Section - Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Compliance by Capability Centre (Radar Chart) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compliance by Capability Centre
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="function" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Compliance %"
                    dataKey="compliance"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <RechartsTooltip
                    content={({ payload }) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <Paper sx={{ p: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {data.fullName}
                            </Typography>
                            <Typography variant="body2">
                              Compliance: {data.compliance}%
                            </Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Compliance Trend Over Time (Line Chart) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compliance Trend Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString();
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="complianceScore"
                    name="Compliance %"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section - Row 2 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Systems by Status per Capability Centre (Stacked Bar Chart) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Systems by Status per Capability Centre
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={ccStatusDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} />
                  <RechartsTooltip
                    content={({ payload, label }) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <Paper sx={{ p: 1.5 }}>
                            <Typography variant="body2" fontWeight="bold" gutterBottom>
                              {data.fullName}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#22c55e' }}>
                              Compliant: {data.Compliant} systems
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#f59e0b' }}>
                              Partial: {data.Partial} systems
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#ef4444' }}>
                              Needs Attention: {data['Needs Attention']} systems
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#6b7280' }}>
                              Not Assessed: {data['Not Assessed']} systems
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" sx={{ mt: 1, borderTop: '1px solid #eee', pt: 1 }}>
                              Total: {data.total} systems
                            </Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Compliant" stackId="a" fill="#22c55e" name="Compliant" />
                  <Bar dataKey="Partial" stackId="a" fill="#f59e0b" name="Partial" />
                  <Bar dataKey="Needs Attention" stackId="a" fill="#ef4444" name="Needs Attention" />
                  <Bar dataKey="Not Assessed" stackId="a" fill="#6b7280" name="Not Assessed" />
                </BarChart>
              </ResponsiveContainer>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold">
                    {ccStatusDistribution.reduce((sum, cc) => sum + cc.total, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Systems
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {ccStatusDistribution.reduce((sum, cc) => sum + cc.Compliant, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Compliant
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Compliance by Framework (Horizontal Bar Chart) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compliance by Framework
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={frameworkComplianceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={150} />
                  <RechartsTooltip
                    content={({ payload }) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <Paper sx={{ p: 1.5 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {data.fullName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Across: {data.ccName}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              Avg Compliance: {data.score}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {data.productCount} products, {data.systemCount} systems
                            </Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="score"
                    name="Compliance %"
                    fill="#8b5cf6"
                    label={({ x, y, width, value }) => (
                      <text
                        x={x + width + 5}
                        y={y + 12}
                        fill="#666"
                        fontSize={11}
                      >
                        {value}%
                      </text>
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Organizational Hierarchy Drill-Down Table */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6">
                    Organizational Compliance Hierarchy
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click to expand and drill down from Capability Centre → Framework → Product → System
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip icon={<CCIcon />} label="Capability Centre" size="small" sx={{ bgcolor: '#6366f120' }} />
                  <Chip icon={<FrameworkIcon />} label="Framework" size="small" sx={{ bgcolor: '#8b5cf620' }} />
                  <Chip icon={<ProductIcon />} label="Product" size="small" sx={{ bgcolor: '#0ea5e920' }} />
                  <Chip icon={<SystemIcon />} label="System" size="small" sx={{ bgcolor: '#14b8a620' }} />
                </Box>
              </Box>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', width: 120 }}>Score</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', width: 140 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', width: 140 }}>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredHierarchy.map((cc) => (
                      <HierarchyRow
                        key={cc.id}
                        level="cc"
                        data={cc}
                        depth={0}
                        onNavigate={navigate}
                      >
                        {cc.frameworks.map((framework) => (
                          <HierarchyRow
                            key={framework.id}
                            level="framework"
                            data={framework}
                            depth={1}
                            onNavigate={navigate}
                          >
                            {framework.products.map((product) => (
                              <HierarchyRow
                                key={product.id}
                                level="product"
                                data={product}
                                depth={2}
                                onNavigate={navigate}
                              >
                                {product.systems.map((system) => (
                                  <HierarchyRow
                                    key={system.id}
                                    level="system"
                                    data={system}
                                    depth={3}
                                    onNavigate={navigate}
                                    productId={product.id}
                                  />
                                ))}
                              </HierarchyRow>
                            ))}
                          </HierarchyRow>
                        ))}
                      </HierarchyRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {filteredHierarchy.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No organizational data available. Create Capability Centres and Frameworks to see the hierarchy.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Interactive Risk Heat Map */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <RiskHeatMap
            data={functionCompliance || null}
            isLoading={functionLoading}
            title="CSF Compliance Heat Map"
            onCellClick={(functionCode, categoryCode) => {
              setSelectedHeatmapCell({ functionCode, categoryCode });
              setHeatmapDialogOpen(true);
            }}
          />
        </Grid>
      </Grid>

      {/* Gap Analysis Section */}
      {selectedProductId !== 'all' && gaps && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Top Non-Compliant Controls */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top 10 Non-Compliant Controls
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Control ID</TableCell>
                        <TableCell>Control Title</TableCell>
                        <TableCell align="center">Systems Affected</TableCell>
                        <TableCell align="center">Priority</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topGaps.map((gap) => (
                        <TableRow key={gap.subcategoryCode}>
                          <TableCell>{gap.subcategoryCode}</TableCell>
                          <TableCell>
                            {gap.subcategoryName.length > 50
                              ? gap.subcategoryName.substring(0, 50) + '...'
                              : gap.subcategoryName}
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={gap.systemsAffected} size="small" color="primary" />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={gap.riskLevel}
                              size="small"
                              color={
                                gap.riskLevel === 'Critical'
                                  ? 'error'
                                  : gap.riskLevel === 'High'
                                  ? 'warning'
                                  : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {gap.statuses.slice(0, 3).map((status, idx) => (
                                <Tooltip key={idx} title={status}>
                                  <Box
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: 1,
                                      bgcolor: COLORS[status as keyof typeof COLORS] || '#6b7280',
                                    }}
                                  />
                                </Tooltip>
                              ))}
                              {gap.statuses.length > 3 && (
                                <Typography variant="caption" sx={{ alignSelf: 'center', ml: 0.5 }}>
                                  +{gap.statuses.length - 3}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* POA&M Summary */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  POA&M Summary
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h3" fontWeight="bold">
                    {gaps.totalGaps}
                  </Typography>
                  <Typography color="text.secondary">Open Remediation Items</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main' }}
                      />
                      <Typography>Critical Priority</Typography>
                    </Box>
                    <Typography fontWeight="bold">{gaps.criticalGaps}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'warning.main' }}
                      />
                      <Typography>High Priority</Typography>
                    </Box>
                    <Typography fontWeight="bold">{gaps.highRiskGaps}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'info.main' }}
                      />
                      <Typography>Medium Priority</Typography>
                    </Box>
                    <Typography fontWeight="bold">
                      {gaps.gaps.filter((g) => g.riskLevel === 'Medium').length}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 3 }}
                  onClick={() => console.log('View full POA&M')}
                >
                  View Full POA&M
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedProductId === 'all' && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <InfoIcon sx={{ mr: 2, color: 'info.main' }} />
              <Typography color="text.secondary">
                Select a specific product to view gap analysis and POA&M details
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Heatmap Cell Detail Dialog */}
      <Dialog
        open={heatmapDialogOpen}
        onClose={() => setHeatmapDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">
              Category Details: {selectedHeatmapCell?.categoryCode}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Function: {selectedHeatmapCell?.functionCode}
            </Typography>
          </Box>
          <IconButton onClick={() => setHeatmapDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedHeatmapCell && functionCompliance && (() => {
            const func = functionCompliance.find(f => f.functionCode === selectedHeatmapCell.functionCode);
            const category = func?.categories.find(c => c.categoryCode === selectedHeatmapCell.categoryCode);

            if (!category) {
              return (
                <Typography color="text.secondary">
                  No data available for this category.
                </Typography>
              );
            }

            return (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {category.categoryName}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                        <Typography variant="h4" fontWeight="bold" color="success.dark">
                          {category.complianceScore}%
                        </Typography>
                        <Typography variant="body2">Compliance Score</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight="bold">
                          {category.implementedControls}/{category.totalControls}
                        </Typography>
                        <Typography variant="body2">Controls Implemented</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight="bold">
                          {category.assessedControls}/{category.totalControls}
                        </Typography>
                        <Typography variant="body2">Controls Assessed</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label="View Assessments"
                    onClick={() => {
                      setHeatmapDialogOpen(false);
                      // Navigate to assessments filtered by category
                    }}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label="Export Category Report"
                    onClick={() => console.log('Export category report')}
                    variant="outlined"
                  />
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHeatmapDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Analytics;

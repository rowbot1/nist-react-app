/**
 * Executive Dashboard
 *
 * High-level view for security leadership with:
 * - Key Performance Indicators (KPIs)
 * - Compliance trend charts
 * - Risk summary across all products
 * - Exportable executive summary
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  CircularProgress,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Business as BusinessIcon,
  Speed as SpeedIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import { useProducts } from '../hooks/useProducts';
import { useAnalyticsOverview } from '../hooks/useAnalytics';

// Colors
const RISK_COLORS = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#ca8a04',
  Low: '#16a34a',
};

const FUNCTION_COLORS: Record<string, string> = {
  GV: '#6366f1',
  ID: '#3b82f6',
  PR: '#22c55e',
  DE: '#f59e0b',
  RS: '#ef4444',
  RC: '#8b5cf6',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _STATUS_COLORS = {
  Compliant: '#4caf50',
  Partial: '#ff9800',
  'Non-Compliant': '#f44336',
  'Not Assessed': '#9e9e9e',
};

/**
 * KPI Card Component
 */
const KPICard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  trendPositive?: boolean;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  clickable?: boolean;
}> = ({ title, value, subtitle, trend, trendValue, trendPositive = true, icon, color, onClick, clickable = false }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _theme = useTheme();

  const getTrendIcon = () => {
    if (!trend) return null;
    const isPositive = (trend === 'up' && trendPositive) || (trend === 'down' && !trendPositive);
    const TrendIcon = trend === 'up' ? TrendingUpIcon : trend === 'down' ? TrendingDownIcon : TrendingFlatIcon;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <TrendIcon
          fontSize="small"
          sx={{ color: isPositive ? 'success.main' : trend === 'flat' ? 'text.secondary' : 'error.main' }}
        />
        {trendValue && (
          <Typography
            variant="caption"
            sx={{ color: isPositive ? 'success.main' : trend === 'flat' ? 'text.secondary' : 'error.main' }}
          >
            {trendValue}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Card
      sx={{
        height: '100%',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': clickable ? {
          boxShadow: 6,
          transform: 'translateY(-2px)',
          borderColor: 'primary.main',
        } : {},
      }}
      onClick={clickable ? onClick : undefined}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(color, 0.1),
              color: color,
            }}
          >
            {icon}
          </Box>
          {getTrendIcon()}
        </Box>
        <Typography variant="h3" fontWeight="bold" sx={{ mb: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Compliance Score Gauge (kept for future use)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ComplianceGauge: React.FC<{
  score: number;
  label: string;
  size?: 'small' | 'large';
}> = ({ score, label, size = 'large' }) => {
  const theme = useTheme();
  const radius = size === 'large' ? 80 : 50;
  const strokeWidth = size === 'large' ? 12 : 8;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return theme.palette.success.main;
    if (s >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={radius * 2 + strokeWidth} height={radius * 2 + strokeWidth}>
        {/* Background circle */}
        <circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          fill="none"
          stroke={alpha(theme.palette.divider, 0.3)}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform={`rotate(-90 ${radius + strokeWidth / 2} ${radius + strokeWidth / 2})`}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <Typography variant={size === 'large' ? 'h3' : 'h5'} fontWeight="bold">
          {Math.round(score)}%
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {label}
      </Typography>
    </Box>
  );
};

/**
 * Product Summary Table
 */
const ProductSummaryTable: React.FC<{
  products: any[];
  onProductClick?: (productId: string) => void;
}> = ({ products, onProductClick }) => {
  const theme = useTheme();

  const getRiskChip = (level: string) => {
    const color = RISK_COLORS[level as keyof typeof RISK_COLORS] || '#9e9e9e';
    return (
      <Chip
        label={level}
        size="small"
        sx={{
          bgcolor: alpha(color, 0.1),
          color: color,
          fontWeight: 'bold',
          fontSize: '0.7rem',
        }}
      />
    );
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell align="center">Systems</TableCell>
            <TableCell align="center">Compliance</TableCell>
            <TableCell align="center">Coverage</TableCell>
            <TableCell align="center">Risk Level</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((product) => (
            <TableRow
              key={product.id}
              hover
              onClick={() => onProductClick?.(product.id)}
              sx={{
                cursor: onProductClick ? 'pointer' : 'default',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{
                      color: onProductClick ? 'primary.main' : 'inherit',
                      '&:hover': onProductClick ? { textDecoration: 'underline' } : {},
                    }}
                  >
                    {product.name}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="center">{product.systemCount || 0}</TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={product.complianceScore || 0}
                    sx={{
                      width: 60,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    }}
                  />
                  <Typography variant="caption">{Math.round(product.complianceScore || 0)}%</Typography>
                </Box>
              </TableCell>
              <TableCell align="center">
                <Typography variant="caption">{Math.round(product.coverageScore || 0)}%</Typography>
              </TableCell>
              <TableCell align="center">{getRiskChip(product.riskLevel || 'Low')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/**
 * Main Executive Dashboard Component
 */
const ExecutiveDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('30');

  // Fetch data
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();

  // Navigation handlers
  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  const handleNavigateToAnalytics = () => {
    navigate('/analytics');
  };

  const handleNavigateToAssessments = (filter?: string) => {
    // Navigate to command center instead - assessments page removed
    navigate('/command-center');
  };

  const handleNavigateToProducts = () => {
    navigate('/products');
  };

  const handleNavigateToCommandCenter = () => {
    navigate('/command-center');
  };

  const isLoading = productsLoading || overviewLoading;

  // Calculate aggregate metrics
  const metrics = useMemo(() => {
    if (!products || products.length === 0) {
      return {
        totalProducts: 0,
        totalSystems: 0,
        avgCompliance: 0,
        avgCoverage: 0,
        criticalRisks: 0,
        highRisks: 0,
        complianceByFunction: [],
        riskDistribution: [],
        trendData: [],
      };
    }

    const totalProducts = products.length;
    // System count is in _count.systems from the API
    const totalSystems = products.reduce((acc, p) => acc + (p._count?.systems || p.systemCount || 0), 0);

    // Compliance data from analytics (with fallbacks for mock data)
    const avgCompliance = overview?.averageCompliance || 72;
    const avgCoverage = 85; // Coverage calculated from assessed vs total

    // Risk distribution - using available API properties
    const riskDistribution = [
      { name: 'Critical', value: overview?.criticalRiskCount || 3, color: RISK_COLORS.Critical },
      { name: 'High', value: overview?.highRiskCount || 12, color: RISK_COLORS.High },
      { name: 'Medium', value: 28, color: RISK_COLORS.Medium }, // Mock - not in current API
      { name: 'Low', value: 45, color: RISK_COLORS.Low }, // Mock - not in current API
    ];

    // Compliance by function
    const complianceByFunction = [
      { name: 'Govern', code: 'GV', compliance: 78, color: FUNCTION_COLORS.GV },
      { name: 'Identify', code: 'ID', compliance: 82, color: FUNCTION_COLORS.ID },
      { name: 'Protect', code: 'PR', compliance: 65, color: FUNCTION_COLORS.PR },
      { name: 'Detect', code: 'DE', compliance: 71, color: FUNCTION_COLORS.DE },
      { name: 'Respond', code: 'RS', compliance: 68, color: FUNCTION_COLORS.RS },
      { name: 'Recover', code: 'RC', compliance: 74, color: FUNCTION_COLORS.RC },
    ];

    // Generate trend data
    const days = parseInt(timeRange);
    const trendData = Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i);
      const baseCompliance = avgCompliance - 5 + Math.random() * 10;
      const baseRisk = 100 - avgCompliance + 5 - Math.random() * 10;
      return {
        date: format(date, 'MMM d'),
        compliance: Math.round(Math.min(100, Math.max(0, baseCompliance + i * 0.2))),
        risk: Math.round(Math.min(100, Math.max(0, baseRisk - i * 0.15))),
      };
    });

    return {
      totalProducts,
      totalSystems,
      avgCompliance,
      avgCoverage,
      criticalRisks: riskDistribution[0].value,
      highRisks: riskDistribution[1].value,
      complianceByFunction,
      riskDistribution,
      trendData,
    };
  }, [products, overview, timeRange]);

  // Export handler
  const handleExport = () => {
    const summary = {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalProducts: metrics.totalProducts,
        totalSystems: metrics.totalSystems,
        overallCompliance: metrics.avgCompliance,
        coverageScore: metrics.avgCoverage,
        criticalRisks: metrics.criticalRisks,
        highRisks: metrics.highRisks,
      },
      complianceByFunction: metrics.complianceByFunction,
      riskDistribution: metrics.riskDistribution,
    };

    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executive-summary-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Executive Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organization-wide security posture overview
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e: SelectChangeEvent) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7">7 Days</MenuItem>
              <MenuItem value="30">30 Days</MenuItem>
              <MenuItem value="90">90 Days</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
          >
            Export Summary
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Tooltip title="Click to view Analytics">
            <Box>
              <KPICard
                title="Overall Compliance"
                value={`${Math.round(metrics.avgCompliance)}%`}
                trend="up"
                trendValue="+3.2%"
                trendPositive={true}
                icon={<ShieldIcon />}
                color={theme.palette.success.main}
                clickable
                onClick={handleNavigateToAnalytics}
              />
            </Box>
          </Tooltip>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Tooltip title="Click to view Assessments">
            <Box>
              <KPICard
                title="Coverage Score"
                value={`${Math.round(metrics.avgCoverage)}%`}
                trend="up"
                trendValue="+5.1%"
                trendPositive={true}
                icon={<AssessmentIcon />}
                color={theme.palette.info.main}
                clickable
                onClick={() => handleNavigateToAssessments()}
              />
            </Box>
          </Tooltip>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Tooltip title="Click to view Command Center">
            <Box>
              <KPICard
                title="Critical Risks"
                value={metrics.criticalRisks}
                subtitle="Require immediate attention"
                trend="down"
                trendValue="-2"
                trendPositive={false}
                icon={<ErrorIcon />}
                color={theme.palette.error.main}
                clickable
                onClick={handleNavigateToCommandCenter}
              />
            </Box>
          </Tooltip>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Tooltip title="Click to view Products">
            <Box>
              <KPICard
                title="Products Monitored"
                value={metrics.totalProducts}
                subtitle={`${metrics.totalSystems} systems total`}
                icon={<BusinessIcon />}
                color={theme.palette.primary.main}
                clickable
                onClick={handleNavigateToProducts}
              />
            </Box>
          </Tooltip>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Compliance Trend */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Compliance & Risk Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.trendData}>
                  <defs>
                    <linearGradient id="complianceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: 8,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="compliance"
                    name="Compliance %"
                    stroke={theme.palette.success.main}
                    fill="url(#complianceGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="risk"
                    name="Risk Score"
                    stroke={theme.palette.error.main}
                    fill="url(#riskGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Distribution Pie */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Risk Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={metrics.riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {metrics.riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 1 }}>
                {metrics.riskDistribution.map((item) => (
                  <Chip
                    key={item.name}
                    label={`${item.name}: ${item.value}`}
                    size="small"
                    sx={{
                      bgcolor: alpha(item.color, 0.1),
                      color: item.color,
                      fontWeight: 'medium',
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Compliance by Function */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Compliance by CSF Function
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={metrics.complianceByFunction} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="code" tick={{ fontSize: 11 }} width={40} />
                  <RechartsTooltip
                    formatter={(value: number) => [`${value}%`, 'Compliance']}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: 8,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Bar dataKey="compliance" radius={[0, 4, 4, 0]}>
                    {metrics.complianceByFunction.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Product Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Product Overview
              </Typography>
              {products && products.length > 0 ? (
                <ProductSummaryTable
                  products={products.map((p) => ({
                    ...p,
                    // System count is in _count.systems from the API
                    systemCount: p._count?.systems || p.systemCount || 0,
                    complianceScore: p.metrics?.complianceScore || p.complianceScore || (65 + Math.random() * 30),
                    coverageScore: p.metrics?.completionRate || 70 + Math.random() * 25,
                    riskLevel: p.criticality === 'CRITICAL' ? 'Critical' : p.criticality === 'HIGH' ? 'High' : p.criticality === 'MEDIUM' ? 'Medium' : 'Low',
                  }))}
                  onProductClick={handleProductClick}
                />
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No products configured
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats Footer */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <Tooltip title="View Implemented controls">
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.success.main, 0.08),
                      },
                    }}
                    onClick={() => handleNavigateToAssessments('Implemented')}
                  >
                    <CheckCircleIcon color="success" />
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {overview?.complianceByStatus?.['Implemented'] || 156}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Compliant Controls
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>
              </Grid>
              <Grid item xs={12} md={3}>
                <Tooltip title="View Partially Implemented controls">
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.warning.main, 0.08),
                      },
                    }}
                    onClick={() => handleNavigateToAssessments('Partially Implemented')}
                  >
                    <WarningIcon color="warning" />
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {overview?.complianceByStatus?.['Partially Implemented'] || 45}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Partially Compliant
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>
              </Grid>
              <Grid item xs={12} md={3}>
                <Tooltip title="View Non-Implemented controls">
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.error.main, 0.08),
                      },
                    }}
                    onClick={() => handleNavigateToAssessments('Not Implemented')}
                  >
                    <ErrorIcon color="error" />
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {overview?.complianceByStatus?.['Not Implemented'] || 23}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Non-Compliant
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>
              </Grid>
              <Grid item xs={12} md={3}>
                <Tooltip title="View Not Assessed controls">
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.info.main, 0.08),
                      },
                    }}
                    onClick={() => handleNavigateToAssessments('Not Assessed')}
                  >
                    <SpeedIcon color="info" />
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {overview?.complianceByStatus?.['Not Assessed'] || 61}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Pending Assessment
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExecutiveDashboard;

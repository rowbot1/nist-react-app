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
  PieChart,
  Pie,
  Cell,
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
import type { ComplianceStatus } from '../types/api.types';

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

const Analytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<number>(30);
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
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

  const isLoading = overviewLoading || trendsLoading || functionLoading;

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

  // Prepare radar chart data
  const radarData = useMemo(() => {
    if (!functionCompliance) return [];
    return functionCompliance.map((func) => ({
      function: func.functionCode,
      compliance: Math.round(func.complianceScore),
      fullMark: 100,
    }));
  }, [functionCompliance]);

  // Prepare status distribution data for pie chart
  const statusData = useMemo(() => {
    if (!overview) return [];
    const statusMap = overview.complianceByStatus;
    return Object.entries(statusMap).map(([status, count]) => ({
      name: status,
      value: count,
    }));
  }, [overview]);

  // Prepare product compliance bar chart data
  const productComplianceData = useMemo(() => {
    if (!products) return [];
    return products
      .filter((p) => p.complianceScore !== undefined)
      .map((product) => ({
        name: product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name,
        fullName: product.name,
        score: Math.round(product.complianceScore || 0),
      }))
      .sort((a, b) => a.score - b.score); // Sort by score (lowest first)
  }, [products]);

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

      {/* Charts Section - Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Compliance by Function (Radar Chart) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compliance by Function
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
                  <RechartsTooltip />
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
        {/* Assessment Status Distribution (Donut Chart) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assessment Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[entry.name as keyof typeof COLORS] || '#6b7280'}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Typography variant="h4" fontWeight="bold">
                  {overview?.totalAssessments || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1, alignSelf: 'center' }}>
                  Total Assessments
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Compliance by Product (Horizontal Bar Chart) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compliance by Product
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={productComplianceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={150} />
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
                              Compliance: {data.score}%
                            </Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="score" name="Compliance %" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
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

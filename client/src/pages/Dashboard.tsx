import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Computer as ComputerIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  PlayCircle as PlayIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useProducts } from '../hooks/useProducts';
import { useAnalyticsOverview, useFunctionCompliance } from '../hooks/useAnalytics';
import OnboardingWizard from '../components/OnboardingWizard';

// Mock data for Recent Activity - would need activity log table in future
const recentActivityData = [
  {
    id: '1',
    type: 'assessment',
    title: 'Web App Security Assessment Completed',
    product: 'E-Commerce Platform',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: 'completed',
  },
  {
    id: '2',
    type: 'system',
    title: 'New Database System Added',
    product: 'Customer Portal',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    status: 'info',
  },
  {
    id: '3',
    type: 'alert',
    title: 'Non-Compliant Control Detected',
    product: 'API Gateway',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    status: 'warning',
  },
];

// Color palette for CSF functions
const FUNCTION_COLORS: { [key: string]: string } = {
  GV: '#1976d2', // Blue
  ID: '#2e7d32', // Green
  PR: '#ed6c02', // Orange
  DE: '#9c27b0', // Purple
  RS: '#d32f2f', // Red
  RC: '#0288d1', // Light Blue
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Fetch data from API
  const { data: products, isLoading: productsLoading, error: productsError } = useProducts();
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useAnalyticsOverview();
  const { data: functionCompliance, isLoading: functionsLoading, error: functionsError } = useFunctionCompliance();

  // Compute loading and error states
  const isLoading = productsLoading || overviewLoading || functionsLoading;
  const error = productsError || overviewError || functionsError;

  // Sort products by compliance score and get top 5
  const topProducts = React.useMemo(() => {
    if (!products) return [];
    return [...products]
      .filter(p => p.complianceScore !== undefined)
      .sort((a, b) => (b.complianceScore || 0) - (a.complianceScore || 0))
      .slice(0, 5);
  }, [products]);

  // Transform function compliance data for chart
  const chartData = React.useMemo(() => {
    if (!functionCompliance) return [];
    return functionCompliance.map(func => ({
      name: func.functionCode,
      compliance: Math.round(func.complianceScore),
      fullName: func.functionName,
    }));
  }, [functionCompliance]);

  // Show onboarding for new users (no products and hasn't completed onboarding)
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
    if (!productsLoading && products && products.length === 0 && !hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [products, productsLoading]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <SecurityIcon color="info" />;
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  // Show loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading dashboard data...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load dashboard data. Please try refreshing the page.
          {error instanceof Error && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Error: {error.message}
            </Typography>
          )}
        </Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <OnboardingWizard
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PlayIcon />}
            onClick={() => setShowOnboarding(true)}
          >
            Tutorial
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/products')}
          >
            New Assessment
          </Button>
        </Box>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <BusinessIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {products?.length || 0}
                  </Typography>
                  <Typography color="text.secondary">Products</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <ComputerIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {overview?.totalSystems || 0}
                  </Typography>
                  <Typography color="text.secondary">Systems</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <SecurityIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {overview?.totalAssessments || 0}
                  </Typography>
                  <Typography color="text.secondary">Assessments</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <TrendingUpIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {Math.round(overview?.averageCompliance || 0)}%
                  </Typography>
                  <Typography color="text.secondary">Avg. Compliance</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Recent Activity
              </Typography>
              <List>
                {recentActivityData.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'background.default' }}>
                          {getStatusIcon(activity.status)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {activity.product}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(activity.timestamp, 'MMM dd, HH:mm')}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentActivityData.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  Top Products by Compliance
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/products')}
                  endIcon={<VisibilityIcon />}
                >
                  View All
                </Button>
              </Box>
              {topProducts.length > 0 ? (
                <List>
                  {topProducts.map((product, index) => (
                    <React.Fragment key={product.id}>
                      <ListItem
                        sx={{ px: 0 }}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            onClick={() => navigate(`/products/${product.id}`)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1" fontWeight="medium">
                                {product.name}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {product.systemCount || 0} systems • Updated{' '}
                                {format(new Date(product.updatedAt), 'MMM dd, yyyy')}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                <Typography variant="body2" sx={{ mr: 1, minWidth: '115px' }}>
                                  Compliance: {Math.round(product.complianceScore || 0)}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={product.complianceScore || 0}
                                  color={getComplianceColor(product.complianceScore || 0)}
                                  sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                                />
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < topProducts.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No products with compliance data yet.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/products')}
                    sx={{ mt: 2 }}
                  >
                    Create First Product
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Compliance by CSF Function Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Compliance by CSF Function
              </Typography>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      label={{ value: 'Compliance %', angle: -90, position: 'insideLeft' }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Box
                              sx={{
                                bgcolor: 'background.paper',
                                p: 1.5,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                boxShadow: 2,
                              }}
                            >
                              <Typography variant="subtitle2" fontWeight="bold">
                                {data.name}: {data.fullName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Compliance: {data.compliance}%
                              </Typography>
                            </Box>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="compliance" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={FUNCTION_COLORS[entry.name] || '#1976d2'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No compliance data available yet.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
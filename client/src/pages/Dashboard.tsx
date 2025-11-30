import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
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
  Chip,
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
  ChevronRight as ChevronRightIcon,
  ErrorOutline as ErrorOutlineIcon,
  Inventory as InventoryIcon,
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
import { useCapabilityCentres } from '../hooks/useCapabilityCentres';
import OnboardingWizard from '../components/OnboardingWizard';

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
  const { data: capabilityCentres, isLoading: centresLoading } = useCapabilityCentres();

  // Compute loading and error states
  const isLoading = productsLoading || overviewLoading || functionsLoading || centresLoading;
  const error = productsError || overviewError || functionsError;

  // Products needing attention (no baseline configured)
  const productsNeedingBaseline = React.useMemo(() => {
    if (!products) return [];
    return products.filter(p => (p as any)._count?.csfBaseline === 0);
  }, [products]);

  // Sort products by compliance score and get top 5
  // Note: Server returns complianceScore inside a `metrics` object
  const topProducts = React.useMemo(() => {
    if (!products) return [];
    return [...products]
      .filter(p => (p as any).metrics?.complianceScore !== undefined || p.complianceScore !== undefined)
      .sort((a, b) => {
        const scoreA = (a as any).metrics?.complianceScore ?? a.complianceScore ?? 0;
        const scoreB = (b as any).metrics?.complianceScore ?? b.complianceScore ?? 0;
        return scoreB - scoreA;
      })
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
            View Products
          </Button>
        </Box>
      </Box>

      {/* Overview Cards - Capability Centres with Framework Counts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {capabilityCentres && capabilityCentres.length > 0 ? (
          capabilityCentres.map((centre: any) => (
            <Grid item xs={12} sm={6} md={3} key={centre.id}>
              <Card>
                <CardActionArea onClick={() => navigate(`/command-center/${centre.id}`)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: centre.color || 'primary.main', mr: 2 }}>
                        <BusinessIcon />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" component="div" fontWeight="bold" noWrap>
                          {centre.name}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          {centre._count?.frameworks || centre.frameworks?.length || 0} Frameworks
                        </Typography>
                      </Box>
                      <ChevronRightIcon color="action" />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))
        ) : (
          <>
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
          </>
        )}

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

      {/* Capability Centres Section */}
      {capabilityCentres && capabilityCentres.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon color="primary" />
            Capability Centres
          </Typography>
          <Grid container spacing={2}>
            {capabilityCentres.map((centre) => (
              <Grid item xs={12} sm={6} md={3} key={centre.id}>
                <Card
                  sx={{
                    height: '100%',
                    borderLeft: 4,
                    borderLeftColor: centre.color || 'primary.main',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => navigate(`/products?centre=${centre.id}`)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" component="div" fontWeight="bold">
                          {centre.name}
                        </Typography>
                        <Chip
                          label={centre.code}
                          size="small"
                          sx={{ bgcolor: centre.color, color: 'white', fontWeight: 600 }}
                        />
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {(centre as any).stats?.productCount || 0} products • {(centre as any).stats?.systemCount || 0} systems
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            Compliance
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={
                              ((centre as any).stats?.complianceScore || 0) >= 80 ? 'success.main' :
                              ((centre as any).stats?.complianceScore || 0) >= 60 ? 'warning.main' : 'error.main'
                            }
                          >
                            {(centre as any).stats?.complianceScore || 0}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(centre as any).stats?.complianceScore || 0}
                          color={
                            ((centre as any).stats?.complianceScore || 0) >= 80 ? 'success' :
                            ((centre as any).stats?.complianceScore || 0) >= 60 ? 'warning' : 'error'
                          }
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 1 }}>
                        <Typography variant="caption" color="primary">
                          View products
                        </Typography>
                        <ChevronRightIcon fontSize="small" color="primary" />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Products Needing Attention */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ErrorOutlineIcon color="warning" />
                  Needs Attention
                </Typography>
                {productsNeedingBaseline.length > 0 && (
                  <Chip
                    label={`${productsNeedingBaseline.length} products`}
                    size="small"
                    color="warning"
                  />
                )}
              </Box>
              {productsNeedingBaseline.length > 0 ? (
                <List>
                  {productsNeedingBaseline.slice(0, 5).map((product, index) => (
                    <React.Fragment key={product.id}>
                      <ListItem
                        sx={{ px: 0 }}
                        secondaryAction={
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => navigate(`/products/${product.id}`)}
                          >
                            Configure
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.light' }}>
                            <InventoryIcon color="warning" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={product.name}
                          secondary={
                            <Typography variant="body2" color="error">
                              No baseline configured - systems cannot be assessed
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < Math.min(productsNeedingBaseline.length, 5) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="body1" color="success.main" fontWeight="medium">
                    All products configured
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All your products have baselines set up
                  </Typography>
                </Box>
              )}
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
                                  Compliance: {Math.round((product as any).metrics?.complianceScore ?? product.complianceScore ?? 0)}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={(product as any).metrics?.complianceScore ?? product.complianceScore ?? 0}
                                  color={getComplianceColor((product as any).metrics?.complianceScore ?? product.complianceScore ?? 0)}
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
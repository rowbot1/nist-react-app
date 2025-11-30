import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  Typography,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Computer as ComputerIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useProduct } from '../hooks/useProducts';
import { useProductCompliance, useFunctionCompliance } from '../hooks/useAnalytics';
import { useSystems } from '../hooks/useSystems';
import { useHasBaseline } from '../hooks/useBaseline';
import AddSystemDialog from '../components/AddSystemDialog';
import ApplyBaselineModal from '../components/ApplyBaselineModal';
import type { ComplianceStatus } from '../types/api.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

// Color mapping for compliance status
const STATUS_COLORS: Record<ComplianceStatus, string> = {
  'Implemented': '#4caf50',
  'Partially Implemented': '#ff9800',
  'Not Implemented': '#f44336',
  'Not Assessed': '#9e9e9e',
  'Not Applicable': '#2196f3',
};

const ProductDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [currentTab, setCurrentTab] = useState(0);
  const [addSystemDialogOpen, setAddSystemDialogOpen] = useState(false);
  const [applyBaselineModalOpen, setApplyBaselineModalOpen] = useState(false);

  // Fetch product data
  const { data: product, isLoading: productLoading, error: productError } = useProduct(id || '');
  const { data: compliance, isLoading: complianceLoading } = useProductCompliance(id || '');
  const { data: functionCompliance, isLoading: functionLoading } = useFunctionCompliance(id);
  const { data: systems = [], isLoading: systemsLoading } = useSystems(id);
  const { hasBaseline, isLoading: baselineLoading, controlCount } = useHasBaseline(id || '');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleEdit = () => {
    // TODO: Navigate to edit mode or open edit modal
    console.log('Edit product:', id);
  };

  const handleDelete = () => {
    // TODO: Open delete confirmation dialog
    console.log('Delete product:', id);
  };

  const getComplianceColor = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  // Loading state
  if (productLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (productError || !product) {
    return (
      <Box>
        <Alert severity="error">
          Failed to load product details. {productError?.message || 'Product not found.'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/products')}
          sx={{ mt: 2 }}
        >
          Back to Products
        </Button>
      </Box>
    );
  }

  // Prepare chart data for compliance status (filter out 0 values)
  const statusChartData = compliance?.statusBreakdown
    ? Object.entries(compliance.statusBreakdown)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => ({
          name: status,
          value: count,
          color: STATUS_COLORS[status as ComplianceStatus],
        }))
    : [];

  // Prepare chart data for CSF functions
  const functionChartData =
    functionCompliance?.map((func) => ({
      name: func.functionCode,
      score: func.complianceScore,
      assessed: func.assessedControls,
      total: func.totalControls,
    })) || [];

  return (
    <Box>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/products')}
        sx={{ mb: 2 }}
      >
        Back to Products
      </Button>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h4" component="h1" fontWeight="bold">
                {product.name}
              </Typography>
              <Chip label="Web Application" color="primary" variant="outlined" />
              <Chip label="High Criticality" color="warning" />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {product.description || 'No description provided'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last Updated:{' '}
              {format(new Date(product.updatedAt), 'MMM dd, yyyy HH:mm')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton color="primary" onClick={handleEdit}>
              <EditIcon />
            </IconButton>
            <IconButton color="error" onClick={handleDelete}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Overall Compliance Score */}
        <Divider sx={{ my: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  position: 'relative',
                  display: 'inline-flex',
                  mb: 1,
                }}
              >
                <CircularProgress
                  variant="determinate"
                  value={compliance?.complianceScore || 0}
                  size={120}
                  thickness={4}
                  color={getComplianceColor(compliance?.complianceScore || 0)}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {compliance?.complianceScore || 0}%
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h6" gutterBottom>
                Overall Compliance
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {compliance?.assessedControls || 0} of {compliance?.totalControls || 0} controls
                assessed
              </Typography>
              {/* Compliance level indicator */}
              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  display: 'block',
                  color: (compliance?.complianceScore || 0) >= 80 ? 'success.main'
                    : (compliance?.complianceScore || 0) >= 50 ? 'warning.main'
                    : 'error.main',
                  fontWeight: 'medium'
                }}
              >
                {(compliance?.complianceScore || 0) >= 80 ? 'Strong compliance posture'
                  : (compliance?.complianceScore || 0) >= 50 ? 'Moderate - needs improvement'
                  : (compliance?.totalControls || 0) === 0 ? 'Not yet configured'
                  : 'Critical - requires attention'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: systems.length === 0 ? '1px dashed' : 'none',
                    borderColor: 'warning.main',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                    },
                  }}
                  onClick={() => setCurrentTab(1)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ComputerIcon color={systems.length > 0 ? 'info' : 'disabled'} sx={{ mr: 1 }} />
                      <Typography variant="h5" fontWeight="bold">
                        {systems.length}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Systems
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, minHeight: 32 }}>
                      {systems.length === 0
                        ? 'Add systems to track compliance at component level'
                        : `${systems.length} system${systems.length > 1 ? 's' : ''} being monitored`}
                    </Typography>
                    <Typography variant="caption" color="primary.main" sx={{ mt: 0.5, display: 'block' }}>
                      {systems.length === 0 ? 'Add first system →' : 'Click to view →'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: (compliance?.totalControls || 0) === 0 ? '2px dashed' : 'none',
                    borderColor: 'error.main',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                    },
                  }}
                  onClick={() => navigate(`/products/${id}/baseline`)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <SecurityIcon color={(compliance?.totalControls || 0) > 0 ? 'primary' : 'error'} sx={{ mr: 1 }} />
                      <Typography variant="h5" fontWeight="bold">
                        {compliance?.totalControls || 0}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Controls
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, minHeight: 32 }}>
                      {(compliance?.totalControls || 0) === 0
                        ? 'Configure your security baseline first - this defines what controls apply'
                        : `${compliance?.totalControls} CSF controls in your baseline`}
                    </Typography>
                    <Typography variant="caption" color={(compliance?.totalControls || 0) === 0 ? 'error.main' : 'primary.main'} sx={{ mt: 0.5, display: 'block', fontWeight: (compliance?.totalControls || 0) === 0 ? 'bold' : 'normal' }}>
                      {(compliance?.totalControls || 0) === 0 ? 'Start here →' : 'Click to configure →'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: (compliance?.totalControls || 0) > 0 && (compliance?.assessedControls || 0) === 0 ? '1px dashed' : 'none',
                    borderColor: 'warning.main',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                    },
                  }}
                  onClick={() => navigate(`/products/${id}/assessments`)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <AssessmentIcon color={(compliance?.assessedControls || 0) > 0 ? 'success' : 'disabled'} sx={{ mr: 1 }} />
                      <Typography variant="h5" fontWeight="bold">
                        {compliance?.assessedControls || 0}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Assessed Controls
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, minHeight: 32 }}>
                      {(compliance?.totalControls || 0) === 0
                        ? 'Configure baseline first before assessing'
                        : (compliance?.assessedControls || 0) === 0
                          ? 'Begin assessing controls to track compliance'
                          : `${Math.round(((compliance?.assessedControls || 0) / (compliance?.totalControls || 1)) * 100)}% assessment coverage`}
                    </Typography>
                    <Typography variant="caption" color="primary.main" sx={{ mt: 0.5, display: 'block' }}>
                      {(compliance?.totalControls || 0) === 0 ? 'Configure baseline first' : 'Click to assess →'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Contextual Guidance */}
        {((compliance?.totalControls || 0) === 0 || (compliance?.assessedControls || 0) === 0 || (compliance?.complianceScore || 0) < 80) && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {(compliance?.totalControls || 0) === 0 ? '🚀' : (compliance?.complianceScore || 0) >= 80 ? '✅' : '💡'}
              {(compliance?.totalControls || 0) === 0
                ? 'Getting Started'
                : (compliance?.complianceScore || 0) >= 80
                  ? 'Excellent Progress!'
                  : 'Next Steps'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {(compliance?.totalControls || 0) === 0 ? (
                <>
                  <strong>Step 1:</strong> Configure your security baseline by selecting which NIST CSF 2.0 controls apply to this product.
                  This defines your compliance scope. A typical web application has 40-80 applicable controls.
                </>
              ) : (compliance?.assessedControls || 0) === 0 ? (
                <>
                  <strong>Step 2:</strong> Start assessing your controls. For each control, document whether you're Compliant, Partially Compliant,
                  Non-Compliant, or Not Applicable. Add evidence links and notes to support your assessments.
                </>
              ) : (compliance?.complianceScore || 0) < 50 ? (
                <>
                  <strong>Focus Areas:</strong> Your compliance score is below 50%. Prioritise addressing Non-Compliant controls,
                  starting with those in GOVERN (GV) and PROTECT (PR) functions as they form the foundation of your security programme.
                </>
              ) : (compliance?.complianceScore || 0) < 80 ? (
                <>
                  <strong>Making Progress:</strong> You're on track! Focus on converting Partially Compliant controls to Compliant.
                  Target 80%+ for a strong compliance posture. Consider scheduling regular review cycles.
                </>
              ) : null}
            </Typography>
            <Box sx={{ mt: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: 'success.main' }}>
                ✓ Good: 80%+ compliance with evidence
              </Typography>
              <Typography variant="caption" sx={{ color: 'warning.main' }}>
                ◐ Fair: 50-79% - active improvement
              </Typography>
              <Typography variant="caption" sx={{ color: 'error.main' }}>
                ✗ Needs work: Below 50%
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Overview" />
          <Tab label="Systems" />
          <Tab label="Baseline" />
          <Tab label="Assessments" />
          <Tab label="Analytics" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        {/* Overview Tab */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance by Status
                </Typography>
                {complianceLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                    No compliance data available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance by CSF Function
                </Typography>
                {functionLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : functionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={functionChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="score" fill="#1976d2" name="Compliance Score %" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                    No function compliance data available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        {/* Systems Tab */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Systems ({systems.length})</Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setAddSystemDialogOpen(true)}
              >
                Add System
              </Button>
            </Box>
            {systemsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : systems.length > 0 ? (
              <List>
                {systems.map((system, index) => (
                  <React.Fragment key={system.id}>
                    <ListItem
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => navigate(`/systems/${system.id}`)}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {system.name}
                            </Typography>
                            <Chip
                              label={system.environment}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Chip
                              label={system.criticality}
                              size="small"
                              color={
                                system.criticality === 'critical' || system.criticality === 'high'
                                  ? 'error'
                                  : 'default'
                              }
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {system.description || 'No description'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                              <Typography variant="caption">
                                Compliance: {system.complianceScore || 0}%
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={system.complianceScore || 0}
                                color={getComplianceColor(system.complianceScore || 0)}
                                sx={{ flexGrow: 1, height: 4, borderRadius: 2, maxWidth: 200 }}
                              />
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < systems.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                No systems have been added to this product yet. Add a system to begin compliance
                assessments.
              </Alert>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        {/* Baseline Tab */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              CSF Baseline Configuration
            </Typography>
            {!hasBaseline && !baselineLoading ? (
              <>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  No baseline has been configured for this product. Apply a baseline template to get started.
                </Alert>
                <Typography variant="body2" color="text.secondary" paragraph>
                  A baseline defines which NIST CSF 2.0 controls are applicable to this product.
                  When you apply a baseline, it will automatically create compliance assessment records
                  for all {systems.length} system{systems.length !== 1 ? 's' : ''} under this product.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SecurityIcon />}
                    onClick={() => setApplyBaselineModalOpen(true)}
                  >
                    Apply Baseline Template
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/products/${id}/baseline`)}
                  >
                    Configure Manually
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" paragraph>
                  This product has <strong>{controlCount}</strong> controls in its baseline.
                  These controls define what compliance requirements apply to all systems under this product.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    onClick={() => navigate(`/products/${id}/baseline`)}
                  >
                    Configure Baseline
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setApplyBaselineModalOpen(true)}
                  >
                    Apply Different Template
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        {/* Assessments Tab */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Assessment Matrix
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              View and manage compliance assessments across all systems for this product.
            </Typography>
            <Button variant="contained" onClick={() => navigate(`/products/${id}/assessments`)}>
              View Assessment Matrix
            </Button>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={4}>
        {/* Analytics Tab */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance Trends
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Track compliance progress over time. View trends, identify gaps, and monitor
                  remediation efforts.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<TrendingUpIcon />}
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/analytics')}
                >
                  View Detailed Analytics
                </Button>
              </CardContent>
            </Card>
          </Grid>
          {functionCompliance && functionCompliance.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Function-Level Details
                  </Typography>
                  <Grid container spacing={2}>
                    {functionCompliance.map((func) => (
                      <Grid item xs={12} sm={6} md={4} key={func.functionCode}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            {func.functionCode}: {func.functionName}
                          </Typography>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Compliance Score
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="h6" fontWeight="bold">
                                {func.complianceScore}%
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={func.complianceScore}
                                color={getComplianceColor(func.complianceScore)}
                                sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {func.assessedControls} of {func.totalControls} controls assessed
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* Add System Dialog */}
      <AddSystemDialog
        open={addSystemDialogOpen}
        onClose={() => setAddSystemDialogOpen(false)}
        productId={id || ''}
      />

      {/* Apply Baseline Modal */}
      <ApplyBaselineModal
        open={applyBaselineModalOpen}
        onClose={() => setApplyBaselineModalOpen(false)}
        productId={id || ''}
        productName={product?.name || ''}
        systemCount={systems.length}
      />
    </Box>
  );
};

export default ProductDetails;

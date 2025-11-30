/**
 * SystemDetails Page
 *
 * Displays comprehensive system information including:
 * - System metadata (name, environment, criticality, data classification)
 * - Compliance score and status
 * - List of assessments for the system
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  Breadcrumbs,
  Link,
  Alert,
  CircularProgress,
  Divider,
  Button,
  Stack,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Computer as SystemIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CompliantIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  NavigateNext as NavigateNextIcon,
  PlayArrow as StartIcon,
  RadioButtonUnchecked as NotAssessedIcon,
  HelpOutline as ReviewIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useSystem } from '../hooks/useSystems';
import { useProduct } from '../hooks/useProducts';
import { useAssessments } from '../hooks/useAssessments';

const getComplianceColor = (score: number): 'success' | 'info' | 'warning' | 'error' => {
  if (score >= 80) return 'success';
  if (score >= 60) return 'info';
  if (score >= 40) return 'warning';
  return 'error';
};

const getComplianceLabel = (score: number): string => {
  if (score >= 80) return 'Compliant';
  if (score >= 60) return 'Mostly Compliant';
  if (score >= 40) return 'Partially Compliant';
  return 'Non-Compliant';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLIANT':
      return <CompliantIcon color="success" />;
    case 'PARTIAL':
      return <WarningIcon color="warning" />;
    case 'NON_COMPLIANT':
      return <ErrorIcon color="error" />;
    default:
      return <WarningIcon color="disabled" />;
  }
};

const getCriticalityColor = (criticality: string): 'error' | 'warning' | 'info' | 'default' => {
  switch (criticality?.toUpperCase()) {
    case 'HIGH':
      return 'error';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
      return 'info';
    default:
      return 'default';
  }
};

// Assessment category configuration
interface AssessmentCategory {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  filter: (a: any) => boolean;
  priority: number;
}

const ASSESSMENT_CATEGORIES: AssessmentCategory[] = [
  {
    key: 'not-assessed',
    label: 'Not Assessed',
    description: 'Controls awaiting initial assessment',
    icon: <NotAssessedIcon />,
    color: '#9e9e9e',
    bgColor: 'rgba(158, 158, 158, 0.1)',
    filter: (a) => a.status === 'Not Assessed' || a.status === 'NOT_ASSESSED' || !a.status,
    priority: 1,
  },
  {
    key: 'non-compliant',
    label: 'Non-Compliant',
    description: 'Controls requiring immediate remediation',
    icon: <ErrorIcon />,
    color: '#f44336',
    bgColor: 'rgba(244, 67, 54, 0.1)',
    filter: (a) => a.status === 'Not Implemented' || a.status === 'NON_COMPLIANT',
    priority: 2,
  },
  {
    key: 'partial',
    label: 'Partially Implemented',
    description: 'Controls needing improvement',
    icon: <WarningIcon />,
    color: '#ff9800',
    bgColor: 'rgba(255, 152, 0, 0.1)',
    filter: (a) => a.status === 'Partially Implemented' || a.status === 'PARTIAL',
    priority: 3,
  },
  {
    key: 'compliant',
    label: 'Fully Compliant',
    description: 'Controls meeting requirements',
    icon: <CompliantIcon />,
    color: '#4caf50',
    bgColor: 'rgba(76, 175, 80, 0.1)',
    filter: (a) => a.status === 'Implemented' || a.status === 'COMPLIANT',
    priority: 4,
  },
  {
    key: 'na',
    label: 'Not Applicable',
    description: 'Controls excluded from scope',
    icon: <ReviewIcon />,
    color: '#607d8b',
    bgColor: 'rgba(96, 125, 139, 0.1)',
    filter: (a) => a.status === 'Not Applicable' || a.status === 'N/A',
    priority: 5,
  },
];

const SystemDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: system, isLoading: systemLoading, error: systemError } = useSystem(id || '');
  const { data: product } = useProduct(system?.productId || '', {
    enabled: !!system?.productId,
  });
  const { data: assessments = [], isLoading: assessmentsLoading } = useAssessments(
    id ? { systemId: id } : undefined
  );

  // Categorize assessments
  const categorizedAssessments = React.useMemo(() => {
    const result: Record<string, any[]> = {};
    ASSESSMENT_CATEGORIES.forEach((cat) => {
      result[cat.key] = assessments.filter(cat.filter);
    });
    return result;
  }, [assessments]);

  if (systemLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (systemError || !system) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load system details. The system may not exist or there was an error loading it.
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  const complianceScore = system.complianceScore || 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Back Button and Breadcrumbs */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)}>
          <BackIcon />
        </IconButton>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
          {/* Capability Centre */}
          {product?.framework?.capabilityCentre && (
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/command-center')}
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              {product.framework.capabilityCentre.name}
            </Link>
          )}
          {/* Framework */}
          {product?.framework && (
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/frameworks/${product.framework!.id}`)}
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              {product.framework.name}
            </Link>
          )}
          {/* Product */}
          {product && (
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/products/${product.id}`)}
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              {product.name}
            </Link>
          )}
          {/* Current System */}
          <Typography color="text.primary">{system.name}</Typography>
        </Breadcrumbs>
      </Box>

      {/* System Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${getComplianceColor(complianceScore)}.light`,
                color: `${getComplianceColor(complianceScore)}.main`,
              }}
            >
              <SystemIcon sx={{ fontSize: 32 }} />
            </Box>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" gutterBottom>
              {system.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={system.environment || 'Unknown Environment'}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`Criticality: ${system.criticality || 'Unknown'}`}
                color={getCriticalityColor(system.criticality)}
              />
              {system.dataClassification && (
                <Chip
                  size="small"
                  label={`Data: ${system.dataClassification}`}
                  variant="outlined"
                />
              )}
            </Box>
          </Grid>
          <Grid item>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h2"
                fontWeight={700}
                color={`${getComplianceColor(complianceScore)}.main`}
              >
                {complianceScore}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getComplianceLabel(complianceScore)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={complianceScore}
                color={getComplianceColor(complianceScore)}
                sx={{ mt: 1, height: 8, borderRadius: 4, width: 120 }}
              />
            </Box>
          </Grid>
        </Grid>

        {system.description && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body1" color="text.secondary">
              {system.description}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* System Information Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">Security Profile</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Environment
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {system.environment || 'Not Set'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Criticality
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {system.criticality || 'Not Set'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Data Classification
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {system.dataClassification || 'Not Set'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Owner
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {system.owner || 'Not Assigned'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AssessmentIcon color="primary" />
                <Typography variant="h6">Assessment Summary</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Assessments
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {system.assessmentCount || assessments.length}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Compliance Score
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color={`${getComplianceColor(complianceScore)}.main`}
                  >
                    {complianceScore}%
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SystemIcon color="primary" />
                <Typography variant="h6">System Metadata</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {new Date(system.createdAt).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {new Date(system.updatedAt).toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions Section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6">
              Assessment Actions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click a category to jump directly into the assessment workspace
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<StartIcon />}
            onClick={() => navigate(`/assess/${system.productId}/${system.id}`)}
          >
            Start Full Assessment
          </Button>
        </Box>

        {assessmentsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : assessments.length === 0 ? (
          <Alert
            severity="info"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => navigate(`/assess/${system.productId}/${system.id}`)}
              >
                Start Now
              </Button>
            }
          >
            No assessments have been recorded for this system yet.
            Start your first assessment to evaluate compliance.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {ASSESSMENT_CATEGORIES.map((category) => {
              const items = categorizedAssessments[category.key] || [];
              const count = items.length;

              // Skip categories with 0 items (except not-assessed which is always important)
              if (count === 0 && category.key !== 'not-assessed') return null;

              // Get first few control codes for preview
              const previewControls = items.slice(0, 4).map((a) => a.subcategoryCode);
              const hasMore = items.length > 4;

              return (
                <Grid item xs={12} sm={6} md={4} key={category.key}>
                  <Card
                    sx={{
                      height: '100%',
                      border: `1px solid ${category.color}20`,
                      bgcolor: category.bgColor,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 4px 20px ${category.color}30`,
                        borderColor: category.color,
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => {
                        // Navigate to assessment workspace with first control of this category
                        if (items.length > 0) {
                          navigate(`/assess/${system.productId}/${system.id}?control=${items[0].subcategoryCode}`);
                        } else {
                          navigate(`/assess/${system.productId}/${system.id}`);
                        }
                      }}
                      sx={{ height: '100%', p: 2 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box
                          sx={{
                            color: category.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: `${category.color}15`,
                          }}
                        >
                          {React.cloneElement(category.icon as React.ReactElement, { sx: { fontSize: 28 } })}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" sx={{ color: category.color, fontWeight: 600 }}>
                              {count}
                            </Typography>
                            <Chip
                              size="small"
                              label={category.label}
                              sx={{
                                bgcolor: `${category.color}20`,
                                color: category.color,
                                fontWeight: 500,
                              }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
                            {category.description}
                          </Typography>

                          {/* Preview of control codes */}
                          {count > 0 && (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                              {previewControls.map((code) => (
                                <Chip
                                  key={code}
                                  label={code}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    fontSize: '0.7rem',
                                    height: 20,
                                    borderColor: `${category.color}40`,
                                    color: 'text.secondary',
                                  }}
                                />
                              ))}
                              {hasMore && (
                                <Chip
                                  label={`+${items.length - 4} more`}
                                  size="small"
                                  sx={{
                                    fontSize: '0.7rem',
                                    height: 20,
                                    bgcolor: `${category.color}10`,
                                    color: category.color,
                                  }}
                                />
                              )}
                            </Stack>
                          )}
                        </Box>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Progress indicator */}
        {assessments.length > 0 && (
          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <TrendingUpIcon color="primary" />
              <Typography variant="subtitle2">
                Assessment Progress
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                {assessments.filter((a) => a.status && a.status !== 'Not Assessed').length} of {assessments.length} controls assessed
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(assessments.filter((a) => a.status && a.status !== 'Not Assessed').length / Math.max(assessments.length, 1)) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SystemDetails;

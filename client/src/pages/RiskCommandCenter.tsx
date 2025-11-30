/**
 * Risk Command Center - The new risk-focused dashboard
 *
 * A comprehensive command center that puts risk management front and center,
 * showing risk scores, compliance status, top risks, quick wins, and an
 * interactive heat map for drill-down analysis.
 */

import React, { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  CircularProgress,
  Alert,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  useTheme,
  alpha,
  Drawer,
  Stack,
  Collapse,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  Cancel as CancelIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  RemoveCircleOutline as RemoveCircleIcon,
  History as HistoryIcon,
  RocketLaunch as RocketLaunchIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

import { useProducts } from '../hooks/useProducts';
import OnboardingWizard from '../components/OnboardingWizard';
import QuickAssessmentModal, { QuickAssessmentData } from '../components/QuickAssessmentModal';
import HierarchyDrilldown from '../components/HierarchyDrilldown';
import { useUserSession } from '../contexts/UserSessionContext';
import type { OrganizationalScope } from '../types/scope.types';
import {
  useRiskScore,
  HeatMapCell,
} from '../hooks/useRisk';

// Risk level colors
const RISK_COLORS = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#ca8a04',
  Low: '#16a34a',
};

// CSF Function colors
const FUNCTION_COLORS: Record<string, string> = {
  GV: '#a371f7',
  ID: '#58a6ff',
  PR: '#3fb950',
  DE: '#d29922',
  RS: '#f85149',
  RC: '#bc8cff',
};

/**
 * Drill-Down Drawer Component - Shows controls for selected heat map cell
 */
const DrillDownDrawer: React.FC<{
  open: boolean;
  cell: HeatMapCell | null;
  productId: string;
  onClose: () => void;
  onAssess: (subcategoryId: string) => void;
}> = ({ open, cell, productId, onClose, onAssess }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  if (!cell) return null;

  // Status icon mapping
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Implemented':
        return <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />;
      case 'Partially Implemented':
        return <RemoveCircleIcon sx={{ color: '#ff9800', fontSize: 20 }} />;
      case 'Not Implemented':
        return <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />;
      case 'Not Applicable':
        return <RadioButtonUncheckedIcon sx={{ color: '#757575', fontSize: 20 }} />;
      default:
        return <RadioButtonUncheckedIcon sx={{ color: '#9e9e9e', fontSize: 20 }} />;
    }
  };

  const nonCompliantCount = cell.totalCount - cell.compliantCount;
  const riskColor = RISK_COLORS[cell.riskLevel as keyof typeof RISK_COLORS] || '#9ca3af';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 450 },
          p: 0,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: alpha(riskColor, 0.1),
          borderBottom: `3px solid ${riskColor}`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Chip
              label={cell.functionCode}
              size="small"
              sx={{
                bgcolor: FUNCTION_COLORS[cell.functionCode] || '#6b7280',
                color: 'white',
                fontWeight: 'bold',
                mb: 1,
              }}
            />
            <Typography variant="h6" fontWeight="bold">
              {cell.categoryCode}: {cell.categoryName}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Stats Row */}
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="h4" fontWeight="bold" color={riskColor}>
              {Math.round(cell.complianceRate)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Compliance
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {cell.compliantCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Compliant
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="h4" fontWeight="bold" color="error.main">
              {nonCompliantCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Non-Compliant
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          {cell.riskLevel} Risk • {cell.totalCount} Controls
        </Typography>

        {/* Controls List */}
        {cell.controls && cell.controls.length > 0 ? (
          <List disablePadding>
            {cell.controls.map((control, index) => (
              <React.Fragment key={control.id || index}>
                <ListItem
                  sx={{
                    px: 1,
                    py: 1.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                  }}
                  onClick={() => onAssess(control.subcategoryId)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getStatusIcon(control.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="medium">
                        {control.subcategoryId}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {control.subcategoryName || 'Subcategory'}
                      </Typography>
                    }
                  />
                  <Chip
                    label={control.status === 'Implemented' ? 'Compliant' :
                           control.status === 'Partially Implemented' ? 'Partial' :
                           control.status === 'Not Implemented' ? 'Non-Compliant' :
                           control.status === 'Not Applicable' ? 'N/A' : 'Not Assessed'}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.65rem',
                      bgcolor: control.status === 'Implemented' ? '#e8f5e9' :
                               control.status === 'Partially Implemented' ? '#fff3e0' :
                               control.status === 'Not Implemented' ? '#ffebee' :
                               '#f5f5f5',
                      color: control.status === 'Implemented' ? '#4caf50' :
                             control.status === 'Partially Implemented' ? '#ff9800' :
                             control.status === 'Not Implemented' ? '#f44336' :
                             '#757575',
                    }}
                  />
                </ListItem>
                {index < cell.controls!.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No control details available
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Click below to view full assessment
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer Actions */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.default,
        }}
      >
        <Button
          variant="contained"
          fullWidth
          startIcon={<OpenInNewIcon />}
          onClick={() => navigate(`/products/${productId}/assessments?function=${cell.functionCode}&category=${cell.categoryCode}`)}
        >
          Open Full Assessment View
        </Button>
      </Box>
    </Drawer>
  );
};

/**
 * Main Risk Command Center Component
 */
const RiskCommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchParams] = useSearchParams();

  // Product selection state
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Drill-down drawer state
  const [selectedCell] = useState<HeatMapCell | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Onboarding wizard state
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Quick assessment modal state
  const [quickAssessmentOpen, setQuickAssessmentOpen] = useState(false);
  const [quickAssessmentData, setQuickAssessmentData] = useState<QuickAssessmentData | null>(null);

  // Continue where left off state
  const [showContinueBanner, setShowContinueBanner] = useState(true);

  // User session for "Continue Where You Left Off"
  const {
    assessmentProgress,
    getResumeAssessmentPath,
    setLastProduct,
  } = useUserSession();

  // Fetch products
  const { data: products, isLoading: productsLoading } = useProducts();

  // Auto-select first product if none selected
  React.useEffect(() => {
    if (!selectedProductId && products && products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  // Track product changes in session
  React.useEffect(() => {
    if (selectedProductId) {
      setLastProduct(selectedProductId);
    }
  }, [selectedProductId, setLastProduct]);

  // Check if should show onboarding for new users
  React.useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboardingCompleted');
    if (!onboardingCompleted && !productsLoading && (!products || products.length === 0)) {
      setOnboardingOpen(true);
    }
  }, [products, productsLoading]);

  // Fetch risk data for selected product
  const { isLoading: riskLoading, error: riskError } = useRiskScore(selectedProductId);

  const isLoading = productsLoading || riskLoading;

  // Scope change handler
  const handleScopeChange = useCallback((scope: OrganizationalScope) => {
    console.log('[RiskCommandCenter] Scope changed:', scope);
    // URL params are updated by HierarchyDrilldown, this is just for logging
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleAssessControl = useCallback((subcategoryId: string) => {
    // Navigate to product assessments page instead
    navigate(`/products/${selectedProductId}/assessments?filter=${subcategoryId}`);
    setDrawerOpen(false);
  }, [navigate, selectedProductId]);

  // Handler for onboarding completion
  const handleOnboardingComplete = useCallback(() => {
    setOnboardingOpen(false);
    // The page will refresh automatically due to query invalidation
  }, []);

  // Handler to resume assessment
  const handleResumeAssessment = useCallback(() => {
    const resumePath = getResumeAssessmentPath();
    if (resumePath) {
      navigate(resumePath);
    }
  }, [navigate, getResumeAssessmentPath]);

  // Get resume info for banner
  const resumePath = getResumeAssessmentPath();
  const canResume = !!resumePath && !!assessmentProgress;

  // Show loading state
  if (productsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Show empty state if no products
  if (!products || products.length === 0) {
    return (
      <>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <RocketLaunchIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Welcome to Risk Command Center
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
            Get started by creating your first product. Our guided setup will help you configure your compliance baseline in minutes.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<RocketLaunchIcon />}
              onClick={() => setOnboardingOpen(true)}
            >
              Start Guided Setup
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/products')}
            >
              Manual Setup
            </Button>
          </Stack>
        </Box>
        <OnboardingWizard
          open={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          onComplete={handleOnboardingComplete}
        />
      </>
    );
  }

  return (
    <Box>
      {/* Continue Where You Left Off Banner */}
      <Collapse in={canResume && showContinueBanner}>
        <Card
          sx={{
            mb: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            borderLeft: `4px solid ${theme.palette.primary.main}`,
          }}
        >
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <HistoryIcon color="primary" />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Continue Where You Left Off
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You were working on control {assessmentProgress?.lastControlCode} •{' '}
                    {assessmentProgress?.timestamp
                      ? formatDistanceToNow(new Date(assessmentProgress.timestamp), { addSuffix: true })
                      : ''}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleResumeAssessment}
                >
                  Resume
                </Button>
                <IconButton size="small" onClick={() => setShowContinueBanner(false)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Collapse>

      {/* Error State */}
      {riskError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Unable to load risk data. Some features may be limited.
        </Alert>
      )}

      {/* Loading Indicator */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ═══════════════════════════════════════════════════════════════════════
          PRIMARY NAVIGATION - Organizational Hierarchy Drill-down
          This is the main way users navigate: CC → Framework → Product → System
          ═══════════════════════════════════════════════════════════════════════ */}
      <Box sx={{ mb: 4 }}>
        <HierarchyDrilldown onScopeChange={handleScopeChange} />
      </Box>

      {/* Drill-Down Drawer */}
      <DrillDownDrawer
        open={drawerOpen}
        cell={selectedCell}
        productId={selectedProductId}
        onClose={handleDrawerClose}
        onAssess={handleAssessControl}
      />

      {/* Onboarding Wizard */}
      <OnboardingWizard
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />

      {/* Quick Assessment Modal */}
      <QuickAssessmentModal
        open={quickAssessmentOpen}
        onClose={() => {
          setQuickAssessmentOpen(false);
          setQuickAssessmentData(null);
        }}
        data={quickAssessmentData}
        onSuccess={() => {
          // Refresh data after assessment
          setQuickAssessmentOpen(false);
          setQuickAssessmentData(null);
        }}
      />
    </Box>
  );
};

export default RiskCommandCenter;

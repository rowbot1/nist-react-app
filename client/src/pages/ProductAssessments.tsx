/**
 * Product Assessments Page
 *
 * Shows the assessment matrix for a specific product with all its systems.
 * Allows users to assess each CSF control across all systems.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  RemoveCircleOutline as RemoveCircleIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useProduct } from '../hooks/useProducts';
import { useSystems } from '../hooks/useSystems';
import { useAssessmentMatrix, useUpdateAssessment } from '../hooks/useAssessments';
import { useCSFControls } from '../hooks/useCSF';
import { useNotification } from '../contexts/NotificationContext';
import type {
  ComplianceStatus,
  AssessmentMatrixRow,
  System,
  CSFControl,
  RiskLevel,
} from '../types/api.types';

// Status configuration
const COMPLIANCE_STATUSES: { value: ComplianceStatus; label: string; color: string }[] = [
  { value: 'Implemented', label: 'Compliant', color: '#4caf50' },
  { value: 'Partially Implemented', label: 'Partially Compliant', color: '#ff9800' },
  { value: 'Not Implemented', label: 'Non-Compliant', color: '#f44336' },
  { value: 'Not Assessed', label: 'Not Assessed', color: '#9e9e9e' },
  { value: 'Not Applicable', label: 'Not Applicable', color: '#757575' },
];

// CSF Functions for filtering
const CSF_FUNCTIONS = [
  { code: 'GV', name: 'Govern' },
  { code: 'ID', name: 'Identify' },
  { code: 'PR', name: 'Protect' },
  { code: 'DE', name: 'Detect' },
  { code: 'RS', name: 'Respond' },
  { code: 'RC', name: 'Recover' },
];

// Status icon component
const StatusIcon: React.FC<{ status: ComplianceStatus }> = ({ status }) => {
  const config = COMPLIANCE_STATUSES.find((s) => s.value === status);
  const color = config?.color || '#9e9e9e';

  switch (status) {
    case 'Implemented':
      return <CheckCircleIcon sx={{ color, fontSize: 20 }} />;
    case 'Partially Implemented':
      return <WarningIcon sx={{ color, fontSize: 20 }} />;
    case 'Not Implemented':
      return <CancelIcon sx={{ color, fontSize: 20 }} />;
    case 'Not Applicable':
      return <RemoveCircleIcon sx={{ color, fontSize: 20 }} />;
    default:
      return <RadioButtonUncheckedIcon sx={{ color, fontSize: 20 }} />;
  }
};

// Assessment Detail Modal Component
interface AssessmentDetailModalProps {
  open: boolean;
  onClose: () => void;
  systemName: string;
  controlCode: string;
  control: CSFControl | undefined;
  assessmentData: {
    assessmentId?: string;
    status: ComplianceStatus;
    riskLevel?: RiskLevel;
    assessedDate?: string;
  };
  systemId: string;
  productId: string;
  onSave: () => void;
}

const AssessmentDetailModal: React.FC<AssessmentDetailModalProps> = ({
  open,
  onClose,
  systemName,
  controlCode,
  control,
  assessmentData,
  systemId,
  productId,
  onSave,
}) => {
  const { showNotification } = useNotification();
  const updateAssessment = useUpdateAssessment();

  const [status, setStatus] = useState<ComplianceStatus>(assessmentData.status);
  const [implementationNotes, setImplementationNotes] = useState('');
  const [evidence, setEvidence] = useState('');
  const [remediationPlan, setRemediationPlan] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel | ''>('');

  const handleSave = async () => {
    if (!assessmentData.assessmentId) {
      showNotification('Assessment ID not found', 'error');
      return;
    }

    try {
      await updateAssessment.mutateAsync({
        id: assessmentData.assessmentId,
        updates: {
          status,
          implementationNotes: implementationNotes || undefined,
          evidence: evidence || undefined,
          remediationPlan: remediationPlan || undefined,
          riskLevel: riskLevel || undefined,
        },
      });
      showNotification('Assessment updated successfully', 'success');
      onSave();
      onClose();
    } catch (error) {
      showNotification('Failed to update assessment', 'error');
    }
  };

  const needsRemediation = status === 'Not Implemented' || status === 'Partially Implemented';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Assessment Details</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
          {systemName} - {controlCode}
        </Typography>
      </DialogTitle>

      <Divider />

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {control && (
            <Box>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Control Information
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Title:</strong> {control.subcategoryName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Function:</strong> {control.functionName} ({control.functionCode})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Category:</strong> {control.categoryName} ({control.categoryCode})
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {control.description}
              </Typography>
            </Box>
          )}

          <Divider />

          <FormControl fullWidth required>
            <InputLabel>Compliance Status</InputLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as ComplianceStatus)}
              label="Compliance Status"
            >
              {COMPLIANCE_STATUSES.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <StatusIcon status={s.value} />
                    {s.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Risk Level</InputLabel>
            <Select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as RiskLevel | '')}
              label="Risk Level"
            >
              <MenuItem value="">
                <em>Not Set</em>
              </MenuItem>
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Implementation Notes / Findings"
            multiline
            rows={4}
            value={implementationNotes}
            onChange={(e) => setImplementationNotes(e.target.value)}
            placeholder="Describe the current implementation status, controls in place, or findings..."
            fullWidth
          />

          <TextField
            label="Evidence"
            multiline
            rows={3}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="List evidence items, documentation, or proof of implementation..."
            fullWidth
            helperText="Enter evidence descriptions (file upload feature coming soon)"
          />

          {needsRemediation && (
            <TextField
              label="Remediation Plan"
              multiline
              rows={4}
              value={remediationPlan}
              onChange={(e) => setRemediationPlan(e.target.value)}
              placeholder="Describe the plan to achieve compliance..."
              fullWidth
              required={status === 'Not Implemented'}
            />
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={updateAssessment.isPending}
          startIcon={updateAssessment.isPending ? <CircularProgress size={16} /> : null}
        >
          Save Assessment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main ProductAssessments Page Component
const ProductAssessments: React.FC = () => {
  const navigate = useNavigate();
  const { id: productId } = useParams<{ id: string }>();
  const { showNotification } = useNotification();

  // State management
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [functionFilter, setFunctionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    systemId: string;
    systemName: string;
    controlId: string;
    controlCode: string;
    assessmentData: {
      assessmentId?: string;
      status: ComplianceStatus;
      riskLevel?: RiskLevel;
      assessedDate?: string;
    };
  } | null>(null);

  // Data fetching
  const { data: product, isLoading: productLoading } = useProduct(productId || '');
  const { data: systems } = useSystems(productId || undefined);
  const {
    data: matrixData,
    isLoading: matrixLoading,
    refetch: refetchMatrix,
  } = useAssessmentMatrix(productId || '', {
    enabled: !!productId,
  });
  const { data: allControls } = useCSFControls();

  // Filter matrix rows based on filters
  const filteredRows = useMemo(() => {
    if (!matrixData) return [];

    let rows = matrixData.rows;

    // Function filter
    if (functionFilter !== 'all') {
      rows = rows.filter((row) => row.functionCode === functionFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      rows = rows.filter((row) => {
        return Object.values(row.systems).some((sys) => sys.status === statusFilter);
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.subcategoryCode.toLowerCase().includes(query) ||
          row.subcategoryName.toLowerCase().includes(query)
      );
    }

    return rows;
  }, [matrixData, functionFilter, statusFilter, searchQuery]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!matrixData) {
      return {
        total: 0,
        compliant: 0,
        partiallyCompliant: 0,
        nonCompliant: 0,
        notAssessed: 0,
        notApplicable: 0,
        complianceScore: 0,
      };
    }

    let total = 0;
    let compliant = 0;
    let partiallyCompliant = 0;
    let nonCompliant = 0;
    let notAssessed = 0;
    let notApplicable = 0;

    matrixData.rows.forEach((row) => {
      Object.values(row.systems).forEach((sys) => {
        total++;
        switch (sys.status) {
          case 'Implemented':
            compliant++;
            break;
          case 'Partially Implemented':
            partiallyCompliant++;
            break;
          case 'Not Implemented':
            nonCompliant++;
            break;
          case 'Not Assessed':
            notAssessed++;
            break;
          case 'Not Applicable':
            notApplicable++;
            break;
        }
      });
    });

    const assessed = total - notAssessed - notApplicable;
    const complianceScore = assessed > 0 ? Math.round(((compliant + partiallyCompliant * 0.5) / assessed) * 100) : 0;

    return {
      total,
      compliant,
      partiallyCompliant,
      nonCompliant,
      notAssessed,
      notApplicable,
      complianceScore,
    };
  }, [matrixData]);

  // Cell click handler
  const handleCellClick = useCallback(
    (row: AssessmentMatrixRow, system: System) => {
      const systemData = row.systems[system.id];
      if (!systemData) return;

      setSelectedCell({
        systemId: system.id,
        systemName: system.name,
        controlId: row.controlId,
        controlCode: row.subcategoryCode,
        assessmentData: systemData,
      });
      setModalOpen(true);
    },
    []
  );

  // Get control details for modal
  const selectedControl = useMemo(() => {
    if (!selectedCell || !allControls) return undefined;
    return allControls.find((c) => c.id === selectedCell.controlId);
  }, [selectedCell, allControls]);

  // Handle modal save
  const handleModalSave = useCallback(() => {
    refetchMatrix();
  }, [refetchMatrix]);

  // Loading state
  if (productLoading || !productId) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (!product) {
    return (
      <Box>
        <Alert severity="error">Product not found.</Alert>
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

  // Get systems from matrix data or from useSystems
  const displaySystems = matrixData?.systems || systems || [];

  return (
    <Box>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/products/${productId}`)}
        sx={{ mb: 2 }}
      >
        Back to {product.name}
      </Button>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1">
            Assessment Matrix
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {product.name} - Compliance Assessment
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => showNotification('Export coming soon', 'info')}
            size="small"
          >
            Export
          </Button>
        </Stack>
      </Box>

      {/* Summary Panel */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {summary.complianceScore}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Compliance Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {summary.compliant}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Compliant
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {summary.partiallyCompliant}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Partial
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="error.main">
                {summary.nonCompliant}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Non-Compliant
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="text.secondary">
                {summary.notAssessed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Not Assessed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h4">
                {summary.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters Panel */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>CSF Function</InputLabel>
              <Select
                value={functionFilter}
                onChange={(e) => setFunctionFilter(e.target.value)}
                label="CSF Function"
              >
                <MenuItem value="all">All Functions</MenuItem>
                {CSF_FUNCTIONS.map((func) => (
                  <MenuItem key={func.code} value={func.code}>
                    {func.code} - {func.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {COMPLIANCE_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by control ID or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Assessment Matrix */}
      {matrixLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      ) : !matrixData || displaySystems.length === 0 ? (
        <Alert severity="info">
          No systems found for this product. Please add systems and configure the CSF baseline to begin assessments.
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(`/products/${productId}/baseline`)}
              sx={{ mr: 1 }}
            >
              Configure Baseline
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => navigate(`/products/${productId}`)}
            >
              Add Systems
            </Button>
          </Box>
        </Alert>
      ) : filteredRows.length === 0 ? (
        <Alert severity="info">
          No controls match the current filters. Try adjusting your filters or configure the CSF baseline.
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(`/products/${productId}/baseline`)}
            >
              Configure Baseline
            </Button>
          </Box>
        </Alert>
      ) : (
        <Paper sx={{ overflow: 'auto' }}>
          <Box sx={{ minWidth: 800 }}>
            {/* Matrix Header */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `250px repeat(${displaySystems.length}, 120px)`,
                borderBottom: 2,
                borderColor: 'divider',
                bgcolor: 'background.default',
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}
            >
              <Box sx={{ p: 2, fontWeight: 'bold', borderRight: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2">CSF Control</Typography>
              </Box>
              {displaySystems.map((system) => (
                <Box
                  key={system.id}
                  sx={{
                    p: 2,
                    borderRight: 1,
                    borderColor: 'divider',
                    textAlign: 'center',
                  }}
                >
                  <Tooltip title={system.name}>
                    <Typography variant="subtitle2" noWrap>
                      {system.name}
                    </Typography>
                  </Tooltip>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {system.environment}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Matrix Rows */}
            {filteredRows.map((row, rowIndex) => (
              <Box
                key={row.controlId}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `250px repeat(${displaySystems.length}, 120px)`,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: rowIndex % 2 === 0 ? 'background.paper' : 'action.hover',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                {/* Control Info */}
                <Box
                  sx={{
                    p: 2,
                    borderRight: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {row.subcategoryCode}
                  </Typography>
                  <Tooltip title={row.subcategoryName}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {row.subcategoryName}
                    </Typography>
                  </Tooltip>
                </Box>

                {/* Assessment Cells */}
                {displaySystems.map((system) => {
                  const systemData = row.systems[system.id];
                  return (
                    <Box
                      key={system.id}
                      onClick={() => handleCellClick(row, system)}
                      sx={{
                        p: 2,
                        borderRight: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: 'action.focus',
                          transform: 'scale(1.1)',
                        },
                      }}
                    >
                      {systemData ? (
                        <Tooltip
                          title={`${COMPLIANCE_STATUSES.find((s) => s.value === systemData.status)?.label || systemData.status}`}
                        >
                          <Box>
                            <StatusIcon status={systemData.status} />
                          </Box>
                        </Tooltip>
                      ) : (
                        <RadioButtonUncheckedIcon sx={{ color: '#9e9e9e', fontSize: 20 }} />
                      )}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Assessment Detail Modal */}
      {selectedCell && (
        <AssessmentDetailModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          systemName={selectedCell.systemName}
          controlCode={selectedCell.controlCode}
          control={selectedControl}
          assessmentData={selectedCell.assessmentData}
          systemId={selectedCell.systemId}
          productId={productId || ''}
          onSave={handleModalSave}
        />
      )}
    </Box>
  );
};

export default ProductAssessments;

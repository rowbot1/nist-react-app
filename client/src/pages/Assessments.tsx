import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  Stack,
  Alert,
  CircularProgress,
  Divider,
  Checkbox,
  Chip,
  Collapse,
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  RemoveCircleOutline as RemoveCircleIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useProducts } from '../hooks/useProducts';
import { useSystems } from '../hooks/useSystems';
import { useAssessmentMatrix, useUpdateAssessment } from '../hooks/useAssessments';
import { useCSFControls } from '../hooks/useCSF';
import { useNotification } from '../contexts/NotificationContext';
import { useSaveStatus } from '../contexts/SaveStatusContext';
import { EvidenceUpload } from '../components/EvidenceUpload';
import { ExportMenu } from '../components/ExportMenu';
import type { AssessmentMatrixRow as ExportMatrixRow } from '../services/exportService';
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

          {assessmentData.assessmentId && (
            <EvidenceUpload assessmentId={assessmentData.assessmentId} />
          )}

          <TextField
            label="Evidence Notes (Optional)"
            multiline
            rows={2}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Additional notes about the evidence..."
            fullWidth
            helperText="Use the upload area above for files. This field is for additional notes."
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

          {control && control.nist80053Mappings && control.nist80053Mappings.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                NIST 800-53 Mappings
              </Typography>
              <Stack spacing={1}>
                {control.nist80053Mappings.map((mapping) => (
                  <Paper key={mapping.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {mapping.controlId} - {mapping.controlName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Family: {mapping.controlFamily} | Priority: {mapping.priorityLevel}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>
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

// Selected assessment cell type for bulk actions
interface SelectedAssessmentCell {
  assessmentId: string;
  systemId: string;
  systemName: string;
  controlCode: string;
  currentStatus: ComplianceStatus;
}

// Bulk Action Modal Component
interface BulkActionModalProps {
  open: boolean;
  onClose: () => void;
  selectedCells: SelectedAssessmentCell[];
  onApply: (status: ComplianceStatus) => void;
  isLoading: boolean;
}

const BulkActionModal: React.FC<BulkActionModalProps> = ({
  open,
  onClose,
  selectedCells,
  onApply,
  isLoading,
}) => {
  const [newStatus, setNewStatus] = useState<ComplianceStatus>('Not Assessed');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Bulk Update Assessments</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Alert severity="info">
            You have selected {selectedCells.length} assessment{selectedCells.length !== 1 ? 's' : ''} to update.
          </Alert>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Selected Assessments:
            </Typography>
            <Box sx={{ maxHeight: 150, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
              {selectedCells.slice(0, 10).map((cell) => (
                <Chip
                  key={cell.assessmentId}
                  label={`${cell.systemName} - ${cell.controlCode}`}
                  size="small"
                  sx={{ m: 0.5 }}
                  onDelete={() => {/* could add individual removal */}}
                />
              ))}
              {selectedCells.length > 10 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  ...and {selectedCells.length - 10} more
                </Typography>
              )}
            </Box>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Set Status To</InputLabel>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ComplianceStatus)}
              label="Set Status To"
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
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={() => onApply(newStatus)}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : <EditIcon />}
        >
          Update {selectedCells.length} Assessment{selectedCells.length !== 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main Assessments Page Component
const Assessments: React.FC = () => {
  const { showNotification } = useNotification();
  const { startSaving, setSaved, setError: setSaveError } = useSaveStatus();

  // State management
  const [selectedProductId, setSelectedProductId] = useState<string>('');
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

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<SelectedAssessmentCell[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Data fetching
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: systems } = useSystems(selectedProductId || undefined);
  const {
    data: matrixData,
    isLoading: matrixLoading,
    refetch: refetchMatrix,
  } = useAssessmentMatrix(selectedProductId, {
    enabled: !!selectedProductId,
  });
  const { data: allControls } = useCSFControls();

  // Mutations
  const updateAssessment = useUpdateAssessment();

  // Set default product if none selected
  React.useEffect(() => {
    if (products && products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

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

  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Clear selections when exiting selection mode
      setSelectedCells([]);
    }
  }, [selectionMode]);

  // Check if a cell is selected
  const isCellSelected = useCallback(
    (assessmentId: string) => {
      return selectedCells.some((c) => c.assessmentId === assessmentId);
    },
    [selectedCells]
  );

  // Toggle cell selection
  const toggleCellSelection = useCallback(
    (row: AssessmentMatrixRow, system: System) => {
      const systemData = row.systems[system.id];
      if (!systemData || !systemData.assessmentId) return;

      const cell: SelectedAssessmentCell = {
        assessmentId: systemData.assessmentId,
        systemId: system.id,
        systemName: system.name,
        controlCode: row.subcategoryCode,
        currentStatus: systemData.status,
      };

      setSelectedCells((prev) => {
        const exists = prev.some((c) => c.assessmentId === cell.assessmentId);
        if (exists) {
          return prev.filter((c) => c.assessmentId !== cell.assessmentId);
        } else {
          return [...prev, cell];
        }
      });
    },
    []
  );

  // Select all visible cells
  const selectAllVisible = useCallback(() => {
    if (!filteredRows || !systems) return;

    const allCells: SelectedAssessmentCell[] = [];
    filteredRows.forEach((row) => {
      systems.forEach((system) => {
        const systemData = row.systems[system.id];
        if (systemData && systemData.assessmentId) {
          allCells.push({
            assessmentId: systemData.assessmentId,
            systemId: system.id,
            systemName: system.name,
            controlCode: row.subcategoryCode,
            currentStatus: systemData.status,
          });
        }
      });
    });
    setSelectedCells(allCells);
  }, [filteredRows, systems]);

  // Clear all selections
  const clearAllSelections = useCallback(() => {
    setSelectedCells([]);
  }, []);

  // Handle bulk update apply
  const handleBulkApply = useCallback(
    async (newStatus: ComplianceStatus) => {
      if (selectedCells.length === 0) return;

      startSaving();
      try {
        // Update assessments one at a time (server doesn't have proper bulk endpoint yet)
        // In future, could be replaced with proper bulk API call
        const updatePromises = selectedCells.map((cell) =>
          updateAssessment.mutateAsync({
            id: cell.assessmentId,
            updates: { status: newStatus },
          })
        );

        await Promise.all(updatePromises);

        setSaved();
        showNotification(`Successfully updated ${selectedCells.length} assessments`, 'success');
        setBulkModalOpen(false);
        setSelectedCells([]);
        setSelectionMode(false);
        refetchMatrix();
      } catch (error) {
        setSaveError('Failed to update assessments');
        showNotification('Failed to update some assessments', 'error');
      }
    },
    [selectedCells, updateAssessment, showNotification, refetchMatrix, startSaving, setSaved, setSaveError]
  );

  // Convert API matrix data to export format
  const exportData = useMemo((): ExportMatrixRow[] => {
    if (!filteredRows || filteredRows.length === 0 || !systems) return [];

    return filteredRows.map((row) => {
      const exportRow: ExportMatrixRow = {
        functionCode: row.functionCode || '',
        categoryCode: row.categoryCode || '',
        controlCode: row.subcategoryCode,
        controlName: row.subcategoryName,
      };

      // Add status for each system
      systems.forEach((system: System) => {
        const systemData = row.systems[system.id];
        // Map internal status to export-friendly status
        const status = systemData?.status || 'Not Assessed';
        const displayStatus = COMPLIANCE_STATUSES.find(s => s.value === status)?.label || status;
        exportRow[system.name] = displayStatus as string;
      });

      return exportRow;
    });
  }, [filteredRows, systems]);

  // Get system names for export
  const systemNames = useMemo(() => {
    return systems?.map((s: System) => s.name) || [];
  }, [systems]);

  // Get selected product for export
  const selectedProduct = useMemo(() => {
    return products?.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Loading state
  if (productsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // No products state
  if (!products || products.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Compliance Assessments
        </Typography>
        <Alert severity="info">No products found. Please create a product first.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Compliance Assessments
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant={selectionMode ? 'contained' : 'outlined'}
            color={selectionMode ? 'secondary' : 'primary'}
            startIcon={selectionMode ? <DeselectIcon /> : <SelectAllIcon />}
            onClick={toggleSelectionMode}
            size="small"
          >
            {selectionMode ? 'Exit Selection' : 'Bulk Edit'}
          </Button>
          <ExportMenu
            product={selectedProduct ? {
              id: selectedProduct.id,
              name: selectedProduct.name,
              description: selectedProduct.description || '',
              complianceScore: summary.complianceScore,
            } : undefined}
            matrixData={exportData}
            systemNames={systemNames}
            size="small"
            disabled={!exportData || exportData.length === 0}
          />
        </Stack>
      </Box>

      {/* Bulk Action Toolbar */}
      <Collapse in={selectionMode}>
        <Paper
          sx={{
            p: 2,
            mb: 3,
            bgcolor: 'secondary.main',
            color: 'secondary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="subtitle1" fontWeight="medium">
              Selection Mode Active
            </Typography>
            <Chip
              label={`${selectedCells.length} selected`}
              color="default"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }}
            />
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={selectAllVisible}
              startIcon={<SelectAllIcon />}
              sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)' }}
            >
              Select All Visible
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={clearAllSelections}
              startIcon={<DeselectIcon />}
              sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)' }}
            >
              Clear Selection
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => setBulkModalOpen(true)}
              disabled={selectedCells.length === 0}
              startIcon={<EditIcon />}
              sx={{ bgcolor: 'white', color: 'secondary.main', '&:hover': { bgcolor: 'grey.200' } }}
            >
              Update Selected
            </Button>
          </Stack>
        </Paper>
      </Collapse>

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
                Partially Compliant
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
                Total Assessments
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
              <InputLabel>Product</InputLabel>
              <Select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                label="Product"
              >
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
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

          <Grid item xs={12} sm={6} md={2}>
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

          <Grid item xs={12} sm={6} md={5}>
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
      ) : !matrixData || !systems || systems.length === 0 ? (
        <Alert severity="info">
          No systems found for this product. Please add systems to begin assessments.
        </Alert>
      ) : (
        <Paper sx={{ overflow: 'auto' }}>
          <Box sx={{ minWidth: 800 }}>
            {/* Matrix Header */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `250px repeat(${systems.length}, 120px)`,
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
              {systems.map((system) => (
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
            {filteredRows.length === 0 ? (
              <Box p={4} textAlign="center">
                <Typography color="text.secondary">
                  No controls match the current filters
                </Typography>
              </Box>
            ) : (
              filteredRows.map((row, rowIndex) => (
                <Box
                  key={row.controlId}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `250px repeat(${systems.length}, 120px)`,
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
                  {systems.map((system) => {
                    const systemData = row.systems[system.id];
                    const isSelected = systemData?.assessmentId && isCellSelected(systemData.assessmentId);
                    return (
                      <Box
                        key={system.id}
                        onClick={() => {
                          if (selectionMode && systemData?.assessmentId) {
                            toggleCellSelection(row, system);
                          } else {
                            handleCellClick(row, system);
                          }
                        }}
                        sx={{
                          p: selectionMode ? 1 : 2,
                          borderRight: 1,
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          bgcolor: isSelected ? 'secondary.light' : 'inherit',
                          '&:hover': {
                            bgcolor: 'action.focus',
                            transform: 'scale(1.1)',
                          },
                        }}
                      >
                        {selectionMode && systemData?.assessmentId ? (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Checkbox
                              checked={!!isSelected}
                              size="small"
                              sx={{ p: 0 }}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleCellSelection(row, system)}
                            />
                            <StatusIcon status={systemData.status} />
                          </Box>
                        ) : systemData ? (
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
              ))
            )}
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
          productId={selectedProductId}
          onSave={handleModalSave}
        />
      )}

      {/* Bulk Action Modal */}
      <BulkActionModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        selectedCells={selectedCells}
        onApply={handleBulkApply}
        isLoading={updateAssessment.isPending}
      />
    </Box>
  );
};

export default Assessments;

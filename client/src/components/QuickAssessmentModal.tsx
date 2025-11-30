/**
 * Quick Assessment Modal
 *
 * A global modal that can be triggered from anywhere to quickly assess a control.
 * Opens inline without full page navigation, preserving user context.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tabs,
  Tab,
  Stack,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  RemoveCircle as RemoveCircleIcon,
  Cancel as CancelIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Lightbulb as TipIcon,
  AttachFile as AttachFileIcon,
  Save as SaveIcon,
  Policy as PolicyIcon,
} from '@mui/icons-material';
import { useCreateAssessment, useUpdateAssessment } from '../hooks/useAssessments';
import { useProducts } from '../hooks/useProducts';
import { useSystems } from '../hooks/useSystems';
import { useCSFMappings } from '../hooks/useCSF';
import { useNotification } from '../contexts/NotificationContext';
import type { ComplianceStatus } from '../types/api.types';

// CSF Function colors
const FUNCTION_COLORS: Record<string, string> = {
  GV: '#6366f1',
  ID: '#3b82f6',
  PR: '#22c55e',
  DE: '#f59e0b',
  RS: '#ef4444',
  RC: '#8b5cf6',
};

// Status configuration
const STATUS_OPTIONS: { value: ComplianceStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'Implemented', label: 'Implemented', color: '#4caf50', icon: <CheckCircleIcon /> },
  { value: 'Partially Implemented', label: 'Partially Implemented', color: '#ff9800', icon: <RemoveCircleIcon /> },
  { value: 'Not Implemented', label: 'Not Implemented', color: '#f44336', icon: <CancelIcon /> },
  { value: 'Not Applicable', label: 'Not Applicable', color: '#757575', icon: <RadioButtonUncheckedIcon /> },
  { value: 'Not Assessed', label: 'Not Assessed', color: '#9e9e9e', icon: <RadioButtonUncheckedIcon /> },
];

export interface QuickAssessmentData {
  controlCode: string;
  controlName: string;
  functionCode: string;
  categoryCode: string;
  productId?: string;
  systemId?: string;
  assessmentId?: string;
  currentStatus?: ComplianceStatus;
  currentNotes?: string;
  currentEvidence?: string;
}

interface QuickAssessmentModalProps {
  open: boolean;
  onClose: () => void;
  data: QuickAssessmentData | null;
  onSuccess?: () => void;
}

const QuickAssessmentModal: React.FC<QuickAssessmentModalProps> = ({
  open,
  onClose,
  data,
  onSuccess,
}) => {
  const theme = useTheme();
  const { showNotification } = useNotification();

  // Form state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [status, setStatus] = useState<ComplianceStatus>('Not Assessed');
  const [notes, setNotes] = useState('');
  const [evidence, setEvidence] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  // Data hooks
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: systems, isLoading: systemsLoading } = useSystems(selectedProductId || undefined);

  // Fetch NIST 800-53 mappings for this control
  const { data: mappingsData, isLoading: mappingsLoading } = useCSFMappings(data?.controlCode || '', {
    enabled: open && !!data?.controlCode,
  });

  // Mutation hooks
  const createAssessment = useCreateAssessment();
  const updateAssessment = useUpdateAssessment();

  // Initialize form when data changes
  useEffect(() => {
    if (data) {
      setSelectedProductId(data.productId || '');
      setSelectedSystemId(data.systemId || '');
      setStatus(data.currentStatus || 'Not Assessed');
      setNotes(data.currentNotes || '');
      setEvidence(data.currentEvidence || '');
      setActiveTab(0);
    }
  }, [data]);

  // Auto-select first system when product changes
  useEffect(() => {
    if (systems && systems.length > 0 && !selectedSystemId) {
      setSelectedSystemId(systems[0].id);
    }
  }, [systems, selectedSystemId]);

  const handleSave = async () => {
    if (!selectedSystemId || !data) {
      showNotification('Please select a system', 'warning');
      return;
    }

    try {
      if (data.assessmentId) {
        // Update existing assessment
        await updateAssessment.mutateAsync({
          id: data.assessmentId,
          updates: {
            status,
            implementationNotes: notes,
            evidence,
          },
        });
        showNotification('Assessment updated successfully', 'success');
      } else {
        // Create new assessment
        await createAssessment.mutateAsync({
          productId: selectedProductId,
          systemId: selectedSystemId,
          controlId: data.controlCode,
          status,
          implementationNotes: notes,
          evidence,
        });
        showNotification('Assessment created successfully', 'success');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      showNotification('Failed to save assessment', 'error');
    }
  };

  const isLoading = createAssessment.isPending || updateAssessment.isPending;
  const functionColor = data ? FUNCTION_COLORS[data.functionCode] || '#6b7280' : '#6b7280';

  if (!data) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderTop: `4px solid ${functionColor}`,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chip
                label={data.functionCode}
                size="small"
                sx={{
                  bgcolor: functionColor,
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
              <Chip
                label={data.categoryCode}
                size="small"
                variant="outlined"
                sx={{ borderColor: functionColor, color: functionColor }}
              />
              <Typography variant="h6" fontWeight="bold">
                {data.controlCode}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500 }}>
              {data.controlName}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Product/System Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Scope
          </Typography>
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Product</InputLabel>
              <Select
                value={selectedProductId}
                label="Product"
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setSelectedSystemId('');
                }}
                disabled={productsLoading}
              >
                {products?.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>System</InputLabel>
              <Select
                value={selectedSystemId}
                label="System"
                onChange={(e) => setSelectedSystemId(e.target.value)}
                disabled={systemsLoading || !selectedProductId}
              >
                {systems?.map((system) => (
                  <MenuItem key={system.id} value={system.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {system.name}
                      <Chip
                        label={system.environment}
                        size="small"
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Status Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Compliance Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map((option) => (
              <Tooltip key={option.value} title={option.label}>
                <Button
                  variant={status === option.value ? 'contained' : 'outlined'}
                  onClick={() => setStatus(option.value)}
                  sx={{
                    minWidth: 'auto',
                    px: 2,
                    py: 1,
                    bgcolor: status === option.value ? option.color : 'transparent',
                    borderColor: option.color,
                    color: status === option.value ? 'white' : option.color,
                    '&:hover': {
                      bgcolor: status === option.value ? option.color : alpha(option.color, 0.1),
                      borderColor: option.color,
                    },
                  }}
                  startIcon={option.icon}
                >
                  {option.label}
                </Button>
              </Tooltip>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Tabs for Details */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Notes" />
          <Tab label="Evidence" />
          <Tab label="Guidance" icon={<TipIcon fontSize="small" />} iconPosition="end" />
        </Tabs>

        {/* Notes Tab */}
        {activeTab === 0 && (
          <Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Implementation Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe how this control is implemented, any gaps, or findings..."
              helperText="Document your assessment findings and observations"
            />
          </Box>
        )}

        {/* Evidence Tab */}
        {activeTab === 1 && (
          <Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Evidence References"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Reference supporting evidence: ticket numbers, document names, screenshots..."
              helperText="List evidence that supports your assessment"
            />
            <Alert severity="info" sx={{ mt: 2 }} icon={<AttachFileIcon />}>
              To attach files, use the full Assessment Workspace. This quick modal supports text references only.
            </Alert>
          </Box>
        )}

        {/* Guidance Tab */}
        {activeTab === 2 && (
          <Box>
            <Alert severity="info" icon={<TipIcon />} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Assessment Guidance for {data.controlCode}
              </Typography>
              <Typography variant="body2">
                Review the control requirements and verify implementation against your organization's security policies.
              </Typography>
            </Alert>

            {/* NIST 800-53 Rev 5 Mappings */}
            <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), p: 2, borderRadius: 1, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PolicyIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" color="primary.main">
                  NIST 800-53 Rev 5 Mappings
                </Typography>
                {mappingsData && (
                  <Chip
                    label={`${mappingsData.totalMappings} controls`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
              {mappingsLoading ? (
                <Box display="flex" justifyContent="center" p={1}>
                  <CircularProgress size={20} />
                </Box>
              ) : mappingsData && mappingsData.totalMappings > 0 ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Related security controls:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {mappingsData.mappings.map((mapping) => (
                      <Tooltip
                        key={mapping.id}
                        title={`${mapping.controlFamily} Family - Priority: ${mapping.priority || 'N/A'}`}
                      >
                        <Chip
                          label={mapping.nist80053Id}
                          size="small"
                          variant="outlined"
                          color={
                            mapping.priority === 'P1'
                              ? 'error'
                              : mapping.priority === 'P2'
                              ? 'warning'
                              : 'default'
                          }
                          sx={{ fontSize: '0.75rem' }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No NIST 800-53 mappings found for this control.
                </Typography>
              )}
            </Box>

            <Box sx={{ bgcolor: alpha(theme.palette.info.main, 0.05), p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Key Questions to Consider:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
                <li>Is the control formally documented in policies?</li>
                <li>Is there evidence of implementation?</li>
                <li>Is the control monitored and tested regularly?</li>
                <li>Are deviations tracked and remediated?</li>
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isLoading || !selectedSystemId}
          startIcon={isLoading ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {data.assessmentId ? 'Update Assessment' : 'Save Assessment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickAssessmentModal;

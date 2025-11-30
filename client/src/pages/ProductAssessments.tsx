/**
 * Product Assessments Page
 *
 * Shows the assessment matrix for a specific product with all its systems.
 * Allows users to assess each CSF control across all systems.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Menu,
  ListItemIcon,
  ListItemText,
  Badge,
  LinearProgress,
  Drawer,
  ToggleButtonGroup,
  ToggleButton,
  SwipeableDrawer,
  useMediaQuery,
  useTheme,
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
  ExpandMore as ExpandMoreIcon,
  Policy as PolicyIcon,
  ContentCopy as ContentCopyIcon,
  AttachFile as AttachFileIcon,
  NavigateNext as NavigateNextIcon,
  NavigateBefore as NavigateBeforeIcon,
  Speed as SpeedIcon,
  Comment as CommentIcon,
  Approval as ApprovalIcon,
  History as HistoryIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useProduct } from '../hooks/useProducts';
import { useSystems } from '../hooks/useSystems';
import { useAssessmentMatrix, useUpdateAssessment } from '../hooks/useAssessments';
import { useCSFControls, useCSFMappings } from '../hooks/useCSF';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import Comments from '../components/Comments';
import AssignmentBadge from '../components/AssignmentBadge';
import ApprovalWorkflow from '../components/ApprovalWorkflow';
import AuditHistory from '../components/AuditHistory';
import EvidenceUpload from '../components/EvidenceUpload';
import MobileAssessmentCard from '../components/MobileAssessmentCard';
import { useMobileView } from '../hooks/useResponsive';
import type {
  ComplianceStatus,
  AssessmentMatrixRow,
  AssessmentMatrix,
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
const StatusIcon: React.FC<{ status: ComplianceStatus; hasEvidence?: boolean }> = ({ status, hasEvidence }) => {
  const config = COMPLIANCE_STATUSES.find((s) => s.value === status);
  const color = config?.color || '#9e9e9e';

  const icon = (() => {
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
  })();

  // Show evidence badge if evidence exists
  if (hasEvidence) {
    return (
      <Badge
        badgeContent={<AttachFileIcon sx={{ fontSize: 10 }} />}
        sx={{
          '& .MuiBadge-badge': {
            bgcolor: 'primary.main',
            color: 'white',
            minWidth: 14,
            height: 14,
            fontSize: 8,
            right: -4,
            top: -4,
          },
        }}
      >
        {icon}
      </Badge>
    );
  }

  return icon;
};

// Copy Assessment Dialog Component
interface CopyAssessmentDialogProps {
  open: boolean;
  onClose: () => void;
  targetSystemId: string;
  targetSystemName: string;
  availableSystems: Array<{ id: string; name: string }>;
  matrixData: AssessmentMatrix | undefined;
  onCopy: (sourceSystemId: string) => void;
  copying: boolean;
}

const CopyAssessmentDialog: React.FC<CopyAssessmentDialogProps> = ({
  open,
  onClose,
  targetSystemId,
  targetSystemName,
  availableSystems,
  matrixData,
  onCopy,
  copying,
}) => {
  const [sourceSystemId, setSourceSystemId] = useState('');

  // Calculate preview of what would be copied
  const copyPreview = useMemo(() => {
    if (!sourceSystemId || !matrixData) return null;

    let totalControls = 0;
    let willCopy = 0;
    let alreadyAssessed = 0;

    matrixData.rows.forEach((row) => {
      totalControls++;
      const sourceData = row.systems[sourceSystemId];
      const targetData = row.systems[targetSystemId];

      if (sourceData && sourceData.status !== 'Not Assessed') {
        if (!targetData || targetData.status === 'Not Assessed') {
          willCopy++;
        } else {
          alreadyAssessed++;
        }
      }
    });

    return { totalControls, willCopy, alreadyAssessed };
  }, [sourceSystemId, matrixData, targetSystemId]);

  const handleCopy = () => {
    if (sourceSystemId) {
      onCopy(sourceSystemId);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <ContentCopyIcon color="primary" />
            <Typography variant="h6">Copy Assessments</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Alert severity="info">
            Copy all assessment statuses and notes from another system to <strong>{targetSystemName}</strong>.
            Only controls that haven't been assessed yet will be updated.
          </Alert>

          <FormControl fullWidth>
            <InputLabel>Source System</InputLabel>
            <Select
              value={sourceSystemId}
              onChange={(e) => setSourceSystemId(e.target.value)}
              label="Source System"
            >
              {availableSystems
                .filter((s) => s.id !== targetSystemId)
                .map((system) => (
                  <MenuItem key={system.id} value={system.id}>
                    {system.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {copyPreview && (
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Copy Preview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="h5" color="primary">
                    {copyPreview.willCopy}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Will be copied
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h5" color="text.secondary">
                    {copyPreview.alreadyAssessed}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Already assessed (skipped)
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h5">
                    {copyPreview.totalControls}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total controls
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          {copying && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Copying assessments...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={copying}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCopy}
          disabled={!sourceSystemId || copying || (copyPreview?.willCopy === 0)}
          startIcon={copying ? <CircularProgress size={16} /> : <ContentCopyIcon />}
        >
          Copy {copyPreview?.willCopy || 0} Assessments
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Inline Status Menu Component (for quick status change)
interface InlineStatusMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  currentStatus: ComplianceStatus;
  onStatusChange: (status: ComplianceStatus) => void;
  updating: boolean;
}

const InlineStatusMenu: React.FC<InlineStatusMenuProps> = ({
  anchorEl,
  open,
  onClose,
  currentStatus,
  onStatusChange,
  updating,
}) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      {COMPLIANCE_STATUSES.map((status) => (
        <MenuItem
          key={status.value}
          onClick={() => onStatusChange(status.value)}
          selected={status.value === currentStatus}
          disabled={updating}
          sx={{ minWidth: 180 }}
        >
          <ListItemIcon>
            <StatusIcon status={status.value} />
          </ListItemIcon>
          <ListItemText>{status.label}</ListItemText>
        </MenuItem>
      ))}
    </Menu>
  );
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
  const { user } = useAuth();
  const updateAssessment = useUpdateAssessment();

  // Fetch NIST 800-53 mappings for this control
  const { data: mappingsData, isLoading: mappingsLoading } = useCSFMappings(controlCode, {
    enabled: open && !!controlCode,
  });

  const [status, setStatus] = useState<ComplianceStatus>(assessmentData.status);
  const [implementationNotes, setImplementationNotes] = useState('');
  const [evidence, setEvidence] = useState('');
  const [remediationPlan, setRemediationPlan] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel | ''>('');
  const [showComments, setShowComments] = useState(false);

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
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {systemName} - {controlCode}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" color="text.secondary">
              Assigned to:
            </Typography>
            <AssignmentBadge
              controlCode={controlCode}
              productId={productId}
              systemId={systemId}
            />
          </Box>
        </Box>
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

          {/* NIST 800-53 Rev 5 Mappings Section */}
          <Accordion
            sx={{
              bgcolor: 'grey.50',
              '&:before': { display: 'none' },
              boxShadow: 'none',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            </AccordionSummary>
            <AccordionDetails>
              {mappingsLoading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : mappingsData && mappingsData.totalMappings > 0 ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    This CSF control maps to the following NIST 800-53 Rev 5 security controls:
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {mappingsData.familySummary.map((family) => (
                      <Box key={family.family || 'unknown'} sx={{ mb: 2 }}>
                        <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.primary' }}>
                          {family.family || 'Other'} Family ({family.controlCount})
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {family.controls.map((ctrl) => (
                            <Tooltip
                              key={ctrl.id}
                              title={`Priority: ${ctrl.priority || 'Not specified'}`}
                            >
                              <Chip
                                label={ctrl.nist80053Id}
                                size="small"
                                color={
                                  ctrl.priority === 'P1'
                                    ? 'error'
                                    : ctrl.priority === 'P2'
                                    ? 'warning'
                                    : 'primary'
                                }
                                sx={{
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                }}
                              />
                            </Tooltip>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="caption">
                      When implementing this CSF control, consider the related NIST 800-53 controls
                      for comprehensive coverage. Priority levels: P1 (High), P2 (Medium), P3 (Low).
                    </Typography>
                  </Alert>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No NIST 800-53 mappings found for this control.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>

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

          {/* Approval Workflow Section */}
          {assessmentData.assessmentId && (
            <Accordion
              defaultExpanded={false}
              sx={{
                bgcolor: 'grey.50',
                '&:before': { display: 'none' },
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ApprovalIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" color="primary.main">
                    Approval Workflow
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <ApprovalWorkflow
                  assessmentId={assessmentData.assessmentId}
                  assessmentStatus={status}
                />
              </AccordionDetails>
            </Accordion>
          )}

          {/* Comments Section */}
          {assessmentData.assessmentId && (
            <Accordion
              expanded={showComments}
              onChange={() => setShowComments(!showComments)}
              sx={{
                bgcolor: 'grey.50',
                '&:before': { display: 'none' },
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CommentIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" color="primary.main">
                    Discussion & Comments
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                  {user?.id ? (
                    <Comments
                      assessmentId={assessmentData.assessmentId}
                      currentUserId={user.id}
                    />
                  ) : (
                    <Alert severity="warning">
                      You must be logged in to view and add comments.
                    </Alert>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Evidence Section */}
          {assessmentData.assessmentId && (
            <Accordion
              defaultExpanded={false}
              sx={{
                bgcolor: 'grey.50',
                '&:before': { display: 'none' },
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachFileIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" color="primary.main">
                    Evidence Files
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <EvidenceUpload assessmentId={assessmentData.assessmentId} />
              </AccordionDetails>
            </Accordion>
          )}

          {/* Audit History Section */}
          {assessmentData.assessmentId && (
            <Accordion
              defaultExpanded={false}
              sx={{
                bgcolor: 'grey.50',
                '&:before': { display: 'none' },
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" color="primary.main">
                    Change History
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <AuditHistory
                    entityType="Assessment"
                    entityId={assessmentData.assessmentId}
                    compact
                    maxItems={15}
                    showTitle={false}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
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
  const theme = useTheme();
  const isMobileView = useMobileView();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  // View mode: 'matrix' for desktop grid, 'cards' for mobile card view
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>(() => {
    // Default to cards on mobile, matrix on desktop
    if (typeof window !== 'undefined') {
      return window.innerWidth < 900 ? 'cards' : 'matrix';
    }
    return 'matrix';
  });

  // Mobile filter drawer state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Auto-switch view on resize
  useEffect(() => {
    if (isMobileView && viewMode === 'matrix') {
      setViewMode('cards');
    }
  }, [isMobileView, viewMode]);

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

  // Copy Assessment Dialog state
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTargetSystem, setCopyTargetSystem] = useState<{ id: string; name: string } | null>(null);
  const [copying, setCopying] = useState(false);

  // Inline Status Menu state
  const [inlineMenuAnchor, setInlineMenuAnchor] = useState<HTMLElement | null>(null);
  const [inlineMenuCell, setInlineMenuCell] = useState<{
    assessmentId: string;
    status: ComplianceStatus;
  } | null>(null);
  const [inlineUpdating, setInlineUpdating] = useState(false);

  // Keyboard navigation state - tracks which cell is "focused" for keyboard shortcuts
  const [focusedCell, setFocusedCell] = useState<{
    rowIndex: number;
    systemIndex: number;
    assessmentId: string;
    status: ComplianceStatus;
  } | null>(null);
  const [keyboardUpdating, setKeyboardUpdating] = useState(false);

  // Quick Assessment Panel state (speed mode)
  const [quickPanelOpen, setQuickPanelOpen] = useState(false);
  const [quickPanelNotes, setQuickPanelNotes] = useState('');

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

  // Get systems from matrix data or from useSystems (moved here for keyboard navigation)
  const displaySystems = useMemo(() => matrixData?.systems || systems || [], [matrixData?.systems, systems]);

  // Mutations
  const updateAssessment = useUpdateAssessment();

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

  // Cell click handler - also sets focused cell for keyboard navigation
  const handleCellClick = useCallback(
    (row: AssessmentMatrixRow, system: System, rowIndex?: number, systemIndex?: number) => {
      const systemData = row.systems[system.id];
      if (!systemData) return;

      // Set focused cell for keyboard navigation (if indices provided)
      if (rowIndex !== undefined && systemIndex !== undefined && systemData.assessmentId) {
        setFocusedCell({
          rowIndex,
          systemIndex,
          assessmentId: systemData.assessmentId,
          status: systemData.status,
        });
      }

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

  // Single click to focus cell (for keyboard navigation)
  const handleCellFocus = useCallback(
    (row: AssessmentMatrixRow, system: System, rowIndex: number, systemIndex: number) => {
      const systemData = row.systems[system.id];
      if (!systemData?.assessmentId) return;

      setFocusedCell({
        rowIndex,
        systemIndex,
        assessmentId: systemData.assessmentId,
        status: systemData.status,
      });
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

  // Handle copy assessments from source system to target system
  const handleCopyAssessments = useCallback(
    async (sourceSystemId: string) => {
      if (!matrixData || !copyTargetSystem) return;

      setCopying(true);
      let successCount = 0;
      let failCount = 0;

      try {
        // Collect assessments to copy
        const updates: Promise<any>[] = [];

        for (const row of matrixData.rows) {
          const sourceData = row.systems[sourceSystemId];
          const targetData = row.systems[copyTargetSystem.id];

          // Only copy if source has assessment and target is not yet assessed
          if (
            sourceData &&
            sourceData.status !== 'Not Assessed' &&
            sourceData.assessmentId &&
            targetData &&
            targetData.status === 'Not Assessed' &&
            targetData.assessmentId
          ) {
            updates.push(
              updateAssessment
                .mutateAsync({
                  id: targetData.assessmentId,
                  updates: {
                    status: sourceData.status,
                  },
                })
                .then(() => {
                  successCount++;
                })
                .catch(() => {
                  failCount++;
                })
            );
          }
        }

        await Promise.all(updates);

        if (successCount > 0) {
          showNotification(`Successfully copied ${successCount} assessments`, 'success');
          refetchMatrix();
        }
        if (failCount > 0) {
          showNotification(`Failed to copy ${failCount} assessments`, 'error');
        }
      } catch (error) {
        showNotification('Failed to copy assessments', 'error');
      } finally {
        setCopying(false);
        setCopyDialogOpen(false);
        setCopyTargetSystem(null);
      }
    },
    [matrixData, copyTargetSystem, updateAssessment, showNotification, refetchMatrix]
  );

  // Handle right-click for inline status menu
  const handleCellRightClick = useCallback(
    (event: React.MouseEvent, systemData: { assessmentId?: string; status: ComplianceStatus }) => {
      event.preventDefault();
      if (systemData.assessmentId) {
        setInlineMenuAnchor(event.currentTarget as HTMLElement);
        setInlineMenuCell({
          assessmentId: systemData.assessmentId,
          status: systemData.status,
        });
      }
    },
    []
  );

  // Handle inline status change
  const handleInlineStatusChange = useCallback(
    async (newStatus: ComplianceStatus) => {
      if (!inlineMenuCell) return;

      setInlineUpdating(true);
      try {
        await updateAssessment.mutateAsync({
          id: inlineMenuCell.assessmentId,
          updates: { status: newStatus },
        });
        showNotification('Status updated', 'success');
        refetchMatrix();
      } catch (error) {
        showNotification('Failed to update status', 'error');
      } finally {
        setInlineUpdating(false);
        setInlineMenuAnchor(null);
        setInlineMenuCell(null);
      }
    },
    [inlineMenuCell, updateAssessment, showNotification, refetchMatrix]
  );

  // Handle opening copy dialog for a system
  const handleOpenCopyDialog = useCallback((system: { id: string; name: string }) => {
    setCopyTargetSystem(system);
    setCopyDialogOpen(true);
  }, []);

  // Handle mobile card status change
  const handleMobileStatusChange = useCallback(
    async (assessmentId: string, newStatus: ComplianceStatus) => {
      try {
        await updateAssessment.mutateAsync({
          id: assessmentId,
          updates: { status: newStatus },
        });
        showNotification('Status updated', 'success');
        refetchMatrix();
      } catch (error) {
        showNotification('Failed to update status', 'error');
        throw error;
      }
    },
    [updateAssessment, showNotification, refetchMatrix]
  );

  // Handle mobile card open details
  const handleMobileOpenDetails = useCallback(
    (systemId: string, controlId: string, controlCode: string) => {
      const system = displaySystems.find((s) => s.id === systemId);
      const row = matrixData?.rows.find((r) => r.controlId === controlId);
      if (!system || !row) return;

      const systemData = row.systems[systemId];
      setSelectedCell({
        systemId,
        systemName: system.name,
        controlId,
        controlCode,
        assessmentData: systemData || { status: 'Not Assessed' },
      });
      setModalOpen(true);
    },
    [displaySystems, matrixData]
  );

  // Get focused cell's control and system info for quick panel
  const focusedCellInfo = useMemo(() => {
    if (!focusedCell || !filteredRows.length || !displaySystems.length) return null;

    const row = filteredRows[focusedCell.rowIndex];
    const system = displaySystems[focusedCell.systemIndex];
    const control = allControls?.find((c) => c.id === row?.controlId);

    if (!row || !system) return null;

    return {
      row,
      system,
      control,
      systemData: row.systems[system.id],
    };
  }, [focusedCell, filteredRows, displaySystems, allControls]);

  // Quick panel status change with optional notes
  const handleQuickPanelStatusChange = useCallback(
    async (newStatus: ComplianceStatus) => {
      if (!focusedCell || keyboardUpdating) return;

      setKeyboardUpdating(true);
      try {
        const updates: { status: ComplianceStatus; implementationNotes?: string } = { status: newStatus };
        if (quickPanelNotes.trim()) {
          updates.implementationNotes = quickPanelNotes.trim();
        }

        await updateAssessment.mutateAsync({
          id: focusedCell.assessmentId,
          updates,
        });

        const statusLabel = COMPLIANCE_STATUSES.find((s) => s.value === newStatus)?.label || newStatus;
        showNotification(`Status updated to ${statusLabel}`, 'success');
        setFocusedCell((prev) => prev ? { ...prev, status: newStatus } : null);
        setQuickPanelNotes('');
        refetchMatrix();

        // Auto-advance to next row
        if (focusedCell.rowIndex < filteredRows.length - 1) {
          const nextRow = filteredRows[focusedCell.rowIndex + 1];
          const system = displaySystems[focusedCell.systemIndex];
          const nextSystemData = nextRow?.systems[system?.id];
          if (nextSystemData?.assessmentId) {
            setFocusedCell({
              rowIndex: focusedCell.rowIndex + 1,
              systemIndex: focusedCell.systemIndex,
              assessmentId: nextSystemData.assessmentId,
              status: nextSystemData.status,
            });
          }
        }
      } catch (error) {
        showNotification('Failed to update status', 'error');
      } finally {
        setKeyboardUpdating(false);
      }
    },
    [focusedCell, keyboardUpdating, quickPanelNotes, updateAssessment, showNotification, refetchMatrix, filteredRows, displaySystems]
  );

  // Handle keyboard status change
  const handleKeyboardStatusChange = useCallback(
    async (statusIndex: number) => {
      if (!focusedCell || keyboardUpdating) return;

      const newStatus = COMPLIANCE_STATUSES[statusIndex]?.value;
      if (!newStatus || newStatus === focusedCell.status) return;

      setKeyboardUpdating(true);
      try {
        await updateAssessment.mutateAsync({
          id: focusedCell.assessmentId,
          updates: { status: newStatus },
        });
        showNotification(`Status updated to ${COMPLIANCE_STATUSES[statusIndex].label}`, 'success');
        setFocusedCell((prev) => prev ? { ...prev, status: newStatus } : null);
        refetchMatrix();
      } catch (error) {
        showNotification('Failed to update status', 'error');
      } finally {
        setKeyboardUpdating(false);
      }
    },
    [focusedCell, keyboardUpdating, updateAssessment, showNotification, refetchMatrix]
  );

  // Keyboard navigation handler
  const handleKeyboardNavigation = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (!focusedCell || !filteredRows.length || !displaySystems.length) return;

      let newRowIndex = focusedCell.rowIndex;
      let newSystemIndex = focusedCell.systemIndex;

      switch (direction) {
        case 'up':
          newRowIndex = Math.max(0, focusedCell.rowIndex - 1);
          break;
        case 'down':
          newRowIndex = Math.min(filteredRows.length - 1, focusedCell.rowIndex + 1);
          break;
        case 'left':
          newSystemIndex = Math.max(0, focusedCell.systemIndex - 1);
          break;
        case 'right':
          newSystemIndex = Math.min(displaySystems.length - 1, focusedCell.systemIndex + 1);
          break;
      }

      const row = filteredRows[newRowIndex];
      const system = displaySystems[newSystemIndex];
      const systemData = row?.systems[system?.id];

      if (systemData?.assessmentId) {
        setFocusedCell({
          rowIndex: newRowIndex,
          systemIndex: newSystemIndex,
          assessmentId: systemData.assessmentId,
          status: systemData.status,
        });
      }
    },
    [focusedCell, filteredRows, displaySystems]
  );

  // Keyboard event listener for status shortcuts (1-5) and navigation (arrow keys)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when modal is not open and a cell is focused
      if (modalOpen || copyDialogOpen) return;

      // Number keys 1-5 for quick status change
      if (focusedCell && event.key >= '1' && event.key <= '5') {
        event.preventDefault();
        const statusIndex = parseInt(event.key, 10) - 1;
        handleKeyboardStatusChange(statusIndex);
        return;
      }

      // Arrow keys for navigation
      if (focusedCell) {
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            handleKeyboardNavigation('up');
            break;
          case 'ArrowDown':
            event.preventDefault();
            handleKeyboardNavigation('down');
            break;
          case 'ArrowLeft':
            event.preventDefault();
            handleKeyboardNavigation('left');
            break;
          case 'ArrowRight':
            event.preventDefault();
            handleKeyboardNavigation('right');
            break;
          case 'Enter':
            // Open detail modal
            event.preventDefault();
            const row = filteredRows[focusedCell.rowIndex];
            const system = displaySystems[focusedCell.systemIndex];
            if (row && system) {
              handleCellClick(row, system);
            }
            break;
          case 'Escape':
            // Clear focus
            event.preventDefault();
            setFocusedCell(null);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    modalOpen,
    copyDialogOpen,
    focusedCell,
    handleKeyboardStatusChange,
    handleKeyboardNavigation,
    filteredRows,
    displaySystems,
    handleCellClick,
  ]);

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
      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
            Assessment Matrix
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {product.name} - Compliance Assessment
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {/* View Toggle - only show on larger screens */}
          {!isSmallScreen && (
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="matrix" aria-label="matrix view">
                <Tooltip title="Matrix View">
                  <ViewListIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="cards" aria-label="card view">
                <Tooltip title="Card View">
                  <ViewModuleIcon />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          )}
          {/* Speed Mode - hide on mobile */}
          {!isSmallScreen && (
            <Button
              variant={quickPanelOpen ? 'contained' : 'outlined'}
              startIcon={<SpeedIcon />}
              onClick={() => setQuickPanelOpen(!quickPanelOpen)}
              size="small"
              color={quickPanelOpen ? 'primary' : 'inherit'}
            >
              Speed Mode
            </Button>
          )}
          {/* Mobile filter button */}
          {isSmallScreen && (
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setMobileFilterOpen(true)}
              size="small"
            >
              Filters
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => showNotification('Export coming soon', 'info')}
            size="small"
          >
            {isSmallScreen ? '' : 'Export'}
            {isSmallScreen && <DownloadIcon />}
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

      {/* Keyboard Shortcuts Help */}
      {focusedCell && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <IconButton size="small" onClick={() => setFocusedCell(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          <Typography variant="body2" component="span">
            <strong>Keyboard Mode Active</strong> —
            <Chip label="1" size="small" sx={{ mx: 0.5, height: 20 }} /> Compliant
            <Chip label="2" size="small" sx={{ mx: 0.5, height: 20 }} /> Partial
            <Chip label="3" size="small" sx={{ mx: 0.5, height: 20 }} /> Non-Compliant
            <Chip label="4" size="small" sx={{ mx: 0.5, height: 20 }} /> Not Assessed
            <Chip label="5" size="small" sx={{ mx: 0.5, height: 20 }} /> N/A
            <Chip label="↑↓←→" size="small" sx={{ mx: 0.5, height: 20 }} /> Navigate
            <Chip label="Enter" size="small" sx={{ mx: 0.5, height: 20 }} /> Details
            <Chip label="Esc" size="small" sx={{ mx: 0.5, height: 20 }} /> Exit
          </Typography>
        </Alert>
      )}

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
      ) : viewMode === 'cards' ? (
        /* Mobile Card View */
        <Box className="mobile-card-grid" sx={{ mt: 2 }}>
          {filteredRows.map((row) => (
            <MobileAssessmentCard
              key={row.controlId}
              row={row}
              systems={displaySystems}
              onStatusChange={handleMobileStatusChange}
              onOpenDetails={handleMobileOpenDetails}
              updating={updateAssessment.isPending}
            />
          ))}
        </Box>
      ) : (
        /* Desktop Matrix View */
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
                    p: 1,
                    borderRight: 1,
                    borderColor: 'divider',
                    textAlign: 'center',
                  }}
                >
                  <Tooltip title={system.name}>
                    <Typography variant="subtitle2" noWrap sx={{ fontSize: '0.75rem' }}>
                      {system.name}
                    </Typography>
                  </Tooltip>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                    {system.environment}
                  </Typography>
                  {/* Copy from system button */}
                  {displaySystems.length > 1 && (
                    <Tooltip title="Copy assessments from another system">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCopyDialog({ id: system.id, name: system.name });
                        }}
                        sx={{ mt: 0.5, p: 0.5 }}
                      >
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
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
                {displaySystems.map((system, systemIndex) => {
                  const systemData = row.systems[system.id];
                  // Check if evidence exists (would need to be added to matrix response)
                  const hasEvidence = systemData?.hasEvidence || false;
                  // Check if this cell is keyboard-focused
                  const isKeyboardFocused = focusedCell?.rowIndex === rowIndex && focusedCell?.systemIndex === systemIndex;
                  return (
                    <Box
                      key={system.id}
                      onClick={() => handleCellFocus(row, system, rowIndex, systemIndex)}
                      onDoubleClick={() => handleCellClick(row, system, rowIndex, systemIndex)}
                      onContextMenu={(e) => systemData && handleCellRightClick(e, systemData)}
                      tabIndex={0}
                      sx={{
                        p: 2,
                        borderRight: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        outline: isKeyboardFocused ? '2px solid' : 'none',
                        outlineColor: 'primary.main',
                        outlineOffset: '-2px',
                        bgcolor: isKeyboardFocused ? 'action.selected' : 'inherit',
                        '&:hover': {
                          bgcolor: isKeyboardFocused ? 'action.selected' : 'action.focus',
                          transform: 'scale(1.05)',
                        },
                        '&:focus': {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                        },
                      }}
                    >
                      {systemData ? (
                        <Tooltip
                          title={
                            <>
                              {COMPLIANCE_STATUSES.find((s) => s.value === systemData.status)?.label || systemData.status}
                              {hasEvidence && ' • Has evidence'}
                              <br />
                              <em>Click to select • Double-click for details</em>
                              <br />
                              <em>Keys: 1-5 change status • Arrow keys navigate</em>
                            </>
                          }
                        >
                          <Box>
                            <StatusIcon status={systemData.status} hasEvidence={hasEvidence} />
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

      {/* Copy Assessment Dialog */}
      {copyTargetSystem && (
        <CopyAssessmentDialog
          open={copyDialogOpen}
          onClose={() => {
            setCopyDialogOpen(false);
            setCopyTargetSystem(null);
          }}
          targetSystemId={copyTargetSystem.id}
          targetSystemName={copyTargetSystem.name}
          availableSystems={displaySystems.map((s) => ({ id: s.id, name: s.name }))}
          matrixData={matrixData}
          onCopy={handleCopyAssessments}
          copying={copying}
        />
      )}

      {/* Inline Status Menu (right-click) */}
      <InlineStatusMenu
        anchorEl={inlineMenuAnchor}
        open={Boolean(inlineMenuAnchor)}
        onClose={() => {
          setInlineMenuAnchor(null);
          setInlineMenuCell(null);
        }}
        currentStatus={inlineMenuCell?.status || 'Not Assessed'}
        onStatusChange={handleInlineStatusChange}
        updating={inlineUpdating}
      />

      {/* Quick Assessment Panel (Speed Mode) */}
      <Drawer
        anchor="right"
        open={quickPanelOpen}
        onClose={() => setQuickPanelOpen(false)}
        variant="persistent"
        sx={{
          '& .MuiDrawer-paper': {
            width: 320,
            boxSizing: 'border-box',
            top: 64,
            height: 'calc(100% - 64px)',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <SpeedIcon color="primary" />
              <Typography variant="h6">Speed Mode</Typography>
            </Box>
            <IconButton size="small" onClick={() => setQuickPanelOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {focusedCellInfo ? (
            <Stack spacing={2}>
              {/* Control Info */}
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {focusedCellInfo.row.subcategoryCode}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {focusedCellInfo.row.subcategoryName}
                </Typography>
                <Chip
                  label={focusedCellInfo.system.name}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={focusedCellInfo.system.environment}
                  size="small"
                  color="default"
                />
              </Paper>

              {/* Current Status */}
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Current Status
                </Typography>
                <Chip
                  icon={<StatusIcon status={focusedCell?.status || 'Not Assessed'} />}
                  label={COMPLIANCE_STATUSES.find((s) => s.value === focusedCell?.status)?.label || 'Not Assessed'}
                  sx={{
                    bgcolor: COMPLIANCE_STATUSES.find((s) => s.value === focusedCell?.status)?.color + '22',
                  }}
                />
              </Box>

              {/* Quick Status Buttons */}
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Quick Status Change
                </Typography>
                <Stack spacing={1}>
                  {COMPLIANCE_STATUSES.map((status, index) => (
                    <Button
                      key={status.value}
                      variant={focusedCell?.status === status.value ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => handleQuickPanelStatusChange(status.value)}
                      disabled={keyboardUpdating}
                      startIcon={<StatusIcon status={status.value} />}
                      sx={{
                        justifyContent: 'flex-start',
                        borderColor: status.color,
                        color: focusedCell?.status === status.value ? 'white' : status.color,
                        bgcolor: focusedCell?.status === status.value ? status.color : 'transparent',
                        '&:hover': {
                          bgcolor: status.color + '22',
                          borderColor: status.color,
                        },
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip label={index + 1} size="small" sx={{ height: 20, minWidth: 20 }} />
                        {status.label}
                      </Box>
                    </Button>
                  ))}
                </Stack>
              </Box>

              {/* Quick Notes */}
              <TextField
                label="Quick Notes (optional)"
                multiline
                rows={2}
                value={quickPanelNotes}
                onChange={(e) => setQuickPanelNotes(e.target.value)}
                placeholder="Add notes before changing status..."
                size="small"
                fullWidth
              />

              {/* Navigation */}
              <Divider />
              <Box display="flex" justifyContent="space-between">
                <Button
                  startIcon={<NavigateBeforeIcon />}
                  onClick={() => handleKeyboardNavigation('up')}
                  disabled={!focusedCell || focusedCell.rowIndex === 0}
                  size="small"
                >
                  Previous
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {focusedCell ? focusedCell.rowIndex + 1 : 0} / {filteredRows.length}
                </Typography>
                <Button
                  endIcon={<NavigateNextIcon />}
                  onClick={() => handleKeyboardNavigation('down')}
                  disabled={!focusedCell || focusedCell.rowIndex >= filteredRows.length - 1}
                  size="small"
                >
                  Next
                </Button>
              </Box>

              {/* Open Full Details */}
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  if (focusedCellInfo.row && focusedCellInfo.system) {
                    handleCellClick(focusedCellInfo.row, focusedCellInfo.system, focusedCell?.rowIndex, focusedCell?.systemIndex);
                  }
                }}
              >
                Open Full Details
              </Button>
            </Stack>
          ) : (
            <Alert severity="info">
              Click on a cell in the assessment matrix to start speed mode assessment.
            </Alert>
          )}
        </Box>
      </Drawer>

      {/* Mobile Filter Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        onOpen={() => setMobileFilterOpen(true)}
        disableSwipeToOpen
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '70vh',
          },
        }}
      >
        <Box sx={{ p: 3, pb: 'calc(env(safe-area-inset-bottom, 16px) + 24px)' }}>
          {/* Handle bar */}
          <Box
            sx={{
              width: 40,
              height: 4,
              bgcolor: 'grey.400',
              borderRadius: 2,
              mx: 'auto',
              mb: 2,
            }}
          />

          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>

          <Stack spacing={3}>
            {/* Function Filter */}
            <FormControl fullWidth size="small">
              <InputLabel>CSF Function</InputLabel>
              <Select
                value={functionFilter}
                label="CSF Function"
                onChange={(e) => setFunctionFilter(e.target.value)}
              >
                <MenuItem value="all">All Functions</MenuItem>
                <MenuItem value="GV">GV - Govern</MenuItem>
                <MenuItem value="ID">ID - Identify</MenuItem>
                <MenuItem value="PR">PR - Protect</MenuItem>
                <MenuItem value="DE">DE - Detect</MenuItem>
                <MenuItem value="RS">RS - Respond</MenuItem>
                <MenuItem value="RC">RC - Recover</MenuItem>
              </Select>
            </FormControl>

            {/* Status Filter */}
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {COMPLIANCE_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Search */}
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

            {/* Results count */}
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Showing {filteredRows.length} of {matrixData?.rows.length || 0} controls
            </Typography>

            {/* Action buttons */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setFunctionFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear All
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={() => setMobileFilterOpen(false)}
              >
                Apply Filters
              </Button>
            </Stack>
          </Stack>
        </Box>
      </SwipeableDrawer>
    </Box>
  );
};

export default ProductAssessments;

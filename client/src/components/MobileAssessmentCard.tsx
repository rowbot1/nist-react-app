/**
 * Mobile Assessment Card Component
 *
 * Touch-optimized card view for assessments on mobile devices.
 * Provides swipe actions, large touch targets, and bottom sheet status selection.
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Collapse,
  Button,
  Stack,
  SwipeableDrawer,
  Divider,
  Badge,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  RemoveCircleOutline as RemoveCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AttachFile as AttachFileIcon,
  Comment as CommentIcon,
  Edit as EditIcon,
  SwipeLeft as SwipeLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import type { ComplianceStatus, System, AssessmentMatrixRow, RiskLevel } from '../types/api.types';

// Status configuration
const COMPLIANCE_STATUSES: { value: ComplianceStatus; label: string; color: string; shortLabel: string }[] = [
  { value: 'Implemented', label: 'Compliant', shortLabel: 'Compliant', color: '#4caf50' },
  { value: 'Partially Implemented', label: 'Partially Compliant', shortLabel: 'Partial', color: '#ff9800' },
  { value: 'Not Implemented', label: 'Non-Compliant', shortLabel: 'Non-Comp', color: '#f44336' },
  { value: 'Not Assessed', label: 'Not Assessed', shortLabel: 'Not Assd', color: '#9e9e9e' },
  { value: 'Not Applicable', label: 'Not Applicable', shortLabel: 'N/A', color: '#757575' },
];

// Status icon component
const StatusIcon: React.FC<{ status: ComplianceStatus; size?: 'small' | 'medium' | 'large' }> = ({
  status,
  size = 'medium',
}) => {
  const config = COMPLIANCE_STATUSES.find((s) => s.value === status);
  const color = config?.color || '#9e9e9e';
  const iconSize = size === 'small' ? 16 : size === 'large' ? 28 : 20;

  switch (status) {
    case 'Implemented':
      return <CheckCircleIcon sx={{ color, fontSize: iconSize }} />;
    case 'Partially Implemented':
      return <WarningIcon sx={{ color, fontSize: iconSize }} />;
    case 'Not Implemented':
      return <CancelIcon sx={{ color, fontSize: iconSize }} />;
    case 'Not Applicable':
      return <RemoveCircleIcon sx={{ color, fontSize: iconSize }} />;
    default:
      return <RadioButtonUncheckedIcon sx={{ color, fontSize: iconSize }} />;
  }
};

interface SystemAssessment {
  systemId: string;
  systemName: string;
  environment: string;
  assessmentId?: string;
  status: ComplianceStatus;
  riskLevel?: RiskLevel;
  hasEvidence?: boolean;
}

interface MobileAssessmentCardProps {
  row: AssessmentMatrixRow;
  systems: System[];
  onStatusChange: (assessmentId: string, newStatus: ComplianceStatus) => Promise<void>;
  onOpenDetails: (systemId: string, controlId: string, controlCode: string) => void;
  updating?: boolean;
}

export const MobileAssessmentCard: React.FC<MobileAssessmentCardProps> = ({
  row,
  systems,
  onStatusChange,
  onOpenDetails,
  updating = false,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<SystemAssessment | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Get assessments from row data with system info
  const assessments: SystemAssessment[] = systems.map((system) => {
    const systemData = row.systems[system.id];
    return {
      systemId: system.id,
      systemName: system.name,
      environment: system.environment,
      assessmentId: systemData?.assessmentId,
      status: systemData?.status || 'Not Assessed',
      riskLevel: systemData?.riskLevel,
      hasEvidence: systemData?.hasEvidence,
    };
  });

  // Count statuses
  const statusCounts = assessments.reduce(
    (acc, a) => {
      if (a.status === 'Implemented') acc.compliant++;
      else if (a.status === 'Partially Implemented') acc.partial++;
      else if (a.status === 'Not Implemented') acc.nonCompliant++;
      else if (a.status === 'Not Applicable') acc.na++;
      else acc.notAssessed++;
      return acc;
    },
    { compliant: 0, partial: 0, nonCompliant: 0, notAssessed: 0, na: 0 }
  );

  // Handle swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent, assessment: SystemAssessment) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const swipeDistance = touchStartX.current - touchEndX.current;

    // Swipe left to open status sheet
    if (swipeDistance > 50 && assessment.assessmentId) {
      setSelectedAssessment(assessment);
      setStatusSheetOpen(true);
    }
  };

  const handleStatusSelect = async (newStatus: ComplianceStatus) => {
    if (!selectedAssessment?.assessmentId || updating) return;

    try {
      await onStatusChange(selectedAssessment.assessmentId, newStatus);
      setStatusSheetOpen(false);
      setSelectedAssessment(null);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusColor = (status: ComplianceStatus): string => {
    return COMPLIANCE_STATUSES.find((s) => s.value === status)?.color || '#9e9e9e';
  };

  return (
    <>
      <Card
        className="assessment-card-mobile"
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderLeft: '4px solid',
          borderLeftColor: statusCounts.nonCompliant > 0 ? 'error.main' : statusCounts.partial > 0 ? 'warning.main' : statusCounts.compliant > 0 ? 'success.main' : 'grey.400',
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {/* Header Row */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 1.5,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  fontFamily: 'monospace',
                }}
              >
                {row.subcategoryCode}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: expanded ? 'none' : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.4,
                }}
              >
                {row.subcategoryName}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ ml: 1, mt: -0.5 }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          {/* Status Summary Pills */}
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              flexWrap: 'wrap',
              mb: expanded ? 2 : 0,
            }}
          >
            {statusCounts.compliant > 0 && (
              <Chip
                size="small"
                label={statusCounts.compliant}
                icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                sx={{
                  bgcolor: alpha('#4caf50', 0.15),
                  color: '#4caf50',
                  '& .MuiChip-icon': { color: '#4caf50' },
                  height: 24,
                }}
              />
            )}
            {statusCounts.partial > 0 && (
              <Chip
                size="small"
                label={statusCounts.partial}
                icon={<WarningIcon sx={{ fontSize: 14 }} />}
                sx={{
                  bgcolor: alpha('#ff9800', 0.15),
                  color: '#ff9800',
                  '& .MuiChip-icon': { color: '#ff9800' },
                  height: 24,
                }}
              />
            )}
            {statusCounts.nonCompliant > 0 && (
              <Chip
                size="small"
                label={statusCounts.nonCompliant}
                icon={<CancelIcon sx={{ fontSize: 14 }} />}
                sx={{
                  bgcolor: alpha('#f44336', 0.15),
                  color: '#f44336',
                  '& .MuiChip-icon': { color: '#f44336' },
                  height: 24,
                }}
              />
            )}
            {statusCounts.notAssessed > 0 && (
              <Chip
                size="small"
                label={statusCounts.notAssessed}
                icon={<RadioButtonUncheckedIcon sx={{ fontSize: 14 }} />}
                sx={{
                  bgcolor: alpha('#9e9e9e', 0.15),
                  color: '#9e9e9e',
                  '& .MuiChip-icon': { color: '#9e9e9e' },
                  height: 24,
                }}
              />
            )}
          </Box>

          {/* Expanded System List */}
          <Collapse in={expanded}>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              <SwipeLeftIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
              Swipe left on a system to change status
            </Typography>

            <Stack spacing={1}>
              {assessments.map((assessment) => (
                <Box
                  key={assessment.systemId}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, assessment)}
                  onClick={() => onOpenDetails(assessment.systemId, row.controlId, row.subcategoryCode)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    touchAction: 'pan-y',
                    '&:active': {
                      bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                    <StatusIcon status={assessment.status} size="medium" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {assessment.systemName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {assessment.environment}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {assessment.hasEvidence && (
                      <Tooltip title="Has evidence">
                        <Badge
                          variant="dot"
                          color="primary"
                          sx={{ mr: 1 }}
                        >
                          <AttachFileIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        </Badge>
                      </Tooltip>
                    )}
                    <Chip
                      label={COMPLIANCE_STATUSES.find((s) => s.value === assessment.status)?.shortLabel || assessment.status}
                      size="small"
                      sx={{
                        bgcolor: alpha(getStatusColor(assessment.status), 0.15),
                        color: getStatusColor(assessment.status),
                        fontWeight: 500,
                        fontSize: '0.7rem',
                        height: 24,
                      }}
                    />
                    <ChevronRightIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Collapse>
        </CardContent>
      </Card>

      {/* Status Selection Bottom Sheet */}
      <SwipeableDrawer
        anchor="bottom"
        open={statusSheetOpen}
        onClose={() => {
          setStatusSheetOpen(false);
          setSelectedAssessment(null);
        }}
        onOpen={() => {}}
        disableSwipeToOpen
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '70vh',
          },
        }}
      >
        <Box sx={{ p: 2, pb: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}>
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

          {selectedAssessment && (
            <>
              {/* Header */}
              <Typography variant="h6" gutterBottom>
                Update Status
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedAssessment.systemName} • {row.subcategoryCode}
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* Status Options */}
              <Box className="status-grid-mobile">
                {COMPLIANCE_STATUSES.map((status) => (
                  <Button
                    key={status.value}
                    variant={selectedAssessment.status === status.value ? 'contained' : 'outlined'}
                    onClick={() => handleStatusSelect(status.value)}
                    disabled={updating || selectedAssessment.status === status.value}
                    startIcon={<StatusIcon status={status.value} size="small" />}
                    sx={{
                      justifyContent: 'flex-start',
                      py: 1.5,
                      px: 2,
                      borderColor: status.color,
                      color: selectedAssessment.status === status.value ? 'white' : status.color,
                      bgcolor: selectedAssessment.status === status.value ? status.color : 'transparent',
                      '&:hover': {
                        bgcolor: selectedAssessment.status === status.value
                          ? status.color
                          : alpha(status.color, 0.15),
                        borderColor: status.color,
                      },
                      '&:disabled': {
                        bgcolor: status.color,
                        color: 'white',
                        opacity: 0.8,
                      },
                    }}
                  >
                    {status.shortLabel}
                  </Button>
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Open Details Button */}
              <Button
                fullWidth
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => {
                  setStatusSheetOpen(false);
                  onOpenDetails(selectedAssessment.systemId, row.controlId, row.subcategoryCode);
                }}
                sx={{ py: 1.5 }}
              >
                Open Full Details
              </Button>
            </>
          )}
        </Box>
      </SwipeableDrawer>
    </>
  );
};

export default MobileAssessmentCard;

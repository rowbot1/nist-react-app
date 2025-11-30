/**
 * Approval Workflow Component
 *
 * Provides a lightweight approval workflow for assessments using comments
 * and the existing data model. Status is determined by:
 * - Draft: Assessment has NOT_ASSESSED status
 * - Pending Review: A "Request Review" comment exists
 * - Approved: An "Approve" comment from a different user exists
 *
 * This allows approval workflow without schema changes.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  CheckCircle as ApprovedIcon,
  HourglassEmpty as PendingIcon,
  Edit as DraftIcon,
  Send as RequestIcon,
  Done as ApproveIcon,
  Cancel as RejectIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useComments, useCreateComment, Comment } from '../hooks/useComments';
import { useUsers, AssignmentAssignee } from '../hooks/useAssignments';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

// Special comment markers for approval workflow
const WORKFLOW_MARKERS = {
  REQUEST_REVIEW: '[WORKFLOW:REQUEST_REVIEW]',
  APPROVE: '[WORKFLOW:APPROVE]',
  REJECT: '[WORKFLOW:REJECT]',
};

type WorkflowStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

interface ApprovalWorkflowProps {
  assessmentId: string;
  assessmentStatus: string; // The compliance status of the assessment
  compact?: boolean;
}

// Determine workflow status from comments
function determineWorkflowStatus(comments: Comment[] | undefined): {
  status: WorkflowStatus;
  requestedBy?: string;
  requestedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  latestReviewRequest?: Comment;
  latestApproval?: Comment;
  latestRejection?: Comment;
} {
  if (!comments || comments.length === 0) {
    return { status: 'draft' };
  }

  // Find workflow-related comments (newest first)
  const workflowComments = comments.filter(
    (c) =>
      c.content.includes(WORKFLOW_MARKERS.REQUEST_REVIEW) ||
      c.content.includes(WORKFLOW_MARKERS.APPROVE) ||
      c.content.includes(WORKFLOW_MARKERS.REJECT)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (workflowComments.length === 0) {
    return { status: 'draft' };
  }

  // Latest workflow action
  const latest = workflowComments[0];

  // Find the most recent of each type
  const latestReviewRequest = workflowComments.find((c) =>
    c.content.includes(WORKFLOW_MARKERS.REQUEST_REVIEW)
  );
  const latestApproval = workflowComments.find((c) =>
    c.content.includes(WORKFLOW_MARKERS.APPROVE)
  );
  const latestRejection = workflowComments.find((c) =>
    c.content.includes(WORKFLOW_MARKERS.REJECT)
  );

  // Determine current status based on order
  if (latest.content.includes(WORKFLOW_MARKERS.APPROVE)) {
    return {
      status: 'approved',
      approvedBy: latest.author.name,
      approvedAt: latest.createdAt,
      latestApproval,
      latestReviewRequest,
    };
  }

  if (latest.content.includes(WORKFLOW_MARKERS.REJECT)) {
    return {
      status: 'rejected',
      rejectedBy: latest.author.name,
      rejectedAt: latest.createdAt,
      latestRejection,
      latestReviewRequest,
    };
  }

  if (latest.content.includes(WORKFLOW_MARKERS.REQUEST_REVIEW)) {
    return {
      status: 'pending_review',
      requestedBy: latest.author.name,
      requestedAt: latest.createdAt,
      latestReviewRequest,
    };
  }

  return { status: 'draft' };
}

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({
  assessmentId,
  assessmentStatus,
  compact = false,
}) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'request' | 'approve' | 'reject'>('request');
  const [reviewerNote, setReviewerNote] = useState('');
  const [selectedReviewer, setSelectedReviewer] = useState('');

  // Fetch comments to determine workflow status
  const { data: comments, isLoading: commentsLoading } = useComments(assessmentId);
  const createComment = useCreateComment();
  const { data: users } = useUsers();

  const workflowInfo = useMemo(() => determineWorkflowStatus(comments), [comments]);

  const handleRequestReview = async () => {
    try {
      let content = `${WORKFLOW_MARKERS.REQUEST_REVIEW} Requesting review for this assessment.`;
      if (selectedReviewer) {
        const reviewer = users?.find((u) => u.id === selectedReviewer);
        if (reviewer) {
          content = `${WORKFLOW_MARKERS.REQUEST_REVIEW} Requesting review from ${reviewer.name}.`;
        }
      }
      if (reviewerNote) {
        content += `\n\nNote: ${reviewerNote}`;
      }

      await createComment.mutateAsync({
        content,
        assessmentId,
        mentions: selectedReviewer ? [selectedReviewer] : undefined,
      });

      showNotification('Review requested successfully', 'success');
      setDialogOpen(false);
      setReviewerNote('');
      setSelectedReviewer('');
    } catch (error) {
      showNotification('Failed to request review', 'error');
    }
  };

  const handleApprove = async () => {
    try {
      let content = `${WORKFLOW_MARKERS.APPROVE} Assessment approved.`;
      if (reviewerNote) {
        content += `\n\nComment: ${reviewerNote}`;
      }

      await createComment.mutateAsync({
        content,
        assessmentId,
      });

      showNotification('Assessment approved', 'success');
      setDialogOpen(false);
      setReviewerNote('');
    } catch (error) {
      showNotification('Failed to approve assessment', 'error');
    }
  };

  const handleReject = async () => {
    try {
      let content = `${WORKFLOW_MARKERS.REJECT} Assessment rejected.`;
      if (reviewerNote) {
        content += `\n\nReason: ${reviewerNote}`;
      }

      await createComment.mutateAsync({
        content,
        assessmentId,
      });

      showNotification('Assessment rejected', 'success');
      setDialogOpen(false);
      setReviewerNote('');
    } catch (error) {
      showNotification('Failed to reject assessment', 'error');
    }
  };

  const openDialog = (mode: 'request' | 'approve' | 'reject') => {
    setDialogMode(mode);
    setReviewerNote('');
    setSelectedReviewer('');
    setDialogOpen(true);
  };

  const getStatusConfig = (status: WorkflowStatus) => {
    switch (status) {
      case 'draft':
        return {
          icon: <DraftIcon />,
          label: 'Draft',
          color: 'default' as const,
          step: 0,
        };
      case 'pending_review':
        return {
          icon: <PendingIcon />,
          label: 'Pending Review',
          color: 'warning' as const,
          step: 1,
        };
      case 'approved':
        return {
          icon: <ApprovedIcon />,
          label: 'Approved',
          color: 'success' as const,
          step: 2,
        };
      case 'rejected':
        return {
          icon: <RejectIcon />,
          label: 'Rejected',
          color: 'error' as const,
          step: 1,
        };
    }
  };

  const statusConfig = getStatusConfig(workflowInfo.status);

  if (commentsLoading) {
    return <CircularProgress size={16} />;
  }

  // Compact view - just shows a badge
  if (compact) {
    return (
      <Tooltip
        title={
          workflowInfo.status === 'approved'
            ? `Approved by ${workflowInfo.approvedBy}`
            : workflowInfo.status === 'pending_review'
            ? `Review requested by ${workflowInfo.requestedBy}`
            : workflowInfo.status === 'rejected'
            ? `Rejected by ${workflowInfo.rejectedBy}`
            : 'Not yet submitted for review'
        }
      >
        <Chip
          icon={statusConfig.icon}
          label={statusConfig.label}
          size="small"
          color={statusConfig.color}
          variant={workflowInfo.status === 'draft' ? 'outlined' : 'filled'}
        />
      </Tooltip>
    );
  }

  // Full view with workflow controls
  return (
    <Box>
      {/* Workflow Status Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="subtitle2" color="primary">
            Approval Status:
          </Typography>
          <Chip
            icon={statusConfig.icon}
            label={statusConfig.label}
            size="small"
            color={statusConfig.color}
            variant={workflowInfo.status === 'draft' ? 'outlined' : 'filled'}
          />
        </Box>
      </Box>

      {/* Workflow Stepper */}
      <Stepper activeStep={statusConfig.step} alternativeLabel sx={{ mb: 2 }}>
        <Step completed={workflowInfo.status !== 'draft'}>
          <StepLabel>Draft</StepLabel>
        </Step>
        <Step completed={workflowInfo.status === 'approved'}>
          <StepLabel error={workflowInfo.status === 'rejected'}>
            {workflowInfo.status === 'rejected' ? 'Rejected' : 'Review'}
          </StepLabel>
        </Step>
        <Step completed={workflowInfo.status === 'approved'}>
          <StepLabel>Approved</StepLabel>
        </Step>
      </Stepper>

      {/* Status Info */}
      {workflowInfo.status === 'pending_review' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Review requested by {workflowInfo.requestedBy} on{' '}
          {new Date(workflowInfo.requestedAt!).toLocaleDateString()}
        </Alert>
      )}

      {workflowInfo.status === 'approved' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Approved by {workflowInfo.approvedBy} on{' '}
          {new Date(workflowInfo.approvedAt!).toLocaleDateString()}
        </Alert>
      )}

      {workflowInfo.status === 'rejected' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Rejected by {workflowInfo.rejectedBy} on{' '}
          {new Date(workflowInfo.rejectedAt!).toLocaleDateString()}
        </Alert>
      )}

      {/* Action Buttons */}
      <Box display="flex" gap={1} flexWrap="wrap">
        {(workflowInfo.status === 'draft' || workflowInfo.status === 'rejected') && (
          <Button
            variant="outlined"
            startIcon={<RequestIcon />}
            onClick={() => openDialog('request')}
            size="small"
          >
            Request Review
          </Button>
        )}

        {workflowInfo.status === 'pending_review' && (
          <>
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={() => openDialog('approve')}
              size="small"
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<RejectIcon />}
              onClick={() => openDialog('reject')}
              size="small"
            >
              Reject
            </Button>
          </>
        )}

        {workflowInfo.status === 'approved' && (
          <Button
            variant="outlined"
            startIcon={<RequestIcon />}
            onClick={() => openDialog('request')}
            size="small"
          >
            Request Re-review
          </Button>
        )}
      </Box>

      {/* Dialog for workflow actions */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {dialogMode === 'request'
                ? 'Request Review'
                : dialogMode === 'approve'
                ? 'Approve Assessment'
                : 'Reject Assessment'}
            </Typography>
            <IconButton size="small" onClick={() => setDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {dialogMode === 'request' && users && users.length > 0 && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Request review from (optional)</InputLabel>
                <Select
                  value={selectedReviewer}
                  onChange={(e) => setSelectedReviewer(e.target.value)}
                  label="Request review from (optional)"
                >
                  <MenuItem value="">
                    <em>Anyone</em>
                  </MenuItem>
                  {users
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label={
                dialogMode === 'request'
                  ? 'Note for reviewer (optional)'
                  : dialogMode === 'approve'
                  ? 'Approval comment (optional)'
                  : 'Reason for rejection'
              }
              multiline
              rows={3}
              value={reviewerNote}
              onChange={(e) => setReviewerNote(e.target.value)}
              fullWidth
              placeholder={
                dialogMode === 'request'
                  ? 'Add any notes for the reviewer...'
                  : dialogMode === 'approve'
                  ? 'Add any comments about the approval...'
                  : 'Please provide a reason for rejection...'
              }
              required={dialogMode === 'reject'}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={
              dialogMode === 'approve'
                ? 'success'
                : dialogMode === 'reject'
                ? 'error'
                : 'primary'
            }
            onClick={
              dialogMode === 'request'
                ? handleRequestReview
                : dialogMode === 'approve'
                ? handleApprove
                : handleReject
            }
            disabled={createComment.isPending || (dialogMode === 'reject' && !reviewerNote.trim())}
          >
            {createComment.isPending
              ? 'Processing...'
              : dialogMode === 'request'
              ? 'Request Review'
              : dialogMode === 'approve'
              ? 'Approve'
              : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalWorkflow;

/**
 * Quick Actions Component
 *
 * Provides one-click workflows for common risk management actions:
 * - Update compliance status
 * - Assign to team member
 * - Add evidence/notes
 * - Create remediation task
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  Popover,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  AttachFile as AttachFileIcon,
  Person as PersonIcon,
  Flag as FlagIcon,
  MoreVert as MoreVertIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  RemoveCircle as RemoveCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  PlaylistAdd as PlaylistAddIcon,
  Assignment as AssignmentIcon,
  Note as NoteIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Types
export interface QuickActionsProps {
  assessmentId?: string;
  systemId: string;
  productId: string;
  subcategoryId: string;
  currentStatus?: string;
  onStatusChange?: (newStatus: string) => void;
  onSuccess?: () => void;
  variant?: 'inline' | 'compact' | 'full';
  showLabels?: boolean;
}

type ComplianceStatus = 'Implemented' | 'Partially Implemented' | 'Not Implemented' | 'Not Assessed' | 'Not Applicable';

const STATUS_CONFIG: Record<ComplianceStatus, { label: string; shortLabel: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  'Implemented': {
    label: 'Compliant',
    shortLabel: 'C',
    color: '#4caf50',
    bgColor: '#e8f5e9',
    icon: <CheckCircleIcon sx={{ fontSize: 18 }} />,
  },
  'Partially Implemented': {
    label: 'Partial',
    shortLabel: 'P',
    color: '#ff9800',
    bgColor: '#fff3e0',
    icon: <RemoveCircleIcon sx={{ fontSize: 18 }} />,
  },
  'Not Implemented': {
    label: 'Non-Compliant',
    shortLabel: 'N',
    color: '#f44336',
    bgColor: '#ffebee',
    icon: <CancelIcon sx={{ fontSize: 18 }} />,
  },
  'Not Assessed': {
    label: 'Not Assessed',
    shortLabel: '?',
    color: '#9e9e9e',
    bgColor: '#fafafa',
    icon: <RadioButtonUncheckedIcon sx={{ fontSize: 18 }} />,
  },
  'Not Applicable': {
    label: 'N/A',
    shortLabel: '-',
    color: '#757575',
    bgColor: '#f5f5f5',
    icon: <RadioButtonUncheckedIcon sx={{ fontSize: 18 }} />,
  },
};

/**
 * Inline Status Picker - Quick status change buttons
 */
export const InlineStatusPicker: React.FC<{
  currentStatus?: string;
  onStatusChange: (status: ComplianceStatus) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
}> = ({ currentStatus, onStatusChange, disabled = false, size = 'small' }) => {
  const theme = useTheme();

  return (
    <ButtonGroup size={size} variant="outlined" disabled={disabled}>
      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
        const isActive = currentStatus === status;
        return (
          <Tooltip key={status} title={config.label}>
            <Button
              onClick={() => onStatusChange(status as ComplianceStatus)}
              sx={{
                minWidth: size === 'small' ? 32 : 40,
                px: 0.5,
                bgcolor: isActive ? config.bgColor : 'transparent',
                borderColor: isActive ? config.color : alpha(theme.palette.divider, 0.5),
                color: config.color,
                '&:hover': {
                  bgcolor: alpha(config.color, 0.1),
                  borderColor: config.color,
                },
              }}
            >
              {config.icon}
            </Button>
          </Tooltip>
        );
      })}
    </ButtonGroup>
  );
};

/**
 * Quick Notes Dialog - Add evidence/notes quickly
 */
const QuickNotesDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (notes: string, evidence?: string) => void;
  isLoading?: boolean;
  currentNotes?: string;
}> = ({ open, onClose, onSave, isLoading = false, currentNotes = '' }) => {
  const [notes, setNotes] = useState(currentNotes);
  const [evidence, setEvidence] = useState('');

  const handleSave = () => {
    onSave(notes, evidence || undefined);
    setNotes('');
    setEvidence('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Notes / Evidence</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Notes"
          multiline
          rows={3}
          fullWidth
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter assessment notes, findings, or observations..."
        />
        <TextField
          margin="dense"
          label="Evidence Reference"
          fullWidth
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="e.g., Ticket #12345, Screenshot attached, Policy doc v2.1"
          helperText="Reference to supporting evidence (optional)"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isLoading || !notes.trim()}
          startIcon={isLoading ? <CircularProgress size={16} /> : <CheckIcon />}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Quick Assign Dialog - Assign control to team member
 */
const QuickAssignDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onAssign: (assignee: string) => void;
  isLoading?: boolean;
}> = ({ open, onClose, onAssign, isLoading = false }) => {
  const [assignee, setAssignee] = useState('');

  const handleAssign = () => {
    onAssign(assignee);
    setAssignee('');
  };

  // Mock team members - in real app, would fetch from API
  const teamMembers = [
    { id: '1', name: 'Security Team', email: 'security@company.com' },
    { id: '2', name: 'IT Operations', email: 'it-ops@company.com' },
    { id: '3', name: 'Compliance', email: 'compliance@company.com' },
    { id: '4', name: 'DevOps', email: 'devops@company.com' },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Assign Control</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <InputLabel>Assign To</InputLabel>
          <Select
            value={assignee}
            label="Assign To"
            onChange={(e) => setAssignee(e.target.value)}
          >
            {teamMembers.map((member) => (
              <MenuItem key={member.id} value={member.name}>
                <Box>
                  <Typography variant="body2">{member.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {member.email}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
        <Button
          onClick={handleAssign}
          variant="contained"
          disabled={isLoading || !assignee}
          startIcon={isLoading ? <CircularProgress size={16} /> : <PersonIcon />}
        >
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Quick Remediation Task Dialog
 */
const QuickRemediationDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreate: (title: string, priority: string, dueDate?: string) => void;
  isLoading?: boolean;
  subcategoryId: string;
}> = ({ open, onClose, onCreate, isLoading = false, subcategoryId }) => {
  const [title, setTitle] = useState(`Remediate ${subcategoryId}`);
  const [priority, setPriority] = useState('HIGH');
  const [dueDate, setDueDate] = useState('');

  const handleCreate = () => {
    onCreate(title, priority, dueDate || undefined);
    setTitle(`Remediate ${subcategoryId}`);
    setPriority('HIGH');
    setDueDate('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Remediation Task</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Task Title"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Priority</InputLabel>
          <Select
            value={priority}
            label="Priority"
            onChange={(e) => setPriority(e.target.value)}
          >
            <MenuItem value="CRITICAL">Critical</MenuItem>
            <MenuItem value="HIGH">High</MenuItem>
            <MenuItem value="MEDIUM">Medium</MenuItem>
            <MenuItem value="LOW">Low</MenuItem>
          </Select>
        </FormControl>
        <TextField
          margin="dense"
          label="Due Date"
          type="date"
          fullWidth
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          color="warning"
          disabled={isLoading || !title.trim()}
          startIcon={isLoading ? <CircularProgress size={16} /> : <FlagIcon />}
        >
          Create Task
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Main Quick Actions Component
 */
const QuickActions: React.FC<QuickActionsProps> = ({
  assessmentId,
  systemId,
  productId,
  subcategoryId,
  currentStatus,
  onStatusChange,
  onSuccess,
  variant = 'inline',
  showLabels = false,
}) => {
  const theme = useTheme();
  const queryClient = useQueryClient();

  // Dialog states
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [remediationDialogOpen, setRemediationDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await api.patch(`/assessments/${assessmentId}`, {
        status: newStatus,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['risk'] });
      onSuccess?.();
    },
  });

  // Notes update mutation
  const notesMutation = useMutation({
    mutationFn: async ({ notes, evidence }: { notes: string; evidence?: string }) => {
      const response = await api.patch(`/assessments/${assessmentId}`, {
        notes,
        evidence,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      setNotesDialogOpen(false);
      onSuccess?.();
    },
  });

  // Remediation task mutation
  const remediationMutation = useMutation({
    mutationFn: async ({ title, priority, dueDate }: { title: string; priority: string; dueDate?: string }) => {
      const response = await api.post('/remediation-tasks', {
        assessmentId,
        title,
        priority,
        dueDate,
        status: 'OPEN',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      setRemediationDialogOpen(false);
      onSuccess?.();
    },
  });

  const handleStatusChange = (newStatus: ComplianceStatus) => {
    if (assessmentId) {
      statusMutation.mutate(newStatus);
    }
    onStatusChange?.(newStatus);
  };

  const handleSaveNotes = (notes: string, evidence?: string) => {
    if (assessmentId) {
      notesMutation.mutate({ notes, evidence });
    }
  };

  const handleAssign = (assignee: string) => {
    // In a real app, this would call an API to assign the control
    console.log('Assigning to:', assignee);
    setAssignDialogOpen(false);
    onSuccess?.();
  };

  const handleCreateRemediation = (title: string, priority: string, dueDate?: string) => {
    if (assessmentId) {
      remediationMutation.mutate({ title, priority, dueDate });
    }
  };

  // Render based on variant
  if (variant === 'compact') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <InlineStatusPicker
          currentStatus={currentStatus}
          onStatusChange={handleStatusChange}
          disabled={statusMutation.isPending}
          size="small"
        />
        <IconButton
          size="small"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Popover
          open={Boolean(menuAnchor)}
          anchorEl={menuAnchor}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <List dense>
            <ListItemButton onClick={() => { setNotesDialogOpen(true); setMenuAnchor(null); }}>
              <ListItemIcon><NoteIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Add Notes" />
            </ListItemButton>
            <ListItemButton onClick={() => { setAssignDialogOpen(true); setMenuAnchor(null); }}>
              <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Assign" />
            </ListItemButton>
            <Divider />
            <ListItemButton onClick={() => { setRemediationDialogOpen(true); setMenuAnchor(null); }}>
              <ListItemIcon><FlagIcon fontSize="small" color="warning" /></ListItemIcon>
              <ListItemText primary="Create Task" />
            </ListItemButton>
          </List>
        </Popover>

        {/* Dialogs */}
        <QuickNotesDialog
          open={notesDialogOpen}
          onClose={() => setNotesDialogOpen(false)}
          onSave={handleSaveNotes}
          isLoading={notesMutation.isPending}
        />
        <QuickAssignDialog
          open={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          onAssign={handleAssign}
        />
        <QuickRemediationDialog
          open={remediationDialogOpen}
          onClose={() => setRemediationDialogOpen(false)}
          onCreate={handleCreateRemediation}
          isLoading={remediationMutation.isPending}
          subcategoryId={subcategoryId}
        />
      </Box>
    );
  }

  if (variant === 'full') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Quick Status
        </Typography>
        <InlineStatusPicker
          currentStatus={currentStatus}
          onStatusChange={handleStatusChange}
          disabled={statusMutation.isPending}
          size="medium"
        />

        <Divider />

        <Typography variant="subtitle2" color="text.secondary">
          Actions
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<NoteIcon />}
            onClick={() => setNotesDialogOpen(true)}
          >
            Add Notes
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PersonIcon />}
            onClick={() => setAssignDialogOpen(true)}
          >
            Assign
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="warning"
            startIcon={<FlagIcon />}
            onClick={() => setRemediationDialogOpen(true)}
          >
            Create Task
          </Button>
        </Box>

        {/* Dialogs */}
        <QuickNotesDialog
          open={notesDialogOpen}
          onClose={() => setNotesDialogOpen(false)}
          onSave={handleSaveNotes}
          isLoading={notesMutation.isPending}
        />
        <QuickAssignDialog
          open={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          onAssign={handleAssign}
        />
        <QuickRemediationDialog
          open={remediationDialogOpen}
          onClose={() => setRemediationDialogOpen(false)}
          onCreate={handleCreateRemediation}
          isLoading={remediationMutation.isPending}
          subcategoryId={subcategoryId}
        />
      </Box>
    );
  }

  // Default: inline variant
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <InlineStatusPicker
        currentStatus={currentStatus}
        onStatusChange={handleStatusChange}
        disabled={statusMutation.isPending}
        size="small"
      />
      {showLabels && (
        <>
          <Tooltip title="Add Notes">
            <IconButton size="small" onClick={() => setNotesDialogOpen(true)}>
              <NoteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Assign">
            <IconButton size="small" onClick={() => setAssignDialogOpen(true)}>
              <PersonIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Create Remediation Task">
            <IconButton size="small" onClick={() => setRemediationDialogOpen(true)}>
              <FlagIcon fontSize="small" color="warning" />
            </IconButton>
          </Tooltip>
        </>
      )}

      {/* Dialogs */}
      <QuickNotesDialog
        open={notesDialogOpen}
        onClose={() => setNotesDialogOpen(false)}
        onSave={handleSaveNotes}
        isLoading={notesMutation.isPending}
      />
      <QuickAssignDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        onAssign={handleAssign}
      />
      <QuickRemediationDialog
        open={remediationDialogOpen}
        onClose={() => setRemediationDialogOpen(false)}
        onCreate={handleCreateRemediation}
        isLoading={remediationMutation.isPending}
        subcategoryId={subcategoryId}
      />
    </Box>
  );
};

export default QuickActions;

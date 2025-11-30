/**
 * Assignment Badge Component
 *
 * Shows who is assigned to a control and allows quick assignment changes.
 * Displays as a compact badge with avatar and name, with popover for editing.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import {
  useControlAssignment,
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
  useUsers,
  Assignment,
  AssignmentAssignee,
} from '../hooks/useAssignments';
import { useNotification } from '../contexts/NotificationContext';

interface AssignmentBadgeProps {
  controlCode: string;
  productId: string;
  systemId?: string;
  compact?: boolean;
  onAssignmentChange?: (assignment: Assignment | null) => void;
}

const AssignmentBadge: React.FC<AssignmentBadgeProps> = ({
  controlCode,
  productId,
  systemId,
  compact = false,
  onAssignmentChange,
}) => {
  const { showNotification } = useNotification();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch current assignment for this control
  const {
    data: assignmentData,
    isLoading: assignmentLoading,
    refetch: refetchAssignment,
  } = useControlAssignment(controlCode, productId, systemId);

  // Fetch all users for assignment
  const { data: users, isLoading: usersLoading } = useUsers();

  // Mutations
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const assignment = assignmentData?.assignment;
  const isOpen = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setSearchQuery('');
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAssign = async (user: AssignmentAssignee) => {
    try {
      if (assignment) {
        // Update existing assignment
        await updateAssignment.mutateAsync({
          id: assignment.id,
          updates: { assigneeId: user.id },
        });
        showNotification(`Reassigned to ${user.name}`, 'success');
      } else {
        // Create new assignment
        await createAssignment.mutateAsync({
          controlPattern: controlCode,
          assigneeId: user.id,
          productId,
          systemId,
        });
        showNotification(`Assigned to ${user.name}`, 'success');
      }
      refetchAssignment();
      onAssignmentChange?.(assignment || null);
      handleClose();
    } catch (error) {
      showNotification('Failed to update assignment', 'error');
    }
  };

  const handleRemoveAssignment = async () => {
    if (!assignment) return;

    try {
      await deleteAssignment.mutateAsync(assignment.id);
      showNotification('Assignment removed', 'success');
      refetchAssignment();
      onAssignmentChange?.(null);
      handleClose();
    } catch (error) {
      showNotification('Failed to remove assignment', 'error');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter users by search query
  const filteredUsers = users?.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isPending = createAssignment.isPending || updateAssignment.isPending || deleteAssignment.isPending;

  if (assignmentLoading) {
    return <CircularProgress size={16} />;
  }

  return (
    <>
      {assignment ? (
        <Tooltip title={`Assigned to ${assignment.assignee.name}`}>
          <Chip
            avatar={
              <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                {getInitials(assignment.assignee.name)}
              </Avatar>
            }
            label={compact ? '' : assignment.assignee.name}
            size="small"
            onClick={handleClick}
            sx={{
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
              ...(compact && { width: 32, '& .MuiChip-label': { display: 'none' } }),
            }}
          />
        </Tooltip>
      ) : (
        <Tooltip title="Click to assign someone">
          <Chip
            icon={<PersonAddIcon fontSize="small" />}
            label={compact ? '' : 'Unassigned'}
            size="small"
            variant="outlined"
            onClick={handleClick}
            sx={{
              cursor: 'pointer',
              borderStyle: 'dashed',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover', borderStyle: 'solid' },
              ...(compact && { width: 32, '& .MuiChip-label': { display: 'none' } }),
            }}
          />
        </Tooltip>
      )}

      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ width: 280, maxHeight: 400 }}>
          {/* Header */}
          <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">
                {assignment ? 'Reassign Control' : 'Assign Control'}
              </Typography>
              <IconButton size="small" onClick={handleClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {controlCode}
            </Typography>
          </Box>

          {/* Search */}
          <Box sx={{ p: 1 }}>
            <TextField
              size="small"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Current assignment */}
          {assignment && (
            <Box sx={{ px: 1.5, py: 1, bgcolor: 'primary.50' }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Currently assigned
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                    {getInitials(assignment.assignee.name)}
                  </Avatar>
                  <Typography variant="body2">{assignment.assignee.name}</Typography>
                </Box>
                <IconButton
                  size="small"
                  color="error"
                  onClick={handleRemoveAssignment}
                  disabled={isPending}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          )}

          <Divider />

          {/* User list */}
          {usersLoading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={24} />
            </Box>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
              {filteredUsers.map((user) => {
                const isCurrentAssignee = assignment?.assigneeId === user.id;
                return (
                  <ListItem key={user.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleAssign(user)}
                      disabled={isPending || isCurrentAssignee}
                      selected={isCurrentAssignee}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                          {getInitials(user.name)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.name}
                        secondary={user.email}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      {isCurrentAssignee && <CheckIcon fontSize="small" color="primary" />}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Box p={2}>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {searchQuery ? 'No users found' : 'No users available'}
              </Typography>
            </Box>
          )}

          {isPending && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(255,255,255,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default AssignmentBadge;

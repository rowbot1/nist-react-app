/**
 * Audit History Component
 *
 * Displays the change history/audit trail for an entity (Assessment, Product, etc.).
 * Shows who made what changes and when, with expandable details.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow,
  CircularProgress,
  Alert,
  Avatar,
  Tooltip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as CreateIcon,
  Edit as UpdateIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FileDownload as ExportIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  useEntityAuditHistory,
  AuditLog,
  AuditAction,
  AuditEntityType,
  formatAuditAction,
  getAuditActionColor,
  formatChangedFields,
} from '../hooks/useAudit';

interface AuditHistoryProps {
  entityType: AuditEntityType;
  entityId: string;
  compact?: boolean;
  maxItems?: number;
  showTitle?: boolean;
}

// Get icon for action
function getActionIcon(action: AuditAction) {
  const icons: Record<AuditAction, React.ReactElement> = {
    CREATE: <CreateIcon fontSize="small" />,
    UPDATE: <UpdateIcon fontSize="small" />,
    DELETE: <DeleteIcon fontSize="small" />,
    VIEW: <ViewIcon fontSize="small" />,
    EXPORT: <ExportIcon fontSize="small" />,
    LOGIN: <LoginIcon fontSize="small" />,
    LOGOUT: <LogoutIcon fontSize="small" />,
  };
  return icons[action] || <HistoryIcon fontSize="small" />;
}

// Format timestamp for display
function formatTimestamp(timestamp: string): { date: string; time: string; relative: string } {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative: string;
  if (diffMins < 1) {
    relative = 'Just now';
  } else if (diffMins < 60) {
    relative = `${diffMins}m ago`;
  } else if (diffHours < 24) {
    relative = `${diffHours}h ago`;
  } else if (diffDays < 7) {
    relative = `${diffDays}d ago`;
  } else {
    relative = date.toLocaleDateString();
  }

  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    relative,
  };
}

// Get user initials
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Individual audit entry component
const AuditEntry: React.FC<{ log: AuditLog; compact: boolean }> = ({ log, compact }) => {
  const [expanded, setExpanded] = useState(false);
  const timestamp = formatTimestamp(log.timestamp);
  const hasDetails = log.changedFields && log.changedFields.length > 0;
  const changes = formatChangedFields(log.changedFields, log.previousValue, log.newValue);

  return (
    <>
      <ListItem
        alignItems="flex-start"
        sx={{
          py: 1,
          px: 2,
          '&:hover': { bgcolor: 'action.hover' },
        }}
        secondaryAction={
          hasDetails && (
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )
        }
      >
        <ListItemAvatar sx={{ minWidth: 44 }}>
          <Tooltip title={log.userEmail}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.8rem',
                bgcolor: getAuditActionColor(log.action) === 'success' ? 'success.main' :
                         getAuditActionColor(log.action) === 'error' ? 'error.main' :
                         getAuditActionColor(log.action) === 'warning' ? 'warning.main' :
                         getAuditActionColor(log.action) === 'info' ? 'info.main' : 'grey.500',
              }}
            >
              {getActionIcon(log.action)}
            </Avatar>
          </Tooltip>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="body2" fontWeight="medium">
                {log.userName}
              </Typography>
              <Chip
                label={formatAuditAction(log.action)}
                size="small"
                color={getAuditActionColor(log.action)}
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
          }
          secondary={
            <Box>
              {log.entityName && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {log.entityType}: {log.entityName}
                </Typography>
              )}
              <Tooltip title={`${timestamp.date} ${timestamp.time}`}>
                <Typography variant="caption" color="text.secondary">
                  {timestamp.relative}
                </Typography>
              </Tooltip>
            </Box>
          }
        />
      </ListItem>

      {/* Expandable change details */}
      {hasDetails && (
        <Collapse in={expanded}>
          <Box sx={{ px: 2, pb: 2, pl: 7 }}>
            <Paper variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" fontWeight="medium" gutterBottom display="block">
                Changed Fields:
              </Typography>
              <Table size="small" sx={{ '& td': { py: 0.5, px: 1, fontSize: '0.75rem' } }}>
                <TableBody>
                  {changes.map((change) => (
                    <TableRow key={change.field}>
                      <TableCell sx={{ fontWeight: 'medium', width: '30%' }}>
                        {change.field}
                      </TableCell>
                      <TableCell sx={{ color: 'error.main', textDecoration: 'line-through' }}>
                        {change.from.length > 50 ? `${change.from.slice(0, 50)}...` : change.from}
                      </TableCell>
                      <TableCell sx={{ color: 'success.main' }}>
                        {change.to.length > 50 ? `${change.to.slice(0, 50)}...` : change.to}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        </Collapse>
      )}
      <Divider component="li" />
    </>
  );
};

const AuditHistory: React.FC<AuditHistoryProps> = ({
  entityType,
  entityId,
  compact = false,
  maxItems = 20,
  showTitle = true,
}) => {
  const { data, isLoading, error, refetch, isFetching } = useEntityAuditHistory(
    entityType,
    entityId
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Loading history...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load audit history
      </Alert>
    );
  }

  const logs = data?.logs.slice(0, maxItems) || [];

  if (logs.length === 0) {
    return (
      <Box p={2} textAlign="center">
        <HistoryIcon color="disabled" sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          No history recorded yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {showTitle && (
        <Box display="flex" justifyContent="space-between" alignItems="center" px={2} py={1}>
          <Typography variant="subtitle2" color="primary">
            Change History
          </Typography>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => refetch()} disabled={isFetching}>
              <RefreshIcon
                fontSize="small"
                sx={{
                  animation: isFetching ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <List disablePadding>
        {logs.map((log) => (
          <AuditEntry key={log.id} log={log} compact={compact} />
        ))}
      </List>

      {data && data.total > maxItems && (
        <Box textAlign="center" py={1}>
          <Typography variant="caption" color="text.secondary">
            Showing {maxItems} of {data.total} entries
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AuditHistory;

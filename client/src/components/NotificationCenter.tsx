import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Button,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  DoneAll as DoneAllIcon,
  DeleteSweep as ClearAllIcon,
  Assessment as AssessmentIcon,
  Computer as SystemIcon,
  Business as ProductIcon,
  Security as ComplianceIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useNotification, Notification, NotificationSeverity } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

const getSeverityIcon = (severity: NotificationSeverity) => {
  switch (severity) {
    case 'success':
      return <SuccessIcon color="success" fontSize="small" />;
    case 'warning':
      return <WarningIcon color="warning" fontSize="small" />;
    case 'error':
      return <ErrorIcon color="error" fontSize="small" />;
    default:
      return <InfoIcon color="info" fontSize="small" />;
  }
};

const getCategoryIcon = (category?: string) => {
  switch (category) {
    case 'assessment':
      return <AssessmentIcon fontSize="small" />;
    case 'system':
      return <SystemIcon fontSize="small" />;
    case 'product':
      return <ProductIcon fontSize="small" />;
    case 'compliance':
      return <ComplianceIcon fontSize="small" />;
    default:
      return null;
  }
};

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
  onRemove,
  onClick,
}) => {
  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    if (onClick) {
      onClick(notification);
    }
  };

  return (
    <ListItem
      onClick={handleClick}
      sx={{
        cursor: notification.link ? 'pointer' : 'default',
        bgcolor: notification.read ? 'transparent' : 'action.hover',
        '&:hover': {
          bgcolor: 'action.selected',
        },
        py: 1.5,
        borderLeft: notification.read ? 'none' : '3px solid',
        borderLeftColor: `${notification.severity}.main`,
      }}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        {getSeverityIcon(notification.severity)}
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: notification.read ? 400 : 600,
                flex: 1,
              }}
            >
              {notification.title || notification.message}
            </Typography>
            {notification.category && (
              <Chip
                icon={getCategoryIcon(notification.category) || undefined}
                label={notification.category}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        }
        secondary={
          <Box>
            {notification.title && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {notification.message}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
            </Typography>
          </Box>
        }
      />
      <ListItemSecondaryAction>
        <Tooltip title="Dismiss">
          <IconButton
            edge="end"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(notification.id);
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

export const NotificationCenter: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  } = useNotification();

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      navigate(notification.link);
      handleClose();
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  return (
    <>
      <Tooltip title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}>
        <IconButton color="inherit" onClick={handleOpen} sx={{ mr: 1 }}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" component="h2">
            Notifications
          </Typography>
          {notifications.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {unreadCount > 0 && (
                <Tooltip title="Mark all as read">
                  <IconButton size="small" onClick={markAllAsRead}>
                    <DoneAllIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Clear all">
                <IconButton size="small" onClick={clearAllNotifications}>
                  <ClearAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Notification List */}
        <Box sx={{ overflow: 'auto', flex: 1 }}>
          {notifications.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              <NotificationsIcon sx={{ fontSize: 48, opacity: 0.5, mb: 1 }} />
              <Typography variant="body2">No notifications yet</Typography>
              <Typography variant="caption" color="text.secondary">
                You'll see updates about assessments, systems, and compliance here.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkRead={markAsRead}
                    onRemove={removeNotification}
                    onClick={handleNotificationClick}
                  />
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box
            sx={{
              p: 1.5,
              borderTop: 1,
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <Button
              size="small"
              onClick={() => {
                navigate('/settings');
                handleClose();
              }}
            >
              Notification Settings
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
};

export default NotificationCenter;

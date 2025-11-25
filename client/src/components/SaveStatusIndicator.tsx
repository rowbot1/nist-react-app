/**
 * Save Status Indicator
 *
 * Visual indicator that shows the current save state:
 * - Idle: Nothing shown or subtle "All changes saved"
 * - Saving: Animated spinner with "Saving..."
 * - Saved: Green checkmark with "Saved" (auto-fades)
 * - Error: Red warning with error message
 */

import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Fade,
  Tooltip,
} from '@mui/material';
import {
  CloudDone as SavedIcon,
  CloudOff as ErrorIcon,
  Cloud as IdleIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useSaveStatus } from '../contexts/SaveStatusContext';

interface SaveStatusIndicatorProps {
  showIdle?: boolean;
  size?: 'small' | 'medium';
  variant?: 'icon' | 'full';
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  showIdle = false,
  size = 'small',
  variant = 'full',
}) => {
  const { saveState, lastSaved, errorMessage } = useSaveStatus();

  const iconSize = size === 'small' ? 18 : 24;
  const fontSize = size === 'small' ? '0.75rem' : '0.875rem';

  // Don't show anything in idle state if showIdle is false
  if (saveState === 'idle' && !showIdle) {
    return null;
  }

  const getContent = () => {
    switch (saveState) {
      case 'saving':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CircularProgress size={iconSize - 2} thickness={4} />
            {variant === 'full' && (
              <Typography variant="caption" sx={{ fontSize, color: 'text.secondary' }}>
                Saving...
              </Typography>
            )}
          </Box>
        );

      case 'saved':
        return (
          <Fade in timeout={300}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <SavedIcon
                sx={{
                  fontSize: iconSize,
                  color: 'success.main',
                }}
              />
              {variant === 'full' && (
                <Typography variant="caption" sx={{ fontSize, color: 'success.main' }}>
                  Saved
                </Typography>
              )}
            </Box>
          </Fade>
        );

      case 'error':
        return (
          <Tooltip title={errorMessage || 'Save failed'} arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <ErrorIcon
                sx={{
                  fontSize: iconSize,
                  color: 'error.main',
                }}
              />
              {variant === 'full' && (
                <Typography variant="caption" sx={{ fontSize, color: 'error.main' }}>
                  Error saving
                </Typography>
              )}
            </Box>
          </Tooltip>
        );

      case 'idle':
      default:
        if (!showIdle) return null;
        return (
          <Tooltip
            title={lastSaved ? `Last saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}` : 'No changes'}
            arrow
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <IdleIcon
                sx={{
                  fontSize: iconSize,
                  color: 'text.disabled',
                }}
              />
              {variant === 'full' && (
                <Typography variant="caption" sx={{ fontSize, color: 'text.disabled' }}>
                  All changes saved
                </Typography>
              )}
            </Box>
          </Tooltip>
        );
    }
  };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: variant === 'full' ? 1 : 0,
        py: 0.5,
        borderRadius: 1,
        transition: 'background-color 0.2s ease',
        bgcolor: saveState === 'error' ? 'error.main' : 'transparent',
        ...(saveState === 'error' && variant === 'full' && {
          bgcolor: 'rgba(211, 47, 47, 0.08)',
        }),
      }}
    >
      {getContent()}
    </Box>
  );
};

/**
 * Compact save indicator for inline use
 */
export const SaveStatusBadge: React.FC = () => {
  const { saveState } = useSaveStatus();

  if (saveState === 'idle') return null;

  return (
    <SaveStatusIndicator
      showIdle={false}
      size="small"
      variant="icon"
    />
  );
};

export default SaveStatusIndicator;

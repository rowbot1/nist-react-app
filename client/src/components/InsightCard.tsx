/**
 * InsightCard Component
 *
 * Smart insight cards that replace static stat displays with actionable information.
 * Types: coverage, velocity, risk, opportunity
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  useTheme,
  alpha,
  Skeleton,
  Theme,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Speed as VelocityIcon,
  EmojiEvents as WinIcon,
  Error as RiskIcon,
  DonutLarge as CoverageIcon,
} from '@mui/icons-material';

export type InsightCardType = 'coverage' | 'velocity' | 'risk' | 'opportunity';

interface InsightCardProps {
  type: InsightCardType;
  title: string;
  value: string | number;
  subtitle: string;
  trend?: {
    direction: 'up' | 'down';
    value: number;
    label?: string;
  };
  progress?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  accentColor?: string;
  isLoading?: boolean;
}

const getTypeConfig = (type: InsightCardType, theme: Theme) => {
  const configs = {
    coverage: {
      icon: <CoverageIcon />,
      defaultColor: theme.palette.primary.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.dark, 0.05)} 100%)`,
    },
    velocity: {
      icon: <VelocityIcon />,
      defaultColor: theme.palette.info.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.dark, 0.05)} 100%)`,
    },
    risk: {
      icon: <RiskIcon />,
      defaultColor: theme.palette.error.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.dark, 0.05)} 100%)`,
    },
    opportunity: {
      icon: <WinIcon />,
      defaultColor: theme.palette.success.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.dark, 0.05)} 100%)`,
    },
  };

  return configs[type];
};

const InsightCard: React.FC<InsightCardProps> = ({
  type,
  title,
  value,
  subtitle,
  trend,
  progress,
  action,
  accentColor,
  isLoading = false,
}) => {
  const theme = useTheme();
  const typeConfig = getTypeConfig(type, theme);
  const color = accentColor || typeConfig.defaultColor;

  if (isLoading) {
    return (
      <Card
        sx={{
          height: '100%',
          background: typeConfig.bgGradient,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <CardContent>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={48} />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="rectangular" height={6} sx={{ mt: 2, borderRadius: 1 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        background: typeConfig.bgGradient,
        border: `1px solid ${theme.palette.divider}`,
        borderLeft: `4px solid ${color}`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${alpha(color, 0.2)}`,
          borderColor: alpha(color, 0.3),
        },
      }}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header with icon and title */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                color: color,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {typeConfig.icon}
            </Box>
            <Typography
              variant="overline"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                letterSpacing: '0.08em',
              }}
            >
              {title}
            </Typography>
          </Box>

          {/* Trend chip */}
          {trend && (
            <Chip
              size="small"
              icon={trend.direction === 'up' ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={`${trend.direction === 'up' ? '+' : ''}${trend.value}${trend.label || ''}`}
              sx={{
                height: 24,
                fontSize: '0.7rem',
                fontWeight: 600,
                bgcolor: alpha(
                  trend.direction === 'up'
                    ? type === 'risk'
                      ? theme.palette.error.main
                      : theme.palette.success.main
                    : type === 'risk'
                    ? theme.palette.success.main
                    : theme.palette.error.main,
                  0.15
                ),
                color:
                  trend.direction === 'up'
                    ? type === 'risk'
                      ? theme.palette.error.main
                      : theme.palette.success.main
                    : type === 'risk'
                    ? theme.palette.success.main
                    : theme.palette.error.main,
                '& .MuiChip-icon': {
                  fontSize: 14,
                  color: 'inherit',
                },
              }}
            />
          )}
        </Box>

        {/* Main value */}
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{
            color: color,
            fontFamily: '"JetBrains Mono", monospace',
            lineHeight: 1.2,
            mb: 0.5,
          }}
        >
          {value}
        </Typography>

        {/* Subtitle */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1.5, flex: 1 }}
        >
          {subtitle}
        </Typography>

        {/* Progress bar */}
        {progress !== undefined && (
          <Box sx={{ mb: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: alpha(color, 0.15),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
                },
              }}
            />
          </Box>
        )}

        {/* Action button */}
        {action && (
          <Button
            variant="text"
            size="small"
            onClick={action.onClick}
            sx={{
              alignSelf: 'flex-start',
              color: color,
              fontWeight: 600,
              px: 0,
              '&:hover': {
                bgcolor: 'transparent',
                textDecoration: 'underline',
              },
            }}
          >
            {action.label} &rarr;
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default InsightCard;

// Preset card generators for common use cases
export const createCoverageCard = (
  assessed: number,
  total: number,
  onAction?: () => void
): InsightCardProps => {
  // Guard against division by zero
  const safeTotal = total || 1;
  const percentage = total > 0 ? Math.round((assessed / safeTotal) * 100) : 0;
  const progress = total > 0 ? (assessed / safeTotal) * 100 : 0;

  return {
    type: 'coverage',
    title: 'Assessment Coverage',
    value: total > 0 ? `${percentage}%` : 'N/A',
    subtitle: `${assessed} of ${total} controls assessed`,
    progress,
    action: onAction
      ? { label: 'View remaining', onClick: onAction }
      : undefined,
  };
};

export const createVelocityCard = (
  recentCount: number,
  period: string = 'this week',
  previousCount?: number,
  onAction?: () => void
): InsightCardProps => ({
  type: 'velocity',
  title: 'Assessment Velocity',
  value: `+${recentCount}`,
  subtitle: `Controls assessed ${period}`,
  trend: previousCount !== undefined
    ? {
        direction: recentCount >= previousCount ? 'up' : 'down',
        value: previousCount > 0 ? Math.round(((recentCount - previousCount) / previousCount) * 100) : 100,
        label: '%',
      }
    : undefined,
  action: onAction
    ? { label: 'View activity', onClick: onAction }
    : undefined,
});

export const createRiskCard = (
  controlCode: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  onAction?: () => void
): InsightCardProps => {
  const severityConfig = {
    critical: { color: '#f85149', label: 'Critical' },
    high: { color: '#f0883e', label: 'High' },
    medium: { color: '#d29922', label: 'Medium' },
    low: { color: '#8b949e', label: 'Low' },
  };

  return {
    type: 'risk',
    title: 'Top Risk',
    value: controlCode,
    subtitle: `${severityConfig[severity].label} priority - needs attention`,
    accentColor: severityConfig[severity].color,
    action: onAction
      ? { label: 'Assess now', onClick: onAction }
      : undefined,
  };
};

export const createOpportunityCard = (
  controlCode: string,
  completionPercent: number,
  onAction?: () => void
): InsightCardProps => ({
  type: 'opportunity',
  title: 'Quick Win',
  value: controlCode,
  subtitle: `${completionPercent}% complete - finish this one!`,
  progress: completionPercent,
  action: onAction
    ? { label: 'Complete now', onClick: onAction }
    : undefined,
});

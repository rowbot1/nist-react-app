/**
 * HeroZone Component
 *
 * A prominent header section for the Risk Command Center that displays:
 * - Product selector (prominent placement)
 * - Primary risk score with animated counter
 * - Trend indicator
 * - Quick action buttons
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Skeleton,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  PlayArrow as AssessIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import type { Product } from '../types/api.types';

interface HeroZoneProps {
  products: Product[];
  selectedProductId: string;
  onProductChange: (productId: string) => void;
  riskScore: number;
  previousRiskScore?: number;
  assessedCount: number;
  totalControls: number;
  isLoading?: boolean;
  onQuickAssess?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
}

// Animated counter hook
const useAnimatedCounter = (targetValue: number, duration: number = 1000) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = value;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (targetValue - startValue) * easeOut;

      setValue(Math.round(currentValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [targetValue, duration]);

  return value;
};

const HeroZone: React.FC<HeroZoneProps> = ({
  products,
  selectedProductId,
  onProductChange,
  riskScore,
  previousRiskScore,
  assessedCount,
  totalControls,
  isLoading = false,
  onQuickAssess,
  onExport,
  onRefresh,
}) => {
  const theme = useTheme();
  const animatedScore = useAnimatedCounter(riskScore);

  // Calculate trend
  const getTrend = () => {
    if (previousRiskScore === undefined) return 'stable';
    if (riskScore > previousRiskScore) return 'up';
    if (riskScore < previousRiskScore) return 'down';
    return 'stable';
  };

  const trend = getTrend();
  const trendDiff = previousRiskScore !== undefined ? riskScore - previousRiskScore : 0;

  // Score color based on value
  const getScoreColor = () => {
    if (riskScore >= 80) return theme.palette.success.main;
    if (riskScore >= 60) return theme.palette.warning.main;
    if (riskScore >= 40) return '#f0883e'; // Secondary warning
    return theme.palette.error.main;
  };

  const scoreColor = getScoreColor();

  // Coverage percentage
  const coverage = totalControls > 0 ? Math.round((assessedCount / totalControls) * 100) : 0;

  return (
    <Box
      sx={{
        background: theme.palette.mode === 'dark'
          ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.15)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`
          : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${theme.palette.background.paper} 100%)`,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        p: 3,
        mb: 3,
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
      >
        {/* Product Selector */}
        <Box sx={{ minWidth: 280 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="hero-product-select-label">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SecurityIcon sx={{ fontSize: 16 }} />
                Select Product
              </Box>
            </InputLabel>
            <Select
              labelId="hero-product-select-label"
              value={selectedProductId}
              label="Select Product"
              onChange={(e) => onProductChange(e.target.value)}
              disabled={isLoading}
              sx={{
                '& .MuiSelect-select': {
                  py: 1.5,
                },
              }}
            >
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {product.name}
                    </Typography>
                    {product.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {product.description.slice(0, 50)}
                        {product.description.length > 50 ? '...' : ''}
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Risk Score Display */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            flex: 1,
            justifyContent: { xs: 'flex-start', md: 'center' },
          }}
        >
          {isLoading ? (
            <Skeleton variant="circular" width={100} height={100} />
          ) : (
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Score circle with gradient border */}
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: `conic-gradient(${scoreColor} ${riskScore * 3.6}deg, ${alpha(theme.palette.divider, 0.3)} 0deg)`,
                  p: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    variant="h3"
                    fontWeight={700}
                    sx={{
                      color: scoreColor,
                      lineHeight: 1,
                      fontFamily: '"JetBrains Mono", monospace',
                    }}
                  >
                    {animatedScore}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    SCORE
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* Score details */}
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Compliance Score
            </Typography>

            {/* Trend indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {trend === 'up' && (
                <Chip
                  icon={<TrendingUpIcon />}
                  label={`+${trendDiff}%`}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main,
                    fontWeight: 600,
                    '& .MuiChip-icon': { color: 'inherit' },
                  }}
                />
              )}
              {trend === 'down' && (
                <Chip
                  icon={<TrendingDownIcon />}
                  label={`${trendDiff}%`}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    color: theme.palette.error.main,
                    fontWeight: 600,
                    '& .MuiChip-icon': { color: 'inherit' },
                  }}
                />
              )}
              {trend === 'stable' && previousRiskScore !== undefined && (
                <Chip
                  icon={<TrendingFlatIcon />}
                  label="No change"
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.text.secondary, 0.1),
                    color: theme.palette.text.secondary,
                    fontWeight: 500,
                    '& .MuiChip-icon': { color: 'inherit' },
                  }}
                />
              )}
            </Box>

            {/* Coverage stat */}
            <Typography variant="body2" color="text.secondary">
              {coverage}% assessed ({assessedCount} of {totalControls} controls)
            </Typography>
          </Box>
        </Box>

        {/* Quick Actions */}
        <Stack direction="row" spacing={1}>
          {onQuickAssess && (
            <Tooltip title="Start Quick Assessment">
              <Button
                variant="contained"
                startIcon={<AssessIcon />}
                onClick={onQuickAssess}
                disabled={isLoading || !selectedProductId}
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                  },
                }}
              >
                Assess
              </Button>
            </Tooltip>
          )}
          {onExport && (
            <Tooltip title="Export Report">
              <IconButton
                onClick={onExport}
                disabled={isLoading || !selectedProductId}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                <ExportIcon />
              </IconButton>
            </Tooltip>
          )}
          {onRefresh && (
            <Tooltip title="Refresh Data">
              <IconButton
                onClick={onRefresh}
                disabled={isLoading}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default HeroZone;

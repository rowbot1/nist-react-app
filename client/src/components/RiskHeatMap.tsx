/**
 * Risk Heat Map Component
 *
 * Interactive heat map visualization showing compliance and risk levels
 * across CSF functions, categories, and systems. Supports drill-down,
 * tooltips, and clickable cells for navigation.
 *
 * Enhanced with Security Operations Dark aesthetic:
 * - Gradient cells with glow effects
 * - Refined CSF function colors
 * - Improved visual hierarchy
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tooltip,
  Paper,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  SelectChangeEvent,
  Skeleton,
  Collapse,
  Alert,
  AlertTitle,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Info as InfoIcon,
  Lightbulb as LightbulbIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { CSF_COLORS } from '../contexts/ThemeContext';
import type { ComplianceStatus, RiskLevel, FunctionCompliance } from '../types/api.types';

// Types for the heat map
export interface HeatMapCell {
  id: string;
  code: string;
  name: string;
  score: number;
  total: number;
  assessed: number;
  implemented: number;
  riskLevel?: RiskLevel;
  statusBreakdown?: Record<ComplianceStatus, number>;
}

export interface HeatMapRow {
  id: string;
  code: string;
  name: string;
  cells: HeatMapCell[];
  averageScore: number;
}

interface RiskHeatMapProps {
  data: FunctionCompliance[] | null;
  isLoading?: boolean;
  title?: string;
  onCellClick?: (functionCode: string, categoryCode: string) => void;
  systems?: { id: string; name: string }[];
  selectedSystemId?: string;
  onSystemChange?: (systemId: string) => void;
  showOnboarding?: boolean;
  onDismissOnboarding?: () => void;
}

// Enhanced color functions with gradients
const getComplianceGradient = (score: number): string => {
  if (score >= 80) return 'linear-gradient(135deg, #3fb950 0%, #238636 100%)';
  if (score >= 60) return 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)';
  if (score >= 40) return 'linear-gradient(135deg, #d29922 0%, #9e6a03 100%)';
  if (score >= 20) return 'linear-gradient(135deg, #f0883e 0%, #d18616 100%)';
  return 'linear-gradient(135deg, #f85149 0%, #da3633 100%)';
};

const getComplianceColor = (score: number): string => {
  if (score >= 80) return '#3fb950';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#d29922';
  if (score >= 20) return '#f0883e';
  return '#f85149';
};

const getRiskColor = (riskLevel: RiskLevel | undefined): string => {
  switch (riskLevel) {
    case 'Critical':
      return '#7f1d1d';
    case 'High':
      return '#f85149';
    case 'Medium':
      return '#f0883e';
    case 'Low':
      return '#3fb950';
    default:
      return '#484f58';
  }
};

// Updated CSF Function colors from ThemeContext
const CSF_FUNCTIONS = [
  { code: 'GV', name: 'Govern', color: CSF_COLORS.GV },
  { code: 'ID', name: 'Identify', color: CSF_COLORS.ID },
  { code: 'PR', name: 'Protect', color: CSF_COLORS.PR },
  { code: 'DE', name: 'Detect', color: CSF_COLORS.DE },
  { code: 'RS', name: 'Respond', color: CSF_COLORS.RS },
  { code: 'RC', name: 'Recover', color: CSF_COLORS.RC },
];

type ViewMode = 'compliance' | 'risk' | 'coverage';

export const RiskHeatMap: React.FC<RiskHeatMapProps> = ({
  data,
  isLoading = false,
  title = 'Risk Heat Map',
  onCellClick,
  systems,
  selectedSystemId,
  onSystemChange,
  showOnboarding = false,
  onDismissOnboarding,
}) => {
  const theme = useTheme();

  const [viewMode, setViewMode] = useState<ViewMode>('compliance');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [legendExpanded, setLegendExpanded] = useState(false);

  // Transform function compliance data into heat map rows
  const heatMapData = useMemo((): HeatMapRow[] => {
    if (!data) return [];

    return data.map((func) => {
      const cells: HeatMapCell[] = func.categories.map((cat) => ({
        id: `${func.functionCode}-${cat.categoryCode}`,
        code: cat.categoryCode,
        name: cat.categoryName,
        score: Math.round(cat.complianceScore),
        total: cat.totalControls,
        assessed: cat.assessedControls,
        implemented: cat.implementedControls,
      }));

      return {
        id: func.functionCode,
        code: func.functionCode,
        name: func.functionName,
        cells,
        averageScore: Math.round(func.complianceScore),
      };
    });
  }, [data]);

  // Sort functions by CSF order
  const sortedData = useMemo(() => {
    const orderMap = new Map(CSF_FUNCTIONS.map((f, i) => [f.code, i]));
    return [...heatMapData].sort((a, b) => {
      const orderA = orderMap.get(a.code) ?? 999;
      const orderB = orderMap.get(b.code) ?? 999;
      return orderA - orderB;
    });
  }, [heatMapData]);

  // Calculate overall metrics
  const overallMetrics = useMemo(() => {
    if (!sortedData.length) return { avgScore: 0, totalControls: 0, assessedControls: 0, implementedControls: 0 };

    const allCells = sortedData.flatMap((row) => row.cells);

    // If we have category-level cells, use them for detailed metrics
    if (allCells.length > 0) {
      const totalControls = allCells.reduce((sum, cell) => sum + cell.total, 0);
      const assessedControls = allCells.reduce((sum, cell) => sum + cell.assessed, 0);
      const implementedControls = allCells.reduce((sum, cell) => sum + cell.implemented, 0);
      const avgScore = totalControls > 0 ? Math.round((implementedControls / totalControls) * 100) : 0;
      return { avgScore, totalControls, assessedControls, implementedControls };
    }

    // Fallback: Calculate from function-level data when categories are empty
    // This happens with scoped/rollup data that only has function summaries
    if (data && data.length > 0) {
      const totalControls = data.reduce((sum, fn) => sum + (fn.totalControls || 0), 0);
      const assessedControls = data.reduce((sum, fn) => sum + (fn.assessedControls || 0), 0);
      const implementedControls = data.reduce((sum, fn) => sum + (fn.implementedControls || 0), 0);
      const avgScore = totalControls > 0 ? Math.round((implementedControls / totalControls) * 100) : 0;
      return { avgScore, totalControls, assessedControls, implementedControls };
    }

    return { avgScore: 0, totalControls: 0, assessedControls: 0, implementedControls: 0 };
  }, [sortedData, data]);

  // Status distribution for legend
  const statusDistribution = useMemo(() => {
    const distribution = {
      high: 0, // 80-100%
      medium: 0, // 40-80%
      low: 0, // 0-40%
    };

    sortedData.forEach((row) => {
      row.cells.forEach((cell) => {
        if (cell.score >= 80) distribution.high++;
        else if (cell.score >= 40) distribution.medium++;
        else distribution.low++;
      });
    });

    return distribution;
  }, [sortedData]);

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode) setViewMode(newMode);
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));

  const handleCellClick = useCallback(
    (functionCode: string, categoryCode: string) => {
      if (onCellClick) {
        onCellClick(functionCode, categoryCode);
      }
    },
    [onCellClick]
  );

  const handleSystemChange = (event: SelectChangeEvent<string>) => {
    if (onSystemChange) {
      onSystemChange(event.target.value);
    }
  };

  const getCellBackground = useCallback(
    (cell: HeatMapCell): string => {
      switch (viewMode) {
        case 'compliance':
          return getComplianceGradient(cell.score);
        case 'risk':
          return getRiskColor(cell.riskLevel);
        case 'coverage':
          const coverage = cell.total > 0 ? (cell.assessed / cell.total) * 100 : 0;
          return getComplianceGradient(coverage);
        default:
          return getComplianceGradient(cell.score);
      }
    },
    [viewMode]
  );

  const getCellColor = useCallback(
    (cell: HeatMapCell): string => {
      switch (viewMode) {
        case 'compliance':
          return getComplianceColor(cell.score);
        case 'risk':
          return getRiskColor(cell.riskLevel);
        case 'coverage':
          const coverage = cell.total > 0 ? (cell.assessed / cell.total) * 100 : 0;
          return getComplianceColor(coverage);
        default:
          return getComplianceColor(cell.score);
      }
    },
    [viewMode]
  );

  const getCellValue = useCallback(
    (cell: HeatMapCell): string => {
      switch (viewMode) {
        case 'compliance':
          return `${cell.score}%`;
        case 'risk':
          return cell.riskLevel || 'N/A';
        case 'coverage':
          const coverage = cell.total > 0 ? Math.round((cell.assessed / cell.total) * 100) : 0;
          return `${coverage}%`;
        default:
          return `${cell.score}%`;
      }
    },
    [viewMode]
  );

  const getFunctionColor = (code: string): string => {
    return CSF_FUNCTIONS.find((f) => f.code === code)?.color || '#6b7280';
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="40%" height={40} />
          <Box sx={{ mt: 2 }}>
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <Box key={row} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Skeleton variant="rectangular" width={100} height={70} sx={{ borderRadius: 2 }} />
                {[1, 2, 3, 4, 5].map((cell) => (
                  <Skeleton key={cell} variant="rectangular" width={80} height={70} sx={{ borderRadius: 2 }} />
                ))}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        overflow: 'visible',
      }}
    >
      <CardContent>
        {/* Onboarding Banner */}
        {showOnboarding && (
          <Collapse in={showOnboarding}>
            <Alert
              severity="info"
              icon={<LightbulbIcon />}
              action={
                onDismissOnboarding && (
                  <Button color="inherit" size="small" onClick={onDismissOnboarding}>
                    Got it
                  </Button>
                )
              }
              sx={{
                mb: 3,
                bgcolor: alpha(theme.palette.info.main, 0.1),
                border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
              }}
            >
              <AlertTitle>Getting Started with the Heat Map</AlertTitle>
              Click any cell to quickly assess a control. Green = Implemented, Yellow = Partial, Red = Not Implemented.
              Start with the red cells to address critical gaps!
            </Alert>
          </Collapse>
        )}

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
            <Chip
              label={`${overallMetrics.avgScore}%`}
              sx={{
                bgcolor: alpha(getComplianceColor(overallMetrics.avgScore), 0.15),
                color: getComplianceColor(overallMetrics.avgScore),
                fontWeight: 700,
                fontFamily: '"JetBrains Mono", monospace',
              }}
              size="small"
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* System Filter */}
            {systems && systems.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>System</InputLabel>
                <Select
                  value={selectedSystemId || 'all'}
                  label="System"
                  onChange={handleSystemChange}
                >
                  <MenuItem value="all">All Systems</MenuItem>
                  {systems.map((system) => (
                    <MenuItem key={system.id} value={system.id}>
                      {system.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* View Mode Toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton value="compliance">
                <Tooltip title="Compliance Score">
                  <span>Score</span>
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="coverage">
                <Tooltip title="Assessment Coverage">
                  <span>Coverage</span>
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Zoom Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton size="small" onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
                <ZoomOutIcon fontSize="small" />
              </IconButton>
              <Typography
                variant="caption"
                sx={{
                  minWidth: 40,
                  textAlign: 'center',
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {Math.round(zoomLevel * 100)}%
              </Typography>
              <IconButton size="small" onClick={handleZoomIn} disabled={zoomLevel >= 2}>
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Collapsible Legend */}
        <Box sx={{ mb: 2 }}>
          <Button
            size="small"
            onClick={() => setLegendExpanded(!legendExpanded)}
            endIcon={legendExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            {legendExpanded ? 'Hide Legend' : 'Show Legend'} ({statusDistribution.high} green, {statusDistribution.medium} yellow, {statusDistribution.low} red)
          </Button>
          <Collapse in={legendExpanded}>
            <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {viewMode === 'compliance' ? 'Compliance:' : 'Coverage:'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {[
                    { label: '0-20%', gradient: 'linear-gradient(135deg, #f85149 0%, #da3633 100%)' },
                    { label: '20-40%', gradient: 'linear-gradient(135deg, #f0883e 0%, #d18616 100%)' },
                    { label: '40-60%', gradient: 'linear-gradient(135deg, #d29922 0%, #9e6a03 100%)' },
                    { label: '60-80%', gradient: 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)' },
                    { label: '80-100%', gradient: 'linear-gradient(135deg, #3fb950 0%, #238636 100%)' },
                  ].map((item) => (
                    <Tooltip key={item.label} title={item.label}>
                      <Box
                        sx={{
                          width: 24,
                          height: 18,
                          background: item.gradient,
                          borderRadius: 1,
                          boxShadow: `0 2px 4px ${alpha('#000', 0.2)}`,
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Box>

              {/* CSF Function Legend */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Functions:
                </Typography>
                {CSF_FUNCTIONS.map((func) => (
                  <Tooltip key={func.code} title={func.name}>
                    <Chip
                      label={func.code}
                      size="small"
                      sx={{
                        bgcolor: func.color,
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        height: 22,
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>
          </Collapse>
        </Box>

        {/* Heat Map Grid */}
        <Box
          sx={{
            overflowX: 'auto',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease',
          }}
        >
          <Box sx={{ minWidth: 600 }}>
            {sortedData.map((row, rowIndex) => (
              <Box
                key={row.id}
                className="animate-fade-in-up"
                sx={{
                  display: 'flex',
                  gap: 0.75,
                  mb: 0.75,
                  animationDelay: `${rowIndex * 50}ms`,
                }}
              >
                {/* Function Label */}
                <Paper
                  sx={{
                    width: 130,
                    minWidth: 130,
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${alpha(getFunctionColor(row.code), 0.15)} 0%, ${alpha(getFunctionColor(row.code), 0.05)} 100%)`,
                    borderLeft: `4px solid ${getFunctionColor(row.code)}`,
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: `linear-gradient(135deg, ${alpha(getFunctionColor(row.code), 0.2)} 0%, ${alpha(getFunctionColor(row.code), 0.1)} 100%)`,
                    },
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold" color={getFunctionColor(row.code)}>
                    {row.code}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {row.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      color: getComplianceColor(row.averageScore),
                    }}
                  >
                    {row.averageScore}%
                  </Typography>
                </Paper>

                {/* Category Cells */}
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {row.cells.map((cell, cellIndex) => {
                    const cellBackground = getCellBackground(cell);
                    const cellColor = getCellColor(cell);
                    const isHovered = hoveredCell === cell.id;

                    return (
                      <Tooltip
                        key={cell.id}
                        title={
                          <Box sx={{ p: 0.5 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {cell.code}: {cell.name}
                            </Typography>
                            <Typography variant="body2">
                              Compliance: {cell.score}%
                            </Typography>
                            <Typography variant="body2">
                              Controls: {cell.implemented}/{cell.total} implemented
                            </Typography>
                            <Typography variant="body2">
                              Assessed: {cell.assessed}/{cell.total}
                            </Typography>
                            {onCellClick && (
                              <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.8 }}>
                                Click to assess
                              </Typography>
                            )}
                          </Box>
                        }
                        arrow
                        placement="top"
                      >
                        <Paper
                          onClick={() => handleCellClick(row.code, cell.code)}
                          onMouseEnter={() => setHoveredCell(cell.id)}
                          onMouseLeave={() => setHoveredCell(null)}
                          sx={{
                            width: 85,
                            height: 70,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: cellBackground,
                            color: '#ffffff',
                            cursor: onCellClick ? 'pointer' : 'default',
                            borderRadius: 2,
                            transition: 'all 0.2s ease',
                            transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                            boxShadow: isHovered
                              ? `0 8px 24px ${alpha(cellColor, 0.4)}`
                              : `0 2px 8px ${alpha(cellColor, 0.2)}`,
                            border: `1px solid ${alpha(cellColor, isHovered ? 0.6 : 0.3)}`,
                            animationDelay: `${(rowIndex * 6 + cellIndex) * 20}ms`,
                            '&:hover': {
                              boxShadow: `0 8px 24px ${alpha(cellColor, 0.4)}`,
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight="bold"
                            sx={{ opacity: 0.9, fontSize: '0.7rem' }}
                          >
                            {cell.code}
                          </Typography>
                          <Typography
                            variant="body1"
                            fontWeight="bold"
                            sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                          >
                            {getCellValue(cell)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ opacity: 0.8, fontSize: '0.65rem' }}
                          >
                            {cell.assessed}/{cell.total}
                          </Typography>
                        </Paper>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Summary Footer */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 3,
            pt: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                Total Controls
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                sx={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {overallMetrics.totalControls}
              </Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                Assessed
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                sx={{ fontFamily: '"JetBrains Mono", monospace', color: theme.palette.info.main }}
              >
                {overallMetrics.assessedControls}
              </Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                Implemented
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                sx={{ fontFamily: '"JetBrains Mono", monospace', color: theme.palette.success.main }}
              >
                {overallMetrics.implementedControls}
              </Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                Coverage
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  color: getComplianceColor(
                    overallMetrics.totalControls > 0
                      ? Math.round((overallMetrics.assessedControls / overallMetrics.totalControls) * 100)
                      : 0
                  ),
                }}
              >
                {overallMetrics.totalControls > 0
                  ? Math.round((overallMetrics.assessedControls / overallMetrics.totalControls) * 100)
                  : 0}
                %
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Click on a cell to view detailed assessments
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RiskHeatMap;

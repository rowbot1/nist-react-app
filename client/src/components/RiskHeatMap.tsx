/**
 * Risk Heat Map Component
 *
 * Interactive heat map visualization showing compliance and risk levels
 * across CSF functions, categories, and systems. Supports drill-down,
 * tooltips, and clickable cells for navigation.
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
  useTheme,
  alpha,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
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
}

// Color scales for different metrics
const getComplianceColor = (score: number, isDark: boolean): string => {
  const alpha = isDark ? 0.85 : 1;
  if (score >= 80) return `rgba(34, 197, 94, ${alpha})`; // green-500
  if (score >= 60) return `rgba(132, 204, 22, ${alpha})`; // lime-500
  if (score >= 40) return `rgba(250, 204, 21, ${alpha})`; // yellow-400
  if (score >= 20) return `rgba(249, 115, 22, ${alpha})`; // orange-500
  return `rgba(239, 68, 68, ${alpha})`; // red-500
};

const getRiskColor = (riskLevel: RiskLevel | undefined, isDark: boolean): string => {
  const alpha = isDark ? 0.85 : 1;
  switch (riskLevel) {
    case 'Critical':
      return `rgba(127, 29, 29, ${alpha})`; // red-900
    case 'High':
      return `rgba(239, 68, 68, ${alpha})`; // red-500
    case 'Medium':
      return `rgba(249, 115, 22, ${alpha})`; // orange-500
    case 'Low':
      return `rgba(34, 197, 94, ${alpha})`; // green-500
    default:
      return `rgba(156, 163, 175, ${alpha})`; // gray-400
  }
};

const getTextColor = (backgroundColor: string): string => {
  // Simple luminance check for contrast
  const rgb = backgroundColor.match(/\d+/g);
  if (!rgb || rgb.length < 3) return '#000';
  const luminance = (0.299 * parseInt(rgb[0]) + 0.587 * parseInt(rgb[1]) + 0.114 * parseInt(rgb[2])) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
};

// CSF Function order and colors
const CSF_FUNCTIONS = [
  { code: 'GV', name: 'Govern', color: '#6366f1' },
  { code: 'ID', name: 'Identify', color: '#3b82f6' },
  { code: 'PR', name: 'Protect', color: '#22c55e' },
  { code: 'DE', name: 'Detect', color: '#f59e0b' },
  { code: 'RS', name: 'Respond', color: '#ef4444' },
  { code: 'RC', name: 'Recover', color: '#8b5cf6' },
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
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [viewMode, setViewMode] = useState<ViewMode>('compliance');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

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
    if (!sortedData.length) return { avgScore: 0, totalControls: 0, assessedControls: 0 };

    const allCells = sortedData.flatMap((row) => row.cells);
    const totalControls = allCells.reduce((sum, cell) => sum + cell.total, 0);
    const assessedControls = allCells.reduce((sum, cell) => sum + cell.assessed, 0);
    const implementedControls = allCells.reduce((sum, cell) => sum + cell.implemented, 0);
    const avgScore = totalControls > 0 ? Math.round((implementedControls / totalControls) * 100) : 0;

    return { avgScore, totalControls, assessedControls };
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

  const getCellColor = useCallback(
    (cell: HeatMapCell): string => {
      switch (viewMode) {
        case 'compliance':
          return getComplianceColor(cell.score, isDark);
        case 'risk':
          return getRiskColor(cell.riskLevel, isDark);
        case 'coverage':
          const coverage = cell.total > 0 ? (cell.assessed / cell.total) * 100 : 0;
          return getComplianceColor(coverage, isDark);
        default:
          return getComplianceColor(cell.score, isDark);
      }
    },
    [viewMode, isDark]
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
                <Skeleton variant="rectangular" width={100} height={60} />
                {[1, 2, 3, 4, 5].map((cell) => (
                  <Skeleton key={cell} variant="rectangular" width={80} height={60} />
                ))}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
            <Chip
              label={`Overall: ${overallMetrics.avgScore}%`}
              color={overallMetrics.avgScore >= 80 ? 'success' : overallMetrics.avgScore >= 50 ? 'warning' : 'error'}
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
              <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
                {Math.round(zoomLevel * 100)}%
              </Typography>
              <IconButton size="small" onClick={handleZoomIn} disabled={zoomLevel >= 2}>
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Legend */}
        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {viewMode === 'compliance' ? 'Compliance:' : 'Coverage:'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {[
                { label: '0-20%', color: 'rgba(239, 68, 68, 1)' },
                { label: '20-40%', color: 'rgba(249, 115, 22, 1)' },
                { label: '40-60%', color: 'rgba(250, 204, 21, 1)' },
                { label: '60-80%', color: 'rgba(132, 204, 22, 1)' },
                { label: '80-100%', color: 'rgba(34, 197, 94, 1)' },
              ].map((item) => (
                <Tooltip key={item.label} title={item.label}>
                  <Box
                    sx={{
                      width: 20,
                      height: 16,
                      bgcolor: item.color,
                      borderRadius: 0.5,
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
                    height: 20,
                  }}
                />
              </Tooltip>
            ))}
          </Box>
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
            {sortedData.map((row) => (
              <Box
                key={row.id}
                sx={{
                  display: 'flex',
                  gap: 0.5,
                  mb: 0.5,
                }}
              >
                {/* Function Label */}
                <Paper
                  sx={{
                    width: 120,
                    minWidth: 120,
                    p: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    bgcolor: alpha(getFunctionColor(row.code), 0.15),
                    borderLeft: `4px solid ${getFunctionColor(row.code)}`,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    {row.code}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {row.name}
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {row.averageScore}%
                  </Typography>
                </Paper>

                {/* Category Cells */}
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {row.cells.map((cell) => {
                    const bgColor = getCellColor(cell);
                    const textColor = getTextColor(bgColor);
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
                            width: 80,
                            height: 60,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: bgColor,
                            color: textColor,
                            cursor: onCellClick ? 'pointer' : 'default',
                            transition: 'all 0.2s ease',
                            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                            boxShadow: isHovered ? 4 : 1,
                            border: isHovered ? `2px solid ${theme.palette.primary.main}` : 'none',
                            '&:hover': {
                              boxShadow: 4,
                            },
                          }}
                        >
                          <Typography variant="caption" fontWeight="bold">
                            {cell.code}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {getCellValue(cell)}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.8 }}>
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
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Controls
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {overallMetrics.totalControls}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Assessed
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {overallMetrics.assessedControls}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Coverage
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {overallMetrics.totalControls > 0
                  ? Math.round((overallMetrics.assessedControls / overallMetrics.totalControls) * 100)
                  : 0}
                %
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" color="action" />
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

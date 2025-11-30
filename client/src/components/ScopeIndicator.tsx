/**
 * ScopeIndicator Component
 *
 * Displays the current organizational scope with breadcrumb navigation.
 * Shows the hierarchical path: All Organizations → CC → Framework → Product → System
 * Allows users to navigate up the hierarchy by clicking on breadcrumb items.
 */

import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Skeleton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  Business as CCIcon,
  AccountTree as FrameworkIcon,
  Category as ProductIcon,
  Computer as SystemIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import type { ScopeType, OrganizationalScope, SCOPE_LABELS } from '../types/scope.types';

/**
 * Scope icons mapping
 */
const SCOPE_ICONS: Record<ScopeType, React.ReactElement> = {
  cc: <CCIcon fontSize="small" />,
  framework: <FrameworkIcon fontSize="small" />,
  product: <ProductIcon fontSize="small" />,
  system: <SystemIcon fontSize="small" />,
};

/**
 * Scope hierarchy order (top to bottom)
 */
const SCOPE_HIERARCHY: ScopeType[] = ['cc', 'framework', 'product', 'system'];

/**
 * Scope labels for display
 */
const SCOPE_DISPLAY_LABELS: Record<ScopeType, string> = {
  cc: 'Capability Centre',
  framework: 'Framework',
  product: 'Product',
  system: 'System',
};

interface ScopeIndicatorProps {
  /** Current scope object (optional - will read from URL if not provided) */
  scope?: OrganizationalScope;
  /** Callback when scope changes */
  onScopeChange?: (scope: OrganizationalScope) => void;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Whether to show clear button */
  showClear?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Builds an OrganizationalScope from URL search params
 */
function buildScopeFromUrl(searchParams: URLSearchParams): OrganizationalScope {
  const scopeType = searchParams.get('scope') as ScopeType | null;
  const scopeId = searchParams.get('id');
  const scopeLabel = searchParams.get('label');

  if (scopeType && scopeId) {
    return { type: scopeType, id: scopeId, label: scopeLabel };
  }

  return { type: null, id: null, label: null };
}

/**
 * Builds URL search params from an OrganizationalScope
 */
function buildUrlFromScope(scope: OrganizationalScope): URLSearchParams {
  const params = new URLSearchParams();

  if (scope.type && scope.id) {
    params.set('scope', scope.type);
    params.set('id', scope.id);
    if (scope.label) {
      params.set('label', scope.label);
    }
  }

  return params;
}

/**
 * ScopeIndicator Component
 */
export const ScopeIndicator: React.FC<ScopeIndicatorProps> = ({
  scope: propScope,
  onScopeChange,
  isLoading = false,
  compact = false,
  showClear = true,
  className,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Use prop scope or derive from URL
  const scope = propScope || buildScopeFromUrl(searchParams);
  const isGlobalScope = !scope.type || !scope.id;

  /**
   * Navigate to a specific scope level
   */
  const handleScopeClick = (newScope: OrganizationalScope) => {
    if (onScopeChange) {
      onScopeChange(newScope);
    } else {
      // Update URL params
      const newParams = buildUrlFromScope(newScope);
      setSearchParams(newParams);
    }
  };

  /**
   * Clear scope (go to global view)
   */
  const handleClearScope = () => {
    const globalScope: OrganizationalScope = { type: null, id: null, label: null };
    if (onScopeChange) {
      onScopeChange(globalScope);
    } else {
      setSearchParams(new URLSearchParams());
    }
  };

  /**
   * Get display name for the current scope
   */
  const getScopeDisplayName = (): string => {
    if (isGlobalScope) {
      return 'All Organizations';
    }

    if (scope.label) {
      return scope.label;
    }

    // Fallback to scope type label
    return scope.type ? SCOPE_DISPLAY_LABELS[scope.type] : 'Unknown';
  };

  /**
   * Get scope level depth (0 = global, 1 = cc, 2 = framework, etc.)
   */
  const getScopeDepth = (): number => {
    if (!scope.type) return 0;
    return SCOPE_HIERARCHY.indexOf(scope.type) + 1;
  };

  // Loading state
  if (isLoading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: compact ? 1 : 1.5,
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          borderRadius: 2,
        }}
        className={className}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={120} />
          <Skeleton variant="text" width={80} />
        </Box>
      </Paper>
    );
  }

  // Compact mode - just show current scope as a chip
  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} className={className}>
        <Chip
          icon={isGlobalScope ? <HomeIcon /> : (scope.type ? SCOPE_ICONS[scope.type] : <FilterIcon />)}
          label={getScopeDisplayName()}
          size="small"
          variant={isGlobalScope ? 'outlined' : 'filled'}
          color={isGlobalScope ? 'default' : 'primary'}
          onDelete={!isGlobalScope && showClear ? handleClearScope : undefined}
          deleteIcon={<CloseIcon fontSize="small" />}
          sx={{
            fontWeight: 500,
            '& .MuiChip-deleteIcon': {
              color: 'inherit',
              opacity: 0.7,
              '&:hover': { opacity: 1 },
            },
          }}
        />
      </Box>
    );
  }

  // Full breadcrumb mode
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        bgcolor: alpha(theme.palette.primary.main, 0.04),
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      }}
      className={className}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon
            fontSize="small"
            sx={{ color: 'primary.main', opacity: 0.7 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            Viewing:
          </Typography>

          <MuiBreadcrumbs
            separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
            aria-label="scope breadcrumb"
            sx={{ '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' } }}
          >
            {/* Global/Home */}
            <Link
              component="button"
              underline="hover"
              onClick={() => handleScopeClick({ type: null, id: null, label: null })}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: isGlobalScope ? 'text.primary' : 'text.secondary',
                fontWeight: isGlobalScope ? 600 : 400,
                fontSize: '0.875rem',
                cursor: 'pointer',
                '&:hover': { color: 'primary.main' },
              }}
            >
              <HomeIcon fontSize="small" />
              All
            </Link>

            {/* Current scope (if not global) */}
            {!isGlobalScope && scope.type && (
              <Typography
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                {SCOPE_ICONS[scope.type]}
                {getScopeDisplayName()}
              </Typography>
            )}
          </MuiBreadcrumbs>
        </Box>

        {/* Clear button */}
        {!isGlobalScope && showClear && (
          <Tooltip title="Clear filter (view all)">
            <IconButton
              size="small"
              onClick={handleClearScope}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.1) },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Scope depth indicator */}
      {!isGlobalScope && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          {SCOPE_HIERARCHY.map((level, index) => {
            const isActive = index < getScopeDepth();
            const isCurrent = scope.type === level;

            return (
              <React.Fragment key={level}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: isActive
                      ? (isCurrent ? 'primary.main' : alpha(theme.palette.primary.main, 0.5))
                      : alpha(theme.palette.text.disabled, 0.2),
                    transition: 'all 0.2s ease',
                  }}
                />
                {index < SCOPE_HIERARCHY.length - 1 && (
                  <Box
                    sx={{
                      width: 16,
                      height: 2,
                      bgcolor: index < getScopeDepth() - 1
                        ? alpha(theme.palette.primary.main, 0.5)
                        : alpha(theme.palette.text.disabled, 0.2),
                      transition: 'all 0.2s ease',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {SCOPE_DISPLAY_LABELS[scope.type!]} level
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default ScopeIndicator;

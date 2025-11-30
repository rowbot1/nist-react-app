/**
 * OrganizationalHierarchy Component
 *
 * Displays the organizational hierarchy with compliance roll-up:
 * Capability Centre > Framework > Product > System
 *
 * Features:
 * - Collapsible tree structure
 * - Compliance scores at each level
 * - Color-coded status indicators
 * - Click-through navigation
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Collapse,
  LinearProgress,
  Chip,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ChevronRight as CollapseIcon,
  Business as CapabilityCentreIcon,
  Folder as FrameworkIcon,
  Inventory as ProductIcon,
  Computer as SystemIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useOrganizationalHierarchy } from '../hooks';
import {
  HierarchyCapabilityCentre,
  HierarchyFramework,
  HierarchyProduct,
  HierarchySystem,
} from '../types/api.types';

interface HierarchyNodeProps {
  level: number;
  expanded: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  name: string;
  code?: string;
  color?: string;
  complianceScore: number;
  count?: number;
  countLabel?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

const getComplianceColor = (score: number): string => {
  if (score >= 80) return '#3fb950';
  if (score >= 60) return '#58a6ff';
  if (score >= 40) return '#d29922';
  return '#f85149';
};

const HierarchyNode: React.FC<HierarchyNodeProps> = ({
  level,
  expanded,
  onToggle,
  icon,
  name,
  code,
  color,
  complianceScore,
  count,
  countLabel,
  onClick,
  children,
}) => {
  const theme = useTheme();
  const scoreColor = getComplianceColor(complianceScore);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 1,
          px: 1,
          pl: level * 3 + 1,
          borderRadius: 1,
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          },
        }}
        onClick={onClick || onToggle}
      >
        {/* Expand/Collapse button */}
        {children ? (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            sx={{ mr: 0.5 }}
          >
            {expanded ? <ExpandIcon fontSize="small" /> : <CollapseIcon fontSize="small" />}
          </IconButton>
        ) : (
          <Box sx={{ width: 32 }} />
        )}

        {/* Icon with color accent */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: alpha(color || theme.palette.primary.main, 0.1),
            color: color || theme.palette.primary.main,
            mr: 1.5,
          }}
        >
          {icon}
        </Box>

        {/* Name and code */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={600}
            noWrap
            sx={{ color: theme.palette.text.primary }}
          >
            {name}
            {code && (
              <Typography
                component="span"
                variant="caption"
                sx={{
                  ml: 1,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 0.5,
                  bgcolor: alpha(theme.palette.text.primary, 0.08),
                  color: 'text.secondary',
                }}
              >
                {code}
              </Typography>
            )}
          </Typography>
        </Box>

        {/* Count badge */}
        {count !== undefined && count > 0 && (
          <Chip
            size="small"
            label={`${count} ${countLabel || ''}`}
            sx={{
              height: 22,
              mr: 1.5,
              bgcolor: alpha(theme.palette.text.primary, 0.06),
              fontSize: '0.7rem',
            }}
          />
        )}

        {/* Compliance score */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
          <LinearProgress
            variant="determinate"
            value={complianceScore}
            sx={{
              width: 60,
              height: 6,
              borderRadius: 3,
              bgcolor: alpha(scoreColor, 0.15),
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                bgcolor: scoreColor,
              },
            }}
          />
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{
              minWidth: 36,
              textAlign: 'right',
              color: scoreColor,
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            {complianceScore}%
          </Typography>
        </Box>
      </Box>

      {/* Children */}
      {children && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {children}
        </Collapse>
      )}
    </Box>
  );
};

interface SystemNodeProps {
  system: HierarchySystem;
  level: number;
}

const SystemNode: React.FC<SystemNodeProps> = ({ system, level }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <HierarchyNode
      level={level}
      expanded={false}
      onToggle={() => {}}
      icon={<SystemIcon fontSize="small" />}
      name={system.name}
      complianceScore={system.complianceScore}
      count={system.assessmentCount}
      countLabel="controls"
      onClick={() => navigate(`/systems/${system.id}`)}
    />
  );
};

interface ProductNodeProps {
  product: HierarchyProduct;
  level: number;
}

const ProductNode: React.FC<ProductNodeProps> = ({ product, level }) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <HierarchyNode
      level={level}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
      icon={<ProductIcon fontSize="small" />}
      name={product.name}
      complianceScore={product.complianceScore}
      count={product.systemCount}
      countLabel="systems"
      onClick={() => navigate(`/products/${product.id}`)}
    >
      {product.systems.map((system) => (
        <SystemNode key={system.id} system={system} level={level + 1} />
      ))}
    </HierarchyNode>
  );
};

interface FrameworkNodeProps {
  framework: HierarchyFramework;
  level: number;
}

const FrameworkNode: React.FC<FrameworkNodeProps> = ({ framework, level }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <HierarchyNode
      level={level}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
      icon={<FrameworkIcon fontSize="small" />}
      name={framework.name}
      code={framework.code || undefined}
      color={framework.color || undefined}
      complianceScore={framework.complianceScore}
      count={framework.productCount}
      countLabel="products"
    >
      {framework.products.map((product) => (
        <ProductNode key={product.id} product={product} level={level + 1} />
      ))}
    </HierarchyNode>
  );
};

interface CapabilityCentreNodeProps {
  capabilityCentre: HierarchyCapabilityCentre;
  defaultExpanded?: boolean;
}

const CapabilityCentreNode: React.FC<CapabilityCentreNodeProps> = ({
  capabilityCentre,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <HierarchyNode
      level={0}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
      icon={<CapabilityCentreIcon fontSize="small" />}
      name={capabilityCentre.name}
      code={capabilityCentre.code || undefined}
      color={capabilityCentre.color || undefined}
      complianceScore={capabilityCentre.complianceScore}
      count={capabilityCentre.frameworkCount}
      countLabel="frameworks"
    >
      {capabilityCentre.frameworks.map((framework) => (
        <FrameworkNode key={framework.id} framework={framework} level={1} />
      ))}
    </HierarchyNode>
  );
};

const OrganizationalHierarchy: React.FC = () => {
  const theme = useTheme();
  const { data: hierarchy, isLoading, error } = useOrganizationalHierarchy();

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Organizational Hierarchy
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">Failed to load organizational hierarchy</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!hierarchy || hierarchy.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Organizational Hierarchy
          </Typography>
          <Typography color="text.secondary">
            No capability centres found. Create one to get started.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          Organizational Hierarchy
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Compliance scores roll up from systems to capability centres
        </Typography>
        <Box
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          {hierarchy.map((cc, index) => (
            <Box
              key={cc.id}
              sx={{
                borderBottom: index < hierarchy.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
              }}
            >
              <CapabilityCentreNode capabilityCentre={cc} defaultExpanded={index === 0} />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default OrganizationalHierarchy;

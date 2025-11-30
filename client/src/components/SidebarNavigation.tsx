/**
 * SidebarNavigation Component
 *
 * Nested expandable navigation for organizational hierarchy:
 * Capability Centres > Frameworks > Products > Systems
 */

import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Tooltip,
  Box,
  CircularProgress,
  Typography,
  IconButton,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Summarize as ReportsIcon,
  AccountTree as HierarchyIcon,
  Business as CentreIcon,
  Folder as FrameworkIcon,
  Inventory as ProductIcon,
  Computer as SystemIcon,
  PlayArrow as AssessIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOrganizationalHierarchy } from '../hooks/useCapabilityCentres';

interface SidebarNavigationProps {
  collapsed: boolean;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: hierarchy, isLoading } = useOrganizationalHierarchy();

  // Extract productId and systemId from assessment workspace route
  const assessmentMatch = location.pathname.match(/\/assess\/([^/]+)\/([^/]+)/);
  const currentProductId = assessmentMatch?.[1];
  const currentSystemId = assessmentMatch?.[2];

  // Track expanded states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved ? JSON.parse(saved) : { hierarchy: true };
  });

  // Auto-expand hierarchy to current context when on assessment workspace
  useEffect(() => {
    if (!hierarchy || !currentSystemId) return;

    // Find the system in the hierarchy and expand all parents
    for (const centre of hierarchy) {
      for (const framework of centre.frameworks) {
        for (const product of framework.products) {
          const system = product.systems.find(s => s.id === currentSystemId);
          if (system) {
            // Found the system - expand all parents
            setExpandedSections(prev => ({
              ...prev,
              hierarchy: true,
              [`centre-${centre.id}`]: true,
              [`framework-${framework.id}`]: true,
              [`product-${product.id}`]: true,
            }));
            return;
          }
        }
      }
    }
  }, [hierarchy, currentSystemId]);

  // Persist expanded state
  useEffect(() => {
    localStorage.setItem('sidebarExpanded', JSON.stringify(expandedSections));
  }, [expandedSections]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Top-level menu items (dashboards)
  const dashboardItems = [
    { text: 'Organization', icon: <HierarchyIcon />, path: '/org' },
  ];

  // Bottom menu items
  const bottomItems = [
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Reports', icon: <ReportsIcon />, path: '/reports' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const listItemStyles = {
    minHeight: 44,
    justifyContent: collapsed ? 'center' : 'initial',
    px: collapsed ? 2 : 2.5,
    '&.Mui-selected': {
      backgroundColor: 'primary.main',
      color: 'white',
      '&:hover': {
        backgroundColor: 'primary.dark',
      },
      '& .MuiListItemIcon-root': {
        color: 'white',
      },
    },
  };

  const iconStyles = {
    minWidth: 0,
    mr: collapsed ? 0 : 2,
    justifyContent: 'center',
  };

  const renderMenuItem = (item: { text: string; icon: React.ReactNode; path: string }) => (
    <ListItem key={item.text} disablePadding>
      <Tooltip title={collapsed ? item.text : ''} placement="right" arrow>
        <ListItemButton
          selected={isActive(item.path)}
          onClick={() => navigate(item.path)}
          sx={listItemStyles}
        >
          <ListItemIcon sx={iconStyles}>{item.icon}</ListItemIcon>
          {!collapsed && <ListItemText primary={item.text} />}
        </ListItemButton>
      </Tooltip>
    </ListItem>
  );

  const renderHierarchySection = () => {
    if (collapsed) {
      // When collapsed, just show the hierarchy icon that navigates to org hub
      return (
        <ListItem disablePadding>
          <Tooltip title="Capability Centres" placement="right" arrow>
            <ListItemButton
              selected={isActive('/org') || isActive('/products') || isActive('/frameworks')}
              onClick={() => navigate('/org')}
              sx={listItemStyles}
            >
              <ListItemIcon sx={iconStyles}><CentreIcon /></ListItemIcon>
            </ListItemButton>
          </Tooltip>
        </ListItem>
      );
    }

    return (
      <>
        {/* Hierarchy Header */}
        <ListItem disablePadding>
          <ListItemButton onClick={() => toggleSection('hierarchy')} sx={{ ...listItemStyles, py: 1 }}>
            <ListItemIcon sx={iconStyles}><HierarchyIcon /></ListItemIcon>
            <ListItemText
              primary="Capability Centres"
              primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
            />
            {expandedSections['hierarchy'] ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse in={expandedSections['hierarchy']} timeout="auto" unmountOnExit>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : hierarchy && hierarchy.length > 0 ? (
            <List component="div" disablePadding>
              {hierarchy.map((centre) => (
                <React.Fragment key={centre.id}>
                  {/* Capability Centre */}
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={location.search.includes(`scope=cc`) && location.search.includes(`id=${centre.id}`)}
                      onClick={() => navigate(`/org?scope=cc&id=${centre.id}`)}
                      sx={{ ...listItemStyles, pl: 4 }}
                    >
                      <ListItemIcon sx={{ ...iconStyles, color: centre.color || 'inherit' }}>
                        <CentreIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={centre.name}
                        primaryTypographyProps={{ fontSize: '0.8125rem' }}
                      />
                      {centre.frameworks.length > 0 && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSection(`centre-${centre.id}`);
                          }}
                          sx={{ p: 0.5 }}
                        >
                          {expandedSections[`centre-${centre.id}`] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                        </IconButton>
                      )}
                    </ListItemButton>
                  </ListItem>

                  {/* Frameworks under Centre */}
                  <Collapse in={expandedSections[`centre-${centre.id}`]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {centre.frameworks.map((framework) => (
                        <React.Fragment key={framework.id}>
                          <ListItem disablePadding>
                            <ListItemButton
                              selected={location.search.includes(`scope=framework`) && location.search.includes(`id=${framework.id}`)}
                              onClick={() => navigate(`/org?scope=framework&id=${framework.id}`)}
                              sx={{ ...listItemStyles, pl: 6 }}
                            >
                              <ListItemIcon sx={{ ...iconStyles, color: framework.color || 'inherit' }}>
                                <FrameworkIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={framework.name}
                                primaryTypographyProps={{ fontSize: '0.75rem' }}
                              />
                              {framework.products.length > 0 && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSection(`framework-${framework.id}`);
                                  }}
                                  sx={{ p: 0.5 }}
                                >
                                  {expandedSections[`framework-${framework.id}`] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                </IconButton>
                              )}
                            </ListItemButton>
                          </ListItem>

                          {/* Products under Framework */}
                          <Collapse in={expandedSections[`framework-${framework.id}`]} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding>
                              {framework.products.map((product) => (
                                <React.Fragment key={product.id}>
                                  <ListItem disablePadding>
                                    <ListItemButton
                                      selected={location.search.includes(`scope=product`) && location.search.includes(`id=${product.id}`)}
                                      onClick={() => navigate(`/org?scope=product&id=${product.id}`)}
                                      sx={{ ...listItemStyles, pl: 8 }}
                                    >
                                      <ListItemIcon sx={iconStyles}>
                                        <ProductIcon fontSize="small" />
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={product.name}
                                        primaryTypographyProps={{ fontSize: '0.75rem' }}
                                      />
                                      {product.systems.length > 0 && (
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSection(`product-${product.id}`);
                                          }}
                                          sx={{ p: 0.5 }}
                                        >
                                          {expandedSections[`product-${product.id}`] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                        </IconButton>
                                      )}
                                    </ListItemButton>
                                  </ListItem>

                                  {/* Systems under Product */}
                                  <Collapse in={expandedSections[`product-${product.id}`]} timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding>
                                      {product.systems.map((system) => {
                                        const isSystemActive = isActive(`/systems/${system.id}`) || currentSystemId === system.id;
                                        const isAssessing = currentSystemId === system.id;
                                        return (
                                          <ListItem key={system.id} disablePadding>
                                            <ListItemButton
                                              selected={isSystemActive}
                                              onClick={() => {
                                                // If currently in assessment mode, navigate to that system's assessment
                                                if (currentProductId) {
                                                  navigate(`/assess/${product.id}/${system.id}`);
                                                } else {
                                                  navigate(`/systems/${system.id}`);
                                                }
                                              }}
                                              sx={{ ...listItemStyles, pl: 10 }}
                                            >
                                              <ListItemIcon sx={iconStyles}>
                                                {isAssessing ? (
                                                  <AssessIcon fontSize="small" color="primary" />
                                                ) : (
                                                  <SystemIcon fontSize="small" />
                                                )}
                                              </ListItemIcon>
                                              <ListItemText
                                                primary={system.name}
                                                primaryTypographyProps={{
                                                  fontSize: '0.6875rem',
                                                  fontWeight: isAssessing ? 600 : 400,
                                                }}
                                              />
                                              {isAssessing && (
                                                <Typography variant="caption" color="primary" sx={{ fontSize: '0.5rem' }}>
                                                  Assessing
                                                </Typography>
                                              )}
                                            </ListItemButton>
                                          </ListItem>
                                        );
                                      })}
                                    </List>
                                  </Collapse>
                                </React.Fragment>
                              ))}
                            </List>
                          </Collapse>
                        </React.Fragment>
                      ))}
                    </List>
                  </Collapse>
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ px: 4, py: 2 }}>
              <Typography variant="caption" color="text.secondary">
                No capability centres configured
              </Typography>
            </Box>
          )}
        </Collapse>
      </>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Dashboard Items */}
      <List>
        {dashboardItems.map(renderMenuItem)}
      </List>

      {/* Hierarchy Section */}
      <List sx={{ flexGrow: 1 }}>
        {renderHierarchySection()}
      </List>

      {/* Bottom Items */}
      <List>
        {bottomItems.map(renderMenuItem)}
      </List>
    </Box>
  );
};

export default SidebarNavigation;

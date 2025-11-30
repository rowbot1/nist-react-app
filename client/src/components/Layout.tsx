import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  ListItemIcon,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Search as SearchIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { Breadcrumbs } from './Breadcrumbs';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { SidebarNavigation } from './SidebarNavigation';

const drawerWidthExpanded = 280;
const drawerWidthCollapsed = 64;

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useThemeMode();

  const drawerWidth = sidebarCollapsed ? drawerWidthCollapsed : drawerWidthExpanded;

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Global keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleUserMenuClose();
    navigate('/login');
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
        <Box
          onClick={() => navigate('/')}
          sx={{
            cursor: 'pointer',
            '&:hover': {
              opacity: 0.8,
            },
            transition: 'opacity 0.2s',
          }}
        >
          {sidebarCollapsed ? (
            <Box
              component="img"
              src="/logo-icon.svg"
              alt="Posture"
              sx={{ height: 40, width: 'auto' }}
            />
          ) : (
            <Box
              component="img"
              src="/logo.svg"
              alt="Posture"
              sx={{ height: 36, width: 'auto' }}
            />
          )}
        </Box>
      </Toolbar>
      <Divider />
      {/* Nested Navigation */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <SidebarNavigation collapsed={sidebarCollapsed} />
      </Box>
      <Divider />
      {/* Collapse/Expand Button */}
      <Box sx={{ p: 1, display: 'flex', justifyContent: sidebarCollapsed ? 'center' : 'flex-end' }}>
        <Tooltip title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right" arrow>
          <IconButton onClick={toggleSidebar} size="small">
            {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          transition: 'width 0.2s ease-in-out, margin-left 0.2s ease-in-out',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Posture
          </Typography>

          {/* Search Button */}
          <Tooltip title="Search (Ctrl+K)">
            <Box
              onClick={() => setSearchOpen(true)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'rgba(255,255,255,0.15)',
                borderRadius: 1,
                px: 2,
                py: 0.75,
                mr: 2,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.25)',
                },
              }}
            >
              <SearchIcon sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="body2" sx={{ mr: 2, opacity: 0.9 }}>
                Search...
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 0.5,
                  fontFamily: 'monospace',
                }}
              >
                {'\u2318'}K
              </Typography>
            </Box>
          </Tooltip>

          {/* Save Status Indicator */}
          <SaveStatusIndicator showIdle={false} size="small" variant="full" />

          {/* Theme Toggle */}
          <Tooltip title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggleTheme} sx={{ mr: 1, color: 'text.primary' }}>
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* Notification Center */}
          <NotificationCenter />

          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="user-menu"
            aria-haspopup="true"
            onClick={handleUserMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ bgcolor: 'secondary.main' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>

          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
          >
            <MenuItem onClick={handleUserMenuClose}>
              <Typography variant="body2" color="text.secondary">
                {user?.name}
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleUserMenuClose}>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => navigate('/settings')}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { sm: drawerWidth },
          flexShrink: { sm: 0 },
          transition: 'width 0.2s ease-in-out',
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              transition: 'width 0.2s ease-in-out',
              overflowX: 'hidden',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          transition: 'width 0.2s ease-in-out',
        }}
      >
        <Toolbar />
        <Breadcrumbs />
        <Outlet />
      </Box>

      {/* Global Search Dialog */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </Box>
  );
};

export default Layout;

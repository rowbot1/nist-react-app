import React from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, Box } from '@mui/material';
import {
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Inventory as ProductIcon,
  Assessment as AssessmentIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Computer as SystemIcon,
} from '@mui/icons-material';
import { useProduct } from '../hooks/useProducts';
import { useSystem } from '../hooks/useSystems';

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

interface RouteConfig {
  label: string;
  icon?: React.ReactNode;
}

const routeLabels: Record<string, RouteConfig> = {
  dashboard: { label: 'Dashboard', icon: <HomeIcon fontSize="small" /> },
  'command-center': { label: 'Command Center', icon: <HomeIcon fontSize="small" /> },
  products: { label: 'Products', icon: <ProductIcon fontSize="small" /> },
  systems: { label: 'Systems', icon: <SystemIcon fontSize="small" /> },
  assessments: { label: 'Assessments', icon: <AssessmentIcon fontSize="small" /> },
  analytics: { label: 'Analytics', icon: <AnalyticsIcon fontSize="small" /> },
  settings: { label: 'Settings', icon: <SettingsIcon fontSize="small" /> },
  baseline: { label: 'Baseline', icon: <AssessmentIcon fontSize="small" /> },
};

interface BreadcrumbsProps {
  productName?: string;
  systemName?: string;
  customItems?: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  productName: propProductName,
  systemName: propSystemName,
  customItems,
}) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Extract product and system IDs from the URL for auto-fetching names
  const productIdIndex = pathnames.indexOf('products');
  const systemIdIndex = pathnames.indexOf('systems');
  const productIdFromUrl = productIdIndex >= 0 && pathnames[productIdIndex + 1] ? pathnames[productIdIndex + 1] : null;
  const systemIdFromUrl = systemIdIndex >= 0 && pathnames[systemIdIndex + 1] ? pathnames[systemIdIndex + 1] : null;

  // Only fetch if ID looks like a UUID and name wasn't provided as prop
  const isProductUuid = productIdFromUrl && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productIdFromUrl);
  const isSystemUuid = systemIdFromUrl && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(systemIdFromUrl);

  const { data: productData } = useProduct(isProductUuid && !propProductName ? productIdFromUrl : '', {
    enabled: !!(isProductUuid && !propProductName),
  });
  const { data: systemData } = useSystem(isSystemUuid && !propSystemName ? systemIdFromUrl : '', {
    enabled: !!(isSystemUuid && !propSystemName),
  });

  // Use prop names if provided, otherwise use fetched names
  const productName = propProductName || productData?.name;
  const systemName = propSystemName || systemData?.name;

  // Don't show breadcrumbs on login page or dashboard (root)
  if (pathnames.length === 0 || pathnames[0] === 'login') {
    return null;
  }

  // If custom items are provided, use those
  if (customItems && customItems.length > 0) {
    return (
      <Box sx={{ mb: 2 }}>
        <MuiBreadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
        >
          <Link
            component={RouterLink}
            to="/dashboard"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.secondary',
              textDecoration: 'none',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <HomeIcon fontSize="small" />
            Dashboard
          </Link>
          {customItems.map((item, index) => {
            const isLast = index === customItems.length - 1;
            return isLast ? (
              <Typography
                key={item.path}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                color="text.primary"
              >
                {item.icon}
                {item.label}
              </Typography>
            ) : (
              <Link
                key={item.path}
                component={RouterLink}
                to={item.path}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: 'text.secondary',
                  textDecoration: 'none',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </MuiBreadcrumbs>
      </Box>
    );
  }

  // Generate breadcrumbs from path
  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = '';

  pathnames.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Check if this is an ID (UUID pattern)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);

    if (isUuid) {
      // Use product or system name if available
      const prevSegment = pathnames[index - 1];
      if (prevSegment === 'products' && productName) {
        breadcrumbs.push({
          label: productName,
          path: currentPath,
          icon: <ProductIcon fontSize="small" />,
        });
      } else if (prevSegment === 'systems' && systemName) {
        breadcrumbs.push({
          label: systemName,
          path: currentPath,
          icon: <SystemIcon fontSize="small" />,
        });
      } else {
        // Fallback to truncated ID
        breadcrumbs.push({
          label: `${segment.slice(0, 8)}...`,
          path: currentPath,
        });
      }
    } else {
      const routeConfig = routeLabels[segment];
      if (routeConfig) {
        breadcrumbs.push({
          label: routeConfig.label,
          path: currentPath,
          icon: routeConfig.icon,
        });
      } else {
        // Capitalize unknown segments
        breadcrumbs.push({
          label: segment.charAt(0).toUpperCase() + segment.slice(1),
          path: currentPath,
        });
      }
    }
  });

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <MuiBreadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
      >
        {/* Always show Dashboard as root */}
        {pathnames[0] !== 'dashboard' && (
          <Link
            component={RouterLink}
            to="/dashboard"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.secondary',
              textDecoration: 'none',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <HomeIcon fontSize="small" />
            Dashboard
          </Link>
        )}
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return isLast ? (
            <Typography
              key={crumb.path}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              color="text.primary"
            >
              {crumb.icon}
              {crumb.label}
            </Typography>
          ) : (
            <Link
              key={crumb.path}
              component={RouterLink}
              to={crumb.path}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {crumb.icon}
              {crumb.label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};

export default Breadcrumbs;

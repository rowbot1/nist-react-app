import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import {
  Business as ProductIcon,
  Computer as SystemIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Analytics as AnalyticsIcon,
  FolderOff as EmptyFolderIcon,
} from '@mui/icons-material';

type EmptyStateType =
  | 'products'
  | 'systems'
  | 'assessments'
  | 'controls'
  | 'evidence'
  | 'search'
  | 'analytics'
  | 'generic';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  showAction?: boolean;
  icon?: React.ReactNode;
}

const defaultConfigs: Record<EmptyStateType, {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
}> = {
  products: {
    icon: <ProductIcon sx={{ fontSize: 64, color: 'primary.light' }} />,
    title: 'No Products Yet',
    description: 'Products help you organize your compliance efforts by business application or service. Create your first product to get started.',
    actionLabel: 'Create Product',
  },
  systems: {
    icon: <SystemIcon sx={{ fontSize: 64, color: 'info.light' }} />,
    title: 'No Systems Added',
    description: 'Systems represent the technical components that need compliance assessment. Add a system to begin tracking its security posture.',
    actionLabel: 'Add System',
  },
  assessments: {
    icon: <AssessmentIcon sx={{ fontSize: 64, color: 'warning.light' }} />,
    title: 'No Assessments Yet',
    description: 'Assessments evaluate your systems against NIST 800-53 controls. Create an assessment to start tracking compliance.',
    actionLabel: 'Start Assessment',
  },
  controls: {
    icon: <SecurityIcon sx={{ fontSize: 64, color: 'success.light' }} />,
    title: 'No Controls Selected',
    description: 'Select the NIST 800-53 controls that apply to your product from the baseline configuration.',
    actionLabel: 'Configure Baseline',
  },
  evidence: {
    icon: <EmptyFolderIcon sx={{ fontSize: 64, color: 'grey.400' }} />,
    title: 'No Evidence Uploaded',
    description: 'Upload documentation, screenshots, or other files to support your compliance assessments.',
    actionLabel: 'Upload Evidence',
  },
  search: {
    icon: <SearchIcon sx={{ fontSize: 64, color: 'grey.400' }} />,
    title: 'No Results Found',
    description: 'Try adjusting your search terms or filters to find what you\'re looking for.',
    actionLabel: 'Clear Search',
  },
  analytics: {
    icon: <AnalyticsIcon sx={{ fontSize: 64, color: 'secondary.light' }} />,
    title: 'No Data Available',
    description: 'Complete some assessments to see analytics and compliance metrics.',
    actionLabel: 'View Assessments',
  },
  generic: {
    icon: <EmptyFolderIcon sx={{ fontSize: 64, color: 'grey.400' }} />,
    title: 'Nothing Here Yet',
    description: 'This section is empty. Take action to add some content.',
    actionLabel: 'Get Started',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionLabel,
  onAction,
  showAction = true,
  icon,
}) => {
  const config = defaultConfigs[type];

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 4,
        textAlign: 'center',
        bgcolor: 'background.default',
        borderStyle: 'dashed',
        borderColor: 'grey.300',
      }}
    >
      <Box sx={{ mb: 2 }}>
        {icon || config.icon}
      </Box>
      <Typography variant="h6" gutterBottom color="text.primary">
        {title || config.title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 400, mx: 'auto', mb: 3 }}
      >
        {description || config.description}
      </Typography>
      {showAction && onAction && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAction}
        >
          {actionLabel || config.actionLabel}
        </Button>
      )}
    </Paper>
  );
};

export default EmptyState;

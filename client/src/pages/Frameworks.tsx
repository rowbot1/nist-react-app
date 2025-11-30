/**
 * Frameworks Page
 *
 * Displays all business domain frameworks with compliance overview.
 * Provides ability to create, edit, delete frameworks and view aggregate compliance.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Alert,
  CircularProgress,
  Paper,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  Cloud as CloudIcon,
  NetworkCheck as NetworkIcon,
  Phone as PhoneIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import {
  useFrameworks,
  useCreateFramework,
  useUpdateFramework,
  useDeleteFramework,
  useFrameworkOverview,
  useCapabilityCentres,
} from '../hooks';
import { Framework, CreateFrameworkInput } from '../types/api.types';
import { EmptyState } from '../components/EmptyState';

// Icon options for frameworks
const FRAMEWORK_ICONS: { [key: string]: React.ReactElement } = {
  Folder: <FolderIcon />,
  Cloud: <CloudIcon />,
  Network: <NetworkIcon />,
  Phone: <PhoneIcon />,
  Storage: <StorageIcon />,
  Security: <SecurityIcon />,
  Business: <BusinessIcon />,
  Category: <CategoryIcon />,
};

// Color options for frameworks
const FRAMEWORK_COLORS = [
  '#1976d2', // Blue
  '#388e3c', // Green
  '#f57c00', // Orange
  '#7b1fa2', // Purple
  '#d32f2f', // Red
  '#0097a7', // Cyan
  '#5d4037', // Brown
  '#455a64', // Blue Grey
];

interface FrameworkFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
  capabilityCentreId: string;
}

const Frameworks: React.FC = () => {
  const navigate = useNavigate();
  const { data: frameworks, isLoading, error } = useFrameworks();
  const { data: overview } = useFrameworkOverview();
  const { data: capabilityCentres } = useCapabilityCentres();
  const createFramework = useCreateFramework();
  const updateFramework = useUpdateFramework();
  const deleteFramework = useDeleteFramework();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingFramework, setEditingFramework] = useState<Framework | null>(null);
  const [frameworkToDelete, setFrameworkToDelete] = useState<Framework | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [formData, setFormData] = useState<FrameworkFormData>({
    name: '',
    description: '',
    color: FRAMEWORK_COLORS[0],
    icon: 'Folder',
    capabilityCentreId: '',
  });

  const handleOpenDialog = (framework?: Framework) => {
    if (framework) {
      setEditingFramework(framework);
      setFormData({
        name: framework.name,
        description: framework.description || '',
        color: framework.color || FRAMEWORK_COLORS[0],
        icon: framework.icon || 'Folder',
        capabilityCentreId: framework.capabilityCentreId || '',
      });
    } else {
      setEditingFramework(null);
      setFormData({
        name: '',
        description: '',
        color: FRAMEWORK_COLORS[0],
        icon: 'Folder',
        capabilityCentreId: capabilityCentres?.[0]?.id || '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingFramework(null);
  };

  const handleSubmit = async () => {
    const data: CreateFrameworkInput = {
      name: formData.name,
      description: formData.description || undefined,
      color: formData.color,
      icon: formData.icon,
      capabilityCentreId: formData.capabilityCentreId,
    };

    if (editingFramework) {
      await updateFramework.mutateAsync({ id: editingFramework.id, data });
    } else {
      await createFramework.mutateAsync(data);
    }
    handleCloseDialog();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, framework: Framework) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedFramework(framework);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFramework(null);
  };

  const handleEditClick = () => {
    if (selectedFramework) {
      handleOpenDialog(selectedFramework);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (selectedFramework) {
      setFrameworkToDelete(selectedFramework);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleConfirmDelete = async () => {
    if (frameworkToDelete) {
      await deleteFramework.mutateAsync(frameworkToDelete.id);
    }
    setDeleteDialogOpen(false);
    setFrameworkToDelete(null);
  };

  const getComplianceColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getFrameworkIcon = (iconName: string | undefined) => {
    return FRAMEWORK_ICONS[iconName || 'Folder'] || <FolderIcon />;
  };

  // Group frameworks by Capability Centre
  const frameworksByCC = useMemo(() => {
    if (!frameworks || !capabilityCentres) return [];

    // Create a map of CC id to CC details and its frameworks
    const ccMap = new Map<string, { cc: typeof capabilityCentres[0]; frameworks: typeof frameworks }>();

    // Initialize with all capability centres (even if they have no frameworks)
    capabilityCentres.forEach((cc) => {
      ccMap.set(cc.id, { cc, frameworks: [] });
    });

    // Add frameworks to their respective CCs
    frameworks.forEach((fw) => {
      if (fw.capabilityCentreId && ccMap.has(fw.capabilityCentreId)) {
        ccMap.get(fw.capabilityCentreId)!.frameworks.push(fw);
      }
    });

    // Convert to array and sort by CC name
    return Array.from(ccMap.values()).sort((a, b) => a.cc.name.localeCompare(b.cc.name));
  }, [frameworks, capabilityCentres]);

  // Track expanded accordions (default all expanded)
  const [expandedCCs, setExpandedCCs] = useState<string[]>(() =>
    capabilityCentres?.map(cc => cc.id) || []
  );

  const handleAccordionChange = (ccId: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedCCs((prev) =>
      isExpanded ? [...prev, ccId] : prev.filter((id) => id !== ccId)
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load frameworks. Please try again.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Frameworks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage business domain portfolios and view aggregate compliance
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          New Framework
        </Button>
      </Box>

      {/* Overview Stats */}
      {overview && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary">
                  {overview.totals.frameworkCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Frameworks
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary">
                  {overview.totals.totalProducts}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Products
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary">
                  {overview.totals.totalSystems}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Systems
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color={getComplianceColor(overview.totals.overallComplianceScore)}>
                  {overview.totals.overallComplianceScore}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overall Compliance
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Frameworks Grouped by Capability Centre */}
      {frameworksByCC.length > 0 ? (
        <Box>
          {frameworksByCC.map(({ cc, frameworks: ccFrameworks }) => (
            <Accordion
              key={cc.id}
              expanded={expandedCCs.includes(cc.id)}
              onChange={handleAccordionChange(cc.id)}
              sx={{ mb: 2, '&:before': { display: 'none' } }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: cc.color ? `${cc.color}15` : 'grey.50',
                  borderLeft: `4px solid ${cc.color || '#1976d2'}`,
                  '&:hover': { backgroundColor: cc.color ? `${cc.color}25` : 'grey.100' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      backgroundColor: cc.color || '#1976d2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <BusinessIcon />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{cc.name}</Typography>
                    {cc.description && (
                      <Typography variant="body2" color="text.secondary">
                        {cc.description}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={`${ccFrameworks.length} Framework${ccFrameworks.length !== 1 ? 's' : ''}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 3 }}>
                {ccFrameworks.length > 0 ? (
                  <Grid container spacing={3}>
                    {ccFrameworks.map((framework) => (
                      <Grid item xs={12} sm={6} md={4} key={framework.id}>
                        <Card
                          sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            cursor: 'pointer',
                            borderTop: `4px solid ${framework.color || '#1976d2'}`,
                            '&:hover': {
                              boxShadow: 4,
                            },
                          }}
                          onClick={() => navigate(`/frameworks/${framework.id}`)}
                        >
                          <CardContent sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 1,
                                  backgroundColor: framework.color || '#1976d2',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  mr: 2,
                                }}
                              >
                                {getFrameworkIcon(framework.icon)}
                              </Box>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="h6">{framework.name}</Typography>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, framework)}
                              >
                                <MoreIcon />
                              </IconButton>
                            </Box>

                            {framework.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {framework.description}
                              </Typography>
                            )}

                            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                              <Chip
                                size="small"
                                label={`${framework.stats?.productCount || 0} Products`}
                                variant="outlined"
                              />
                              <Chip
                                size="small"
                                label={`${framework.stats?.systemCount || 0} Systems`}
                                variant="outlined"
                              />
                              <Chip
                                size="small"
                                label={`${framework.stats?.controlCount || 0} Controls`}
                                variant="outlined"
                                color="primary"
                              />
                            </Box>

                            <Box sx={{ mt: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Compliance Score
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  color={`${getComplianceColor(framework.stats?.complianceScore || 0)}.main`}
                                >
                                  {framework.stats?.complianceScore || 0}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={framework.stats?.complianceScore || 0}
                                color={getComplianceColor(framework.stats?.complianceScore || 0)}
                                sx={{ height: 8, borderRadius: 1 }}
                              />
                            </Box>
                          </CardContent>

                          <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                            <Tooltip title="View Details">
                              <Button
                                size="small"
                                endIcon={<TrendingUpIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/frameworks/${framework.id}`);
                                }}
                              >
                                View
                              </Button>
                            </Tooltip>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    <FolderIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                    <Typography variant="body2">
                      No frameworks in this Capability Centre yet
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, capabilityCentreId: cc.id }));
                        handleOpenDialog();
                      }}
                      sx={{ mt: 1 }}
                    >
                      Add Framework
                    </Button>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
        <EmptyState
          type="generic"
          title="No Capability Centres Yet"
          description="Create Capability Centres in Settings > Organization first, then add frameworks to organize products by business domain."
          actionLabel="Go to Settings"
          onAction={() => navigate('/settings')}
          icon={<FolderIcon sx={{ fontSize: 64, color: 'text.disabled' }} />}
        />
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingFramework ? 'Edit Framework' : 'Create New Framework'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Framework Name"
            fullWidth
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Networks, Cloud, UC"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this framework"
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="capability-centre-label">Capability Centre</InputLabel>
            <Select
              labelId="capability-centre-label"
              value={formData.capabilityCentreId}
              label="Capability Centre"
              onChange={(e: SelectChangeEvent) =>
                setFormData({ ...formData, capabilityCentreId: e.target.value })
              }
            >
              {capabilityCentres?.map((cc) => (
                <MenuItem key={cc.id} value={cc.id}>
                  {cc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="subtitle2" gutterBottom>
            Icon
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            {Object.entries(FRAMEWORK_ICONS).map(([name, icon]) => (
              <IconButton
                key={name}
                onClick={() => setFormData({ ...formData, icon: name })}
                sx={{
                  border: formData.icon === name ? 2 : 1,
                  borderColor: formData.icon === name ? 'primary.main' : 'divider',
                  backgroundColor: formData.icon === name ? 'primary.light' : 'transparent',
                }}
              >
                {icon}
              </IconButton>
            ))}
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Color
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {FRAMEWORK_COLORS.map((color) => (
              <Box
                key={color}
                onClick={() => setFormData({ ...formData, color })}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: formData.color === color ? 3 : 0,
                  borderColor: 'white',
                  boxShadow: formData.color === color ? `0 0 0 2px ${color}` : 'none',
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.name.trim() || createFramework.isPending || updateFramework.isPending}
          >
            {createFramework.isPending || updateFramework.isPending ? (
              <CircularProgress size={20} />
            ) : editingFramework ? (
              'Update'
            ) : (
              'Create'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Framework?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{frameworkToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Products in this framework will be unassigned but not deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleteFramework.isPending}
          >
            {deleteFramework.isPending ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Frameworks;

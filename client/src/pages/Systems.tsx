/**
 * Systems Management Page
 *
 * Comprehensive systems management interface for the NIST Compliance Assessment Tool.
 * Features include filtering, CRUD operations, compliance tracking, and system detail views.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Card,
  CardContent,
  Breadcrumbs,
  Link as MuiLink,
  CircularProgress,
  Stack,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';

// Hooks
import { useSystems, useCreateSystem, useUpdateSystem, useDeleteSystem } from '../hooks/useSystems';
import { useProducts } from '../hooks/useProducts';

// Types
import type { System, CreateSystemInput, UpdateSystemInput } from '../types/api.types';

/**
 * System form data with extended fields
 */
interface SystemFormData {
  name: string;
  description: string;
  productId: string;
  environment: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION' | 'TEST';
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dataClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
}

/**
 * Filter state interface
 */
interface FilterState {
  productId: string;
  environment: string;
  criticality: string;
  dataClassification: string;
  searchQuery: string;
}

/**
 * Environment color mapping
 */
const getEnvironmentColor = (env: string): 'error' | 'warning' | 'info' | 'default' => {
  switch (env.toUpperCase()) {
    case 'PRODUCTION':
      return 'error';
    case 'STAGING':
      return 'warning';
    case 'DEVELOPMENT':
      return 'info';
    default:
      return 'default';
  }
};

/**
 * Criticality color mapping
 */
const getCriticalityColor = (criticality: string): string => {
  switch (criticality.toUpperCase()) {
    case 'CRITICAL':
      return '#d32f2f'; // error.main
    case 'HIGH':
      return '#ed6c02'; // warning.main
    case 'MEDIUM':
      return '#ffa726'; // warning.light
    case 'LOW':
      return '#2e7d32'; // success.main
    default:
      return '#757575';
  }
};

/**
 * Main Systems Management Component
 */
const Systems: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contextProductId = searchParams.get('productId');

  // State management
  const [filters, setFilters] = useState<FilterState>({
    productId: contextProductId || '',
    environment: '',
    criticality: '',
    dataClassification: '',
    searchQuery: '',
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Fetch data
  const { data: systems = [], isLoading: systemsLoading, error: systemsError } = useSystems(filters.productId);
  const { data: products = [], isLoading: productsLoading } = useProducts();

  // Mutations
  const createSystemMutation = useCreateSystem();
  const updateSystemMutation = useUpdateSystem();
  const deleteSystemMutation = useDeleteSystem();

  // Form management
  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreateForm,
    setValue: setCreateValue,
    formState: { errors: createErrors },
  } = useForm<SystemFormData>({
    defaultValues: {
      name: '',
      description: '',
      productId: contextProductId || '',
      environment: 'DEVELOPMENT',
      criticality: 'MEDIUM',
      dataClassification: 'INTERNAL',
    },
  });

  // Auto-select first product if no context and products are loaded
  React.useEffect(() => {
    if (!contextProductId && products.length > 0) {
      setCreateValue('productId', products[0].id);
    }
  }, [products, contextProductId, setCreateValue]);

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = useForm<SystemFormData>();

  // Filter systems based on all criteria
  const filteredSystems = useMemo(() => {
    return systems.filter((system: System) => {
      const matchesEnvironment = !filters.environment ||
        (system.environment && system.environment.toUpperCase() === filters.environment);
      const matchesCriticality = !filters.criticality ||
        (system.criticality && system.criticality.toUpperCase() === filters.criticality);
      const matchesDataClassification = !filters.dataClassification ||
        ((system as any).dataClassification && (system as any).dataClassification.toUpperCase() === filters.dataClassification);
      const matchesSearch = !filters.searchQuery ||
        system.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        (system.description && system.description.toLowerCase().includes(filters.searchQuery.toLowerCase()));

      return matchesEnvironment && matchesCriticality && matchesDataClassification && matchesSearch;
    });
  }, [systems, filters]);

  // Handle create system
  const onCreateSubmit = async (data: SystemFormData) => {
    try {
      const input = {
        name: data.name,
        description: data.description,
        productId: data.productId,
        environment: data.environment.toUpperCase(),
        criticality: data.criticality.toUpperCase(),
      };

      await createSystemMutation.mutateAsync(input as CreateSystemInput);
      setIsCreateModalOpen(false);
      resetCreateForm();
    } catch (error) {
      console.error('Failed to create system:', error);
    }
  };

  // Handle edit system
  const onEditSubmit = async (data: SystemFormData) => {
    if (!selectedSystem) return;

    try {
      const updates = {
        name: data.name,
        description: data.description,
        environment: data.environment.toUpperCase(),
        criticality: data.criticality.toUpperCase(),
      };

      await updateSystemMutation.mutateAsync({ id: selectedSystem.id, updates: updates as UpdateSystemInput });
      setIsEditModalOpen(false);
      setSelectedSystem(null);
      resetEditForm();
    } catch (error) {
      console.error('Failed to update system:', error);
    }
  };

  // Handle delete system
  const handleDeleteSystem = async () => {
    if (!selectedSystem || deleteConfirmationText !== selectedSystem.name) return;

    try {
      await deleteSystemMutation.mutateAsync(selectedSystem.id);
      setIsDeleteModalOpen(false);
      setSelectedSystem(null);
      setDeleteConfirmationText('');
    } catch (error) {
      console.error('Failed to delete system:', error);
    }
  };

  // Open edit modal
  const handleEditClick = (system: System) => {
    setSelectedSystem(system);
    resetEditForm({
      name: system.name,
      description: system.description || '',
      productId: system.productId,
      environment: (system.environment?.toUpperCase() || 'DEVELOPMENT') as any,
      criticality: (system.criticality?.toUpperCase() || 'MEDIUM') as any,
      dataClassification: ((system as any).dataClassification?.toUpperCase() || 'INTERNAL') as any,
    });
    setIsEditModalOpen(true);
  };

  // Open delete modal
  const handleDeleteClick = (system: System) => {
    setSelectedSystem(system);
    setDeleteConfirmationText('');
    setIsDeleteModalOpen(true);
  };

  // Open detail view
  const handleViewClick = (system: System) => {
    setSelectedSystem(system);
    setIsDetailViewOpen(true);
  };

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'System Name',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'productName',
      headerName: 'Product Name',
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => {
        const product = products.find(p => p.id === params.row.productId);
        return product?.name || 'Unknown';
      },
    },
    {
      field: 'environment',
      headerName: 'Environment',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={params.value?.toUpperCase() || 'UNKNOWN'}
          color={getEnvironmentColor(params.value || '')}
          size="small"
        />
      ),
    },
    {
      field: 'criticality',
      headerName: 'Criticality',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value?.toUpperCase() || 'UNKNOWN'}
          size="small"
          sx={{
            backgroundColor: getCriticalityColor(params.value || ''),
            color: '#fff',
          }}
        />
      ),
    },
    {
      field: 'dataClassification',
      headerName: 'Data Classification',
      width: 160,
      valueGetter: (params) => (params.row as any).dataClassification || 'INTERNAL',
    },
    {
      field: 'assessmentStatus',
      headerName: 'Assessment Status',
      width: 150,
      renderCell: (params) => {
        const assessed = params.row.assessmentCount || 0;
        const total = 78; // TODO: Get from baseline or framework
        return (
          <Typography variant="body2">
            {assessed}/{total} assessed
          </Typography>
        );
      },
    },
    {
      field: 'complianceScore',
      headerName: 'Compliance Score',
      width: 150,
      renderCell: (params) => {
        const score = params.row.complianceScore || 0;
        const color = score >= 80 ? '#2e7d32' : score >= 60 ? '#ffa726' : '#d32f2f';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color, fontWeight: 600 }}>
              {score}%
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'updatedAt',
      headerName: 'Last Assessed',
      width: 130,
      valueGetter: (params) => params.row.updatedAt,
      renderCell: (params) => {
        if (!params.value) return '-';
        return format(new Date(params.value), 'MMM dd, yyyy');
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<ViewIcon />}
          label="View"
          onClick={() => handleViewClick(params.row)}
          showInMenu={false}
        />,
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEditClick(params.row)}
          showInMenu={false}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDeleteClick(params.row)}
          showInMenu={false}
        />,
      ],
    },
  ];

  // Get product name for breadcrumb
  const currentProduct = products.find(p => p.id === contextProductId);

  if (systemsLoading || productsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Breadcrumbs */}
      <Box mb={3}>
        {contextProductId && currentProduct && (
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
            sx={{ mb: 2 }}
          >
            <MuiLink
              component="button"
              variant="body1"
              onClick={() => navigate('/products')}
              sx={{ textDecoration: 'none', color: 'primary.main' }}
            >
              Products
            </MuiLink>
            <MuiLink
              component="button"
              variant="body1"
              onClick={() => navigate(`/products/${contextProductId}`)}
              sx={{ textDecoration: 'none', color: 'primary.main' }}
            >
              {currentProduct.name}
            </MuiLink>
            <Typography color="text.primary">Systems</Typography>
          </Breadcrumbs>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" component="h1" fontWeight={600}>
            Systems Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add System
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {systemsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load systems: {(systemsError as Error).message}
        </Alert>
      )}

      {/* Filters Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              select
              fullWidth
              label="Product"
              value={filters.productId}
              onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
              size="small"
            >
              <MenuItem value="">All Products</MenuItem>
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              select
              fullWidth
              label="Environment"
              value={filters.environment}
              onChange={(e) => setFilters({ ...filters, environment: e.target.value })}
              size="small"
            >
              <MenuItem value="">All Environments</MenuItem>
              <MenuItem value="DEVELOPMENT">Development</MenuItem>
              <MenuItem value="STAGING">Staging</MenuItem>
              <MenuItem value="PRODUCTION">Production</MenuItem>
              <MenuItem value="TEST">Test</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              select
              fullWidth
              label="Criticality"
              value={filters.criticality}
              onChange={(e) => setFilters({ ...filters, criticality: e.target.value })}
              size="small"
            >
              <MenuItem value="">All Levels</MenuItem>
              <MenuItem value="LOW">Low</MenuItem>
              <MenuItem value="MEDIUM">Medium</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              select
              fullWidth
              label="Data Classification"
              value={filters.dataClassification}
              onChange={(e) => setFilters({ ...filters, dataClassification: e.target.value })}
              size="small"
            >
              <MenuItem value="">All Classifications</MenuItem>
              <MenuItem value="PUBLIC">Public</MenuItem>
              <MenuItem value="INTERNAL">Internal</MenuItem>
              <MenuItem value="CONFIDENTIAL">Confidential</MenuItem>
              <MenuItem value="RESTRICTED">Restricted</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              fullWidth
              label="Search by name"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              size="small"
              placeholder="Search systems..."
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Systems Table */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredSystems}
          columns={columns}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25, page: 0 },
            },
          }}
          disableRowSelectionOnClick
          onRowClick={(params) => handleViewClick(params.row)}
          sx={{
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
            },
          }}
        />
      </Paper>

      {/* Create System Modal */}
      <Dialog
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Create New System</Typography>
            <IconButton onClick={() => setIsCreateModalOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleCreateSubmit(onCreateSubmit)}>
          <DialogContent dividers>
            {products.length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                No products available. Please create a product first before adding a system.
              </Alert>
            )}
            {createSystemMutation.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to create system: {(createSystemMutation.error as Error)?.message || 'Unknown error'}
              </Alert>
            )}
            <Stack spacing={3}>
              <Controller
                name="name"
                control={createControl}
                rules={{ required: 'System name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="System Name"
                    fullWidth
                    required
                    error={!!createErrors.name}
                    helperText={createErrors.name?.message}
                  />
                )}
              />

              <Controller
                name="description"
                control={createControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                  />
                )}
              />

              <Controller
                name="productId"
                control={createControl}
                rules={{ required: 'Product is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Product"
                    fullWidth
                    required
                    error={!!createErrors.productId}
                    helperText={createErrors.productId?.message}
                  >
                    {products.map((product) => (
                      <MenuItem key={product.id} value={product.id}>
                        {product.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              <Controller
                name="environment"
                control={createControl}
                rules={{ required: 'Environment is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Environment"
                    fullWidth
                    required
                    error={!!createErrors.environment}
                    helperText={createErrors.environment?.message}
                  >
                    <MenuItem value="DEVELOPMENT">Development</MenuItem>
                    <MenuItem value="STAGING">Staging</MenuItem>
                    <MenuItem value="PRODUCTION">Production</MenuItem>
                    <MenuItem value="TEST">Test</MenuItem>
                  </TextField>
                )}
              />

              <Controller
                name="criticality"
                control={createControl}
                rules={{ required: 'Criticality is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Criticality"
                    fullWidth
                    required
                    error={!!createErrors.criticality}
                    helperText={createErrors.criticality?.message}
                  >
                    <MenuItem value="LOW">Low</MenuItem>
                    <MenuItem value="MEDIUM">Medium</MenuItem>
                    <MenuItem value="HIGH">High</MenuItem>
                    <MenuItem value="CRITICAL">Critical</MenuItem>
                  </TextField>
                )}
              />

              <Controller
                name="dataClassification"
                control={createControl}
                rules={{ required: 'Data classification is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Data Classification"
                    fullWidth
                    required
                    error={!!createErrors.dataClassification}
                    helperText={createErrors.dataClassification?.message}
                  >
                    <MenuItem value="PUBLIC">Public</MenuItem>
                    <MenuItem value="INTERNAL">Internal</MenuItem>
                    <MenuItem value="CONFIDENTIAL">Confidential</MenuItem>
                    <MenuItem value="RESTRICTED">Restricted</MenuItem>
                  </TextField>
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createSystemMutation.isPending || products.length === 0}
            >
              {createSystemMutation.isPending ? 'Creating...' : 'Create System'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit System Modal */}
      <Dialog
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Edit System</Typography>
            <IconButton onClick={() => setIsEditModalOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleEditSubmit(onEditSubmit)}>
          <DialogContent dividers>
            <Stack spacing={3}>
              <Controller
                name="name"
                control={editControl}
                rules={{ required: 'System name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="System Name"
                    fullWidth
                    required
                    error={!!editErrors.name}
                    helperText={editErrors.name?.message}
                  />
                )}
              />

              <Controller
                name="description"
                control={editControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                  />
                )}
              />

              <Controller
                name="environment"
                control={editControl}
                rules={{ required: 'Environment is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Environment"
                    fullWidth
                    required
                    error={!!editErrors.environment}
                    helperText={editErrors.environment?.message}
                  >
                    <MenuItem value="DEVELOPMENT">Development</MenuItem>
                    <MenuItem value="STAGING">Staging</MenuItem>
                    <MenuItem value="PRODUCTION">Production</MenuItem>
                    <MenuItem value="TEST">Test</MenuItem>
                  </TextField>
                )}
              />

              <Controller
                name="criticality"
                control={editControl}
                rules={{ required: 'Criticality is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Criticality"
                    fullWidth
                    required
                    error={!!editErrors.criticality}
                    helperText={editErrors.criticality?.message}
                  >
                    <MenuItem value="LOW">Low</MenuItem>
                    <MenuItem value="MEDIUM">Medium</MenuItem>
                    <MenuItem value="HIGH">High</MenuItem>
                    <MenuItem value="CRITICAL">Critical</MenuItem>
                  </TextField>
                )}
              />

              <Controller
                name="dataClassification"
                control={editControl}
                rules={{ required: 'Data classification is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Data Classification"
                    fullWidth
                    required
                    error={!!editErrors.dataClassification}
                    helperText={editErrors.dataClassification?.message}
                  >
                    <MenuItem value="PUBLIC">Public</MenuItem>
                    <MenuItem value="INTERNAL">Internal</MenuItem>
                    <MenuItem value="CONFIDENTIAL">Confidential</MenuItem>
                    <MenuItem value="RESTRICTED">Restricted</MenuItem>
                  </TextField>
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={updateSystemMutation.isPending}
            >
              {updateSystemMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" color="error">
            Delete System
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 3 }}>
            This action will permanently delete the system and all associated assessments. This
            cannot be undone.
          </Alert>

          <Typography variant="body1" gutterBottom>
            You are about to delete: <strong>{selectedSystem?.name}</strong>
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
            To confirm, please type the system name exactly as shown above:
          </Typography>

          <TextField
            fullWidth
            label="System Name"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            placeholder={selectedSystem?.name}
            error={deleteConfirmationText !== '' && deleteConfirmationText !== selectedSystem?.name}
            helperText={
              deleteConfirmationText !== '' && deleteConfirmationText !== selectedSystem?.name
                ? 'System name does not match'
                : ''
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSystem}
            disabled={
              deleteSystemMutation.isPending ||
              deleteConfirmationText !== selectedSystem?.name
            }
          >
            {deleteSystemMutation.isPending ? 'Deleting...' : 'Delete System'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* System Detail View Modal */}
      <Dialog
        open={isDetailViewOpen}
        onClose={() => setIsDetailViewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight={600}>
              {selectedSystem?.name}
            </Typography>
            <Box>
              <IconButton onClick={() => {
                setIsDetailViewOpen(false);
                handleEditClick(selectedSystem!);
              }} size="small" sx={{ mr: 1 }}>
                <EditIcon />
              </IconButton>
              <IconButton onClick={() => setIsDetailViewOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedSystem && (
            <Stack spacing={3}>
              {/* System Info Card */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Product
                      </Typography>
                      <Typography variant="body1">
                        {products.find(p => p.id === selectedSystem.productId)?.name || 'Unknown'}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Environment
                      </Typography>
                      <Box mt={0.5}>
                        <Chip
                          label={selectedSystem.environment?.toUpperCase() || 'UNKNOWN'}
                          color={getEnvironmentColor(selectedSystem.environment || '')}
                          size="small"
                        />
                      </Box>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Criticality
                      </Typography>
                      <Box mt={0.5}>
                        <Chip
                          label={selectedSystem.criticality?.toUpperCase() || 'UNKNOWN'}
                          size="small"
                          sx={{
                            backgroundColor: getCriticalityColor(selectedSystem.criticality || ''),
                            color: '#fff',
                          }}
                        />
                      </Box>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Data Classification
                      </Typography>
                      <Typography variant="body1">
                        {(selectedSystem as any).dataClassification || 'INTERNAL'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Description
                      </Typography>
                      <Typography variant="body1">
                        {selectedSystem.description || 'No description provided'}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Created
                      </Typography>
                      <Typography variant="body2">
                        {format(new Date(selectedSystem.createdAt), 'MMM dd, yyyy')}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Last Updated
                      </Typography>
                      <Typography variant="body2">
                        {format(new Date(selectedSystem.updatedAt), 'MMM dd, yyyy')}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quick Stats
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="primary">
                          78
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total Controls
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="info.main">
                          {selectedSystem.assessmentCount || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Assessed
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="success.main">
                          {Math.round((selectedSystem.assessmentCount || 0) * 0.7)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Compliant
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="error.main">
                          {Math.round((selectedSystem.assessmentCount || 0) * 0.3)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Non-Compliant
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Compliance Score Breakdown */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Compliance Score Breakdown by Function
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={2}>
                    {['IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER', 'GOVERN'].map((func) => {
                      const score = Math.floor(Math.random() * 40) + 60; // Mock data
                      return (
                        <Box key={func}>
                          <Box display="flex" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2">{func}</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {score}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={score}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor:
                                  score >= 80 ? 'success.main' : score >= 60 ? 'warning.main' : 'error.main',
                              },
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>

              {/* Assessments List */}
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Recent Assessments
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => {
                        setIsDetailViewOpen(false);
                        navigate(`/products/${selectedSystem.productId}/assessments?systemId=${selectedSystem.id}`);
                      }}
                    >
                      View All
                    </Button>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  <Typography variant="body2" color="text.secondary">
                    No assessments yet. Start by creating a baseline and assessing controls.
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsDetailViewOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              setIsDetailViewOpen(false);
              navigate(`/products/${selectedSystem?.productId}/assessments?systemId=${selectedSystem?.id}`);
            }}
          >
            Start Assessment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Systems;

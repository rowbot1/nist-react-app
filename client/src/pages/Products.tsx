import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../hooks/useProducts';
import type { Product, CreateProductInput } from '../types/api.types';

// Product type options
const PRODUCT_TYPES = [
  { value: 'WEB_APPLICATION', label: 'Web Application' },
  { value: 'MOBILE_APPLICATION', label: 'Mobile Application' },
  { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
  { value: 'CLOUD_SERVICE', label: 'Cloud Service' },
  { value: 'API_SERVICE', label: 'API Service' },
  { value: 'DATABASE', label: 'Database' },
  { value: 'NETWORK_DEVICE', label: 'Network Device' },
  { value: 'SECURITY_TOOL', label: 'Security Tool' },
  { value: 'OTHER', label: 'Other' },
] as const;

// Product criticality options
const CRITICALITY_LEVELS = [
  { value: 'LOW', label: 'Low', color: 'success' as const },
  { value: 'MEDIUM', label: 'Medium', color: 'info' as const },
  { value: 'HIGH', label: 'High', color: 'warning' as const },
  { value: 'CRITICAL', label: 'Critical', color: 'error' as const },
] as const;

// Extended Product interface with additional fields
interface ExtendedProduct extends Product {
  type?: string;
  criticality?: string;
}

interface ProductFormData {
  name: string;
  description: string;
  type: string;
  criticality: string;
}

const Products: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('ALL');
  const [openModal, setOpenModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ExtendedProduct | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ExtendedProduct | null>(null);

  // API hooks
  const { data: products = [], isLoading } = useProducts();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  // Form handling
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: {
      name: '',
      description: '',
      type: 'WEB_APPLICATION',
      criticality: 'MEDIUM',
    },
  });

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product: ExtendedProduct) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'ALL' || product.type === typeFilter;
      const matchesCriticality =
        criticalityFilter === 'ALL' || product.criticality === criticalityFilter;
      return matchesSearch && matchesType && matchesCriticality;
    });
  }, [products, searchQuery, typeFilter, criticalityFilter]);

  // Handle modal open for create
  const handleCreateClick = () => {
    setEditingProduct(null);
    reset({
      name: '',
      description: '',
      type: 'WEB_APPLICATION',
      criticality: 'MEDIUM',
    });
    setOpenModal(true);
  };

  // Handle modal open for edit
  const handleEditClick = (product: ExtendedProduct) => {
    setEditingProduct(product);
    reset({
      name: product.name,
      description: product.description || '',
      type: product.type || 'WEB_APPLICATION',
      criticality: product.criticality || 'MEDIUM',
    });
    setOpenModal(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingProduct(null);
    reset();
  };

  // Handle form submit
  const onSubmit = async (data: ProductFormData) => {
    try {
      if (editingProduct) {
        // Update existing product
        await updateMutation.mutateAsync({
          id: editingProduct.id,
          updates: {
            name: data.name,
            description: data.description,
            owner: editingProduct.owner, // Preserve owner
          },
        });
      } else {
        // Create new product
        const createInput: CreateProductInput = {
          name: data.name,
          description: data.description,
          type: data.type,
          criticality: data.criticality,
        };
        await createMutation.mutateAsync(createInput);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  // Handle delete confirmation dialog
  const handleDeleteClick = (product: ExtendedProduct) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      try {
        await deleteMutation.mutateAsync(productToDelete.id);
        setDeleteDialogOpen(false);
        setProductToDelete(null);
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  // Get compliance color
  const getComplianceColor = (score?: number): 'success' | 'warning' | 'error' => {
    if (!score || score < 60) return 'error';
    if (score >= 80) return 'success';
    return 'warning';
  };

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams<ExtendedProduct>) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 'medium',
            cursor: 'pointer',
            '&:hover': { color: 'primary.main' },
          }}
          onClick={() => navigate(`/products/${params.row.id}`)}
        >
          {params.row.name}
        </Typography>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 180,
      renderCell: (params: GridRenderCellParams<ExtendedProduct>) => {
        const typeInfo = PRODUCT_TYPES.find((t) => t.value === params.row.type);
        return (
          <Chip
            label={typeInfo?.label || params.row.type || 'Unknown'}
            size="small"
            color="primary"
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'criticality',
      headerName: 'Criticality',
      width: 130,
      renderCell: (params: GridRenderCellParams<ExtendedProduct>) => {
        const criticalityInfo = CRITICALITY_LEVELS.find(
          (c) => c.value === params.row.criticality
        );
        return (
          <Chip
            label={criticalityInfo?.label || params.row.criticality || 'Unknown'}
            size="small"
            color={criticalityInfo?.color || 'default'}
          />
        );
      },
    },
    {
      field: 'systemCount',
      headerName: 'Systems',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<ExtendedProduct>) => (
        <Typography variant="body2">{params.row.systemCount || 0}</Typography>
      ),
    },
    {
      field: 'complianceScore',
      headerName: 'Compliance Score',
      width: 200,
      renderCell: (params: GridRenderCellParams<ExtendedProduct>) => {
        const score = params.row.complianceScore || 0;
        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ minWidth: 40 }}>
              {score}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={score}
              color={getComplianceColor(score)}
              sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
            />
          </Box>
        );
      },
    },
    {
      field: 'updatedAt',
      headerName: 'Last Updated',
      width: 150,
      renderCell: (params: GridRenderCellParams<ExtendedProduct>) =>
        params.row.updatedAt ? format(new Date(params.row.updatedAt), 'MMM dd, yyyy') : 'N/A',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<ExtendedProduct>) => (
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(params.row);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(params.row);
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Products
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
          disabled={createMutation.isPending}
        >
          Create Product
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  label="Type"
                >
                  <MenuItem value="ALL">All Types</MenuItem>
                  {PRODUCT_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Criticality</InputLabel>
                <Select
                  value={criticalityFilter}
                  onChange={(e) => setCriticalityFilter(e.target.value)}
                  label="Criticality"
                >
                  <MenuItem value="ALL">All Levels</MenuItem>
                  {CRITICALITY_LEVELS.map((level) => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Card>
        <DataGrid
          rows={filteredProducts}
          columns={columns}
          loading={isLoading}
          autoHeight
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: 'updatedAt', sort: 'desc' }] },
          }}
          disableRowSelectionOnClick
          onRowClick={(params) => navigate(`/products/${params.row.id}`)}
          sx={{
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
            },
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingProduct ? 'Edit Product' : 'Create New Product'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Product name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Product Name"
                    fullWidth
                    required
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                    helperText="Optional description of the product"
                  />
                )}
              />
              <Controller
                name="type"
                control={control}
                rules={{ required: 'Product type is required' }}
                render={({ field }) => (
                  <FormControl fullWidth required error={!!errors.type}>
                    <InputLabel>Product Type</InputLabel>
                    <Select {...field} label="Product Type">
                      {PRODUCT_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.type && <FormHelperText>{errors.type.message}</FormHelperText>}
                  </FormControl>
                )}
              />
              <Controller
                name="criticality"
                control={control}
                rules={{ required: 'Criticality level is required' }}
                render={({ field }) => (
                  <FormControl fullWidth required error={!!errors.criticality}>
                    <InputLabel>Criticality Level</InputLabel>
                    <Select {...field} label="Criticality Level">
                      {CRITICALITY_LEVELS.map((level) => (
                        <MenuItem key={level.value} value={level.value}>
                          {level.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.criticality && (
                      <FormHelperText>{errors.criticality.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Product</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{productToDelete?.name}</strong>?
          </DialogContentText>
          <DialogContentText color="error" sx={{ mt: 2 }}>
            Warning: This will also delete all associated systems and assessments. This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products;

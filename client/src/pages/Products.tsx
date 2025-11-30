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
  HelpOutline as HelpIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
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
import { useOrganizationalHierarchy } from '../hooks/useCapabilityCentres';
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

// FIPS 199 Impact Level options
const IMPACT_LEVELS = [
  { value: 'LOW', label: 'Low', color: 'success' as const, description: 'Limited adverse effect' },
  { value: 'MODERATE', label: 'Moderate', color: 'warning' as const, description: 'Serious adverse effect' },
  { value: 'HIGH', label: 'High', color: 'error' as const, description: 'Severe or catastrophic adverse effect' },
] as const;

// FIPS 199 Guidance Component
const FIPS199Guidance: React.FC = () => (
  <Box sx={{ mt: 2, mb: 1 }}>
    <Accordion sx={{ bgcolor: 'grey.50' }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpIcon color="info" fontSize="small" />
          <Typography variant="subtitle2" color="info.main">
            FIPS 199 Security Categorization Guide
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* What is FIPS 199 */}
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              What is FIPS 199?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              FIPS 199 (Federal Information Processing Standard 199) establishes security categories
              for federal information and information systems based on potential impact to an organization
              if there is a loss of <strong>Confidentiality</strong>, <strong>Integrity</strong>, or <strong>Availability</strong> (the CIA triad).
            </Typography>
          </Box>

          {/* High Water Mark */}
          <Alert severity="info" sx={{ py: 0.5 }}>
            <Typography variant="body2">
              <strong>High Water Mark Principle:</strong> The overall impact level is determined by the
              HIGHEST impact level among Confidentiality, Integrity, and Availability. If any one is HIGH,
              the system is categorized as HIGH.
            </Typography>
          </Alert>

          {/* CIA Assessment Table */}
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              How to Determine Impact Level
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Assess each security objective and select the highest:
            </Typography>
            <Table size="small" sx={{ '& td, & th': { py: 0.75, px: 1 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell><strong>Impact</strong></TableCell>
                  <TableCell><strong>Confidentiality</strong></TableCell>
                  <TableCell><strong>Integrity</strong></TableCell>
                  <TableCell><strong>Availability</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Chip label="LOW" size="small" color="success" sx={{ minWidth: 70 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>
                    Unauthorized disclosure has <strong>limited</strong> effect on operations, assets, or individuals
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>
                    Unauthorized modification has <strong>limited</strong> effect
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>
                    Disruption has <strong>limited</strong> effect; minor degradation acceptable
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Chip label="MODERATE" size="small" color="warning" sx={{ minWidth: 70 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>
                    Unauthorized disclosure has <strong>serious</strong> effect on operations, assets, or individuals
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>
                    Unauthorized modification has <strong>serious</strong> effect; significant harm
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>
                    Disruption has <strong>serious</strong> effect; significant degradation or loss
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Chip label="HIGH" size="small" color="error" sx={{ minWidth: 70 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>
                    Unauthorized disclosure has <strong>severe/catastrophic</strong> effect; major financial loss, threat to life
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>
                    Unauthorized modification has <strong>severe/catastrophic</strong> effect
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>
                    Disruption has <strong>severe/catastrophic</strong> effect; complete loss unacceptable
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>

          {/* Examples */}
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Quick Examples
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2">
                <Chip label="LOW" size="small" color="success" sx={{ mr: 1, minWidth: 60 }} />
                Public website, marketing materials, non-sensitive internal tools
              </Typography>
              <Typography variant="body2">
                <Chip label="MODERATE" size="small" color="warning" sx={{ mr: 1, minWidth: 60 }} />
                Business email, HR systems, financial reporting, customer portals
              </Typography>
              <Typography variant="body2">
                <Chip label="HIGH" size="small" color="error" sx={{ mr: 1, minWidth: 60 }} />
                PII/PHI databases, payment systems, critical infrastructure, safety systems
              </Typography>
            </Box>
          </Box>

          {/* Reference */}
          <Typography variant="caption" color="text.secondary">
            Reference: NIST FIPS Publication 199 - Standards for Security Categorization of Federal Information and Information Systems
          </Typography>
        </Box>
      </AccordionDetails>
    </Accordion>
  </Box>
);

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
  impactLevel: string;
  frameworkId: string; // Required - products must belong to a framework
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
  const { data: hierarchy = [] } = useOrganizationalHierarchy();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  // Flatten frameworks for the dropdown
  const frameworkOptions = useMemo(() => {
    const options: Array<{ id: string; name: string; ccName: string; isUnassigned: boolean }> = [];
    for (const cc of hierarchy) {
      for (const framework of cc.frameworks) {
        options.push({
          id: framework.id,
          name: framework.name,
          ccName: cc.name,
          isUnassigned: framework.isUnassigned || false,
        });
      }
    }
    return options;
  }, [hierarchy]);

  // Form handling with onChange validation mode for immediate feedback
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ProductFormData>({
    mode: 'onChange', // Validate on change for immediate feedback
    defaultValues: {
      name: '',
      description: '',
      type: 'WEB_APPLICATION',
      criticality: 'MEDIUM',
      impactLevel: 'MODERATE',
      frameworkId: '',
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
      impactLevel: 'MODERATE',
      frameworkId: frameworkOptions[0]?.id || '',
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
      impactLevel: product.impactLevel || 'MODERATE',
      frameworkId: product.frameworkId || frameworkOptions[0]?.id || '',
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
            type: data.type,
            criticality: data.criticality,
            impactLevel: data.impactLevel as 'LOW' | 'MODERATE' | 'HIGH',
          },
        });
      } else {
        // Create new product
        const createInput: CreateProductInput = {
          name: data.name,
          description: data.description,
          type: data.type,
          criticality: data.criticality,
          impactLevel: data.impactLevel as 'LOW' | 'MODERATE' | 'HIGH',
          frameworkId: data.frameworkId, // Required - products must belong to a framework
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
      width: 120,
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
      field: 'impactLevel',
      headerName: 'FIPS 199',
      width: 110,
      renderCell: (params: GridRenderCellParams<ExtendedProduct>) => {
        const impactInfo = IMPACT_LEVELS.find(
          (i) => i.value === params.row.impactLevel
        );
        return (
          <Tooltip title={impactInfo?.description || 'FIPS 199 Security Categorization'}>
            <Chip
              label={impactInfo?.label || params.row.impactLevel || 'Moderate'}
              size="small"
              color={impactInfo?.color || 'warning'}
              variant="outlined"
            />
          </Tooltip>
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
          <Tooltip title="Edit product">
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
          </Tooltip>
          <Tooltip title="Delete product">
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
          </Tooltip>
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
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
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
                name="frameworkId"
                control={control}
                rules={{ required: 'Framework is required - products must belong to a framework' }}
                render={({ field }) => (
                  <FormControl fullWidth required error={!!errors.frameworkId}>
                    <InputLabel>Framework</InputLabel>
                    <Select {...field} label="Framework">
                      {frameworkOptions.map((fw) => (
                        <MenuItem key={fw.id} value={fw.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {fw.name}
                              {fw.isUnassigned && ' (Unassigned)'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              — {fw.ccName}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {errors.frameworkId?.message || 'Select which framework this product belongs to'}
                    </FormHelperText>
                  </FormControl>
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
              <Controller
                name="impactLevel"
                control={control}
                rules={{ required: 'FIPS 199 impact level is required' }}
                render={({ field }) => (
                  <FormControl fullWidth required error={!!errors.impactLevel}>
                    <InputLabel>FIPS 199 Impact Level</InputLabel>
                    <Select {...field} label="FIPS 199 Impact Level">
                      {IMPACT_LEVELS.map((level) => (
                        <MenuItem key={level.value} value={level.value}>
                          <Box>
                            <Typography variant="body2" component="span">
                              {level.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              - {level.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {errors.impactLevel?.message || 'Security categorization per FIPS 199'}
                    </FormHelperText>
                  </FormControl>
                )}
              />

              {/* FIPS 199 Guidance */}
              <FIPS199Guidance />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending || !isValid}
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
          {productToDelete && (productToDelete.systemCount || 0) > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold" color="error.dark">
                This will permanently delete:
              </Typography>
              <Typography variant="body2" color="error.dark" sx={{ mt: 1 }}>
                • {productToDelete.systemCount || 0} system{(productToDelete.systemCount || 0) !== 1 ? 's' : ''}
              </Typography>
              <Typography variant="body2" color="error.dark">
                • All associated compliance assessments
              </Typography>
            </Box>
          )}
          <DialogContentText color="error" sx={{ mt: 2 }}>
            This action cannot be undone.
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

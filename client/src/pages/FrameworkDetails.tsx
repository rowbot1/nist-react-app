/**
 * Framework Details Page
 *
 * Shows detailed view of a single framework including:
 * - Framework info and compliance stats
 * - List of products with compliance scores
 * - Ability to add/remove products
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  IconButton,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Alert,
  CircularProgress,
  Tooltip,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Inventory as ProductIcon,
  Storage as SystemIcon,
  Security as ControlIcon,
  TrendingUp as TrendingUpIcon,
  Edit as EditIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import {
  useFramework,
  useProducts,
  useAddProductToFramework,
  useRemoveProductFromFramework,
} from '../hooks';
import { FrameworkProduct, Product } from '../types/api.types';
import { EmptyState } from '../components/EmptyState';

const FrameworkDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: framework, isLoading, error } = useFramework(id);
  const { data: allProducts } = useProducts();
  const addProductToFramework = useAddProductToFramework();
  const removeProductFromFramework = useRemoveProductFromFramework();

  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Get products not in any framework or in different framework
  const availableProducts = allProducts?.filter(
    (p: Product) => !framework?.products?.some((fp: FrameworkProduct) => fp.id === p.id)
  ) || [];

  const handleAddProducts = async () => {
    if (!id) return;

    for (const productId of selectedProducts) {
      await addProductToFramework.mutateAsync({ frameworkId: id, productId });
    }
    setSelectedProducts([]);
    setAddProductDialogOpen(false);
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!id) return;
    await removeProductFromFramework.mutateAsync({ frameworkId: id, productId });
  };

  const getComplianceColor = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !framework) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Framework not found or failed to load.
      </Alert>
    );
  }

  // Calculate stats
  const totalProducts = framework.products?.length || 0;
  const totalSystems = framework.products?.reduce((acc: number, p: FrameworkProduct) => acc + (p.systemCount || 0), 0) || 0;
  const totalControls = framework.products?.reduce((acc: number, p: FrameworkProduct) => acc + (p.controlCount || 0), 0) || 0;
  const avgCompliance = totalProducts > 0
    ? Math.round(
        (framework.products?.reduce((acc: number, p: FrameworkProduct) => acc + (p.complianceScore || 0), 0) || 0) / totalProducts
      )
    : 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/frameworks')}
          sx={{ cursor: 'pointer' }}
        >
          Frameworks
        </Link>
        <Typography color="text.primary">{framework.name}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/frameworks')} sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1,
            backgroundColor: framework.color || '#1976d2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            mr: 2,
          }}
        >
          <FolderIcon />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">{framework.name}</Typography>
          {framework.description && (
            <Typography variant="body2" color="text.secondary">
              {framework.description}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/frameworks/${id}/edit`)}
          sx={{ mr: 1 }}
        >
          Edit
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddProductDialogOpen(true)}
        >
          Add Products
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardActionArea
              onClick={() => {
                console.log('Products card clicked, totalProducts:', totalProducts);
                if (totalProducts > 0) {
                  // Scroll to products table
                  const table = document.getElementById('products-table');
                  console.log('Found table:', table);
                  if (table) {
                    table.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Also flash the table to show it's been scrolled to
                    table.style.outline = '3px solid #1976d2';
                    setTimeout(() => { table.style.outline = ''; }, 1500);
                  }
                } else {
                  // Open add products dialog
                  setAddProductDialogOpen(true);
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <ProductIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h3">{totalProducts}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Products
                </Typography>
                <Typography variant="caption" color="primary.main" sx={{ mt: 0.5, display: 'block' }}>
                  {totalProducts > 0 ? 'Click to view →' : 'Click to add →'}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardActionArea
              disabled={totalSystems === 0}
              onClick={() => {
                if (totalSystems > 0 && framework.products?.[0]) {
                  // Navigate to first product that has systems
                  const productWithSystems = framework.products.find((p: FrameworkProduct) => (p.systemCount || 0) > 0);
                  if (productWithSystems) {
                    navigate(`/products/${productWithSystems.id}`);
                  }
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <SystemIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h3">{totalSystems}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Systems
                </Typography>
                {totalSystems > 0 && (
                  <Typography variant="caption" color="primary.main" sx={{ mt: 0.5, display: 'block' }}>
                    Click to view →
                  </Typography>
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardActionArea
              disabled={!framework.products?.[0]}
              onClick={() => {
                // Navigate to first product's baseline if available
                if (framework.products?.[0]) {
                  navigate(`/products/${framework.products[0].id}/baseline`);
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <ControlIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h3">
                  {totalControls}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Controls
                </Typography>
                {framework.products?.[0] && (
                  <Typography variant="caption" color="primary.main" sx={{ mt: 0.5, display: 'block' }}>
                    Click to configure →
                  </Typography>
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon
                sx={{ fontSize: 40, color: `${getComplianceColor(avgCompliance)}.main`, mb: 1 }}
              />
              <Typography variant="h3" color={`${getComplianceColor(avgCompliance)}.main`}>
                {avgCompliance}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Compliance
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Products Table */}
      {framework.products && framework.products.length > 0 ? (
        <TableContainer component={Paper} id="products-table">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Criticality</TableCell>
                <TableCell align="center">Systems</TableCell>
                <TableCell align="center">Controls</TableCell>
                <TableCell>Compliance</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {framework.products.map((product: FrameworkProduct) => (
                <TableRow
                  key={product.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {product.name}
                      </Typography>
                      {product.description && (
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                          {product.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={product.type?.replace('_', ' ')} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={product.criticality}
                      color={
                        product.criticality === 'CRITICAL'
                          ? 'error'
                          : product.criticality === 'HIGH'
                          ? 'warning'
                          : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Link
                      component="button"
                      variant="body2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/products/${product.id}`);
                      }}
                      sx={{ fontWeight: 'bold' }}
                    >
                      {product.systemCount}
                    </Link>
                  </TableCell>
                  <TableCell align="center">
                    <Link
                      component="button"
                      variant="body2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/products/${product.id}/baseline`);
                      }}
                      sx={{ fontWeight: 'bold' }}
                    >
                      {product.controlCount || 0}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={product.complianceScore}
                        color={getComplianceColor(product.complianceScore)}
                        sx={{ width: 80, height: 8, borderRadius: 1 }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={`${getComplianceColor(product.complianceScore)}.main`}
                      >
                        {product.complianceScore}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove from framework">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveProduct(product.id);
                        }}
                      >
                        <RemoveIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState
          type="products"
          title="No Products in this Framework"
          description="Add products to this framework to track compliance across your business domain."
          actionLabel="Add Products"
          onAction={() => setAddProductDialogOpen(true)}
          icon={<ProductIcon sx={{ fontSize: 64, color: 'text.disabled' }} />}
        />
      )}

      {/* Add Products Dialog */}
      <Dialog
        open={addProductDialogOpen}
        onClose={() => setAddProductDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Products to {framework.name}</DialogTitle>
        <DialogContent>
          {availableProducts.length > 0 ? (
            <List>
              {availableProducts.map((product: Product) => (
                <ListItem key={product.id} dense>
                  <ListItemText
                    primary={product.name}
                    secondary={product.description}
                  />
                  <ListItemSecondaryAction>
                    <Checkbox
                      edge="end"
                      checked={selectedProducts.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts([...selectedProducts, product.id]);
                        } else {
                          setSelectedProducts(selectedProducts.filter((id) => id !== product.id));
                        }
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No available products to add. All products are already assigned to frameworks.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddProductDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddProducts}
            disabled={selectedProducts.length === 0 || addProductToFramework.isPending}
          >
            {addProductToFramework.isPending ? (
              <CircularProgress size={20} />
            ) : (
              `Add ${selectedProducts.length} Product${selectedProducts.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FrameworkDetails;

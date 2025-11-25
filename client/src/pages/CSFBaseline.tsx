/**
 * CSF Baseline Configuration Page
 *
 * Comprehensive interface for selecting which NIST CSF controls apply to a product.
 * Features include templates, hierarchical control browser, filtering, and detailed analytics.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Checkbox,
  Divider,
  Paper,
  IconButton,
  Alert,
  LinearProgress,
  Stack,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
} from '@mui/material';
import {
  Save as SaveIcon,
  Search as SearchIcon,
  Assessment as AssessmentIcon,
  Info as InfoIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as CollapseIcon,
  CheckCircle as CheckCircleIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useProducts } from '../hooks/useProducts';
import { useCSFFunctions, useCSFCategories, useCSFSubcategories } from '../hooks/useCSF';
import { useProductBaseline, useUpdateBaseline } from '../hooks/useBaseline';

// Template definitions
interface BaselineTemplate {
  name: string;
  description: string;
  controlCount: number;
  // In production, these would be actual control IDs
  controls: string[];
}

const BASELINE_TEMPLATES: BaselineTemplate[] = [
  {
    name: 'Minimum Viable Security',
    description: 'Essential controls for basic security posture (~30 controls)',
    controlCount: 30,
    controls: [], // Would be populated with essential control IDs
  },
  {
    name: 'Standard Enterprise',
    description: 'Typical enterprise baseline (~80 controls)',
    controlCount: 80,
    controls: [], // Would be populated with standard control IDs
  },
  {
    name: 'High Security',
    description: 'Comprehensive security coverage (~150 controls)',
    controlCount: 150,
    controls: [], // Would be populated with high-security control IDs
  },
  {
    name: 'Full CSF Coverage',
    description: 'All 185 controls',
    controlCount: 185,
    controls: [], // Would include all control IDs
  },
];

// Priority levels
type PriorityLevel = 'MUST_HAVE' | 'SHOULD_HAVE';

// Control selection state
interface ControlSelection {
  subcategoryId: string;
  applicable: boolean;
  categoryLevel: PriorityLevel | null;
  justification: string;
}

// Filter state
interface FilterState {
  search: string;
  functionCode: string;
  selectionStatus: 'all' | 'selected' | 'not_selected';
  priority: 'all' | 'MUST_HAVE' | 'SHOULD_HAVE';
}

// Function colors for visualization
const FUNCTION_COLORS: Record<string, string> = {
  GV: '#1976d2',
  ID: '#2e7d32',
  PR: '#ed6c02',
  DE: '#9c27b0',
  RS: '#d32f2f',
  RC: '#0288d1',
};

const CSFBaseline: React.FC = () => {
  // State management
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedControls, setExpandedControls] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    functionCode: '',
    selectionStatus: 'all',
    priority: 'all',
  });
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // API hooks
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: functions, isLoading: functionsLoading } = useCSFFunctions();
  const { data: categories, isLoading: categoriesLoading } = useCSFCategories();
  const { data: subcategories, isLoading: subcategoriesLoading } = useCSFSubcategories();
  const { data: baseline } = useProductBaseline(selectedProductId, {
    enabled: !!selectedProductId,
  });
  const updateBaseline = useUpdateBaseline({
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  // Control selections state (local until saved)
  const [selections, setSelections] = useState<Map<string, ControlSelection>>(new Map());

  // Initialize selections from baseline when loaded
  React.useEffect(() => {
    if (baseline && subcategories) {
      const newSelections = new Map<string, ControlSelection>();
      subcategories.forEach((sub) => {
        const isSelected = baseline.controlIds?.includes(sub.id);
        newSelections.set(sub.id, {
          subcategoryId: sub.id,
          applicable: isSelected,
          categoryLevel: isSelected ? 'SHOULD_HAVE' : null,
          justification: '',
        });
      });
      setSelections(newSelections);
    }
  }, [baseline, subcategories]);

  // Build hierarchical structure
  const hierarchy = useMemo(() => {
    if (!functions || !categories || !subcategories) return [];

    return functions.map((func) => {
      const funcCategories = categories
        .filter((cat) => cat.functionId === func.id)
        .map((cat) => {
          const catSubcategories = subcategories.filter(
            (sub) => sub.categoryId === cat.id
          );
          return { ...cat, subcategories: catSubcategories };
        });
      return { ...func, categories: funcCategories };
    });
  }, [functions, categories, subcategories]);

  // Apply filters
  const filteredHierarchy = useMemo(() => {
    if (!hierarchy.length) return [];

    let filtered = hierarchy;

    // Filter by function
    if (filters.functionCode) {
      filtered = filtered.filter((func) => func.code === filters.functionCode);
    }

    // Filter by search, selection status, and priority
    if (filters.search || filters.selectionStatus !== 'all' || filters.priority !== 'all') {
      filtered = filtered
        .map((func) => ({
          ...func,
          categories: func.categories
            .map((cat) => ({
              ...cat,
              subcategories: cat.subcategories.filter((sub) => {
                const selection = selections.get(sub.id);

                // Search filter
                if (filters.search) {
                  const searchLower = filters.search.toLowerCase();
                  const matchesSearch =
                    sub.code.toLowerCase().includes(searchLower) ||
                    sub.name.toLowerCase().includes(searchLower) ||
                    sub.description?.toLowerCase().includes(searchLower);
                  if (!matchesSearch) return false;
                }

                // Selection status filter
                if (filters.selectionStatus === 'selected' && !selection?.applicable) {
                  return false;
                }
                if (filters.selectionStatus === 'not_selected' && selection?.applicable) {
                  return false;
                }

                // Priority filter
                if (
                  filters.priority !== 'all' &&
                  selection?.categoryLevel !== filters.priority
                ) {
                  return false;
                }

                return true;
              }),
            }))
            .filter((cat) => cat.subcategories.length > 0),
        }))
        .filter((func) => func.categories.length > 0);
    }

    return filtered;
  }, [hierarchy, filters, selections]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = subcategories?.length || 185;
    const selected = Array.from(selections.values()).filter((s) => s.applicable).length;
    const mustHave = Array.from(selections.values()).filter(
      (s) => s.applicable && s.categoryLevel === 'MUST_HAVE'
    ).length;
    const shouldHave = Array.from(selections.values()).filter(
      (s) => s.applicable && s.categoryLevel === 'SHOULD_HAVE'
    ).length;

    // By function breakdown
    const byFunction: Record<string, number> = {};
    if (functions && categories && subcategories) {
      functions.forEach((func) => {
        const funcCategories = categories.filter((cat) => cat.functionId === func.id);
        const funcSubcategories = subcategories.filter((sub) =>
          funcCategories.some((cat) => cat.id === sub.categoryId)
        );
        const selectedInFunc = funcSubcategories.filter(
          (sub) => selections.get(sub.id)?.applicable
        ).length;
        byFunction[func.code] = selectedInFunc;
      });
    }

    return {
      total,
      selected,
      mustHave,
      shouldHave,
      byFunction,
    };
  }, [selections, functions, categories, subcategories]);

  // Chart data
  const chartData = useMemo(() => {
    return Object.entries(statistics.byFunction).map(([code, count]) => ({
      name: code,
      value: count,
      color: FUNCTION_COLORS[code] || '#999999',
    }));
  }, [statistics.byFunction]);

  // Handlers
  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    setSelections(new Map());
  };

  const handleToggleFunction = (functionCode: string) => {
    setExpandedFunctions((prev) => {
      const next = new Set(prev);
      if (next.has(functionCode)) {
        next.delete(functionCode);
      } else {
        next.add(functionCode);
      }
      return next;
    });
  };

  const handleToggleCategory = (categoryCode: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryCode)) {
        next.delete(categoryCode);
      } else {
        next.add(categoryCode);
      }
      return next;
    });
  };

  const handleToggleControlDetails = (subcategoryCode: string) => {
    setExpandedControls((prev) => {
      const next = new Set(prev);
      if (next.has(subcategoryCode)) {
        next.delete(subcategoryCode);
      } else {
        next.add(subcategoryCode);
      }
      return next;
    });
  };

  const handleToggleControl = (subcategoryId: string, checked: boolean) => {
    setSelections((prev) => {
      const next = new Map(prev);
      const current = next.get(subcategoryId) || {
        subcategoryId,
        applicable: false,
        categoryLevel: null,
        justification: '',
      };
      next.set(subcategoryId, {
        ...current,
        applicable: checked,
        categoryLevel: checked ? 'SHOULD_HAVE' : null,
      });
      return next;
    });
  };

  const handlePriorityChange = (subcategoryId: string, priority: PriorityLevel) => {
    setSelections((prev) => {
      const next = new Map(prev);
      const current = next.get(subcategoryId);
      if (current) {
        next.set(subcategoryId, { ...current, categoryLevel: priority });
      }
      return next;
    });
  };

  const handleJustificationChange = (subcategoryId: string, justification: string) => {
    setSelections((prev) => {
      const next = new Map(prev);
      const current = next.get(subcategoryId);
      if (current) {
        next.set(subcategoryId, { ...current, justification });
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.forEach((value, key) => {
        next.set(key, { ...value, applicable: true, categoryLevel: 'SHOULD_HAVE' });
      });
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.forEach((value, key) => {
        next.set(key, { ...value, applicable: false, categoryLevel: null });
      });
      return next;
    });
  };

  const handleApplyTemplate = (template: BaselineTemplate) => {
    // In production, this would apply the template's control selection
    // For now, we'll simulate by selecting a percentage based on count
    const allSubcategoryIds = Array.from(selections.keys());
    const percentage = template.controlCount / 185;
    const countToSelect = Math.floor(allSubcategoryIds.length * percentage);

    setSelections((prev) => {
      const next = new Map(prev);
      // First deselect all
      next.forEach((value, key) => {
        next.set(key, { ...value, applicable: false, categoryLevel: null });
      });
      // Then select the first N
      allSubcategoryIds.slice(0, countToSelect).forEach((id) => {
        const current = next.get(id);
        if (current) {
          next.set(id, { ...current, applicable: true, categoryLevel: 'SHOULD_HAVE' });
        }
      });
      return next;
    });

    setTemplateDialogOpen(false);
  };

  const handleSave = async () => {
    if (!selectedProductId) return;

    const selectedControlIds = Array.from(selections.entries())
      .filter(([_, selection]) => selection.applicable)
      .map(([id, _]) => id);

    await updateBaseline.mutateAsync({
      productId: selectedProductId,
      updates: {
        controlIds: selectedControlIds,
        description: `Baseline with ${selectedControlIds.length} controls`,
      },
    });
  };

  // Loading state
  if (productsLoading || functionsLoading || categoriesLoading || subcategoriesLoading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
        <Typography sx={{ textAlign: 'center', mt: 2 }}>Loading CSF data...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          CSF Baseline Configuration
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Select which NIST CSF controls apply to your product. Use templates for quick start
          or customize your baseline control by control.
        </Typography>
      </Box>

      {/* Success Alert */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSaveSuccess(false)}>
          Baseline saved successfully!
        </Alert>
      )}

      {/* Controls Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth required>
            <InputLabel>Product</InputLabel>
            <Select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              label="Product"
            >
              {products?.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ height: '56px' }}
            startIcon={<AssessmentIcon />}
            onClick={() => setTemplateDialogOpen(true)}
            disabled={!selectedProductId}
          >
            Load Template
          </Button>
        </Grid>
        <Grid item xs={12} md={2}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ height: '56px' }}
            onClick={handleSelectAll}
            disabled={!selectedProductId}
          >
            Select All
          </Button>
        </Grid>
        <Grid item xs={12} md={2}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ height: '56px' }}
            onClick={handleDeselectAll}
            disabled={!selectedProductId}
          >
            Deselect All
          </Button>
        </Grid>
        <Grid item xs={12} md={2}>
          <Button
            variant="contained"
            fullWidth
            sx={{ height: '56px' }}
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!selectedProductId || updateBaseline.isPending}
          >
            {updateBaseline.isPending ? 'Saving...' : 'Save'}
          </Button>
        </Grid>
      </Grid>

      {/* Progress Indicator */}
      {selectedProductId && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                Progress: {statistics.selected} of {statistics.total} controls selected
              </Typography>
              <Chip
                icon={<CheckCircleIcon />}
                label={`${Math.round((statistics.selected / statistics.total) * 100)}%`}
                color="primary"
                variant="outlined"
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={(statistics.selected / statistics.total) * 100}
              sx={{ mt: 2, height: 8, borderRadius: 4 }}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {!selectedProductId ? (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <DashboardIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Select a Product to Begin
              </Typography>
              <Typography color="text.secondary">
                Choose a product from the dropdown above to configure its CSF baseline
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {/* Control Browser */}
          <Grid item xs={12} lg={9}>
            <Card>
              <CardContent>
                {/* Filters */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      placeholder="Search controls..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Function</InputLabel>
                      <Select
                        value={filters.functionCode}
                        onChange={(e) =>
                          setFilters({ ...filters, functionCode: e.target.value })
                        }
                        label="Function"
                      >
                        <MenuItem value="">All Functions</MenuItem>
                        {functions?.map((func) => (
                          <MenuItem key={func.code} value={func.code}>
                            {func.code} - {func.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={filters.selectionStatus}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            selectionStatus: e.target.value as FilterState['selectionStatus'],
                          })
                        }
                        label="Status"
                      >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="selected">Selected</MenuItem>
                        <MenuItem value="not_selected">Not Selected</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={filters.priority}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            priority: e.target.value as FilterState['priority'],
                          })
                        }
                        label="Priority"
                      >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="MUST_HAVE">Must Have</MenuItem>
                        <MenuItem value="SHOULD_HAVE">Should Have</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Divider sx={{ mb: 2 }} />

                {/* Hierarchical Control Tree */}
                <Box>
                  {filteredHierarchy.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">
                        No controls match your filters
                      </Typography>
                    </Box>
                  ) : (
                    filteredHierarchy.map((func) => (
                      <Box key={func.code} sx={{ mb: 2 }}>
                        {/* Function Level */}
                        <Paper
                          elevation={0}
                          sx={{
                            bgcolor: FUNCTION_COLORS[func.code] + '15',
                            border: `2px solid ${FUNCTION_COLORS[func.code]}`,
                            borderRadius: 2,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              p: 2,
                              cursor: 'pointer',
                            }}
                            onClick={() => handleToggleFunction(func.code)}
                          >
                            <IconButton size="small" sx={{ mr: 1 }}>
                              {expandedFunctions.has(func.code) ? (
                                <ExpandLessIcon />
                              ) : (
                                <CollapseIcon />
                              )}
                            </IconButton>
                            <Chip
                              label={func.code}
                              sx={{
                                bgcolor: FUNCTION_COLORS[func.code],
                                color: 'white',
                                fontWeight: 'bold',
                                mr: 2,
                              }}
                            />
                            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                              {func.name}
                            </Typography>
                            <Chip
                              label={`${statistics.byFunction[func.code] || 0} selected`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>

                          {/* Categories */}
                          <Collapse in={expandedFunctions.has(func.code)}>
                            <Box sx={{ px: 2, pb: 2 }}>
                              {func.categories.map((cat) => (
                                <Box key={cat.code} sx={{ mb: 2 }}>
                                  <Paper
                                    elevation={0}
                                    sx={{
                                      bgcolor: 'background.default',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      borderRadius: 1,
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        p: 1.5,
                                        cursor: 'pointer',
                                      }}
                                      onClick={() => handleToggleCategory(cat.code)}
                                    >
                                      <IconButton size="small" sx={{ mr: 1 }}>
                                        {expandedCategories.has(cat.code) ? (
                                          <ExpandLessIcon />
                                        ) : (
                                          <CollapseIcon />
                                        )}
                                      </IconButton>
                                      <Typography
                                        variant="subtitle1"
                                        fontWeight="medium"
                                        sx={{ flexGrow: 1 }}
                                      >
                                        {cat.code} - {cat.name}
                                      </Typography>
                                      <Chip
                                        label={`${
                                          cat.subcategories.filter(
                                            (sub) => selections.get(sub.id)?.applicable
                                          ).length
                                        }/${cat.subcategories.length}`}
                                        size="small"
                                      />
                                    </Box>

                                    {/* Subcategories (Controls) */}
                                    <Collapse in={expandedCategories.has(cat.code)}>
                                      <Divider />
                                      <Box sx={{ p: 1 }}>
                                        {cat.subcategories.map((sub) => {
                                          const selection = selections.get(sub.id);
                                          const isSelected = selection?.applicable || false;
                                          const isExpanded = expandedControls.has(sub.code);

                                          return (
                                            <Box
                                              key={sub.code}
                                              sx={{
                                                mb: 1,
                                                border: '1px solid',
                                                borderColor: isSelected
                                                  ? 'primary.main'
                                                  : 'divider',
                                                borderRadius: 1,
                                                bgcolor: isSelected
                                                  ? 'primary.50'
                                                  : 'background.paper',
                                              }}
                                            >
                                              {/* Control Row */}
                                              <Box
                                                sx={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  p: 1.5,
                                                }}
                                              >
                                                <Checkbox
                                                  checked={isSelected}
                                                  onChange={(e) =>
                                                    handleToggleControl(
                                                      sub.id,
                                                      e.target.checked
                                                    )
                                                  }
                                                  sx={{ mr: 1 }}
                                                />
                                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                  <Typography
                                                    variant="body2"
                                                    fontWeight="medium"
                                                  >
                                                    {sub.code} - {sub.name}
                                                  </Typography>
                                                </Box>
                                                {isSelected && (
                                                  <FormControl
                                                    size="small"
                                                    sx={{ minWidth: 140, mr: 1 }}
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    <Select
                                                      value={selection?.categoryLevel || ''}
                                                      onChange={(e) =>
                                                        handlePriorityChange(
                                                          sub.id,
                                                          e.target.value as PriorityLevel
                                                        )
                                                      }
                                                      displayEmpty
                                                    >
                                                      <MenuItem value="MUST_HAVE">
                                                        MUST HAVE
                                                      </MenuItem>
                                                      <MenuItem value="SHOULD_HAVE">
                                                        SHOULD HAVE
                                                      </MenuItem>
                                                    </Select>
                                                  </FormControl>
                                                )}
                                                <IconButton
                                                  size="small"
                                                  onClick={() =>
                                                    handleToggleControlDetails(sub.code)
                                                  }
                                                >
                                                  <InfoIcon fontSize="small" />
                                                </IconButton>
                                              </Box>

                                              {/* Control Details */}
                                              <Collapse in={isExpanded}>
                                                <Divider />
                                                <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                                                  <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    gutterBottom
                                                  >
                                                    <strong>Description:</strong>{' '}
                                                    {sub.description}
                                                  </Typography>

                                                  {sub.implementationExamples &&
                                                    sub.implementationExamples.length > 0 && (
                                                      <Box sx={{ mt: 2 }}>
                                                        <Typography
                                                          variant="body2"
                                                          fontWeight="medium"
                                                          gutterBottom
                                                        >
                                                          Implementation Examples:
                                                        </Typography>
                                                        <List dense>
                                                          {sub.implementationExamples.map(
                                                            (example, idx) => (
                                                              <ListItem key={idx} sx={{ pl: 0 }}>
                                                                <ListItemIcon sx={{ minWidth: 32 }}>
                                                                  <CheckCircleIcon
                                                                    fontSize="small"
                                                                    color="success"
                                                                  />
                                                                </ListItemIcon>
                                                                <ListItemText
                                                                  primary={example}
                                                                  primaryTypographyProps={{
                                                                    variant: 'body2',
                                                                  }}
                                                                />
                                                              </ListItem>
                                                            )
                                                          )}
                                                        </List>
                                                      </Box>
                                                    )}

                                                  <Box sx={{ mt: 2 }}>
                                                    <Typography
                                                      variant="body2"
                                                      fontWeight="medium"
                                                      gutterBottom
                                                    >
                                                      Justification:
                                                    </Typography>
                                                    <TextField
                                                      fullWidth
                                                      multiline
                                                      rows={2}
                                                      size="small"
                                                      placeholder="Why is this control included/excluded?"
                                                      value={selection?.justification || ''}
                                                      onChange={(e) =>
                                                        handleJustificationChange(
                                                          sub.id,
                                                          e.target.value
                                                        )
                                                      }
                                                      onClick={(e) => e.stopPropagation()}
                                                    />
                                                  </Box>
                                                </Box>
                                              </Collapse>
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    </Collapse>
                                  </Paper>
                                </Box>
                              ))}
                            </Box>
                          </Collapse>
                        </Paper>
                      </Box>
                    ))
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Statistics Sidebar */}
          <Grid item xs={12} lg={3}>
            <Stack spacing={2}>
              {/* Summary Card */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Summary
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Available
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {statistics.total}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Selected
                      </Typography>
                      <Typography variant="h5" fontWeight="bold" color="primary">
                        {statistics.selected}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">MUST HAVE</Typography>
                        <Chip
                          label={statistics.mustHave}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">SHOULD HAVE</Typography>
                        <Chip
                          label={statistics.shouldHave}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* Function Breakdown */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    By Function
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ mt: 2 }}>
                    {Object.entries(statistics.byFunction).map(([code, count]) => (
                      <Box
                        key={code}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: FUNCTION_COLORS[code],
                              mr: 1,
                            }}
                          />
                          <Typography variant="body2">{code}</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold">
                          {count}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      )}

      {/* Template Selection Dialog */}
      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Quick Start Templates</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Select a pre-defined template to quickly populate your baseline configuration.
            You can customize the selection after applying a template.
          </Typography>
          <List>
            {BASELINE_TEMPLATES.map((template) => (
              <ListItem
                key={template.name}
                button
                onClick={() => handleApplyTemplate(template)}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemText
                  primary={template.name}
                  secondary={template.description}
                  primaryTypographyProps={{ fontWeight: 'medium' }}
                />
                <Chip label={`${template.controlCount} controls`} color="primary" />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CSFBaseline;

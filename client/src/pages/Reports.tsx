/**
 * Reports Page
 *
 * Central hub for generating compliance reports and exports.
 * Supports multiple report types: PDF audit reports, Excel workbooks, CSV exports.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Autocomplete,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Description as CsvIcon,
  Assessment as AuditIcon,
  Summarize as SummaryIcon,
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
  Business as ProductIcon,
} from '@mui/icons-material';
import { useProducts } from '../hooks/useProducts';
import { useAssessmentMatrix } from '../hooks/useAssessments';
import { useSystems } from '../hooks/useSystems';
import { useNotification } from '../contexts/NotificationContext';
import {
  exportToCSV,
  exportToExcel,
  exportMatrixToPDF,
  exportFullReportToExcel,
  exportAuditReportToPDF,
  exportAuditWorkbookToExcel,
  ExportProduct,
  ExportAssessment,
} from '../services/exportService';

// Report type definitions
interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  format: 'pdf' | 'excel' | 'csv';
  features: string[];
  recommended?: boolean;
}

const REPORT_TYPES: ReportType[] = [
  {
    id: 'audit-pdf',
    name: 'Audit Report (PDF)',
    description: 'Professional compliance audit report for auditors and executives',
    icon: <AuditIcon fontSize="large" />,
    format: 'pdf',
    features: [
      'Cover page with compliance score',
      'Executive summary with statistics',
      'Gap analysis by function',
      'Evidence documentation references',
    ],
    recommended: true,
  },
  {
    id: 'audit-excel',
    name: 'Audit Workbook (Excel)',
    description: 'Comprehensive multi-sheet workbook for detailed audit review',
    icon: <ExcelIcon fontSize="large" />,
    format: 'excel',
    features: [
      'Cover sheet with summary',
      'Full assessment matrix',
      'Gap analysis worksheet',
      'Evidence log',
      'Audit trail history',
    ],
  },
  {
    id: 'matrix-pdf',
    name: 'Assessment Matrix (PDF)',
    description: 'Visual matrix showing control status across all systems',
    icon: <PdfIcon fontSize="large" />,
    format: 'pdf',
    features: [
      'Color-coded status matrix',
      'System-by-control view',
      'Legend and totals',
      'Print-ready format',
    ],
  },
  {
    id: 'full-excel',
    name: 'Full Report (Excel)',
    description: 'Detailed Excel workbook with summary and per-system sheets',
    icon: <SummaryIcon fontSize="large" />,
    format: 'excel',
    features: [
      'Summary statistics',
      'Assessment matrix',
      'Individual system sheets',
      'Filterable data',
    ],
  },
  {
    id: 'data-csv',
    name: 'Raw Data Export (CSV)',
    description: 'Raw assessment data for custom analysis and integrations',
    icon: <CsvIcon fontSize="large" />,
    format: 'csv',
    features: [
      'All assessment data',
      'Import into other tools',
      'Custom analysis ready',
      'Lightweight format',
    ],
  },
  {
    id: 'simple-excel',
    name: 'Simple Export (Excel)',
    description: 'Quick Excel export of current assessment data',
    icon: <ExcelIcon fontSize="large" />,
    format: 'excel',
    features: [
      'Single sheet export',
      'Quick download',
      'Basic formatting',
      'Editable in Excel',
    ],
  },
];

const Reports: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<string>('audit-pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentReports, setRecentReports] = useState<
    { name: string; type: string; date: string; product: string }[]
  >([]);

  const { showNotification, addNotification } = useNotification();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: systems } = useSystems(selectedProduct || undefined);
  const { data: matrixData, isLoading: matrixLoading } = useAssessmentMatrix(
    selectedProduct || '',
    { enabled: !!selectedProduct }
  );

  // Get the selected product details
  const product = useMemo(() => {
    if (!selectedProduct || !products) return null;
    return products.find((p: any) => p.id === selectedProduct);
  }, [selectedProduct, products]);

  // Prepare export data
  const exportProduct: ExportProduct | null = useMemo(() => {
    if (!product) return null;
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      productType: 'Application', // Default type since Product doesn't have productType
      complianceScore: product.complianceScore || 0,
    };
  }, [product]);

  // Prepare matrix rows for export (transform API format to export format)
  const matrixRows = useMemo(() => {
    if (!matrixData?.rows || !systems) return [];

    // Transform API AssessmentMatrixRow to export format
    return matrixData.rows.map((row: any) => {
      const exportRow: any = {
        functionCode: row.functionCode,
        categoryCode: row.categoryCode,
        controlCode: row.subcategoryCode,
        controlName: row.subcategoryName,
      };

      // Add system statuses as dynamic columns
      systems.forEach((system: any) => {
        const systemData = row.systems?.[system.id];
        exportRow[system.name] = systemData?.status || 'Not Assessed';
      });

      return exportRow;
    });
  }, [matrixData, systems]);

  // Get system names
  const systemNames = useMemo(() => {
    if (!systems) return [];
    return systems.map((s: any) => s.name);
  }, [systems]);

  // Prepare assessments for detailed reports
  const assessments: ExportAssessment[] = useMemo(() => {
    if (!matrixData?.rows || !systems) return [];
    const result: ExportAssessment[] = [];

    matrixData.rows.forEach((row: any) => {
      systems.forEach((system: any) => {
        const systemData = row.systems?.[system.id];
        if (systemData) {
          result.push({
            id: `${row.subcategoryCode}-${system.name}`,
            controlCode: row.subcategoryCode,
            controlName: row.subcategoryName,
            categoryName: row.categoryCode,
            functionName: row.functionCode,
            status: systemData.status || 'Not Assessed',
            notes: '',
            evidence: '',
          });
        }
      });
    });

    return result;
  }, [matrixData, systems]);

  // Handle report generation
  const handleGenerateReport = async () => {
    if (!selectedProduct || !exportProduct) {
      showNotification('Please select a product first', 'warning');
      return;
    }

    if (matrixRows.length === 0) {
      showNotification('No assessment data available for this product', 'warning');
      return;
    }

    setIsGenerating(true);

    try {
      const reportType = REPORT_TYPES.find((r) => r.id === selectedReport);

      switch (selectedReport) {
        case 'audit-pdf':
          exportAuditReportToPDF(exportProduct, assessments);
          break;

        case 'audit-excel':
          exportAuditWorkbookToExcel(
            exportProduct,
            matrixRows,
            systemNames,
            assessments
          );
          break;

        case 'matrix-pdf':
          exportMatrixToPDF(exportProduct.name, matrixRows, systemNames);
          break;

        case 'full-excel':
          exportFullReportToExcel(exportProduct, matrixRows, systemNames);
          break;

        case 'data-csv':
          exportToCSV(matrixRows);
          break;

        case 'simple-excel':
          exportToExcel(matrixRows);
          break;

        default:
          throw new Error('Unknown report type');
      }

      // Track recent report
      setRecentReports((prev) =>
        [
          {
            name: reportType?.name || selectedReport,
            type: reportType?.format || 'unknown',
            date: new Date().toLocaleString(),
            product: exportProduct.name,
          },
          ...prev,
        ].slice(0, 5)
      );

      addNotification({
        message: `${reportType?.name || 'Report'} generated successfully`,
        severity: 'success',
        title: 'Export Complete',
        category: 'general',
      });
    } catch (error) {
      console.error('Report generation error:', error);
      showNotification(
        `Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedReportType = REPORT_TYPES.find((r) => r.id === selectedReport);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Reports & Exports
      </Typography>

      <Grid container spacing={3}>
        {/* Product Selection */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, border: !selectedProduct ? '2px solid' : undefined, borderColor: !selectedProduct ? 'primary.main' : undefined }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}>
                  1
                </Box>
                Select a Product
              </Typography>
              {!selectedProduct && (
                <Chip label="Required" size="small" color="warning" />
              )}
            </Stack>
            {!selectedProduct && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Choose a product to generate compliance reports. Reports include assessment data, gap analysis, and compliance scores.
              </Alert>
            )}
            <FormControl fullWidth>
              <Autocomplete
                options={products || []}
                getOptionLabel={(option: any) => option.name}
                value={products?.find((p: any) => p.id === selectedProduct) || null}
                onChange={(_, newValue) => setSelectedProduct(newValue?.id || '')}
                loading={productsLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Product"
                    placeholder="Select a product to generate reports"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <ProductIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option: any) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ProductIcon fontSize="small" />
                      <Box>
                        <Typography variant="body1">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.productType} - Score:{' '}
                          {Math.round(option.complianceScore || 0)}%
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                )}
              />
            </FormControl>

            {selectedProduct && product && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip
                    label={`Score: ${Math.round(product.complianceScore || 0)}%`}
                    color={
                      (product.complianceScore || 0) >= 80
                        ? 'success'
                        : (product.complianceScore || 0) >= 60
                        ? 'warning'
                        : 'error'
                    }
                  />
                  <Chip label={`${systems?.length || 0} Systems`} variant="outlined" />
                  <Chip
                    label={`${matrixRows.length} Controls`}
                    variant="outlined"
                  />
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Report Type Selection */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, opacity: selectedProduct ? 1 : 0.6 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="span" sx={{
                bgcolor: selectedProduct ? 'primary.main' : 'grey.400',
                color: 'white',
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 600
              }}>
                2
              </Box>
              Select Report Type
            </Typography>
            <Grid container spacing={2}>
              {REPORT_TYPES.map((report) => (
                <Grid item xs={12} sm={6} md={4} key={report.id}>
                  <Card
                    variant={selectedReport === report.id ? 'outlined' : 'elevation'}
                    sx={{
                      cursor: 'pointer',
                      height: '100%',
                      border:
                        selectedReport === report.id
                          ? '2px solid'
                          : '1px solid transparent',
                      borderColor:
                        selectedReport === report.id
                          ? 'primary.main'
                          : 'transparent',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: 4,
                        borderColor: 'primary.light',
                      },
                    }}
                    onClick={() => setSelectedReport(report.id)}
                  >
                    <CardContent>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box
                          sx={{
                            color:
                              selectedReport === report.id
                                ? 'primary.main'
                                : 'text.secondary',
                          }}
                        >
                          {report.icon}
                        </Box>
                        {report.recommended && (
                          <Chip
                            label="Recommended"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                      <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 600 }}>
                        {report.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {report.description}
                      </Typography>
                      <Chip
                        label={report.format.toUpperCase()}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Report Details & Generate */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%', opacity: selectedProduct ? 1 : 0.6 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="span" sx={{
                bgcolor: selectedProduct ? 'primary.main' : 'grey.400',
                color: 'white',
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 600
              }}>
                3
              </Box>
              Generate Report
            </Typography>

            {selectedReportType && (
              <>
                <Box sx={{ mb: 3 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    {selectedReportType.icon}
                    <Typography variant="subtitle1" fontWeight={600}>
                      {selectedReportType.name}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {selectedReportType.description}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Includes:
                </Typography>
                <List dense>
                  {selectedReportType.features.map((feature, idx) => (
                    <ListItem key={idx} sx={{ py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckIcon fontSize="small" color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>

                <Divider sx={{ my: 2 }} />

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={
                    isGenerating ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <DownloadIcon />
                    )
                  }
                  onClick={handleGenerateReport}
                  disabled={
                    !selectedProduct ||
                    isGenerating ||
                    matrixLoading ||
                    matrixRows.length === 0
                  }
                >
                  {isGenerating ? 'Generating...' : 'Generate Report'}
                </Button>

                {!selectedProduct && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Select a product to generate reports
                  </Alert>
                )}

                {selectedProduct && matrixRows.length === 0 && !matrixLoading && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    No assessment data available for this product
                  </Alert>
                )}
              </>
            )}
          </Paper>
        </Grid>

        {/* Recent Reports */}
        {recentReports.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Recent Downloads
              </Typography>
              <List>
                {recentReports.map((report, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon>
                      {report.type === 'pdf' ? (
                        <PdfIcon color="error" />
                      ) : report.type === 'excel' ? (
                        <ExcelIcon color="success" />
                      ) : (
                        <CsvIcon color="primary" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={report.name}
                      secondary={`${report.product} - ${report.date}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Reports;

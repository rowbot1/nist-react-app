import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Description as CsvIcon,
  Summarize as ReportIcon,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';
import {
  exportToCSV,
  exportToExcel,
  exportMatrixToPDF,
  exportFullReportToExcel,
  AssessmentMatrixRow,
  ExportProduct,
} from '../services/exportService';

type ExportFormat = 'csv' | 'excel' | 'pdf' | 'full-report';

interface ExportMenuProps {
  // Product info for reports
  product?: ExportProduct;
  // Matrix data for table exports
  matrixData: AssessmentMatrixRow[];
  // System names for column headers
  systemNames: string[];
  // Button variant
  variant?: 'text' | 'outlined' | 'contained';
  // Button size
  size?: 'small' | 'medium' | 'large';
  // Disable exports
  disabled?: boolean;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  product,
  matrixData,
  systemNames,
  variant = 'outlined',
  size = 'medium',
  disabled = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const { showNotification, addNotification } = useNotification();
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = async (format: ExportFormat) => {
    if (!matrixData || matrixData.length === 0) {
      showNotification('No data available to export', 'warning');
      handleClose();
      return;
    }

    setExporting(format);

    try {
      switch (format) {
        case 'csv':
          exportToCSV(matrixData);
          addNotification({
            message: 'CSV export completed successfully',
            severity: 'success',
            title: 'Export Complete',
            category: 'general',
          });
          break;

        case 'excel':
          exportToExcel(matrixData);
          addNotification({
            message: 'Excel export completed successfully',
            severity: 'success',
            title: 'Export Complete',
            category: 'general',
          });
          break;

        case 'pdf':
          if (!product) {
            showNotification('Product information required for PDF export', 'error');
            break;
          }
          exportMatrixToPDF(product.name, matrixData, systemNames);
          addNotification({
            message: 'PDF matrix export completed successfully',
            severity: 'success',
            title: 'Export Complete',
            category: 'general',
          });
          break;

        case 'full-report':
          if (!product) {
            showNotification('Product information required for full report', 'error');
            break;
          }
          exportFullReportToExcel(product, matrixData, systemNames);
          addNotification({
            message: 'Full compliance report exported successfully',
            severity: 'success',
            title: 'Export Complete',
            category: 'general',
          });
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      showNotification(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setExporting(null);
      handleClose();
    }
  };

  const hasProduct = !!product;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
        onClick={handleClick}
        disabled={disabled || !matrixData || matrixData.length === 0 || !!exporting}
        aria-controls={open ? 'export-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        {exporting ? 'Exporting...' : 'Export'}
      </Button>
      <Menu
        id="export-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'export-button',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Typography
          variant="caption"
          sx={{ px: 2, py: 0.5, color: 'text.secondary', display: 'block' }}
        >
          Quick Exports
        </Typography>
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon>
            <CsvIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export as CSV" secondary="Raw data for analysis" />
        </MenuItem>
        <MenuItem onClick={() => handleExport('excel')}>
          <ListItemIcon>
            <ExcelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export as Excel" secondary="Formatted spreadsheet" />
        </MenuItem>
        {hasProduct && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant="caption"
              sx={{ px: 2, py: 0.5, color: 'text.secondary', display: 'block' }}
            >
              Reports
            </Typography>
            <MenuItem onClick={() => handleExport('pdf')}>
              <ListItemIcon>
                <PdfIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Assessment Matrix (PDF)"
                secondary="Visual compliance matrix"
              />
            </MenuItem>
            <MenuItem onClick={() => handleExport('full-report')}>
              <ListItemIcon>
                <ReportIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Full Compliance Report"
                secondary="Multi-sheet Excel workbook"
              />
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default ExportMenu;

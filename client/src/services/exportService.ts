/**
 * Export Service
 *
 * Provides functionality to export assessment data in various formats:
 * - PDF: Professional compliance reports
 * - Excel: Detailed assessment matrices
 * - CSV: Raw data for further analysis
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ComplianceStatus } from '../types';

// Types
interface ExportProduct {
  id: string;
  name: string;
  description?: string;
  productType?: string;
  complianceScore?: number;
  systems?: ExportSystem[];
}

interface ExportSystem {
  id: string;
  name: string;
  systemType?: string;
  environment?: string;
  assessments?: ExportAssessment[];
}

interface ExportAssessment {
  id: string;
  controlCode: string;
  controlName?: string;
  categoryName?: string;
  functionName?: string;
  status: ComplianceStatus;
  notes?: string;
  evidence?: string;
  assessedAt?: string;
  assessedBy?: string;
}

interface AssessmentMatrixRow {
  functionCode: string;
  categoryCode: string;
  controlCode: string;
  controlName: string;
  [systemName: string]: string; // Dynamic system columns with status
}

// Status to color mapping for PDF (matches ComplianceStatus type)
const STATUS_COLORS: Record<ComplianceStatus, [number, number, number]> = {
  'Implemented': [200, 230, 201], // Light green
  'Partially Implemented': [255, 243, 205], // Light yellow
  'Not Implemented': [255, 205, 210], // Light red
  'Not Assessed': [224, 224, 224], // Light gray
  'Not Applicable': [255, 255, 255], // White
};

// Helper to get current date string
const getDateString = (): string => format(new Date(), 'yyyy-MM-dd');
const getTimestampString = (): string => format(new Date(), 'yyyy-MM-dd_HH-mm-ss');

// Helper to download a blob
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Export assessments to CSV format
 */
export const exportToCSV = (
  data: AssessmentMatrixRow[],
  filename?: string
): void => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from first row
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header] || '';
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"')
            ? `"${escaped}"`
            : escaped;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const defaultFilename = `nist_assessment_${getTimestampString()}.csv`;
  downloadBlob(blob, filename || defaultFilename);
};

/**
 * Export assessments to Excel format
 */
export const exportToExcel = (
  data: AssessmentMatrixRow[],
  sheetName = 'Assessments',
  filename?: string
): void => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const headers = Object.keys(data[0]);
  ws['!cols'] = headers.map((header) => ({
    wch: Math.max(header.length, 15), // Minimum width of 15
  }));

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate buffer and download
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const defaultFilename = `nist_assessment_${getTimestampString()}.xlsx`;
  downloadBlob(blob, filename || defaultFilename);
};

/**
 * Export detailed product report to PDF
 */
export const exportProductToPDF = (
  product: ExportProduct,
  assessments: ExportAssessment[]
): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(25, 118, 210); // Primary blue
  doc.text('NIST CSF 2.0 Compliance Report', pageWidth / 2, yPos, {
    align: 'center',
  });

  // Product name
  yPos += 15;
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(product.name, pageWidth / 2, yPos, { align: 'center' });

  // Report date
  yPos += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, pageWidth / 2, yPos, {
    align: 'center',
  });

  // Compliance score
  yPos += 15;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  const score = product.complianceScore ?? 0;
  doc.text(`Overall Compliance Score: ${Math.round(score)}%`, 20, yPos);

  // Status bar
  yPos += 5;
  const barWidth = 170;
  const barHeight = 8;
  doc.setFillColor(224, 224, 224);
  doc.rect(20, yPos, barWidth, barHeight, 'F');
  doc.setFillColor(score >= 80 ? 76 : score >= 60 ? 255 : 244, score >= 80 ? 175 : score >= 60 ? 152 : 67, score >= 80 ? 80 : score >= 60 ? 0 : 54);
  doc.rect(20, yPos, (barWidth * score) / 100, barHeight, 'F');

  // Executive Summary
  yPos += 20;
  doc.setFontSize(14);
  doc.setTextColor(25, 118, 210);
  doc.text('Executive Summary', 20, yPos);

  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Calculate summary stats (using correct ComplianceStatus values)
  const totalControls = assessments.length;
  const implemented = assessments.filter((a) => a.status === 'Implemented').length;
  const partial = assessments.filter((a) => a.status === 'Partially Implemented').length;
  const notImplemented = assessments.filter((a) => a.status === 'Not Implemented').length;
  const notAssessed = assessments.filter((a) => a.status === 'Not Assessed').length;
  const notApplicable = assessments.filter((a) => a.status === 'Not Applicable').length;

  const summaryLines = [
    `Total Controls: ${totalControls}`,
    `Implemented: ${implemented} (${Math.round((implemented / totalControls) * 100)}%)`,
    `Partially Implemented: ${partial} (${Math.round((partial / totalControls) * 100)}%)`,
    `Not Implemented: ${notImplemented} (${Math.round((notImplemented / totalControls) * 100)}%)`,
    `Not Assessed: ${notAssessed} (${Math.round((notAssessed / totalControls) * 100)}%)`,
    `Not Applicable: ${notApplicable} (${Math.round((notApplicable / totalControls) * 100)}%)`,
  ];

  summaryLines.forEach((line) => {
    doc.text(line, 25, yPos);
    yPos += 6;
  });

  // Assessment Details Table
  yPos += 10;
  doc.setFontSize(14);
  doc.setTextColor(25, 118, 210);
  doc.text('Assessment Details', 20, yPos);

  yPos += 5;

  // Create table data
  const tableData = assessments.map((a) => [
    a.controlCode,
    a.controlName || '',
    a.status,
    a.notes || '-',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Control', 'Name', 'Status', 'Notes']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [25, 118, 210], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 60 },
      2: { cellWidth: 30 },
      3: { cellWidth: 'auto' },
    },
    bodyStyles: { valign: 'top' },
    didParseCell: (data) => {
      if (data.column.index === 2 && data.section === 'body') {
        const status = data.cell.raw as ComplianceStatus;
        const color = STATUS_COLORS[status] || STATUS_COLORS['Not Assessed'];
        data.cell.styles.fillColor = color;
      }
    },
  });

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'NIST Control Mapper - Confidential',
      20,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Save
  doc.save(`${product.name.replace(/\s+/g, '_')}_Compliance_Report_${getDateString()}.pdf`);
};

/**
 * Export assessment matrix to PDF
 */
export const exportMatrixToPDF = (
  productName: string,
  matrixData: AssessmentMatrixRow[],
  systemNames: string[]
): void => {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(25, 118, 210);
  doc.text('NIST CSF 2.0 Assessment Matrix', pageWidth / 2, yPos, {
    align: 'center',
  });

  // Product name
  yPos += 10;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(productName, pageWidth / 2, yPos, { align: 'center' });

  // Date
  yPos += 7;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy')}`, pageWidth / 2, yPos, {
    align: 'center',
  });

  yPos += 10;

  // Create table headers
  const headers = ['Function', 'Category', 'Control', ...systemNames];

  // Create table data
  const tableData = matrixData.map((row) => [
    row.functionCode,
    row.categoryCode,
    row.controlCode,
    ...systemNames.map((name) => row[name] || 'Not Assessed'),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [headers],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [25, 118, 210], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
    },
    didParseCell: (data) => {
      if (data.column.index >= 3 && data.section === 'body') {
        const status = data.cell.raw as ComplianceStatus;
        const color = STATUS_COLORS[status] || STATUS_COLORS['Not Assessed'];
        data.cell.styles.fillColor = color;
      }
    },
  });

  // Legend
  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 100;
  if (finalY + 30 < doc.internal.pageSize.getHeight()) {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Legend:', 14, finalY + 15);

    let legendX = 35;
    Object.entries(STATUS_COLORS).forEach(([status, color]) => {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(legendX, finalY + 11, 8, 8, 'F');
      doc.setFontSize(8);
      doc.text(status, legendX + 10, finalY + 17);
      legendX += 45;
    });
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save
  doc.save(`${productName.replace(/\s+/g, '_')}_Assessment_Matrix_${getDateString()}.pdf`);
};

/**
 * Export multi-sheet Excel workbook with summary and details
 */
export const exportFullReportToExcel = (
  product: ExportProduct,
  matrixData: AssessmentMatrixRow[],
  systemNames: string[]
): void => {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['NIST CSF 2.0 Compliance Report'],
    [''],
    ['Product Name:', product.name],
    ['Product Type:', product.productType || 'N/A'],
    ['Description:', product.description || 'N/A'],
    ['Compliance Score:', `${Math.round(product.complianceScore || 0)}%`],
    ['Report Date:', format(new Date(), 'MMMM dd, yyyy HH:mm')],
    [''],
    ['Systems Assessed:', String(systemNames.length)],
    ['Total Controls:', String(matrixData.length)],
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 20 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // Assessment Matrix sheet
  const matrixWs = XLSX.utils.json_to_sheet(matrixData);
  const matrixHeaders = Object.keys(matrixData[0] || {});
  matrixWs['!cols'] = matrixHeaders.map((h) => ({ wch: Math.max(h.length, 15) }));
  XLSX.utils.book_append_sheet(wb, matrixWs, 'Assessment Matrix');

  // Per-System sheets (if not too many systems)
  if (systemNames.length <= 10) {
    systemNames.forEach((systemName) => {
      const systemData = matrixData.map((row) => ({
        'Function': row.functionCode,
        'Category': row.categoryCode,
        'Control': row.controlCode,
        'Control Name': row.controlName,
        'Status': row[systemName] || 'Not Assessed',
      }));
      const systemWs = XLSX.utils.json_to_sheet(systemData);
      systemWs['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 20 }];
      // Sheet names have max 31 chars
      const sheetName = systemName.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, systemWs, sheetName);
    });
  }

  // Generate and download
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `${product.name.replace(/\s+/g, '_')}_Full_Report_${getDateString()}.xlsx`);
};

// Export types for use in components
export type { ExportProduct, ExportSystem, ExportAssessment, AssessmentMatrixRow };

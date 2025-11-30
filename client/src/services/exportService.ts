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
      'Posture - Confidential',
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

/**
 * Export executive audit report to PDF
 * Full professional compliance report for auditors
 */
export const exportAuditReportToPDF = (
  product: ExportProduct,
  assessments: ExportAssessment[],
  riskSummary?: {
    overallScore: number;
    highRiskCount: number;
    criticalGaps: string[];
    trends: { period: string; score: number }[];
  },
  auditTrail?: {
    lastAssessed: string;
    assessor: string;
    reviewedBy?: string;
    approvedBy?: string;
  }
): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // ===== COVER PAGE =====
  doc.setFillColor(25, 118, 210);
  doc.rect(0, 0, pageWidth, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('NIST CSF 2.0', pageWidth / 2, 25, { align: 'center' });
  doc.setFontSize(18);
  doc.text('Compliance Audit Report', pageWidth / 2, 38, { align: 'center' });
  doc.setFontSize(12);
  doc.text(product.name, pageWidth / 2, 52, { align: 'center' });

  yPos = 80;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);

  // Report metadata box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(20, yPos, pageWidth - 40, 50, 3, 3, 'FD');

  yPos += 12;
  doc.setFontSize(10);
  doc.text('Report Date:', 30, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(format(new Date(), 'MMMM dd, yyyy'), 70, yPos);
  doc.setFont('helvetica', 'normal');

  yPos += 10;
  doc.text('Product Type:', 30, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(product.productType || 'Not Specified', 70, yPos);
  doc.setFont('helvetica', 'normal');

  yPos += 10;
  if (auditTrail?.assessor) {
    doc.text('Assessed By:', 30, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(auditTrail.assessor, 70, yPos);
    doc.setFont('helvetica', 'normal');
  }

  yPos += 10;
  if (auditTrail?.lastAssessed) {
    doc.text('Assessment Date:', 30, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(auditTrail.lastAssessed, 85, yPos);
    doc.setFont('helvetica', 'normal');
  }

  // Compliance Score Gauge
  yPos = 150;
  const score = product.complianceScore ?? 0;
  const gaugeRadius = 40;
  const gaugeCenterX = pageWidth / 2;
  const gaugeCenterY = yPos + 40;

  // Draw gauge background
  doc.setDrawColor(224, 224, 224);
  doc.setLineWidth(8);
  doc.circle(gaugeCenterX, gaugeCenterY, gaugeRadius, 'S');

  // Draw gauge progress
  const scoreColor = score >= 80 ? [76, 175, 80] : score >= 60 ? [255, 152, 0] : [244, 67, 54];
  doc.setDrawColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  // Approximate arc with filled score
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);

  // Score text in center
  doc.setFontSize(28);
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(`${Math.round(score)}%`, gaugeCenterX, gaugeCenterY + 5, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Compliance Score', gaugeCenterX, gaugeCenterY + 18, { align: 'center' });

  // Risk summary if provided
  if (riskSummary) {
    yPos = gaugeCenterY + 50;
    doc.setFontSize(14);
    doc.setTextColor(25, 118, 210);
    doc.text('Risk Overview', 20, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const riskData = [
      ['Risk Score', `${Math.round(riskSummary.overallScore)}/100`],
      ['High Risk Items', String(riskSummary.highRiskCount)],
      ['Critical Gaps', String(riskSummary.criticalGaps.length)],
    ];

    autoTable(doc, {
      startY: yPos,
      body: riskData,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 40 },
      },
    });
  }

  // ===== PAGE 2: EXECUTIVE SUMMARY =====
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setTextColor(25, 118, 210);
  doc.text('Executive Summary', 20, yPos);

  yPos += 15;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const totalControls = assessments.length;
  const implemented = assessments.filter((a) => a.status === 'Implemented').length;
  const partial = assessments.filter((a) => a.status === 'Partially Implemented').length;
  const notImplemented = assessments.filter((a) => a.status === 'Not Implemented').length;
  const notAssessed = assessments.filter((a) => a.status === 'Not Assessed').length;
  const notApplicable = assessments.filter((a) => a.status === 'Not Applicable').length;

  // Status summary table
  const summaryTableData = [
    ['Implemented', String(implemented), `${Math.round((implemented / totalControls) * 100)}%`],
    ['Partially Implemented', String(partial), `${Math.round((partial / totalControls) * 100)}%`],
    ['Not Implemented', String(notImplemented), `${Math.round((notImplemented / totalControls) * 100)}%`],
    ['Not Assessed', String(notAssessed), `${Math.round((notAssessed / totalControls) * 100)}%`],
    ['Not Applicable', String(notApplicable), `${Math.round((notApplicable / totalControls) * 100)}%`],
    ['Total Controls', String(totalControls), '100%'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Status', 'Count', 'Percentage']],
    body: summaryTableData,
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [25, 118, 210] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const status = data.cell.raw as string;
        if (status in STATUS_COLORS) {
          const color = STATUS_COLORS[status as ComplianceStatus];
          data.cell.styles.fillColor = color;
        }
      }
    },
  });

  // Function breakdown
  yPos = (doc as any).lastAutoTable?.finalY + 20 || yPos + 80;
  doc.setFontSize(14);
  doc.setTextColor(25, 118, 210);
  doc.text('Compliance by CSF Function', 20, yPos);

  yPos += 10;

  // Group by function
  const functionGroups = assessments.reduce((acc, a) => {
    const fn = a.functionName || 'Unknown';
    if (!acc[fn]) acc[fn] = { total: 0, implemented: 0 };
    acc[fn].total++;
    if (a.status === 'Implemented' || a.status === 'Partially Implemented') {
      acc[fn].implemented++;
    }
    return acc;
  }, {} as Record<string, { total: number; implemented: number }>);

  const functionTableData = Object.entries(functionGroups).map(([fn, data]) => [
    fn,
    String(data.total),
    String(data.implemented),
    `${Math.round((data.implemented / data.total) * 100)}%`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Function', 'Total', 'Compliant', 'Score']],
    body: functionTableData,
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [25, 118, 210] },
  });

  // ===== PAGE 3+: DETAILED FINDINGS =====
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setTextColor(25, 118, 210);
  doc.text('Detailed Assessment Findings', 20, yPos);

  yPos += 10;

  // High priority items first (Not Implemented)
  const highPriority = assessments.filter((a) => a.status === 'Not Implemented');
  if (highPriority.length > 0) {
    yPos += 5;
    doc.setFontSize(12);
    doc.setTextColor(244, 67, 54);
    doc.text(`High Priority Gaps (${highPriority.length} items)`, 20, yPos);
    yPos += 5;

    const gapTableData = highPriority.slice(0, 15).map((a) => [
      a.controlCode,
      a.controlName || '',
      a.categoryName || '',
      a.notes || 'No remediation notes',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Control', 'Name', 'Category', 'Notes']],
      body: gapTableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [244, 67, 54] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 'auto' },
      },
    });
  }

  // Evidence summary
  const withEvidence = assessments.filter((a) => a.evidence);
  if (withEvidence.length > 0) {
    yPos = (doc as any).lastAutoTable?.finalY + 15 || yPos + 100;

    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(25, 118, 210);
    doc.text(`Evidence Documentation (${withEvidence.length} items)`, 20, yPos);
    yPos += 5;

    const evidenceTableData = withEvidence.slice(0, 20).map((a) => [
      a.controlCode,
      a.status,
      a.evidence?.substring(0, 60) + (a.evidence && a.evidence.length > 60 ? '...' : '') || '',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Control', 'Status', 'Evidence Reference']],
      body: evidenceTableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [25, 118, 210] },
    });
  }

  // ===== FOOTER ON ALL PAGES =====
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('CONFIDENTIAL - Posture Audit Report', 20, pageHeight - 10);
    doc.text(format(new Date(), 'yyyy-MM-dd'), pageWidth - 20, pageHeight - 10, { align: 'right' });
  }

  // Save
  doc.save(`${product.name.replace(/\s+/g, '_')}_Audit_Report_${getDateString()}.pdf`);
};

/**
 * Export comprehensive audit workbook to Excel
 * Multi-sheet workbook with summary, matrix, gaps, evidence, and audit trail
 */
export const exportAuditWorkbookToExcel = (
  product: ExportProduct,
  matrixData: AssessmentMatrixRow[],
  systemNames: string[],
  assessments: ExportAssessment[],
  auditTrail?: { action: string; user: string; timestamp: string; details: string }[]
): void => {
  const wb = XLSX.utils.book_new();

  // 1. Cover Sheet
  const coverData = [
    ['NIST CSF 2.0 COMPLIANCE AUDIT WORKBOOK'],
    [''],
    ['Product Name:', product.name],
    ['Product Type:', product.productType || 'N/A'],
    ['Description:', product.description || 'N/A'],
    ['Compliance Score:', `${Math.round(product.complianceScore || 0)}%`],
    [''],
    ['Report Generated:', format(new Date(), 'MMMM dd, yyyy HH:mm:ss')],
    ['Systems Assessed:', String(systemNames.length)],
    ['Total Controls:', String(matrixData.length)],
    [''],
    ['Sheet Index:'],
    ['  1. Cover - This summary page'],
    ['  2. Assessment Matrix - Full control status matrix'],
    ['  3. Gap Analysis - Controls requiring attention'],
    ['  4. Evidence Log - Documentation references'],
    ['  5. Audit Trail - Change history (if available)'],
  ];
  const coverWs = XLSX.utils.aoa_to_sheet(coverData);
  coverWs['!cols'] = [{ wch: 25 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, coverWs, 'Cover');

  // 2. Assessment Matrix
  const matrixWs = XLSX.utils.json_to_sheet(matrixData);
  const matrixHeaders = Object.keys(matrixData[0] || {});
  matrixWs['!cols'] = matrixHeaders.map((h) => ({ wch: Math.max(h.length, 15) }));
  XLSX.utils.book_append_sheet(wb, matrixWs, 'Assessment Matrix');

  // 3. Gap Analysis (Not Implemented + Partially Implemented)
  const gaps = assessments.filter(
    (a) => a.status === 'Not Implemented' || a.status === 'Partially Implemented'
  );
  const gapData = gaps.map((a) => ({
    'Control Code': a.controlCode,
    'Control Name': a.controlName || '',
    'Category': a.categoryName || '',
    'Function': a.functionName || '',
    'Status': a.status,
    'Priority': a.status === 'Not Implemented' ? 'HIGH' : 'MEDIUM',
    'Notes': a.notes || '',
    'Assessed Date': a.assessedAt || '',
    'Assessed By': a.assessedBy || '',
  }));
  const gapWs = XLSX.utils.json_to_sheet(gapData.length > 0 ? gapData : [{ 'Message': 'No gaps identified - all controls implemented!' }]);
  gapWs['!cols'] = [
    { wch: 15 }, { wch: 40 }, { wch: 25 }, { wch: 15 },
    { wch: 20 }, { wch: 10 }, { wch: 40 }, { wch: 15 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, gapWs, 'Gap Analysis');

  // 4. Evidence Log
  const evidenced = assessments.filter((a) => a.evidence);
  const evidenceData = evidenced.map((a) => ({
    'Control Code': a.controlCode,
    'Control Name': a.controlName || '',
    'Status': a.status,
    'Evidence Reference': a.evidence || '',
    'Assessed Date': a.assessedAt || '',
    'Assessed By': a.assessedBy || '',
  }));
  const evidenceWs = XLSX.utils.json_to_sheet(
    evidenceData.length > 0 ? evidenceData : [{ 'Message': 'No evidence documented yet' }]
  );
  evidenceWs['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 50 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, evidenceWs, 'Evidence Log');

  // 5. Audit Trail
  const trailData = auditTrail && auditTrail.length > 0
    ? auditTrail.map((t) => ({
        'Timestamp': t.timestamp,
        'User': t.user,
        'Action': t.action,
        'Details': t.details,
      }))
    : [{ 'Message': 'Audit trail not available for this export' }];
  const trailWs = XLSX.utils.json_to_sheet(trailData);
  trailWs['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, trailWs, 'Audit Trail');

  // Generate and download
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `${product.name.replace(/\s+/g, '_')}_Audit_Workbook_${getDateString()}.xlsx`);
};

/**
 * Export audit trail to CSV
 * Exports audit logs in a format suitable for compliance documentation
 */
export const exportAuditTrailToCSV = (
  auditLogs: {
    id: string;
    userName: string;
    userEmail: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    entityName?: string | null;
    changedFields?: string[] | null;
    timestamp: string;
    details?: Record<string, unknown> | null;
  }[],
  entityName?: string,
  filename?: string
): void => {
  if (!auditLogs || auditLogs.length === 0) {
    throw new Error('No audit logs to export');
  }

  // Transform to CSV-friendly format
  const csvData = auditLogs.map((log) => ({
    'Timestamp': format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
    'User': log.userName,
    'Email': log.userEmail,
    'Action': log.action,
    'Entity Type': log.entityType,
    'Entity ID': log.entityId || '',
    'Entity Name': log.entityName || '',
    'Changed Fields': log.changedFields?.join(', ') || '',
    'Details': log.details ? JSON.stringify(log.details) : '',
  }));

  // Get headers from first row
  const headers = Object.keys(csvData[0]);

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...csvData.map((row) =>
      headers
        .map((header) => {
          const value = row[header as keyof typeof row] || '';
          // Escape quotes and wrap in quotes if contains comma or newline
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
            ? `"${escaped}"`
            : escaped;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const defaultFilename = entityName
    ? `${entityName.replace(/\s+/g, '_')}_Audit_Trail_${getTimestampString()}.csv`
    : `Audit_Trail_${getTimestampString()}.csv`;
  downloadBlob(blob, filename || defaultFilename);
};

/**
 * Export audit trail to Excel with multiple sheets
 */
export const exportAuditTrailToExcel = (
  auditLogs: {
    id: string;
    userName: string;
    userEmail: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    entityName?: string | null;
    previousValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    changedFields?: string[] | null;
    timestamp: string;
    details?: Record<string, unknown> | null;
  }[],
  entityName?: string,
  filename?: string
): void => {
  if (!auditLogs || auditLogs.length === 0) {
    throw new Error('No audit logs to export');
  }

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const actionCounts = auditLogs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const userActivity = auditLogs.reduce((acc, log) => {
    if (!acc[log.userName]) {
      acc[log.userName] = { email: log.userEmail, count: 0 };
    }
    acc[log.userName].count++;
    return acc;
  }, {} as Record<string, { email: string; count: number }>);

  const summaryData = [
    ['AUDIT TRAIL EXPORT'],
    [''],
    ['Entity:', entityName || 'All'],
    ['Export Date:', format(new Date(), 'MMMM dd, yyyy HH:mm:ss')],
    ['Total Events:', String(auditLogs.length)],
    ['Date Range:', `${format(new Date(auditLogs[auditLogs.length - 1].timestamp), 'yyyy-MM-dd')} to ${format(new Date(auditLogs[0].timestamp), 'yyyy-MM-dd')}`],
    [''],
    ['Activity by Action:'],
    ...Object.entries(actionCounts).map(([action, count]) => [`  ${action}:`, String(count)]),
    [''],
    ['Activity by User:'],
    ...Object.entries(userActivity).map(([name, data]) => [`  ${name}:`, String(data.count)]),
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 25 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // Full audit log sheet
  const logData = auditLogs.map((log) => ({
    'Timestamp': format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
    'User': log.userName,
    'Email': log.userEmail,
    'Action': log.action,
    'Entity Type': log.entityType,
    'Entity ID': log.entityId || '',
    'Entity Name': log.entityName || '',
    'Changed Fields': log.changedFields?.join(', ') || '',
  }));

  const logWs = XLSX.utils.json_to_sheet(logData);
  logWs['!cols'] = [
    { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 12 },
    { wch: 15 }, { wch: 36 }, { wch: 30 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, logWs, 'Audit Log');

  // Changes detail sheet (only logs with changes)
  const changesLogs = auditLogs.filter((log) => log.changedFields && log.changedFields.length > 0);
  if (changesLogs.length > 0) {
    const changesData: { Timestamp: string; User: string; Action: string; Field: string; 'Previous Value': string; 'New Value': string }[] = [];

    changesLogs.forEach((log) => {
      log.changedFields?.forEach((field) => {
        changesData.push({
          'Timestamp': format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
          'User': log.userName,
          'Action': log.action,
          'Field': field,
          'Previous Value': log.previousValue?.[field] ? String(log.previousValue[field]) : '',
          'New Value': log.newValue?.[field] ? String(log.newValue[field]) : '',
        });
      });
    });

    const changesWs = XLSX.utils.json_to_sheet(changesData);
    changesWs['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 25 }, { wch: 40 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, changesWs, 'Field Changes');
  }

  // Generate and download
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const defaultFilename = entityName
    ? `${entityName.replace(/\s+/g, '_')}_Audit_Trail_${getDateString()}.xlsx`
    : `Audit_Trail_${getDateString()}.xlsx`;
  downloadBlob(blob, filename || defaultFilename);
};

/**
 * POA&M (Plan of Action & Milestones) Types
 * Standard format for federal compliance documentation
 */
export interface POAMItem {
  poamId: string;
  weakness: string;
  controlCode: string;
  controlName: string;
  systemName: string;
  status: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  responsibleParty?: string;
  resourcesRequired?: string;
  scheduledCompletionDate?: string;
  milestones?: string[];
  changes?: string;
  sourceOfWeakness?: string;
  createdDate: string;
  lastUpdatedDate?: string;
}

export interface POAMExportOptions {
  productName: string;
  productId: string;
  exportDate?: Date;
  includeCompliant?: boolean;
  formatType?: 'standard' | 'fisma' | 'nist';
}

/**
 * Generate POA&M items from assessment data
 */
const generatePOAMItems = (
  assessments: Array<{
    controlCode: string;
    controlName?: string;
    systemName: string;
    status: string;
    notes?: string;
    riskLevel?: string;
    remediationPlan?: string;
    assignedTo?: string;
    dueDate?: string;
    assessedAt?: string;
    updatedAt?: string;
  }>,
  options: POAMExportOptions
): POAMItem[] => {
  let poamCounter = 1;

  return assessments
    .filter((a) => !options.includeCompliant && a.status !== 'COMPLIANT' && a.status !== 'Implemented')
    .map((assessment) => {
      const severity = assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'CRITICAL'
        ? assessment.riskLevel as 'High' | 'Critical'
        : assessment.riskLevel === 'MODERATE' || assessment.riskLevel === 'MEDIUM'
          ? 'Moderate'
          : 'Low';

      return {
        poamId: `POAM-${options.productId.slice(0, 8).toUpperCase()}-${String(poamCounter++).padStart(4, '0')}`,
        weakness: assessment.notes || `Control ${assessment.controlCode} requires remediation`,
        controlCode: assessment.controlCode,
        controlName: assessment.controlName || assessment.controlCode,
        systemName: assessment.systemName,
        status: assessment.status === 'NOT_ASSESSED' ? 'Pending' :
                assessment.status === 'NON_COMPLIANT' || assessment.status === 'Not Implemented' ? 'Open' :
                assessment.status === 'PARTIALLY_COMPLIANT' || assessment.status === 'Partially Implemented' ? 'In Progress' : 'Open',
        severity,
        responsibleParty: assessment.assignedTo || 'TBD',
        resourcesRequired: assessment.remediationPlan ? 'See remediation plan' : 'TBD',
        scheduledCompletionDate: assessment.dueDate || '',
        milestones: assessment.remediationPlan ? [assessment.remediationPlan] : [],
        changes: '',
        sourceOfWeakness: 'Security Assessment',
        createdDate: assessment.assessedAt || new Date().toISOString(),
        lastUpdatedDate: assessment.updatedAt || assessment.assessedAt || new Date().toISOString(),
      };
    });
};

/**
 * Export POA&M to Excel (Standard Format)
 * Follows federal POA&M template structure
 */
export const exportPOAMToExcel = (
  assessments: Array<{
    controlCode: string;
    controlName?: string;
    systemName: string;
    status: string;
    notes?: string;
    riskLevel?: string;
    remediationPlan?: string;
    assignedTo?: string;
    dueDate?: string;
    assessedAt?: string;
    updatedAt?: string;
  }>,
  options: POAMExportOptions
): void => {
  const poamItems = generatePOAMItems(assessments, options);

  if (poamItems.length === 0) {
    throw new Error('No POA&M items to export (all controls are compliant)');
  }

  const wb = XLSX.utils.book_new();
  const exportDate = options.exportDate || new Date();

  // Cover Sheet
  const coverData = [
    ['PLAN OF ACTION AND MILESTONES (POA&M)'],
    [''],
    ['System/Product Name:', options.productName],
    ['Export Date:', format(exportDate, 'MMMM dd, yyyy')],
    ['Prepared By:', 'NIST Control Mapper'],
    [''],
    ['SUMMARY'],
    ['Total Open Items:', String(poamItems.filter((i) => i.status === 'Open').length)],
    ['In Progress Items:', String(poamItems.filter((i) => i.status === 'In Progress').length)],
    ['Pending Items:', String(poamItems.filter((i) => i.status === 'Pending').length)],
    [''],
    ['By Severity:'],
    ['  Critical:', String(poamItems.filter((i) => i.severity === 'Critical').length)],
    ['  High:', String(poamItems.filter((i) => i.severity === 'High').length)],
    ['  Moderate:', String(poamItems.filter((i) => i.severity === 'Moderate').length)],
    ['  Low:', String(poamItems.filter((i) => i.severity === 'Low').length)],
  ];

  const coverWs = XLSX.utils.aoa_to_sheet(coverData);
  coverWs['!cols'] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, coverWs, 'Cover');

  // Main POA&M Sheet
  const poamData = poamItems.map((item) => ({
    'POA&M ID': item.poamId,
    'Weakness/Deficiency': item.weakness,
    'Control ID': item.controlCode,
    'Control Name': item.controlName,
    'System': item.systemName,
    'Status': item.status,
    'Severity': item.severity,
    'Responsible Party': item.responsibleParty,
    'Resources Required': item.resourcesRequired,
    'Scheduled Completion Date': item.scheduledCompletionDate ? format(new Date(item.scheduledCompletionDate), 'yyyy-MM-dd') : '',
    'Milestones': item.milestones?.join('; ') || '',
    'Source': item.sourceOfWeakness,
    'Created Date': format(new Date(item.createdDate), 'yyyy-MM-dd'),
    'Last Updated': item.lastUpdatedDate ? format(new Date(item.lastUpdatedDate), 'yyyy-MM-dd') : '',
  }));

  const poamWs = XLSX.utils.json_to_sheet(poamData);
  poamWs['!cols'] = [
    { wch: 20 }, { wch: 50 }, { wch: 15 }, { wch: 30 },
    { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    { wch: 20 }, { wch: 20 }, { wch: 40 }, { wch: 20 },
    { wch: 12 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, poamWs, 'POA&M Items');

  // By System Sheet
  const systemGroups = poamItems.reduce((acc, item) => {
    if (!acc[item.systemName]) acc[item.systemName] = [];
    acc[item.systemName].push(item);
    return acc;
  }, {} as Record<string, POAMItem[]>);

  const bySystemData = Object.entries(systemGroups).flatMap(([system, items]) => [
    { System: system, 'Total Items': items.length.toString(), Open: items.filter((i) => i.status === 'Open').length.toString(), 'In Progress': items.filter((i) => i.status === 'In Progress').length.toString(), High: items.filter((i) => i.severity === 'High' || i.severity === 'Critical').length.toString() },
  ]);

  const bySystemWs = XLSX.utils.json_to_sheet(bySystemData);
  bySystemWs['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, bySystemWs, 'By System');

  // Generate and download
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `${options.productName.replace(/\s+/g, '_')}_POAM_${getDateString()}.xlsx`);
};

/**
 * Export POA&M to CSV
 */
export const exportPOAMToCSV = (
  assessments: Array<{
    controlCode: string;
    controlName?: string;
    systemName: string;
    status: string;
    notes?: string;
    riskLevel?: string;
    remediationPlan?: string;
    assignedTo?: string;
    dueDate?: string;
    assessedAt?: string;
    updatedAt?: string;
  }>,
  options: POAMExportOptions
): void => {
  const poamItems = generatePOAMItems(assessments, options);

  if (poamItems.length === 0) {
    throw new Error('No POA&M items to export (all controls are compliant)');
  }

  const csvData = poamItems.map((item) => ({
    'POA&M ID': item.poamId,
    'Weakness': item.weakness,
    'Control ID': item.controlCode,
    'Control Name': item.controlName,
    'System': item.systemName,
    'Status': item.status,
    'Severity': item.severity,
    'Responsible Party': item.responsibleParty || '',
    'Scheduled Completion': item.scheduledCompletionDate || '',
    'Milestones': item.milestones?.join('; ') || '',
    'Source': item.sourceOfWeakness || '',
    'Created': format(new Date(item.createdDate), 'yyyy-MM-dd'),
  }));

  const headers = Object.keys(csvData[0]);
  const csvContent = [
    headers.join(','),
    ...csvData.map((row) =>
      headers
        .map((header) => {
          const value = row[header as keyof typeof row] || '';
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
            ? `"${escaped}"`
            : escaped;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${options.productName.replace(/\s+/g, '_')}_POAM_${getDateString()}.csv`);
};

/**
 * Export Evidence Coverage Report
 * Shows which controls have evidence attached vs those that don't
 */
export const exportEvidenceCoverageReport = (
  assessments: Array<{
    controlCode: string;
    controlName?: string;
    categoryName?: string;
    functionName?: string;
    systemName: string;
    status: string;
    hasEvidence: boolean;
    evidenceCount?: number;
  }>,
  productName: string
): void => {
  const wb = XLSX.utils.book_new();
  const exportDate = new Date();

  // Calculate coverage stats
  const totalAssessments = assessments.length;
  const withEvidence = assessments.filter((a) => a.hasEvidence).length;
  const withoutEvidence = assessments.filter((a) => !a.hasEvidence).length;
  const compliantWithEvidence = assessments.filter((a) => a.hasEvidence && (a.status === 'COMPLIANT' || a.status === 'Implemented')).length;
  const compliantWithoutEvidence = assessments.filter((a) => !a.hasEvidence && (a.status === 'COMPLIANT' || a.status === 'Implemented')).length;
  const coveragePercent = totalAssessments > 0 ? Math.round((withEvidence / totalAssessments) * 100) : 0;

  // Summary Sheet
  const summaryData = [
    ['EVIDENCE COVERAGE REPORT'],
    [''],
    ['Product:', productName],
    ['Export Date:', format(exportDate, 'MMMM dd, yyyy')],
    [''],
    ['COVERAGE SUMMARY'],
    ['Total Assessments:', String(totalAssessments)],
    ['With Evidence:', `${withEvidence} (${coveragePercent}%)`],
    ['Without Evidence:', `${withoutEvidence} (${100 - coveragePercent}%)`],
    [''],
    ['COMPLIANCE VS EVIDENCE'],
    ['Compliant with Evidence:', String(compliantWithEvidence)],
    ['Compliant without Evidence:', String(compliantWithoutEvidence), '(Risk: Claims not substantiated)'],
    [''],
    ['RECOMMENDATION'],
    [coveragePercent < 80 ? 'Evidence coverage is below 80%. Consider adding documentation to support compliance claims.' : 'Evidence coverage is adequate.'],
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // Missing Evidence Sheet
  const missingEvidence = assessments
    .filter((a) => !a.hasEvidence && (a.status === 'COMPLIANT' || a.status === 'Implemented'))
    .map((a) => ({
      'Control Code': a.controlCode,
      'Control Name': a.controlName || '',
      'Function': a.functionName || '',
      'Category': a.categoryName || '',
      'System': a.systemName,
      'Status': a.status,
      'Evidence Required': 'Yes - Compliant but no evidence',
    }));

  if (missingEvidence.length > 0) {
    const missingWs = XLSX.utils.json_to_sheet(missingEvidence);
    missingWs['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, missingWs, 'Missing Evidence');
  }

  // Full Coverage Details
  const coverageData = assessments.map((a) => ({
    'Control Code': a.controlCode,
    'Control Name': a.controlName || '',
    'Function': a.functionName || '',
    'System': a.systemName,
    'Status': a.status,
    'Has Evidence': a.hasEvidence ? 'Yes' : 'No',
    'Evidence Count': a.evidenceCount || 0,
    'Priority': !a.hasEvidence && (a.status === 'COMPLIANT' || a.status === 'Implemented') ? 'HIGH - Needs evidence' : '',
  }));

  const coverageWs = XLSX.utils.json_to_sheet(coverageData);
  coverageWs['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, coverageWs, 'Full Coverage');

  // Generate and download
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `${productName.replace(/\s+/g, '_')}_Evidence_Coverage_${getDateString()}.xlsx`);
};

// Export types for use in components
export type { ExportProduct, ExportSystem, ExportAssessment, AssessmentMatrixRow };

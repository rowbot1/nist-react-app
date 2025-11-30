/**
 * Evidence Hook
 *
 * React Query hooks for evidence management - file uploads, downloads,
 * and metadata management for compliance assessments.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const EVIDENCE_QUERY_KEY = 'evidence';

// Types
export interface EvidenceUploader {
  id: string;
  name: string;
  email: string;
}

export interface Evidence {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  storageType: string;
  description: string | null;
  assessmentId: string;
  uploadedById: string;
  uploadedBy: EvidenceUploader;
  evidenceType: string | null;
  validFrom: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, number>;
  expiringSoon: number;
  expired: number;
}

export interface EvidenceListResponse {
  data: Evidence[];
}

export interface EvidenceUploadResponse {
  data: Evidence[];
  errors?: Array<{ fileName: string; error: string }>;
}

export interface UploadEvidenceInput {
  assessmentId: string;
  files: File[];
  description?: string;
  evidenceType?: string;
  validFrom?: string;
  expiresAt?: string;
}

export interface UpdateEvidenceInput {
  description?: string;
  evidenceType?: string;
  validFrom?: string;
  expiresAt?: string;
}

// Evidence type categories
export const EVIDENCE_TYPES = [
  { value: 'policy', label: 'Policy Document' },
  { value: 'procedure', label: 'Procedure/Process' },
  { value: 'screenshot', label: 'Screenshot/Image' },
  { value: 'config', label: 'Configuration File' },
  { value: 'report', label: 'Report/Assessment' },
  { value: 'log', label: 'Log File' },
  { value: 'certificate', label: 'Certificate/License' },
  { value: 'audit', label: 'Audit Evidence' },
  { value: 'training', label: 'Training Record' },
  { value: 'other', label: 'Other' },
] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number]['value'];

// Get all evidence for an assessment
export function useEvidenceByAssessment(assessmentId: string | undefined) {
  return useQuery<Evidence[]>({
    queryKey: [EVIDENCE_QUERY_KEY, 'assessment', assessmentId],
    queryFn: async () => {
      const { data } = await api.get(`/evidence/assessment/${assessmentId}`);
      return data.data;
    },
    enabled: !!assessmentId,
  });
}

// Alias for backward compatibility
export const useEvidenceList = useEvidenceByAssessment;

// Get a single evidence item
export function useEvidence(evidenceId: string | undefined) {
  return useQuery<Evidence>({
    queryKey: [EVIDENCE_QUERY_KEY, evidenceId],
    queryFn: async () => {
      const { data } = await api.get(`/evidence/${evidenceId}`);
      return data.data;
    },
    enabled: !!evidenceId,
  });
}

// Get evidence statistics for a system
export function useEvidenceStats(systemId: string | undefined) {
  return useQuery<EvidenceStats>({
    queryKey: [EVIDENCE_QUERY_KEY, 'stats', 'system', systemId],
    queryFn: async () => {
      const { data } = await api.get(`/evidence/stats/system/${systemId}`);
      return data.data;
    },
    enabled: !!systemId,
  });
}

// Upload evidence files
export function useUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation<EvidenceUploadResponse, Error, UploadEvidenceInput>({
    mutationFn: async ({ assessmentId, files, description, evidenceType, validFrom, expiresAt }) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      if (description) formData.append('description', description);
      if (evidenceType) formData.append('evidenceType', evidenceType);
      if (validFrom) formData.append('validFrom', validFrom);
      if (expiresAt) formData.append('expiresAt', expiresAt);

      const { data } = await api.post(`/evidence/upload/${assessmentId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    },
    onSuccess: (_, { assessmentId }) => {
      queryClient.invalidateQueries({ queryKey: [EVIDENCE_QUERY_KEY, 'assessment', assessmentId] });
      queryClient.invalidateQueries({ queryKey: [EVIDENCE_QUERY_KEY, 'stats'] });
    },
  });
}

// Update evidence metadata
export function useUpdateEvidence() {
  const queryClient = useQueryClient();

  return useMutation<Evidence, Error, { evidenceId: string; assessmentId: string; updates: UpdateEvidenceInput }>({
    mutationFn: async ({ evidenceId, updates }) => {
      const { data } = await api.put(`/evidence/${evidenceId}`, updates);
      return data.data;
    },
    onSuccess: (data, { assessmentId }) => {
      queryClient.invalidateQueries({ queryKey: [EVIDENCE_QUERY_KEY, 'assessment', assessmentId] });
      queryClient.invalidateQueries({ queryKey: [EVIDENCE_QUERY_KEY, data.id] });
    },
  });
}

// Delete evidence
export function useDeleteEvidence() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { evidenceId: string; assessmentId: string }>({
    mutationFn: async ({ evidenceId }) => {
      await api.delete(`/evidence/${evidenceId}`);
    },
    onSuccess: (_, { assessmentId }) => {
      queryClient.invalidateQueries({ queryKey: [EVIDENCE_QUERY_KEY, 'assessment', assessmentId] });
      queryClient.invalidateQueries({ queryKey: [EVIDENCE_QUERY_KEY, 'stats'] });
    },
  });
}

// Helper function to download evidence file
export async function downloadEvidence(evidenceId: string, fileName: string): Promise<void> {
  try {
    const response = await api.get(`/evidence/${evidenceId}/download`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download evidence:', error);
    throw error;
  }
}

// Get direct download URL (for opening in new tab)
export function getEvidenceDownloadUrl(evidenceId: string): string {
  const token = localStorage.getItem('token');
  const baseUrl = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
  return `${baseUrl}/api/evidence/${evidenceId}/download?token=${token}`;
}

// Helper to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper to get MUI icon name based on mime type
export function getFileIconName(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'VideoFile';
  if (mimeType.startsWith('audio/')) return 'AudioFile';
  if (mimeType === 'application/pdf') return 'PictureAsPdf';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return 'TableChart';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'Description';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Slideshow';
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive')) return 'FolderZip';
  if (mimeType.startsWith('text/')) return 'Article';
  if (mimeType === 'application/json') return 'Code';
  return 'InsertDriveFile';
}

// Legacy function for backward compatibility
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'picture_as_pdf';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table_chart';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'description';
  if (mimeType === 'text/plain' || mimeType === 'text/csv') return 'article';
  if (mimeType === 'application/json') return 'code';
  if (mimeType === 'application/zip') return 'folder_zip';
  return 'insert_drive_file';
}

// Helper to check if evidence is expiring soon (within 30 days)
export function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return expiryDate <= thirtyDaysFromNow && expiryDate > now;
}

// Helper to check if evidence is expired
export function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// Get evidence type label
export function getEvidenceTypeLabel(value: string | null): string {
  if (!value) return 'Unclassified';
  const type = EVIDENCE_TYPES.find((t) => t.value === value);
  return type?.label || value;
}

// Get color for evidence type chip
export function getEvidenceTypeColor(
  value: string | null
): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' {
  if (!value) return 'default';
  const colorMap: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
    policy: 'primary',
    procedure: 'info',
    screenshot: 'secondary',
    config: 'warning',
    report: 'success',
    log: 'default' as 'info',
    certificate: 'success',
    audit: 'error',
    training: 'info',
    other: 'default' as 'info',
  };
  return colorMap[value] || 'default';
}

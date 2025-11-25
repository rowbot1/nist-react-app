import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Evidence, EvidenceUploadResponse, EvidenceListResponse, EvidenceStats } from '../types/api.types';

const EVIDENCE_QUERY_KEY = 'evidence';

export function useEvidenceList(assessmentId: string | undefined) {
  return useQuery<EvidenceListResponse>({
    queryKey: [EVIDENCE_QUERY_KEY, 'list', assessmentId],
    queryFn: async () => {
      const { data } = await api.get(`/evidence/assessment/${assessmentId}`);
      return data;
    },
    enabled: !!assessmentId,
  });
}

export function useEvidenceStats(systemId: string | undefined) {
  return useQuery<EvidenceStats>({
    queryKey: [EVIDENCE_QUERY_KEY, 'stats', systemId],
    queryFn: async () => {
      const { data } = await api.get(`/evidence/stats/system/${systemId}`);
      return data;
    },
    enabled: !!systemId,
  });
}

export function useUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation<EvidenceUploadResponse, Error, { assessmentId: string; files: File[]; description?: string }>({
    mutationFn: async ({ assessmentId, files, description }) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      if (description) {
        formData.append('description', description);
      }

      const { data } = await api.post(`/evidence/upload/${assessmentId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    },
    onSuccess: (_, { assessmentId }) => {
      queryClient.invalidateQueries({ queryKey: [EVIDENCE_QUERY_KEY, 'list', assessmentId] });
      queryClient.invalidateQueries({ queryKey: [EVIDENCE_QUERY_KEY, 'stats'] });
    },
  });
}

export function useUpdateEvidence() {
  const queryClient = useQueryClient();

  return useMutation<Evidence, Error, { evidenceId: string; description: string }>({
    mutationFn: async ({ evidenceId, description }) => {
      const { data } = await api.put(`/evidence/${evidenceId}`, { description });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [EVIDENCE_QUERY_KEY, 'list', data.assessmentId] });
    },
  });
}

export function useDeleteEvidence() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { evidenceId: string; assessmentId: string }>({
    mutationFn: async ({ evidenceId }) => {
      await api.delete(`/evidence/${evidenceId}`);
    },
    onSuccess: (_, { assessmentId }) => {
      queryClient.invalidateQueries({ queryKey: [EVIDENCE_QUERY_KEY, 'list', assessmentId] });
      queryClient.invalidateQueries({ queryKey: [EVIDENCE_QUERY_KEY, 'stats'] });
    },
  });
}

export function getEvidenceDownloadUrl(evidenceId: string): string {
  const token = localStorage.getItem('token');
  return `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/evidence/${evidenceId}/download?token=${token}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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

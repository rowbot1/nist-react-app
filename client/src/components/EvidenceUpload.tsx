import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  TableChart as SpreadsheetIcon,
  Description as DocIcon,
  Article as TextIcon,
  Code as CodeIcon,
  FolderZip as ZipIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import {
  useEvidenceList,
  useUploadEvidence,
  useDeleteEvidence,
  useUpdateEvidence,
  formatFileSize,
} from '../hooks/useEvidence';
import { Evidence } from '../types/api.types';

interface EvidenceUploadProps {
  assessmentId: string;
  readOnly?: boolean;
}

const getFileIconComponent = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon color="primary" />;
  if (mimeType === 'application/pdf') return <PdfIcon color="error" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <SpreadsheetIcon color="success" />;
  if (mimeType.includes('document') || mimeType.includes('word')) return <DocIcon color="info" />;
  if (mimeType === 'text/plain' || mimeType === 'text/csv') return <TextIcon />;
  if (mimeType === 'application/json') return <CodeIcon color="warning" />;
  if (mimeType === 'application/zip') return <ZipIcon />;
  return <FileIcon />;
};

export const EvidenceUpload: React.FC<EvidenceUploadProps> = ({ assessmentId, readOnly = false }) => {
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [evidenceToDelete, setEvidenceToDelete] = useState<Evidence | null>(null);

  const { data: evidenceData, isLoading: listLoading } = useEvidenceList(assessmentId);
  const uploadMutation = useUploadEvidence();
  const deleteMutation = useDeleteEvidence();
  const updateMutation = useUpdateEvidence();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/zip': ['.zip'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: readOnly,
  });

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      await uploadMutation.mutateAsync({
        assessmentId,
        files: selectedFiles,
        description: description || undefined,
      });
      setSelectedFiles([]);
      setDescription('');
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownload = (evidence: Evidence) => {
    const token = localStorage.getItem('token');
    const url = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/evidence/${evidence.id}/download`;

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = evidence.originalName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      })
      .catch((err) => console.error('Download failed:', err));
  };

  const handleEditClick = (evidence: Evidence) => {
    setEditingEvidence(evidence);
    setEditDescription(evidence.description || '');
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingEvidence) return;

    try {
      await updateMutation.mutateAsync({
        evidenceId: editingEvidence.id,
        description: editDescription,
      });
      setEditDialogOpen(false);
      setEditingEvidence(null);
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleDeleteClick = (evidence: Evidence) => {
    setEvidenceToDelete(evidence);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!evidenceToDelete) return;

    try {
      await deleteMutation.mutateAsync({
        evidenceId: evidenceToDelete.id,
        assessmentId,
      });
      setDeleteConfirmOpen(false);
      setEvidenceToDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Evidence Files
        </Typography>

        {/* Upload Area */}
        {!readOnly && (
          <Box sx={{ mb: 3 }}>
            <Paper
              {...getRootProps()}
              sx={{
                p: 3,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.400',
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                cursor: 'pointer',
                textAlign: 'center',
                mb: 2,
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input {...getInputProps()} />
              <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
              <Typography variant="body1" color="textSecondary">
                {isDragActive
                  ? 'Drop files here...'
                  : 'Drag & drop files here, or click to select'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Supported: PDF, Images, Office docs, Text, CSV, JSON, ZIP (max 50MB)
              </Typography>
            </Paper>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Files ({selectedFiles.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedFiles.map((file, index) => (
                    <Chip
                      key={index}
                      label={`${file.name} (${formatFileSize(file.size)})`}
                      onDelete={() => handleRemoveSelectedFile(index)}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Description Field */}
            {selectedFiles.length > 0 && (
              <TextField
                fullWidth
                size="small"
                label="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for these files..."
                sx={{ mb: 2 }}
              />
            )}

            {/* Upload Button */}
            {selectedFiles.length > 0 && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                startIcon={<CloudUploadIcon />}
              >
                {uploadMutation.isPending ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
              </Button>
            )}

            {uploadMutation.isPending && (
              <LinearProgress sx={{ mt: 2 }} />
            )}

            {uploadMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Upload failed. Please try again.
              </Alert>
            )}

            {uploadMutation.isSuccess && uploadMutation.data?.errors && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Some files failed to upload:
                {uploadMutation.data.errors.map((err, i) => (
                  <div key={i}>{err.fileName}: {err.error}</div>
                ))}
              </Alert>
            )}
          </Box>
        )}

        {/* Existing Evidence List */}
        {listLoading ? (
          <LinearProgress />
        ) : evidenceData?.evidence && evidenceData.evidence.length > 0 ? (
          <List dense>
            {evidenceData.evidence.map((evidence) => (
              <ListItem
                key={evidence.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemIcon>
                  {getFileIconComponent(evidence.mimeType)}
                </ListItemIcon>
                <ListItemText
                  primary={evidence.originalName}
                  secondary={
                    <>
                      {formatFileSize(evidence.fileSize)} | Uploaded {new Date(evidence.uploadedAt).toLocaleDateString()}
                      {evidence.description && (
                        <Typography variant="caption" display="block" color="textSecondary">
                          {evidence.description}
                        </Typography>
                      )}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Download">
                    <IconButton edge="end" onClick={() => handleDownload(evidence)} size="small">
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                  {!readOnly && (
                    <>
                      <Tooltip title="Edit description">
                        <IconButton onClick={() => handleEditClick(evidence)} size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          edge="end"
                          onClick={() => handleDeleteClick(evidence)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
            No evidence files uploaded yet.
          </Typography>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Evidence Description</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleEditSave}
              disabled={updateMutation.isPending}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Delete Evidence</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{evidenceToDelete?.originalName}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default EvidenceUpload;

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useCreateSystem } from '../hooks/useSystems';
import type { CreateSystemInput } from '../types/api.types';

interface AddSystemDialogProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  onSuccess?: () => void;
}

const ENVIRONMENTS = ['DEVELOPMENT', 'STAGING', 'PRODUCTION', 'TEST'];
const CRITICALITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const DATA_CLASSIFICATIONS = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];

const AddSystemDialog: React.FC<AddSystemDialogProps> = ({
  open,
  onClose,
  productId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<Omit<CreateSystemInput, 'productId'>>({
    name: '',
    description: '',
    environment: 'PRODUCTION',
    criticality: 'MEDIUM',
    dataClassification: 'INTERNAL',
  });
  const [error, setError] = useState<string | null>(null);

  const createSystemMutation = useCreateSystem({
    onSuccess: () => {
      handleClose();
      onSuccess?.();
    },
    onError: (err) => {
      setError(err.message || 'Failed to create system');
    },
  });

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      environment: 'PRODUCTION',
      criticality: 'MEDIUM',
      dataClassification: 'INTERNAL',
    });
    setError(null);
    onClose();
  };

  const handleChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      setError('System name is required');
      return;
    }

    createSystemMutation.mutate({
      ...formData,
      productId,
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add New System</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <TextField
              label="System Name"
              value={formData.name}
              onChange={handleChange('name')}
              required
              fullWidth
              autoFocus
              placeholder="e.g., Production Web Server"
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={handleChange('description')}
              multiline
              rows={3}
              fullWidth
              placeholder="Describe the system and its purpose..."
            />

            <FormControl fullWidth>
              <InputLabel>Environment</InputLabel>
              <Select
                value={formData.environment}
                label="Environment"
                onChange={(e) => handleChange('environment')({ target: { value: e.target.value } })}
              >
                {ENVIRONMENTS.map((env) => (
                  <MenuItem key={env} value={env}>
                    {env.charAt(0) + env.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Criticality</InputLabel>
              <Select
                value={formData.criticality}
                label="Criticality"
                onChange={(e) => handleChange('criticality')({ target: { value: e.target.value } })}
              >
                {CRITICALITY_LEVELS.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level.charAt(0) + level.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Data Classification</InputLabel>
              <Select
                value={formData.dataClassification}
                label="Data Classification"
                onChange={(e) => handleChange('dataClassification')({ target: { value: e.target.value } })}
              >
                {DATA_CLASSIFICATIONS.map((classification) => (
                  <MenuItem key={classification} value={classification}>
                    {classification.charAt(0) + classification.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={createSystemMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createSystemMutation.isPending || !formData.name.trim()}
          >
            {createSystemMutation.isPending ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Creating...
              </>
            ) : (
              'Add System'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddSystemDialog;
